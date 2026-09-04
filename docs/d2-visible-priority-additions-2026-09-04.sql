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
-- 6 rows below got a confident, sourced fill. The rest of the 33 had no confidently-
-- extractable answer on the page(s) fetched (listed in the not-found doc) or were
-- re-verified as already accurate (BRI Student Fellowship, Bilgi University's grade field,
-- Schoolhouse.world's age field -- no SQL needed for those, noted in the doc instead).

-- 1. Yale Young Global Scholars -- both age and grade confirmed on the official
-- eligibility page: "16-18 years old... current high school sophomore or junior."
update public.opportunities
set minimum_age = 16,
    maximum_age = 18,
    eligible_grades = array['10','11'],
    source_url = 'https://globalscholars.yale.edu/eligibility',
    last_verified_at = now()
where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358';

-- 2. University of Notre Dame Pre-College: Summer Scholars -- grade confirmed:
-- "Current sophomores and juniors (will be rising juniors and seniors)."
update public.opportunities
set eligible_grades = array['10','11'],
    source_url = 'https://precollege.nd.edu/summer-scholars/eligibility-and-application-requirements/',
    last_verified_at = now()
where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85';

-- 3. NYC Commuter Summer (Columbia) -- grade confirmed: "students entering grades 9-12
-- and freshman year of college." The college-freshman half doesn't map onto this schema's
-- K-12 grade codes, so only the high-school range is stored.
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = '3318dba7-e099-4de2-83db-f27d6697f1be';

-- 4. Wharton Data Science Competition -- grade confirmed: "open to all current high
-- school students."
update public.opportunities
set eligible_grades = array['9','10','11','12'],
    last_verified_at = now()
where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08';

-- 5. International Economics Olympiad (IEO) -- age confirmed: "contestants will all be
-- under the age of 20 years on 30 June of the year of the Olympiad." Translated to
-- maximum_age = 19 as the direct reading of "under 20." Country NOT set: the 74-country
-- participation is mediated through "official national organizers," a logistics structure
-- different from an open/restricted nationality policy -- not confirmed either way.
update public.opportunities
set maximum_age = 19,
    source_url = 'https://ieo-official.org/',
    last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9';

-- 6. TechGirls -- source_url corrected to the actual eligibility page fetched (was the
-- program's root page). No data change: age (15-17) already matches the official page's
-- own birth-date-range statement exactly. Grade-level flag is in the separate
-- requires-0126 file, since the official page's completeness (specific age range, specific
-- birth-date window, a "still in secondary school on return" condition, and zero mention of
-- grade) reads as a genuinely complete eligibility statement with no grade dimension, not
-- silence on an unstated one.
update public.opportunities
set source_url = 'https://techgirlsglobal.org/apply/eligibility-and-application-2/',
    last_verified_at = now()
where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2';
