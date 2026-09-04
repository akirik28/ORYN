-- Found while computing the night's final closing measurement, not sought out separately:
-- 'University of Edinburgh Pre-University Summer School 2026' (dc762fce-b83a-4217-a610-
-- 290ac2f65f17, fixed by docs/d2-country-checked-not-stated-requires-0133-2026-09-04.sql) and
-- 'University of Edinburgh International Summer School' (30436a92-26fd-4972-a8b3-
-- dce8ad454943) are the SAME program listed TWICE -- both point at the identical official_url
-- (https://study.ed.ac.uk/summer-school). The row a real student currently sees in the
-- visible-33 set is 30436a92, NOT dc762fce -- so the 0133 country fix landed on the twin
-- nobody is currently shown, while the one a student actually sees stays fully unresearched
-- (age, grade AND country all null/empty, confirmed live).
--
-- This is a duplicate-ROW problem, the mirror image of the Waterloo/CEMC issue from earlier
-- tonight -- that was one row wrongly bundling several real programs; this is one real program
-- wrongly split into two rows. Not resolved here (deciding which row is canonical and merging
-- opportunity_matches/saved_opportunities history is a bigger, separate task, same shape as
-- Waterloo/CEMC's own "measure, then plan" first step) -- flagged for that, not fixed.
--
-- What IS applied below is a narrow, safe parity fix: the SAME country evidence already used
-- for dc762fce ("Page repeats the age range... but has no grade or country statement at all,"
-- docs/opportunity-eligibility-d2-not-found-2026-09-04.md) applies identically to 30436a92 --
-- it is the same page. Age and grade are NOT touched here -- dc762fce already had a real age
-- bound on file before its own fix; 30436a92 has neither age nor grade populated at all, and
-- fixing those needs its own research pass, not a copy from a row that was never actually more
-- complete on those two fields. REQUIRES MIGRATION 0133 applied first.

update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '30436a92-26fd-4972-a8b3-dce8ad454943'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Age and grade remain open gaps for this row -- not addressed here, named so this file is
-- never mistaken for a complete fix of the duplicate.
