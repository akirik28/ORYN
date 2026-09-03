import type { PlanTier } from "@/types/database";
import { startOfNextMonthUTC } from "@/lib/date/month-boundary";
import {
  type UpgradePromptDismissalState,
  NOT_YET_DISMISSED,
  extractUpgradePromptDismissalState,
  computeSoftDismissUntil,
  computeNotNowUpdate,
} from "@/lib/advisor/upgrade-prompt";

// Re-exported rather than re-implemented: the durable dismissal-state shape (7-day soft
// dismiss, "not now" escalating to permanent after a second click in a later month) has
// nothing advisor-specific about it — it's a per-profile-row decay clock, and a parent's
// profiles row carries the exact same upgrade_prompt_* columns a student's does (docs/
// veli-hesabi-spec-2026-09-04.md §5 -- parent_links is new, profiles is the same table).
// Importing from lib/advisor/upgrade-prompt.ts rather than moving these to a neutral,
// non-advisor-named home is a deliberate smaller diff tonight, not a final architecture --
// worth relocating (e.g. to lib/upgrade-prompt/) once a second consumer makes "advisor" in
// the import path actively misleading rather than just slightly odd.
export { NOT_YET_DISMISSED, extractUpgradePromptDismissalState, computeSoftDismissUntil, computeNotNowUpdate };
export type { UpgradePromptDismissalState };

/**
 * The gating decision for the parent-side upgrade pop-up (P7,
 * docs/veli-hesabi-spec-2026-09-04.md §6). Same shape as
 * lib/advisor/upgrade-prompt.ts's shouldShowUpgradePrompt -- every gate a hard `false`, no
 * scoring -- but the trigger conditions are genuinely different, which is why this is its
 * own function rather than a parameterization of the advisor one: a parent has no single
 * triggering event (no degraded reply, no locked button they just clicked) to tie a prompt
 * to, since G1/G5 make the parent panel a passive, read-only, AI-free view by design. The
 * prompt here is shown once per panel visit instead, the same "session" cap the advisor
 * version already uses, just without an event requirement layered on top of it.
 */
export interface ParentUpgradePromptContext {
  /** The linked student's plan_tier, inherited per spec §5 ("veli için efektif tier =
   *  bağlı öğrencinin plan_tier'ı") — a parent's own profiles.plan_tier column is never
   *  written, so this must come from the student side, not the parent's own row. */
  linkedStudentTier: PlanTier;
  /** parent_links.status. Anything but "active" means no data has actually started
   *  flowing yet (or has been cut off) — selling into that state is the one CEO named
   *  directly: "a free parent with a pending link should not be sold anything yet." */
  linkStatus: "pending" | "active" | "revoked";
  alreadyShownThisSession: boolean;
}

export function shouldShowParentUpgradePrompt(
  context: ParentUpgradePromptContext,
  state: UpgradePromptDismissalState,
  now: Date = new Date(),
): boolean {
  if (context.linkStatus !== "active") return false; // never for pending or revoked
  if (context.linkedStudentTier !== "standard") return false; // never for Ultra — shared subscription, nothing left to sell
  if (context.alreadyShownThisSession) return false; // once per panel visit

  if (state.dismissedForever) return false;
  if (state.softDismissedUntil && now < new Date(state.softDismissedUntil)) return false;
  if (state.notNowAt && now < startOfNextMonthUTC(new Date(state.notNowAt))) return false;

  return true;
}
