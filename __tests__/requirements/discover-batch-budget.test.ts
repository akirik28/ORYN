import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RequirementCandidate } from "@/lib/ai/requirement-extraction";

/**
 * discoverRequirementsForUncoveredUniversities — the OUTER per-university batch loop. Once
 * one university's run reports stoppedForBudget (discover-budget.test.ts covers that
 * mechanism directly), this must stop starting new universities for the rest of the batch
 * rather than spend a Tavily search on a university whose very first candidate will hit the
 * identical budget check.
 *
 * Drives the REAL discoverRequirementsForUncoveredUniversities *and* the real
 * discoverRequirementsForUniversity it calls internally, end to end — mocking only the true
 * external dependencies (Tavily, the AI extraction call, the admin Supabase client,
 * lib/universities/canonical's supersession lookup). A same-module partial mock
 * (discoverRequirementsForUniversity mocked while discoverRequirementsForUncoveredUniversities
 * stays real, both exports of lib/requirements/discover.ts) was tried first and doesn't
 * work: an internal function-to-function call within one compiled module never goes through
 * vi.mock's module-resolution interception, only genuine cross-module imports do — confirmed
 * by that version failing with a real (unmocked) createAdminClient() throw, since the mocked
 * getUniversitiesNeedingRequirementDiscovery was silently never actually substituted in.
 */

const { searchMock, extractMock, universitiesRef } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  extractMock: vi.fn(),
  universitiesRef: { current: [] as { id: string; name: string }[] },
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: searchMock } }));
vi.mock("@/lib/ai/requirement-extraction", () => ({ extractRequirementsFromContent: extractMock }));
vi.mock("@/lib/universities/canonical", () => ({
  loadSupersessionMap: async () => ({}),
  getSupersededUniversityIds: () => [],
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "universities") {
        return { select: () => ({ order: () => ({ limit: () => Promise.resolve({ data: universitiesRef.current, error: null }) }) }) };
      }
      if (table === "university_requirements") {
        return {
          // Two distinct real call shapes land on this table: a bare-awaited
          // .select("university_id") from getUniversitiesNeedingRequirementDiscovery's
          // "already covered" check, and a .select(...).eq(...) from
          // discoverRequirementsForUniversity's own existing-rows check. This stub answers
          // both — thenable directly (for the bare await) and via .eq() (for the chain) —
          // always empty, so no university is pre-covered and no candidate is a dupe.
          select: () => ({
            then: (onFulfilled: (v: { data: unknown[]; error: null }) => unknown) => Promise.resolve({ data: [], error: null }).then(onFulfilled),
            eq: () => Promise.resolve({ data: [], error: null }),
          }),
          insert: (row: Record<string, unknown>) => Promise.resolve({ data: { id: `req-${row.title}`, ...row }, error: null }),
        };
      }
      throw new Error(`discover-batch-budget.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { discoverRequirementsForUncoveredUniversities } from "@/lib/requirements/discover";
import { JobBudgetExceededError } from "@/lib/ai/limits/job-budget";

function requirementCandidate(overrides: Partial<RequirementCandidate> = {}): RequirementCandidate {
  return { category: "academic", title: "Minimum GPA", detail: "A minimum GPA of 3.5 is required.", isRequired: true, structuredRule: null, ...overrides };
}

function tavilyResult(url: string) {
  return { success: true as const, data: [{ url, content: `Content for ${url}`, raw_content: null }] };
}

function budgetExceeded() {
  return new JobBudgetExceededError({ feature: "requirement_extraction", allowed: false, reason: "over_budget", monthToDateSpendUsd: 15, budgetUsd: 15 });
}

const THREE_UNIVERSITIES = [
  { id: "u1", name: "University One" },
  { id: "u2", name: "University Two" },
  { id: "u3", name: "University Three" },
];

beforeEach(() => {
  searchMock.mockReset();
  extractMock.mockReset();
  universitiesRef.current = [];
});

describe("discoverRequirementsForUncoveredUniversities — stopping the batch for budget", () => {
  test("all three universities run when none stop for budget", async () => {
    universitiesRef.current = THREE_UNIVERSITIES;
    searchMock.mockImplementation((query: string) => Promise.resolve(tavilyResult(`https://example.com/${query}`)));
    extractMock.mockResolvedValue({ candidates: [requirementCandidate()], usage: { inputTokens: 10, outputTokens: 10 } });

    const results = await discoverRequirementsForUncoveredUniversities();

    expect(results).toHaveLength(3);
    expect(results.every((r) => !r.stoppedForBudget)).toBe(true);
    expect(searchMock).toHaveBeenCalledTimes(3);
  });

  test("the batch stops after the university that hits budget — the third is never searched", async () => {
    universitiesRef.current = THREE_UNIVERSITIES;
    searchMock.mockImplementation((query: string) => Promise.resolve(tavilyResult(`https://example.com/${query}`)));
    extractMock
      .mockResolvedValueOnce({ candidates: [requirementCandidate()], usage: { inputTokens: 10, outputTokens: 10 } }) // u1: succeeds
      .mockRejectedValueOnce(budgetExceeded()); // u2: hits budget
    // No third resolution configured — if u3 were (wrongly) attempted, extractMock would
    // reject with Vitest's own "no more mocked values" error, itself proof of the bug.

    const results = await discoverRequirementsForUncoveredUniversities();

    expect(results).toHaveLength(2); // u3 never in the results at all
    expect(results.map((r) => r.universityId)).toEqual(["u1", "u2"]);
    expect(results[1]?.stoppedForBudget).toBe(true);
    expect(searchMock).toHaveBeenCalledTimes(2); // u3's Tavily search never ran
  });

  test("the first university hitting budget stops the batch after just one search", async () => {
    universitiesRef.current = THREE_UNIVERSITIES;
    searchMock.mockImplementation((query: string) => Promise.resolve(tavilyResult(`https://example.com/${query}`)));
    extractMock.mockRejectedValueOnce(budgetExceeded());

    const results = await discoverRequirementsForUncoveredUniversities();

    expect(results).toHaveLength(1);
    expect(results[0]?.stoppedForBudget).toBe(true);
    expect(searchMock).toHaveBeenCalledTimes(1);
  });

  test("an empty target list (nothing left to discover) never calls Tavily or the extractor", async () => {
    universitiesRef.current = [];

    const results = await discoverRequirementsForUncoveredUniversities();

    expect(results).toEqual([]);
    expect(searchMock).not.toHaveBeenCalled();
    expect(extractMock).not.toHaveBeenCalled();
  });
});
