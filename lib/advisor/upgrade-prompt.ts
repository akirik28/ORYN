import "server-only";

import { createClient } from "@/lib/supabase/server";
import { isUndefinedColumnError } from "@/lib/supabase/errors";
import { startOfMonthUTC, startOfNextMonthUTC } from "@/lib/ai/monthly-quota";
import type { PlanTier } from "@/types/database";

/**
 * The mechanism for the founder-approved, frequency-capped upgrade pop-up
 * (docs/upgrade-prompt-design-spec-2026-09-02.md,
 * docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md). This file is the whole
 * decision: what to show, when, and how a dismissal is recorded — the UI component
 * (features/advisor/upgrade-prompt-overlay.tsx) and the Server Actions
 * (app/(app)/advisor/actions.ts) are thin callers of what's here.
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

/** All four in one literal select, same reasoning as lib/notifications/create.ts's
 * categoryIsEnabled: a single small row costs nothing extra to fetch in full, and the four
 * columns are added together (migration 0093), so if the database is missing any one of
 * them it's missing all four — one query degrades cleanly instead of needing per-column
 * handling. */
const DISMISSAL_COLUMNS =
  "upgrade_prompt_soft_dismissed_until, upgrade_prompt_not_now_at, upgrade_prompt_not_now_count, upgrade_prompt_dismissed_forever";

/**
 * Fails open to "not yet dismissed" on every branch except a real, successful read that
 * says otherwise — migration 0093 unapplied (today's actual state: the founder applied
 * 0089–0091 by hand and hasn't run anything since) reads as "never dismissed," matched via
 * the shared `upgrade_prompt_` prefix rather than one exact column name, same reasoning as
 * every other unapplied-migration guard in this codebase: whichever of the four
 * Postgres/PostgREST names first, the rest are missing too. Any other read failure also
 * fails open and logs — a student who gets asked again after an infra hiccup is a minor,
 * recoverable annoyance; a page that fails to render the advisor at all because this one
 * read errored would be a much worse outcome for a check this far from load-bearing.
 *
 * Deliberately the opposite failure direction from oryn-31's 0092 (ultra_welcome_seen),
 * which fails toward staying silent while unapplied rather than showing — see migration
 * 0093's own comment for the full comparison; the short version is that this feature has an
 * independent per-session cap (sessionStorage) a one-time welcome moment doesn't, which
 * bounds how bad "absence -> can show" gets here in a way it wouldn't for them.
 */
export async function getUpgradePromptDismissalState(userId: string): Promise<UpgradePromptDismissalState> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select(DISMISSAL_COLUMNS).eq("id", userId).maybeSingle();

  if (error) {
    if (!isUndefinedColumnError(error, "upgrade_prompt_")) {
      console.warn("[upgrade-prompt] dismissal state read failed, defaulting to not-yet-dismissed", { userId, error });
    }
    return NOT_YET_DISMISSED;
  }
  if (!data) return NOT_YET_DISMISSED;

  const row = data as unknown as {
    upgrade_prompt_soft_dismissed_until: string | null;
    upgrade_prompt_not_now_at: string | null;
    upgrade_prompt_not_now_count: number | null;
    upgrade_prompt_dismissed_forever: boolean | null;
  };
  return {
    softDismissedUntil: row.upgrade_prompt_soft_dismissed_until ?? null,
    notNowAt: row.upgrade_prompt_not_now_at ?? null,
    notNowCount: row.upgrade_prompt_not_now_count ?? 0,
    dismissedForever: row.upgrade_prompt_dismissed_forever ?? false,
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
 * still 0 at that point. Uses lib/ai/monthly-quota.ts's own month boundary rather than a
 * second, independently-written one, so "rest of the billing month" here can never quietly
 * drift from what that boundary means everywhere else in this codebase.
 */
export function computeNotNowUpdate(currentNotNowAt: string | null, currentNotNowCount: number, now: Date = new Date()): NotNowUpdate {
  const isLaterMonth = currentNotNowAt !== null && startOfMonthUTC(new Date(currentNotNowAt)).getTime() !== startOfMonthUTC(now).getTime();

  return {
    notNowAt: now.toISOString(),
    notNowCount: currentNotNowCount + 1,
    dismissedForever: currentNotNowCount >= 1 && isLaterMonth,
  };
}
