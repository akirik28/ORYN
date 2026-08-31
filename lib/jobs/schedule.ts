/**
 * Expected cadence for the four scheduled jobs (spec Phase 30), used to tell "hasn't run
 * because nothing needed doing yet" apart from "hasn't run because the scheduler stopped
 * firing" — the same failure shape as the GET/405 bug this session already found: the
 * Vercel dashboard keeps showing a cron "scheduled" whether or not it actually executes.
 *
 * `jobName` must match exactly what `runWithTracking()` is called with — both the
 * `/api/jobs/*` routes and the admin panel's manual "run now" triggers share these same
 * strings (see app/api/jobs/*\/route.ts and app/(app)/admin/actions.ts).
 *
 * `expectedIntervalMs` has no single source of truth with vercel.json — keep it in sync
 * by hand. All four are `0 H * * *` (daily at a fixed UTC hour) today, so ONE_DAY_MS is
 * correct for all four; update the relevant entry here if a vercel.json schedule changes
 * (see docs/deployment.md §6.0 for the Hobby-vs-Pro cadence tradeoff that would drive that).
 */

export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;

export interface JobDefinition {
  readonly jobName: string;
  readonly label: string;
  readonly expectedIntervalMs: number;
}

export const JOB_DEFINITIONS: readonly JobDefinition[] = [
  { jobName: "discover_opportunities", label: "Opportunity discovery", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "discover_requirements", label: "Requirement discovery", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "sync_us_universities", label: "University sync", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "deadline_reminders", label: "Deadline reminders", expectedIntervalMs: ONE_DAY_MS },
];

/**
 * How far past its expected interval a job can run before it's flagged as overdue rather
 * than just "hasn't happened to run yet." Needs to absorb legitimate platform jitter, not
 * just the ideal schedule: Vercel Hobby only guarantees the *hour*, not the minute (a
 * `0 2 * * *` job can fire anywhere in 02:00-02:59 — see docs/deployment.md §6), so two
 * consecutive runs of a nominally-24h job can legitimately land up to ~24h59m apart even
 * when nothing is wrong. 1.25x comfortably covers that (30h for a 24h job) while still
 * catching a job that's gone silent for the better part of a day.
 */
export const STALE_MULTIPLIER = 1.25;

/**
 * A run stuck in `running` past this long almost certainly didn't fail cleanly — it's more
 * likely the serverless function was killed by the platform's own timeout without ever
 * reaching runWithTracking's catch block, which is the one way a job can end up in a state
 * that looks identical to "still in progress" forever. `maxDuration` for `app/api/jobs/**`
 * is 300s (vercel.json) on Hobby's own ceiling; this gives a 10-minute buffer past that
 * before treating "running" as itself a problem rather than normal.
 */
export const STUCK_RUNNING_THRESHOLD_MS = 15 * 60 * 1000;

/**
 * True when `lastStartedAt` (the most recent recorded attempt at this job, regardless of
 * whether it succeeded) is further in the past than this job's own schedule accounts for.
 * `null` (no run has ever been recorded) is always stale — silence from day one is still
 * silence, not a special case.
 */
export function isJobStale(def: Pick<JobDefinition, "expectedIntervalMs">, lastStartedAt: Date | null, now: Date = new Date()): boolean {
  if (lastStartedAt === null) return true;
  return now.getTime() - lastStartedAt.getTime() > def.expectedIntervalMs * STALE_MULTIPLIER;
}

/** True when a run is still `running` well past how long any run should ever take. */
export function isRunStuck(status: string, startedAt: Date, now: Date = new Date()): boolean {
  if (status !== "running") return false;
  return now.getTime() - startedAt.getTime() > STUCK_RUNNING_THRESHOLD_MS;
}

/**
 * A row existing is not evidence a job did anything — several jobs are documented to
 * degrade to a no-op "success" when a provider credential is missing (e.g. discovery
 * jobs without `TAVILY_API_KEY` — see docs/environment-variables.md), so a permanently
 * misconfigured job would show a clean green streak forever without this. This many
 * *consecutive*, most-recent, successfully-completed runs all processing zero items is
 * what turns "today happened to find nothing new" (normal — university-fact syncs in
 * particular are mostly steady-state no-ops after their first run) into "this hasn't
 * accomplished anything in a week" (worth a human's attention). A week of daily runs.
 */
export const EMPTY_STREAK_THRESHOLD = 7;
