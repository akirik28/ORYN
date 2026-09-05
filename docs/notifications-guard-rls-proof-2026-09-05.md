# Proving `notifications.title`/`body`/`link`/`category` are smuggleable, and that the fix closes it — 2026-09-05

Item 5 of the eight-table permissive-update sweep
(`docs/permissive-update-policy-sweep-2026-09-04.md` §5), reconfirmed still open in
`docs/still-open-findings-2026-09-05.md`. Migration `0014_row_level_security.sql`'s own
header comment states the intent plainly: *"notifications: system-generated, user can
read/acknowledge/delete but not create."* The migration that says this then grants its own
explicit `"update own notifications"` policy — `using (user_id = auth.uid()) with check
(user_id = auth.uid())`, no column restriction (this table has its own hand-written
select/update/delete policies right there in 0014, not the earlier `owner_tables` loop,
which `notifications` isn't a member of). The comment makes a promise the policy doesn't
keep.

Separately, correcting my own first pass at this: 0014's comment also has a second, distinct
problem CEO named directly — the "delete" part was never real as a *usable feature*, though
it's worth being precise about what that means. The `delete own notifications` policy two
lines below the comment is genuine, real RLS, and always has been. What's missing is
everything above it: no Server Action, no UI button, nothing in this codebase has ever called
`.from("notifications").delete(...)` — grepped, zero hits. So "delete" isn't a broken
capability; it's a described feature that was never built at any layer above the database.
Fixed alongside this migration (0014's comment now says so precisely, not just drops the
word).

Same requirement CEO set for the advisor session-delete proof
(`docs/advisor-session-delete-rls-proof-2026-09-05.md`, the template this follows): a real
Postgres engine evaluating the real, unmodified policy text, not a mock. `lib/notifications/
create.ts` already has coverage that the app's own insert path is correct; it cannot prove
what a direct PostgREST `PATCH` against a student's own row can or can't do, because that
request never touches this codebase's TypeScript at all — only Postgres itself, via RLS,
decides.

## What was verified before writing anything

- `createNotification` (`lib/notifications/create.ts`) is the only writer of `title`/`body`/
  `link`/`category` anywhere in the codebase, and its own doc comment states it always uses
  `createAdminClient()` (service-role) — confirmed in the code, not just the comment: `const
  supabase = createAdminClient();`. This is the same shape as `plan_tier` and
  `advisor_conversations.summary`/`.summarized_at` (migration 0063) — the legitimate writer
  is already on service-role, so a guard trigger is the whole fix; no paired code change is
  needed the way `target_universities` (§1 of the same sweep) requires.
- The only real user-facing write anywhere is `{read_at: ...}` — `app/(app)/notifications/
  actions.ts`, three call sites, byte-identical. Grepped the whole codebase for any
  `.from("notifications").delete(` — none exist, so 0014's "read/acknowledge/**delete**"
  never got a delete path built; this proof doesn't need to account for one.
- `user_id` doesn't need guarding — reassigning it to someone else already fails the
  existing policy's own `WITH CHECK` structurally (the new row's `user_id` would no longer
  equal `auth.uid()`), so RLS already closes that specific column on its own.
- Full column list from `0012_notifications.sql`, read directly: `id`, `user_id`, `category`
  (a real enum, `notification_category`, not `text`), `title`, `body`, `link`, `read_at`,
  `created_at`.

## Method

A scratch local Postgres 17 cluster (Homebrew, `initdb`/`pg_ctl` on port 5433, torn down
after — nothing here touches the real Supabase project), minimal but byte-for-byte faithful
to the real schema, same approach the reference proof uses rather than the full 130+
migration chain:

- `public.profiles` (minimal stub, `id uuid primary key`) and `public.notifications`, exact
  column shapes and the real `notification_category` enum from `0012_notifications.sql`.
- The real, unmodified `using`/`with check` text from `0014_row_level_security.sql`'s own
  `"update own notifications"` policy: `using (user_id = auth.uid()) with check (user_id =
  auth.uid())`. Modeled as a single `for all` policy in the scratch schema rather than
  reproducing all three of 0014's separate select/update/delete policies verbatim — this
  finding is specifically about the UPDATE path, and the `using`/`with check` clauses that
  actually matter are identical either way; nothing about select or delete is exercised or
  claimed by this proof.
- `service_role` created with `BYPASSRLS`, matching real Supabase — the service-role
  connection never evaluates RLS at all, which is exactly why `createNotification`'s write
  is unaffected by anything RLS-shaped and the guard trigger (checking `current_user`, not
  a policy) is what actually has to stop the owner instead.
- The corrected `auth.uid()` shim reading `request.jwt.claims` — self-tested against all
  three real shapes first (no claim → null, empty `{}` claim → null, a real `{"sub":...}`
  claim → the uuid), all three clean, before trusting it for anything below.
- Ran as one transaction (`psql -1`, `ON_ERROR_ROLLBACK on`) so `SET LOCAL role`/
  `set_config(..., true)` impersonation survives across statements.

## The proof — five phases, one continuous transcript

**Phase 1 — RED, against the current, unmodified policy.** The system (service-role,
matching `createNotification`) creates a real notification for student A: *"Your weekly
plan is ready."* As A, using their own session (the exact client `markAsRead` uses), send
an `UPDATE` that looks like the legitimate `{read_at: ...}` write but smuggles
`title`/`body`/`link`/`category` in alongside it — the exact shape a direct REST `PATCH`
from A's own valid session JWT can send, with or without the app's own Zod schema in front
of it (PostgREST is reachable directly regardless of what the app's own forms send — sweep
doc's own §7). Result: `UPDATE 1`, and every one of the four values changed, including to a
deliberately alarming example (`"URGENT: verify your account now"`, a fake phishing link) to
make the real stakes concrete — a system voice a student can rewrite is no longer the
product's own voice, and notifications are the one place named to eventually reach a parent
too.

**Phase 2 — apply the fix.** One guard trigger, the identical shape to the six already-live
in `0063_guard_computed_score_columns.sql`: `RESET` the four protected columns to their
`OLD` value on a non-service-role `UPDATE` (not `RAISE` — a silent reset can't tell an
attacker which column is guarded, and doesn't fail an otherwise-legitimate multi-column
write for the one unrelated field, `read_at`, in the same statement), `pg_trigger_depth()
<= 1` scopes it to the direct top-level update only, `set search_path = ''` per Supabase's
own linter convention every one of the six existing guards already follows.

**Phase 3 — GREEN, identical attack, fresh row, now guarded.** Same `UPDATE`, same payload.
Result: `title`/`body`/`link`/`category` all read back as their real, original values —
silently reverted, not rejected — while `read_at` genuinely updated. Checked the other
direction too, not assumed: a service-role `UPDATE` (matching how `createNotification`
itself would edit these columns) still succeeds normally — the guard blocks the owner
without also blocking the system.

**Phase 4 — proving the proof itself can fail.** Dropped the guard trigger, reran the
identical attack against a fresh row. The check caught it immediately, by name:

```
ERROR:  GUARD FAILED: title smuggled -- now "URGENT: verify your account now"
        (EXPECTED in Phase 4 -- proves the check itself works)
```

**Phase 5 — restore, reconfirm clean.** Recreated the trigger, ran the attack once more.
Held again: `PHASE 5 CONFIRMED: restored guard holds again`.

All five phases ran in one continuous script/transcript (`full-proof.sql`, in full below) —
not five separate reruns that could each have started from a different, uncontrolled state.
**How to read the transcript**: scan for any `ERROR` line, not only the final summary row —
`ON_ERROR_ROLLBACK` deliberately lets later, independent phases keep running after Phase 4's
own expected failure, the same reasoning the reference proof's own transcript-reading note
gives.

## setup.sql

```sql
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin bypassrls;
  end if;
end $$;

grant usage on schema public to anon, authenticated, service_role;
grant all privileges on all tables in schema public to anon, authenticated, service_role;
alter default privileges in schema public grant all privileges on tables to anon, authenticated, service_role;

create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create table public.profiles (id uuid primary key);

create type notification_category as enum ('deadline', 'new_opportunity', 'weekly_plan', 'profile_update', 'university_data_changed', 'system');
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  category notification_category not null,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.notifications enable row level security;
create policy "owner full access" on public.notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

## full-proof.sql (all five phases)

```sql
\set ON_ERROR_ROLLBACK on

-- PHASE 1: RED
insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111');

set local role service_role;
insert into public.notifications (id, user_id, category, title, body, link) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'weekly_plan', 'Your weekly plan is ready', 'Three priorities this week.', '/plan');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.notifications
set read_at = now(), title = 'URGENT: verify your account now', body = 'Click this link immediately.', link = 'https://not-proxola.example/phish', category = 'university_data_changed'
where id = '22222222-2222-2222-2222-222222222222';
reset role;

do $$
declare t text;
begin
  select title into t from public.notifications where id = '22222222-2222-2222-2222-222222222222';
  if t = 'Your weekly plan is ready' then raise exception 'unexpected: already blocked before any fix applied'; end if;
  raise notice 'PHASE 1 CONFIRMED VULNERABLE: title is now "%"', t;
end $$;

-- PHASE 2: apply the fix
create or replace function public.notifications_guard_system_generated_columns()
returns trigger language plpgsql set search_path = '' as $$
begin
  if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
    new.title := old.title; new.body := old.body; new.link := old.link; new.category := old.category;
  end if;
  return new;
end;
$$;
drop trigger if exists notifications_00_guard_system_generated_columns on public.notifications;
create trigger notifications_00_guard_system_generated_columns
  before update of title, body, link, category on public.notifications
  for each row execute function public.notifications_guard_system_generated_columns();

-- PHASE 3: GREEN
set local role service_role;
insert into public.notifications (id, user_id, category, title, body, link) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'weekly_plan', 'Your weekly plan is ready', 'Three priorities this week.', '/plan');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.notifications
set read_at = now(), title = 'URGENT: verify your account now', body = 'Click this link immediately.', link = 'https://not-proxola.example/phish', category = 'university_data_changed'
where id = '33333333-3333-3333-3333-333333333333';
reset role;

do $$
declare t text; b text; l text; c text; r timestamptz;
begin
  select title, body, link, category::text, read_at into t, b, l, c, r from public.notifications where id = '33333333-3333-3333-3333-333333333333';
  if t <> 'Your weekly plan is ready' then raise exception 'GUARD FAILED: title smuggled -- now "%"', t; end if;
  if b <> 'Three priorities this week.' then raise exception 'GUARD FAILED: body smuggled -- now "%"', b; end if;
  if l <> '/plan' then raise exception 'GUARD FAILED: link smuggled -- now "%"', l; end if;
  if c <> 'weekly_plan' then raise exception 'GUARD FAILED: category smuggled -- now "%"', c; end if;
  if r is null then raise exception 'GUARD OVER-BROAD: legitimate read_at write was also blocked'; end if;
  raise notice 'PHASE 3 CONFIRMED: content columns held, read_at still worked';
end $$;

set local role service_role;
update public.notifications set title = 'Updated by the system', category = 'deadline' where id = '33333333-3333-3333-3333-333333333333';
reset role;

do $$
declare t text; c text;
begin
  select title, category::text into t, c from public.notifications where id = '33333333-3333-3333-3333-333333333333';
  if t <> 'Updated by the system' or c <> 'deadline' then raise exception 'GUARD TOO STRICT: blocked the legitimate service-role writer too'; end if;
  raise notice 'PHASE 3 CONFIRMED: legitimate service-role writer unaffected';
end $$;

-- PHASE 4: prove the proof can fail
drop trigger notifications_00_guard_system_generated_columns on public.notifications;

set local role service_role;
insert into public.notifications (id, user_id, category, title, body, link) values
  ('55555555-5555-5555-5555-555555555555', '11111111-1111-1111-1111-111111111111', 'weekly_plan', 'Your weekly plan is ready', 'Three priorities this week.', '/plan');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.notifications
set read_at = now(), title = 'URGENT: verify your account now', body = 'Click this link immediately.', link = 'https://not-proxola.example/phish', category = 'university_data_changed'
where id = '55555555-5555-5555-5555-555555555555';
reset role;

do $$
declare t text;
begin
  select title into t from public.notifications where id = '55555555-5555-5555-5555-555555555555';
  if t <> 'Your weekly plan is ready' then raise exception 'GUARD FAILED: title smuggled -- now "%" (EXPECTED in Phase 4 -- proves the check itself works)', t; end if;
  raise notice 'unexpected: guard still holding after being dropped';
end $$;

-- PHASE 5: restore, reconfirm clean
create trigger notifications_00_guard_system_generated_columns
  before update of title, body, link, category on public.notifications
  for each row execute function public.notifications_guard_system_generated_columns();

set local role service_role;
insert into public.notifications (id, user_id, category, title, body, link) values
  ('66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111', 'weekly_plan', 'Your weekly plan is ready', 'Three priorities this week.', '/plan');
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);
update public.notifications set read_at = now(), title = 'attack again' where id = '66666666-6666-6666-6666-666666666666';
reset role;

do $$
declare t text;
begin
  select title into t from public.notifications where id = '66666666-6666-6666-6666-666666666666';
  if t <> 'Your weekly plan is ready' then raise exception 'GUARD FAILED after restore -- now "%"', t; end if;
  raise notice 'PHASE 5 CONFIRMED: restored guard holds again';
end $$;

select 'ALL PHASES COMPLETE -- scan above for any ERROR line, the final row alone does not mean the run was clean' as result;
```

## Status

Proof complete, cluster still up pending the migration number (CEO's own rule, reinforced
today after a self-picked number went uncoordinated once already: ask before claiming one).
The migration to ship is exactly the SQL in Phase 2 above, once numbered — content is final
regardless of filename. Not yet applied anywhere; will be added to
`supabase/migrations/00NN_notifications_guard_system_generated_columns.sql` the moment a
number is assigned, matching this codebase's own "write migrations, leave them unapplied"
standing discipline until a deliberate apply pass.

---

🤖 Generated with [Claude Code](https://claude.com/claude-code)
