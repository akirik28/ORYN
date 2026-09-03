-- A place for a student to report a problem or leave feedback (2026-09-03) -- the
-- founder's own words: "sitede şikayet veya geri bildirim alacak bir yer olmalı" (there
-- should be a place on the site to receive complaints or feedback).
--
-- One table, deliberately minimal: no category (a sentence in a student's own words is
-- worth more than a taxonomy at the volume this starts at -- CEO's call, and a category
-- column is exactly the kind of thing a later migration can add once there's real triage
-- volume to justify it), no status/read tracking (same reasoning -- the admin section this
-- ships with is a plain list, not a queue that needs a workflow yet).
--
-- Context, not the person: `path` and `locale` are captured automatically by the client at
-- submit time (never asked for), `plan_tier` and `user_id` come from the server-side
-- session, never client-supplied. No name field, no email field -- the session already
-- identifies the student, and these are minors (spec Phase 12/13): the product must not ask
-- for more than the report needs. `message` is free text a student wrote, so it gets the
-- same handling as any other student-authored content in this product -- private to the
-- team that reads it, never published, never surfaced on any profile.
--
-- `user_id` is `on delete set null`, matching `admin_action_log`'s own precedent (migration
-- 0097) for the same reason stated there: an unrelated table must never be the reason a
-- real account-deletion request (spec Phase 12) can't complete. A report surviving its
-- author's deleted account, with the link to them severed, is the correct minor-safe
-- outcome, not a bug.
--
-- RLS: a student can insert their own report (`auth.uid() = user_id`, enforced at the
-- database level so a client can't spoof `user_id` even if a bug ever tried) and can read
-- back their own rows -- not anyone else's, and this table has no admin-internal column
-- (nothing like message_reports' reviewed_by/resolution_note) for a select-own policy to
-- leak. Added specifically so this table can be included in the account data export (spec
-- Phase 12) the same way ai_usage/quota_grants already are -- a student's own written
-- feedback is their data, and lib/export/tables.ts's own established rule is "select-own
-- RLS plus a plain user_id column belongs in EXPORT_TABLES." The admin panel's own read
-- (features/admin/sections/feedback-reports-section.tsx) goes through the service-role
-- client regardless, which bypasses RLS entirely and was never gated by this policy either
-- way.

create table public.feedback_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  message text not null,
  path text not null,
  locale text not null,
  -- `profiles.plan_tier` (migration 0089) is itself a plain `text` + CHECK, not a named
  -- enum type -- matching that representation exactly rather than inventing a type that
  -- doesn't exist on the column this mirrors.
  plan_tier text not null check (plan_tier in ('standard', 'ultra')),
  created_at timestamptz not null default now()
);

comment on table public.feedback_reports is
  'A student-submitted problem report or piece of feedback (2026-09-03). No category, no status/read tracking -- deliberately minimal, see this migration''s own header. message is free text; treat it with the same care as any other student-authored content.';
comment on column public.feedback_reports.path is
  'The pathname the student was on when they opened the report form, captured automatically -- never asked for. Pathname only, never a full URL with query string, so an accidental token in a link can never end up stored here.';
comment on column public.feedback_reports.plan_tier is
  'The student''s plan_tier at submission time (server-derived from their session, never client-supplied) -- context for whoever reads the report, not something the student was asked to state.';

create index feedback_reports_created_at_idx on public.feedback_reports (created_at desc);

alter table public.feedback_reports enable row level security;

create policy "students can submit their own feedback report"
  on public.feedback_reports for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "students can read their own feedback reports"
  on public.feedback_reports for select
  to authenticated
  using (auth.uid() = user_id);
