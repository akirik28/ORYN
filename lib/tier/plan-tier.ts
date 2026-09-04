import type { PlanTier, Profile } from "@/types/database";

/** True if `expiresAt` is a real timestamp still in the future. Absent (never granted) and
 *  expired are both false — this function doesn't distinguish them, because nothing
 *  downstream needs to; "once per person" (the gift's own invariant) is a separate check
 *  against that column staying non-null forever, not against this function's return value.
 *  Named for what it checks, not for which grant it's checking (2026-09-04, payment-seam
 *  review) — this now backs both ultra_gift_expires_at and paid_ultra_expires_at, and a
 *  gift-specific name would make the paid-subscription call site lie about what it's asking. */
function isExpiryActive(expiresAt: string | null | undefined): boolean {
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
 * Migration 0123 (paid_ultra_expires_at) folds in the same way again, and deliberately not
 * as a write to `plan_tier` itself — the payment webhook must never touch that column. The
 * `plan_tier === "ultra"` branch above has no expiry check because that's correct for an
 * admin's permanent grant; if the webhook also wrote `plan_tier`, a canceled or lapsed
 * subscription would become exactly as un-revocable as an admin grant, through the same
 * line. A separate expiry column, checked here, keeps a paid subscription genuinely
 * revocable (by nobody renewing it further — no cron needed, no job that can fail silently
 * and grant free Ultra forever) without touching the admin path's own guarantee at all. Kept
 * as its own column rather than reusing `ultra_gift_expires_at`: the gift column's
 * permanently-non-null state after first use *is* its "once per person" record, and a
 * recurring payment's expiry moving that same column on every renewal would silently
 * corrupt that invariant.
 *
 * Deliberately synchronous and settings-free: the gift's duration (admin_product_settings'
 * trial_period_days, migration 0105) is only ever consulted once, at grant time
 * (grantUltraGift, app/(app)/admin/actions.ts), which computes and stores the resulting
 * expiry directly — the payment webhook does the equivalent for `paid_ultra_expires_at`,
 * writing the provider's own returned period end, never computed locally here or at grant
 * time (a provider's own value accounts for proration, retried renewals, and grace windows
 * this function has no way to know about). This function — with roughly thirty call sites
 * across the app, none of them threading a settings or subscription read through — only
 * ever needs today's date and the already-computed values on the row in front of it.
 *
 * The "arrives for free" property this relies on: every existing call site does `select("*")`
 * on `profiles`, so `paid_ultra_expires_at` reaches all of them the moment the column exists,
 * with no call site needing to change. If a future caller ever uses a named `select` instead
 * and omits this column, it comes back `undefined` here — which reads as "no active paid
 * subscription" and falls through to `standard`. That's a denial, not a fabricated grant, so
 * it's the safe direction for a narrowed select to fail in, not a silent correctness bug.
 */
export function resolvePlanTier(profile: Pick<Profile, "plan_tier" | "ultra_gift_expires_at" | "paid_ultra_expires_at">): PlanTier {
  if (profile.plan_tier === "ultra") return "ultra";
  if (isExpiryActive(profile.ultra_gift_expires_at)) return "ultra";
  return isExpiryActive(profile.paid_ultra_expires_at) ? "ultra" : "standard";
}
