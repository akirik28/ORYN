-- summary + summarized_at on advisor_conversations, plus an audit table for the 24-hour
-- inactivity retention rule (docs/ozellesme-spec-2026-09-03.md §3, founder decision,
-- 2026-09-03): "the clock runs on conversation inactivity, not message age... 24 hours
-- untouched: summarised, raw messages deleted, summary stays. No deletion on Ultra."
--
-- Numbered 0112, not 0109: first claimed 0109 believing the instructions/talimat lane
-- (piece 1 of the same spec, advisor_instructions on profiles) had taken it first; rebasing
-- onto origin/main found the real 0109 was a third, unrelated migration
-- (curriculum_other_text) neither lane knew about. Renumbered on rebase, not assumed --
-- see __tests__/social/posts-schema.test.ts's own migration-numbering test for the full
-- collision history this file is the latest entry in. This migration doesn't touch
-- profiles/advisor_instructions/education_records at all -- no schema overlap with either
-- of the other two, the number bump is the only coordination any of this needed.
--
-- WHY THIS IS PURELY ADDITIVE AND WHY THAT MATTERS HERE SPECIFICALLY: every column below
-- starts null/empty for every existing conversation, no backfill, no default beyond what's
-- structurally required. The retention job itself -- the thing that would actually read a
-- real student's messages and delete them -- is deliberately NOT armed by this migration or
-- by anything in this commit (see lib/advisor/retention.ts's own header): the spec is
-- explicit that this "cannot be implemented before the privacy notice says so," and
-- LEGAL_REVIEW.md §3 item 5 lists retention as an open policy question with no answer today.
-- Shipping the schema and the (off, dry-run-only) job code is preparation for that decision,
-- not an implementation of it -- exactly the same posture opportunity_reverification's
-- canAutoApplyPromotion() takes: the machinery exists and can be inspected, nothing acts.
alter table public.advisor_conversations add column if not exists summary text;
alter table public.advisor_conversations add column if not exists summarized_at timestamptz;

comment on column public.advisor_conversations.summary is
  'AI-generated summary of this conversation''s raw messages, written once by the 24-hour retention job (lib/advisor/retention.ts) immediately before those raw advisor_messages rows are deleted. Null until first summarized. Never shown as a substitute for live conversation content while raw messages still exist -- summarized_at is null in that case, which is the actual "not yet summarized" signal; a null summary with a null summarized_at and zero remaining messages means the conversation predates this feature or was never populated, not that summarization failed silently.';
comment on column public.advisor_conversations.summarized_at is
  'When summary was written -- distinct from updated_at, which keeps advancing if the student resumes the conversation after summarization. Never written on a dry run (see RunOptions.dryRun in lib/advisor/retention.ts); a real value here is proof a real AI summarization call happened and was persisted, mirroring source_verified_at''s "unforgeable by construction" contract on opportunities (migration 0103).';

-- One row per real action taken, append-only, mirroring opportunity_verification_runs
-- (migration 0103) -- an audit trail for exactly the kind of operation that most needs one:
-- irreversible deletion of a minor's own private conversation content. Deliberately does NOT
-- log a row for "not yet due" (the overwhelming majority of every pass, pure noise) -- only
-- for a conversation the job actually decided something about. Never written on a dry run,
-- same rule as the two columns above -- a dry run's findings live entirely in that call's own
-- return value, never in a persisted table, matching run-job.ts's own established contract.
create table if not exists public.advisor_conversation_retention_runs (
  id                     uuid primary key default gen_random_uuid(),
  conversation_id        uuid not null references public.advisor_conversations(id) on delete cascade,
  run_id                 uuid references public.external_sync_jobs(id) on delete set null,
  action                 text not null,
  messages_deleted_count int,
  created_at             timestamptz not null default now(),
  constraint advisor_conversation_retention_runs_action_check check (
    action in ('summarized', 'messages_deleted', 'skipped_ultra')
  )
);

comment on table public.advisor_conversation_retention_runs is
  'Append-only audit trail for the 24-hour retention job -- one row per real action on a real conversation. "summarized" and "messages_deleted" for a Standard-tier conversation usually appear as two rows from the same pass (summarize first, then delete, per this migration''s own column comments); "skipped_ultra" records a conversation that WAS due but was exempted by tier, which is itself worth auditing since it is a policy decision, not a no-op. Never contains message content -- deliberately, this table exists to prove an action happened and when, not to duplicate what was deleted.';
comment on column public.advisor_conversation_retention_runs.messages_deleted_count is
  'Set only on an action = ''messages_deleted'' row. Null (not zero) for ''summarized''/''skipped_ultra'' rows -- absence of a count where none was ever computed, not a fabricated zero.';

create index if not exists advisor_conversation_retention_runs_conversation_id_idx
  on public.advisor_conversation_retention_runs (conversation_id, created_at desc);

-- No RLS policy at all, matching opportunity_verification_runs/provider_health/
-- external_sync_jobs/admin_action_log (migration 0014's own "ops tables get no policy at
-- all -- service-role access only"). Every write and read goes through createAdminClient()
-- from inside the job route; no authenticated client path should ever reach this table.
alter table public.advisor_conversation_retention_runs enable row level security;
