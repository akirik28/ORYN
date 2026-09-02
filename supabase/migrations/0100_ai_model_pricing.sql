-- Live-adjustable per-token model pricing (lib/ai/pricing.ts), admin-only.
-- PRICE_PER_MILLION_TOKENS_USD is a hardcoded table -- when a model isn't in it,
-- estimateCostUsd returns null and estimated_cost is stored NULL (lib/ai/pricing.ts's own
-- documented behavior), which is exactly the gap this table exists to close without a
-- deploy: an admin can add or correct a model's rate here directly.
--
-- Checked BEFORE the hardcoded table falls back, not instead of it (see
-- resolveModelCostUsd's own comment in lib/ai/pricing.ts) -- an admin only ever needs to
-- enter the models that are new or wrong, never re-enter every model already correct in
-- code. One row per model, a growing list, same shape reasoning as 0099's
-- job_budget_overrides (a list keyed by name, not a handful of scalar settings like 0094's
-- singleton admin_finance_settings).
--
-- Service-role access only, same convention as job_budget_overrides/provider_health
-- (0014_row_level_security.sql) -- no student has any reason to read or write this.

create table public.ai_model_pricing (
  model text primary key,
  input_rate_per_million numeric(10,4) not null check (input_rate_per_million >= 0),
  output_rate_per_million numeric(10,4) not null check (output_rate_per_million >= 0),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger ai_model_pricing_set_updated_at before update on public.ai_model_pricing for each row execute function public.set_updated_at();

alter table public.ai_model_pricing enable row level security;
-- No policy -- service-role access only, same as job_budget_overrides/provider_health.
