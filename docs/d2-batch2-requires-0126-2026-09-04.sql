-- D2 batch 2, PART 2 -- REQUIRES MIGRATION 0126 TO BE APPLIED FIRST.
--
-- Do not run before 0126 (age_eligibility_confirmed_open / grade_eligibility_confirmed_open
-- columns, branch oryn/d3-age-grade-eligibility-confirmed-open-2026-09-04) has been applied
-- to this database. Every statement below references one or both of those two columns,
-- which do not exist until then. Kept in its own file, physically separate from
-- d2-batch2-additions-and-corrections-2026-09-04.sql (which needs no such ordering), per
-- CEO's own instruction after a package blew up in the founder's hands tonight for exactly
-- this reason -- SQL that depended on an unapplied migration wasn't clearly separated from
-- SQL that didn't.
--
-- 1. ASSIP (Aspiring Scientists Summer Internship Program, George Mason University) --
-- researched in D2 batch 1 (2026-09-04), not applied then because this migration didn't
-- exist yet. Official page (science.gmu.edu/assip) is explicit and structural, not silent:
-- "Interns for remote internships must be 15 years or older... There is no maximum age
-- limit, as long as the applicant has not graduated from university before or during their
-- internship." No grade-level language anywhere on the page -- this program is genuinely
-- age-gated only, confirmed by an affirmative "no maximum age limit" statement, not by
-- absence of one. This is the first real use of the new grade_eligibility_confirmed_open
-- flag: it distinguishes "genuinely no grade requirement" (this row) from "never
-- researched" (the ~272 other rows still missing eligible_grades), which the column didn't
-- exist to say before today.
update public.opportunities
set grade_eligibility_confirmed_open = true,
    last_verified_at = now()
where id = '7a0b2b4e-189d-4e7b-b4a1-ef8886e3a23d';
