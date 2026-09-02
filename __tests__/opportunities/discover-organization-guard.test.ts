import { beforeEach, describe, expect, test, vi } from "vitest";
import type { OpportunityCandidate } from "@/lib/ai/opportunity-extraction";

/**
 * lib/opportunities/discover.ts — a candidate with no identifiable organization must never
 * reach the insert. decideIngestion() (lib/opportunities/ingest.ts) already rejects this on
 * the batch-research path; this pins the same requirement on the live AI-discovery path,
 * which had no such guard until the 2026-08-18 Drive-corpus import produced 197 organization:
 * null rows and left them permanently invisible to isDuplicateOpportunity()'s organization+
 * title branch (docs/null-organization-dedup-defect-2026-09-02.md).
 */

const { searchMock, extractMock, insertMock } = vi.hoisted(() => ({
  searchMock: vi.fn(),
  extractMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/providers/tavily", () => ({ tavilyProvider: { search: searchMock } }));
vi.mock("@/lib/ai/opportunity-extraction", () => ({ extractOpportunityFromContent: extractMock }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "opportunities") {
        return {
          select: () => Promise.resolve({ data: [] }),
          insert: (row: Record<string, unknown>) => {
            insertMock(row);
            return { select: () => ({ single: () => Promise.resolve({ data: { id: `opp-${row.title}`, ...row }, error: null }) }) };
          },
        };
      }
      if (table === "opportunity_sources") {
        return { insert: () => Promise.resolve({ error: null }) };
      }
      throw new Error(`discover-organization-guard.test.ts: unexpected table "${table}"`);
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
  insertMock.mockReset();
});

describe("discoverOpportunitiesForQuery — organization required before insert", () => {
  test("organization: null is skipped, never inserted, counted in skippedMissingOrganization", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidate: candidate({ organization: null }), usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(insertMock).not.toHaveBeenCalled();
    expect(result.opportunitiesStored).toBe(0);
    expect(result.skippedMissingOrganization).toBe(1);
    expect(result.errors).toEqual([]); // a skip is not an error — same convention as stoppedForBudget
  });

  test("organization: whitespace-only is treated as missing, not a real value", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidate: candidate({ organization: "   " }), usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(insertMock).not.toHaveBeenCalled();
    expect(result.skippedMissingOrganization).toBe(1);
  });

  test("a real organization still inserts normally — the guard doesn't touch the happy path", async () => {
    searchMock.mockResolvedValue({ success: true, data: [tavilyResult("https://a.example")] });
    extractMock.mockResolvedValue({ candidate: candidate({ organization: "Example Foundation" }), usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(insertMock.mock.calls[0][0]).toMatchObject({ organization: "Example Foundation" });
    expect(result.opportunitiesStored).toBe(1);
    expect(result.skippedMissingOrganization).toBe(0);
  });

  test("mixed batch — missing-organization candidates are skipped, real ones still store, the run doesn't stop early", async () => {
    searchMock.mockResolvedValue({
      success: true,
      data: [tavilyResult("https://a.example"), tavilyResult("https://b.example"), tavilyResult("https://c.example")],
    });
    extractMock
      .mockResolvedValueOnce({ candidate: candidate({ title: "No org", organization: null }), usage: { inputTokens: 10, outputTokens: 10 } })
      .mockResolvedValueOnce({ candidate: candidate({ title: "Has org", organization: "Real Org" }), usage: { inputTokens: 10, outputTokens: 10 } })
      .mockResolvedValueOnce({ candidate: candidate({ title: "Also no org", organization: null }), usage: { inputTokens: 10, outputTokens: 10 } });

    const result = await discoverOpportunitiesForQuery("test query");

    expect(insertMock).toHaveBeenCalledTimes(1);
    expect(result.opportunitiesStored).toBe(1);
    expect(result.skippedMissingOrganization).toBe(2);
    expect(extractMock).toHaveBeenCalledTimes(3); // unlike a budget stop, a missing org never halts the rest of the batch
  });
});
