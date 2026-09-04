-- Classification of the 7 rows docs/citizenship-restrictions-boilerplate-cleanup-2026-09-04.sql
-- deliberately left untouched -- CEO's own three-way test, applied row by row with reasoning
-- named for each, per CEO's explicit request not to decide silently. REQUIRES MIGRATION 0133
-- (country_eligibility_basis) applied first for the two UPDATEs that set it.
--
-- THE TEST (CEO's own framing):
--   1. An explicit "no restriction" statement -- the page itself states the openness, not
--      just a description of who happens to attend -- -> country_eligibility_confirmed_open =
--      true AND country_eligibility_basis = 'confirmed_no_restriction' (0060/0133's own
--      shape). Same bar already applied to EYE/BU Tanglewood in 0129/0133 (both FAILED it --
--      "160 nationalities"/"from across the country and around the world" is attendee
--      history, not a policy statement -- which is exactly the line these 7 rows sit on
--      either side of).
--   2. Real, substantive PROCESS information useful to a student (a visa type, a language
--      requirement) -- not a restriction claim in either direction -- -> leave the column
--      completely untouched, no basis change, content stays.
--   3. Only "the page doesn't say anything" -- -> country_eligibility_basis =
--      'checked_not_stated', field cleared.
--
-- A FOURTH thing had to be checked before writing any UPDATE, not assumed: does clearing
-- citizenship_restrictions actually matter once confirmed_open/basis is set? Re-read
-- lib/opportunities/matching.ts and lib/counselor/eligibility.ts line by line -- the
-- "citizenship_restriction_on_file" note (both files) is gated ONLY on
-- `citizenshipRestrictions && !hasCitizenshipRestriction`, completely INDEPENDENT of
-- countryEligibilityConfirmedOpen. Setting confirmed_open=true while LEAVING the free-text
-- column populated would still fire that note, on both surfaces AND on the unconditional
-- detail-page render (app/(app)/opportunities/[id]/page.tsx) -- the exact bug this whole
-- package exists to fix, still live for these two rows specifically. So every row promoted to
-- confirmed_no_restriction below ALSO clears citizenship_restrictions -- the quote's evidence
-- has been promoted into the structured field, so the free-text copy is no longer needed and
-- would actively contradict the new structured answer if left in place.

-- Bocconi Summer School for High School Students -- CEO's own example: "official page says
-- applicants can be 'in Italy or abroad'" is the page itself stating openness (both
-- categories together cover everyone), not a description of who happens to attend.
update public.opportunities
set country_eligibility_confirmed_open = true,
    country_eligibility_basis = 'confirmed_no_restriction',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '0cbe26c6-c073-4ce5-9b9d-b928a3c0a7bc'
  and citizenship_restrictions = 'None stated; official page says applicants can be "in Italy or abroad."'
  and country_eligibility_confirmed_open = false;

-- Wharton Global Youth Program: Leadership in the Business World (LBW) -- CEO's own second
-- example: "international applicants are explicitly welcome" is a direct, affirmative
-- statement, not attendee-diversity trivia.
update public.opportunities
set country_eligibility_confirmed_open = true,
    country_eligibility_basis = 'confirmed_no_restriction',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = 'c033f1e9-4642-4a5a-94da-739efadff477'
  and citizenship_restrictions = 'None stated - official page says international applicants are explicitly welcome'
  and country_eligibility_confirmed_open = false;

-- Immerse Education Summer School -- "applicants coming 'from around the world'" is
-- descriptive attendee makeup, not a policy statement -- the same shape as BU Tanglewood's own
-- "from across the country and around the world" (already judged NOT sufficient for
-- confirmed-open in the 0129/0133 pass). checked_not_stated, not confirmed_no_restriction.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '7f90019e-05c7-4059-ae13-8e285ab3ea38'
  and citizenship_restrictions = 'None stated; official pages describe applicants coming "from around the world."';

-- Oxford Scholastica Academy Summer School -- "students come from 'over 85 different
-- countries'" is the same descriptive-attendee-history shape as EYE's own "160 nationalities"
-- (already judged NOT sufficient for confirmed-open).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '2080d194-88e9-4585-9a81-c99e9a19840b'
  and citizenship_restrictions = 'None stated; official FAQ says students come from "over 85 different countries."';

-- UCSB Research Mentorship Programs -- "engages ... students from all over the world" is the
-- same descriptive shape as BU Tanglewood/Immerse above, not an affirmative no-restriction
-- statement.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
  and citizenship_restrictions = 'None stated; official page: engages qualified, high-achieving high school students from all over the world';

-- NOT touched below -- content correctly stays, no basis change, per CEO's own instruction:
--
-- IE University Pre-University Summer Program (41db8ceb-16ea-4215-adc0-7fb7b152649d) --
-- "visas apply 'if applicable, for international students'" is real process information (a
-- visa contingency), not a restriction claim in either direction and not mere silence.
-- Setting country_eligibility_basis here would also be a dead write regardless -- the free
-- text stays populated, so hasUnstructuredRestrictionEvidence stays true and the basis branch
-- never executes (same reason Lumiere/UCSB were excluded from the ORIGINAL 0133 fill before
-- their own boilerplate was cleared).
--
-- Ross Mathematics Program (e0d9379f-294b-40cd-a406-e0cb08c92567) -- CEO's own example: the
-- B-2 tourist visa detail is a concrete, actionable fact a student can use, not a "nothing
-- found" placeholder. Same dead-write reasoning as IE University applies if basis were set
-- here, on top of CEO's own instruction to leave the content as-is.

-- Re-run safe: every UPDATE re-guards on the exact current citizenship_restrictions text (and,
-- for the confirmed-open pair, on country_eligibility_confirmed_open = false) via the WHERE
-- clause, so re-applying this file, or applying it after either row has already changed, is a
-- no-op for that row rather than an error or a wrong overwrite.
