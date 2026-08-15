-- In-app notification center (Phase 24). System-generated only — no client insert policy.

create type notification_category as enum ('deadline', 'new_opportunity', 'weekly_plan', 'profile_update', 'university_data_changed', 'system');

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category notification_category not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_id_idx on public.notifications(user_id, created_at desc);
