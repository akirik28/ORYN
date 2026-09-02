-- Dedupe log for the university_data_changed notification (Phase 24) --
-- lib/universities/data-change-scan.ts. Mirrors deadline_notification_log's shape
-- (migration 0075) deliberately: same "one row per fact already surfaced" role, same
-- upsert-with-unique-index correctness guarantee, same select-own read policy.
--
-- Dedupe key is (user_id, university_id, source, last_changed_at) -- NOT a plain "have we
-- ever notified this student about this university" flag, and `source` is part of the key
-- for the same reason deadline_notification_log keys on source too: two independently
-- real events about the same university (its own core facts changing, vs. a brand-new
-- requirement appearing) must not collide into one dedupe slot just because their
-- timestamps happen to land close together. `last_changed_at` identifies one specific
-- change event within that source; if it advances again later for the same source -- a
-- genuinely new change -- that is a different key and re-fires, the same "a nearer bucket
-- is a new fact" reasoning 0075 already established for deadlines, applied here to "a
-- later timestamp is a new fact" instead of "a nearer threshold_days is."
--
-- Two sources exist today (see lib/universities/data-change-scan.ts's own top comment for
-- the full reasoning and for two more that don't yet, blocked on separate gaps):
--   'university'   -- universities.last_changed_at (migration 0006), a core institutional
--                     fact (name/city/type/website/size) genuinely differed from what was
--                     stored before.
--   'requirement'  -- university_requirements.created_at, a brand-new requirement row
--                     appeared for a university the student is tracking. Uses created_at,
--                     not a last_changed_at column (university_requirements does not have
--                     one), because "a requirement was added" is well-supported by a new
--                     row existing; "an existing requirement's wording changed" is not
--                     reliably distinguishable from "the same fact was simply re-verified"
--                     with the columns this table has today, so that case is deliberately
--                     not surfaced.
create table if not exists public.university_notification_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  university_id uuid not null references public.universities(id) on delete cascade,
  source text not null check (source in ('university', 'requirement')),
  last_changed_at timestamptz not null,
  notified_at timestamptz not null default now()
);

-- The dedupe mechanism itself, same role as deadline_notification_log's own unique index:
-- makes "already logged this exact (user, university, source, last_changed_at)" a
-- database-enforced fact, not just an application-level check-then-insert race.
create unique index if not exists university_notification_log_dedupe_idx
  on public.university_notification_log (user_id, university_id, source, last_changed_at);

create index if not exists university_notification_log_user_id_idx
  on public.university_notification_log (user_id, notified_at desc);

comment on table public.university_notification_log is
  'One row per (user, university, source, last_changed_at) the university-data-changed job '
  'has already notified about. Written only by lib/universities/data-change-scan.ts via the '
  'admin client; read by that same job to decide what NOT to re-include in the next '
  'aggregated notification, and select-exposed to the owning student for a future '
  'notification-history surface, same posture as deadline_notification_log (migration 0075).';

alter table public.university_notification_log enable row level security;

-- Postgres has no `create policy if not exists`, so the drop is how this statement
-- becomes re-runnable -- see the note at the end of this file.
drop policy if exists "Users can view their own university notification log" on public.university_notification_log;
create policy "Users can view their own university notification log"
  on public.university_notification_log for select
  using (auth.uid() = user_id);

-- Re-run safe (added 2026-09-02). Every statement above is guarded, so applying this file
-- twice is a no-op rather than an error. Not defensive habit -- docs/deployment.md 0.1
-- records a real incident where two migrations shared version 0020, `supabase db push`
-- stopped partway, and the database was left half-migrated *while appearing to have one*.
-- Recovering from that means re-running the whole sequence, so any file that cannot survive
-- a second run turns a recoverable stall into a manual repair. Five earlier migrations were
-- already given these guards for the same reason; these were missed.
