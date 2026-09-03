import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * 2026-09-03: readOr/countOr adoption (docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md,
 * tier 1) -- getCounselorState feeds evaluateCandidateEligibility/rankCandidates and the
 * dashboard's actual recommendations, same centrality as lib/ai/student-context.ts. Every
 * read in its own body (and in getRequirementCandidateInputs, its one internal helper) had
 * `x.data ?? fallback`/`x.count ?? 0` with no visibility on failure.
 *
 * Reuses __tests__/counselor/state-skip-match-refresh.test.ts's own mocking shape
 * (chainable/minimalSessionClient) rather than inventing a second one -- that file already
 * established the right dependency graph for this exact function.
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

type TableResults = Partial<Record<string, { data: unknown; error: unknown; count?: number }>>;

function fakeClient(overrides: TableResults = {}) {
  const defaults: Record<string, { data: unknown; error: unknown; count?: number }> = {
    profiles: { data: { country: null, school_name: null, graduation_year: null, curriculum: null, headline: null, about: null }, error: null },
    skills: { data: null, error: null, count: 0 },
    featured_items: { data: null, error: null, count: 0 },
    contact_info: { data: null, error: null },
    opportunity_matches: { data: [], error: null },
    opportunities: { data: [], error: null },
    university_requirements: { data: [], error: null },
  };
  return {
    from: (table: string) => chainable(overrides[table] ?? defaults[table] ?? { data: [], error: null }),
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

describe("getCounselorState — read-failure visibility", () => {
  test("every read succeeding logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    await getCounselorState(USER_ID, "en", fakeClient() as never, { skipMatchRefresh: true });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed profile read still returns a buildable completeness checklist (fallback unchanged) and is logged by name", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ profiles: { data: null, error: { message: "boom" } } });
    await getCounselorState(USER_ID, "en", client as never, { skipMatchRefresh: true });
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("getCounselorState.profile"))).toBe(true);
    spy.mockRestore();
  });

  test("a failed skillCount read falls back to 0 (unchanged) via countOr, logged distinctly from a failed featuredCount read", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ skills: { data: null, error: { message: "boom" }, count: null as unknown as number } });
    await getCounselorState(USER_ID, "en", client as never, { skipMatchRefresh: true });
    const messages = spy.mock.calls.map(([m]) => m);
    expect(messages.some((m) => typeof m === "string" && m.includes("getCounselorState.skillCount"))).toBe(true);
    expect(messages.some((m) => typeof m === "string" && m.includes("getCounselorState.featuredCount"))).toBe(false);
    spy.mockRestore();
  });

  test("a failed opportunity_matches read returns [] (unchanged) and is logged", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({ opportunity_matches: { data: null, error: { message: "boom" } } });
    const state = await getCounselorState(USER_ID, "en", client as never, { skipMatchRefresh: true });
    expect(state.eligibleOpportunityMatches).toEqual([]);
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("getCounselorState.matches"))).toBe(true);
    spy.mockRestore();
  });

  test("getRequirementCandidateInputs: a failed university_requirements read returns [] (unchanged) and is logged, exercised via a non-empty active target", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    buildStudentAdvisorContextMock.mockResolvedValue({
      student: { displayName: "Test", preferredLanguage: "en" },
      targetUniversities: [{ id: "t1", universityId: "uni-1", programId: null, name: "Bocconi", status: "target", outlook: null }],
    });
    const client = fakeClient({ university_requirements: { data: null, error: { message: "boom" } } });
    const state = await getCounselorState(USER_ID, "en", client as never, { skipMatchRefresh: true });
    expect(state.requirementCandidateInputs).toEqual([]);
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("getRequirementCandidateInputs.requirements"))).toBe(true);
    spy.mockRestore();
  });
});
