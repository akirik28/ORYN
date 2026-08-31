-- Makes a birth_year change *detectable* — not a re-consent flow, not a minor-consent
-- threshold decision. Neither of those is engineering's call (see LEGAL_REVIEW.md §6);
-- this migration exists only so the raw fact "consent was accepted at time T, and this
-- account's stated birth year became/changed to X at time U" is captured and queryable,
-- for whichever threshold counsel eventually picks. Today the record simply overwrites
-- and nothing anywhere knows it happened — that's the gap this closes.

-- ---------------------------------------------------------------------------
-- 1. profiles.terms_accepted_at — consent time, in the public schema
-- ---------------------------------------------------------------------------
-- Already recorded at signup (app/(auth)/actions.ts's signUp()), but only inside
-- auth.users.raw_user_meta_data — reachable only via the admin client. Denormalized here,
-- read-only from the trigger's perspective, so a birth-year-change row can be compared
-- against consent time with a plain query against `public`, and so handle_new_user()
-- below can populate it in the same insert it already does for display_name.
alter table public.profiles add column terms_accepted_at timestamptz;

-- One-time backfill for accounts created before this column existed — the fact is already
-- on file in auth.users, this just makes it queryable the same way for every account
-- rather than only ones created after today.
update public.profiles p
set terms_accepted_at = (u.raw_user_meta_data ->> 'terms_accepted_at')::timestamptz
from auth.users u
where p.id = u.id
  and p.terms_accepted_at is null
  and u.raw_user_meta_data ->> 'terms_accepted_at' is not null;

-- Extends the existing signup trigger (migration 0002) rather than adding a second one —
-- one INSERT into profiles, not two competing triggers writing the same row.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, terms_accepted_at)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    (new.raw_user_meta_data->>'terms_accepted_at')::timestamptz
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. birth_year_changes — every change, old value, new value, and consent time
-- ---------------------------------------------------------------------------
-- `previous_value is null` on a row means this was the FIRST time this account's birth
-- year was ever recorded (always onboarding's completeOnboarding(), today's only
-- first-set path) — deliberately not a separate `source` column: which write path fired
-- is fully recoverable from that shape (first row per user_id = became known; later rows
-- = changed), and adding a column that duplicates information already in the data risks
-- drifting from it. `terms_accepted_at` is copied onto the row at the moment of the
-- change (not looked up later) so the row is self-contained — whether consent predates,
-- postdates, or (today, always) predates this specific birth-year fact is answerable from
-- this table alone, without joining back to auth.users or re-deriving it some other way.
create table public.birth_year_changes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  previous_value integer,
  new_value integer,
  terms_accepted_at timestamptz,
  changed_at timestamptz not null default now()
);
create index birth_year_changes_user_id_idx on public.birth_year_changes(user_id, changed_at desc);

comment on table public.birth_year_changes is
  'Append-only. previous_value is null => this account''s birth year was recorded for the '
  'first time (today, always onboarding''s completeOnboarding()); non-null previous_value '
  '=> a later edit (today, only Settings'' updateBirthYear()). terms_accepted_at is the '
  'consent timestamp as of the moment of THIS change, copied in by the trigger, not '
  'looked up after the fact. Written entirely by profiles_log_birth_year_change (migration '
  '0072) — no application code inserts here directly. Exists so a birth-year edit that '
  'stops matching the consent already on file is detectable later; does not itself decide '
  'what age makes an account a minor, and triggers no re-consent flow (see LEGAL_REVIEW.md '
  '§6). Not yet in lib/export/tables.ts''s EXPORT_TABLES — flagged as a follow-up, since it '
  'has a direct user_id link and is plausibly the student''s own data under the same '
  'reasoning DATA_RIGHTS_AUDIT.md Part 3 applies to the other six gaps found there.';

alter table public.birth_year_changes enable row level security;
-- Deliberately no policies at all — not even a "select own" one. This is an internal
-- compliance record, not a product feature; whether a student should ever see "we noticed
-- your stated age changed" is itself a product/consent decision this migration is staying
-- out of, the same posture as ai_usage/product_events (system writes, RLS blocks
-- everyone else, including the admin client's own callers unless they already bypass RLS).

create or replace function public.log_birth_year_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.birth_year is distinct from old.birth_year then
    insert into public.birth_year_changes (user_id, previous_value, new_value, terms_accepted_at)
    values (new.id, old.birth_year, new.birth_year, new.terms_accepted_at);
  end if;
  return new;
end;
$$;

-- AFTER UPDATE OF birth_year, not a blanket "after update on profiles" — this must fire
-- on every code path that changes birth_year, including ones that don't exist yet, without
-- also firing (and paying the IS DISTINCT FROM check) on every unrelated profile edit.
create trigger profiles_log_birth_year_change
  after update of birth_year on public.profiles
  for each row execute function public.log_birth_year_change();
