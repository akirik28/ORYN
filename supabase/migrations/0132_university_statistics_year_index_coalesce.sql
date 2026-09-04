-- 0132: university_statistics_university_year_idx never actually fires -- same defect
-- migration 0056 already fixed once for university_requirements, not yet applied here.
--
-- The existing unique index is on (university_id, stat_year). In Postgres, NULL is never
-- equal to NULL, so the index cannot fire on any row where stat_year is null. Measured live
-- 2026-09-04 (project qtcvcflzxbuagvvwahhu): 133 rows, only 3 have stat_year set -- the
-- other 130 (97.7%) have carried no real uniqueness guarantee at all. Found the same day a
-- staged package re-run silently doubled five university_statistics rows for exactly this
-- reason -- a unique constraint over a column the insert never set.
--
-- Measured before writing this migration, per CEO's own explicit sequencing -- 0 duplicate
-- (university_id) rows exist on the live table today. This migration closes the gap before
-- it is exploited again, not cleaning up existing damage; if that measurement had come back
-- non-zero, a cleanup migration choosing which row to keep would have had to land first,
-- since CREATE UNIQUE INDEX fails outright over data that already violates it (confirmed
-- directly in this migration's own local proof, not assumed).
--
-- Same fix shape as 0056's university_requirements_university_type_scope_title_idx:
-- COALESCE(stat_year, <sentinel>) so every row participates in the uniqueness check, whether
-- or not stat_year is populated. -1 is never a real academic year and is never written to the
-- column by any application code path -- it exists only inside this index's own key
-- expression, never stored.
--
-- Reversible and re-runnable by construction: this migration only changes an index
-- definition, no data is read, written, or deleted. DROP INDEX IF EXISTS / CREATE UNIQUE
-- INDEX IF NOT EXISTS make a second run of this file a no-op, and rolling back is the mirror
-- image (drop the coalesced index, recreate the plain (university_id, stat_year) one) with
-- zero data-loss risk either direction.

drop index if exists university_statistics_university_year_idx;

create unique index if not exists university_statistics_university_year_idx
  on university_statistics (university_id, coalesce(stat_year, -1));
