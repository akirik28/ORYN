-- D2 — visible-priority batch (2026-09-04), additions/corrections needing no unapplied
-- migration. Prepared, NOT applied -- CEO applies.
--
-- Scope: CEO redirected priority from deadline order (348 total, alphabetical/chronological
-- would take ~20 batches) to MEASURED visibility -- what a student can actually see. Measured
-- rather than assumed, mirroring the same-day deadline-fill precedent's own method:
--   saved_opportunities (status='saved'): 4 distinct opportunities, all 4 carry a gap.
--   opportunity_matches, mirroring lib/opportunities/home-strip.ts's own selection exactly
--     (match_score DESC, status=active + cycle_status not closed/historical/discontinued +
--     deadline not passed, HOME_STRIP_SIZE=5 per student, not the 30-candidate pool): 8
--     students x top 5 = 31 distinct opportunities, 30 carry a gap.
--   Union: 34 distinct opportunities total, 33 (97%) carry a gap -- a small, high-leverage
--   set, not spread thin across the full 367. Full list and per-row research notes: this
--   file plus docs/opportunity-eligibility-d2-not-found-2026-09-04.md's Visible-priority
--   section.
--
-- Re-measured before finalizing this file, per CEO's own explicit requirement (the set
-- isn't static): re-ran the identical query and found one new entrant, Tufts Pre-College
-- Programs (310c976c-1a0f-4566-8df2-2e186c898804) -- already fully resolved on every axis,
-- needs nothing. Nothing dropped out. The 33-row research target list below is otherwise
-- unchanged.
--
-- Also caught in that same re-check, before it became a wrong number in a report: two of
-- this file's own first-draft entries were wrong. NYC Commuter Summer's eligible_grades was
-- ALREADY ['9','10','11','12'] in the live row -- the WebFetch answer confirmed existing
-- data, it did not fill a blank, and the row's real gap (minimum_age/maximum_age, both
-- null) was never actually addressed. Removed that no-op entirely rather than claim it as a
-- fix; the row stays in the not-found doc with its real gap named. Yale Young Global
-- Scholars' proposed grade value differs from what's currently stored -- that's a
-- CORRECTION, not an addition, and is moved to its own section below rather than mixed in,
-- same discipline as YIS Stock Pitch Competition in batch 1.
--
-- Projected effect of this file alone (computed directly against live data via CASE,
-- not applied): the visible-34 set's gapped count drops from 33 to 30. Applying
-- d2-visible-priority-requires-0126-2026-09-04.sql on top (once 0126 itself is applied)
-- drops it further to 29. Not a dramatic swing -- an honest, precisely computed one.

-- ============================================================================
-- ADDITIONS (filling a genuine blank, not changing an existing value)
-- ============================================================================

-- 1. Yale Young Global Scholars -- age. Official eligibility page: "Be between the ages
-- of 16-18 years old." (Grade is handled separately below, as a correction.)
update public.opportunities
set minimum_age = 16,
    maximum_age = 18,
    source_url = 'https://globalscholars.yale.edu/eligibility',
    last_verified_at = now()
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358';

-- 2. University of Notre Dame Pre-College: Summer Scholars -- grade confirmed, genuinely
-- empty before: "Current sophomores and juniors (will be rising juniors and seniors)."
update public.opportunities
set eligible_grades = array['10','11'],
    source_url = 'https://precollege.nd.edu/summer-scholars/eligibility-and-application-requirements/',
    last_verified_at = now()
where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85';

-- 3. Wharton Data Science Competition -- grade confirmed, genuinely empty before: "open to
-- all current high school students."
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08';

-- 4. International Economics Olympiad (IEO) -- age confirmed, genuinely empty before:
-- "contestants will all be under the age of 20 years on 30 June of the year of the
-- Olympiad." Translated to maximum_age = 19 as the direct reading of "under 20." Country
-- NOT set: the 74-country participation is mediated through "official national
-- organizers," a logistics structure different from an open/restricted nationality policy.
update public.opportunities
set maximum_age = 19,
    source_url = 'https://ieo-official.org/',
    last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9';

-- 5. TechGirls -- source_url corrected to the actual eligibility page fetched (was the
-- program's root page). No data change: age (15-17) and the existing 37-country list both
-- already match the official page. Grade-level flag is in the separate requires-0126 file.
update public.opportunities
set source_url = 'https://techgirlsglobal.org/apply/eligibility-and-application-2/',
    last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2';

-- 6. Interlochen Review -- grade and country both confirmed, genuinely empty before:
-- "high school writers, singer-songwriters and artists (grades 9-12 or high school
-- postgraduate year)... from around the world." Country treated as an affirmative
-- statement (guidance about who is invited to submit, not just historical attendee stats)
-- -- the same evidentiary bar as Immerse Education/Penn Pre-College in earlier batches, not
-- a lower one; flagged here explicitly as the closer call of the two.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    country_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44';

-- ============================================================================
-- CORRECTIONS (the existing stored value conflicts with the official source)
-- ============================================================================

-- 7. Yale Young Global Scholars -- eligible_grades was stored as ['11','12'] (junior/
-- senior). The official eligibility page states plainly: "Be a current high school
-- sophomore or junior (or international equivalent)" -- sophomore=10, junior=11. The
-- stored value and the official source disagree by one full grade band on each end.
-- Caught the same way YIS was caught in batch 1: read the fetched text against the
-- ALREADY-STORED value directly, not assumed correct because a row had "something" there.
update public.opportunities
set eligible_grades = array['10','11']
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358';
