-- D2 -- applying migration 0133's new 'checked_not_stated' basis to the COUNTRY dimension of
-- research already gathered in batches 1-2 and the visible-priority batch
-- (docs/opportunity-eligibility-d2-not-found-2026-09-04.md), now that country_eligibility_basis
-- exists to hold it. REQUIRES MIGRATION 0133 TO BE APPLIED FIRST -- every statement below
-- writes country_eligibility_basis, which does not exist until then.
--
-- This is the country half `docs/d2-checked-not-stated-requires-0129-2026-09-04.sql` (0129,
-- age/grade only) explicitly left out of scope, per CEO's own dispatch at the time: "Boston
-- University Tanglewood, WWF Youth Art Contest, Duke of Edinburgh Türkiye, METU, plus the
-- country half of several multi-field rows ... there is no column to write that finding into
-- yet." Migration 0133 is that column; this file is what fills it.
--
-- Same qualification rule as 0129's own file, applied strictly per row to the country field
-- specifically: 'checked_not_stated' means the row's own official_url/source_url was actually
-- FETCHED (no 403/timeout/socket failure/empty response), real content came back, and that
-- content did NOT explicitly defer to a different, unfetched page as where the country/
-- citizenship answer lives. Excluded on that basis (country was "missing" in the doc but the
-- fetch was incomplete, not a confirmed silence): Northwestern NHSI, Sciences Po, Bocconi,
-- Copenhagen Business School (all defer to a separate, unfetched section), Zero Robotics,
-- NYU Precollege, Girl Up Global Teen Advisor Board, Girl Up Project Awards, Sabancı
-- University, LaunchX, AMC-AIME, YGA, KUSRP 2026, Wall Street 101 (fetch failures or explicit
-- deferrals), NYC Commuter Summer (the fetch that round only ever addressed grade, never
-- reached country), InvestIN (country-relevant "international students" section named but not
-- fetched), IYPT (defers to an unfetched official regulations document).
--
-- Re-read every candidate row's current live value immediately before writing this file
-- (2026-09-04, same pass) rather than trusting the doc's snapshot from when it was written --
-- two rows had already changed since:
--   * The Duke of Edinburgh's International Award -- Türkiye (cdb9da8a-3c8d-47ea-bcee-
--     6cf749738246) now has a real, populated eligible_countries (["Türkiye"]) and
--     citizenship_restrictions -- already resolved by a later pass, not a checked_not_stated
--     candidate anymore. Dropped from this file entirely; a fill here would silently
--     overwrite nothing (eligible_countries wins in computeEligibility regardless) but would
--     misrepresent this row as basis-driven when it's actually a real, structured answer.
--   * European Youth Event (1acee3b0-eaac-479a-996a-b0a2a0570351) now has a real, populated
--     citizenship_restrictions ("European Union and beyond -- EYE2025 drew participants
--     representing 160 nationalities"). Setting country_eligibility_basis on this row would
--     be a dead write: lib/opportunities/matching.ts's computeEligibility only reads
--     countryEligibilityBasis when hasUnstructuredRestrictionEvidence is false, and this row
--     now has restriction prose on file, so it already renders `citizenship_restriction_on_file`
--     instead. Dropped from this file for the same reason as Duke of Edinburgh above.
--
-- Two more rows are dropped for a different reason, found during that same re-check -- a live
-- data-quality bug, not a stale doc: Lumiere Education (bc678344-c213-4ae8-a4f8-48af2856338f)
-- and UCSB Research Mentorship Programs (647eb8da-9cb8-46d4-8ded-b4c516f7ac90) both have a
-- RESEARCH ANNOTATION stored in citizenship_restrictions instead of an actual restriction --
-- Lumiere's reads "None stated on official pages fetched; cost genuinely unconfirmed as of
-- this research pass" and UCSB's reads "None stated; official page: engages, qualified,
-- high-achieving high school students from all over the world". Both are non-null, so the
-- same dead-write gap as EYE above applies -- a fill here would never be read -- and worse,
-- the current live value is a real, live bug: a student opening either row's card is shown a
-- `citizenship_restriction_on_file` note quoting an internal research note (literally
-- "cost genuinely unconfirmed as of this research pass") as if it were the opportunity's own
-- eligibility text. Flagged separately as its own issue, not fixed here -- correcting it means
-- deciding what these two rows' citizenship_restrictions SHOULD say (most likely null), a
-- content decision outside this migration's scope, not a country_eligibility_basis question.
--
-- 11 opportunities qualify below (down from the doc's 15 country-missing candidates in this
-- set, once the two already-resolved rows and the two bug-blocked rows above are set aside).

-- Boston University Tanglewood Institute (BUTI, batch 1) -- "Landing page only describes
-- attendee diversity ('from across the country and around the world'), never states an
-- eligibility policy" (bu.edu/cfa/tanglewood/).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'c7c21f3f-fb33-4c6c-be76-66da4df0535d'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- World Wildlife Day International Youth Art Contest (batch 1) -- "'International' in the
-- contest's own name only -- no explicit open/restricted statement on the page fetched"
-- (signup.ifaw.org/en-us/art-contest).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '13d9416e-d2a7-4f55-b851-7d76acab2cb3'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- University of Edinburgh Pre-University Summer School (batch 2) -- "Page repeats the age
-- range ... but has no grade or country statement at all" (study.ed.ac.uk/summer-school).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'dc762fce-b83a-4217-a610-290ac2f65f17'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Bilkent University Summer Camp (Yaz Kampı, batch 2) -- "FAQ page states the grade
-- requirement ... but never states a nationality/country policy either way"
-- (liseyazkampi.bilkent.edu.tr/sikca-sorulan-sorular/).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '96557dbb-7c60-4097-9925-35cbd5ad9a57'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- AI Summer Week @ ETH Zurich (batch 2) -- "country reads as 'appears open' only by
-- inference (hosted in Switzerland, no restriction mentioned) -- not an explicit statement"
-- (forms.hebbian.ch/r/OD1gjp).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '1259aa77-0b5e-4c55-a384-51dbd47de3ec'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- ODTÜ (METU) Engineering Summer School (visible-priority) -- "Page describes the program
-- for 'lise öğrencileri' (high school students) with no nationality/residency statement
-- either way" (metusummerschool.org).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '0c8e00c1-b2b7-4039-8021-10a310de62e4'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Two-week UM Academies (non-credit, visible-priority) -- "Page states only dates ... no
-- eligibility criteria of any kind" (precollege.dcie.miami.edu).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '889c580c-dbb6-4490-9078-9faf2a2a2ed0'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- International Economics Olympiad (IEO, visible-priority) -- "participation is mediated
-- through 'official national organizers' across 74 countries -- a logistics structure, not a
-- stated open/restricted policy" (ieo-official.org).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = '9193db16-7a9e-42b1-95b6-74eda83a0ac9'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Harvard Pre-Collegiate Economics Challenge (HPEC, visible-priority) -- the official page
-- (thehuea.org) explicitly states the rules "will be posted when registration opens" -- a
-- genuinely stronger case than most rows here, same reasoning 0129's own file already applied
-- to this row's age/grade fields: the page affirmatively confirms there is nothing to find
-- yet, for every criterion including country, rather than just being silent.
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'a4a24425-2a6f-4902-99a4-4fb43dc110dd'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Wharton Data Science Competition (visible-priority) -- "no statement found beyond 'all
-- current high school students'" (globalyouth.wharton.upenn.edu/competitions/data-science/).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'cfb32772-6259-4e3a-9ead-bc289b463d08'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- University of the Arts London -- International Summer School (visible-priority) -- "Page
-- has no eligibility statement of any kind, just a program description" (arts.ac.uk).
update public.opportunities
set country_eligibility_basis = 'checked_not_stated',
    last_verified_at = now()
where id = 'ae5e73f0-43ba-42be-baed-423d3087e7e1'
  and country_eligibility_confirmed_open = false
  and citizenship_restrictions is null
  and residency_restrictions is null
  and eligible_countries = '{}'
  and eligible_citizenships = '{}';

-- Every WHERE clause repeats the same four guards deliberately, not just id: country_
-- eligibility_confirmed_open = false (never downgrade a row a later pass already confirmed
-- open), citizenship_restrictions/residency_restrictions is null and eligible_countries/
-- eligible_citizenships = '{}' (the exact hasUnstructuredRestrictionEvidence/
-- hasCountryRestriction/hasCitizenshipRestriction gate lib/opportunities/matching.ts's
-- computeEligibility itself checks before ever reading country_eligibility_basis) -- so if
-- any of these 11 rows changes again before this file is actually applied, the guard turns
-- that one statement into a safe no-op instead of a silent, dead, or wrong write.
