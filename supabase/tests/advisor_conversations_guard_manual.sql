-- Manual live-verification script for migration 0122 (advisor_conversations summary/
-- summarized_at guard) — same method as supabase/tests/parent_links_rls_manual.sql:
-- `set local role authenticated` + `select set_config('request.jwt.claims', ...)` simulates a
-- specific user for RLS purposes; run as one transaction (`psql -1 --set=ON_ERROR_ROLLBACK=on`)
-- so the ON_ERROR_ROLLBACK savepoint behavior survives an expected error without aborting the
-- rest of the script — that combination was proven correct against this exact migration
-- family earlier the same night (parent_links_rls_manual.sql's own header explains why plain
-- `psql -f` alone is NOT sufficient: set_config(..., true) does not survive across separate
-- auto-committed statements without it).
--
-- RUN AND PASSED, standalone, before this file existed: the exact function+trigger SQL below
-- was extracted verbatim from migration 0122 into a minimal throwaway database (not the full
-- migration chain — this fix needs only this one table) and both directions confirmed: a
-- student's smuggled summary/summarized_at edit alongside a legitimate title rename is frozen;
-- service_role's own write still lands. This script is the same proof, restated as a
-- re-runnable reference against a REAL migration-0122-applied database, the way this repo's
-- other guard fixes each keep one.

-- ---------------------------------------------------------------------------
-- 1. Setup.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values ('a1000000-0000-0000-0000-000000000001', 'student-p8@test.local');
insert into public.advisor_conversations (id, user_id, title, summary, summarized_at)
values ('c1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', 'Should I start another club?', 'Original summary from the retention job.', '2026-08-01T00:00:00Z');

-- ---------------------------------------------------------------------------
-- 2. As the owner (authenticated, auth.uid() = user_id) — a legitimate rename WHILE
--    smuggling a rewrite of summary/summarized_at in the same statement.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

update public.advisor_conversations
set title = 'Renamed by the student', summary = 'Smuggled fake summary', summarized_at = '2099-01-01T00:00:00Z'
where id = 'c1000000-0000-0000-0000-000000000001';

select title as title_after_rename___expect_renamed_by_the_student,
       summary as summary_after_smuggle_attempt___expect_original_not_fake,
       summarized_at as summarized_at_after_smuggle___expect_2026_08_01_not_2099
from public.advisor_conversations where id = 'c1000000-0000-0000-0000-000000000001';
-- If the guard held: title is the new value (RLS's owner-full-access policy allows renaming,
-- always did), summary is still "Original summary from the retention job.", summarized_at is
-- still 2026-08-01 — neither smuggled value took. Either surviving is that column's own
-- failure signal.

-- ---------------------------------------------------------------------------
-- 3. As the retention job (service_role) — the OTHER direction: its own real write must
--    still land. Real Supabase grants service_role BYPASSRLS; if this local role doesn't have
--    it yet, `alter role service_role bypassrls;` first, or this tests the wrong thing.
-- ---------------------------------------------------------------------------
reset role;
set local role service_role;
select set_config('request.jwt.claims', '{}', true);

update public.advisor_conversations
set summary = 'Real summary written by the retention job.', summarized_at = now()
where id = 'c1000000-0000-0000-0000-000000000001';

select summary as summary_after_admin_write___expect_the_real_summary,
       (summarized_at > '2026-08-02'::timestamptz) as summarized_at_updated___expect_true
from public.advisor_conversations where id = 'c1000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 4. Cleanup.
-- ---------------------------------------------------------------------------
reset role;
delete from auth.users where id = 'a1000000-0000-0000-0000-000000000001';
select count(*) as remaining_test_conversations___expect_0
from public.advisor_conversations where id = 'c1000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 5. Mutation map.
-- ---------------------------------------------------------------------------
-- Block 2 (smuggled summary/summarized_at frozen): remove the
--   `if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then ...`
--   guard from advisor_conversations_guard_admin_columns (or drop the trigger entirely) --
--   summary_after_smuggle_attempt flips to "Smuggled fake summary" and
--   summarized_at_after_smuggle flips to 2099-01-01.
-- Block 3 (service_role write lands): change `current_user <> 'service_role'` to
--   `current_user <> 'nonexistent_role'` (i.e. simulate a guard that blocks EVERYONE
--   including the legitimate writer) -- summary_after_admin_write stays "Original summary
--   from the retention job." instead of the real one, summarized_at_updated flips to false.
--   This is the failure mode CEO named explicitly for the parent_links guard earlier the same
--   night, and it applies identically here: a trigger that blocks everyone is a different bug
--   that happens to look like a fix.
