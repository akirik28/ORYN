-- Today-writable slice of the 96-partial-eligibility fill (docs/opportunity-96-partial-
-- eligibility-findings-2026-09-05.md). Split out from opportunity-96-partial-eligibility-fill-
-- 2026-09-05.sql per CEO's request: this is the one group of that file that touches columns
-- already live and needs no migration first (minimum_age/maximum_age/eligible_grades all exist
-- today) -- the founder can run this before, or independently of, packaging 0126/0129/0133.
--
-- STATUS: WRITTEN, NOT APPLIED. Prepared for CEO/founder to run. Do not run against the live
-- project from here.
--
-- NOTE flagged back to CEO, not silently folded in: `country_eligibility_confirmed_open` also
-- targets a live column (migration 0060, already applied) -- the 23 rows using it stayed in the
-- main fill file's section 3b rather than here, matching the literal "8-row" scope asked for.
-- If that scope was meant to include it too, those 23 UPDATEs are unaffected by 0126/0129/0133
-- and can move here just as easily.

-- ============================================================================================
-- age -- specific values found (5 rows)
-- ============================================================================================

-- Student Science Training Program (UF SSTP) -- https://www.cpet.ufl.edu/students/uf-cpet-summer-programs/student-science-training-program/, 2026-09-05
-- "Students currently in the 11th grade and who will be 16 years old or older by the start of the program are eligible for UF SSTP."
update public.opportunities set minimum_age = 16
  where id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55'::uuid and minimum_age is null and maximum_age is null;

-- RISD Pre-College (On-Campus) -- https://precollege.risd.edu/on-campus/application-information, 2026-09-05
-- "you must...be between 16 and 18 years old (born between July 31, 2007 and June 27, 2010)."
update public.opportunities set minimum_age = 16, maximum_age = 18
  where id = '5a583dbf-eca9-4219-b306-463f9704cf04'::uuid and minimum_age is null and maximum_age is null;

-- Yale Young Global Scholars -- https://globalscholars.yale.edu/eligibility, 2026-09-05 (spot-checked, verbatim match)
-- "Be between the ages of 16-18 years old by July 19, 2027 (first day of Session III)."
update public.opportunities set minimum_age = 16, maximum_age = 18
  where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358'::uuid and minimum_age is null and maximum_age is null;

-- Barcelona International Youth Science Challenge (BIYSC) -- https://biysc.org/faq, 2026-09-05
-- "Being between 16 and 18 years old during the summer program."
update public.opportunities set minimum_age = 16, maximum_age = 18
  where id = 'd9b30fb9-aa85-48ca-ae1b-6c04c5ece736'::uuid and minimum_age is null and maximum_age is null;

-- Nuffield Research Placements -- https://nustem.uk/blog/news/nuffield-research-placements/, 2026-09-05
-- "Be over 16, in year 12 (or equivalent) and in full-time education in the UK."
-- CAVEAT: official source (nuffieldfoundation.org) defers to STEM Learning, which returned 403
-- on fetch -- this quote is a university-outreach page's (NUSTEM) reproduction of the official
-- wording, not the primary source read directly. The age part is unambiguous (a plain "over
-- 16"); the GRADE half of this same row ("year 12") is deliberately NOT written here -- see
-- the main fill file's flagged section for why (UK Year <-> US grade is not a conversion this
-- pass makes).
update public.opportunities set minimum_age = 16
  where id = 'a4c5a08a-f623-4c77-a55f-5782f395c6ec'::uuid and minimum_age is null and maximum_age is null;

-- ============================================================================================
-- grade -- specific values found (3 rows)
-- ============================================================================================

-- University of Notre Dame Pre-College: Summer Scholars -- https://precollege.nd.edu/summer-scholars/eligibility-and-application-requirements/, 2026-09-05
-- "Current sophomores and juniors (will be rising juniors and seniors)."
update public.opportunities set eligible_grades = array['10','11']
  where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85'::uuid and cardinality(eligible_grades) = 0;

-- Coca-Cola Scholars Program -- https://www.coca-colascholarsfoundation.org/apply/, 2026-09-05
-- "Currently enrolled high school...students...who will graduate high school during the 2026-
-- 2027 academic school year...[applicants may not be] High school graduates." -- i.e. current
-- graduating seniors only.
update public.opportunities set eligible_grades = array['12']
  where id = '690eba7f-0de9-4298-b746-c3456391b9b5'::uuid and cardinality(eligible_grades) = 0;

-- QuestBridge National College Match -- https://www.questbridge.org/apply-to-college/programs/national-college-match, 2026-09-05
-- "High School Seniors"; "high-achieving high school seniors from low-income backgrounds"
update public.opportunities set eligible_grades = array['12']
  where id = 'a2c63505-1481-4a1f-94cc-6ab86dc35405'::uuid and cardinality(eligible_grades) = 0;
