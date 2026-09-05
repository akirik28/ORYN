-- 2026-09-05, the university-notification first-fill fix (CEO's own dispatch: "Oxford hiçbir
-- şey yapmadı, biz ilk kez baktık"). university_data_changed (lib/universities/
-- data-change-scan.ts) treated a stub's core facts being researched for the first time
-- identically to a genuine later correction, because `last_changed_at` alone only records
-- THAT something differed, never whether the prior value was a real fact or simply unset.
--
-- last_change_kind records WHICH of the two, alongside last_changed_at, written by
-- lib/universities/sync-us-universities.ts's classifyUniversityDataChange/
-- classifyStatisticsDataChange at the one moment (existing vs. incoming, in hand together)
-- this can actually be known -- the notification scan runs later and has no other way to
-- recover it.
--
-- Nullable and NOT backfilled on purpose, same reasoning migration 0080's own header already
-- gives for last_changed_at itself: every row whose last_changed_at was stamped before this
-- column existed has no recorded classification, and inventing one (defaulting to either
-- 'added' or 'changed') would assert a fact nobody actually observed. NULL reads as its own
-- honest, deliberately weaker claim at the notification layer ("something's new, we don't
-- know which kind") -- see UniversityChangeKind's own header in data-change-scan.ts.
alter table public.universities
  add column if not exists last_change_kind text
    check (last_change_kind in ('added', 'changed'));

comment on column public.universities.last_change_kind is
  'Whether the change that most recently advanced last_changed_at was a previously-unset field becoming known for the first time (''added'') or an existing real value differing (''changed''), per lib/universities/sync-us-universities.ts''s classifyUniversityDataChange. NULL means the row''s last recorded change predates this column and its kind is genuinely unknown -- never defaulted to either value.';

alter table public.university_statistics
  add column if not exists last_change_kind text
    check (last_change_kind in ('added', 'changed'));

comment on column public.university_statistics.last_change_kind is
  'Same role as universities.last_change_kind, for an admission number here -- per classifyStatisticsDataChange. A university''s first-ever statistics row is unconditionally ''added'' (folded in from the former `!existingStats ||` special case at the call site). NULL means unknown provenance, same reading as universities.last_change_kind.';
