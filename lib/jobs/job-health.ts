/**
 * Turns one job's definition plus its most recent recorded runs into the derived facts the
 * admin panel renders — pure and DB-free so the "is this actually a problem" logic is
 * unit-testable without a database, unlike the Server Component that calls it.
 */
import type { ExternalSyncJob } from "@/types/database";
import { isJobStale, isRunStuck, EMPTY_STREAK_THRESHOLD, type JobDefinition } from "./schedule";

/**
 * Mirrors `SyncJobStatus` plus two synthetic states this module derives rather than reads
 * off a row: `never_run` (no row exists at all) and `stale` (the last row is older than
 * the job's own schedule tolerates). `stuck` is a `running` row past a sane time limit —
 * kept distinct from plain `running` because it needs the same "this is a problem" visual
 * treatment as `stale`, not the neutral in-progress one.
 */
export type JobHealthStatus = "never_run" | "succeeded" | "failed" | "running" | "stuck" | "stale";

export interface JobHealthSummary {
  readonly jobName: string;
  readonly label: string;
  readonly status: JobHealthStatus;
  readonly lastStartedAt: string | null;
  readonly lastFinishedAt: string | null;
  readonly durationMs: number | null;
  readonly itemsProcessed: number | null;
  /**
   * Per-item failures the latest run counted internally without the whole job throwing —
   * present alongside `itemsProcessed` (both come from the same row) but, until this field
   * existed, never actually reached the admin panel: `runWithTracking` only ever marks a
   * job `failed` on a *thrown* exception, so a run that caught and counted real per-item
   * failures (a provider returning a structured error, one student's plan generation
   * failing) still shows `status: "succeeded"` — correctly, that's what the whole-run
   * outcome was — but with no way for a human to see the failures sitting right there in
   * the row unless this field surfaces them. Null only when the job has never run at all
   * (mirrors `itemsProcessed`'s own null case), never omitted otherwise.
   */
  readonly errorsEncountered: number | null;
  readonly error: string | null;
  /**
   * How many of the most recent runs, counting back from the latest, were ALL
   * `succeeded` with `items_processed === 0`. A row existing and saying "succeeded" is
   * not evidence the job did anything — this is what tells "found nothing new tonight"
   * (normal) apart from "has quietly done nothing for a week" (not normal). Stops
   * counting at the first run that either processed something or wasn't a clean success,
   * so a `failed` run breaks the streak rather than being folded into it — a failure is
   * already visible through `status`, this field exists for the failure mode that
   * *isn't* otherwise visible.
   */
  readonly emptyStreak: number;
  /**
   * The recent runs this summary was computed from, oldest last (same order as the
   * caller's query) — exposed so a timeline/sparkline can render each individual run's
   * outcome, not only the latest one. A job that ran and failed five times this week reads
   * completely differently from one that's only ever run once, even though both would
   * otherwise summarize to the same `latestRun`-derived status; this field is what lets a
   * caller tell those apart. Capped at whatever `recentRuns` the caller passed in (typically
   * `EMPTY_STREAK_THRESHOLD` rows) — never re-fetched here, this module stays DB-free.
   */
  readonly recentRuns: readonly RecentJobRun[];
}

/** The subset of an ExternalSyncJob row a timeline needs — trimmed rather than the raw row
 *  so a caller rendering history doesn't have to know which of the row's own fields matter. */
export interface RecentJobRun {
  readonly startedAt: string;
  readonly finishedAt: string | null;
  readonly status: string;
  readonly itemsProcessed: number;
  readonly errorsEncountered: number;
  readonly error: string | null;
}

function computeEmptyStreak(recentRuns: readonly ExternalSyncJob[]): number {
  let streak = 0;
  for (const run of recentRuns) {
    if (run.status === "succeeded" && run.items_processed === 0) streak += 1;
    else break;
  }
  return streak;
}

/**
 * `recentRuns` is this job's most recent `external_sync_jobs` rows, ordered newest-first
 * — the caller is expected to have already scoped the query to this specific `job_name`
 * (a mixed, un-scoped recency query would let an infrequently-run job get crowded out of
 * view entirely by other jobs' activity, which is the exact silent-failure shape this
 * exists to prevent). An empty array means the job has never run.
 *
 * Needs more than just the latest row so it can see a *pattern* across runs
 * (`emptyStreak`), not only the latest one's own outcome — pass at least
 * `EMPTY_STREAK_THRESHOLD` rows for that to be meaningful; fewer still works, it just
 * can't report a streak longer than what was fetched.
 */
function toRecentJobRun(run: ExternalSyncJob): RecentJobRun {
  return {
    startedAt: run.started_at,
    finishedAt: run.finished_at,
    status: run.status,
    itemsProcessed: run.items_processed,
    errorsEncountered: run.errors_encountered,
    error: run.error,
  };
}

export function summarizeJobHealth(def: JobDefinition, recentRuns: readonly ExternalSyncJob[], now: Date = new Date()): JobHealthSummary {
  const latestRun = recentRuns[0] ?? null;
  if (latestRun === null) {
    return {
      jobName: def.jobName,
      label: def.label,
      status: "never_run",
      lastStartedAt: null,
      lastFinishedAt: null,
      durationMs: null,
      itemsProcessed: null,
      errorsEncountered: null,
      error: null,
      emptyStreak: 0,
      recentRuns: [],
    };
  }

  const startedAt = new Date(latestRun.started_at);
  const finishedAt = latestRun.finished_at ? new Date(latestRun.finished_at) : null;
  const durationMs = finishedAt ? finishedAt.getTime() - startedAt.getTime() : null;

  let status: JobHealthStatus;
  if (isRunStuck(latestRun.status, startedAt, now)) {
    status = "stuck";
  } else if (isJobStale(def, startedAt, now)) {
    // Staleness overrides a merely-old "succeeded" or "failed" verdict: the question this
    // status answers first is "is the *schedule itself* still alive," not "how did the
    // last attempt go" — a job that succeeded once, 40 hours ago, and hasn't been heard
    // from since is not currently healthy, whatever that one run's own outcome was.
    status = "stale";
  } else {
    status = latestRun.status as JobHealthStatus;
  }

  return {
    jobName: def.jobName,
    label: def.label,
    status,
    lastStartedAt: latestRun.started_at,
    lastFinishedAt: latestRun.finished_at,
    durationMs,
    itemsProcessed: latestRun.items_processed,
    errorsEncountered: latestRun.errors_encountered,
    error: latestRun.error,
    emptyStreak: computeEmptyStreak(recentRuns),
    recentRuns: recentRuns.map(toRecentJobRun),
  };
}

/** Convenience re-export so callers don't need a second import just for the threshold. */
export { EMPTY_STREAK_THRESHOLD };
