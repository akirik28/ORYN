-- Persisted failure state for advisor turns (Counselor Core Phase K, P0 fix). Previously a
-- failed assistant reply left no trace at all: advisor_messages.role is user|assistant only,
-- no status column, content is NOT NULL. On failure the user's message stayed saved but no
-- assistant row was ever written -- the only signal was ephemeral client-side React state
-- that vanished on reload, with no retry affordance (confirmed live against a real test
-- account, docs/handoffs/claude-a-to-claude-b.md, 2026-08-18 -- flagged, never fixed).
--
-- content must become nullable: a failed assistant turn has no real content to store, and
-- encoding failure into a sentinel content string would be fabricated content masquerading
-- as a real message (Rule 4). message_role can't represent this either -- role is *who
-- spoke*, not *what happened*. Existing rows default to 'complete', fully backward
-- compatible. RLS (migration 0014, owner-only via user_id = auth.uid()) is row-level and
-- already covers these new columns -- no new policy needed.
alter table public.advisor_messages
  alter column content drop not null,
  add column status text not null default 'complete' check (status in ('complete', 'failed')),
  add column error_message text;
