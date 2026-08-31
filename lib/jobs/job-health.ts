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
export function summarizeJobHealth(def: JobDefinition, recentRuns: readonly ExternalSyncJob[], now: Date = new Date()): JobHealthSummary {
  const latestRun = recentRuns[0] ?? null;
  if (latestRun === null) {
    return { jobName: def.jobName, label: def.label, status: "never_run", lastStartedAt: null, lastFinishedAt: null, durationMs: null, itemsProcessed: null, error: null, emptyStreak: 0 };
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
    error: latestRun.error,
    emptyStreak: computeEmptyStreak(recentRuns),
  };
}

/** Convenience re-export so callers don't need a second import just for the threshold. */
export { EMPTY_STREAK_THRESHOLD };
