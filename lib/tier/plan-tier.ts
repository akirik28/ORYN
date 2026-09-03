import type { PlanTier, Profile } from "@/types/database";

/** True if `expiresAt` is a real timestamp still in the future. Absent (never granted) and
 *  expired are both false — this function doesn't distinguish them, because nothing
 *  downstream needs to; "once per person" is a separate check against the same column
 *  staying non-null forever, not against this function's return value. */
function isGiftActive(expiresAt: string | null | undefined): boolean {
  return !!expiresAt && Date.now() < new Date(expiresAt).getTime();
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
 * Migration 0106 (ultra_gift_expires_at) folds in the same way: a student whose gift hasn't
 * expired yet reads as "ultra" here even though their permanent `plan_tier` column still
 * says "standard" — this is the ONLY place that combination gets resolved, so a gift changes
 * what every Ultra-aware surface sees without any of them needing their own copy of the
 * expiry check. A permanent `plan_tier` of "ultra" always wins outright; nothing about the
 * gift can downgrade an admin-set permanent tier.
 *
 * Deliberately synchronous and settings-free: the gift's duration (admin_product_settings'
 * trial_period_days, migration 0105) is only ever consulted once, at grant time
 * (grantUltraGift, app/(app)/admin/actions.ts), which computes and stores the resulting
 * expiry directly. This function — with roughly thirty call sites across the app, none of
 * them threading a settings read through — only ever needs today's date and the
 * already-computed value on the row in front of it.
 */
export function resolvePlanTier(profile: Pick<Profile, "plan_tier" | "ultra_gift_expires_at">): PlanTier {
  if (profile.plan_tier === "ultra") return "ultra";
  return isGiftActive(profile.ultra_gift_expires_at) ? "ultra" : "standard";
}
