-- D2 -- applying migration 0129's new 'checked_not_stated' basis to research already
-- gathered in batches 1-2 (docs/opportunity-eligibility-d2-not-found-2026-09-04.md), now
-- that the column exists to hold it. REQUIRES MIGRATION 0129 TO BE APPLIED FIRST -- every
-- statement below writes age_eligibility_basis/grade_eligibility_basis, which do not exist
-- until then. Kept in its own file, same discipline as every other *-requires-0126/0129
-- file this D2 pass has produced.
--
-- Scope note, caught before writing the first statement: 0129 only added
-- age_eligibility_basis/grade_eligibility_basis -- CEO's own dispatch named "yaş/sınıf
-- şartı" (age/grade requirement) specifically, never country. Several rows below also had a
-- genuinely checked-but-silent COUNTRY page (Boston University Tanglewood, WWF Youth Art
-- Contest, Duke of Edinburgh Türkiye, METU, plus the country half of several multi-field
-- rows) -- there is no column to write that finding into yet. Not invented here; flagged
-- back to CEO as an open question (does country need the same third state 0060's boolean
-- doesn't cover?) rather than added unilaterally. Those rows are simply absent from this
-- file for their country field; nothing is silently dropped, it's named in the report.
--
-- Not every "not found" row from the doc qualifies for age/grade checked_not_stated either.
-- Applied one rule strictly, per row per field, before writing anything: 'checked_not_stated'
-- means the row's own official_url/source_url was actually FETCHED (no 403/timeout/empty
-- response), real content came back, and that content did NOT explicitly point to a
-- different, unfetched page as where the real answer lives. A fetch failure is not a check.
-- A page that says "see our Eligibility page" (Sciences Po, Bocconi, CBS, Northwestern's
-- per-division pages, InvestIN's international-students section for country, IYPT's
-- regulations document, YGA's per-program pages) is incomplete research, not a confirmed
-- silence -- those stay 'not_researched', untouched here, so a future pass still goes
-- looking rather than treating them as settled.
--
-- 13 opportunities have at least one qualifying age/grade field below (down from 17 once
-- the 4 country-only rows are set aside per the scope note above). Each cites which prior
-- batch's research it draws from -- nothing here is a fresh fetch, this file only writes
-- down what was already found and reported.

-- BrUMO (Brown University Math Olympiad, batch 1) -- age: "page has no eligibility section
-- at all" (brumo.org).
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '6f0daac1-7f07-45da-a330-dc900be73ab9';

-- Blue Ocean Competition (batch 2 visible-priority) -- age, grade: "only says 'high school
-- students/entrepreneurs' generically, no specific age or grade numbers"
-- (blueoceancompetition.org).
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'cb4a1030-d035-4c1f-8579-37c458a88b0e';

-- Purple Comet! Math Meet (batch 2) -- grade: "'middle and high school students' stated but
-- no specific grade numbers given" (purplecomet.org).
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'e5dd5ce7-4730-42d7-84a3-b6492779b038';

-- Lumiere Education (batch 2, re-checked in this round) -- age, grade: "describes 'high
-- school students around the world' but states no specific age/grade/country criteria"
-- (lumiere-education.com). Country left unset -- scope note above.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'bc678344-c213-4ae8-a4f8-48af2856338f';

-- Two-week UM Academies (batch 2, re-checked) -- age, grade: "states only dates... no
-- eligibility criteria of any kind" (precollege.dcie.miami.edu). Country left unset.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0';

-- UCSB Research Mentorship Programs (batch 2) -- age, grade: "'High school students from
-- all over the world' -- descriptive, not a stated policy; no specific grade/age numbers"
-- (summer.ucsb.edu). Country left unset.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '647eb8da-9cb8-46d4-8ded-b4c516f7ac90';

-- InvestIN - Immersive Career Experiences (batch 2) -- grade only: "Age range roughly
-- confirmed... but no grade numbers" (investin.org). Country NOT set -- the page itself
-- named an unfetched "international students" section, which is incomplete research, not
-- confirmed silence.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '8a7c89e4-e63a-4f64-a76d-4bae1b31e889';

-- JA Company Programme (Europe, batch 2) -- grade only: "no grade statement" on the
-- official page (jaeurope.org). Age already correctly stored (15-18).
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '55a5efea-e280-4176-bf65-49a028b097af';

-- International Economics Olympiad (IEO, batch 2) -- grade only: "no statement found"
-- (ieo-official.org). Age already resolved via SQL (maximum_age=19, prior batch). Country
-- left unset per the scope note.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9';

-- Harvard Pre-Collegiate Economics Challenge (HPEC, batch 2) -- age, grade: the official
-- page (thehuea.org) explicitly states the rules "will be posted when registration opens"
-- -- a genuinely stronger case than most rows here, since the page affirmatively confirms
-- there is nothing to find yet rather than just being silent. Country left unset.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd';

-- Wharton Data Science Competition (batch 2) -- age only: "no statement found beyond 'all
-- current high school students'" (globalyouth.wharton.upenn.edu). Grade already resolved
-- via SQL in this same round. Country left unset.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08';

-- European Youth Event (EYE, batch 2) -- grade only: "page does not specify grade-level
-- requirements" (european-youth-event.europarl.europa.eu). Age already correctly stored
-- (16-30). Country left unset -- the "160 different nationalities" language is descriptive
-- attendee history, not a stated policy, same reasoning applied to Lumiere/UM/UCSB above.
update public.opportunities
set grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '1acee3b0-eaac-479a-996a-b0a2a0570351';

-- University of the Arts London -- International Summer School (batch 2) -- age, grade:
-- "no eligibility statement of any kind, just a program description" (arts.ac.uk). Country
-- left unset.
update public.opportunities
set age_eligibility_basis = 'checked_not_stated',
    grade_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1';
