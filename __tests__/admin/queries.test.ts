import { describe, expect, it } from "vitest";
import { bucketAIReliabilityByDay, bucketRateLimitEventsByDay, summarizeReportsBacklog, getDuplicateRestrictionTextGroups, type AdminReportRow } from "@/lib/admin/queries";
import { MockSupabaseClient, type MockTableConfig } from "@/__tests__/stubs/mock-supabase-table";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

function opportunityFactsRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "opp-1",
    title: "Test Opportunity",
    category: "research",
    cycle_status: "open",
    deadline: null,
    last_verified_at: null,
    verified_at: null,
    source_verified_at: null,
    eligible_countries: [],
    citizenship_restrictions: null,
    residency_restrictions: null,
    status: "active",
    ...overrides,
  };
}

function opportunitiesClient(rows: Record<string, unknown>[]) {
  const config: Record<string, MockTableConfig> = { opportunities: { rows } };
  return new MockSupabaseClient(config) as unknown as SupabaseClient<Database>;
}

describe("bucketAIReliabilityByDay", () => {
  it("groups calls by UTC calendar date and counts degraded calls separately from the total", () => {
    const rows = [
      { created_at: "2026-09-01T10:00:00Z", degraded: false, model: "claude-sonnet-5" },
      { created_at: "2026-09-01T14:30:00Z", degraded: true, model: "claude-haiku-4-5" },
      { created_at: "2026-09-02T02:00:00Z", degraded: false, model: "claude-sonnet-5" },
    ];
    expect(bucketAIReliabilityByDay(rows)).toEqual([
      { date: "2026-09-01", totalCalls: 2, degradedCalls: 1 },
      { date: "2026-09-02", totalCalls: 1, degradedCalls: 0 },
    ]);
  });

  it("excludes test-fixture rows (model: test-model) the same way getSpendSummary already does", () => {
    const rows = [
      { created_at: "2026-08-15T00:00:00Z", degraded: false, model: "test-model" },
      { created_at: "2026-09-01T10:00:00Z", degraded: false, model: "claude-sonnet-5" },
    ];
    expect(bucketAIReliabilityByDay(rows)).toEqual([{ date: "2026-09-01", totalCalls: 1, degradedCalls: 0 }]);
  });

  it("no rows produces no days, not a day with zero counts", () => {
    expect(bucketAIReliabilityByDay([])).toEqual([]);
  });

  it("sorts oldest first regardless of input order", () => {
    const rows = [
      { created_at: "2026-09-02T00:00:00Z", degraded: false, model: "claude-sonnet-5" },
      { created_at: "2026-08-30T00:00:00Z", degraded: false, model: "claude-sonnet-5" },
      { created_at: "2026-09-01T00:00:00Z", degraded: false, model: "claude-sonnet-5" },
    ];
    expect(bucketAIReliabilityByDay(rows).map((d) => d.date)).toEqual(["2026-08-30", "2026-09-01", "2026-09-02"]);
  });
});

describe("bucketRateLimitEventsByDay", () => {
  it("groups by day and breaks each day down by action, most-frequent first", () => {
    const rows = [
      { action: "advisor_message", created_at: "2026-09-01T10:00:00Z" },
      { action: "advisor_message", created_at: "2026-09-01T11:00:00Z" },
      { action: "cv_upload", created_at: "2026-09-01T12:00:00Z" },
    ];
    expect(bucketRateLimitEventsByDay(rows)).toEqual([
      {
        date: "2026-09-01",
        totalEvents: 3,
        byAction: [
          { action: "advisor_message", count: 2 },
          { action: "cv_upload", count: 1 },
        ],
      },
    ]);
  });

  it("no rows produces no days", () => {
    expect(bucketRateLimitEventsByDay([])).toEqual([]);
  });
});

const BASE_REPORT: AdminReportRow = {
  id: "r1",
  reporterId: "u1",
  reportedUserId: "u2",
  reporterName: "A",
  reportedName: "B",
  reason: "spam",
  status: "open",
  createdAt: "2026-09-01T00:00:00Z",
  resolutionNote: null,
  messagePreview: null,
  recommendationPreview: null,
  postBody: null,
  postId: null,
  postIsRemoved: false,
  postStillExists: false,
};

describe("summarizeReportsBacklog", () => {
  const NOW = new Date("2026-09-02T00:00:00Z");

  it("no reports at all: zero backlog", () => {
    expect(summarizeReportsBacklog([], NOW)).toEqual({ openCount: 0, oldestOpenAt: null, oldestOpenAgeMs: null });
  });

  it("resolved/dismissed reports don't count toward the open backlog", () => {
    const reports = [{ ...BASE_REPORT, status: "resolved" as const }, { ...BASE_REPORT, id: "r2", status: "dismissed" as const }];
    expect(summarizeReportsBacklog(reports, NOW)).toEqual({ openCount: 0, oldestOpenAt: null, oldestOpenAgeMs: null });
  });

  it("finds the oldest OPEN report specifically, not just the earliest row overall", () => {
    const reports = [
      { ...BASE_REPORT, id: "newer-resolved", status: "resolved" as const, createdAt: "2026-08-01T00:00:00Z" },
      { ...BASE_REPORT, id: "older-open", status: "open" as const, createdAt: "2026-08-20T00:00:00Z" },
      { ...BASE_REPORT, id: "newer-open", status: "open" as const, createdAt: "2026-08-30T00:00:00Z" },
    ];
    const backlog = summarizeReportsBacklog(reports, NOW);
    expect(backlog.openCount).toBe(2);
    expect(backlog.oldestOpenAt).toBe("2026-08-20T00:00:00Z");
    expect(backlog.oldestOpenAgeMs).toBe(NOW.getTime() - new Date("2026-08-20T00:00:00Z").getTime());
  });
});

// 2026-09-04: the real bug this function exists to catch — a research pass's own internal
// note ("None stated on the fetched pages.") stored as citizenship_restrictions/
// residency_restrictions instead of left null, confirmed live on 11 opportunities. Two of
// these tests prove the structural (duplicate-text) signal specifically, not a content guess.
describe("getDuplicateRestrictionTextGroups", () => {
  it("no groups when every restriction value is unique or null", async () => {
    const client = opportunitiesClient([
      opportunityFactsRow({ id: "opp-1", citizenship_restrictions: "US citizens or green card holders only." }),
      opportunityFactsRow({ id: "opp-2", residency_restrictions: "Open to UK schools only." }),
      opportunityFactsRow({ id: "opp-3" }),
    ]);
    expect(await getDuplicateRestrictionTextGroups(client)).toEqual([]);
  });

  it("flags two opportunities sharing the exact same citizenship_restrictions text", async () => {
    const client = opportunitiesClient([
      opportunityFactsRow({ id: "opp-1", title: "LSE Summer School", citizenship_restrictions: "None stated on the fetched pages." }),
      opportunityFactsRow({ id: "opp-2", title: "Sciences Po Summer School", citizenship_restrictions: "None stated on the fetched pages." }),
      opportunityFactsRow({ id: "opp-3", title: "Unrelated Program", citizenship_restrictions: "US citizens only." }),
    ]);
    const groups = await getDuplicateRestrictionTextGroups(client);
    expect(groups).toEqual([
      {
        field: "citizenship_restrictions",
        text: "None stated on the fetched pages.",
        opportunityIds: ["opp-1", "opp-2"],
        opportunityTitles: ["LSE Summer School", "Sciences Po Summer School"],
      },
    ]);
  });

  it("does NOT flag genuine restriction prose that merely starts the same way as boilerplate (the false-positive a prefix check would create)", async () => {
    const client = opportunitiesClient([
      opportunityFactsRow({
        id: "sutton-trust",
        title: "Sutton Trust UK Summer Schools",
        citizenship_restrictions:
          "Not explicitly stated by citizenship on the fetched pages, but the school/residency criteria make it de facto restricted to students schooled in the UK.",
      }),
      opportunityFactsRow({ id: "other-program", title: "Other Program", citizenship_restrictions: "Not stated on the official page." }),
    ]);
    expect(await getDuplicateRestrictionTextGroups(client)).toEqual([]);
  });

  it("tracks citizenship_restrictions and residency_restrictions as separate fields, even with identical text", async () => {
    const client = opportunitiesClient([
      opportunityFactsRow({ id: "opp-1", citizenship_restrictions: "None stated on the fetched pages." }),
      opportunityFactsRow({ id: "opp-2", residency_restrictions: "None stated on the fetched pages." }),
    ]);
    expect(await getDuplicateRestrictionTextGroups(client)).toEqual([]);
  });

  it("only counts active opportunities, matching every other coverage function in this file", async () => {
    const client = opportunitiesClient([
      opportunityFactsRow({ id: "opp-1", status: "active", citizenship_restrictions: "None stated on the fetched pages." }),
      opportunityFactsRow({ id: "opp-2", status: "disabled", citizenship_restrictions: "None stated on the fetched pages." }),
    ]);
    expect(await getDuplicateRestrictionTextGroups(client)).toEqual([]);
  });
});
