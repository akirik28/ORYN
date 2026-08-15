-- Manual live-verification script for messaging authorization (migration 0027), same
-- format/purpose as connection_privacy_manual.sql: not a pgTAP suite (no pgtap extension
-- confirmed available anywhere this repo has run), run by hand against a disposable
-- project/branch and eyeball the `expect_*` results. This exact matrix was run live
-- during Chat 4's messaging build; every assertion passed, including one that failed on
-- a *testing* mistake first (deleting connections/blocked_users rows inside the same
-- transaction as a deliberately-failing insert rolls the whole batch back, per Postgres
-- semantics for the simple query protocol — run each numbered block as its own
-- statement batch, not chained together, or you'll misread a rollback as a policy bug).

-- ---------------------------------------------------------------------------
-- 1. Setup: seven disposable auth users + profiles + four connection states.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@test.local'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@test.local'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@test.local'),
  ('d4444444-4444-4444-4444-444444444444', 'dave@test.local'),
  ('e5555555-5555-5555-5555-555555555555', 'eve@test.local'),
  ('f6666666-6666-6666-6666-666666666666', 'frank@test.local'),
  ('09999999-9999-9999-9999-999999999999', 'zoe@test.local');

insert into public.connections (requester_id, recipient_id, status, responded_at)
values ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'accepted', now()); -- Alice<->Bob
insert into public.connections (requester_id, recipient_id, status)
values ('c3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'pending'); -- Carol -> Alice
insert into public.connections (requester_id, recipient_id, status, responded_at)
values ('a1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444', 'declined', now()); -- Alice -> Dave
insert into public.connections (requester_id, recipient_id, status, responded_at)
values ('a1111111-1111-1111-1111-111111111111', 'f6666666-6666-6666-6666-666666666666', 'accepted', now()); -- Alice<->Frank

-- ---------------------------------------------------------------------------
-- 2. As Alice — send attempts. Run each as its OWN statement batch.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
insert into public.messages (sender_id, recipient_id, body) values
  ('a1111111-1111-1111-1111-111111111111','b2222222-2222-2222-2222-222222222222','to Bob (accepted) -- expect SUCCESS');
-- (new batch) insert into public.messages (...) values (..., 'c3333...', 'to Carol (pending) -- expect RLS ERROR');
-- (new batch) insert into public.messages (...) values (..., 'd4444...', 'to Dave (declined) -- expect RLS ERROR');
-- (new batch) insert into public.messages (...) values (..., 'e5555...', 'to Eve (no connection) -- expect RLS ERROR');
-- (new batch) insert into public.messages (sender_id, recipient_id, body) values ('c3333...','a1111...', 'forged sender -- expect RLS ERROR');

-- ---------------------------------------------------------------------------
-- 3. Block, in its own committed batch, THEN test both directions separately.
-- ---------------------------------------------------------------------------
-- set local role authenticated; select set_config(..., '{"sub":"a1111...alice"}', true);
-- insert into public.blocked_users (blocker_id, blocked_id) values ('a1111...alice','f6666...frank');
--
-- (new batch, as Frank) insert into messages (sender=frank, recipient=alice) -- expect RLS ERROR
-- (new batch, as Alice) insert into messages (sender=alice, recipient=frank) -- expect RLS ERROR

-- ---------------------------------------------------------------------------
-- 4. Non-participant read, and read/mark-read asymmetry.
-- ---------------------------------------------------------------------------
-- As Zoe: select count(*) from messages where (sender,recipient) in (alice,bob) either
--   order -- expect 0.
-- As Alice (sender of the Alice->Bob message): update messages set read_at=now() where
--   id=<that message> -- expect 0 rows affected (recipient-only policy).
-- As Bob (recipient): same update -- expect 1 row affected.

-- ---------------------------------------------------------------------------
-- 5. Disconnect preserves history, blocks new messages.
-- ---------------------------------------------------------------------------
-- As Bob: delete from connections where alice<->bob.
-- As Alice: select the old message by id -- expect still visible (1 row).
-- As Bob: select the old message by id -- expect still visible (1 row).
-- As Alice: insert a NEW message to Bob -- expect RLS ERROR.

-- ---------------------------------------------------------------------------
-- 6. Cleanup.
-- ---------------------------------------------------------------------------
delete from auth.users where id in (
  'a1111111-1111-1111-1111-111111111111','b2222222-2222-2222-2222-222222222222',
  'c3333333-3333-3333-3333-333333333333','d4444444-4444-4444-4444-444444444444',
  'e5555555-5555-5555-5555-555555555555','f6666666-6666-6666-6666-666666666666',
  '09999999-9999-9999-9999-999999999999'
);
