-- Migration number 0139, assigned by CEO (2026-09-05) after checking every remote branch
-- (0138/0139/0140 all free at assignment time). Applies after 0138 (messages), per the sweep's
-- own ordering: §6 before §7.
--
-- docs/permissive-update-policy-sweep-2026-09-04.md §7: connections.requester_id is unguarded --
-- the RLS policy "recipient responds to connection request" (migration 0023) is `for update
-- using (recipient_id = auth.uid()) with check (recipient_id = auth.uid())`, no column scope.
-- The app's own write (app/(app)/connections/actions.ts) only ever sends {status,
-- responded_at} -- but nothing in RLS/GRANT stops a direct REST PATCH from the recipient's own
-- session appending requester_id to that same statement, falsely reassigning who sent the
-- original connection request. (low_id/high_id are NOT a finding -- both are `generated always
-- as (least/greatest(requester_id, recipient_id)) stored`, so Postgres physically rejects any
-- direct write to them; only the plain requester_id column is exposed.)
--
-- MECHANISM: identical to every guard since 0062/0063/0121/0122/0136/0137/0138 -- reset to OLD
-- on a non-service-role UPDATE, pg_trigger_depth() <= 1 (direct top-level update only),
-- search_path pinned empty. Column-scoped (`update of requester_id`) so the real accept/decline
-- UPDATE ({status, responded_at} alone) never even fires this trigger.
--
-- NO PAIRED CODE CHANGE NEEDED, unlike §1/§2: the one legitimate writer
-- (app/(app)/connections/actions.ts) uses the caller's own createClient() (RLS-scoped) session.
-- The two admin-client readers of this table (lib/social/mutual-connections.ts, lib/social/
-- people-you-may-know-query.ts) only ever .select() -- confirmed by reading both files, neither
-- ever .update()s or .insert()s connections. RLS therefore stays fully in force for the real
-- write; there is no RLS-bypass ownership question the way §1/§2 raised, since nothing moves
-- to admin.
--
-- WHY GUARD A COLUMN THE APP NEVER TOUCHES TODAY, RATHER THAN SKIP THIS: same reasoning as
-- 0138 -- the guard's value isn't that the CURRENT writer happens to leave requester_id alone,
-- it's that it holds unconditionally regardless of which code path produces the UPDATE, because
-- the trigger only ever checks current_user, never anything about the caller's identity or
-- intent. If a future writer (a refactor, a new "transfer this request" feature, a bulk-admin
-- tool) ever touched requester_id from a non-service-role session, this trigger would still
-- fire and still reset it. Column-scoping to exactly requester_id is what makes this
-- defense-in-depth rather than a description of today's behavior: it protects against a writer
-- that doesn't exist yet, not just the one that exists now.
--
-- PROOF: docs/messages-connections-guard-proof-2026-09-05.md, Part 2 -- a same-statement
-- attack (the legitimate {status, responded_at} fields alongside a smuggled requester_id
-- reassignment) reproduced vulnerable pre-guard; confirmed blocked post-guard while
-- status/responded_at still update in the SAME statement (the legitimate accept/decline path is
-- not broken by closing this gap); and confirmed capable of failing (dropped the trigger,
-- re-ran the identical attack, it succeeded again).

create or replace function public.connections_guard_identity_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.requester_id := old.requester_id;
  end if;
  return new;
end;
$$;

drop trigger if exists connections_00_guard_identity_columns on public.connections;
create trigger connections_00_guard_identity_columns
  before update of requester_id on public.connections
  for each row execute function public.connections_guard_identity_columns();

-- STATUS: WRITTEN BUT NOT APPLIED. Prepared for CEO/founder to apply. Do not run against the
-- live project from here.
