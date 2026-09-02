import type { PlanTier, Profile } from "@/types/database";

/**
 * The one place "which visual tier is this student on" gets decided — every other lane
 * building an Ultra-aware surface should import this rather than re-deriving the fallback.
 *
 * Migration 0089 (profiles.plan_tier) is written, not applied — house pattern. `select("*")`
 * on `profiles` simply omits an unknown-to-cache column rather than erroring, so on an
 * environment where the column doesn't exist yet `profile.plan_tier` is `undefined`, not
 * `null` — this is the one place that gap gets closed, defaulting to "standard" the same way
 * every pre-migration row does once the column exists. Read-only: nothing in this feature
 * writes plan_tier (no payment/upgrade flow this pass), so there is no insert/update path
 * that needs lib/supabase/errors.ts's isUndefinedColumnError degrade-and-retry — that
 * pattern is for writes naming a column PostgREST's schema cache doesn't know yet, which
 * doesn't apply to a read.
 */
export function resolvePlanTier(profile: Pick<Profile, "plan_tier">): PlanTier {
  return profile.plan_tier ?? "standard";
}
