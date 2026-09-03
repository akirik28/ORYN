import { beforeEach, describe, expect, test, vi } from "vitest";
import type { OpportunityCandidate } from "@/lib/ai/opportunity-extraction";

/**
 * lib/opportunities/discover.ts — the existing-opportunities read that feeds dedup must
 * throw on a real failure, not degrade to an empty comparison set. Found 2026-09-03
 * (docs/remaining-jobs-dry-run-2026-09-03.md): the read discarded its own `error`, so a
 * transient failure would silently make every candidate this run read as new, regardless
 * of whether it already exists in the catalog — the run would insert duplicates, not fail
 * loudly. Deliberately not lib/supabase/safe-read.ts's `readOr`: that helper's contract
 * still returns the fallback on failure (logged, but the caller's behavior is unchanged),
 * which is right where an empty result is a safe answer. It is not safe here.
 */

let extractCallCount = 0;

const { searchMock, extractMock, opportunitiesSelectMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  extractMock: vi.fn(),
  opportunitiesSelectMock: vi.fn(),
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: searchMock } }));
vi.mock("@/lib/ai/opportunity-extraction", () => ({ extractOpportunityFromContent: extractMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "opportunities") {
        return { select: opportunitiesSelectMock, insert: () => ({ select: () => ({ single: () => Promise.resolve({ data: { id: "opp-1" }, error: null }) }) }) };
      }
      if (table === "opportunity_sources") {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      throw new Error(`discover-dedup-read-safety.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { discoverOpportunitiesForQuery } from "@/lib/opportunities/discover";

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

beforeEach(() => {
  searchMock.mockReset();
  extractMock.mockReset();
  opportunitiesSelectMock.mockReset();
  extractCallCount = 0;
});

describe("discoverOpportunitiesForQuery — the dedup read must throw on failure, not degrade to an empty set", () => {
  test("a real read error rejects the whole call, before any candidate is even extracted", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockImplementation(async () => {
      extractCallCount += 1;
      return { candidate: candidate(), usage: { inputTokens: 10, outputTokens: 10 } };
    });
    opportunitiesSelectMock.mockResolvedValue({ data: null, error: { message: "connection reset" } });

    await expect(discoverOpportunitiesForQuery("test query")).rejects.toThrow(/failed to load existing opportunities/);
    expect(extractCallCount).toBe(0);
  });

  test("a clean read (even zero existing rows) behaves exactly as before -- the fix doesn't touch the real empty-catalog case", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidate: candidate(), usage: { inputTokens: 10, outputTokens: 10 } });
    opportunitiesSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(result.opportunitiesStored).toBe(1);
    expect(result.errors).toEqual([]);
  });
});
