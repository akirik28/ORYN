-- Manual live-verification script for migration 0116 (parent accounts) — RLS as denials.
-- NOT a pgTAP suite, same reason connection_privacy_manual.sql gives: pgtap was never
-- confirmed present in any environment this repo has run in. Run each block by hand
-- (psql, the Supabase SQL editor, or the Supabase MCP's execute_sql) against a disposable
-- project/branch, AFTER migration 0116 has been applied there — this script assumes
-- account_role/parent_links/is_active_parent_of()/the three curated functions all exist.
--
-- NOT YET RUN. Written and staged, matching this migration's own "no live writes" scope —
-- verifying it needs both a database migration 0116 has been applied to and a decision
-- about spending on a fresh branch to test in isolation, neither of which is this
-- migration's own author's call to make alone while the founder is asleep. Whoever runs
-- this: every block is an ATTEMPTED OPERATION (a real UPDATE/INSERT/DELETE, not a read of
-- whether a button is hidden), per CEO's own standard for this feature — and the one
-- verification method worth trusting more than "this passed" is "this failed when I removed
-- the policy that was supposed to cause it to pass." Section 8 names exactly which policy to
-- comment out for each earlier block, so that check is one `alter policy`/`drop policy` away
-- rather than something to reconstruct from memory.
--
-- Method: `set local role authenticated` + `select set_config('request.jwt.claims', ...)`
-- simulates being logged in as a specific user for RLS purposes, scoped to one transaction/
-- one simple-query batch — same mechanism connection_privacy_manual.sql already established,
-- reused rather than reinvented.

-- ---------------------------------------------------------------------------
-- 1. Setup: four disposable auth users.
--    Alice  = the student.
--    Bob    = Alice's parent, link ACTIVE.
--    Carol  = unrelated — no link to Alice at all.
--    Dave   = a second prospective parent, link still PENDING (never confirmed).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a1000000-0000-0000-0000-000000000001', 'alice-p1@test.local'),
  ('b2000000-0000-0000-0000-000000000002', 'bob-p1@test.local'),
  ('c3000000-0000-0000-0000-000000000003', 'carol-p1@test.local'),
  ('d4000000-0000-0000-0000-000000000004', 'dave-p1@test.local');

update public.profiles set display_name = 'Alice', account_role = 'student' where id = 'a1000000-0000-0000-0000-000000000001';
update public.profiles set display_name = 'Bob',   account_role = 'parent'  where id = 'b2000000-0000-0000-0000-000000000002';
update public.profiles set display_name = 'Carol', account_role = 'student' where id = 'c3000000-0000-0000-0000-000000000003';
update public.profiles set display_name = 'Dave',  account_role = 'parent'  where id = 'd4000000-0000-0000-0000-000000000004';

-- Seed one row of real-shaped data Alice owns, so "can a parent read it" has something to
-- actually return.
insert into public.profile_scores (user_id, dimension, score, calculation_version)
values ('a1000000-0000-0000-0000-000000000001', 'research', 42, 'career_profile_v1');

-- Bob <-> Alice: ACTIVE (as if the full K3 flow already ran).
insert into public.parent_links (parent_user_id, student_user_id, status, invited_email, invited_at, confirmed_at)
values ('b2000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', 'active', 'bob-p1@test.local', now(), now());

-- Dave <-> Alice: PENDING — invited, never confirmed. Must leak nothing (K3).
insert into public.parent_links (parent_user_id, student_user_id, status, invited_email, invited_at)
values ('d4000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', 'pending', 'dave-p1@test.local', now());

-- ---------------------------------------------------------------------------
-- 2. As Bob (ACTIVE parent of Alice) — everything that must be ALLOWED.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

select
  (select count(*) from public.get_parent_child_profile('a1000000-0000-0000-0000-000000000001')) as sees_alice_via_function___expect_1,
  exists(select 1 from public.profile_scores where user_id = 'a1000000-0000-0000-0000-000000000001') as sees_alice_scores_direct___expect_true,
  public.is_active_parent_of('a1000000-0000-0000-0000-000000000001') as helper_reports_active___expect_true;

-- The single most important negative check in this block: the function's own return type
-- has 9 named columns, none of which is advisor_instructions. Confirmed structurally by the
-- function signature (a caller cannot select a column the RETURNS TABLE clause never
-- declared) — this query just makes that visible rather than trusted blind.
select * from public.get_parent_child_profile('a1000000-0000-0000-0000-000000000001');
-- ___expect: exactly 9 columns (display_name, graduation_year, curriculum, country,
-- school_name, plan_tier, onboarding_completed, completeness_percent, profile_strength_score),
-- no advisor_instructions column present at all -- not null, ABSENT.

-- ---------------------------------------------------------------------------
-- 3. As Bob — everything that must be DENIED. Every one of these is an attempted WRITE,
--    not a read of whether a button exists.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b2000000-0000-0000-0000-000000000002","role":"authenticated"}', true);

-- direct table read of profiles (not through the function) -- must return zero rows, since
-- no parent-select policy exists on the raw table at all.
select count(*) as direct_profiles_read_of_alice___expect_0
from public.profiles where id = 'a1000000-0000-0000-0000-000000000001';

-- attempted UPDATE of a row Bob can SELECT (via the direct policy) -- SELECT access must not
-- imply WRITE access.
update public.profile_scores set score = 0
where user_id = 'a1000000-0000-0000-0000-000000000001';
select count(*) as bob_updated_alice_score_rows___expect_0
from public.profile_scores where user_id = 'a1000000-0000-0000-0000-000000000001' and score = 0;

-- attempted INSERT on Alice's behalf.
-- ___expect: statement fails (RLS violation), or affects 0 rows depending on driver — either
-- way, no new row must exist after.
-- insert into public.opportunity_matches (user_id, opportunity_id, relevance_score, profile_need_score, match_score)
--   values ('a1000000-0000-0000-0000-000000000001', gen_random_uuid(), 1, 1, 1);
-- (left commented: needs a real opportunity_id FK to run without a second, unrelated
-- failure reason masking the RLS one -- uncomment with a real id from public.opportunities
-- when actually running this.)

-- attempted DELETE.
delete from public.profile_scores where user_id = 'a1000000-0000-0000-0000-000000000001';
select count(*) as remaining_alice_scores_after_bob_delete_attempt___expect_1
from public.profile_scores where user_id = 'a1000000-0000-0000-0000-000000000001';

-- attempted self-escalation: can Bob touch advisor_conversations/advisor_messages at all?
select count(*) as bob_sees_alice_advisor_conversations___expect_0
from public.advisor_conversations where user_id = 'a1000000-0000-0000-0000-000000000001';

-- attempted self-activation is not reachable from THIS link (already active) -- see block 5
-- for Dave's pending link, which is where that specific attack actually applies.

-- Guard trigger, confirmed_at specifically: Bob attempts his own legitimate revoke WHILE also
-- smuggling a confirmed_at rewrite into the same statement. This is a split expectation, not a
-- pure denial -- the revoke half must SUCCEED (it's Bob's own allowed transition, and no other
-- block exercises an ACTIVE parent's own revoke actually working -- block 5 only covers Dave's
-- still-pending one), while the confirmed_at half must be silently discarded: the guard trigger
-- only lets confirmed_at move when auth.uid() = student_user_id, and Bob is the parent, not
-- the student.
update public.parent_links
set status = 'revoked', confirmed_at = '1900-01-01'::timestamptz
where parent_user_id = 'b2000000-0000-0000-0000-000000000002' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

select status as bobs_status_after_revoke___expect_revoked,
       confirmed_at as bobs_confirmed_at_after_smuggle_attempt___expect_original_setup_timestamp_not_1900
from public.parent_links
where parent_user_id = 'b2000000-0000-0000-0000-000000000002' and student_user_id = 'a1000000-0000-0000-0000-000000000001';
-- If the guard held: status is 'revoked' (the legitimate half went through) and confirmed_at is
-- still whatever block 1's setup INSERT set it to (approximately "now" at setup time) -- NOT
-- 1900-01-01. confirmed_at showing 1900-01-01 is the failure signal.
--
-- NOTE: this ends Bob's link in 'revoked' state -- nothing later in this script depends on Bob
-- still being an active parent, so this is safe to run at this point and not before.

-- ---------------------------------------------------------------------------
-- 4. As Carol (NO link to Alice at all, in either direction) — the baseline negative.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"c3000000-0000-0000-0000-000000000003","role":"authenticated"}', true);

select
  (select count(*) from public.get_parent_child_profile('a1000000-0000-0000-0000-000000000001')) as carol_sees_alice_via_function___expect_0,
  exists(select 1 from public.profile_scores where user_id = 'a1000000-0000-0000-0000-000000000001') as carol_sees_alice_scores___expect_false,
  public.is_active_parent_of('a1000000-0000-0000-0000-000000000001') as helper_for_unrelated_user___expect_false;

-- Carol attempts to grant herself access by inserting a link naming Alice as the student --
-- must fail: the INSERT policy requires student_user_id = auth.uid(), and Carol is not Alice.
insert into public.parent_links (parent_user_id, student_user_id, status)
values ('c3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'pending');
-- ___expect: statement fails under RLS (0 rows insertable under this policy for this actor).

select count(*) as carol_inserted_link_to_alice___expect_0
from public.parent_links where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 5. As Dave (link to Alice is PENDING, never confirmed) — the exact shape K3 exists to
--    prevent: a parent who has an invite but not the student's own confirmation.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"d4000000-0000-0000-0000-000000000004","role":"authenticated"}', true);

-- A pending link must grant nothing at all -- the central K3 assertion.
select
  (select count(*) from public.get_parent_child_profile('a1000000-0000-0000-0000-000000000001')) as dave_sees_alice_via_function___expect_0,
  exists(select 1 from public.profile_scores where user_id = 'a1000000-0000-0000-0000-000000000001') as dave_sees_alice_scores___expect_false,
  public.is_active_parent_of('a1000000-0000-0000-0000-000000000001') as helper_for_pending_link___expect_false;

-- THE critical write-side test: can Dave self-activate by UPDATE-ing his own pending link
-- straight to 'active', skipping Alice's confirmation entirely? The parent-side UPDATE
-- policy's WITH CHECK only permits a target status of 'revoked' -- 'active' must be refused.
update public.parent_links set status = 'active'
where parent_user_id = 'd4000000-0000-0000-0000-000000000004' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

select status as daves_link_status_after_self_activation_attempt___expect_pending
from public.parent_links
where parent_user_id = 'd4000000-0000-0000-0000-000000000004' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

-- Revoking his own (still-pending) invite IS allowed -- giving up access is never a privacy
-- problem, and this confirms the parent-side policy isn't simply "deny everything".
update public.parent_links set status = 'revoked'
where parent_user_id = 'd4000000-0000-0000-0000-000000000004' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

select status as daves_link_status_after_revoke___expect_revoked
from public.parent_links
where parent_user_id = 'd4000000-0000-0000-0000-000000000004' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

-- ---------------------------------------------------------------------------
-- 6. As Alice (the student) — the confirm/revoke switch is HERS, and the guard trigger.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1000000-0000-0000-0000-000000000001","role":"authenticated"}', true);

-- Alice can create a fresh pending invite for a new prospective parent (re-using Carol's id
-- as a stand-in "new parent" for this block only).
insert into public.parent_links (parent_user_id, student_user_id, status, invited_email)
values ('c3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'pending', 'carol-p1@test.local');
select count(*) as alice_created_pending_invite___expect_1
from public.parent_links where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001' and status = 'pending';

-- Alice cannot insert a link that skips pending and starts active -- WITH CHECK on the
-- insert policy requires status = 'pending' unconditionally.
insert into public.parent_links (parent_user_id, student_user_id, status)
values ('c3000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', 'active');
-- ___expect: fails under RLS -- unique(parent_user_id, student_user_id) would also block a
-- second row for this same pair regardless, so this specific attempt is doubly covered; the
-- meaningful version of this test is the same insert against a genuinely new, unused
-- parent_user_id, which should still fail on status alone.

-- Alice confirms Bob's link was already active from setup; to exercise the actual
-- pending->active transition, confirm the new Carol-as-parent row created above.
update public.parent_links set status = 'active'
where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001';
select status as alice_confirmed_new_link___expect_active
from public.parent_links where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

-- Alice cannot move an active link BACK to pending -- WITH CHECK's allowed set for the
-- student policy is ('active','revoked') only.
update public.parent_links set status = 'pending'
where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001';
select status as alice_reverted_to_pending_attempt___expect_active_unchanged
from public.parent_links where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

-- Guard trigger: Alice attempts a legitimate status change (revoke) WHILE also trying to
-- repoint parent_user_id at a different account in the same statement -- the trigger must
-- silently restore parent_user_id, not let it move.
update public.parent_links
set status = 'revoked', parent_user_id = 'd4000000-0000-0000-0000-000000000004'
where parent_user_id = 'c3000000-0000-0000-0000-000000000003' and student_user_id = 'a1000000-0000-0000-0000-000000000001';

select parent_user_id as parent_user_id_after_smuggled_repoint_attempt___expect_carols_id_c3000000_unchanged, status as status_after_same_update___expect_revoked
from public.parent_links where student_user_id = 'a1000000-0000-0000-0000-000000000001' and parent_user_id = 'c3000000-0000-0000-0000-000000000003';
-- If the guard worked, the row above is still findable under Carol's original
-- parent_user_id (c3000000...) with status now 'revoked' -- if it instead moved to Dave's
-- id (d4000000...), the trigger failed to hold and this query returns zero rows, which is
-- itself the failure signal.

-- No student/parent DELETE policy exists on this table at all -- confirm directly.
delete from public.parent_links where student_user_id = 'a1000000-0000-0000-0000-000000000001';
select count(*) as remaining_alice_links_after_delete_attempt___expect_3
from public.parent_links where student_user_id = 'a1000000-0000-0000-0000-000000000001';
-- expect 3, all status='revoked' by this point: Bob's (revoked in block 3's guard test),
-- Carol's (revoked in block 6's guard test), and Dave's (revoked at the end of block 5) --
-- revoking a link never deletes its row, it only changes status, so all three are still
-- present. The number that actually matters is "unchanged by the DELETE attempt directly
-- above", not 3 itself -- if a future edit to this script changes how many links exist by
-- this point, update the literal count, but the delete-attempt row count must never drop.

-- ---------------------------------------------------------------------------
-- 7. Cleanup.
-- ---------------------------------------------------------------------------
delete from auth.users where id in (
  'a1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003','d4000000-0000-0000-0000-000000000004'
);
select count(*) as remaining_test_profiles___expect_0
from public.profiles where display_name in ('Alice','Bob','Carol','Dave') and id in (
  'a1000000-0000-0000-0000-000000000001','b2000000-0000-0000-0000-000000000002',
  'c3000000-0000-0000-0000-000000000003','d4000000-0000-0000-0000-000000000004'
);

-- ---------------------------------------------------------------------------
-- 8. Mutation map — which policy each block above actually depends on. Comment out the
--    named policy/check, re-run only the listed block, and confirm the expectation flips
--    from PASS to FAIL. This is the check CEO asked for explicitly: not "this looks right,"
--    but "this breaks when the thing protecting it is removed."
-- ---------------------------------------------------------------------------
-- Block 2 (Bob sees Alice via function): drop function get_parent_child_profile, or change
--   its WHERE clause to remove `and public.is_active_parent_of(p_student)` -- the function
--   call itself would then either error (dropped) or return Alice's row unconditionally
--   (WHERE removed), which the ___expect_1 assertion would wrongly still show as passing --
--   confirm by ALSO re-running block 4 (Carol) after removing the WHERE clause; Carol
--   suddenly seeing Alice is the actual failure signal for that specific mutation.
-- Block 2/3 (opportunity_matches, profile_scores direct policies): drop
--   "active parent can view child's profile scores" -- block 2's sees_alice_scores_direct
--   flips to false.
-- Block 3 (direct profiles read denied): this one has no policy to remove -- it is already
--   the absence of a policy. To confirm the test itself is real, TEMPORARILY add
--   `create policy "temp test" on public.profiles for select to authenticated using (true)`,
--   re-run, confirm direct_profiles_read_of_alice flips to 1, then drop that temporary
--   policy immediately -- never leave it in place even inside this disposable branch.
-- Block 4 (Carol cannot insert a link to Alice): change the insert policy's WITH CHECK from
--   `student_user_id = auth.uid()` to `true` -- carol_inserted_link_to_alice flips to 1.
-- Block 5 (Dave cannot self-activate): change the parent-side UPDATE policy's WITH CHECK
--   from `status = 'revoked'` to `true` -- daves_link_status_after_self_activation_attempt
--   flips from pending to active. THIS is the single test that most directly verifies K3's
--   "asla ama asla" — if only one mutation gets run before this branch is torn down, run
--   this one.
-- Block 3 (Bob cannot smuggle confirmed_at through his own revoke): remove the
--   `if auth.uid() is distinct from old.student_user_id then new.confirmed_at := ...`
--   branch from parent_links_guard_immutable_columns (or replace the whole function body with
--   its pre-hardening version, which never touched confirmed_at at all) --
--   bobs_confirmed_at_after_smuggle_attempt flips from the original setup timestamp to
--   1900-01-01. Lower stakes than block 5 (no access changes hands either way, since
--   is_active_parent_of() never reads confirmed_at) but the same "closed, not just narrow"
--   standard applies to every column in this table, not only the ones that gate access.
-- Block 6 (guard trigger): drop trigger parent_links_00_guard_immutable_columns --
--   parent_user_id_after_smuggled_repoint_attempt flips to Dave's id instead of Carol's.
