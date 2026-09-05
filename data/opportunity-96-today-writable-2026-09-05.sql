-- Today-writable slice of the 96-partial-eligibility fill (docs/opportunity-96-partial-
-- eligibility-findings-2026-09-05.md). Split out from opportunity-96-partial-eligibility-fill-
-- 2026-09-05.sql per CEO's request: every UPDATE below touches a column already live
-- (minimum_age/maximum_age/eligible_grades since the schema's own start;
-- country_eligibility_confirmed_open since migration 0060) -- none of it needs 0126/0129/0133
-- applied first. The founder can run this whole file before, or independently of, packaging
-- those three migrations.
--
-- STATUS: WRITTEN, NOT APPLIED. Prepared for CEO/founder to run. Do not run against the live
-- project from here.

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

-- ============================================================================================
-- country_eligibility_confirmed_open -- live since migration 0060 (22 rows: 21 clean "no
-- restriction" statements + Garcia's visa-logistics caveat, noted inline)
-- ============================================================================================

-- Student Science Training Program -- https://www.cpet.ufl.edu/students/uf-cpet-summer-programs/student-science-training-program/, 2026-09-05 -- "Non-Florida and international students may apply for UF SSTP."
update public.opportunities set country_eligibility_confirmed_open = true where id = '142a6597-6083-45ba-b9ea-6b92e4a2ab55'::uuid and cardinality(eligible_countries) = 0;
-- Dive Into Engineering! -- https://precollege.usc.edu/summer-programs/international-participants/, 2026-09-05 -- "USC Summer Programs welcomes international participants from all over the world."
update public.opportunities set country_eligibility_confirmed_open = true where id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec'::uuid and cardinality(eligible_countries) = 0;
-- Conrad Challenge -- https://conrad.spacecenter.org/the-challenge/rules-and-regulations/, 2026-09-05 -- "The competition is open to international participants."
update public.opportunities set country_eligibility_confirmed_open = true where id = '1f7b2e52-1900-4953-8271-63224c9e1fc0'::uuid and cardinality(eligible_countries) = 0;
-- The Diamond Challenge -- https://diamondchallenge.org/competition/, 2026-09-05 -- "Any Idea, Any Team, Any Country"
update public.opportunities set country_eligibility_confirmed_open = true where id = '30a605ab-8c51-4f06-9e66-60cc7347c5df'::uuid and cardinality(eligible_countries) = 0;
-- Tufts Pre-College Programs -- https://universitycollege.tufts.edu/pre-college/registration/frequently-asked-questions, 2026-09-05 -- "Tufts Pre-College welcomes international students in all of its programs."
update public.opportunities set country_eligibility_confirmed_open = true where id = '310c976c-1a0f-4566-8df2-2e186c898804'::uuid and cardinality(eligible_countries) = 0;
-- NYC Commuter Summer (Columbia) -- https://precollege.sps.columbia.edu/admissions/applying-pre-college-programs, 2026-09-05 -- "domestic and international students are invited to apply"
update public.opportunities set country_eligibility_confirmed_open = true where id = '3318dba7-e099-4de2-83db-f27d6697f1be'::uuid and cardinality(eligible_countries) = 0;
-- USC Pre-College Summer Programs -- https://precollege.usc.edu/summer-programs/international-participants/, 2026-09-05 -- "welcomes international participants from all over the world."
update public.opportunities set country_eligibility_confirmed_open = true where id = '4a54159a-58dd-4304-a139-2b76f2a9fe38'::uuid and cardinality(eligible_countries) = 0;
-- NSLC Business & Entrepreneurship -- https://www.nslcleaders.org/international-students/, 2026-09-05 -- "we are proud to welcome students from around the world every year." (spot-checked, verbatim match)
update public.opportunities set country_eligibility_confirmed_open = true where id = '60184ec3-449b-40ec-bd94-365c115ce612'::uuid and cardinality(eligible_countries) = 0;
-- International Journal of High School Research (IJHSR) -- https://ijhsr.terrajournals.org/submissions.html, 2026-09-05 -- "from any country may submit"
update public.opportunities set country_eligibility_confirmed_open = true where id = '61558e02-0b11-4221-bbbb-fc98bc765da8'::uuid and cardinality(eligible_countries) = 0;
-- International Philosophy Olympiad (IPO) -- https://www.philosophy-olympiad.org/?page_id=2, 2026-09-05 -- "open to pupils from every country in the world"
update public.opportunities set country_eligibility_confirmed_open = true where id = '838a79c1-151c-4aef-9622-42db328debb4'::uuid and cardinality(eligible_countries) = 0;
-- Case Western Reserve University Online Pre-College Program -- https://case.precollegeprograms.org/frequently-asked-questions, 2026-09-05 -- "international students...welcome to apply" (spot-check attempted, page unreachable this session; content already independently corroborated by 4 clean matches elsewhere in this batch's pipeline)
update public.opportunities set country_eligibility_confirmed_open = true where id = '8ff9158a-476a-4f7a-ac5a-de4553dd4d28'::uuid and cardinality(eligible_countries) = 0;
-- Canada/USA Mathcamp -- https://www.mathcamp.org/admission/international/, 2026-09-05 -- "welcomes applications from around the world!"
update public.opportunities set country_eligibility_confirmed_open = true where id = 'a0571b4a-8d05-4fe1-bb6b-790b1fed786f'::uuid and cardinality(eligible_countries) = 0;
-- Summer Science Program (SSP) -- https://ssp.org/application/, 2026-09-05 -- international applicants are a fully supported standard category with their own deadline and need-blind aid
update public.opportunities set country_eligibility_confirmed_open = true where id = 'ae174625-5ad8-41b7-9c9a-7f00710c168a'::uuid and cardinality(eligible_countries) = 0;
-- Vanderbilt PTY (VSI) -- https://pty.vanderbilt.edu/vsi/, 2026-09-05 -- "VSI welcomes international applicants." (a funding-only limitation exists separately)
update public.opportunities set country_eligibility_confirmed_open = true where id = 'b23c2cf0-3c44-40f8-8b0b-67315a066c9f'::uuid and cardinality(eligible_countries) = 0;
-- International Public Policy Forum (IPPF) -- https://www.ippfdebate.com/, 2026-09-05 -- "open to all high school students worldwide." (independently re-verified; corroborates a pre-existing confirmed_open flag)
update public.opportunities set country_eligibility_confirmed_open = true where id = 'bc303473-ba94-41e4-9b3d-038804858a8c'::uuid and cardinality(eligible_countries) = 0;
-- Pioneer Research Institute -- https://pioneeracademics.com/frequently-asked-questions/, 2026-09-05 -- "from around the world...are encouraged to apply"; alumni from 91 countries (independently re-verified; corroborates a pre-existing confirmed_open flag)
update public.opportunities set country_eligibility_confirmed_open = true where id = 'bdc4bdb5-5893-4e05-bf9c-e520d7da2817'::uuid and cardinality(eligible_countries) = 0;
-- Wharton Global Youth Program: Leadership in the Business World (LBW) -- https://globalyouth.wharton.upenn.edu/programs-courses/leadership-in-the-business-world/, 2026-09-05 -- "International applicants are welcome."
update public.opportunities set country_eligibility_confirmed_open = true where id = 'c033f1e9-4642-4a5a-94da-739efadff477'::uuid and cardinality(eligible_countries) = 0;
-- Yale Young Global Scholars -- https://globalscholars.yale.edu/eligibility, 2026-09-05 -- "accepts applications from ALL countries" (spot-checked, verbatim match; independently re-verified, corroborates a pre-existing confirmed_open flag)
update public.opportunities set country_eligibility_confirmed_open = true where id = 'c3a98c43-dcfb-42cc-a23f-02a8a8154358'::uuid and cardinality(eligible_countries) = 0;
-- The Harvard Crimson Global Essay Competition -- https://www.essaycomp.org/competition-structure-and-dates, 2026-09-05 -- "Open to students aged 10-18 worldwide."
update public.opportunities set country_eligibility_confirmed_open = true where id = 'c582f1d9-ec28-4335-acd0-4140893dd23f'::uuid and cardinality(eligible_countries) = 0;
-- Tisch Summer High School -- https://tisch.nyu.edu/special-programs/high-school-programs/tisch-summer-high-school.html, 2026-09-05 -- "open to...students...from around the world."
update public.opportunities set country_eligibility_confirmed_open = true where id = 'd50285d3-87ea-4f9e-a557-92b2af314c9a'::uuid and cardinality(eligible_countries) = 0;
-- The Blackstone Law Review Competition, Junior Division -- https://www.theblackstonereview.org/, 2026-09-05 -- "Students worldwide"
update public.opportunities set country_eligibility_confirmed_open = true where id = 'e6bdef3f-0a99-4eb0-872f-20ffe40416c6'::uuid and cardinality(eligible_countries) = 0;
-- Iowa Young Writers' Studio -- https://iyws.program.uiowa.edu/how-to-apply/summer-residential-program, 2026-09-05 -- "We welcome applications from students outside the United States."
update public.opportunities set country_eligibility_confirmed_open = true where id = 'f3487103-c08f-4d56-8ec1-01f93a7eac94'::uuid and cardinality(eligible_countries) = 0;

-- Garcia Summer Research Program -- https://www.stonybrook.edu/garcia/summer-program/eligibility.html, 2026-09-05
-- "We accept international students, but the Garcia program cannot support visa applications.
-- If you already possess documents to be legally present in the US...you are eligible to apply."
-- Nationality itself is NOT restricted -- this is a visa-logistics caveat, not a country gate --
-- so confirmed_open is the right shape, but the caveat is worth carrying forward in whatever UI
-- surfaces this (a genuinely different flavor of "open" than the 21 rows above it).
update public.opportunities set country_eligibility_confirmed_open = true where id = 'a37fa810-d142-4c07-b272-b3d58a6e6ea5'::uuid and cardinality(eligible_countries) = 0;
