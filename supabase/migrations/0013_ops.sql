-- Operational tables: external provider health, background job runs, and AI usage/cost
-- tracking. Admin-only; read/written via the service-role client, never user-facing RLS.

create type provider_status as enum ('healthy', 'degraded', 'down', 'unknown');

create table public.provider_health (
  id uuid primary key default gen_random_uuid(),
  provider text not null unique,
  status provider_status not null default 'unknown',
  last_success_at timestamptz,
  last_failure_at timestamptz,
  last_error text,
  updated_at timestamptz not null default now()
);
create trigger provider_health_set_updated_at before update on public.provider_health for each row execute function public.set_updated_at();

create type sync_job_status as enum ('running', 'succeeded', 'failed');

create table public.external_sync_jobs (
  id uuid primary key default gen_random_uuid(),
  job_name text not null,
  status sync_job_status not null default 'running',
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  items_processed integer not null default 0,
  error text,
  created_at timestamptz not null default now()
);
create index external_sync_jobs_job_name_idx on public.external_sync_jobs(job_name, started_at desc);

create table public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  feature text not null,
  provider text not null,
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  estimated_cost numeric(10,4),
  created_at timestamptz not null default now()
);
create index ai_usage_user_id_idx on public.ai_usage(user_id);
create index ai_usage_created_at_idx on public.ai_usage(created_at desc);
