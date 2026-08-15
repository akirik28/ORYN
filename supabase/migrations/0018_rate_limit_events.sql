-- General-purpose rate limiting for Server Actions / Route Handlers outside the AI path
-- (which already has its own sliding window sourced from ai_usage — see
-- lib/ai/rate-limit.ts). Unlike ai_usage, nothing else already logs these calls, so the
-- limiter itself both counts and records here — see lib/security/rate-limit.ts.

create table public.rate_limit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null,
  created_at timestamptz not null default now()
);
create index rate_limit_events_user_action_idx on public.rate_limit_events(user_id, action, created_at desc);

alter table public.rate_limit_events enable row level security;

-- Select is needed so the limiter (running as the calling user, not the admin client)
-- can count its own recent events. Insert is needed so it can record this call. There is
-- deliberately no update/delete policy — a user who could delete their own rows here
-- could reset their own throttle, defeating the point.
create policy "select own rate limit events" on public.rate_limit_events for select using (user_id = auth.uid());
create policy "insert own rate limit events" on public.rate_limit_events for insert with check (user_id = auth.uid());
