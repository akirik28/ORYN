/**
 * Expected cadence for the eight scheduled jobs (spec Phase 30 plus three extras — see
 * docs/job-scheduling-decision-2026-09-02.md for the full per-job reasoning and
 * docs/scheduled-jobs-phase30-mapping-2026-09-01.md for how each route maps to the spec),
 * used to tell "hasn't run because nothing needed doing yet" apart from "hasn't run because
 * the scheduler stopped firing" — the same failure shape as the GET/405 bug this session
 * already found: the Vercel dashboard keeps showing a cron "scheduled" whether or not it
 * actually executes.
 *
 * `jobName` must match exactly what `runWithTracking()` is called with — both the
 * `/api/jobs/*` routes and the admin panel's manual "run now" triggers share these same
 * strings (see app/api/jobs/*\/route.ts and app/(app)/admin/actions.ts).
 *
 * `expectedIntervalMs` has no single source of truth with vercel.json — keep it in sync by
 * hand. A ninth route, `generate-weekly-plans` (Phase 30 Job D / Phase 9's weekly review
 * engine), deliberately has no entry here — it's the one job whose cost scales per student
 * (an AI call each), and arming it is a founder tier/budget decision, not a scheduling one;
 * see docs/job-scheduling-decision-2026-09-02.md §4 and
 * docs/weekly-plan-aggregate-budget-2026-09-02.md for the full cost analysis and the still-
 * open aggregate-spend-ceiling gap that decision depends on closing first.
 *
 * A tenth route, `scheduled-review`, also deliberately has no entry here as of 2026-09-03 —
 * see lib/scoring/scheduled-review.ts's own header for the full reasoning. It was briefly
 * armed here and in vercel.json without that file's own founder-sign-off requirement being
 * checked first; pulled back out, not because of anything wrong with the job itself (8
 * students, no AI cost, correct per-item error handling — see
 * docs/job-dry-run-audit-2026-09-03.md), purely because the gate it names hadn't been
 * confirmed cleared. Stays out until the founder says otherwise.
 */

export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
export const ONE_WEEK_MS = 7 * ONE_DAY_MS;
/** Calendar months vary 28-31 days; a flat 30-day nominal interval with STALE_MULTIPLIER's
 *  1.25x tolerance (37.5 days) comfortably covers every real gap between two "1st of the
 *  month" firings, including the longest (31 days, e.g. Aug 1 -> Sep 1). Matches
 *  lib/scoring/monthly-review.ts's own REVIEW_WINDOW_DAYS, not a separately-chosen number. */
export const ONE_MONTH_MS = 30 * ONE_DAY_MS;

export interface JobDefinition {
  readonly jobName: string;
  readonly label: string;
  readonly expectedIntervalMs: number;
}

export const JOB_DEFINITIONS: readonly JobDefinition[] = [
  { jobName: "discover_opportunities", label: "Opportunity discovery", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "discover_requirements", label: "Requirement discovery", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "sync_us_universities", label: "University sync", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "notify_university_changes", label: "University change notifications", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "deadline_reminders", label: "Deadline reminders", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "detect_stale_data", label: "Stale data detection", expectedIntervalMs: ONE_DAY_MS },
  { jobName: "refresh_admission_outlooks", label: "Admission outlook refresh", expectedIntervalMs: ONE_WEEK_MS },
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
