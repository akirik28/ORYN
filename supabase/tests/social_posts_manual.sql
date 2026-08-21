-- Manual live-verification matrix for the social layer's RLS (migration 0058). Same
-- format and purpose as connection_privacy_manual.sql and messaging_authorization_manual.sql:
-- not a pgTAP suite (no pgtap extension is confirmed available anywhere this repo has
-- run), run by hand against a disposable project/branch and eyeball the results.
--
-- STATUS: NOT YET RUN. Migration 0058 is not applied anywhere — the social layer ships
-- switched off. This file is the checklist for the day it is applied, and it should be
-- run in full BEFORE the feature is switched on, not after.
--
-- The unit tests in __tests__/social/ cover the pure decisions (visibility, repost
-- render, feed ordering, input shapes, write payloads) and __tests__/social/posts-schema.test.ts
-- pins the clauses below by reading the migration text. Neither can prove that Postgres
-- actually behaves this way. That is what this file is for.
--
-- Run each numbered block as its OWN statement batch. Chaining a deliberately-failing
-- insert with setup statements rolls the whole batch back, and you will misread the
-- rollback as a policy bug — the exact mistake messaging_authorization_manual.sql's own
-- header records having made.

-- ---------------------------------------------------------------------------
-- 1. Setup. Alice <-> Bob accepted. Carol unconnected. Dave connected then blocked.
--    Alice is_public = true; Bob is_public = false (for the oryn_public double gate).
-- ---------------------------------------------------------------------------
insert into auth.users (id, email) values
  ('a1111111-1111-1111-1111-111111111111', 'alice@test.local'),
  ('b2222222-2222-2222-2222-222222222222', 'bob@test.local'),
  ('c3333333-3333-3333-3333-333333333333', 'carol@test.local'),
  ('d4444444-4444-4444-4444-444444444444', 'dave@test.local');

update public.profiles set is_public = true  where id = 'a1111111-1111-1111-1111-111111111111';
update public.profiles set is_public = false where id = 'b2222222-2222-2222-2222-222222222222';

insert into public.connections (requester_id, recipient_id, status, responded_at) values
  ('a1111111-1111-1111-1111-111111111111', 'b2222222-2222-2222-2222-222222222222', 'accepted', now()),
  ('a1111111-1111-1111-1111-111111111111', 'd4444444-4444-4444-4444-444444444444', 'accepted', now());
insert into public.blocked_users (blocker_id, blocked_id)
  values ('d4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111');

-- ---------------------------------------------------------------------------
-- 2. As Alice — create one post at each visibility. Run each as its own batch.
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"a1111111-1111-1111-1111-111111111111","role":"authenticated"}', true);

insert into public.posts (author_id, kind, visibility, body)
  values ('a1111111-1111-1111-1111-111111111111','original','private','alice private -- expect SUCCESS');
-- (new batch) ... 'connections', 'alice connections -- expect SUCCESS'
-- (new batch) ... 'oryn_public', 'alice public -- expect SUCCESS (alice.is_public = true)'
--
-- (new batch) forged author -- expect RLS ERROR:
--   insert into public.posts (author_id, kind, visibility, body)
--     values ('b2222222-...','original','connections','forged');
--
-- (new batch) pre-set counter -- expect RLS ERROR (the insert policy pins them to 0):
--   insert into public.posts (author_id, kind, visibility, body, like_count)
--     values ('a1111111-...','original','connections','forged count', 500);
--
-- (new batch) omitted visibility -- expect NOT NULL ERROR, NOT a defaulted row. This is
-- the single most important assertion in this file: if a row appears with any visibility
-- at all, a default has been reintroduced and every post in the product has an implicit
-- audience.
--   insert into public.posts (author_id, kind, body)
--     values ('a1111111-...','original','no visibility named');

-- ---------------------------------------------------------------------------
-- 3. As Bob (accepted connection, is_public = false) — read matrix.
-- ---------------------------------------------------------------------------
-- set local role authenticated; select set_config(..., '{"sub":"b2222222-...bob"}', true);
-- select visibility, body from public.posts order by created_at;
--   expect: alice's 'connections' row AND alice's 'oryn_public' row.
--   expect NOT: alice's 'private' row.
--
-- (new batch) Bob posts oryn_public while his own profile is private -- expect RLS ERROR
-- (the write-time half of the double gate):
--   insert into public.posts (author_id, kind, visibility, body)
--     values ('b2222222-...','original','oryn_public','bob broadcast');

-- ---------------------------------------------------------------------------
-- 4. As Carol (no connection at all).
-- ---------------------------------------------------------------------------
-- select visibility, body from public.posts;
--   expect: ONLY alice's 'oryn_public' row (alice.is_public = true).
--   expect NOT: 'connections', not 'private'.

-- ---------------------------------------------------------------------------
-- 5. As Dave (accepted connection, but has blocked Alice) -- the divergence from
--    profile visibility. A block gates a feed in BOTH directions.
-- ---------------------------------------------------------------------------
-- select count(*) from public.posts where author_id = 'a1111111-...';
--   expect: 0. Not the connections row, not even the oryn_public one.
-- (and as Alice) select count(*) from public.posts where author_id = 'd4444444-...';
--   expect: 0 for any post Dave creates -- symmetric, via is_blocked_between.

-- ---------------------------------------------------------------------------
-- 6. Likes: idempotency and the counter.
-- ---------------------------------------------------------------------------
-- As Bob, against alice's 'connections' post id (call it $P):
--   insert into public.post_likes (post_id, user_id) values ($P,'b2222222-...');            -- SUCCESS
--   select like_count from public.posts where id = $P;                                       -- expect 1
--   insert into public.post_likes (post_id, user_id) values ($P,'b2222222-...')
--     on conflict do nothing;                                                                -- SUCCESS, 0 rows
--   select like_count from public.posts where id = $P;                                       -- expect STILL 1
--   delete from public.post_likes where post_id = $P and user_id = 'b2222222-...';
--   select like_count from public.posts where id = $P;                                       -- expect 0
--   delete from public.post_likes where post_id = $P and user_id = 'b2222222-...';           -- 0 rows
--   select like_count from public.posts where id = $P;                                       -- expect STILL 0, never -1
--
-- As Carol, liking alice's 'connections' post (which she cannot see) -- expect RLS ERROR.
--
-- Who liked it:
--   As Bob:   select * from public.post_likes where post_id = $P;  -- expect his own row only
--   As Alice (the author): same query                              -- expect Bob's row (author sees its likes)
--   As Carol: same query                                           -- expect 0 rows

-- ---------------------------------------------------------------------------
-- 7. Counter forgery -- the guard trigger.
-- ---------------------------------------------------------------------------
-- As Alice, on her own post:
--   update public.posts set like_count = 9999 where id = $P;
--   select like_count from public.posts where id = $P;   -- expect UNCHANGED, and no error
-- Note the shape of the pass: the UPDATE succeeds and silently does nothing to the
-- counter. If like_count reads 9999, pg_trigger_depth()/current_user guard is broken.

-- ---------------------------------------------------------------------------
-- 8. Edit history.
-- ---------------------------------------------------------------------------
-- As Alice:  update public.posts set body = 'edited text' where id = $P;
--   select edit_count, edited_at from public.posts where id = $P;  -- expect 1, non-null
--   select revision, body from public.post_revisions where post_id = $P;
--     -- expect exactly one row: revision 0, carrying the ORIGINAL text.
--   update public.posts set visibility = 'private' where id = $P;
--   select revision, visibility from public.post_revisions where post_id = $P order by revision;
--     -- expect two rows; revision 1 carries the PRE-CHANGE visibility ('connections').
-- As Bob:    select * from public.post_revisions;                  -- expect 0 rows (author-only)
-- As Alice:  insert into public.post_revisions (post_id, revision, visibility)
--              values ($P, 99, 'private');                          -- expect RLS ERROR (no insert policy)

-- ---------------------------------------------------------------------------
-- 9. Reposts, including the two cases the product's own comments turn on.
-- ---------------------------------------------------------------------------
-- As Bob, repost alice's 'connections' post $P at 'connections'  -- expect SUCCESS
--   select repost_count from public.posts where id = $P;          -- expect 1
-- As Bob, repost $P at 'oryn_public' -- the DB permits this (RLS cannot compare the two
--   rows' visibilities); the widening rule is enforced in buildRepostInsert. Verify the
--   CONSEQUENCE instead: as Carol, select the repost -- she sees the repost row (Bob's
--   commentary) but a join to the original returns NOTHING, so the embed renders the
--   neutral unavailable placeholder. That is the leak-containment guarantee.
-- As Carol, repost $P (which she cannot see) -- expect RLS ERROR from the insert policy's
--   `exists (select 1 from public.posts o where o.id = ...)` subquery.
-- Nested repost collapse: as Carol, repost BOB'S REPOST of alice's oryn_public post.
--   select reposted_post_id from public.posts where author_id = 'c3333333-...';
--   -- expect ALICE'S ORIGINAL id, not Bob's repost id.

-- ---------------------------------------------------------------------------
-- 10. Deletion actually deletes -- including the reposts.
-- ---------------------------------------------------------------------------
-- As Alice: delete from public.posts where id = $P;
--   select count(*) from public.post_likes     where post_id = $P;              -- expect 0
--   select count(*) from public.post_revisions where post_id = $P;              -- expect 0
--   select count(*) from public.posts          where reposted_post_id = $P;     -- expect 0
--     -- i.e. Bob's repost is gone too, commentary included. This is the deliberate cost
--     -- of "provide deletion" meaning the content stops being displayed everywhere.
--   select post_id, reason from public.message_reports where reason = '<the test report>';
--     -- expect the ROW STILL PRESENT with post_id NULL (on delete set null).

-- ---------------------------------------------------------------------------
-- 11. Moderator removal.
-- ---------------------------------------------------------------------------
-- Create a fresh alice post $Q at 'connections' and have Bob repost it.
-- As service_role (the admin client's role):
--   update public.posts
--      set removed_at = now(), removed_by = 'a1111111-...', removal_reason = 'test'
--    where id = $Q;                                                  -- expect SUCCESS
-- As Alice (the author): select body, removed_at from public.posts where id = $Q;
--   -- expect the row, with removed_at set. Removal is never silent to its author.
-- As Bob: select * from public.posts where id = $Q;                  -- expect 0 rows
-- As Bob, viewing his own repost: the embed join returns nothing -> unavailable placeholder.
-- As Alice: update public.posts set removed_at = null where id = $Q;
--   select removed_at from public.posts where id = $Q;               -- expect STILL SET
--   -- The guard trigger; an author must not be able to undo a moderator.
-- As Alice: update public.posts set body = 'sneaky' where id = $Q;   -- expect 0 rows updated
--   -- The update policy's `removed_at is null` in USING.

-- ---------------------------------------------------------------------------
-- 12. Storage: attachments are owner-only even for a permitted viewer.
-- ---------------------------------------------------------------------------
-- As Bob, select from storage.objects where bucket_id = 'post-media' and the path is
-- alice's folder -- expect 0 rows, even for a post Bob can read. Viewer access is a
-- server-minted signed URL (lib/social/posts.ts getPostAttachmentUrl), by design.

-- ---------------------------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------------------------
-- reset role;
-- delete from auth.users where email like '%@test.local';
--   -- profiles/posts/likes/revisions/reposts all cascade from there.
