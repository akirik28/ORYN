-- Manual live-verification script for the migration 0024 privacy fix (public_profiles'
-- connection carve-out) and the 0023 reorder fix. NOT a pgTAP suite — the pgtap extension
-- was never confirmed present in any environment this repo has run in, so this isn't
-- dressed up as more automated than it is: run each block by hand (psql, the Supabase
-- SQL editor, or the Supabase MCP's execute_sql) against a disposable project/branch,
-- eyeball the `expect_*` booleans, then run the cleanup block at the bottom.
--
-- This exact script (mechanically identical queries) was run against a live scratch
-- Supabase project during the Chat 3 pass that fixed both bugs below, and every
-- assertion passed. See docs/known-issues.md / docs/final-product-audit.md for that
-- session's result. Re-run this after any future change to public_profiles or
-- connections — this invariant has already broken once (the original bug this repo
-- shipped) and once more in a different way (the 0023 create-before-reference ordering
-- bug), so treat "looks right on read" as insufficient for this specific view.

-- ---------------------------------------------------------------------------
-- 1. Setup: six disposable auth users + profiles + connections covering every
--    combination the privacy invariant needs to hold across.
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'alice@test.local'),
  ('22222222-2222-2222-2222-222222222222', 'bob@test.local'),
  ('33333333-3333-3333-3333-333333333333', 'carol@test.local'),
  ('44444444-4444-4444-4444-444444444444', 'dave@test.local'),
  ('55555555-5555-5555-5555-555555555555', 'eve@test.local'),
  ('66666666-6666-6666-6666-666666666666', 'frank@test.local');

update public.profiles set display_name = 'Alice', is_public = true  where id = '11111111-1111-1111-1111-111111111111';
update public.profiles set display_name = 'Bob',   is_public = false where id = '22222222-2222-2222-2222-222222222222';
update public.profiles set display_name = 'Carol', is_public = false where id = '33333333-3333-3333-3333-333333333333';
update public.profiles set display_name = 'Dave',  is_public = false where id = '44444444-4444-4444-4444-444444444444';
update public.profiles set display_name = 'Eve',   is_public = false where id = '55555555-5555-5555-5555-555555555555';
update public.profiles set display_name = 'Frank', is_public = false where id = '66666666-6666-6666-6666-666666666666';

-- Bob <-> Carol: accepted
insert into public.connections (requester_id, recipient_id, status, responded_at)
values ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', 'accepted', now());
-- Dave -> Carol: pending, never responded (Dave = requester, private, the exact shape of
-- the original bug: an unsolicited request with zero consent from Carol)
insert into public.connections (requester_id, recipient_id, status)
values ('44444444-4444-4444-4444-444444444444', '33333333-3333-3333-3333-333333333333', 'pending');
-- Eve <-> Carol: declined
insert into public.connections (requester_id, recipient_id, status, responded_at)
values ('55555555-5555-5555-5555-555555555555', '33333333-3333-3333-3333-333333333333', 'declined', now());

-- ---------------------------------------------------------------------------
-- 2. As Carol — run each block as its own statement batch (set local's scope is one
--    transaction/one simple-query batch; don't split the `set_config` from the `select`
--    across separate round-trips or it won't apply).
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);

select
  exists(select 1 from public.public_profiles where id = '22222222-2222-2222-2222-222222222222') as sees_bob_accepted___expect_true,
  exists(select 1 from public.public_profiles where id = '44444444-4444-4444-4444-444444444444') as sees_dave_pending_incoming___expect_true,
  exists(select 1 from public.public_profiles where id = '55555555-5555-5555-5555-555555555555') as sees_eve_declined___expect_FALSE,
  exists(select 1 from public.public_profiles where id = '11111111-1111-1111-1111-111111111111') as sees_alice_public___expect_true,
  exists(select 1 from public.public_profiles where id = '66666666-6666-6666-6666-666666666666') as sees_frank_no_connection___expect_FALSE,
  exists(select 1 from public.profiles       where id = '22222222-2222-2222-2222-222222222222') as direct_profiles_table_read_of_bob___expect_FALSE;

-- ---------------------------------------------------------------------------
-- 3. As Dave — the single most important check. Dave is the REQUESTER of a pending,
--    never-accepted connection to Carol, who is private. This is exactly the original
--    vulnerability's shape: does sending a cold request let the sender see the target?
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"44444444-4444-4444-4444-444444444444","role":"authenticated"}', true);

select
  exists(select 1 from public.public_profiles where id = '33333333-3333-3333-3333-333333333333') as sees_carol_via_own_pending_request___expect_FALSE;

-- ---------------------------------------------------------------------------
-- 4. As Eve — declined, either direction, must grant nothing.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"55555555-5555-5555-5555-555555555555","role":"authenticated"}', true);

select
  exists(select 1 from public.public_profiles where id = '33333333-3333-3333-3333-333333333333') as sees_carol_declined___expect_FALSE;

-- ---------------------------------------------------------------------------
-- 5. Cleanup — cascades through profiles/connections via `on delete cascade`, which is
--    itself worth confirming didn't silently stop working (AGENTS.md section 12's account-deletion
--    requirement depends on the same cascade chain).
-- ---------------------------------------------------------------------------
delete from auth.users where id in (
  '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333','44444444-4444-4444-4444-444444444444',
  '55555555-5555-5555-5555-555555555555','66666666-6666-6666-6666-666666666666'
);
select count(*) as remaining_test_profiles___expect_0 from public.profiles where display_name in ('Alice','Bob','Carol','Dave','Eve','Frank');
