-- Classification of the 7 rows docs/citizenship-restrictions-boilerplate-cleanup-2026-09-04.sql
-- deliberately left untouched -- CEO's own three-way test, applied row by row with reasoning
-- named for each, per CEO's explicit request not to decide silently. REQUIRES MIGRATION 0133
-- (country_eligibility_basis) applied first for every UPDATE below that sets it. An 8th row,
-- Interlochen Review, was added 2026-09-04 -- not one of the original 7, found by applying
-- this same test to a different file's own confirmed_open=true claim once the independence
-- bug below made "check every row that claims confirmed_open, not just the one that broke"
-- the right question to ask.
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
--
-- A FIFTH thing, found only because CEO checked package 14 and this file side by side for the
-- same id (Immerse, 7f90019e) and noticed the boolean never got reset: the SAME independence
-- runs the OTHER direction too. computeEligibility/evaluateOpportunityEligibility read
-- countryEligibilityConfirmedOpen FIRST -- `else if (!confirmedOpen) { check basis }` -- so a
-- row carrying confirmed_open=true from an EARLIER file and basis='checked_not_stated' from
-- THIS one would keep running the confirmed_open branch forever; the stricter basis value
-- would sit in the database and never be read. Package 14 (docs/d2-batch2-additions-and-
-- corrections-2026-09-04.sql) set Immerse's confirmed_open=true before this file's own
-- ruling reclassified it -- withdrawn there directly (see that file's own note), but every
-- checked_not_stated UPDATE below ALSO now writes country_eligibility_confirmed_open = false
-- explicitly, rather than relying on the source-file withdrawal alone: a package assembled
-- from this file's own SQL, without re-reading the other file first, must be safe on its own.

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
--
-- CORRECTED 2026-09-04 (CEO, found reviewing before merging Package 15): Package 14's own
-- D2 fill (data/morning/14-toplu-paket-2026-09-04.sql, "students aged 13-18 from around the
-- world, plus a stated alumni base from 140+ countries -- an affirmative statement") already
-- set country_eligibility_confirmed_open = true for this exact row, reasoning the OPPOSITE
-- way about the same underlying fact. 0133's own CHECK constraint only validates basis
-- against its enum, never cross-checks it against the boolean, so this UPDATE as originally
-- written would have landed 'checked_not_stated' right alongside confirmed_open = true --
-- self-contradictory, no error, and inert: lib/opportunities/matching.ts's computeEligibility
-- reads the boolean first (`if (!(opportunity.countryEligibilityConfirmedOpen ?? false))`
-- gates whether country_eligibility_basis is even consulted), so the newer, more careful
-- checked_not_stated classification would have been silently overridden by the older,
-- less careful confirmed-open one. The boolean is now explicitly reset alongside the basis --
-- this UPDATE is the correction the reclassification actually requires, not a second,
-- independent fact. Systematic cross-check against every other Package 14
-- *_confirmed_open = true row (Penn Pre-College, Interlochen Review, TechGirls, and one
-- further grade-only row) found none of the other four touched by any Package 15 file --
-- this was the only overlap. Also enforced going forward: scripts/check-package-15-
-- sequence.sh now asserts, after both runs, that no row ever holds *_confirmed_open = true
-- together with *_basis = 'checked_not_stated', across all three dimensions.
--
-- SECOND, WORSE effect this same fix closes, found building that permanent check (not by
-- inspection): 0133's own backfill (`where country_eligibility_confirmed_open = true and
-- basis is distinct from 'confirmed_no_restriction'`) re-evaluates on every run, not once.
-- With the boolean left at true (the bug as originally written), a first run leaves the
-- contradictory-but-at-least-still-checked_not_stated state CEO found; a SECOND run --
-- exactly the scenario Package 14/15's own two-run re-runnability test exists to catch,
-- because the Supabase SQL Editor doesn't honor begin/commit as one atomic unit -- re-runs
-- 0133's backfill BEFORE this file's own guard (which by then only matches on the now-null
-- citizenship_restrictions, so it no longer fires), and 0133 overwrites the basis back to
-- 'confirmed_no_restriction'. So the failure mode across two runs isn't a contradiction
-- sitting quietly in the row -- it's the careful reclassification being silently REPLACED by
-- the wrong one, with a clean-looking (non-contradictory) final state that a snapshot check
-- alone would have missed entirely. Confirmed directly, two ways: reverting just this fix and
-- running the real two-run test dropped the checked_not_stated count from 14 to 13, and a
-- direct query of this row after both runs showed exactly the predicted wrong end state --
-- country_eligibility_basis = 'confirmed_no_restriction', country_eligibility_confirmed_open
-- = true -- not assumed. Clearing the boolean here removes the row from 0133's own backfill
-- match set for every future run, which is what actually makes the fix stable across a second
-- run, not just correct on the first one.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    country_eligibility_confirmed_open = false,
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '7f90019e-05c7-4059-ae13-8e285ab3ea38'
  and citizenship_restrictions = 'None stated; official pages describe applicants coming "from around the world."';

-- Oxford Scholastica Academy Summer School -- "students come from 'over 85 different
-- countries'" is the same descriptive-attendee-history shape as EYE's own "160 nationalities"
-- (already judged NOT sufficient for confirmed-open).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    country_eligibility_confirmed_open = false,
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '2080d194-88e9-4585-9a81-c99e9a19840b'
  and citizenship_restrictions = 'None stated; official FAQ says students come from "over 85 different countries."';

-- UCSB Research Mentorship Programs -- "engages ... students from all over the world" is the
-- same descriptive shape as BU Tanglewood/Immerse above, not an affirmative no-restriction
-- statement.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    country_eligibility_confirmed_open = false,
    citizenship_restrictions = null,
    last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90'
  and citizenship_restrictions = 'None stated; official page: engages qualified, high-achieving high school students from all over the world';

-- Interlochen Review -- NOT one of the original 7, added here 2026-09-04 answering CEO's own
-- question ("başka satır var mı?" -- are there other rows) after the confirmed_open/basis
-- independence bug surfaced on Immerse: docs/d2-visible-priority-additions-2026-09-04.sql set
-- this row's country_eligibility_confirmed_open = true on "...from around the world" -- the
-- SAME descriptive-attendee wording judged insufficient for Immerse above, flagged by that
-- file's own original author as "the closer call of the two" against Immerse specifically.
-- Once Immerse fell on the checked_not_stated side, this one falls there too, same reasoning.
-- Withdrawn at that file's own source (see its own note); country_eligibility_confirmed_open
-- has no other row setting it true for this id, but set to false here too regardless, same
-- defensive discipline CEO's own instruction established for this file: a package built from
-- this file's SQL alone must be safe even if the other file's withdrawal is never re-checked.
-- citizenship_restrictions/residency_restrictions are already null on this row -- nothing to
-- clear.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    country_eligibility_confirmed_open = false,
    last_verified_at = now()
where id = '95093e1a-fc13-4d9a-b4ed-5f0584252b44'
  and country_eligibility_confirmed_open = false;

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
