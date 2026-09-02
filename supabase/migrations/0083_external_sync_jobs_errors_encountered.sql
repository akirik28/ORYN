-- NOT APPLIED. Founder-gated like every migration in this repo's history -- write and leave
-- unapplied.
--
-- STATUS, corrected 2026-09-02 (docs/migration-audit-applied-vs-written-2026-09-02.md):
-- APPLIED, schema and code both confirmed working. `external_sync_jobs.errors_encountered`
-- exists live on `qtcvcflzxbuagvvwahhu`. `lib/jobs/run-with-tracking.ts` already attempts
-- the real `.update({..., errors_encountered: errorsEncountered })` write (its own
-- `isUndefinedColumnError` catch is a fallback for the unapplied case, not the normal
-- path), so no code change was needed once this landed. The line above was true when
-- written and is not true today.
--
-- CEO decision, 2026-09-02: external_sync_jobs.items_processed answers "how much
-- got done" but not "how much broke along the way" -- discover_opportunities,
-- discover_requirements, generate_weekly_plans and sync_us_universities all catch per-item
-- failures internally (a bad search result, a student whose plan generation threw, a school
-- College Scorecard couldn't find) and record them without the whole run throwing. A run that
-- swallowed fifty of those and a run that genuinely found nothing new both write
-- items_processed = 0 -- identical numbers for two different facts. The admin panel's
-- empty-streak detector (lib/jobs/job-health.ts) exists specifically to tell a quiet source
-- apart from a dead one, and currently cannot: both look exactly like an empty run.
--
-- This column is the missing half of that signal, not a replacement for items_processed --
-- see lib/jobs/run-with-tracking.ts's own comment for what populates it and why it's
-- required (not optional-with-a-default) on every caller.
--
-- lib/jobs/run-with-tracking.ts must keep working with this column unapplied -- it carries
-- the identical defensive pattern lib/plan/persist.ts already proved out for
-- weekly_actions.carried_forward (migration 0077), written the same day an earlier version
-- of that exact mistake, without the guard, took weekly-plan generation down for hours:
-- Postgres validates an UPDATE's SET clause before it ever looks at WHERE, so naming a
-- column that doesn't exist yet throws on every call regardless of what would have matched.
alter table public.external_sync_jobs
  add column if not exists errors_encountered integer not null default 0;

comment on column public.external_sync_jobs.errors_encountered is
  'Count of per-item failures a job caught and recorded internally without the whole run throwing -- distinct from the `error` column, which holds the message only when the entire job itself threw. A run with errors_encountered > 0 and items_processed = 0 found real, recorded problems, not just nothing new; the two must not be read as the same "quiet run" outcome.';
