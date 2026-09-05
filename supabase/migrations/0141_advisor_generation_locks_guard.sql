-- Migration number 0141, assigned by CEO (2026-09-05) after checking every remote branch
-- (0140/0141/0142 all free at assignment time). 0140 is the same sweep's §4
-- (recommendations); this closes §8, the sweep's last finding.
--
-- docs/permissive-update-policy-sweep-2026-09-04.md §8 (also its own §11): full owner CRUD on
-- advisor_generation_locks (migration 0110's owner-`ALL` policy, no column or command
-- restriction) lets a user bypass the acquire/release RPC pair entirely and directly
-- INSERT/UPDATE/DELETE their own lock row, defeating the atomicity acquire_advisor_generation_
-- lock()'s single `INSERT ... ON CONFLICT ... WHERE <stale>` statement exists to guarantee. Not
-- a cross-user exposure (RLS's owner scoping is real and untouched, confirmed by the app's own
-- code doing nothing but .rpc() calls into this table -- no direct write path anywhere) -- a
-- self-serve concurrency/cost-control bypass: a direct DELETE (no started_at match required,
-- unlike the real release function) followed by a direct INSERT re-establishes a fresh lock
-- even while a real one is still held, letting a user run two advisor generations concurrently
-- against their own quota, defeating docs/ozellesme-spec-2026-09-03.md's explicit "one
-- concurrent generation" rule.
--
-- WHY THE GUARD-TRIGGER MECHANISM USED FOR EVERY OTHER FINDING IN THIS SWEEP DOES NOT APPLY
-- HERE, confirmed by reading both function bodies (the original sweep pass explicitly hadn't):
-- both acquire_advisor_generation_lock/release_advisor_generation_lock are SECURITY INVOKER,
-- not SECURITY DEFINER as that pass guessed -- meaning the legitimate RPC path and a direct
-- bypass run as the IDENTICAL role (authenticated), with no current_user distinction a trigger
-- could key off. This is a GRANT-level fix, not a trigger:
--
-- 1. REVOKE INSERT, UPDATE, DELETE on this table from authenticated -- narrows the table grant
--    Supabase's platform bootstrap provides by default (no migration in this repo grants it
--    directly). SELECT is left untouched -- RLS already scopes it to the owner's own row, and
--    this finding is about mutation, not reading.
-- 2. Both functions switch from SECURITY INVOKER to SECURITY DEFINER, with search_path pinned
--    empty (this codebase's own established convention for every security-sensitive function,
--    now that these actually run elevated) -- their bodies are otherwise byte-for-byte
--    unchanged, since only the security context needs to change, not the logic. auth.uid() is
--    unaffected by invoker/definer -- it reads a session-level GUC set by the connection before
--    the query runs, independent of the function's execution role; confirmed in the proof, not
--    assumed.
--
-- With the table-level grant revoked, authenticated has no path to write this table AT ALL
-- except through these two functions.
--
-- THE DANGER RUNS THE OTHER WAY TOO, and the proof is held to it explicitly: over-protecting a
-- concurrency lock can break acquire/release itself, leaving the advisor unable to respond or a
-- student permanently locked out. Not just "the bypass is blocked" -- the full legitimate cycle
-- (acquire -> generate -> release -> acquire again) is proven end to end, including that a lock
-- simulating a dropped/crashed request (indistinguishable, to the database, from an ordinary
-- stale lock -- both are simply an old, unreleased row) is still correctly reclaimed rather than
-- wedging the student out.
--
-- PROOF: docs/advisor-generation-locks-guard-proof-2026-09-05.md -- real local Postgres 17.
-- Fourteen assertions: the bypass reproduced (a direct delete+insert defeats a rejection the
-- RPC itself just correctly enforced a moment earlier); direct INSERT/UPDATE/DELETE each now
-- fail with permission denied; a fresh acquire still succeeds under security definer; a second
-- concurrent acquire is still correctly rejected (the actual mutex property, not just "runs
-- without error"); a stale lock is still correctly reclaimed; releasing with a non-matching
-- started_at still correctly leaves the current lock untouched; releasing with the matching one
-- still correctly deletes it; the explicit acquire-release-acquire-again cycle succeeds
-- cleanly; and the check proven capable of failing (reverted, bypass succeeds again; restored,
-- blocked again).

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

-- STATUS: WRITTEN BUT NOT APPLIED. Prepared for CEO/founder to apply. Do not run against the
-- live project from here.
