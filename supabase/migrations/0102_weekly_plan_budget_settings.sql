-- The aggregate spend ceiling for generate-weekly-plans (Job D), the prerequisite oryn-a7
-- and oryn-f5 agreed must exist before that job can be armed -- see
-- docs/weekly-plan-aggregate-budget-2026-09-02.md for the full analysis this migration
-- closes. Numbered 0102: 0098-0101 are claimed by other lanes (oryn-31, oryn-f5 x2,
-- oryn-60) but not yet pushed to origin/main as of this writing -- checked every remote
-- branch, not just main, per oryn-a7's explicit instruction, since main's own maximum has
-- been a lower bound all night.
--
-- A GENUINELY THIRD MECHANISM, not an extension of either existing budget table -- f5's own
-- framing, endorsed by oryn-a7: lib/ai/limits/job-budget.ts (0099, job_budget_overrides)
-- answers "how much may this ONE FEATURE spend" for features with no per-student
-- attribution (selectModelForUser(null) callers); lib/ai/limits/budget.ts answers "how much
-- may ONE STUDENT spend" every month. Neither can express "how much may weekly_plan spend
-- SUMMED ACROSS EVERY STUDENT this month" -- a real, different question, specific to the one
-- feature whose cost scales with signups rather than with one person's own usage.
--
-- DEGRADE, not stop -- same policy budget.ts already uses for real, felt per-student harm
-- (a hard stop is job-budget.ts's own choice, correct there specifically because nothing is
-- "hit" by a background job waiting until tomorrow; weekly_plan calls carry a real userId,
-- so that justification doesn't transfer). Once this month's total weekly_plan spend crosses
-- monthly_ceiling_usd, every subsequent weekly_plan call for the rest of the month uses
-- DEGRADE_MODEL regardless of that individual student's own status -- every student still
-- gets a plan, nobody is skipped by processing order (the fairness problem a per-run/
-- per-student stop would create, since generateWeeklyPlansForActiveStudents has no
-- .order() clause).
--
-- Singleton settings row, fixed known id -- same shape as 0094_admin_finance_settings.sql
-- (a typed table over a generic key-value store, one known setting today, no reason to
-- invent a multi-row schema for a single number). No RLS enabled, no policies -- matching
-- 0094's own reasoning exactly: no is_admin(uuid) SQL function exists in this schema to
-- write a policy against, and admin status is an application-layer check
-- (app/(app)/admin/actions.ts's requireAdmin() + createAdminClient(), the service-role
-- client that bypasses RLS once past that gate) -- simply never enabling RLS here reaches
-- the same "unreachable from anon/authenticated" outcome 0013's provider_health/
-- external_sync_jobs get from RLS-enabled-with-zero-policies, without inventing a function
-- this schema doesn't have.
--
-- monthly_ceiling_usd defaults to $10.00 -- a documented placeholder, not a measured or
-- founder-specified figure the way budget.ts's $0.50/$1.00 are. Real measured cost today:
-- $0.0292/call x 8 onboarded students x 4.33 weeks/month = ~$0.94/month if this job ran
-- weekly for everyone -- $10 leaves real headroom above that (so the guard doesn't fire on
-- day one) while still being a genuine ceiling once signups grow, adjustable by the founder
-- from the admin panel without a deploy the moment they have a real headcount target to
-- peg it to -- see docs/weekly-plan-aggregate-budget-2026-09-02.md's own "pegged to
-- headcount the founder actually expects soon, not today's 8" framing.
--
-- Per this project's standing discipline (lib/supabase/errors.ts's canonical statement,
-- extended to a missing TABLE via isUndefinedTableError the same way 0094 does): written
-- and left unapplied. Absence must read as "use the code-level default ceiling", never as
-- an error or a blocked weekly-plan generation -- see
-- lib/ai/limits/weekly-plan-budget.ts's own read path.
create table if not exists public.weekly_plan_budget_settings (
  id uuid primary key,
  monthly_ceiling_usd numeric not null default 10.00,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.weekly_plan_budget_settings is
  'Singleton settings row for generate-weekly-plans'' aggregate monthly spend ceiling (2026-09-03). Application code always reads/writes the one row at id = 00000000-0000-0000-0000-000000000002 (WEEKLY_PLAN_BUDGET_SETTINGS_ID in lib/ai/limits/weekly-plan-budget.ts). A different fixed id from admin_finance_settings'' 00000000-0000-0000-0000-000000000001 -- these are two separate singleton tables, not two rows in one.';
comment on column public.weekly_plan_budget_settings.monthly_ceiling_usd is
  'Once this calendar month''s total weekly_plan spend (summed across every student, from ai_usage) reaches this figure, every subsequent weekly_plan call this month uses the degraded model regardless of the individual student''s own status. Degrade, not stop -- see this migration''s own header for why. Defaults to $10.00, a documented placeholder pending the founder''s own review, not a measured or specified number.';
comment on column public.weekly_plan_budget_settings.updated_by is
  'Which admin last changed the ceiling -- ON DELETE SET NULL rather than CASCADE, so a deleted admin account does not silently delete the founder''s own configured ceiling along with it.';
