import { describe, expect, it } from "vitest";
import { bucketAIReliabilityByDay, bucketRateLimitEventsByDay, summarizeReportsBacklog, type AdminReportRow } from "@/lib/admin/queries";

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
