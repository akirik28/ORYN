import type { PlanTier } from "@/types/database";
import { startOfNextMonthUTC } from "@/lib/date/month-boundary";
import type { ParentLinkStatus } from "@/lib/tier/parent-tier";
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
  /** lib/tier/parent-tier.ts's resolveParentEffectiveTier(linkStatus, studentProfile) —
   *  reuse that function to produce this field rather than reading a parent profile's
   *  plan_tier directly (there is nothing meaningful there; §K4 never writes it). */
  linkedStudentTier: PlanTier;
  /** parent_links.status, the same ParentLinkStatus resolveParentEffectiveTier itself
   *  takes. **Not redundant with linkedStudentTier below, even though
   *  resolveParentEffectiveTier already folds status into its own output** —
   *  resolveParentEffectiveTier(pending, ...) returns "standard", which would pass this
   *  function's own tier gate unchanged. Only checking the resolved tier would show this
   *  prompt to a pending parent (a real bug, not a hypothetical one: "standard" is exactly
   *  the tier this prompt is FOR). This field is what stops that — CEO's own instruction,
   *  verbatim: "a free parent with a pending link should not be sold anything yet." Do not
   *  remove this gate as "already covered by the tier check" — it is a different fact
   *  (confirmed vs. unconfirmed) that happens to share a resolution path with tier, not a
   *  duplicate of it. */
  linkStatus: ParentLinkStatus;
  alreadyShownThisSession: boolean;
}

export function shouldShowParentUpgradePrompt(
  context: ParentUpgradePromptContext,
  state: UpgradePromptDismissalState,
  now: Date = new Date(),
): boolean {
  if (context.linkStatus !== "active") return false; // never for pending or revoked — see the field's own comment above for why this can't be inferred from tier alone
  if (context.linkedStudentTier !== "standard") return false; // never for Ultra — shared subscription, nothing left to sell
  if (context.alreadyShownThisSession) return false; // once per panel visit

  if (state.dismissedForever) return false;
  if (state.softDismissedUntil && now < new Date(state.softDismissedUntil)) return false;
  if (state.notNowAt && now < startOfNextMonthUTC(new Date(state.notNowAt))) return false;

  return true;
}
