import type { PlanTier, Profile } from "@/types/database";
import { resolvePlanTier } from "./plan-tier";

/**
 * `parent_links.status` (docs/veli-hesabi-spec-2026-09-04.md §5) — kept as a local type
 * rather than imported from types/database.ts because P1 (the migration + generated types)
 * hasn't landed yet. This is the provisional shape; move to a `Database`-derived type once
 * P1 ships and drop this alias.
 */
export type ParentLinkStatus = "pending" | "active" | "revoked";

/**
 * A parent's effective tier is a lookup through an active link, never a value stored on the
 * parent's own row (§K4 — "velinin kendi plan_tier sütunu yazılmaz"). This is the one place
 * that lookup happens; a parent-facing surface should call this rather than reading
 * `plan_tier` off a parent profile directly (there is nothing meaningful there to read).
 *
 * `pending` and `revoked` both resolve to "standard" — not just "revoked leaks nothing," but
 * "an unconfirmed link leaks nothing either." G1's "asla ama asla" (never, ever) is about
 * authority, not about timing: a `pending` row exists because the student hasn't confirmed
 * it yet (§K3), and a tier leak through an unconfirmed link would make the confirmation step
 * meaningless — the access it's supposed to gate would already have happened.
 *
 * Deliberately thin: this function doesn't know what a `parent_links` row actually looks
 * like beyond its status, and doesn't touch Supabase. `resolvePlanTier` (lib/tier/plan-tier.ts)
 * already owns "what tier is this profile on, permanent-vs-gift" — reusing it here rather
 * than re-deriving it is the same discipline that function's own header asks of every other
 * Ultra-aware surface. The only piece still to build once P1's real `parent_links` shape
 * lands is a thin fetch that turns (parentUserId, studentUserId) into the two arguments
 * below — see docs/p6-shared-premium-2026-09-04.md for that wrapper's exact spec.
 */
export function resolveParentEffectiveTier(
  linkStatus: ParentLinkStatus,
  studentProfile: Pick<Profile, "plan_tier" | "ultra_gift_expires_at">
): PlanTier {
  if (linkStatus !== "active") return "standard";
  return resolvePlanTier(studentProfile);
}
