import { describe, expect, test } from "vitest";
import { isAdminProfile } from "@/lib/security/is-admin";
import type { Profile } from "@/types/database";

// This one predicate backs requireAdmin() (app/(app)/admin/page.tsx) AND every admin
// Server Action's own independent re-check (updateReportReview, triggerOpportunityDiscovery,
// addUniversityRequirement, ...) — proving it here covers "normal user can't read the
// admin queue" and "admin can update a report's status, non-admin can't" at once, since
// both reduce to this same gate.

function profileWith(is_admin: unknown): Profile {
  return { is_admin } as unknown as Profile;
}

describe("isAdminProfile", () => {
  test("no profile at all (unauthenticated or unloaded): denied", () => {
    expect(isAdminProfile(null)).toBe(false);
    expect(isAdminProfile(undefined)).toBe(false);
  });

  test("a normal, non-admin user's profile: denied", () => {
    expect(isAdminProfile(profileWith(false))).toBe(false);
  });

  test("an admin's profile: allowed", () => {
    expect(isAdminProfile(profileWith(true))).toBe(true);
  });

  test("a truthy but non-boolean is_admin value is still denied — strict === true, not just truthy", () => {
    // Defends against a hypothetical future bug (a malformed row, a string column read
    // as "true"/1/etc.) ever being treated as admin. The real column is a Postgres
    // boolean, so this shouldn't happen in practice — this is a deliberate belt on the
    // single highest-consequence check in the app, not a scenario expected to occur.
    expect(isAdminProfile(profileWith(1))).toBe(false);
    expect(isAdminProfile(profileWith("true"))).toBe(false);
  });
});
