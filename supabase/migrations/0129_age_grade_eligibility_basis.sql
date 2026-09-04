-- 0129: opportunities.age_eligibility_basis / grade_eligibility_basis -- the third state
-- 0126 didn't have, mirroring university_statistics.admission_rate_basis's own shape (0119)
-- from the same day, for the same underlying reason.
--
-- 0126 gave age/grade eligibility a two-state signal: not-confirmed-open (default) vs.
-- confirmed-open (a research pass found the official page explicitly says there's no gate).
-- D2's own visible-priority research pass (docs/opportunity-eligibility-d2-not-found-2026-
-- 09-04.md) surfaced a real third case that two-state signal can't represent: 24 of the 34
-- opportunities students actually see had their official page CHECKED, and that page simply
-- doesn't mention age or grade at all -- not "confirmed no restriction" (the page never
-- makes that positive claim) and not "unresearched" (a person genuinely looked, today, at
-- the cited URL). Collapsing this into "unresearched" means these 24 rows carry the exact
-- same "not verified yet" warning forever, indistinguishable from a row nobody has ever
-- looked at -- and a warning a student sees on every single row teaches them to stop
-- reading it, which is the failure mode CEO named directly: the one row where the warning
-- actually matters gets the same non-reaction as the 24 where it's genuinely moot.
--
-- Same shape as 0119's admission_rate_basis on purpose, per explicit instruction not to
-- invent a new pattern: a plain `text` column (not a real Postgres enum type, so no type-
-- alteration ceremony), a CHECK constraint enumerating the valid values, a default of the
-- honest "nobody's looked" state, and a deterministic backfill for the one case this
-- migration can already prove from data already on file.
--
-- Kept alongside 0126's booleans, not replacing them -- CEO's own dispatch names
-- age_eligibility_confirmed_open/grade_eligibility_confirmed_open as an existing, standing
-- fact ("0126'nın bayrağı"), not something to redesign. The two mechanisms describe the
-- same underlying "confirmed no restriction" state from two directions (a fast boolean
-- check application code already has, and a full account of every state including the new
-- one) -- kept in sync by the backfill below, and both remain independently readable.
--
-- *** NOT YET APPLIED *** -- prepared on oryn/0129-age-grade-eligibility-basis-2026-09-04.
-- 0126 itself, which this migration reads to backfill from, is ALSO still not applied to
-- this database as of this writing (confirmed directly against information_schema, not
-- assumed) -- this migration is written defensively regardless (`if not exists` on the
-- read of 0126's own columns is not possible in plain SQL, so application order matters:
-- apply 0126 before 0129, or the backfill UPDATE below simply has nothing to match and is a
-- safe no-op, never an error, since the WHERE clause degrades to matching zero rows on a
-- column that already defaults false).

alter table public.opportunities
  add column if not exists age_eligibility_basis text default 'not_researched'
  check (age_eligibility_basis is null or age_eligibility_basis in ('not_researched', 'checked_not_stated', 'confirmed_no_restriction')),
  add column if not exists grade_eligibility_basis text default 'not_researched'
  check (grade_eligibility_basis is null or grade_eligibility_basis in ('not_researched', 'checked_not_stated', 'confirmed_no_restriction'));

-- Deterministic, not a guess -- same reasoning as 0119's own backfill: a row already marked
-- age_eligibility_confirmed_open/grade_eligibility_confirmed_open true was, by definition,
-- research-confirmed open, so its basis is arithmetic on what 0126 already recorded, not a
-- new inference. Every other row keeps 'not_researched', the honest default, until a real
-- research pass (like D2's) upgrades a specific row to 'checked_not_stated' by hand.
update public.opportunities
  set age_eligibility_basis = 'confirmed_no_restriction'
  where age_eligibility_confirmed_open = true
    and age_eligibility_basis is distinct from 'confirmed_no_restriction';

update public.opportunities
  set grade_eligibility_basis = 'confirmed_no_restriction'
  where grade_eligibility_confirmed_open = true
    and grade_eligibility_basis is distinct from 'confirmed_no_restriction';

comment on column public.opportunities.age_eligibility_basis is
  'Why minimum_age/maximum_age are (or are not) set. ''not_researched'' (default): nobody has checked this row''s age eligibility yet. ''checked_not_stated'': a research pass read the official page (source_url, as of last_verified_at) and it does not state an age requirement either way -- distinct from unresearched, and distinct from a confirmed absence of a gate. ''confirmed_no_restriction'': the official page explicitly states there is no age limit -- kept in sync with age_eligibility_confirmed_open (0126), which remains the fast boolean check application code already uses. See docs/opportunity-eligibility-d2-not-found-2026-09-04.md for the D2 research this column answers.';

comment on column public.opportunities.grade_eligibility_basis is
  'Why eligible_grades is (or is not) set. ''not_researched'' (default): nobody has checked this row''s grade eligibility yet. ''checked_not_stated'': a research pass read the official page (source_url, as of last_verified_at) and it does not state a grade requirement either way. ''confirmed_no_restriction'': the official page explicitly states there is no grade restriction -- kept in sync with grade_eligibility_confirmed_open (0126). See docs/opportunity-eligibility-d2-not-found-2026-09-04.md for the D2 research this column answers.';

-- Re-run safe. `add column if not exists` and both UPDATEs (guarded by `is distinct from`)
-- are idempotent, same discipline 0119's own closing note documents -- applying this file
-- twice is a no-op, not an error.
