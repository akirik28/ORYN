import type { PlanTier, Profile } from "@/types/database";

/** How long a granted gift stays active, in days. The one place this number is defined —
 *  see grantUltraGift (app/(app)/admin/actions.ts) for where a grant is written, and this
 *  file's own resolvePlanTier for where it's read back. */
export const ULTRA_GIFT_DURATION_DAYS = 7;

/** True if `grantedAt` is a real timestamp less than ULTRA_GIFT_DURATION_DAYS old. Absent
 *  (never granted) and expired are both false — this function doesn't distinguish them,
 *  because nothing downstream needs to; "once per person" is a separate check against the
 *  same column staying non-null forever, not against this function's return value. */
function isGiftActive(grantedAt: string | null | undefined): boolean {
  if (!grantedAt) return false;
  const expiresAt = new Date(grantedAt).getTime() + ULTRA_GIFT_DURATION_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() < expiresAt;
}

/**
 * The one place "which visual tier is this student on" gets decided — every other lane
 * building an Ultra-aware surface should import this rather than re-deriving the fallback.
 *
 * Migration 0089 (profiles.plan_tier) is written, not applied — house pattern. `select("*")`
 * on `profiles` simply omits an unknown-to-cache column rather than erroring, so on an
 * environment where the column doesn't exist yet `profile.plan_tier` is `undefined`, not
 * `null` — this is the one place that gap gets closed, defaulting to "standard" the same way
 * every pre-migration row does once the column exists.
 *
 * Migration 0104 (ultra_gift_granted_at) folds in the same way: a student who was granted
 * the 7-day gift and hasn't had it expire yet reads as "ultra" here even though their
 * permanent `plan_tier` column still says "standard" — this is the ONLY place that
 * combination gets resolved, so a gift changes what every Ultra-aware surface sees without
 * any of them needing their own copy of the expiry math. A permanent `plan_tier` of "ultra"
 * always wins outright; nothing about the gift can downgrade an admin-set permanent tier.
 */
export function resolvePlanTier(profile: Pick<Profile, "plan_tier" | "ultra_gift_granted_at">): PlanTier {
  if (profile.plan_tier === "ultra") return "ultra";
  return isGiftActive(profile.ultra_gift_granted_at) ? "ultra" : "standard";
}
