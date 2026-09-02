-- Per-job "disable future runs" flag for the admin panel's operational-health section
-- (2026-09-02, founder ops-panel pivot — oryn-a7's brief: "a job burning budget and
-- producing nothing needs an off switch that isn't a deploy"). 0094 is oryn-3f's finance
-- settings table.
--
-- Deliberately does NOT attempt to stop a run already in progress -- there is no API to
-- terminate an in-flight Vercel serverless invocation from application code, and faking it
-- (marking a row "failed" while the real process keeps running to completion regardless)
-- would be exactly the "says done without proving it" trap oryn-a7's own brief warned
-- against for this feature. This table only gates the NEXT attempt: both the admin panel's
-- manual "run now" trigger and the /api/jobs/* cron routes must check `disabled` before
-- calling runWithTracking, not after.
--
-- One row per known job, upserted on toggle -- not a boolean column bolted onto
-- external_sync_jobs, which is a run-history LOG (one row per execution), not job
-- configuration. Mixing the two would make "is this job disabled" a query over the log's
-- most recent row instead of a direct, O(1) lookup, and would make a disabled job with zero
-- run history unrepresentable.
--
-- Same admin-only shape as provider_health/external_sync_jobs (migration 0013 + 0014's RLS
-- pass): RLS enabled, zero policies -- service-role access only, no student-facing read
-- path exists or should exist. `disabled_by` is a real profiles FK (not just a string) so
-- the admin panel can show who flipped a job off, matching message_reports' own
-- reviewed_by convention.
create table public.job_controls (
  job_name text primary key,
  disabled boolean not null default false,
  disabled_at timestamptz,
  disabled_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger job_controls_set_updated_at before update on public.job_controls for each row execute function public.set_updated_at();

alter table public.job_controls enable row level security;
-- No policies -- service-role access only, matching provider_health/external_sync_jobs.

comment on table public.job_controls is
  'Per-job "disable future runs" flag (2026-09-02). Checked by both the admin panel''s manual trigger actions and the /api/jobs/* cron routes before starting a run. Absence of a row (including "this table does not exist yet on this database") means not disabled -- see lib/jobs/job-controls.ts''s own comment for why fail-open is the correct direction here, the same convention every other written-and-possibly-unapplied migration in this project follows.';
