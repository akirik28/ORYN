-- E2 (docs/PROXOLA-PLAN.md) -- verifying the contact email a student already provides
-- (contact_info.email), never collecting a new field. Written, not applied -- number
-- provisional pending CEO confirmation, same posture as every other staged-not-applied
-- migration in this repo (see docs/founder-blocked-backlog.md items 26/29/57/60).

-- Verified status lives beside the email it applies to, not as a bare boolean: it must be
-- possible to tell "this exact address was verified" from "an address was verified once,
-- then the student changed it" -- the latter must read as unverified again. Enforced once,
-- here, by a DB trigger rather than by every application write path remembering to clear
-- it -- upsertContactInfoPatch's ON CONFLICT DO UPDATE still fires this correctly (Postgres
-- update-of-column triggers fire on the DO UPDATE branch of an upsert), so this holds for
-- today's one write path and any future one without needing its own copy of the same check.
alter table public.contact_info
  add column email_verified_at timestamptz;

create or replace function public.contact_info_clear_verification_on_email_change()
returns trigger
language plpgsql
as $$
begin
  if new.email is distinct from old.email then
    new.email_verified_at := null;
  end if;
  return new;
end;
$$;

create trigger contact_info_00_clear_verification_on_email_change
  before update of email on public.contact_info
  for each row execute function public.contact_info_clear_verification_on_email_change();

-- One row per code sent, not one row per user -- a resend needs its own expiry/attempt
-- count independent of a prior, possibly-abandoned code, and keeping history (rather than
-- upserting a single row) is what makes a resend-cooldown check possible without a second
-- table. code_hash only: the spec's own "kod loglanmayacak" (the code must never be
-- logged) extends to storage -- a compromised database row must not itself be a working
-- code, the same reasoning every password column in this industry follows.
create table public.email_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  email text not null,
  code_hash text not null,
  expires_at timestamptz not null,
  attempts int not null default 0,
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index email_verifications_user_id_created_at_idx on public.email_verifications(user_id, created_at desc);

alter table public.email_verifications enable row level security;
-- Owner can read their own attempt history (needed for the resend-cooldown check to run
-- through the ordinary RLS-scoped client rather than the admin client) but never insert,
-- update, or delete directly -- every real write goes through the two Server Actions,
-- which use the admin client specifically so a student's own browser console can't mint
-- a row claiming an email already verified, or reset their own attempts counter to zero.
create policy "select own verification attempts" on public.email_verifications for select using (user_id = auth.uid());
