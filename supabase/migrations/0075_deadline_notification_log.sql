-- Gives the deadline-reminder job (lib/deadlines/scan.ts, Phase 24) a real, deliberate
-- dedupe key instead of the "any deadline notification for this link in the last ~20h"
-- rolling-window check it used before. That check had two problems: it was scoped to
-- `link`, and every saved-opportunity notification shared the same literal link
-- ("/opportunities") regardless of which opportunity it was about, so two different
-- opportunities crossing a threshold for the same student on the same day would silently
-- suppress the second one; and a time window can't express "has this exact deadline
-- already fired at this exact urgency bucket", which is what the aggregated notification
-- this package adds actually needs to know before deciding what to include.
--
-- Dedupe key is (user_id, source, source_id, threshold_days) -- deliberately NOT
-- deadline_date. A deadline crossing into a NEARER bucket (30 -> 14 -> 7 -> 3 -> 1) is a
-- genuinely more urgent fact each time, not a repeat of the same notification, so it
-- re-fires once per bucket it actually crosses -- this is why threshold_days is part of
-- the key rather than the row being "have we ever notified about this deadline at all".
-- A date CHANGING for the same source_id (a university pushing its deadline back) is
-- exactly the shape a re-notify should also survive, which keying on the id (not the date
-- itself) already gets for free.
create table if not exists public.deadline_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Matches lib/deadlines/scan.ts's DeadlineHit["source"] union exactly; enforced in code,
  -- not as a check constraint, since notifications.category (a real enum) already showed
  -- how much friction a DB-level enum adds to a value that's app-internal vocabulary, not
  -- a value ever queried or filtered on by anything outside this one job.
  source text not null,
  -- applications.id | opportunities.id | university_deadlines.id -- whichever `source` says.
  source_id uuid not null,
  threshold_days integer not null,
  notified_at timestamptz not null default now()
);

-- The dedupe mechanism itself: makes "already logged this exact (user, source, source_id,
-- threshold_days)" a database-enforced fact, not just an application-level check-then-insert
-- race. lib/deadlines/scan.ts still queries before inserting (to decide what belongs in the
-- aggregated notification body), but relies on `upsert(..., { ignoreDuplicates: true })`
-- against this index as the actual correctness guarantee if two runs ever overlap.
create unique index if not exists deadline_notification_log_dedupe_idx
  on public.deadline_notification_log (user_id, source, source_id, threshold_days);

create index if not exists deadline_notification_log_user_id_idx
  on public.deadline_notification_log (user_id, notified_at desc);

comment on table public.deadline_notification_log is
  'One row per (user, deadline, urgency bucket) the deadline-reminder job has already '
  'notified about -- see the table-level comment above for why threshold_days is part of '
  'the dedupe key rather than a plain "already notified about this deadline" flag. Written '
  'only by lib/deadlines/scan.ts via the admin client; no application code reads it except '
  'that same job, to decide what NOT to re-include in the next aggregated notification.';

alter table public.deadline_notification_log enable row level security;

-- Select-own, matching ai_usage's posture (system-written, benign to the owner, no reason
-- to hide it from the student it's about) rather than birth_year_changes' fully-locked
-- posture (that one is an internal compliance record; this is just "which of my deadlines
-- have already reminded me", plausibly useful for a future "notification history" surface
-- and not sensitive). No insert/update/delete policy for any non-admin role -- same
-- reasoning lib/notifications/create.ts's own comment gives for `notifications` itself:
-- always system-generated, never written by a student's own RLS-scoped session.
create policy "Users can view their own deadline notification log"
  on public.deadline_notification_log for select
  using (auth.uid() = user_id);
