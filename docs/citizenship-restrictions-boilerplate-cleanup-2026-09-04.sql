-- Cleanup for the citizenship_restrictions/residency_restrictions leak CEO asked to be
-- measured properly rather than fixed as "2 rows": a research pass's own internal note
-- ("None stated on the fetched pages.", "None stated on official site or FAQ") was stored as
-- the column's actual value instead of left null when nothing was found. Confirmed live,
-- 2026-09-04, and re-read immediately before writing this file -- no drift since measurement.
--
-- Answers to CEO's four questions, in order:
--
-- 1. HOW MANY ROWS: 11 opportunities, 17 field-instances across citizenship_restrictions/
--    residency_restrictions (broader than the 2 originally spotted). Confirmed via a phrase
--    sweep AND a full read of every non-null value in both columns across all 78 opportunities
--    that have either populated, so this isn't an undercount from a narrow search.
--
-- 2. IS IT READ, AND WHAT HAPPENS: read in FOUR places, confirmed by grep, not assumed --
--    a. app/(app)/opportunities/[id]/page.tsx (the REAL student-facing detail page) renders
--       both fields VERBATIM AND UNCONDITIONALLY under an "Eligibility notes" section, labeled
--       "Citizenship: {text}" / "Residency: {text}" (messages/en.json, messages/tr.json) --
--       zero validation, the most direct exposure of the four.
--    b. lib/opportunities/matching.ts's computeEligibility surfaces either field verbatim as a
--       citizenship_restriction_on_file/residency_restriction_on_file note, which also
--       SUPPRESSES the calmer "not verified yet"/"checked, not stated" message that would
--       otherwise apply (hasUnstructuredRestrictionEvidence gate).
--    c. lib/counselor/eligibility.ts's evaluateOpportunityEligibility does the same, for the
--       Advisor/counselor surface.
--    d. lib/opportunities/readiness.ts treats mere non-null presence as "this row has
--       citizenship info," which means these 11 rows' own "no eligibility information at all"
--       quality warning stays silent -- ironically, the bug hides itself from this exact
--       internal quality check.
--    None of the four ever produce a hard "ineligible" exclusion (eligible stays true, verdict
--    stays "unknown", never known_ineligible/false) and nothing crashes -- the wrong thing
--    communicated is a CONFUSING or backwards-toned PRESENTATION, not a wrong hard verdict,
--    same distinction CEO drew ("varlik yanlis seyi anlatiyor" -- existence tells the wrong
--    thing, not absence telling two different things, which is what this whole arc spent today
--    on for a different reason).
--
-- 3. DOES THE STUDENT SEE IT: yes, today -- 2 of the 11 rows (Lumiere Education, UCSB Research
--    Mentorship Programs) are in the currently-visible-33 set (saved or a real student's actual
--    top-5), re-checked against the same live query this session's every other visible-set
--    measurement uses. Not a dormant data-quality nit.
--
-- 4. THE CLEANUP: only 10 of the 17 field-instances are touched below, not all 17 -- the other
--    7 (all on citizenship_restrictions) contain a real, substantive quote about the program's
--    actual international openness (e.g. Bocconi: "official page says applicants can be 'in
--    Italy or abroad'"; Wharton LBW: "official page says international applicants are
--    explicitly welcome") despite the misleading "None stated;" opener, and nulling them would
--    throw away real information rather than fix a defect. These are a SEPARATE, deliberate
--    research question -- flagged back to CEO, not decided here -- of whether the quoted
--    language actually meets this arc's own established bar for country_eligibility_basis =
--    'confirmed_no_restriction' (explicit no-gate statement) versus merely 'checked_not_stated'
--    (descriptive attendee diversity, the same distinction already drawn for EYE/BU Tanglewood
--    earlier tonight). Ross Mathematics Program's citizenship_restrictions is left completely
--    untouched and unflagged: its "None stated; international students are accepted (...B-2
--    tourist visa)" is genuinely informative, non-misleading prose despite the same opener --
--    reviewed and kept, not overlooked.
--
--    The 10 instances below are pure boilerplate with ZERO informational content beyond "we
--    checked, found nothing" (which NULL already means in this schema) or, for Lumiere, a
--    stray note about an unrelated field (cost) that landed in the wrong column entirely.
--    Every WHERE clause re-guards the exact current text so a stale statement degrades to a
--    safe no-op rather than clobbering a value someone else has since corrected.

-- LSE Summer School -- both fields are pure "we checked, nothing" boilerplate.
update public.opportunities
set citizenship_restrictions = null
where id = '0f466b31-5fc2-4722-8e61-1fd74187909e'
  and citizenship_restrictions = 'None stated on the fetched pages.';

update public.opportunities
set residency_restrictions = null
where id = '0f466b31-5fc2-4722-8e61-1fd74187909e'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Sciences Po Summer School -- both fields, same boilerplate.
update public.opportunities
set citizenship_restrictions = null
where id = '32b43654-2a63-4135-a91a-b492d1f8b3dc'
  and citizenship_restrictions = 'None stated on the fetched pages.';

update public.opportunities
set residency_restrictions = null
where id = '32b43654-2a63-4135-a91a-b492d1f8b3dc'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Bocconi Summer School for High School Students -- residency only; citizenship_restrictions
-- kept (real "in Italy or abroad" quote, see the research-question note above).
update public.opportunities
set residency_restrictions = null
where id = '0cbe26c6-c073-4ce5-9b9d-b928a3c0a7bc'
  and residency_restrictions = 'None stated on the fetched pages.';

-- IE University Pre-University Summer Program -- residency only; citizenship_restrictions kept
-- (real visa-applicability quote).
update public.opportunities
set residency_restrictions = null
where id = '41db8ceb-16ea-4215-adc0-7fb7b152649d'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Immerse Education Summer School -- residency only; citizenship_restrictions kept (real
-- "from around the world" quote).
update public.opportunities
set residency_restrictions = null
where id = '7f90019e-05c7-4059-ae13-8e285ab3ea38'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Oxford Scholastica Academy Summer School -- residency only; citizenship_restrictions kept
-- (real "over 85 different countries" quote).
update public.opportunities
set residency_restrictions = null
where id = '2080d194-88e9-4585-9a81-c99e9a19840b'
  and residency_restrictions = 'None stated on the fetched pages.';

-- Polygence -- citizenship_restrictions only field it has, pure boilerplate.
update public.opportunities
set citizenship_restrictions = null
where id = '0337369f-bb69-47e5-aa82-d4a0e92a674b'
  and citizenship_restrictions = 'None stated on official site or FAQ';

-- Lumiere Education -- a stray COST note landed in the CITIZENSHIP column entirely; the row is
-- in the currently-visible set (a real student sees this today). "cost genuinely unconfirmed
-- as of this research pass" describes cost, not citizenship, and belongs in neither column as
-- written -- correcting the cost field itself, if warranted, is a separate task.
update public.opportunities
set citizenship_restrictions = null
where id = 'bc678344-c213-4ae8-a4f8-48af2856338f'
  and citizenship_restrictions = 'None stated on official pages fetched; cost genuinely unconfirmed as of this research pass';

-- Follow-on, not done here: once this row's citizenship_restrictions is null, Lumiere becomes
-- a real candidate for 0133's own country_eligibility_basis = 'checked_not_stated' fill --
-- docs/d2-country-checked-not-stated-requires-0133-2026-09-04.sql explicitly excluded Lumiere
-- for exactly this reason (a dead write while restriction text sat in the way). Re-run that
-- exclusion's own re-check once this file lands, rather than assuming Lumiere now qualifies.

-- Re-run safe: every UPDATE re-guards on the exact current text via the WHERE clause, so
-- applying this file twice (or applying it after any one row has already changed) is a no-op
-- for that row, not an error or a wrong overwrite.
--
-- NOT touched here, deliberately (see point 4 above for the full reasoning): Bocconi/IE
-- University/Immerse/Oxford Scholastica/UCSB Research Mentorship/Wharton Global Youth (LBW)'s
-- own citizenship_restrictions, and Ross Mathematics Program's citizenship_restrictions.
