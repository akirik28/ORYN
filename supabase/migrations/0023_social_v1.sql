-- V1 social/network scope (Chat 2 pass, founder-approved 2026-08-15 — see
-- docs/product-decisions.md "V1 social/network scope" for the full reasoning).
--
-- Deliberately NOT a follow/feed/DM system. Two pieces:
--   1. An opt-in, private-by-default public profile (a narrow column subset only —
--      never the raw `profiles` row).
--   2. Mutual-consent connections (request -> accept), not an open asymmetric follow.
-- Both choices follow directly from AGENTS.md's minor-safe principles (this product's
-- primary audience is 14-18-year-olds): "avoid public-by-default profiles", "avoid
-- exposing school/student information", "do not build public student messaging in V1".

alter table public.profiles
  add column is_public boolean not null default false,
  add column looking_for text;

comment on column public.profiles.is_public is
  'Student opts in to a shareable profile. Default false — never public by default.';
comment on column public.profiles.looking_for is
  'Free-text "currently looking for" status shown on the public profile when set '
  '(e.g. "Research collaborators", "Internship for Summer 2027"). Null = not shown.';

-- `connections` is created before `public_profiles` (reordered from this migration's
-- first draft, which had the view first with a comment claiming forward-reference was
-- fine "as long as it exists by the time this view is *queried*, not defined" — wrong:
-- Chat 3's first live run of this migration against a real Postgres failed with
-- `relation "public.connections" does not exist` at the view's CREATE, which rolled back
-- the entire migration transaction, so *nothing* in this file — not the view, not the
-- table, not one RLS policy — had ever actually been created in any environment this
-- shipped to. CREATE VIEW resolves and records its dependencies immediately, unlike a
-- function body; it cannot forward-reference a not-yet-created relation the way PL/pgSQL
-- can. Fixed by creating `connections` first.
create type connection_status as enum ('pending', 'accepted', 'declined');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status connection_status not null default 'pending',
  -- Order-independent pair key so (A requests B) and (B requests A) can't both exist as
  -- separate rows — generated/stored rather than enforced only in application code.
  low_id uuid generated always as (least(requester_id, recipient_id)) stored,
  high_id uuid generated always as (greatest(requester_id, recipient_id)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_no_self check (requester_id <> recipient_id),
  constraint connections_unique_pair unique (low_id, high_id)
);

create index connections_recipient_idx on public.connections(recipient_id, status);
create index connections_requester_idx on public.connections(requester_id, status);

create trigger connections_set_updated_at
  before update on public.connections
  for each row execute function public.set_updated_at();

alter table public.connections enable row level security;

create policy "select own connections" on public.connections
  for select using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "create own connection request" on public.connections
  for insert with check (requester_id = auth.uid() and status = 'pending');

-- Only the recipient can accept/decline. A requester withdraws via delete, not update
-- (see below) — keeps "who can move this to accepted" unambiguous.
create policy "recipient responds to connection request" on public.connections
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

create policy "either party deletes a connection" on public.connections
  for delete using (requester_id = auth.uid() or recipient_id = auth.uid());

-- Deliberately a security-definer view (the default — no `security_invoker`), not an
-- RLS policy opened up on `profiles` itself. `profiles` carries fields that must never
-- be public (birth_year, school_name, city, is_admin, profile_strength_score,
-- busy_mode*, onboarding_*, ...) — a raw RLS carve-out on the table would depend on
-- every future column addition being re-audited for public-safety. This view instead
-- hard-codes both the column whitelist and the `is_public = true` predicate, so it can
-- never return a private row or a column outside this list no matter how `profiles`
-- grows later. Granted to `authenticated` only (not `anon`) — a deliberately more
-- conservative reading of "optionally shareable" than a fully public, unauthenticated,
-- indexable page; see product-decisions.md if this should be loosened later.
create view public.public_profiles as
  select id, display_name, country, curriculum, graduation_year, looking_for, created_at
  from public.profiles
  where is_public = true
     -- Continuity carve-out: if A is connected to (or has a pending request with) the
     -- caller, the caller can still see A's basic info even if A later goes private —
     -- otherwise an existing connection would silently show as an unresolvable/blank
     -- row. This does NOT let two private users discover each other from scratch: V1's
     -- "Connect" action only ever appears on an already-public profile page (see
     -- app/(app)/u/[id]/page.tsx), so a connection can only be *initiated* via a public
     -- profile in the first place.
     or id in (
       select case when requester_id = auth.uid() then recipient_id else requester_id end
       from public.connections
       where auth.uid() in (requester_id, recipient_id)
     );

grant select on public.public_profiles to authenticated;

-- New notification category so a connection request/acceptance can notify through the
-- existing system-generated notifications pipeline (lib/notifications/create.ts) rather
-- than a bespoke one. Safe to use in later, separate transactions/requests immediately —
-- see PostgreSQL docs on ALTER TYPE ... ADD VALUE and transaction visibility.
alter type notification_category add value 'connection';
