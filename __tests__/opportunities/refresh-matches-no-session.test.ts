import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Regression coverage for the bug found 2026-09-02 via docs/performance.md's
 * cache()-in-Route-Handler sweep: refreshOpportunityMatches took no client parameter and
 * always built its own session-cookie client. getCounselorState called it unconditionally
 * even when getCounselorState itself had an admin client (the weekly-plan job's real,
 * no-session path). The anonymous client's reads all came back RLS-empty, the function's own
 * zero-opportunities early return fired, and it resolved `{ refreshed: true }` having
 * refreshed nothing -- silent because nothing threw.
 *
 * These tests assert the actual silence is fixed, not just that a `client` parameter is now
 * accepted: a session-less default client that can't see the student's profile must report
 * `{ refreshed: false }`, and an explicitly passed client must be the one actually queried,
 * proven by it returning real data that the function visibly acts on (proceeds past the new
 * guard) rather than by inspecting call arguments alone.
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

/** A client whose every table read comes back empty/null -- what an anonymous
 *  (no-session) Supabase client actually gets back under this project's real RLS
 *  policies (profiles/profile_scores/student_interests/saved_opportunities/
 *  opportunity_matches are all `user_id = auth.uid()`; opportunities is
 *  `authenticated`-only) -- confirmed live against oryn-qa-scratch, 2026-09-02. */
function anonymousClient() {
  return { from: () => chainable({ data: null, error: null }) };
}

/** A client that can genuinely see this student -- e.g. the weekly-plan job's own admin
 *  client. `profiles` resolves to a real row; every other table is empty just to keep this
 *  test focused on the one thing it needs to prove (the guard passes and the passed
 *  client, not a fresh anonymous one, is what answered) rather than the full matching
 *  pipeline, which __tests__/opportunities/persist-matches.test.ts already covers in
 *  isolation via buildReasonCodes. */
function realClient() {
  const fromSpy = vi.fn((table: string) => {
    if (table === "profiles") {
      return chainable({ data: { id: "student-1", birth_year: 2009, country: "United States", citizenship_countries: [], graduation_year: 2027, preferred_language: "en" }, error: null });
    }
    if (table === "opportunities") {
      return chainable({ data: [], error: null }); // empty on purpose -- see comment above
    }
    return chainable({ data: [], error: null });
  });
  return { from: fromSpy };
}

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
  // Admin client (only used for the final upsert) is available in every test here -- the
  // "admin client unavailable" branch is already covered by
  // refresh-matches-admin-degradation.test.ts; these tests are about the session question.
  tryCreateAdminClientMock.mockReturnValue({ from: () => ({ upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }) });
});

describe("refreshOpportunityMatches — the actual silence, not just parameter acceptance", () => {
  test("no client passed, and the default (session) client can't see the student: reports refreshed: false, not true", async () => {
    createClientMock.mockResolvedValue(anonymousClient());
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await refreshOpportunityMatches(USER_ID);

    expect(result).toEqual({ refreshed: false });
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining("profile row not visible"), expect.objectContaining({ userId: USER_ID }));
    // The old bug's exact false-positive shape must not survive under a new name.
    expect(result).not.toEqual({ refreshed: true });
    errorSpy.mockRestore();
  });

  test("an explicit client that can see the student is the one actually queried -- proceeds past the guard using ITS data, not a fresh session client's", async () => {
    const passedClient = realClient();
    // If the function ignored `client` and fell back to createClient() anyway, this
    // anonymous mock (not passedClient) is what it would see -- and the test would still
    // pass on a naive "no throw" check. Asserting on the real outcome, not the call
    // shape, is what makes this a test of the fix rather than of the signature.
    createClientMock.mockResolvedValue(anonymousClient());

    const result = await refreshOpportunityMatches(USER_ID, "en", passedClient as never);

    // A real profile was visible (via passedClient), so the guard this fix added did not
    // fire; the function reached its normal "no active opportunities" outcome instead of
    // the bug's "no visibility" one -- both return refreshed: true, but only one of them
    // is reachable in this test, so getting here proves passedClient answered.
    expect(result).toEqual({ refreshed: true });
    expect(passedClient.from).toHaveBeenCalledWith("profiles");
    // createClient() (the session path) must never even be constructed when a client was
    // explicitly provided -- confirms the parameter short-circuits it entirely rather than
    // both being consulted.
    expect(createClientMock).not.toHaveBeenCalled();
  });

  test("getProfileScores (the cache()'d helper) is skipped when a client is passed -- it always builds its own session client, wrong for the no-session path this fix exists for", async () => {
    const passedClient = realClient();
    createClientMock.mockResolvedValue(anonymousClient());

    await refreshOpportunityMatches(USER_ID, "en", passedClient as never);

    expect(getProfileScoresMock).not.toHaveBeenCalled();
    expect(passedClient.from).toHaveBeenCalledWith("profile_scores");
  });

  test("omitting client entirely keeps today's exact behavior for every real page-render caller: getProfileScores is used, not the raw query", async () => {
    createClientMock.mockResolvedValue(realClient());

    await refreshOpportunityMatches(USER_ID);

    expect(getProfileScoresMock).toHaveBeenCalledWith(USER_ID);
  });
});
