import type { ResponseMode, Profile } from "@/types/database";

/**
 * The one place "which response mode is this student on" gets decided — mirrors
 * lib/tier/plan-tier.ts's resolvePlanTier exactly, for the same reason: migration 0091
 * (profiles.response_mode) is written, not applied — house pattern. `select("*")` on
 * `profiles` simply omits an unknown-to-cache column rather than erroring, so on an
 * environment where the column doesn't exist yet `profile.response_mode` is `undefined`,
 * not `null` — this is the one place that gap gets closed, defaulting to "balanced" the
 * same way every pre-migration row does once the column exists.
 *
 * Read-only, like resolvePlanTier: this function has no insert/update path that would need
 * lib/supabase/errors.ts's isUndefinedColumnError at all — that check is for writes naming
 * a column PostgREST's schema cache doesn't know yet, and a `select("*")` read doesn't hit
 * it (see that file's own corrected rule: wildcard vs. named select, not read vs. write).
 * The write side — a student actually setting this preference — is different and does use
 * isUndefinedColumnError, though to fail loudly rather than to degrade-and-retry; see
 * app/(app)/settings/actions.ts's updateResponseMode for which and why.
 */
export function resolveResponseMode(profile: Pick<Profile, "response_mode">): ResponseMode {
  return profile.response_mode ?? "balanced";
}
