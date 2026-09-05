# Proving the messages / connections identity-column guards — 2026-09-05

Same rigor CEO requires for every guard-trigger fix this sweep has produced (`docs/advisor-
session-delete-rls-proof-2026-09-05.md`, `docs/evidence-status-and-target-universities-rls-
guard-proof-2026-09-05.md`): prove under a real Postgres engine, not a mocked application-level
test, that (1) the vulnerability `docs/permissive-update-policy-sweep-2026-09-04.md` §6/§7
found is real, (2) the guard blocks it, (3) the legitimate write in the same statement still
works, and (4) the proof itself is capable of failing.

Closes §6 (`messages.body`/`.sender_id`, migration `0138`) and §7 (`connections.requester_id`,
migration `0139`) from that sweep. Both numbers assigned by CEO after checking every remote
branch — not self-assigned.
Both confirmed still open before writing anything — no guard trigger exists on either table
today (checked `pg_trigger`-equivalent via `grep` for `CREATE TRIGGER ... on public.messages|
connections` across every migration), unlike §3 (`advisor_conversations`), which turned out to
already be closed by migration 0122 before this dispatch even started — see that sweep doc's own
"✅ 2026-09-05 audit" section.

## Does the protection stand on its own, or borrow from something else?

CEO's own question, applied here explicitly rather than left implicit — the same question
whose answer was "borrowed" for `target_universities`' original write (ownership scoping came
from an earlier, separate SELECT, not the write itself) and "stands on its own" for its fixed
version (`.eq("user_id", userId)` directly on the write).

Two separate things are being guarded here, and each needs its own answer:

**The ownership half (who may touch this row at all) stands on its own.** Neither write moves
to admin — both stay on the caller's own `createClient()` session, so RLS's own
`recipient_id = auth.uid()` policy is evaluated fresh, in the SAME statement, every time. It is
not a fact established earlier and trusted later; it is re-checked live on every UPDATE by
Postgres itself, independent of anything this migration adds.

**The column-smuggling half (which fields that row-owner may touch) does NOT rest on "the
current writer never touches these columns" — deliberately.** It would be tempting to reason
"messages/actions.ts only ever sends `{read_at}`, so no guard is even necessary" — but that is a
fact about today's code, not a guarantee about tomorrow's. The guard is written to hold
regardless of which code path produces the UPDATE, because the trigger checks only
`current_user`, nothing about the caller's intent or which function ran. If a future writer ever
did touch `body`/`sender_id` (or `requester_id`) from a non-service-role session — a refactor, a
new call site, a bulk-edit feature nobody has built yet — this trigger fires exactly the same
way it does today. Column-scoping to the specific at-risk columns, rather than skipping the
guard because nothing currently exercises it, is what makes this defense-in-depth rather than a
description of current behavior. Written down here and in both migrations' own headers, not left
implicit.

## Why these two are simpler than §1/§2/§3: no admin client involved at all

Read both real write paths before designing anything (`app/(app)/messages/actions.ts`,
`app/(app)/connections/actions.ts`) — both import only `createClient()` (`@/lib/supabase/
server`), never `createAdminClient()`/`tryCreateAdminClient()`. Confirmed by grep, not assumed:
no file anywhere in `app/` or `lib/` calls an admin client and `.update()`/`.insert()`s either
`messages` or `connections` (`lib/social/mutual-connections.ts` and `lib/social/people-you-may-
know-query.ts` both use `tryCreateAdminClient()` against `connections`, but only `.select()` —
cross-user reads for mutual-connection/people-you-may-know computation, never a write).

This means, unlike §1/§2 (guard + move-write-to-admin) and even §3 (guard only, but the
legitimate writer already ran as `service_role`): **these two guards need no paired code change
at all, and RLS stays fully in force for both writes** — there is no RLS-bypass ownership
question to close here, because nothing moves to the admin client. The guard is pure upside.

## The realistic attack shape: smuggled into the SAME statement as the legitimate field

Both tables' one legitimate UPDATE is narrow in the app (`{read_at}`; `{status, responded_at}`),
but the RLS policy permitting it (`"recipient marks message read"`, `"recipient responds to
connection request"`) has no column scope — `for update using (recipient_id = auth.uid()) with
check (recipient_id = auth.uid())` for both. A direct REST PATCH from the recipient's own
session can append the identity column to the exact same statement. So unlike §1/§2/§3's proofs
(separate pre/post operations), this proof runs the attack as ONE combined statement each time —
`{read_at, body, sender_id}` / `{status, responded_at, requester_id}` — matching the real
exploit shape precisely: does the legitimate field still update while the smuggled field is
silently reset, in the SAME UPDATE?

**The smuggled target is a third profile (C), not the attacker's own id (B)** — reassigning
`sender_id`/`requester_id` to B's own id collides with each table's own `_no_self` check
constraint (`messages_no_self`: `sender_id <> recipient_id`; `connections_no_self`: `requester_id
<> recipient_id`), since B is already the row's `recipient_id`. Reassigning to an uninvolved
third party is both the scenario that actually reproduces (self-assignment would just fail the
check constraint, proving nothing) and the more realistic risk anyway — misattributing a
message, or a connection request, to someone who was never involved.

## Method

Scratch local Postgres 17 (Homebrew, `initdb`, torn down after — nothing here touches the real
Supabase project), real `authenticated`/`service_role` roles, the real unmodified RLS policy
text from `0023_social_v1.sql`/`0027_messaging.sql`, `psql -1` with `ON_ERROR_ROLLBACK` so `SET
LOCAL ROLE` survives across statements and a later assertion still runs after an earlier
failure. `auth.uid()` shim self-tested against all three claim shapes (no claim, a real `sub`,
an empty `{}`) before trusting it, per [[reference_psql_set_config_local_does_not_survive_psql_f]].

**One recipe gap found and fixed, worth folding back into that reference note**: the
`authenticated`/`service_role` roles also need `grant usage on schema auth` explicitly — without
it, any statement that calls `auth.uid()` directly (including inside an RLS policy's own
`USING`/`WITH CHECK` clause, once the role genuinely lacks superuser bypass) fails `permission
denied for schema auth`. Not previously hit in this session's other proofs, apparently because
neither of their `proof.sql` scripts filtered by `auth.uid()` inside an application-level `WHERE`
clause the way this proof's `and recipient_id = auth.uid()` does (mirroring how a real Supabase
client call scopes its own request) — worth granting this explicitly in every future proof
regardless, rather than relying on it happening not to be exercised.

**A second self-inflicted bug, caught by running it**: the first draft of this proof had B
reassign `sender_id`/`requester_id` to B's OWN id, which collided with each table's `_no_self`
check constraint (B is already the row's `recipient_id`) and produced a confusing constraint
error instead of a clean vulnerable/guarded result. Fixed by introducing a third, uninvolved
profile (C) as the smuggled-to target — see above.

## Part 1 — messages.body / sender_id

1. A sends B a message: `sender_id = A`, `recipient_id = B`, `body = 'original message from A'`.
2. **Before any guard**, as B (`authenticated`, `request.jwt.claims.sub = B`): one UPDATE —
   `set read_at = now(), body = 'REWRITTEN BY B', sender_id = C where id = <msg> and
   recipient_id = auth.uid()`. **Result: succeeds completely** — `read_at` set, `body`
   rewritten, `sender_id` reassigned to C. The vulnerability, reproduced, not asserted.
3. Reset (as `service_role`). Apply the real guard — `messages_guard_identity_columns()`:
   `if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then new.body :=
   old.body; new.sender_id := old.sender_id; end if;`, `before update of body, sender_id`.
4. As B, **with the guard**: repeat the IDENTICAL combined statement. **Result: `read_at` is
   set (the real mark-read feature works), but `body`/`sender_id` are unchanged** — the guard
   silently held only the two columns it protects, in the same statement that legitimately
   changed a third.
5. **Proving the proof can fail**: dropped the guard, repeated the attack — **succeeds again**
   (`body`/`sender_id` both take the smuggled/reassigned values). Not vacuous.
6. Restored the guard, re-ran the attack once more — **blocked again**, `read_at` still works,
   confirmed clean.

## Part 2 — connections.requester_id

1. A requests a connection to B: `requester_id = A`, `recipient_id = B`, `status = 'pending'`.
2. **Before any guard**, as B: one UPDATE — `set status = 'accepted', responded_at = now(),
   requester_id = C where id = <conn> and recipient_id = auth.uid()`. **Result: succeeds
   completely** — status changes, `requester_id` reassigned to C (the connection would now
   falsely show C, not A, as the one who sent the original request). Reproduced, not asserted.
3. Reset. Apply the real guard — `connections_guard_identity_columns()`, identical mechanism,
   `before update of requester_id`.
4. As B, **with the guard**: repeat the identical combined statement. **Result: `status`/
   `responded_at` update correctly (the real accept/decline feature works), `requester_id`
   stays A** — same shape as Part 1, one statement, one column silently held while the rest of
   the row legitimately changes.
5. **Proving the proof can fail**: dropped the guard, repeated the attack — **succeeds again**
   (`requester_id` takes C). Not vacuous.
6. Restored the guard, re-ran once more — **blocked again**, `status`/`responded_at` still work,
   confirmed clean.

## Result

Both guards proven: vulnerability reproduced pre-guard, blocked post-guard **in the same
statement that legitimately changes an adjacent column**, proof-can-fail confirmed for both,
restored-clean reconfirmed for both. Zero paired code change needed for either (see above — no
admin client involved in either legitimate write, so RLS stays fully in force and there is no
ownership-bypass question the way §1/§2 raised).

## setup.sql

```sql
create schema if not exists auth;

create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end $$;

create table public.profiles (
  id uuid primary key
);

-- messages (migration 0027) -- real schema, real RLS policy text, unmodified
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint messages_no_self check (sender_id <> recipient_id)
);

alter table public.messages enable row level security;

create policy "select own messages" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid());

create policy "recipient marks message read" on public.messages
  for update using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- connections (migration 0023) -- real schema, real RLS policy text, unmodified
create type connection_status as enum ('pending', 'accepted', 'declined');

create table public.connections (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  status connection_status not null default 'pending',
  low_id uuid generated always as (least(requester_id, recipient_id)) stored,
  high_id uuid generated always as (greatest(requester_id, recipient_id)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint connections_no_self check (requester_id <> recipient_id),
  constraint connections_unique_pair unique (low_id, high_id)
);

alter table public.connections enable row level security;

create policy "select own connections" on public.connections
  for select using (requester_id = auth.uid() or recipient_id = auth.uid());

create policy "recipient responds to connection request" on public.connections
  for update using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

grant usage on schema public to authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant all on public.profiles to authenticated, service_role;
grant all on public.messages to authenticated, service_role;
grant all on public.connections to authenticated, service_role;
```

## proof.sql

```sql
\set ON_ERROR_ROLLBACK on

-- A = sender / requester (the victim). B = recipient (the attacker -- the only one with any
-- legitimate UPDATE path at all). C = an uninvolved third profile -- the smuggled-to target,
-- since reassigning to B's OWN id would collide with each table's own *_no_self check (B is
-- already the row's recipient).
insert into public.profiles (id) values
  ('11111111-1111-1111-1111-111111111111'), -- A
  ('22222222-2222-2222-2222-222222222222'), -- B
  ('cccccccc-cccc-cccc-cccc-cccccccccccc');  -- C

-- ===================== PART 1 -- messages.body / sender_id =====================

insert into public.messages (id, sender_id, recipient_id, body) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'original message from A');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

update public.messages
  set read_at = now(), body = 'REWRITTEN BY B', sender_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  b text; s uuid; r timestamptz;
begin
  select body, sender_id, read_at into b, s, r from public.messages where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'REWRITTEN BY B' or s <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' or r is null then
    raise exception 'SETUP CHECK FAILED: expected the pre-guard smuggled rewrite to fully succeed, got body=%, sender_id=%, read_at=%', b, s, r;
  end if;
  raise notice 'CONFIRMED VULNERABLE (pre-guard): B''s own mark-read UPDATE also rewrote body and reassigned sender_id to C.';
end $$;

reset role;

set local role service_role;
update public.messages set body = 'original message from A', sender_id = '11111111-1111-1111-1111-111111111111', read_at = null where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;

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

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

update public.messages
  set read_at = now(), body = 'REWRITTEN BY B', sender_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  b text; s uuid; r timestamptz;
begin
  select body, sender_id, read_at into b, s, r from public.messages where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'original message from A' or s <> '11111111-1111-1111-1111-111111111111' then
    raise exception 'GUARD FAILED: body=%, sender_id=% -- the guard did not reset them.', b, s;
  end if;
  if r is null then
    raise exception 'GUARD OVER-BLOCKED THE REAL FEATURE: read_at was not set -- the legitimate mark-read mutation broke.';
  end if;
  raise notice 'CONFIRMED GUARDED, REAL FEATURE PRESERVED: the SAME statement set read_at (real feature) while body/sender_id silently stayed at A''s original values.';
end $$;

reset role;

drop trigger if exists messages_00_guard_identity_columns on public.messages;

set local role service_role;
update public.messages set read_at = null where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update public.messages
  set read_at = now(), body = 'REWRITTEN BY B AGAIN', sender_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  b text; s uuid;
begin
  select body, sender_id into b, s from public.messages where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'REWRITTEN BY B AGAIN' or s <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' then
    raise exception 'PROOF-CAN-FAIL CHECK ITSELF FAILED: expected the attack to succeed with the trigger removed, got body=%, sender_id=%.', b, s;
  end if;
  raise notice 'CONFIRMED THE PROOF CAN FAIL: with the guard removed, B''s smuggled rewrite succeeds again -- not vacuous.';
end $$;

reset role;

create trigger messages_00_guard_identity_columns
  before update of body, sender_id on public.messages
  for each row execute function public.messages_guard_identity_columns();

set local role service_role;
update public.messages set body = 'original message from A', sender_id = '11111111-1111-1111-1111-111111111111', read_at = null where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update public.messages
  set read_at = now(), body = 'REWRITTEN BY B', sender_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and recipient_id = auth.uid();

do $$
declare
  b text; s uuid; r timestamptz;
begin
  select body, sender_id, read_at into b, s, r from public.messages where id = 'dddddddd-dddd-dddd-dddd-dddddddddddd';
  if b <> 'original message from A' or s <> '11111111-1111-1111-1111-111111111111' or r is null then
    raise exception 'RESTORE CHECK FAILED: body=%, sender_id=%, read_at=%.', b, s, r;
  end if;
  raise notice 'PART 1 COMPLETE, RESTORED CLEAN: guard blocks the identity rewrite again, read_at still updates.';
end $$;

reset role;

-- ===================== PART 2 -- connections.requester_id =====================

insert into public.connections (id, requester_id, recipient_id, status) values
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222',
   'pending');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

update public.connections
  set status = 'accepted', responded_at = now(), requester_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and recipient_id = auth.uid();

do $$
declare
  st connection_status; req uuid; resp timestamptz;
begin
  select status, requester_id, responded_at into st, req, resp from public.connections where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  if st <> 'accepted' or req <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' or resp is null then
    raise exception 'SETUP CHECK FAILED: expected the pre-guard smuggled reassignment to fully succeed, got status=%, requester_id=%, responded_at=%', st, req, resp;
  end if;
  raise notice 'CONFIRMED VULNERABLE (pre-guard): B''s own accept/decline UPDATE also reassigned requester_id to C.';
end $$;

reset role;

set local role service_role;
update public.connections set status = 'pending', requester_id = '11111111-1111-1111-1111-111111111111', responded_at = null where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
reset role;

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

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);

update public.connections
  set status = 'accepted', responded_at = now(), requester_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and recipient_id = auth.uid();

do $$
declare
  st connection_status; req uuid; resp timestamptz;
begin
  select status, requester_id, responded_at into st, req, resp from public.connections where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  if req <> '11111111-1111-1111-1111-111111111111' then
    raise exception 'GUARD FAILED: requester_id=% -- the guard did not reset it.', req;
  end if;
  if st <> 'accepted' or resp is null then
    raise exception 'GUARD OVER-BLOCKED THE REAL FEATURE: status=%, responded_at=% -- the legitimate accept/decline mutation broke.', st, resp;
  end if;
  raise notice 'CONFIRMED GUARDED, REAL FEATURE PRESERVED: the SAME statement accepted the request (real feature) while requester_id silently stayed at A''s id.';
end $$;

reset role;

drop trigger if exists connections_00_guard_identity_columns on public.connections;

set local role service_role;
update public.connections set status = 'pending', responded_at = null where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update public.connections
  set status = 'accepted', responded_at = now(), requester_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and recipient_id = auth.uid();

do $$
declare
  req uuid;
begin
  select requester_id into req from public.connections where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  if req <> 'cccccccc-cccc-cccc-cccc-cccccccccccc' then
    raise exception 'PROOF-CAN-FAIL CHECK ITSELF FAILED: expected the attack to succeed with the trigger removed, got requester_id=%.', req;
  end if;
  raise notice 'CONFIRMED THE PROOF CAN FAIL: with the guard removed, B''s reassignment succeeds again -- not vacuous.';
end $$;

reset role;

create trigger connections_00_guard_identity_columns
  before update of requester_id on public.connections
  for each row execute function public.connections_guard_identity_columns();

set local role service_role;
update public.connections set status = 'pending', requester_id = '11111111-1111-1111-1111-111111111111', responded_at = null where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222"}', true);
update public.connections
  set status = 'accepted', responded_at = now(), requester_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
  where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee' and recipient_id = auth.uid();

do $$
declare
  st connection_status; req uuid; resp timestamptz;
begin
  select status, requester_id, responded_at into st, req, resp from public.connections where id = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee';
  if req <> '11111111-1111-1111-1111-111111111111' or st <> 'accepted' or resp is null then
    raise exception 'RESTORE CHECK FAILED: status=%, requester_id=%, responded_at=%.', st, req, resp;
  end if;
  raise notice 'PART 2 COMPLETE, RESTORED CLEAN: guard blocks the requester_id reassignment again, accept/decline still works.';
end $$;

reset role;
```
