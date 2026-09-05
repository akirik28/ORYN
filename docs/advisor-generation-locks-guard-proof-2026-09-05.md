# Proving the advisor_generation_locks guard — 2026-09-05

Closes §8 of `docs/permissive-update-policy-sweep-2026-09-04.md` — the last of the sweep's
findings, held to a higher bar than §1-§7 per CEO's explicit instruction: proving the guard
blocks the bypass is not enough here; proving the legitimate acquire/release feature still works
in full has to be proven too, since over-protecting a concurrency lock can break the very thing
it exists to provide.

## Why the guard-trigger mechanism used for §1-§7 cannot work here

Read migration `0110_advisor_generation_lock.sql` and `lib/advisor/generation-lock.ts` in full
before designing anything — the original sweep doc's own §11 flagged this table but explicitly
said it hadn't read the two RPC functions' actual bodies. Reading them settles the open
questions and changes the fix shape entirely:

**The sweep doc guessed the functions were "almost certainly SECURITY DEFINER." They are the
opposite — SECURITY INVOKER, explicitly, with a comment stating why**: `auth.uid()` must resolve
to the calling session's own claim, never an elevated identity. This single fact is why the
§1-§7 mechanism cannot apply: every prior guard trigger keys off `current_user <> 'service_role'`
to distinguish the app's own privileged write path from a direct user attack. Here, **the
legitimate path (through the RPC) and a direct bypass run as the exact same role** —
`authenticated`, invoker semantics — because the function was deliberately written to never
elevate privilege. A `BEFORE UPDATE`/`BEFORE DELETE` trigger fires identically regardless of
whether the triggering statement originated inside the RPC or from a raw client call, since both
execute with identical privileges and identical `current_user`. There is no signal a trigger
could key off. This isn't a minor variation on the established pattern — it is a table where
that pattern is structurally inapplicable, confirmed by reading the actual function definitions,
not assumed from how similar the finding sounded to the others.

## What the bypass actually lets a user do, made concrete (the sweep doc's own hedge resolved)

The table carries a plain owner-`ALL` RLS policy (`user_id = auth.uid()`), so this was never a
cross-user exposure — a user can only ever touch their own lock row, confirmed and not disputed.
The real risk is a user defeating their own concurrency guarantee: `acquire`'s entire purpose is
a single atomic `INSERT ... ON CONFLICT (user_id) DO UPDATE ... WHERE <stale>` specifically so
two racing requests can't both observe "no lock held" — but RLS's owner-`ALL` grant means a
direct `DELETE` (no `started_at` match required, unlike `release`) followed by a direct `INSERT`
bypasses that atomicity entirely: reproduced concretely in the proof below, a user acquires a
lock, a second RPC-mediated acquire is correctly rejected (the mutex working as intended), and
then a direct delete+insert — going around the RPC pair, not through it — freely re-establishes
a second, fully fresh lock, letting two advisor generations run concurrently against the same
quota. This is a self-serve rate-limit/cost-control bypass (Phase 27's AI cost control, and the
product's own explicit "one concurrent generation" rule per `docs/ozellesme-spec-2026-09-03.md`),
not a privacy or cross-user integrity issue.

## The fix: GRANT-level, not trigger-level

Since there is no role distinction between the legitimate and illegitimate path, the fix has to
remove the illegitimate path's *ability* to write at all, at the privilege layer:

1. `REVOKE INSERT, UPDATE, DELETE ON public.advisor_generation_locks FROM authenticated` —
   narrows the table-level grant Supabase's platform bootstrap provides by default (this repo's
   own migrations never grant it directly; the bootstrap does, outside any migration file here).
   `SELECT` is left untouched deliberately — RLS already scopes it to the owner's own row, no
   part of this finding concerns reading, and revoking it isn't needed to close the actual gap.
2. Both RPC functions switch from `SECURITY INVOKER` to `SECURITY DEFINER`, with
   `SET search_path = ''` added now that they run elevated (this codebase's own established
   defense-in-depth convention for every security-sensitive function; both function bodies
   already fully schema-qualify every table reference, so pinning search_path changes nothing
   about their behavior). `auth.uid()` is unaffected by the invoker/definer distinction — it
   reads `request.jwt.claims`, a session-level GUC set by the connection itself before the query
   ever runs, independent of the function's execution role; confirmed in the proof, not assumed.

With the table-level grant revoked, `authenticated` has no path to write this table AT ALL
except through the two functions, which retain their exact original logic (identical `ON
CONFLICT ... WHERE`, identical `DELETE ... WHERE user_id AND started_at` match) — only their
security context changes.

## Two real bugs in the proof script itself, caught by running it, not by re-reading it

**A vacuous assertion, from `\gset` not surviving into a `do $$ $$` block.** The first draft
captured RPC return values via psql's `\gset` (`select fn() as t1 \gset`) and referenced `:t1`
inside `raise notice`/comparison strings within `do $$ ... end $$` blocks. This silently never
interpolated — every such check compared literally against the unsubstituted text `:t1`, meaning
every one of these assertions passed regardless of the real underlying value, including a case
where the real value WAS wrong and the check still reported success. Caught by actually reading
the NOTICE output text (it printed `t1 = :t1` verbatim, the tell), not by assuming a completed
script was a correct one — same family as
[[feedback_a_broken_verifier_and_a_clean_result_look_identical]], a fourth instance of that
pattern on this exact night, now inside my own harness rather than someone else's fix. Rebuilt
on real PL/pgSQL variables (`v := public.acquire_advisor_generation_lock();` then `IS NULL`
checks) and a scratch table for cross-statement value passing — the same reliable technique
used successfully all night for every other proof, which this draft should have reached for
first instead of introducing a new, untested mechanism.

**Fixing that first bug then surfaced a second, real one**: the scratch table itself
(`proof_scratch`) had never been granted to `authenticated`, so writing to it from inside the
same `do $$ $$` block as an RPC call failed with `permission denied` — and because
`ON_ERROR_ROLLBACK` rolls the whole failing block back to its savepoint, **the RPC call's own
real side effect (the lock actually being acquired) was silently undone along with the
harness's unrelated scratch-table write**, making the next step look like a fresh acquire
(no prior lock existed) rather than a correctly-rejected second one. Fixed by granting the
scratch table to `authenticated`/`service_role` immediately after creating it, before any role
switch — and worth naming as a general risk: **a harness-only side effect and the real effect
under test, once they share a savepoint, fail or succeed together** — an unrelated permission
gap in the test's own bookkeeping can quietly erase the very effect the test means to observe.

**A third issue, not a bug but a real constraint of the technique itself, worth documenting for
next time**: `now()` is transaction-start time, not wall-clock time, and the whole proof runs as
one `psql -1` transaction (required so `SET LOCAL ROLE` persists across statements) — so two
values captured from separate `now()`-based acquire calls anywhere in the same script are
always identical, never "later." Comparing them for a stale-vs-fresh distinction is meaningless
regardless of how much real time the proof script takes to run. Sidestepped by backdating the
simulated-stale row to a fixed, unambiguous 2020 literal (never equal to a real 2026 acquire
regardless of `now()`'s behavior) and constructing the "must not match" release timestamp as
the reclaimed value offset by one second via simple arithmetic, rather than by trying to capture
two independently "fresh" values that the transaction model guarantees can never differ.

**A fourth, in reverting/restoring the fix for Parts 5-6**: `service_role`, in this scratch
cluster as in the real project, does not own `advisor_generation_locks` and has no `GRANT
OPTION` on it — so a `GRANT`/`REVOKE` attempted while `SET LOCAL ROLE service_role` silently
no-ops with a `WARNING`, not an error, and the very next assertion caught the fix not actually
being reverted (then, after the same fix, not actually being restored). Both administrative
grant/revoke statements now run as the connecting (table-owning) role directly, matching how the
real REVOKE/GRANT in the actual migration will run as whatever role applies migrations, never as
`service_role` at request time.

## Method and full result

Real local Postgres 17, real `authenticated`/`service_role` roles, the real unmodified RLS
policy and both function bodies from migration 0110. CEO's explicit dual bar for this finding —
not just "the bypass is blocked" but "the legitimate cycle, acquire → generate → release →
acquire again, still runs end to end" — held to directly, not just argued to be implicitly
covered by the other assertions. Fourteen assertions, all passing clean on the final run, zero
errors or warnings:

1. Baseline: a fresh acquire (invoker, pre-fix) succeeds.
2. Baseline: a second, still-fresh acquire attempt via the RPC is correctly rejected (NULL) —
   confirms the mutex's own logic is correct before any bypass is attempted.
3. **The vulnerability, reproduced**: a direct DELETE + direct INSERT, entirely bypassing both
   RPC functions, freely re-establishes a fresh lock despite the rejection just confirmed in
   step 2 — the exact guarantee defeated.
4. Fix applied (revoke + security definer).
5-7. Direct INSERT/UPDATE/DELETE by `authenticated` now each fail with `permission denied`.
8. Fresh acquire via the RPC still succeeds under `security definer`.
9. A second, still-fresh acquire is still correctly rejected — the real mutex property, not
   just "the function runs without error."
10. A lock backdated to 2020 (simulating staleness — indistinguishable, from the database's own
    point of view, from a genuinely dropped connection that never called release: both produce
    an old, unreleased row, and the reclaim mechanism cannot tell the two apart, nor does it need
    to) is still correctly reclaimed by the RPC.
11. Releasing with a non-matching `started_at` correctly leaves the current lock untouched.
12. Releasing with the matching `started_at` correctly deletes it.
13. **The explicit acquire → release → acquire-again cycle, as its own tight sequence**: right
    after a normal release, an immediate re-acquire succeeds cleanly — nothing left behind that
    would block the very next legitimate request.
14. **Proof-can-fail**: reverted to invoker + re-granted direct access — the bypass succeeds
    again. Restored — bypass blocked again, legitimate acquire still works.

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

-- advisor_generation_locks (migration 0110) -- real schema, real RLS policy, real function
-- bodies, unmodified -- ORIGINAL security invoker versions, to first prove the bypass is real
-- before applying the fix.
create table public.advisor_generation_locks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.advisor_generation_locks enable row level security;
create policy "owner full access" on public.advisor_generation_locks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.acquire_advisor_generation_lock(p_stale_after_seconds integer default 120)
returns timestamptz
language sql
security invoker
as $$
  insert into public.advisor_generation_locks (user_id, started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set started_at = excluded.started_at
    where public.advisor_generation_locks.started_at < now() - (p_stale_after_seconds || ' seconds')::interval
  returning started_at;
$$;

create or replace function public.release_advisor_generation_lock(p_started_at timestamptz)
returns void
language sql
security invoker
as $$
  delete from public.advisor_generation_locks
  where user_id = auth.uid() and started_at = p_started_at;
$$;

grant usage on schema public to authenticated, service_role;
grant usage on schema auth to authenticated, service_role;
grant all on public.profiles to authenticated, service_role;
-- Mirrors Supabase's own platform-bootstrap grant (outside any migration file in the real repo)
-- -- authenticated gets full table privileges by default; this is the starting, vulnerable state.
grant all on public.advisor_generation_locks to authenticated, service_role;
grant execute on function public.acquire_advisor_generation_lock(integer) to authenticated, service_role;
grant execute on function public.release_advisor_generation_lock(timestamptz) to authenticated, service_role;
```

## proof.sql

```sql
\set ON_ERROR_ROLLBACK on

create temporary table proof_scratch (key text primary key, val timestamptz);
grant all on proof_scratch to authenticated, service_role;

insert into public.profiles (id) values ('11111111-1111-1111-1111-111111111111'); -- A

-- ===================== PART 1 -- confirm the bypass is real =====================

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is null then
    raise exception 'SETUP CHECK FAILED: expected the first acquire to succeed with a real timestamp, got NULL';
  end if;
  insert into proof_scratch (key, val) values ('t1', v) on conflict (key) do update set val = excluded.val;
  raise notice 'Baseline acquire succeeded: t1 = %', v;
end $$;

do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is not null then
    raise exception 'SETUP CHECK FAILED: expected the second, still-fresh acquire to be rejected (NULL), got %', v;
  end if;
  raise notice 'CONFIRMED BASELINE CORRECT: a second concurrent acquire attempt via the RPC is properly rejected while the first lock is fresh.';
end $$;

delete from public.advisor_generation_locks where user_id = auth.uid();
insert into public.advisor_generation_locks (user_id, started_at) values (auth.uid(), now());

do $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.advisor_generation_locks where user_id = '11111111-1111-1111-1111-111111111111';
  if cnt <> 1 then
    raise exception 'SETUP CHECK FAILED: expected exactly one row after the direct delete+insert bypass, got %', cnt;
  end if;
  raise notice 'CONFIRMED VULNERABLE (pre-fix): a direct DELETE+INSERT, entirely bypassing both RPC functions, freely re-establishes a fresh lock -- the mutex the RPC pair exists to provide is defeated.';
end $$;

reset role;

set local role service_role;
delete from public.advisor_generation_locks;
reset role;

-- ===================== PART 2 -- apply the fix =====================

revoke insert, update, delete on public.advisor_generation_locks from authenticated;

create or replace function public.acquire_advisor_generation_lock(p_stale_after_seconds integer default 120)
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  insert into public.advisor_generation_locks (user_id, started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set started_at = excluded.started_at
    where public.advisor_generation_locks.started_at < now() - (p_stale_after_seconds || ' seconds')::interval
  returning started_at;
$$;

create or replace function public.release_advisor_generation_lock(p_started_at timestamptz)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.advisor_generation_locks
  where user_id = auth.uid() and started_at = p_started_at;
$$;

-- ===================== PART 3 -- confirm the bypass is now blocked =====================

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

do $$
begin
  begin
    insert into public.advisor_generation_locks (user_id, started_at) values (auth.uid(), now());
    raise exception 'GUARD FAILED: direct INSERT succeeded -- should have been permission denied.';
  exception when insufficient_privilege then
    raise notice 'CONFIRMED BLOCKED: direct INSERT now fails with permission denied.';
  end;
end $$;

do $$
begin
  begin
    update public.advisor_generation_locks set started_at = now() where user_id = auth.uid();
    raise exception 'GUARD FAILED: direct UPDATE succeeded -- should have been permission denied.';
  exception when insufficient_privilege then
    raise notice 'CONFIRMED BLOCKED: direct UPDATE now fails with permission denied.';
  end;
end $$;

do $$
begin
  begin
    delete from public.advisor_generation_locks where user_id = auth.uid();
    raise exception 'GUARD FAILED: direct DELETE succeeded -- should have been permission denied.';
  exception when insufficient_privilege then
    raise notice 'CONFIRMED BLOCKED: direct DELETE now fails with permission denied.';
  end;
end $$;

reset role;

-- ===================== PART 4 -- confirm the legitimate feature still fully works =====================

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is null then
    raise exception 'FEATURE BROKEN: fresh acquire via the RPC returned NULL after the fix.';
  end if;
  insert into proof_scratch (key, val) values ('t2', v) on conflict (key) do update set val = excluded.val;
  raise notice 'CONFIRMED FEATURE WORKS: fresh acquire via the RPC still returns a real timestamp under security definer (t2 = %).', v;
end $$;

do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is not null then
    raise exception 'MUTEX BROKEN: second concurrent acquire was not rejected, got %', v;
  end if;
  raise notice 'CONFIRMED MUTEX STILL WORKS: a second concurrent acquire is still correctly rejected.';
end $$;

reset role;

-- Backdated to a FIXED distant-past literal, not a now()-relative expression: now() is frozen
-- at this transaction's start for its entire duration, so comparing two now()-derived values
-- captured earlier and later in the SAME script can never show a difference. A literal from
-- 2020 sidesteps it entirely.
set local role service_role;
update public.advisor_generation_locks set started_at = '2020-01-01T00:00:00+00' where user_id = '11111111-1111-1111-1111-111111111111';
reset role;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is null then
    raise exception 'FEATURE BROKEN: reclaiming a stale lock returned NULL after the fix.';
  end if;
  if v = '2020-01-01T00:00:00+00'::timestamptz then
    raise exception 'FEATURE BROKEN: reclaim did not actually advance started_at off the stale value.';
  end if;
  insert into proof_scratch (key, val) values ('t3', v) on conflict (key) do update set val = excluded.val;
  raise notice 'CONFIRMED FEATURE WORKS: a stale (2020) lock is still correctly reclaimed (t3 = %, no longer the stale value).', v;
end $$;

-- Constructed as t3 offset by one second -- guaranteed not to match t3 exactly by simple
-- arithmetic, without needing a second, genuinely later real acquire.
do $$
declare
  t3 timestamptz;
  cnt integer;
begin
  select val into t3 from proof_scratch where key = 't3';
  perform public.release_advisor_generation_lock(t3 - interval '1 second');
  select count(*) into cnt from public.advisor_generation_locks where user_id = '11111111-1111-1111-1111-111111111111' and started_at = t3;
  if cnt <> 1 then
    raise exception 'FEATURE BROKEN: a release with a non-matching started_at deleted the current lock.';
  end if;
  raise notice 'CONFIRMED FEATURE WORKS: releasing with a non-matching started_at correctly leaves the current lock untouched.';
end $$;

do $$
declare
  t3 timestamptz;
  cnt integer;
begin
  select val into t3 from proof_scratch where key = 't3';
  perform public.release_advisor_generation_lock(t3);
  select count(*) into cnt from public.advisor_generation_locks where user_id = '11111111-1111-1111-1111-111111111111';
  if cnt <> 0 then
    raise exception 'FEATURE BROKEN: releasing with the correct started_at did not delete the row.';
  end if;
  raise notice 'CONFIRMED FEATURE WORKS: releasing with the matching started_at correctly deletes the lock.';
end $$;

-- The tight, explicit cycle CEO asked for by name: acquire -> release -> immediately acquire
-- again must succeed cleanly, proving a normal release leaves nothing behind that would block
-- the very next legitimate request.
do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is null then
    raise exception 'FEATURE BROKEN: re-acquiring immediately after a clean release returned NULL.';
  end if;
  perform public.release_advisor_generation_lock(v);
  raise notice 'CONFIRMED FULL CYCLE WORKS: acquire -> release -> acquire again succeeds cleanly, nothing left behind after a normal release.';
end $$;

reset role;

-- ===================== PART 5 -- proving the proof can fail =====================

-- Run as the connecting (table-owning) role, not service_role -- service_role has no GRANT
-- OPTION on this table (it isn't the owner), same as in the real project where GRANT/REVOKE
-- runs as whatever role applies migrations, never as service_role at request time.
grant insert, update, delete on public.advisor_generation_locks to authenticated;

create or replace function public.acquire_advisor_generation_lock(p_stale_after_seconds integer default 120)
returns timestamptz
language sql
security invoker
as $$
  insert into public.advisor_generation_locks (user_id, started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set started_at = excluded.started_at
    where public.advisor_generation_locks.started_at < now() - (p_stale_after_seconds || ' seconds')::interval
  returning started_at;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

delete from public.advisor_generation_locks where user_id = auth.uid();
insert into public.advisor_generation_locks (user_id, started_at) values (auth.uid(), now());

do $$
declare
  cnt integer;
begin
  select count(*) into cnt from public.advisor_generation_locks where user_id = '11111111-1111-1111-1111-111111111111';
  if cnt <> 1 then
    raise exception 'PROOF-CAN-FAIL CHECK ITSELF FAILED: expected the reverted (invoker + re-granted) bypass to succeed.';
  end if;
  raise notice 'CONFIRMED THE PROOF CAN FAIL: reverting to security invoker + re-granting direct access lets the bypass succeed again -- not vacuous.';
end $$;

reset role;

-- ===================== PART 6 -- restore the fix, reconfirm clean =====================

set local role service_role;
delete from public.advisor_generation_locks;
reset role;

-- Run as the connecting (table-owning) role, same reasoning as Part 5's grant -- service_role
-- has no privilege to revoke here either (REVOKE by a non-owning role without grant option
-- silently no-ops with a WARNING, not an error).
revoke insert, update, delete on public.advisor_generation_locks from authenticated;

create or replace function public.acquire_advisor_generation_lock(p_stale_after_seconds integer default 120)
returns timestamptz
language sql
security definer
set search_path = ''
as $$
  insert into public.advisor_generation_locks (user_id, started_at)
  values (auth.uid(), now())
  on conflict (user_id) do update
    set started_at = excluded.started_at
    where public.advisor_generation_locks.started_at < now() - (p_stale_after_seconds || ' seconds')::interval
  returning started_at;
$$;

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111"}', true);

do $$
begin
  begin
    delete from public.advisor_generation_locks where user_id = auth.uid();
    raise exception 'RESTORE CHECK FAILED: direct DELETE succeeded after restoring the fix.';
  exception when insufficient_privilege then
    raise notice 'CONFIRMED RESTORED CLEAN: direct DELETE blocked again.';
  end;
end $$;

do $$
declare
  v timestamptz;
begin
  v := public.acquire_advisor_generation_lock();
  if v is null then
    raise exception 'RESTORE CHECK FAILED: the legitimate RPC acquire does not work after restoring the fix.';
  end if;
  raise notice 'COMPLETE, RESTORED CLEAN: bypass blocked, legitimate acquire still works (t_final = %).', v;
end $$;

reset role;
```
