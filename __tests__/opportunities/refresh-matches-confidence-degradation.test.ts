import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Regression coverage for a landmine found while WRITING migration 0086
 * (opportunity_matches.match_confidence), not after: the final `admin.from(
 * "opportunity_matches").upsert(rows, ...)` call had no error/data destructure at all --
 * the exact unchecked-write shape lib/universities/sync-us-universities.ts's
 * university_statistics upsert had (see that file's history, and __tests__/supabase/
 * errors.test.ts for the shared isUndefinedColumnError check this reuses). Every row this
 * function builds now always includes match_confidence, so until migration 0086 is applied
 * on a given environment, that unchecked upsert would have rejected OUTRIGHT (42703,
 * undefined_column) on its very first call -- not a degraded partial write, a complete
 * failure of opportunity matching for every user, on every page render that touches
 * opportunities, with nothing anywhere reporting it. These tests assert the actual
 * degrade-and-retry behavior, not just that the code compiles with a try/catch shape
 * around it -- following __tests__/opportunities/refresh-matches-no-session.test.ts's own
 * standard for this file (proving outcomes, not call shapes).
 */

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

/** A session client with just enough real data to reach the final upsert: one active
 *  opportunity, so `rows` has exactly one entry and the upsert's own behavior (not the
 *  earlier reads) is what each test actually exercises. */
function sessionClientWithOneOpportunity() {
  return {
    from: (table: string) => {
      if (table === "profiles") {
        return chainable({ data: { id: "student-1", birth_year: 2009, country: "United States", citizenship_countries: [], graduation_year: 2027, preferred_language: "en" }, error: null });
      }
      if (table === "opportunities") {
        return chainable({
          data: [
            {
              id: "opp-1",
              category: "research",
              minimum_age: null,
              maximum_age: null,
              eligible_countries: [],
              eligible_citizenships: [],
              eligible_grades: [],
              country_eligibility_confirmed_open: true,
              citizenship_restrictions: null,
              residency_restrictions: null,
              fields: [],
              country: null,
              title: "Test Opportunity",
              status: "active",
              cycle_status: "open",
              deadline: null,
            },
          ],
          error: null,
        });
      }
      return chainable({ data: [], error: null });
    },
  };
}

const MISSING_MATCH_CONFIDENCE_ERROR = { code: "42703", message: 'column "match_confidence" of relation "opportunity_matches" does not exist' };
const UNRELATED_ERROR = { code: "23505", message: "duplicate key value violates unique constraint" };

const { getProfileScoresMock, tryCreateAdminClientMock, createClientMock } = vi.hoisted(() => ({
  getProfileScoresMock: vi.fn().mockResolvedValue([]),
  tryCreateAdminClientMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/security/dal", () => ({ getProfileScores: getProfileScoresMock }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: tryCreateAdminClientMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));

import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  getProfileScoresMock.mockClear();
  tryCreateAdminClientMock.mockReset();
  createClientMock.mockReset();
  createClientMock.mockResolvedValue(sessionClientWithOneOpportunity());
});

describe("refreshOpportunityMatches — the opportunity_matches upsert degrades instead of failing outright", () => {
  test("migration 0086 unapplied (first upsert rejects on match_confidence): retries without it, succeeds, reports refreshed: true", async () => {
    const upsertSpy = vi.fn().mockResolvedValueOnce({ data: null, error: MISSING_MATCH_CONFIDENCE_ERROR }).mockResolvedValueOnce({ data: null, error: null });
    tryCreateAdminClientMock.mockReturnValue({ from: () => ({ upsert: upsertSpy }) });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await refreshOpportunityMatches(USER_ID);

    expect(result).toEqual({ refreshed: true });
    expect(upsertSpy).toHaveBeenCalledTimes(2);
    // The retry payload must not still contain the column that just failed.
    const retryRows = upsertSpy.mock.calls[1]?.[0] as Record<string, unknown>[];
    expect(retryRows[0]).not.toHaveProperty("match_confidence");
    // The first, failed attempt DID include it -- proving the retry is a real degrade, not
    // just a second call with the same payload that happened to succeed.
    const firstRows = upsertSpy.mock.calls[0]?.[0] as Record<string, unknown>[];
    expect(firstRows[0]).toHaveProperty("match_confidence");
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("match_confidence column not yet live"), expect.objectContaining({ userId: USER_ID }));
    warnSpy.mockRestore();
  });

  test("migration applied (first upsert succeeds): no retry, no warning", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: null });
    tryCreateAdminClientMock.mockReturnValue({ from: () => ({ upsert: upsertSpy }) });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await refreshOpportunityMatches(USER_ID);

    expect(result).toEqual({ refreshed: true });
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  test("a genuinely different error is not swallowed as if it were the known missing-column case", async () => {
    const upsertSpy = vi.fn().mockResolvedValue({ data: null, error: UNRELATED_ERROR });
    tryCreateAdminClientMock.mockReturnValue({ from: () => ({ upsert: upsertSpy }) });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await refreshOpportunityMatches(USER_ID);

    // Not the missing-column path -- exactly one attempt, no retry.
    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("upsert failed"), expect.objectContaining({ userId: USER_ID, error: UNRELATED_ERROR.message }));
    errorSpy.mockRestore();
  });

  test("even the retry can fail -- logged loudly, not silently", async () => {
    const upsertSpy = vi.fn().mockResolvedValueOnce({ data: null, error: MISSING_MATCH_CONFIDENCE_ERROR }).mockResolvedValueOnce({ data: null, error: UNRELATED_ERROR });
    tryCreateAdminClientMock.mockReturnValue({ from: () => ({ upsert: upsertSpy }) });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    await refreshOpportunityMatches(USER_ID);

    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("upsert failed even without match_confidence"), expect.objectContaining({ userId: USER_ID }));
    errorSpy.mockRestore();
  });
});
