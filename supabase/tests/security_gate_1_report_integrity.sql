-- Security Gate 1 (2026-08-29). pgTAP suite for migration 0064's message/recommendation
-- report accused-party integrity: a report must name the actual sender/author of the thing
-- being reported, never an arbitrary third party, on EITHER of message_reports' two
-- reference branches (message_id, recommendation_id) -- both branches, not just the one the
-- original finding happened to surface first (see 0064's own header comment on why the
-- first, message-only version of this fix was rejected before ever being applied).
--
-- Also covers the row-level privacy of the reports table itself (the accused party has no
-- read access to a report filed against them; only the reporter can see their own filed
-- report; only service_role, i.e. the real moderation-review path, can update one) --
-- "owners can perform intended CRUD" and "another user cannot access the owner's private
-- rows," applied to this specific table rather than re-asserted only in the abstract.

BEGIN;
SELECT plan(11);

-- ---------------------------------------------------------------------------
-- Setup: A and B share an accepted connection (required by messages'/recommendations' own
-- INSERT policies). A sends B a real message and writes B a real recommendation. C is
-- deliberately uninvolved in both -- neither sender/recipient nor author/recipient -- so the
-- "unrelated third party" cases have a genuine outsider, not just a second guess at A vs B.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('f1111111-1111-1111-1111-111111111111', 'gate1-report-a@test.local'),
  ('f2222222-2222-2222-2222-222222222222', 'gate1-report-b@test.local'),
  ('f3333333-3333-3333-3333-333333333333', 'gate1-report-c@test.local');

set local role service_role;
insert into public.connections (id, requester_id, recipient_id, status) values
  ('f4444444-4444-4444-4444-444444444444', 'f1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 'accepted');
insert into public.messages (id, sender_id, recipient_id, body) values
  ('f5555555-5555-5555-5555-555555555555', 'f1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 'Security Gate 1 report-integrity test message');
insert into public.recommendations (id, author_id, recipient_id, relationship, body) values
  ('f6666666-6666-6666-6666-666666666666', 'f1111111-1111-1111-1111-111111111111', 'f2222222-2222-2222-2222-222222222222', 'teammate', 'Security Gate 1 report-integrity test recommendation');
reset role;

-- ---------------------------------------------------------------------------
-- message_id branch: B (the real recipient, i.e. a legitimate reporter) reports the message.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f2222222-2222-2222-2222-222222222222","role":"authenticated"}', true);

insert into public.message_reports (id, reporter_id, reported_user_id, message_id, reason) values
  ('f7777777-7777-7777-7777-777777777777', 'f2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555', 'legit report naming the real sender');
SELECT is(
  (select count(*) from public.message_reports where id = 'f7777777-7777-7777-7777-777777777777')::int,
  1,
  'a legitimate report naming the message''s real sender is accepted (valid reports still work)'
);

SELECT throws_ok(
  $$insert into public.message_reports (reporter_id, reported_user_id, message_id, reason) values ('f2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 'f5555555-5555-5555-5555-555555555555', 'forged: blaming an unrelated user for a message they did not send')$$,
  null,
  null,
  'a report on a real message cannot accuse an unrelated user who did not send it (message_id branch)'
);

-- ---------------------------------------------------------------------------
-- recommendation_id branch: same shape, independently verified per 0064's own comment that
-- this branch's safety must not be assumed by analogy to the message branch.
-- ---------------------------------------------------------------------------
insert into public.message_reports (id, reporter_id, reported_user_id, recommendation_id, reason) values
  ('f8888888-8888-8888-8888-888888888888', 'f2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666', 'legit report naming the real author');
SELECT is(
  (select count(*) from public.message_reports where id = 'f8888888-8888-8888-8888-888888888888')::int,
  1,
  'a legitimate report naming the recommendation''s real author is accepted (valid reports still work)'
);

SELECT throws_ok(
  $$insert into public.message_reports (reporter_id, reported_user_id, recommendation_id, reason) values ('f2222222-2222-2222-2222-222222222222', 'f3333333-3333-3333-3333-333333333333', 'f6666666-6666-6666-6666-666666666666', 'forged: blaming an unrelated user for a recommendation they did not write')$$,
  null,
  null,
  'a report on a real recommendation cannot accuse an unrelated user who did not write it (recommendation_id branch)'
);

-- ---------------------------------------------------------------------------
-- Both null: no branch satisfied at all -- the "escape hatch" 0064 deliberately preserved
-- for legitimate recommendation reports (message_id is null) must not also let a report with
-- NEITHER reference through.
-- ---------------------------------------------------------------------------
SELECT throws_ok(
  $$insert into public.message_reports (reporter_id, reported_user_id, reason) values ('f2222222-2222-2222-2222-222222222222', 'f1111111-1111-1111-1111-111111111111', 'forged: no message_id and no recommendation_id at all')$$,
  null,
  null,
  'a report with neither message_id nor recommendation_id set is rejected outright'
);

-- ---------------------------------------------------------------------------
-- An uninvolved third party (C: neither sender/recipient nor author/recipient) cannot file a
-- report on either the message or the recommendation even naming the CORRECT accused party --
-- because C's own RLS visibility into messages/recommendations returns zero rows for
-- something they were never party to, the WITH CHECK subquery yields NULL, and
-- `reported_user_id = NULL` is never true regardless of which id was supplied. This is 0064's
-- own "independently verified, not inherited by assumption" claim, checked directly here.
-- ---------------------------------------------------------------------------
reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f3333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

SELECT throws_ok(
  $$insert into public.message_reports (reporter_id, reported_user_id, message_id, reason) values ('f3333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'f5555555-5555-5555-5555-555555555555', 'uninvolved third party reporting a message they were never party to')$$,
  null,
  null,
  'an uninvolved third party cannot report a message they were never sender or recipient of, even naming the real sender'
);
SELECT throws_ok(
  $$insert into public.message_reports (reporter_id, reported_user_id, recommendation_id, reason) values ('f3333333-3333-3333-3333-333333333333', 'f1111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666', 'uninvolved third party reporting a recommendation they were never party to')$$,
  null,
  null,
  'an uninvolved third party cannot report a recommendation they were never author or recipient of, even naming the real author'
);
reset role;

-- ---------------------------------------------------------------------------
-- message_reports row privacy: the reporter can see their own filed report; the accused
-- party cannot see a report filed against them; nobody but service_role can update one
-- (message_reports has no UPDATE policy at all -- only "create own report" and "select own
-- filed reports" exist, so even the reporter cannot self-resolve their own report).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f2222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
SELECT is(
  (select count(*) from public.message_reports where id = 'f7777777-7777-7777-7777-777777777777')::int,
  1,
  'the reporter CAN see their own filed report'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
SELECT is(
  (select count(*) from public.message_reports where id = 'f7777777-7777-7777-7777-777777777777')::int,
  0,
  'the accused party CANNOT see a report filed against them (moderation queue, not visible to the accused)'
);

update public.message_reports set status = 'dismissed' where id = 'f7777777-7777-7777-7777-777777777777';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"f2222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
update public.message_reports set status = 'dismissed' where id = 'f7777777-7777-7777-7777-777777777777';
SELECT is(
  (select status::text from public.message_reports where id = 'f7777777-7777-7777-7777-777777777777'),
  'open',
  'not even the reporter can update their own filed report''s status (no UPDATE policy exists for authenticated at all)'
);
reset role;

set local role service_role;
update public.message_reports set status = 'resolved', reviewed_by = 'f2222222-2222-2222-2222-222222222222' where id = 'f7777777-7777-7777-7777-777777777777';
SELECT is(
  (select status::text from public.message_reports where id = 'f7777777-7777-7777-7777-777777777777'),
  'resolved',
  'service_role (the real moderation-review path) CAN update a report''s status'
);
reset role;

SELECT * FROM finish();
ROLLBACK;
