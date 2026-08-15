-- Minimum viable moderation (founder-directed pass, autonomous mode): message_reports
-- has existed since migration 0027 as insert-only — a report is written and nothing
-- ever reads it back, not even the reporter, not even an admin surface. For a product
-- where minors message each other, "report lands in a table nobody can see" is not a
-- moderation path. This migration adds only what a minimum queue needs: a review state,
-- who reviewed it and when, and a free-text resolution note — report -> queue -> detail
-- (already has message_id/reason/reporter/reported context) -> state -> audit trail.
--
-- Deliberately NOT adding a suspension/ban mechanism here — that needs its own
-- enforcement across every entry point (auth, messaging, connections) and is a real
-- product decision (what does "suspended" mean, for how long, appealable how), not a
-- column. Scoped out of this minimum pass; see FOUNDER_BLOCKED_BACKLOG.

create type message_report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

alter table public.message_reports
  add column status message_report_status not null default 'open',
  add column reviewed_by uuid references public.profiles(id) on delete set null,
  add column reviewed_at timestamptz,
  add column resolution_note text;

create index message_reports_status_idx on public.message_reports(status, created_at desc);

-- Admin moderation reads go through the service-role client (bypasses RLS entirely),
-- same pattern the admin panel already uses for provider_health/external_sync_jobs — no
-- policy is needed for that path. This one policy is for a different, narrower case: a
-- reporter reading back a report they filed themselves (their own words, about content
-- they already saw). It does not expose reports filed BY OTHERS, or reports ABOUT the
-- reporter — reported_user_id is not part of this predicate.
create policy "select own filed reports" on public.message_reports for select using (reporter_id = auth.uid());
