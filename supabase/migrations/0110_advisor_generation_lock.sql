-- Enforces docs/ozellesme-spec-2026-09-03.md §"Ne satın alınıyor" / "Eşzamanlı üretim ikisinde
-- de bir tane": at most one advisor reply may be generating for a given student at any moment,
-- Standard and Ultra alike -- Ultra buys more conversations (piece 1, oryn-11), never more
-- parallel generation. Written, not applied -- house pattern (0076, 0086, 0088, 0106, 0107,
-- 0108); lib/advisor/generation-lock.ts degrades to fail-open (never blocks a reply) via
-- isUndefinedTableError until this lands, matching every other unapplied-migration path in
-- this codebase.
--
-- One row per user, present only while a generation is actually in flight -- not a boolean
-- column on `profiles`, because the interesting content is *when it started*, not just *that
-- it's running*: `started_at` is what lets a crashed or timed-out request's lock be reclaimed
-- rather than permanently wedging that student's advisor (the same "never permanently blocking"
-- posture lib/advisor/upgrade-prompt.ts's own header states for a different mechanism). A
-- dedicated table rather than another nullable column on the already-crowded `profiles` follows
-- this codebase's own normalization discipline (advisor_conversations/advisor_messages are
-- already separate tables for the same reason) and keeps the lock's lifecycle -- insert on
-- acquire, delete on release -- independent of every other profile write.
--
-- Both operations are Postgres functions, not application-code read-then-write, because the
-- one property this mechanism exists to guarantee is atomicity: two requests racing (a double-
-- click, two tabs) must not both observe "no lock held". `acquire_advisor_generation_lock`'s
-- `insert ... on conflict (user_id) do update ... where <stale>` is a single statement --
-- Postgres either inserts a fresh row, replaces a stale one, or (the ordinary contested case)
-- turns the update into a no-op and returns zero rows, all as one atomic operation with no
-- window for a second caller to interleave. A `select` followed by a conditional `insert` from
-- TypeScript would have exactly that window.
create table public.advisor_generation_locks (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  started_at timestamptz not null default now()
);

alter table public.advisor_generation_locks enable row level security;
create policy "owner full access" on public.advisor_generation_locks for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Returns the lock's started_at on success, NULL if a fresh (non-stale) lock is already held
-- by this user -- the caller (lib/advisor/generation-lock.ts) reads NULL as "reject this
-- request", matching quota/rate-limit's own established shape of a clean, typed refusal rather
-- than a thrown error for an expected, non-exceptional outcome.
--
-- security invoker (default, stated explicitly): auth.uid() must resolve to the calling
-- session's own claim, never an elevated identity: the RLS policy above is redundant with the
-- auth.uid() scoping already inside this function, kept anyway to match this codebase's
-- established defense-in-depth posture (e.g. app/(app)/advisor/actions.ts re-verifies
-- conversation ownership despite RLS already making a foreign id harmless).
--
-- p_stale_after_seconds default 120: comfortably longer than any real advisor generation
-- (the provider call plus two DB round-trips), short enough that a genuinely crashed request
-- (an uncaught exception before the release path runs, a function timeout) doesn't leave a
-- student locked out of their own advisor for more than two minutes.
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

-- Deletes only the exact lock this caller acquired (matched by started_at, not just user_id) --
-- if this caller's own lock went stale and was reclaimed by a newer request while this one was
-- still (unexpectedly) running past the staleness window, this release must not delete that
-- newer, legitimately-held lock out from under it. In the overwhelmingly common case (release
-- happens well within p_stale_after_seconds) this is identical to an unconditional delete by
-- user_id; the match on started_at only matters for the crash-adjacent edge case, and costs
-- nothing to include.
create or replace function public.release_advisor_generation_lock(p_started_at timestamptz)
returns void
language sql
security invoker
as $$
  delete from public.advisor_generation_locks
  where user_id = auth.uid() and started_at = p_started_at;
$$;
