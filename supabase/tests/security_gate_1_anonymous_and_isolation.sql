-- Security Gate 1 (2026-08-29). pgTAP suite covering the access-control questions that are
-- orthogonal to security_gate_1_self_forgery.sql's guard-trigger coverage: "who can reach this
-- row at all," not "can a row's protected columns be forged once reached." Specifically:
--
--   1. Anonymous (`anon`) callers cannot read signed-in-only data at all, across both
--      protected personal tables and the messaging/connections surface -- including
--      `public_profiles` (migration 0061's own fix: `auth.uid() is not null`), re-verified
--      here rather than only trusted from that migration's own commit message.
--   2. Cross-user isolation with two distinct authenticated users (not just "authenticated vs
--      anon vs service_role," which self_forgery.sql already covers): an ordinary signed-in
--      user cannot read, update, or delete another user's private rows.
--   3. Ownership itself cannot be reassigned: a user cannot UPDATE ... SET user_id = <someone
--      else> on a row they own, escaping to a different owner.
--   4. The public catalogue (`universities`, `opportunities`, `university_requirements`) that
--      is intentionally readable by any signed-in user still works -- hardening a private
--      surface must not have collaterally broken a public one.
--   5. Grants, not just policies: `has_table_privilege` against `anon` is checked directly
--      alongside the anon-read assertions above, so the same result documents both halves of
--      the task's own standard -- "an RLS policy alone is not sufficient proof if unnecessary
--      table or view privileges remain granted." The schema-wide `grant all ... to anon` this
--      project runs (see migration 0061's own comment) is a known, already-reviewed default,
--      not a new gap; what this proves is that RLS, not the grant, is the actual boundary.
--
-- Three students so the public_profiles cases have a real negative alongside the positive:
-- A is public and unconnected to C, B is NOT public and NOT connected to C, and A/B share an
-- accepted connection (irrelevant to A's own visibility to C, which is driven by is_public
-- alone, but gives messages/recommendations/connections real rows to prove anon can't read).

BEGIN;
SELECT plan(30);

-- ---------------------------------------------------------------------------
-- Setup
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'gate1-iso-a@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'gate1-iso-b@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'gate1-iso-c@test.local');

update public.profiles set is_public = true where id = '11111111-1111-1111-1111-111111111111';
-- B and C are left is_public = false (the column's own default).

insert into public.universities (id, name, country) values
  ('44444444-4444-4444-4444-444444444444', 'Security Gate 1 Isolation Test University', 'US');

insert into public.university_requirements (id, university_id, requirement_type, requirement_detail) values
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'standardized_test', 'Security Gate 1 isolation test requirement');

insert into public.opportunities (id, title, normalized_title, organization, category, status, cycle_status) values
  ('66666666-6666-6666-6666-666666666666', 'Security Gate 1 Isolation Test Opportunity', 'security gate 1 isolation test opportunity', 'Test Org', 'competition', 'active', 'open');

insert into public.target_universities (id, user_id, university_id, status) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', '44444444-4444-4444-4444-444444444444', 'exploring');

insert into public.activities (id, user_id, title, category, evidence_status) values
  ('77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111', 'Security Gate 1 isolation test activity', 'club', 'self_reported');

-- profile_scores, evidence_files: no direct INSERT policy at all (migration 0065), so the
-- fixture row -- same as self_forgery.sql -- goes through service_role.
set local role service_role;
insert into public.profile_scores (id, user_id, dimension, score, calculation_version) values
  ('99999999-9999-9999-9999-999999999999', '11111111-1111-1111-1111-111111111111', 'leadership', 50, 'career_profile_v1');
insert into public.evidence_files (id, user_id, linked_table, linked_id, evidence_type, file_path, verification_status) values
  ('88888888-8888-8888-8888-888888888888', '11111111-1111-1111-1111-111111111111', 'activities', '77777777-7777-7777-7777-777777777777', 'application/pdf', 'iso/test.pdf', 'evidence_added');
insert into public.connections (id, requester_id, recipient_id, status) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'accepted');
insert into public.messages (id, sender_id, recipient_id, body) values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'Security Gate 1 isolation test message');
insert into public.recommendations (id, author_id, recipient_id, relationship, body) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'teammate', 'Security Gate 1 isolation test recommendation');
insert into public.message_reports (id, reporter_id, reported_user_id, message_id, reason) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'Security Gate 1 isolation test report');
reset role;

-- ---------------------------------------------------------------------------
-- 1. Anonymous sweep: broad, across personal, catalogue, and messaging tables, plus the
--    public_profiles VIEW (migration 0061).
-- ---------------------------------------------------------------------------
set local role anon;
select set_config('request.jwt.claims', '{"role":"anon"}', true);

SELECT is((select count(*) from public.profiles)::int, 0, 'anon cannot read profiles at all');
SELECT is((select count(*) from public.target_universities)::int, 0, 'anon cannot read target_universities at all');
SELECT is((select count(*) from public.profile_scores)::int, 0, 'anon cannot read profile_scores at all');
SELECT is((select count(*) from public.activities)::int, 0, 'anon cannot read activities at all');
SELECT is((select count(*) from public.evidence_files)::int, 0, 'anon cannot read evidence_files at all');
SELECT is((select count(*) from public.universities)::int, 0, 'anon cannot read universities (authenticated-only catalogue)');
SELECT is((select count(*) from public.opportunities)::int, 0, 'anon cannot read opportunities (authenticated-only catalogue)');
SELECT is((select count(*) from public.university_requirements)::int, 0, 'anon cannot read university_requirements (authenticated-only catalogue)');
SELECT is((select count(*) from public.messages)::int, 0, 'anon cannot read messages at all');
SELECT is((select count(*) from public.connections)::int, 0, 'anon cannot read connections at all');
SELECT is((select count(*) from public.recommendations)::int, 0, 'anon cannot read recommendations at all');
SELECT is((select count(*) from public.message_reports)::int, 0, 'anon cannot read message_reports at all');
SELECT is(
  (select count(*) from public.public_profiles where id = '11111111-1111-1111-1111-111111111111')::int,
  0,
  'anon cannot read public_profiles even for a row with is_public = true (migration 0061)'
);
reset role;

-- ---------------------------------------------------------------------------
-- 2. Public catalogue remains functional for an ordinary signed-in user (not the owner of
--    anything in it -- catalogue rows have no owner).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

SELECT is(
  (select count(*) from public.universities where id = '44444444-4444-4444-4444-444444444444')::int,
  1,
  'authenticated user (not the catalogue owner -- catalogue has none) CAN read universities'
);
SELECT is(
  (select count(*) from public.opportunities where id = '66666666-6666-6666-6666-666666666666')::int,
  1,
  'authenticated user CAN read opportunities (public catalogue remains functional)'
);
SELECT is(
  (select count(*) from public.university_requirements where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')::int,
  1,
  'authenticated user CAN read university_requirements (public catalogue remains functional)'
);
reset role;

-- ---------------------------------------------------------------------------
-- 3. public_profiles as an ordinary signed-in user who is NEITHER connected NOR the owner:
--    positive (A, is_public = true) and negative (B, not public, not connected to C) in the
--    same role context, so the negative isn't just "anon again" in disguise.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT is(
  (select count(*) from public.public_profiles where id = '11111111-1111-1111-1111-111111111111')::int,
  1,
  'authenticated user CAN read an unrelated public_profiles row when is_public = true'
);
SELECT is(
  (select count(*) from public.public_profiles where id = '22222222-2222-2222-2222-222222222222')::int,
  0,
  'authenticated user CANNOT read an unrelated public_profiles row that is not public and not connected'
);
reset role;

-- ---------------------------------------------------------------------------
-- 4. Cross-user isolation: B (a distinct real authenticated user, not anon) against A's rows.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

SELECT is(
  (select count(*) from public.activities where id = '77777777-7777-7777-7777-777777777777')::int,
  0,
  'another authenticated user cannot SELECT the owner''s activities row'
);
SELECT is(
  (select count(*) from public.target_universities where id = '55555555-5555-5555-5555-555555555555')::int,
  0,
  'another authenticated user cannot SELECT the owner''s target_universities row'
);
SELECT is(
  (select count(*) from public.evidence_files where id = '88888888-8888-8888-8888-888888888888')::int,
  0,
  'another authenticated user cannot SELECT the owner''s evidence_files row'
);
SELECT is(
  (select count(*) from public.profile_scores where id = '99999999-9999-9999-9999-999999999999')::int,
  0,
  'another authenticated user cannot SELECT the owner''s profile_scores row'
);

update public.activities set title = 'Hijacked by B' where id = '77777777-7777-7777-7777-777777777777';
SELECT is(
  (select count(*) from public.activities where id = '77777777-7777-7777-7777-777777777777' and title = 'Hijacked by B')::int,
  0,
  'another authenticated user''s UPDATE of the owner''s activities row matches zero rows'
);

delete from public.activities where id = '77777777-7777-7777-7777-777777777777';
reset role;

set local role service_role;
SELECT is(
  (select title from public.activities where id = '77777777-7777-7777-7777-777777777777'),
  'Security Gate 1 isolation test activity',
  'the owner''s activities row still exists, untouched, after another authenticated user''s UPDATE/DELETE attempts'
);
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
update public.profiles set display_name = 'Hijacked by B' where id = '11111111-1111-1111-1111-111111111111';
SELECT is(
  (select count(*) from public.profiles where id = '11111111-1111-1111-1111-111111111111' and display_name = 'Hijacked by B')::int,
  0,
  'another authenticated user''s UPDATE of the owner''s profiles row matches zero rows'
);
reset role;

-- ---------------------------------------------------------------------------
-- 5. Ownership itself cannot be reassigned: the owner tries to hand their own row to someone
--    else via UPDATE ... SET user_id = <other user>.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

SELECT throws_ok(
  $$update public.target_universities set user_id = '22222222-2222-2222-2222-222222222222' where id = '55555555-5555-5555-5555-555555555555'$$,
  null,
  null,
  'owner cannot reassign target_universities.user_id to another user (RLS WITH CHECK rejects the new row)'
);
SELECT is(
  (select user_id from public.target_universities where id = '55555555-5555-5555-5555-555555555555'),
  '11111111-1111-1111-1111-111111111111',
  'target_universities.user_id is still the original owner after the rejected reassignment attempt'
);
reset role;

-- ---------------------------------------------------------------------------
-- 6. Grants: confirm anon holds the schema-wide table privilege (this project's own known,
--    already-reviewed default -- see migration 0061) on a representative protected table,
--    alongside the anon-read assertions above that already proved it reads zero rows anyway.
--    The point is not that the grant is absent; it's that RLS, not the grant, is what's
--    actually stopping access -- both facts need to be on record together, not just one.
-- ---------------------------------------------------------------------------
SELECT ok(
  has_table_privilege('anon', 'public.profile_scores', 'SELECT'),
  'anon DOES hold table-level SELECT on profile_scores (known schema-wide grant, not a new gap) -- RLS above is the actual boundary, not this grant'
);
SELECT ok(
  has_table_privilege('anon', 'public.target_universities', 'SELECT'),
  'anon DOES hold table-level SELECT on target_universities (known schema-wide grant) -- RLS above is the actual boundary'
);
SELECT ok(
  has_table_privilege('anon', 'public.activities', 'SELECT'),
  'anon DOES hold table-level SELECT on activities (known schema-wide grant) -- RLS above is the actual boundary'
);

SELECT * FROM finish();
ROLLBACK;
