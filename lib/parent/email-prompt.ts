import type { Profile } from "@/types/database";
import { startOfNextMonthUTC } from "@/lib/date/month-boundary";
import {
  type UpgradePromptDismissalState,
  NOT_YET_DISMISSED,
  computeSoftDismissUntil,
  computeNotNowUpdate,
} from "@/lib/advisor/upgrade-prompt";

// Re-exported, not re-implemented — same reasoning as lib/parent/upgrade-prompt.ts's own
// identical re-export: the durable dismissal-state shape (7-day soft dismiss, "not now"
// escalating to permanent after a second click in a later month) has nothing advisor-specific
// about it. What's genuinely new for this prompt is the STORAGE (migration 0117's own
// parent_email_prompt_* columns, deliberately separate from upgrade_prompt_* — see that
// migration's header) and the trigger condition below, not the policy mechanics themselves.
export { NOT_YET_DISMISSED, computeSoftDismissUntil, computeNotNowUpdate };
export type { UpgradePromptDismissalState };

/**
 * P4 follow-up (docs/veli-hesabi-spec-2026-09-04.md §1, G12/G13) — the founder's own
 * instruction: collecting a parent's email is valuable enough to prompt for, not just offer
 * once at signup. This derives dismissal state from an already-loaded profile row, exactly
 * like extractUpgradePromptDismissalState — never fetches.
 *
 * Migration 0117 unapplied means these four columns are simply absent from the row (this
 * codebase's established `select("*")` convention — see lib/tier/plan-tier.ts's own comment
 * for the identical behavior on `plan_tier`), which every `?? default` below reads as "not
 * yet dismissed." That is deliberate, not the reflex default — see migration 0117's own
 * header for why "absence -> can show" is the right direction for this specific feature
 * (it has an independent client-side session cap to bound the unapplied window), matching
 * upgrade_prompt_*'s own reasoning rather than ultra_welcome_seen_at's opposite one.
 */
export function extractParentEmailPromptDismissalState(
  profile: Pick<
    Profile,
    | "parent_email_prompt_soft_dismissed_until"
    | "parent_email_prompt_not_now_at"
    | "parent_email_prompt_not_now_count"
    | "parent_email_prompt_dismissed_forever"
  >
): UpgradePromptDismissalState {
  return {
    softDismissedUntil: profile.parent_email_prompt_soft_dismissed_until ?? null,
    notNowAt: profile.parent_email_prompt_not_now_at ?? null,
    notNowCount: profile.parent_email_prompt_not_now_count ?? 0,
    dismissedForever: profile.parent_email_prompt_dismissed_forever ?? false,
  };
}

export interface ParentEmailPromptContext {
  /** profiles.parent_invite_email !== null — the only real trigger this prompt has. Unlike
   * the advisor prompt (tied to a specific degraded reply) or the parent panel's own prompt
   * (tied to a panel visit), there is no event to wait for here: a student either has given
   * an address or hasn't, checked fresh from the same already-loaded profile every render. */
  hasParentInviteEmail: boolean;
  /** Tracked client-side (sessionStorage), matching features/advisor/advisor-chat.tsx's own
   * UPGRADE_PROMPT_SESSION_KEY pattern — bounds how often an undismissed prompt can
   * reappear within one browser session, independent of the durable columns above. */
  alreadyShownThisSession: boolean;
}

/**
 * The single decision this mechanism exists to make — same hard-gate shape as
 * shouldShowUpgradePrompt/shouldShowParentUpgradePrompt, no scoring.
 */
export function shouldShowParentEmailPrompt(
  context: ParentEmailPromptContext,
  state: UpgradePromptDismissalState,
  now: Date = new Date()
): boolean {
  if (context.hasParentInviteEmail) return false; // already given — nothing to ask for
  if (context.alreadyShownThisSession) return false;

  if (state.dismissedForever) return false;
  if (state.softDismissedUntil && now < new Date(state.softDismissedUntil)) return false;
  if (state.notNowAt && now < startOfNextMonthUTC(new Date(state.notNowAt))) return false;

  return true;
}
