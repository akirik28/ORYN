-- Professional Profile & Networking Pack, Batch G.
--
-- Self-view exclusion and anti-inflation are both DB-enforced, not just app-layer
-- discipline: `profile_views_no_self` matches the same check-constraint pattern
-- messages/connections/blocked_users already use for their own no-self rules, and the
-- (viewed_user_id, viewer_id, viewed_on) unique constraint means a second view from the
-- same person on the same day is naturally a no-op (insert ... on conflict do nothing)
-- rather than a second row — a repeated-refresh inflation guard that needs no separate
-- rate-limit table.
create table public.profile_views (
  id uuid primary key default gen_random_uuid(),
  viewed_user_id uuid not null references public.profiles(id) on delete cascade,
  viewer_id uuid not null references public.profiles(id) on delete cascade,
  viewed_on date not null default current_date,
  created_at timestamptz not null default now(),
  constraint profile_views_no_self check (viewed_user_id <> viewer_id),
  constraint profile_views_dedup unique (viewed_user_id, viewer_id, viewed_on)
);
create index profile_views_viewed_user_idx on public.profile_views(viewed_user_id, viewed_on desc);

alter table public.profile_views enable row level security;

-- Owner reads their own raw rows (needed server-side to compute 7-day/30-day counts) —
-- lib/social/profile-views.ts only ever returns a count to the client, never viewer_id,
-- which is the actual V1 privacy commitment ("kimlerin baktığını listelemek zorunda
-- değilsin"), not something this policy alone enforces (RLS can't hide one column while
-- allowing the rest of a row).
create policy "select own profile view rows" on public.profile_views for select using (viewed_user_id = auth.uid());

-- Anyone can record that they themselves viewed someone (viewer_id = their own id) —
-- viewing a profile requires no prior relationship, same as viewing a public profile
-- itself requires none.
create policy "record own view" on public.profile_views for insert with check (viewer_id = auth.uid());
