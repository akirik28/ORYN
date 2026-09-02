import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Coverage for the specific gap CEO's read-only-counselor-state package named: before this,
 * `getCounselorState` had no way for a caller to inspect a student's current counselor
 * state without also triggering `refreshOpportunityMatches` — the one write anywhere in
 * this function's call graph (confirmed by reading lib/counselor/state.ts start to finish;
 * grep for insert/update/upsert/delete found nothing else). That write is unconditional on
 * every call, no staleness check, and is the same mechanism this session traced the live
 * 12-duplicate-notification race to. `skipMatchRefresh` doesn't change that mechanism —
 * it makes it possible to opt out of it entirely for a caller that only wants to read.
 *
 * Only the gating behavior is under test here — every other dependency
 * (buildStudentAdvisorContext, assembleScoringFacts, getCompletenessChecklist) is mocked to
 * a minimal valid shape rather than exercised, since their own behavior already has (or
 * doesn't need) separate coverage.
 */

function chainable(result: { data: unknown; error: unknown; count?: number }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

function minimalSessionClient() {
  return {
    from: (table: string) => {
      if (table === "profiles") return chainable({ data: { country: null, school_name: null, graduation_year: null, curriculum: null, headline: null, about: null }, error: null });
      if (table === "skills") return chainable({ data: null, error: null, count: 0 });
      if (table === "featured_items") return chainable({ data: null, error: null, count: 0 });
      if (table === "contact_info") return chainable({ data: null, error: null });
      if (table === "opportunity_matches") return chainable({ data: [], error: null });
      return chainable({ data: [], error: null });
    },
  };
}

const { refreshOpportunityMatchesMock, buildStudentAdvisorContextMock, assembleScoringFactsMock, getCompletenessChecklistMock } = vi.hoisted(() => ({
  refreshOpportunityMatchesMock: vi.fn().mockResolvedValue({ refreshed: true }),
  buildStudentAdvisorContextMock: vi.fn(),
  assembleScoringFactsMock: vi.fn().mockResolvedValue({}),
  getCompletenessChecklistMock: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/opportunities/persist-matches", () => ({ refreshOpportunityMatches: refreshOpportunityMatchesMock }));
vi.mock("@/lib/ai/student-context", () => ({ buildStudentAdvisorContext: buildStudentAdvisorContextMock }));
vi.mock("@/lib/scoring/assemble-facts", () => ({ assembleScoringFacts: assembleScoringFactsMock }));
vi.mock("@/lib/scoring/completeness", () => ({ getCompletenessChecklist: getCompletenessChecklistMock }));

import { getCounselorState } from "@/lib/counselor/state";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  refreshOpportunityMatchesMock.mockClear();
  buildStudentAdvisorContextMock.mockReset().mockResolvedValue({
    student: { displayName: "Test", preferredLanguage: "en" },
    targetUniversities: [],
  });
  assembleScoringFactsMock.mockClear();
  getCompletenessChecklistMock.mockClear();
});

describe("getCounselorState — skipMatchRefresh", () => {
  test("omitted (default): calls refreshOpportunityMatches, exactly like every existing caller today", async () => {
    await getCounselorState(USER_ID, "en", minimalSessionClient() as never);
    expect(refreshOpportunityMatchesMock).toHaveBeenCalledTimes(1);
  });

  test("false: still calls refreshOpportunityMatches — explicit opt-out only, not implicit", async () => {
    await getCounselorState(USER_ID, "en", minimalSessionClient() as never, { skipMatchRefresh: false });
    expect(refreshOpportunityMatchesMock).toHaveBeenCalledTimes(1);
  });

  test("true: never calls refreshOpportunityMatches — a real read-only path now exists", async () => {
    await getCounselorState(USER_ID, "en", minimalSessionClient() as never, { skipMatchRefresh: true });
    expect(refreshOpportunityMatchesMock).not.toHaveBeenCalled();
  });

  test("true: still returns a complete CounselorState, reading whatever opportunity_matches already has", async () => {
    const state = await getCounselorState(USER_ID, "en", minimalSessionClient() as never, { skipMatchRefresh: true });
    expect(state.userId).toBe(USER_ID);
    expect(state.eligibleOpportunityMatches).toEqual([]);
  });
});
