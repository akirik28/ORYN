import { beforeEach, describe, expect, test, vi } from "vitest";
import type { RequirementCandidate } from "@/lib/ai/requirement-extraction";

/**
 * lib/requirements/discover.ts's discoverRequirementsForUniversity — the inner-loop half of
 * the per-job AI budget (lib/ai/limits/job-budget.ts). Mirrors
 * __tests__/opportunities/discover-budget.test.ts exactly (same mechanism, different table);
 * see that file's header for the full reasoning. The outer per-university batch loop
 * (discoverRequirementsForUncoveredUniversities) is covered separately in
 * discover-batch-budget.test.ts — mocking discoverRequirementsForUniversity itself there
 * would conflict with importing the real one here, in the same module-scoped vi.mock.
 */

const { searchMock, extractMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  extractMock: vi.fn(),
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: searchMock } }));
vi.mock("@/lib/ai/requirement-extraction", () => ({ extractRequirementsFromContent: extractMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "university_requirements") {
        return {
          select: () => ({ eq: () => Promise.resolve({ data: [] }) }),
          insert: (row: Record<string, unknown>) => Promise.resolve({ data: { id: `req-${row.title}`, ...row }, error: null }),
        };
      }
      throw new Error(`discover-budget.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { discoverRequirementsForUniversity } from "@/lib/requirements/discover";
import { JobBudgetExceededError } from "@/lib/ai/limits/job-budget";

function requirementCandidate(overrides: Partial<RequirementCandidate> = {}): RequirementCandidate {
  return {
    category: "academic",
    title: "Minimum GPA",
    detail: "A minimum GPA of 3.5 is required.",
    isRequired: true,
    structuredRule: null,
    ...overrides,
  };
}

function tavilyResult(url: string) {
  return { url, content: `Content for ${url}`, raw_content: null };
}

function budgetExceeded() {
  return new JobBudgetExceededError({
    feature: "requirement_extraction",
    allowed: false,
    reason: "over_budget",
    monthToDateSpendUsd: 15,
    budgetUsd: 15,
  });
}

const UNIVERSITY = { universityId: "univ-1", universityName: "Example University" };

beforeEach(() => {
  searchMock.mockReset();
  extractMock.mockReset();
});

describe("discoverRequirementsForUniversity — stopping for budget (lib/ai/limits/job-budget.ts)", () => {
  test("a budget error on the first page stops immediately — zero stored, stoppedForBudget true", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example"), tavilyResult("https://b.example")] });
    extractMock.mockRejectedValue(budgetExceeded());

    const result = await discoverRequirementsForUniversity(UNIVERSITY);

    expect(result.stoppedForBudget).toBe(true);
    expect(result.requirementsStored).toBe(0);
    expect(result.errors).toEqual([]);
    expect(extractMock).toHaveBeenCalledTimes(1);
  });

  test("a budget error partway through stores what was already extracted, then stops", async () => {
    searchMock.mockResolvedValue({
      success: true,
      data: [tavilyResult("https://a.example"), tavilyResult("https://b.example"), tavilyResult("https://c.example")],
    });
    extractMock
      .mockResolvedValueOnce({ candidates: [requirementCandidate()], usage: { inputTokens: 10, outputTokens: 10 } })
      .mockRejectedValueOnce(budgetExceeded());

    const result = await discoverRequirementsForUniversity(UNIVERSITY);

    expect(result.requirementsStored).toBe(1);
    expect(result.stoppedForBudget).toBe(true);
    expect(extractMock).toHaveBeenCalledTimes(2);
  });

  test("a normal (non-budget) extraction error still behaves as before — recorded, loop continues", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example"), tavilyResult("https://b.example")] });
    extractMock
      .mockRejectedValueOnce(new Error("malformed model output"))
      .mockResolvedValueOnce({ candidates: [requirementCandidate()], usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverRequirementsForUniversity(UNIVERSITY);

    expect(result.stoppedForBudget).toBe(false);
    expect(result.errors).toEqual(["malformed model output"]);
    expect(result.requirementsStored).toBe(1);
    expect(extractMock).toHaveBeenCalledTimes(2);
  });

  test("no budget error at all — stoppedForBudget stays false, unchanged behavior", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidates: [requirementCandidate()], usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverRequirementsForUniversity(UNIVERSITY);

    expect(result.stoppedForBudget).toBe(false);
    expect(result.requirementsStored).toBe(1);
  });
});
