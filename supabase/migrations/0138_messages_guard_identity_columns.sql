-- Migration number 0138, assigned by CEO (2026-09-05) after checking every remote branch
-- (0138/0139/0140 all free at assignment time).
--
-- docs/permissive-update-policy-sweep-2026-09-04.md §6: messages.body/sender_id are unguarded --
-- the RLS policy "recipient marks message read" (migration 0027) is `for update using
-- (recipient_id = auth.uid()) with check (recipient_id = auth.uid())`, no column scope. The
-- app's own write (app/(app)/messages/actions.ts) only ever sends {read_at}, three call sites,
-- all additionally scoped .is("read_at", null) -- but nothing in RLS/GRANT stops a direct REST
-- PATCH from the recipient's own session appending body/sender_id to that same statement,
-- rewriting what the sender is credited with having said or reassigning authorship entirely.
--
-- MECHANISM: identical to every guard since 0062/0063/0121/0122/0136/0137 -- reset to OLD on a
-- non-service-role UPDATE, pg_trigger_depth() <= 1 (direct top-level update only), search_path
-- pinned empty. Column-scoped (`update of body, sender_id`) so the real mark-read UPDATE
-- ({read_at} alone) never even fires this trigger.
--
-- NO PAIRED CODE CHANGE NEEDED, unlike §1/§2: the one legitimate writer
-- (app/(app)/messages/actions.ts) uses the caller's own createClient() (RLS-scoped) session,
-- confirmed by reading the file -- no admin/service-role client involved anywhere in this
-- table's write path. RLS therefore stays fully in force for the real write; there is no
-- RLS-bypass ownership question the way §1/§2 raised, since nothing moves to admin.
--
-- WHY GUARD COLUMNS THE APP NEVER TOUCHES TODAY, RATHER THAN SKIP THIS: the guard's value isn't
-- that the CURRENT writer happens to leave body/sender_id alone -- it's that it holds
-- unconditionally, regardless of which code path produced the UPDATE, because the trigger
-- doesn't know or trust anything about the caller except current_user. If a future writer
-- (a refactor, a new call site, a bulk-message-edit feature) ever did touch these columns from
-- a non-service-role session, this trigger would still fire and still reset them -- the
-- protection does not rest on "nothing calls this today," which is a fact about the current
-- code, not a guarantee about tomorrow's. Column-scoping to exactly body/sender_id (rather than
-- a blanket `before update`) is what makes this defense-in-depth rather than a description of
-- current behavior: it holds whether or not the assumption it was written under keeps holding.
--
-- PROOF: docs/messages-connections-guard-proof-2026-09-05.md, Part 1 -- a same-statement
-- attack (the legitimate {read_at} field alongside the smuggled {body, sender_id} fields)
-- reproduced vulnerable pre-guard; confirmed blocked post-guard while read_at still updates in
-- the SAME statement (the legitimate mark-read path is not broken by closing this gap); and
-- confirmed capable of failing (dropped the trigger, re-ran the identical attack, it succeeded
-- again).

create or replace function public.messages_guard_identity_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.body := old.body;
    new.sender_id := old.sender_id;
  end if;
  return new;
end;
$$;

drop trigger if exists messages_00_guard_identity_columns on public.messages;
create trigger messages_00_guard_identity_columns
  before update of body, sender_id on public.messages
  for each row execute function public.messages_guard_identity_columns();

-- STATUS: WRITTEN BUT NOT APPLIED. Prepared for CEO/founder to apply. Do not run against the
-- live project from here.
