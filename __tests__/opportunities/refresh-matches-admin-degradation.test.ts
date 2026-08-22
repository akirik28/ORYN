// Regression coverage for the exact class of bug __tests__/social/admin-client-degradation.test.ts
// already pins for a different set of functions, found live in this repo once before and
// reintroduced here by migration 0063's own paired code change: refreshOpportunityMatches
// and refreshRequirementEvaluations called createAdminClient() unconditionally, which
// throws synchronously when SUPABASE_SECRET_KEY is unset, and both are awaited, unguarded,
// from page render paths (dashboard, /opportunities, /opportunities/[id],
// /universities/[id]) -- an unconfigured secret key turned "matches don't refresh" into
// "the whole page 500s". Fixed with tryCreateAdminClient() + an early return before either
// function ever touches a database, which is what makes this empirically testable without
// a live Supabase connection: with the admin client unavailable, neither function should
// reach its own RLS-scoped read at all.
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const ORIGINAL_SECRET = process.env.SUPABASE_SECRET_KEY;

beforeEach(() => {
  delete process.env.SUPABASE_SECRET_KEY;
});

afterEach(() => {
  if (ORIGINAL_SECRET === undefined) delete process.env.SUPABASE_SECRET_KEY;
  else process.env.SUPABASE_SECRET_KEY = ORIGINAL_SECRET;
});

const FAKE_USER_ID = "11111111-1111-1111-1111-111111111111";
const FAKE_UNIVERSITY_ID = "22222222-2222-2222-2222-222222222222";

describe("refreshOpportunityMatches degrades instead of crashing when the admin client is unavailable", () => {
  test("resolves { refreshed: false } rather than rejecting", async () => {
    const { refreshOpportunityMatches } = await import("@/lib/opportunities/persist-matches");
    await expect(refreshOpportunityMatches(FAKE_USER_ID)).resolves.toEqual({ refreshed: false });
  });

  test("logs a clear server-side error rather than failing silently", async () => {
    const { refreshOpportunityMatches } = await import("@/lib/opportunities/persist-matches");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await refreshOpportunityMatches(FAKE_USER_ID);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("SUPABASE_SECRET_KEY not configured"));
    errorSpy.mockRestore();
  });
});

describe("refreshRequirementEvaluations degrades instead of crashing when the admin client is unavailable", () => {
  test("resolves (void) rather than rejecting", async () => {
    const { refreshRequirementEvaluations } = await import("@/lib/requirements/persist");
    await expect(refreshRequirementEvaluations(FAKE_UNIVERSITY_ID, FAKE_USER_ID, null)).resolves.toBeUndefined();
  });

  test("logs a clear server-side error rather than failing silently", async () => {
    const { refreshRequirementEvaluations } = await import("@/lib/requirements/persist");
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    await refreshRequirementEvaluations(FAKE_UNIVERSITY_ID, FAKE_USER_ID, null);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("SUPABASE_SECRET_KEY not configured"));
    errorSpy.mockRestore();
  });
});
