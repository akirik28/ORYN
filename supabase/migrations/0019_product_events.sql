-- Privacy-conscious product analytics (spec Phase 52). System-generated only, same
-- posture as notifications: no insert/select policy for the regular client, so even the
-- owning student can't query their own raw event stream — writes happen via the admin
-- client from lib/analytics/log.ts. Deliberately excluded from /api/export-data, matching
-- the existing precedent for other operational tables (ai_usage, notifications,
-- rate_limit_events) — this is behavioral telemetry, not profile content.

create table public.product_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  event_name text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index product_events_user_id_idx on public.product_events(user_id);
create index product_events_event_name_idx on public.product_events(event_name, created_at desc);

alter table public.product_events enable row level security;
