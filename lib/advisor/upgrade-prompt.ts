import { startOfMonthUTC, startOfNextMonthUTC } from "@/lib/date/month-boundary";
import type { PlanTier, Profile } from "@/types/database";

/**
 * The mechanism for the founder-approved, frequency-capped upgrade pop-up
 * (docs/upgrade-prompt-design-spec-2026-09-02.md,
 * docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md). This file is the whole
 * decision: what to show, when, and how a dismissal update is computed — the UI component
 * (features/advisor/upgrade-prompt-overlay.tsx), the page that loads the dismissal state
 * (app/(app)/advisor/page.tsx), and the Server Actions that write it
 * (app/(app)/advisor/actions.ts) are thin callers of what's here.
 *
 * Deliberately pure -- no `server-only`, no Supabase, nothing async. This file didn't
 * start this way: it originally also queried `profiles` directly for the dismissal row,
 * which meant `import "server-only"` at the top, which meant `next build` correctly
 * refused the moment features/advisor/advisor-chat.tsx (a Client Component) imported
 * `shouldShowUpgradePrompt` from the same module -- importing ANY export from a
 * server-only file pulls the file's whole dependency chain into the client bundle
 * analysis, not just the export actually used. Found by oryn-a7 running `next build`
 * after typecheck/lint/4790 tests all passed clean; jsdom has no concept of the RSC
 * boundary; this is the one class of bug that gate can't see. `extractUpgradePromptDismissalState`
 * below replaces the old `getUpgradePromptDismissalState` query entirely rather than
 * relocating it -- the caller (the advisor page) already loads the full profile via
 * `getCurrentProfile()` for `resolvePlanTier`, so deriving from that same object needs no
 * second round-trip, mirroring `resolvePlanTier`'s own `Pick<Profile, ...>` shape exactly.
 *
 * Storage is durable (migration 0093, flat columns on profiles), not localStorage — the
 * one asymmetry that decided it: a student who explicitly declined on one device and gets
 * asked again on another reasonably feels ignored, and re-showing after an explicit no is
 * the thing that turns a prompt into an ad. The "shown once this session, first qualifying
 * reply only" cap is deliberately NOT tracked here — that's genuinely session-scoped (a new
 * tab/day is legitimately eligible again, subject to everything below), so the caller tracks
 * it in sessionStorage and passes it in as `alreadyShownThisSession`.
 */

export interface UpgradePromptDismissalState {
  /** Suppress until this instant, from a passive dismiss (click away/close, no explicit
   * choice). Null means no active soft suppression. */
  softDismissedUntil: string | null;
  /** Timestamp of the most recent explicit "Not now". Null means never explicitly declined.
   * Suppresses through the end of the calendar month this falls in. */
  notNowAt: string | null;
  /** How many times "Not now" has been explicitly clicked, ever. */
  notNowCount: number;
  /** Permanent. Once true, nothing in this module ever shows the prompt again — the way
   * back is the existing /settings/plan page, not a flag this module clears. */
  dismissedForever: boolean;
}

/** Exported so a caller needing a "nothing dismissed yet" default (a prop default, a test
 * fixture) has one real source rather than each reconstructing this shape by hand. */
export const NOT_YET_DISMISSED: UpgradePromptDismissalState = {
  softDismissedUntil: null,
  notNowAt: null,
  notNowCount: 0,
  dismissedForever: false,
};

/**
 * Derives dismissal state from an already-loaded profile row, exactly like
 * `resolvePlanTier` derives tier -- never fetches. Migration 0093 unapplied means these
 * four columns are simply `undefined` on the row (this codebase's established
 * `select("*")` convention: an unknown-to-cache column is omitted from the result, not a
 * thrown error -- see lib/tier/plan-tier.ts's own comment for the same behavior on
 * `plan_tier`), which every `?? default` below reads as "not yet dismissed," the same
 * fail-open direction the old query-based version chose and argued in migration 0093's own
 * header. That argument still holds unchanged; only the mechanism of reaching it moved.
 */
export function extractUpgradePromptDismissalState(
  profile: Pick<
    Profile,
    "upgrade_prompt_soft_dismissed_until" | "upgrade_prompt_not_now_at" | "upgrade_prompt_not_now_count" | "upgrade_prompt_dismissed_forever"
  >,
): UpgradePromptDismissalState {
  return {
    softDismissedUntil: profile.upgrade_prompt_soft_dismissed_until ?? null,
    notNowAt: profile.upgrade_prompt_not_now_at ?? null,
    notNowCount: profile.upgrade_prompt_not_now_count ?? 0,
    dismissedForever: profile.upgrade_prompt_dismissed_forever ?? false,
  };
}

export interface UpgradePromptContext {
  tier: PlanTier;
  /** This specific, just-arrived reply's degrade status — lib/ai/advisor-chat.ts's
   * AdvisorReply.degraded, threaded straight through. Never re-derived from anything else;
   * the trigger is this exact boolean, per oryn-60's research: every restrained comparator
   * ties its prompt to a real, already-occurred event, never a timer. */
  degraded: boolean;
  isStreaming: boolean;
  hasUnsentComposerText: boolean;
  /** Tracked client-side (sessionStorage), not here — see this file's own header comment. */
  alreadyShownThisSession: boolean;
}

/**
 * The single decision this whole mechanism exists to make. Every gate is a hard `false` —
 * there is no scoring, no partial credit, matching "never flatter an absence" and "never
 * blocking" as absolute rules rather than defaults to weigh against each other.
 */
export function shouldShowUpgradePrompt(
  context: UpgradePromptContext,
  state: UpgradePromptDismissalState,
  now: Date = new Date(),
): boolean {
  if (context.tier !== "standard") return false; // never for Ultra
  if (!context.degraded) return false; // only the real event, never a timer/count
  if (context.isStreaming) return false; // never mid-task
  if (context.hasUnsentComposerText) return false; // never over unsent work
  if (context.alreadyShownThisSession) return false; // once per session, first reply only

  if (state.dismissedForever) return false;
  if (state.softDismissedUntil && now < new Date(state.softDismissedUntil)) return false;
  if (state.notNowAt && now < startOfNextMonthUTC(new Date(state.notNowAt))) return false;

  return true;
}

/** A passive dismiss (click away, close without choosing) — 7 days, the one number that
 * shows up consistently across the frequency-cap sources oryn-60's research cites, applied
 * here as a reasoned floor rather than an invented one. */
export function computeSoftDismissUntil(now: Date = new Date()): string {
  return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
}

export interface NotNowUpdate {
  notNowAt: string;
  notNowCount: number;
  dismissedForever: boolean;
}

/**
 * An explicit "Not now" click. The escalation rule, stated precisely: the SECOND explicit
 * click (currentNotNowCount already >= 1 — this is at least the second one ever) in a
 * calendar month genuinely later than the previous one's escalates to permanent. A
 * first-ever click never escalates regardless of month math, since currentNotNowCount is
 * still 0 at that point. Uses lib/date/month-boundary.ts's own month boundary rather than a
 * second, independently-written one, so "rest of the billing month" here can never quietly
 * drift from what the AI-allowance reset (lib/ai/monthly-quota.ts) means by the same words.
 */
export function computeNotNowUpdate(currentNotNowAt: string | null, currentNotNowCount: number, now: Date = new Date()): NotNowUpdate {
  const isLaterMonth = currentNotNowAt !== null && startOfMonthUTC(new Date(currentNotNowAt)).getTime() !== startOfMonthUTC(now).getTime();

  return {
    notNowAt: now.toISOString(),
    notNowCount: currentNotNowCount + 1,
    dismissedForever: currentNotNowCount >= 1 && isLaterMonth,
  };
}
