-- One column for P5's windowing (docs/veli-hesabi-spec-2026-09-04.md — founder, verbatim:
-- "aiın her hafta çocuklarının gelişimini yorumlaması için premium almaları gereksin... o
-- hafta olan" — the AI should comment on their children's development every week, focused on
-- what's new that week). Schema half only; content assembly is lib/digest/parent-commentary.ts.
--
-- BUILT, DELIBERATELY NOT ARMED -- same posture as digest_email_enabled/last_digest_sent_at
-- (migration 0114), advisor_conversation_retention (migration 0112): the mechanism exists and
-- is inspectable, nothing sends. No email-sending infrastructure exists anywhere in this
-- codebase (same standing fact migration 0114 already recorded), and the same İYS/consent
-- question applies here with an extra dimension 0114 didn't have: this content is ABOUT a
-- minor, addressed to their guardian, not to the minor themselves -- one more reason sending
-- stays a founder decision made after counsel, not a default this migration enables.
--
-- WHY THIS COLUMN LIVES ON parent_links, NOT profiles (the digest's own last_digest_sent_at
-- lives on profiles, and that asymmetry is deliberate, not an oversight worth "simplifying"
-- later): a student gets exactly one digest, so one column on their own row is the whole
-- window. A PARENT'S commentary window is a property of ONE RELATIONSHIP, not one account --
-- §5's own unique(parent_user_id, student_user_id) already establishes that a parent can hold
-- more than one link (lib/tier/parent-tier.ts's header makes the identical point about
-- effective tier), so a parent linked to two children needs two independent clocks, one per
-- child. Putting this on profiles would force a single column to answer "since when" for
-- potentially several different parents watching the same student, or force a parent's two
-- children's commentary onto the same cadence -- neither is what "her hafta çocuklarının
-- gelişimini" (every week, [about] their children's development, plural) actually asks for.
-- A parent linked to a second child mid-week also must not inherit the first child's window
-- and read a month of backlog as "new this week" -- a fresh link starts at null, exactly like
-- a first link does, per this column's own null semantics below.
alter table public.parent_links add column if not exists last_commentary_sent_at timestamptz;

comment on column public.parent_links.last_commentary_sent_at is
  'When commentary about THIS student was last generated for THIS parent -- never written on a dry run (lib/digest/parent-commentary.ts''s future batch runner, matching lib/digest/run.ts''s own dryRun contract exactly). Null means never generated, which is every row today since nothing arms this job -- read by resolveParentWeeklyCommentary''s `since` parameter as "everything currently eligible counts as new," not as an error or a zero-width window. Deliberately per-link, not per-student (see this migration''s own header) -- a parent linked to more than one child gets an independent clock for each.';
