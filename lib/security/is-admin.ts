import type { Profile } from "@/types/database";

/**
 * The entire admin-authorization decision — requireAdmin() gating /admin and every
 * admin Server Action independently re-checking itself (updateReportReview,
 * triggerOpportunityDiscovery, addUniversityRequirement, ...) — reduces to this one
 * condition: `is_admin` must be exactly `true` on the profile row the server fetched for
 * the current session, never a client-supplied value, never inferred from anything else.
 * Pulled out as a named, type-narrowing predicate so the check itself is regression-
 * tested directly (normal user denied, admin allowed, and the strict `=== true` — not
 * just truthy — guards against a malformed value ever being treated as admin), rather
 * than only being exercised implicitly by every admin surface's own copy of this
 * one-line condition.
 */
export function isAdminProfile(profile: Profile | null | undefined): profile is Profile {
  return profile?.is_admin === true;
}
