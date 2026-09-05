-- Item 5, docs/permissive-update-policy-sweep-2026-09-04.md / docs/still-open-findings-
-- 2026-09-05.md: notifications.title/body/link/category smuggleable via the owner's own
-- UPDATE despite migration 0014's own header calling this table "system-generated."
--
-- 0014's real policy for this table (lines 39-41 of that file -- its OWN explicit
-- select/update/delete policies, NOT the earlier owner_tables loop, which notifications is
-- not a member of): "update own notifications" is `using (user_id = auth.uid()) with check
-- (user_id = auth.uid())`, no column restriction. The comment states the intent
-- ("system-generated... but not create") plainly; the policy it sits above doesn't enforce
-- the "not create" half at the column level for an existing row -- a student can already
-- read/write their own row (correctly, for read_at), and nothing stops the same UPDATE from
-- also rewriting title/body/link/category to anything.
--
-- MECHANISM, identical to the six already-live guards in
-- 0063_guard_computed_score_columns.sql: RESET the protected columns to their OLD value on a
-- non-service-role UPDATE, not RAISE (a silent reset can't tell an attacker which column is
-- guarded, and doesn't fail an otherwise-legitimate multi-column write -- this table's one
-- real write, {read_at: ...}, never touches these four columns, but a smuggled write in the
-- SAME statement must not also fail the read_at half). `pg_trigger_depth() <= 1` guards the
-- direct, top-level update only, matching every one of the six existing guards.
-- `set search_path = ''` for the same reason 0063's own header gives (Supabase's linter
-- flags the unqualified form; not exploitable today, checked, but costs one line).
--
-- NO PAIRED CODE CHANGE NEEDED, unlike target_universities (the same sweep's §1): the one
-- legitimate writer of these four columns, createNotification (lib/notifications/create.ts),
-- already uses createAdminClient() -- confirmed in the code, not just its own doc comment
-- ("there is deliberately no RLS insert policy allowing a normal request to create one for
-- itself, so this always goes through the admin client"). Same shape as `plan_tier` and
-- `advisor_conversations.summary`/`.summarized_at`: the legitimate writer was already on
-- service-role before this migration, so the guard alone is the complete fix.
--
-- Proof, red-to-green-to-broken-to-restored, against a real local Postgres 17 instance with
-- the exact policy text above and a real student session (not a mock):
-- docs/notifications-guard-rls-proof-2026-09-05.md.
--
-- *** NOT YET APPLIED *** -- this project's standing discipline (0077/0116/0117/0134's own
-- headers): a deliberate, separate apply pass, not automatic on merge.

create or replace function public.notifications_guard_system_generated_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.title := old.title;
    new.body := old.body;
    new.link := old.link;
    new.category := old.category;
  end if;
  return new;
end;
$$;

drop trigger if exists notifications_00_guard_system_generated_columns on public.notifications;
create trigger notifications_00_guard_system_generated_columns
  before update of title, body, link, category on public.notifications
  for each row execute function public.notifications_guard_system_generated_columns();

-- Re-run safe: CREATE OR REPLACE FUNCTION and DROP TRIGGER IF EXISTS + CREATE TRIGGER are
-- both idempotent, same discipline every guard migration in this file's own lineage documents.
