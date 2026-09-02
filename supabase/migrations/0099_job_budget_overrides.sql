-- Live-adjustable per-feature job budgets (lib/ai/limits/job-budget.ts), admin-only.
-- checkJobBudget currently reads JOB_BUDGET_USD, a constant computed once at import time
-- from AI_JOB_BUDGET_<FEATURE>_USD env vars (or a hardcoded estimate) -- changing it today
-- needs a deploy. This table lets an admin raise or lower a job's monthly budget without
-- one. A missing row means "use that existing default," never "no budget" or "$0 budget" --
-- see resolveJobBudgetUsd's own comment in job-budget.ts; a DB read failure falls back the
-- same way, since this gates a real spend control and failing toward "unbudgeted" would be
-- exactly the silent hole this whole night has spent closing elsewhere.
--
-- One row per feature (not a singleton like admin_finance_settings, 0094 -- job budgets are
-- a growing set keyed by feature name, not a handful of scalar settings). `feature` is plain
-- text, not a foreign key or a DB enum, matching ai_usage.feature's own convention -- the
-- two known values live in code (JobBudgetFeature, lib/ai/limits/job-budget.ts), and the
-- Server Action that writes here validates against that union before insert.
--
-- Service-role access only, same convention as provider_health/external_sync_jobs
-- (0014_row_level_security.sql) -- no student has any reason to read or write this.

create table public.job_budget_overrides (
  feature text primary key,
  budget_usd numeric(10,2) not null check (budget_usd >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger job_budget_overrides_set_updated_at before update on public.job_budget_overrides for each row execute function public.set_updated_at();

alter table public.job_budget_overrides enable row level security;
-- No policy -- service-role access only, same as provider_health/external_sync_jobs.
