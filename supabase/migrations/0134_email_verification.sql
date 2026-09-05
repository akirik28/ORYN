-- 0134: E2 (docs/PROXOLA-PLAN.md) -- a verification code for the student's own account email
-- (the Supabase Auth sign-in address, the same one features/settings/settings-view.tsx already
-- shows read-only via `session.email`), CEO's decision on 2026-09-05.
--
-- Deliberately NOT Supabase Auth's own native "Confirm email" mechanism (app/auth/confirm/
-- route.ts, wired but currently inert -- founder-blocked-backlog.md item 1 turned it off
-- because no SMTP provider was configured to send it). That mechanism gates session creation
-- on confirmation by design (Supabase's own signUp() withholds a session until confirmed) --
-- exactly backwards from this migration's own non-negotiable: "the rest of the product is
-- never blocked" (a 16-year-old must not get stuck in onboarding over this). So this is a
-- fully separate, decoupled fact about the account, independent of session/login, checked only
-- by the specific consumers named in the spec (parent linking, notifications, account
-- recovery) -- none of which exist as real, live features yet (no email-sending code exists
-- anywhere in this codebase today; the parent-invite flow is a copy-a-link affordance, not an
-- email send). This migration is the enforcement point for whenever one of those IS built.
--
-- A few columns on `profiles`, not a separate table -- same shape as busy_mode/busy_mode_until:
-- a single current mutable fact per student, not a history worth its own audit table. Also
-- matches the spec's own "code must not be logged" rule better than a table would -- there is
-- nowhere durable a raw code is ever written, on purpose, and no separate table's own row
-- history to worry about retaining or purging.
--
-- *** NOT YET APPLIED *** -- this project's standing discipline (see 0077/0116/0117's own
-- migration headers): application code must degrade via isUndefinedColumnError, the same
-- pattern lib/plan/persist.ts's own carried_forward handling already documents, not assume
-- this has landed.

alter table public.profiles
  add column if not exists email_verified boolean not null default false,
  add column if not exists email_verification_code_hash text,
  add column if not exists email_verification_code_expires_at timestamptz,
  add column if not exists email_verification_attempts integer not null default 0,
  add column if not exists email_verification_last_sent_at timestamptz;

comment on column public.profiles.email_verified is
  'Whether the student has confirmed they control the email on their own account (auth.users.email) via lib/email/verification.ts''s own code flow -- independent of Supabase Auth''s native confirm-email mechanism (app/auth/confirm/route.ts), which is currently off. False by default for every account, including ones that predate this column; nothing back-fills it from auth.users.email_confirmed_at, since that column can be true for reasons unrelated to this flow (e.g. every signup auto-confirms while Supabase''s own "Confirm email" project setting is off) and would misrepresent an unverified address as verified. Must be checked before the student''s own email is used for anything not yet built as of this migration: parent-account linking, any notification sent to the student by email, or email-based account recovery outside Supabase Auth''s own built-in reset flow.';
comment on column public.profiles.email_verification_code_hash is
  'SHA-256 hex digest of the current one-time code, never the raw code -- the spec''s own "code must not be logged" rule extends to storage, not just application logs. Null when no code is currently outstanding (none ever sent, or the last one was already consumed by a successful verification).';
comment on column public.profiles.email_verification_code_expires_at is
  'When email_verification_code_hash stops being acceptable. A code that has expired must be rejected the same way a wrong one is (see lib/email/verification.ts) -- never silently extended by a later read.';
comment on column public.profiles.email_verification_attempts is
  'Failed verification attempts against the CURRENT code_hash -- reset to 0 every time a new code is issued, not a lifetime counter. Caps how many guesses a leaked or shared code is worth before a fresh one is required.';
comment on column public.profiles.email_verification_last_sent_at is
  'When the last code was actually sent (or attempted) -- the resend-cooldown clock, so a student cannot trigger unlimited sends against their own (or, if the send form is ever reachable pre-signup, someone else''s) inbox.';

-- Re-run safe: every `add column if not exists` is idempotent, same discipline as every prior
-- migration in this file's own lineage (0116/0117/0129/0133).
