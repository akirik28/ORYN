-- Backstops lib/opportunities/persist-matches.ts's notifyNewlyEligibleMatches() dedup check,
-- which is a plain check-then-insert (SELECT for an existing row, then INSERT if none found)
-- with nothing preventing two concurrent calls from both reading "nothing exists yet" before
-- either commits. Confirmed this is exactly what happened, not a theoretical risk: 12 live
-- notifications.new_opportunity rows for one account, in three groups of exactly 4, all
-- created within a 13-second window on 2026-09-02
-- (docs/notification-center-live-verification-2026-09-02.md). The function's own comment
-- already named the race; nothing in the code closed it. A check-then-insert pattern cannot
-- close a race no matter how it's tuned -- only a database constraint can.
--
-- Scoped to category = 'new_opportunity' specifically, NOT a table-wide
-- (user_id, category, link) constraint, because the other categories that share this insert
-- path genuinely need to notify again on the same link:
--   - weekly_plan: lib/plan/persist.ts's own dedup key is (user_id, category, week), not link
--     -- every weekly_plan notification uses the literal link "/plan", so a link-based unique
--     constraint would silently block every week after the first, forever.
--   - message / connection: app/(app)/messages/actions.ts and .../connections/actions.ts both
--     build `link` from the other party's id (e.g. "/messages/<senderId>") -- a second real
--     message from the same sender is a second real event that deserves its own notification,
--     not a duplicate to suppress.
--   - deadline: already has its own dedup mechanism, deadline_notification_log's unique index
--     (migration 0075, keyed on user_id/source/source_id/threshold_days) -- a second constraint
--     here would be redundant at best.
--   - profile_update: has no pre-flight check at all today, by design -- it's gated on
--     detectNotifiableProfileUpdate() actually finding a real score change, not on notification
--     history, and the same real-world change (e.g. "Research improved") occurring in two
--     different months legitimately deserves two separate notifications.
-- Only new_opportunity's own semantics -- "this (student, opportunity) pair notifies at most
-- once, ever" (that function's own comment) -- are actually a permanent per-link uniqueness.
-- A partial index is the correct tool for a constraint that only one category needs.
--
-- Checked against live data before writing this, not assumed: zero notifications.link values
-- are null for category = 'new_opportunity' (a null would never collide under a unique index,
-- silently leaving those rows unprotected), and every existing duplicate belongs to this one
-- category -- confirmed via direct query, 2026-09-02.
--
-- Deliberately NOT usable via Supabase's `.upsert(row, { onConflict: 'user_id,link' })` --
-- PostgREST's onConflict option only ever accepts a plain column list
-- (node_modules/@supabase/postgrest-js/src/PostgrestQueryBuilder.ts's own doc comment: "the
-- corresponding onConflict columns"), with no way to supply the partial index's WHERE
-- predicate. Postgres requires an ON CONFLICT target's predicate to match a partial index's
-- own predicate exactly to recognize it at all -- an onConflict call missing that predicate
-- would raise 42P10 ("no unique or exclusion constraint matching the ON CONFLICT
-- specification") on every insert, applied or not, not just on a real collision. This is why
-- lib/notifications/create.ts catches the DUPLICATE outcome (23505, a real Postgres constraint
-- violation) after a plain insert, rather than using upsert/onConflict -- see that file's own
-- comment for the full reasoning. This migration only adds the constraint; it does not change
-- how anything calls it.
--
-- This is NOT the "unapplied migration" backstop pattern from lib/supabase/errors.ts
-- (isUndefinedColumnError) -- that one degrades a write naming a column that doesn't exist
-- yet. This index protects the OPPOSITE direction: code that already tolerates its absence
-- (today's plain insert, unaffected either way) gains a real guarantee once this is applied,
-- rather than needing the guarantee to already exist to run at all.
--
-- Re-run safe: `if not exists` makes this file idempotent, matching every migration since the
-- version-0020 collision documented in docs/deployment.md 0.1 -- a file that cannot survive a
-- second run turns a recoverable stalled push into a manual repair.
create unique index if not exists notifications_new_opportunity_link_unique_idx
  on public.notifications (user_id, link)
  where category = 'new_opportunity';

comment on index public.notifications_new_opportunity_link_unique_idx is
  'Backstops the check-then-insert dedup in notifyNewlyEligibleMatches() -- a (user, '
  'opportunity) pair notifies at most once, ever. Scoped to new_opportunity only; every other '
  'category legitimately re-notifies on a repeated link. See this migration file''s own header '
  'comment for the full reasoning and the live incident that motivated it.';

-- NOTE FOR WHOEVER APPLIES THIS: as of 2026-09-02, applying this migration will fail against
-- the live database as-is. 12 existing notifications.new_opportunity rows for one QA account
-- (oryn.qa.b) are exactly the duplicates this index exists to prevent going forward, and a
-- unique index cannot be created over data that already violates it. Deliberately not cleaned
-- up here -- oryn.qa.b's rows and any other account's pre-existing duplicates are live data,
-- and deleting them is a founder decision, not this migration's to make. Applying this index
-- requires a prior, separate cleanup pass (keep one row per (user_id, link), delete the rest)
-- that this file does not perform.
