import { beforeEach, describe, expect, test, vi } from "vitest";
import type { OpportunityCandidate } from "@/lib/ai/opportunity-extraction";

/**
 * lib/opportunities/discover.ts — the "stop early" half of the per-job AI budget
 * (lib/ai/limits/job-budget.ts). extractOpportunityFromContent throws
 * JobBudgetExceededError once opportunity_extraction is over its monthly figure; this pins
 * that discoverOpportunitiesForQuery catches it specifically (not the generic catch that
 * pushes an error string and keeps going), stops processing the rest of this query's
 * candidates, and reports `stoppedForBudget: true` rather than letting the error escape
 * into lib/jobs/run-with-tracking.ts's failure path — a budget stop is a normal, expected
 * outcome, not a job failure.
 */

const { searchMock, extractMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  extractMock: vi.fn(),
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: searchMock } }));
vi.mock("@/lib/ai/opportunity-extraction", () => ({ extractOpportunityFromContent: extractMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "opportunities") {
        return {
          select: () => Promise.resolve({ data: [] }),
          insert: (row: Record<string, unknown>) => ({
            select: () => ({ single: () => Promise.resolve({ data: { id: `opp-${row.title}`, ...row }, error: null }) }),
          }),
        };
      }
      if (table === "opportunity_sources") {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      throw new Error(`discover-budget.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { discoverOpportunitiesForQuery } from "@/lib/opportunities/discover";
import { JobBudgetExceededError } from "@/lib/ai/limits/job-budget";

function candidate(overrides: Partial<OpportunityCandidate> = {}): OpportunityCandidate {
  return {
    isRealOpportunity: true,
    title: "Regional Economics Olympiad",
    organization: "Example Foundation",
    description: "A competition.",
    category: "competition",
    country: null,
    remoteAllowed: null,
    minimumAge: null,
    maximumAge: null,
    eligibleCountries: [],
    fields: ["Economics"],
    cost: null,
    fundingAvailable: null,
    deadline: null,
    startDate: null,
    endDate: null,
    applicationUrl: null,
    ...overrides,
  };
}

function tavilyResult(url: string) {
  return { url, content: `Content for ${url}`, raw_content: null };
}

function budgetExceeded() {
  return new JobBudgetExceededError({
    feature: "opportunity_extraction",
    allowed: false,
    reason: "over_budget",
    monthToDateSpendUsd: 25,
    budgetUsd: 25,
  });
}

beforeEach(() => {
  searchMock.mockReset();
  extractMock.mockReset();
});

describe("discoverOpportunitiesForQuery — stopping for budget (lib/ai/limits/job-budget.ts)", () => {
  test("a budget error on the first candidate stops immediately — zero stored, stoppedForBudget true", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example"), tavilyResult("https://b.example")] });
    extractMock.mockRejectedValue(budgetExceeded());

    const result = await discoverOpportunitiesForQuery("test query");

    expect(result.stoppedForBudget).toBe(true);
    expect(result.opportunitiesStored).toBe(0);
    expect(result.errors).toEqual([]); // a budget stop is not an error string — see JobBudgetExceededError's own doc comment
    expect(extractMock).toHaveBeenCalledTimes(1); // never tried the second candidate
  });

  test("a budget error partway through stores what was already processed, then stops — later candidates are never attempted", async () => {
    searchMock.mockResolvedValue({
      success: true,
      data: [tavilyResult("https://a.example"), tavilyResult("https://b.example"), tavilyResult("https://c.example")],
    });
    extractMock
      .mockResolvedValueOnce({ candidate: candidate({ title: "First" }), usage: { inputTokens: 10, outputTokens: 10 } })
      .mockRejectedValueOnce(budgetExceeded());
    // A third call, if it happened, would be a real bug — mockRejectedValueOnce leaves
    // extractMock with no configured resolution for a 3rd call, so an unexpected 3rd call
    // would reject with an unrelated error, itself proof the loop didn't stop.

    const result = await discoverOpportunitiesForQuery("test query");

    expect(result.opportunitiesStored).toBe(1);
    expect(result.stoppedForBudget).toBe(true);
    expect(extractMock).toHaveBeenCalledTimes(2);
  });

  test("a normal (non-budget) extraction error still behaves as before — recorded and the loop continues", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example"), tavilyResult("https://b.example")] });
    extractMock
      .mockRejectedValueOnce(new Error("malformed model output"))
      .mockResolvedValueOnce({ candidate: candidate({ title: "Second" }), usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(result.stoppedForBudget).toBe(false);
    expect(result.errors).toEqual(["malformed model output"]);
    expect(result.opportunitiesStored).toBe(1);
    expect(extractMock).toHaveBeenCalledTimes(2); // the second candidate WAS tried — a normal error doesn't stop the run
  });

  test("no budget error at all — stoppedForBudget stays false, unchanged behavior", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidate: candidate(), usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(result.stoppedForBudget).toBe(false);
    expect(result.opportunitiesStored).toBe(1);
  });
});
