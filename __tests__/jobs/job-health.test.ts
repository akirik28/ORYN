import { describe, expect, it } from "vitest";
import { summarizeJobHealth, EMPTY_STREAK_THRESHOLD } from "@/lib/jobs/job-health";
import { ONE_DAY_MS, ONE_HOUR_MS, STUCK_RUNNING_THRESHOLD_MS, type JobDefinition } from "@/lib/jobs/schedule";
import type { ExternalSyncJob } from "@/types/database";

const NOW = new Date("2026-08-31T12:00:00Z");
const DEF: JobDefinition = { jobName: "deadline_reminders", label: "Deadline reminders", expectedIntervalMs: ONE_DAY_MS };

function makeRun(overrides: Partial<ExternalSyncJob>): ExternalSyncJob {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    job_name: DEF.jobName,
    status: "succeeded",
    started_at: NOW.toISOString(),
    finished_at: NOW.toISOString(),
    items_processed: 0,
    errors_encountered: 0,
    error: null,
    created_at: NOW.toISOString(),
    ...overrides,
  };
}

/** N runs, evenly spaced one expected-interval apart, newest first — the shape a real
 * per-job query returns. `itemsProcessed`/`status` apply to every run in the batch. */
function makeStreak(count: number, itemsProcessed: number, status: ExternalSyncJob["status"] = "succeeded"): ExternalSyncJob[] {
  return Array.from({ length: count }, (_, i) => {
    const at = new Date(NOW.getTime() - i * DEF.expectedIntervalMs);
    return makeRun({ status, items_processed: itemsProcessed, started_at: at.toISOString(), finished_at: at.toISOString() });
  });
}

describe("summarizeJobHealth — status derivation", () => {
  it("a job that has never run reads as never_run, not as absent", () => {
    const summary = summarizeJobHealth(DEF, [], NOW);
    expect(summary).toMatchObject({ jobName: "deadline_reminders", label: "Deadline reminders", status: "never_run", lastStartedAt: null, durationMs: null, emptyStreak: 0 });
  });

  it("a recent successful run passes through as succeeded, with computed duration", () => {
    const startedAt = new Date(NOW.getTime() - 5 * 60_000);
    const finishedAt = new Date(NOW.getTime() - 2 * 60_000);
    const run = makeRun({ started_at: startedAt.toISOString(), finished_at: finishedAt.toISOString(), items_processed: 12 });
    const summary = summarizeJobHealth(DEF, [run], NOW);
    expect(summary.status).toBe("succeeded");
    expect(summary.durationMs).toBe(3 * 60_000);
    expect(summary.itemsProcessed).toBe(12);
  });

  it("a recent failed run passes through as failed, carrying its error", () => {
    const run = makeRun({ status: "failed", error: "Tavily rate limit exceeded." });
    const summary = summarizeJobHealth(DEF, [run], NOW);
    expect(summary.status).toBe("failed");
    expect(summary.error).toBe("Tavily rate limit exceeded.");
  });

  it("an old run — even one that succeeded — reads as stale, not succeeded", () => {
    const longAgo = new Date(NOW.getTime() - 2 * ONE_DAY_MS);
    const run = makeRun({ status: "succeeded", started_at: longAgo.toISOString(), finished_at: longAgo.toISOString() });
    expect(summarizeJobHealth(DEF, [run], NOW).status).toBe("stale");
  });

  it("an old FAILED run also reads as stale, not failed — staleness answers a different question", () => {
    const longAgo = new Date(NOW.getTime() - 2 * ONE_DAY_MS);
    const run = makeRun({ status: "failed", started_at: longAgo.toISOString(), finished_at: longAgo.toISOString(), error: "boom" });
    expect(summarizeJobHealth(DEF, [run], NOW).status).toBe("stale");
  });

  it("a run stuck in running past the stuck threshold reads as stuck, not running", () => {
    const wayBack = new Date(NOW.getTime() - STUCK_RUNNING_THRESHOLD_MS - ONE_HOUR_MS);
    const run = makeRun({ status: "running", started_at: wayBack.toISOString(), finished_at: null });
    const summary = summarizeJobHealth(DEF, [run], NOW);
    expect(summary.status).toBe("stuck");
    expect(summary.durationMs).toBeNull();
  });

  it("a freshly-started running job reads as running, not stuck or stale", () => {
    const justStarted = new Date(NOW.getTime() - 30_000);
    const run = makeRun({ status: "running", started_at: justStarted.toISOString(), finished_at: null });
    expect(summarizeJobHealth(DEF, [run], NOW).status).toBe("running");
  });

  it("stuck takes priority over stale when a run is both old and still marked running", () => {
    // A run that started 3 days ago and never finished is BOTH past the staleness window
    // and past the stuck-running window — it should read as the more specific, more
    // actionable "stuck", not the generic "stale".
    const threeDaysAgo = new Date(NOW.getTime() - 3 * ONE_DAY_MS);
    const run = makeRun({ status: "running", started_at: threeDaysAgo.toISOString(), finished_at: null });
    expect(summarizeJobHealth(DEF, [run], NOW).status).toBe("stuck");
  });
});

describe("summarizeJobHealth — recentRuns (2026-09-02, admin ops-health timeline)", () => {
  it("a job that has never run carries an empty recentRuns, not undefined", () => {
    expect(summarizeJobHealth(DEF, [], NOW).recentRuns).toEqual([]);
  });

  it("carries every passed-in run through, trimmed to the fields a timeline needs, same order as input", () => {
    const runs = [
      makeRun({ status: "failed", items_processed: 0, errors_encountered: 2, error: "Tavily rate limit exceeded." }),
      makeRun({ status: "succeeded", items_processed: 5, errors_encountered: 0 }),
    ];
    expect(summarizeJobHealth(DEF, runs, NOW).recentRuns).toEqual([
      { startedAt: NOW.toISOString(), finishedAt: NOW.toISOString(), status: "failed", itemsProcessed: 0, errorsEncountered: 2, error: "Tavily rate limit exceeded." },
      { startedAt: NOW.toISOString(), finishedAt: NOW.toISOString(), status: "succeeded", itemsProcessed: 5, errorsEncountered: 0, error: null },
    ]);
  });
});

describe("summarizeJobHealth — emptyStreak (a row is not evidence the job did anything)", () => {
  it("no runs at all means no streak", () => {
    expect(summarizeJobHealth(DEF, [], NOW).emptyStreak).toBe(0);
  });

  it("a single successful run that processed items has no streak", () => {
    const run = makeRun({ items_processed: 5 });
    expect(summarizeJobHealth(DEF, [run], NOW).emptyStreak).toBe(0);
  });

  it("one lone zero-item run counts as a streak of 1 — not yet a problem on its own", () => {
    const run = makeRun({ items_processed: 0 });
    expect(summarizeJobHealth(DEF, [run], NOW).emptyStreak).toBe(1);
  });

  it("a run with items breaks the streak immediately, however many empty runs preceded it further back", () => {
    const runs = [makeRun({ items_processed: 0 }), makeRun({ items_processed: 0 }), makeRun({ items_processed: 3 }), makeRun({ items_processed: 0 })];
    expect(summarizeJobHealth(DEF, runs, NOW).emptyStreak).toBe(2);
  });

  it("a failed run breaks the streak — failure is already visible via status, not folded into this", () => {
    const runs = [makeRun({ items_processed: 0 }), makeRun({ status: "failed", items_processed: 0, error: "boom" })];
    expect(summarizeJobHealth(DEF, runs, NOW).emptyStreak).toBe(1);
  });

  it("a full week of empty successful runs reaches the threshold — this is the case that must stop looking green", () => {
    const runs = makeStreak(EMPTY_STREAK_THRESHOLD, 0);
    const summary = summarizeJobHealth(DEF, runs, NOW);
    expect(summary.emptyStreak).toBe(EMPTY_STREAK_THRESHOLD);
    expect(summary.status).toBe("succeeded");
    // status alone would read as healthy — emptyStreak is what the page must act on
    // separately to avoid exactly the "healthy-looking signal with no information" trap.
  });

  it("only counts up to as many runs as were actually fetched — cannot report a longer streak than the query provided", () => {
    const runs = makeStreak(3, 0);
    expect(summarizeJobHealth(DEF, runs, NOW).emptyStreak).toBe(3);
  });

  it("a university-sync-shaped job with a long run of legitimate zero-change days is still visible as a streak, even though it's expected to be normal for that job", () => {
    // This module doesn't get to decide per-job what's "normal" — it reports the fact
    // (N consecutive empty successes). Whether that's expected for sync_us_universities
    // specifically or alarming for discover_opportunities is a judgment call left to
    // whoever reads the number, not baked into this function.
    const runs = makeStreak(EMPTY_STREAK_THRESHOLD + 20, 0);
    expect(summarizeJobHealth({ ...DEF, jobName: "sync_us_universities" }, runs, NOW).emptyStreak).toBe(EMPTY_STREAK_THRESHOLD + 20);
  });
});
