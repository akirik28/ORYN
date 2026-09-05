# Proving RLS blocks a cross-user conversation delete — 2026-09-05

CEO's own non-negotiable requirement for the advisor session-delete button: "RLS altında
kullanıcının sadece kendi konuşmasını silebildiğini kanıtla — bu testi mutlaka yaz, çünkü
silme yetkisi sızarsa zarar geri alınamaz" (prove, under RLS, that a user can only delete
their own conversation — this test must be written, because if delete authorization leaks,
the damage is irreversible).

`__tests__/advisor/delete-conversation.test.ts` already proves the *application query*
correctly scopes by `user_id` (a real row-filtering mock, not a call-spy — see that file's
own header). That proves the app's own defense-in-depth filter. It cannot prove what
happens if that filter were ever missing or bypassed and the request reached Postgres
directly — that question can only be answered by a real Postgres engine actually
evaluating the real RLS policy. This is that proof.

## Method

A scratch local Postgres 17 cluster (Homebrew, `initdb`/`pg_ctl`, torn down after — nothing
here touches the real Supabase project), with a minimal but byte-for-byte faithful
reproduction of the real schema:

- `public.advisor_conversations` and `public.advisor_messages`, exact column shapes from
  migration `0011_advisor.sql` plus `0046_advisor_message_failure_state.sql`'s later
  `status`/`error_message`/nullable-`content` changes.
- The real, unmodified policy text from `0014_row_level_security.sql`: `create policy
  "owner full access" on public.%I for all using (user_id = auth.uid()) with check
  (user_id = auth.uid());` — applied to both tables, exactly as it runs in production
  (both are in that migration's own `owner_tables` array).
- The real FK: `advisor_messages.conversation_id references advisor_conversations(id) on
  delete cascade`.
- A corrected `auth.uid()` shim reading `request.jwt.claims` (self-tested against all three
  real shapes first — no claim, an empty `{}` claim, a real `{"sub":...}` claim — before
  trusting it for anything below).

Two students, A and B, both real rows in the minimal `profiles` stub. The proof runs as one
transaction (`psql -1`) so the `SET LOCAL role` / `set_config(..., true)` impersonation
survives across statements — under a plain `psql -f`, each statement auto-commits
separately and the impersonation is silently lost after the first one, which would make
every later block run as the same identity and every assertion pass for the wrong reason.

## The proof

1. As A: create a conversation and a message in it. Confirmed readable back.
2. As B: `delete from advisor_conversations where id = <A's conversation>` — the exact
   statement shape the application issues, filtered by `id` alone, no `user_id` added at
   this layer on purpose. This is deliberately testing RLS **alone**, not the
   application's own additional filter (already covered by the mocked test).
3. Result: **`DELETE 0`.** RLS made the row invisible to B; nothing was removed.
4. Back as A: confirmed both the conversation and its message genuinely still exist —
   not just that B's own view showed nothing, but that A's data is actually intact.
5. As A: delete the same conversation, their own. Result: **`DELETE 1`.**
6. Confirmed the message row is also gone — the real `on delete cascade` firing, not a
   soft mark. This is also the direct answer to CEO's other question here: a deleted
   conversation's messages are genuinely, permanently removed by Postgres itself, which is
   exactly why the client-side confirmation dialog exists — there is no undo.

All assertions passed. Full transcript, `proof.sql`, and `setup.sql` below for
reproducibility.

## Proving the proof itself can fail

Same discipline as every other red-proof this session: a check that always passes is
worse than no check. Dropped the real policy, replaced it with a deliberately permissive
one (`using (true) with check (true)`), and reran the identical script:

```
DELETE 1
ERROR:  RLS FAILED: A's conversation is gone after B's unauthorized delete attempt --
        data was destroyed cross-user.
```

B's delete succeeded (`DELETE 1`) and the assertion caught it immediately, by name.
Restored the real policy, reran, confirmed clean (`ALL ASSERTIONS PASSED`, no errors)
before treating any of this as settled.

## setup.sql

```sql
create schema if not exists auth;

create or replace function auth.uid() returns uuid language sql stable as $$
  select (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')::uuid
$$;

create table public.profiles (
  id uuid primary key
);

create table public.advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create type message_role as enum ('user', 'assistant');

create table public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.advisor_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role message_role not null,
  content text,
  created_at timestamptz not null default now(),
  status text not null default 'complete' check (status in ('complete', 'failed')),
  error_message text
);

alter table public.advisor_conversations enable row level security;
create policy "owner full access" on public.advisor_conversations for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table public.advisor_messages enable row level security;
create policy "owner full access" on public.advisor_messages for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

## proof.sql

```sql
\set ON_ERROR_ROLLBACK on

insert into public.profiles (id) values
  ('11111111-1111-1111-1111-111111111111'), -- student A
  ('99999999-9999-9999-9999-999999999999'); -- student B

-- ===== Student A creates a conversation and a message in it =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

insert into public.advisor_conversations (id, user_id, title) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'A''s real session');
insert into public.advisor_messages (id, conversation_id, user_id, role, content) values
  ('33333333-3333-3333-3333-333333333333', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'user', 'A''s question');

do $$
begin
  if (select count(*) from public.advisor_conversations where id = '22222222-2222-2222-2222-222222222222') <> 1 then
    raise exception 'SETUP FAILED: A could not even read back their own just-created conversation';
  end if;
end $$;

-- ===== THE MANDATORY CASE: Student B attempts to delete A's conversation =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"99999999-9999-9999-9999-999999999999"}', true);

delete from public.advisor_conversations where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  still_there int;
begin
  select count(*) into still_there from public.advisor_conversations where id = '22222222-2222-2222-2222-222222222222';
  if still_there <> 0 then
    raise exception 'B''s DELETE was scoped by id alone (no application filter), and RLS did not block it -- this row is A''s and must still exist. RLS FAILED.';
  end if;
end $$;

reset role;

-- ===== Confirm, back as A, that A's conversation AND message genuinely survived =====
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

do $$
declare
  conv_count int;
  msg_count int;
begin
  select count(*) into conv_count from public.advisor_conversations where id = '22222222-2222-2222-2222-222222222222';
  select count(*) into msg_count from public.advisor_messages where conversation_id = '22222222-2222-2222-2222-222222222222';
  if conv_count <> 1 then
    raise exception 'RLS FAILED: A''s conversation is gone after B''s unauthorized delete attempt -- data was destroyed cross-user.';
  end if;
  if msg_count <> 1 then
    raise exception 'RLS FAILED: A''s message is gone after B''s unauthorized delete attempt on the conversation.';
  end if;
  raise notice 'CONFIRMED: A''s conversation and message both survived B''s cross-user delete attempt.';
end $$;

-- ===== Student A deletes their OWN conversation — must succeed, and cascade =====
delete from public.advisor_conversations where id = '22222222-2222-2222-2222-222222222222';

do $$
declare
  conv_count int;
  msg_count int;
begin
  select count(*) into conv_count from public.advisor_conversations where id = '22222222-2222-2222-2222-222222222222';
  select count(*) into msg_count from public.advisor_messages where id = '33333333-3333-3333-3333-333333333333';
  if conv_count <> 0 then
    raise exception 'A''s own delete of their own conversation did not take effect.';
  end if;
  if msg_count <> 0 then
    raise exception 'CASCADE FAILED: A''s conversation was deleted but its message row still exists -- migration 0011''s on delete cascade did not fire.';
  end if;
  raise notice 'CONFIRMED: A''s own delete succeeded and cascaded to the message row, exactly as migration 0011''s FK specifies.';
end $$;

reset role;
select 'ALL ASSERTIONS PASSED' as result;
```

**How to read a re-run**: look for any `ERROR: RLS FAILED` / `ERROR: CASCADE FAILED` line
in the output, not only the final `ALL ASSERTIONS PASSED` row — `ON_ERROR_ROLLBACK`
deliberately lets later, independent assertions keep running after an earlier one throws
(the same reasoning `docs/`'s other manual RLS scripts already document: a real `WITH
CHECK` violation raises rather than silently no-opping, so without this flag one failure
would hide every assertion after it), so the summary line can still print even when one
assertion earlier in the script failed.
