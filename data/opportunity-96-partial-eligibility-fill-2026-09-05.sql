-- Fill package for the 96 opportunities with partial eligibility coverage (docs/opportunity-96-
-- partial-eligibility-2026-09-05.md). Every finding below is from a real page fetch today,
-- 2026-09-05, against each row's own already-known source_url (96/96 rows already had one) --
-- this is "go back to a known source," not cold discovery.
--
-- STATUS: WRITTEN, NOT APPLIED. Per instruction: SQL prepared, CEO/founder packages and applies.
-- Do not run against the live project from here.
--
-- SECTIONS 1/2 (the 8 rows with a specific age/grade value, live-writable today with no
-- migration) were split out per CEO's request into
-- data/opportunity-96-today-writable-2026-09-05.sql -- run that one anytime. Sections 3b/3c and
-- 4 below write to columns from migrations 0126/0129/0133, not yet applied live -- apply those
-- three migrations first, then this file, matching Packages 14/15/16's own two-step pattern.
--
-- Section 3b flag: `country_eligibility_confirmed_open` (used below) is ALSO already live
-- (migration 0060) -- it stayed in this file rather than the split-out one only because the
-- request was specifically for "the 8 rows"; if that scope should include these 23 too, they
-- can move to the today-writable file just as easily, nothing here depends on 0126/0129/0133.
--
-- ============================================================================================
-- SECTION 3a: country -- specific values found, live-writable today (eligible_countries exists)
-- ============================================================================================
-- None. Every country finding this pass was either CONFIRMED_NO_RESTRICTION (section 3b) or too
-- structurally complex for a flat allow-list -- those go to free text instead, section 6 below,
-- per CEO's rule: "if the schema can't express a restriction, don't write a guessed encoding --
-- write the truth to free text."

-- ============================================================================================
-- SECTION 3b: country_eligibility_confirmed_open -- LIVE column (0060, already applied), but
-- per instruction not written from here regardless -- staged exactly like everything else.
-- 21 rows: a clean, explicit "no restriction" statement found on the official page.
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

-- ============================================================================================
-- SECTION 3c: age_eligibility_confirmed_open / grade_eligibility_confirmed_open (0126) --
-- specific text was found, but it names NO specific age/grade values, only confirms "any
-- grade/level within the stated population is fine" -- reclassified from a would-be specific
-- FOUND value to confirmed-open, since writing fabricated specific numbers the source never
-- stated would be worse than the honest "confirmed no restriction" shape.
-- ============================================================================================

-- Davidson Fellows Scholarship (grade) -- https://www.davidsongifted.org/gifted-programs/fellows-scholarship/eligibility/, 2026-09-05 (spot-checked, verbatim match)
-- "eligibility is based on age, not grade level. Students at any grade level are welcome to apply"
update public.opportunities set grade_eligibility_confirmed_open = true where id = '5589e4c8-181a-4a2e-bf16-edd13b274846'::uuid and cardinality(eligible_grades) = 0;

-- International Philosophy Olympiad (grade) -- https://www.philosophy-olympiad.org/?page_id=2, 2026-09-05
-- "open to pupils...enrolled in high school, and to those who graduated...earlier than May the
-- same year...even if enrolled at a university" -- inclusive of every high-school grade plus a
-- narrow post-grad window; no specific grade numbers stated.
update public.opportunities set grade_eligibility_confirmed_open = true where id = '838a79c1-151c-4aef-9622-42db328debb4'::uuid and cardinality(eligible_grades) = 0;

-- Case Western Reserve University Online Pre-College Program (grade) -- https://case.precollegeprograms.org/frequently-asked-questions, 2026-09-05
-- "currently enrolled in high school...or within one year of graduating" -- inclusive of all HS
-- grades plus a gap year; no specific grade numbers stated.
update public.opportunities set grade_eligibility_confirmed_open = true where id = '8ff9158a-476a-4f7a-ac5a-de4553dd4d28'::uuid and cardinality(eligible_grades) = 0;

-- International Physics Olympiad (IPhO) (grade) -- https://www.ipho-new.org/statutes-syllabus/, 2026-09-05 (spot-checked, verbatim match)
-- "students of general or technical secondary schools...may still participate as long as they
-- have not commenced their university studies" -- inclusive of all secondary levels; no
-- specific grade numbers stated.
update public.opportunities set grade_eligibility_confirmed_open = true where id = '96a185f3-09e9-41db-b568-613d512d0e08'::uuid and cardinality(eligible_grades) = 0;

-- UK Chemistry Olympiad (grade) -- https://edu.rsc.org/enrichment/uk-chemistry-olympiad, 2026-09-05
-- Real eligibility statement is "open to all secondary schools and colleges in the British
-- Isles" -- the "Year 12s...GCSE students may find it too advanced" line is ADVISORY framing,
-- not a formal grade gate (confirmed: no "must be in Year X" language anywhere on the page).
update public.opportunities set grade_eligibility_confirmed_open = true where id = '96a437a7-781b-4046-b7ad-baf0069be8e5'::uuid and cardinality(eligible_grades) = 0;

-- ============================================================================================
-- SECTION 4: checked_not_stated -- staged for migrations 0129 (age/grade) and 0133 (country).
-- 104 rows across all three dimensions -- every one genuinely read via a real page fetch today.
-- 'not_researched' (the current default) would misrepresent these as never looked at.
-- ============================================================================================

-- --- age (37 rows) ---
-- Aggie STEM Overnight Camp | https://aggiestem.tamu.edu/overnight-camp/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '43c0c707-3447-4863-8d0d-64c7354c113f'::uuid and age_eligibility_basis = 'not_researched';
-- CU Boulder Precollegiate Development Program (PCDP) | https://www.colorado.edu/precollege/precollegiate-development-program | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '995daf25-80ab-4e9a-bcd7-2cd2b2d9d18a'::uuid and age_eligibility_basis = 'not_researched';
-- Caltech Summer Research Connection (SRC) | https://ctlo.caltech.edu/outreach/summerprograms/summer-research-connection | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '9b6aefb3-a33e-45a1-af06-5a770a92c45a'::uuid and age_eligibility_basis = 'not_researched';
-- Coca-Cola Scholars Program | https://www.coca-colascholarsfoundation.org/apply/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '690eba7f-0de9-4298-b746-c3456391b9b5'::uuid and age_eligibility_basis = 'not_researched';
-- Congressional App Challenge | https://www.congressionalappchallenge.us/students/rules/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '10b69474-db59-4b4d-8a48-11526e7220a7'::uuid and age_eligibility_basis = 'not_researched';
-- Cooke College Scholarship Program | https://www.jkcf.org/our-scholarships/college-scholarship-program/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'b0ba4e37-5665-4ed2-b20c-997d3b09cb6e'::uuid and age_eligibility_basis = 'not_researched';
-- Coolidge Scholarship | https://coolidgescholars.org/eligibilty/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'bc729c68-0511-40bb-a590-e2fbaa277a56'::uuid and age_eligibility_basis = 'not_researched';
-- CyberPatriot - National Youth Cyber Defense Competition | https://www.uscyberpatriot.org/competition/competition-overview | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '4b9e2c29-c38d-479b-9987-c31501601950'::uuid and age_eligibility_basis = 'not_researched';
-- Dive Into Engineering! | https://precollege.usc.edu/summer-programs/discover-engineering/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '16b3d6ae-dfcf-4ac7-b1c8-4a038e552bec'::uuid and age_eligibility_basis = 'not_researched';
-- Genesys Works | https://genesysworks.org/for-students-and-families/application-process/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '4a1ef2dd-ab26-44e0-b6a5-2e49aca13dc0'::uuid and age_eligibility_basis = 'not_researched';
-- Georgia Tech Summer PEAKS (High School Programs) | https://expandedlearning.ceismc.gatech.edu/summer-programs/sessions/high-school | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '51701db6-f571-4ee9-9387-045eed7bb7d4'::uuid and age_eligibility_basis = 'not_researched';
-- Interlochen Arts Camp | https://www.interlochen.org/summer-camp/admission/how-to-apply-to-arts-camp | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '437963fb-9002-4481-bd67-f40e9fc953f1'::uuid and age_eligibility_basis = 'not_researched';
-- International Journal of High School Research (IJHSR) | https://ijhsr.terrajournals.org/submissions.html | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '61558e02-0b11-4221-bbbb-fc98bc765da8'::uuid and age_eligibility_basis = 'not_researched';
-- International Public Policy Forum (IPPF) | https://www.ippfdebate.com/2025-26-contest | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'bc303473-ba94-41e4-9b3d-038804858a8c'::uuid and age_eligibility_basis = 'not_researched';
-- Iowa Young Writers' Studio (Summer Residential Program) | https://iyws.program.uiowa.edu/how-to-apply/summer-residential-program | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'f3487103-c08f-4d56-8ec1-01f93a7eac94'::uuid and age_eligibility_basis = 'not_researched';
-- Istanbul Bilgi University High School Summer School (Lise Yaz Okulu) | https://liseyazokulu.bilgi.edu.tr/tr/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'd780bc55-41e0-444b-8bcc-3f927b28c4b7'::uuid and age_eligibility_basis = 'not_researched';
-- MIT PRIMES | https://math.mit.edu/research/highschool/primes/program/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'b87aba0b-755d-4802-a294-369db2acccd0'::uuid and age_eligibility_basis = 'not_researched';
-- MITES Summer | https://mites.mit.edu/discover-mites/faq-for-prospective-students/faqs-mites-semester-and-mites-summer | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'b80369c3-76bd-47c4-9f9a-25f6503a3ff4'::uuid and age_eligibility_basis = 'not_researched';
-- NYC Commuter Summer — Columbia University Pre-College Programs | https://precollege.sps.columbia.edu/programs/summer-programs/nyc-commuter-summer | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '3318dba7-e099-4de2-83db-f27d6697f1be'::uuid and age_eligibility_basis = 'not_researched';
-- NYLF Medicine & Health Care | https://www.envisionexperience.com/explore-our-programs/national-youth-leadership-forum-medicine | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'b0432a47-ba80-4de6-a121-11ab10495bcb'::uuid and age_eligibility_basis = 'not_researched';
-- National High School Ethics Bowl (NHSEB) | https://nhseb.org/faq | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'ce587c91-a21f-4359-a535-70a9736494f0'::uuid and age_eligibility_basis = 'not_researched';
-- National History Day (NHD) | https://nhd.org/en/contest/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'c2c3e0e3-9c9a-4d8f-ae67-54b37e4cdd85'::uuid and age_eligibility_basis = 'not_researched';
-- Partners for the Future | https://www.cshl.edu/education/partners-for-the-future/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '6005b354-84d0-486f-b9bf-9bc7dcc2ea6c'::uuid and age_eligibility_basis = 'not_researched';
-- Pioneer Research Institute | https://pioneeracademics.com/pioneer-research-institute/admission/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'bdc4bdb5-5893-4e05-bf9c-e520d7da2817'::uuid and age_eligibility_basis = 'not_researched';
-- QuestBridge National College Match | https://www.questbridge.org/apply-to-college/programs/national-college-match | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'a2c63505-1481-4a1f-94cc-6ab86dc35405'::uuid and age_eligibility_basis = 'not_researched';
-- Ron Brown Scholar Program | https://ronbrown.org/ron-brown-scholarship/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'abe62a46-56f4-449a-b008-d072b1be5dc4'::uuid and age_eligibility_basis = 'not_researched';
-- Science Olympiad (Division C) | https://www.soinc.org/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '4a6c3f9a-bb11-4eb2-b304-f832aeb3799a'::uuid and age_eligibility_basis = 'not_researched';
-- Science and Engineering Apprenticeship Program (SEAP) | https://www.onr.navy.mil/education-outreach/k-12-programs/seap | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'c64b7050-75f9-45f8-b2ab-5b6ff14953dc'::uuid and age_eligibility_basis = 'not_researched';
-- The Gates Scholarship | https://www.thegatesscholarship.org/scholarship/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '7a422fba-db1a-42a1-b96f-d3bcdf6afa56'::uuid and age_eligibility_basis = 'not_researched';
-- UNO - United Nations Online | https://stanleyprep.com/united-nations-online/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '31856863-be50-440d-8ccc-229812277425'::uuid and age_eligibility_basis = 'not_researched';
-- USC Pre-College Summer Programs | https://precollege.usc.edu/summer-programs/admission-tuition-fees/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '4a54159a-58dd-4304-a139-2b76f2a9fe38'::uuid and age_eligibility_basis = 'not_researched';
-- Vanderbilt Programs for Talented Youth (PTY) - Summer Institutes & Summer Academy | https://pty.vanderbilt.edu/vsi/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'b23c2cf0-3c44-40f8-8b0b-67315a066c9f'::uuid and age_eligibility_basis = 'not_researched';
-- Wall Street 101 - Virtual Wall Street Classes | https://teachmewallstreet.com/wall-street-101-summer-camp | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '574ab33a-abc7-420e-893a-0b3b6f9d341e'::uuid and age_eligibility_basis = 'not_researched';
-- Washington University in St. Louis College Prep Program (CPP) | https://collegeprep.washu.edu/common-questions/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'd38255f3-6ce2-440c-b302-c39ee6b17cde'::uuid and age_eligibility_basis = 'not_researched';
-- Waterloo Mathematics and Computing Contests | https://cemc.uwaterloo.ca/contests | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8'::uuid and age_eligibility_basis = 'not_researched';
-- We the People: The Citizen and the Constitution | https://www.civiced.org/we-the-people | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = '59998106-2a2c-4e35-ba9b-0bdcd5ca586d'::uuid and age_eligibility_basis = 'not_researched';
-- Wharton Global Youth Program: Leadership in the Business World (LBW) | https://globalyouth.wharton.upenn.edu/programs-courses/leadership-in-the-business-world/ | 2026-09-05
update public.opportunities set age_eligibility_basis = 'checked_not_stated' where id = 'c033f1e9-4642-4a5a-94da-739efadff477'::uuid and age_eligibility_basis = 'not_researched';

-- --- grade (30 rows) ---
-- Ashoka Young Changemakers | https://www.ashoka.org/en-us/program/ashoka-young-changemakers-nomination-and-selection-process | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '1e8e74cf-3bf0-43ad-81a8-c3a4b0e5bc70'::uuid and grade_eligibility_basis = 'not_researched';
-- Breakthrough Junior Challenge | https://breakthroughjuniorchallenge.org/rules | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '0412d94f-8b28-4f37-933c-cf6198914c12'::uuid and grade_eligibility_basis = 'not_researched';
-- Canada/USA Mathcamp | https://www.mathcamp.org/admission/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'a0571b4a-8d05-4fe1-bb6b-790b1fed786f'::uuid and grade_eligibility_basis = 'not_researched';
-- Conrad Challenge (Space Center Houston) | https://conrad.spacecenter.org/the-challenge/rules-and-regulations/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '1f7b2e52-1900-4953-8271-63224c9e1fc0'::uuid and grade_eligibility_basis = 'not_researched';
-- Erasmus+ Youth Exchanges | https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-1/youth-exchanges | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'eeb768c4-606a-4d28-91cf-a4a6a7693949'::uuid and grade_eligibility_basis = 'not_researched';
-- European Union Contest for Young Scientists (EUCYS) | https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/eucys_en | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '40c69cc2-0567-4ac7-bcb0-553dc63770f7'::uuid and grade_eligibility_basis = 'not_researched';
-- European Youth Event (EYE) | https://european-youth-event.europarl.europa.eu/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '1acee3b0-eaac-479a-996a-b0a2a0570351'::uuid and grade_eligibility_basis = 'not_researched';
-- FIRST Global Challenge | https://first.global/fgc/faq/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'f2d65f7a-0927-4ff7-bcf2-d5f12d6385d4'::uuid and grade_eligibility_basis = 'not_researched';
-- Garcia Summer Research Program | https://www.stonybrook.edu/garcia/summer-program/eligibility.html | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'a37fa810-d142-4c07-b272-b3d58a6e6ea5'::uuid and grade_eligibility_basis = 'not_researched';
-- Genç UPSHIFT Sosyal Girişimcilik Programı | https://genclikhizmetleri.gov.tr/hizmetlerimiz/genclik-merkezleri/upshift-programi/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '600c8ff6-6712-4126-8939-23116b242a03'::uuid and grade_eligibility_basis = 'not_researched';
-- Gençlik Merkezleri (Youth Centres) membership — e-Genç | https://e-genc.gsb.gov.tr/SSS?kurumTipEnum=SSS | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'd5790a1c-1238-4510-bdb4-25ce563595f3'::uuid and grade_eligibility_basis = 'not_researched';
-- IE University Pre-University Summer Program | https://www.ie.edu/ie-summer-school/pre-university/pre-university-summer-program/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '41db8ceb-16ea-4215-adc0-7fb7b152649d'::uuid and grade_eligibility_basis = 'not_researched';
-- InvestIN - Immersive Career Experiences | https://investin.org/collections/our-programmes | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '8a7c89e4-e63a-4f64-a76d-4bae1b31e889'::uuid and grade_eligibility_basis = 'not_researched';
-- JA Company Programme (Europe) | https://jaeurope.org/learning-experiences/portfolio/company-programme/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '55a5efea-e280-4176-bf65-49a028b097af'::uuid and grade_eligibility_basis = 'not_researched';
-- Major League Hacking | https://www.mlh.com/seasons/2026/events | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'c8cd2706-7afd-45d9-83cd-f88cc514527d'::uuid and grade_eligibility_basis = 'not_researched';
-- STEM Racing | https://www.stemracing.com/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'c12ce265-c6c4-454b-97f5-680d366813ec'::uuid and grade_eligibility_basis = 'not_researched';
-- Schoolhouse.world Tutor Certification | https://intercom.schoolhouse.world/en/articles/9959206-can-i-become-a-tutor | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '95b3b7dc-5306-40b5-b2e7-8c769fc68128'::uuid and grade_eligibility_basis = 'not_researched';
-- Science and Engineering Apprenticeship Program (SEAP) | https://www.onr.navy.mil/education-outreach/k-12-programs/seap | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'c64b7050-75f9-45f8-b2ab-5b6ff14953dc'::uuid and grade_eligibility_basis = 'not_researched';
-- TechGirls | https://techgirlsglobal.org/apply/eligibility-and-application-2/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '7081b03a-3e04-4843-8bc5-0078cfd040f2'::uuid and grade_eligibility_basis = 'not_researched';
-- Technovation Girls | https://technovationchallenge.org/competition/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '35ddfc5e-1bed-4f28-9655-a1aa3422e554'::uuid and grade_eligibility_basis = 'not_researched';
-- The Diamond Challenge | https://diamondchallenge.org/competition/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '30a605ab-8c51-4f06-9e66-60cc7347c5df'::uuid and grade_eligibility_basis = 'not_researched';
-- The Duke of Edinburgh's International Award — Türkiye | https://www.intaward.org.tr/en/about-us/the-history-of-the-award | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'cdb9da8a-3c8d-47ea-bcee-6cf749738246'::uuid and grade_eligibility_basis = 'not_researched';
-- The Harvard Crimson Global Essay Competition | https://www.essaycomp.org/competition-structure-and-dates | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'c582f1d9-ec28-4335-acd0-4140893dd23f'::uuid and grade_eligibility_basis = 'not_researched';
-- Three Dot Dash Global Teen Leaders | https://www.wearefamilyfoundation.org/three-dot-dash-program | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '4e17909d-ee0f-47c4-a901-44dda548fb9c'::uuid and grade_eligibility_basis = 'not_researched';
-- UK Youth Parliament | https://nya.org.uk/ukyp/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'bd187688-b179-42f8-b82b-8c89c40c51d7'::uuid and grade_eligibility_basis = 'not_researched';
-- University of Applied Sciences and Arts of Western Switzerland | https://www.heia-fr.ch/en/university/events/tech-and-engineering-swiss-summer-camp-2026/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48'::uuid and grade_eligibility_basis = 'not_researched';
-- Winchester College - Discover Summer Program | https://discoverysummer.com/winchester/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57'::uuid and grade_eligibility_basis = 'not_researched';
-- Young Enterprise Company Programme | https://www.young-enterprise.org.uk/what-we-do/programmes/company-programme | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'd500ecf7-69dd-4ecf-98d2-8828f789b5bb'::uuid and grade_eligibility_basis = 'not_researched';
-- İBB Genç Gönüllü Programı | https://gencgonullu.ibb.istanbul/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = 'ae702f36-4442-4979-a65f-4af78f6c1b2e'::uuid and grade_eligibility_basis = 'not_researched';
-- İstanbul Kent Konseyi Gençlik Meclisi — Gençlik Katılım Ağı | https://istanbulkentkonseyi.org.tr/genclik-meclisi/ | 2026-09-05
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '4d2e55b3-8e5d-431b-8d5c-d8b3bbad2dbc'::uuid and grade_eligibility_basis = 'not_researched';

-- --- country (36 rows) ---
-- Aggie STEM Overnight Camp | https://aggiestem.tamu.edu/overnight-camp/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '43c0c707-3447-4863-8d0d-64c7354c113f'::uuid and country_eligibility_basis = 'not_researched';
-- BRI Student Fellowship | https://billofrightsinstitute.org/student-fellowship/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '1d28dd20-3433-407a-a83e-7b71e59c207e'::uuid and country_eligibility_basis = 'not_researched';
-- Barcelona International Youth Science Challenge (BIYSC) | https://biysc.org/faq | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'd9b30fb9-aa85-48ca-ae1b-6c04c5ece736'::uuid and country_eligibility_basis = 'not_researched';
-- CyberPatriot - National Youth Cyber Defense Competition | https://www.uscyberpatriot.org/competition/competition-overview | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '4b9e2c29-c38d-479b-9987-c31501601950'::uuid and country_eligibility_basis = 'not_researched';
-- European Union Contest for Young Scientists (EUCYS) | https://research-and-innovation.ec.europa.eu/funding/funding-opportunities/eucys_en | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '40c69cc2-0567-4ac7-bcb0-553dc63770f7'::uuid and country_eligibility_basis = 'not_researched';
-- European Youth Event (EYE) | https://european-youth-event.europarl.europa.eu/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '1acee3b0-eaac-479a-996a-b0a2a0570351'::uuid and country_eligibility_basis = 'not_researched';
-- FIRST Global Challenge | https://first.global/fgc/faq/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'f2d65f7a-0927-4ff7-bcf2-d5f12d6385d4'::uuid and country_eligibility_basis = 'not_researched';
-- FIRST Robotics Competition | https://www.firstinspires.org/programs/frc/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'db25d327-ee37-4414-9003-f5654f64d3aa'::uuid and country_eligibility_basis = 'not_researched';
-- Freie Universität Berlin SommerUNI | https://www.fu-berlin.de/sites/sommeruni/index.html | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'a22bb8af-8c3d-49a3-948b-714a68aed263'::uuid and country_eligibility_basis = 'not_researched';
-- Gençlik Merkezleri (Youth Centres) membership — e-Genç | https://e-genc.gsb.gov.tr/SSS?kurumTipEnum=SSS | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'd5790a1c-1238-4510-bdb4-25ce563595f3'::uuid and country_eligibility_basis = 'not_researched';
-- Georgia Tech Summer PEAKS (High School Programs) | https://expandedlearning.ceismc.gatech.edu/faq/summer-programs | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '51701db6-f571-4ee9-9387-045eed7bb7d4'::uuid and country_eligibility_basis = 'not_researched';
-- IE University Pre-University Summer Program | https://www.ie.edu/ie-summer-school/pre-university/pre-university-summer-program/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '41db8ceb-16ea-4215-adc0-7fb7b152649d'::uuid and country_eligibility_basis = 'not_researched';
-- Interlochen Arts Camp | https://www.interlochen.org/summer-camp/admission/international-students-camp | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '437963fb-9002-4481-bd67-f40e9fc953f1'::uuid and country_eligibility_basis = 'not_researched';
-- InvestIN - Immersive Career Experiences | https://investin.org/collections/our-programmes | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '8a7c89e4-e63a-4f64-a76d-4bae1b31e889'::uuid and country_eligibility_basis = 'not_researched';
-- Istanbul Bilgi University High School Summer School (Lise Yaz Okulu) | https://liseyazokulu.bilgi.edu.tr/tr/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'd780bc55-41e0-444b-8bcc-3f927b28c4b7'::uuid and country_eligibility_basis = 'not_researched';
-- JA Company Programme (Europe) | https://jaeurope.org/learning-experiences/portfolio/company-programme/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '55a5efea-e280-4176-bf65-49a028b097af'::uuid and country_eligibility_basis = 'not_researched';
-- Major League Hacking | https://www.mlh.com/seasons/2026/events | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'c8cd2706-7afd-45d9-83cd-f88cc514527d'::uuid and country_eligibility_basis = 'not_researched';
-- Millfield School Sixth Form Scholarships and Bursaries | https://www.millfieldschool.com/admissions/scholarship-bursaries | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '5d67ce2b-b627-4d28-a03c-4366acb0e66b'::uuid and country_eligibility_basis = 'not_researched';
-- NYLF Medicine & Health Care | https://www.envisionexperience.com/explore-our-programs/national-youth-leadership-forum-medicine | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'b0432a47-ba80-4de6-a121-11ab10495bcb'::uuid and country_eligibility_basis = 'not_researched';
-- ODTÜ (METU) Engineering Summer School (Mühendislik Yaz Okulu) | https://metusummerschool.org/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '0c8e00c1-b2b7-4039-8021-10a310de62e4'::uuid and country_eligibility_basis = 'not_researched';
-- Parsons Summer Intensive Studies | https://cpe.newschool.edu/youth-and-pre-college/parsons-new-york-summer-intensive-studies/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '692aaffc-b50c-4b9d-a91d-8769a7a46e5c'::uuid and country_eligibility_basis = 'not_researched';
-- RISD Pre-College (On-Campus) | https://precollege.risd.edu/on-campus | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '5a583dbf-eca9-4219-b306-463f9704cf04'::uuid and country_eligibility_basis = 'not_researched';
-- STEM Racing | https://www.stemracing.com/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'c12ce265-c6c4-454b-97f5-680d366813ec'::uuid and country_eligibility_basis = 'not_researched';
-- Schoolhouse.world Tutor Certification | https://intercom.schoolhouse.world/en/articles/9959206-can-i-become-a-tutor | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '95b3b7dc-5306-40b5-b2e7-8c769fc68128'::uuid and country_eligibility_basis = 'not_researched';
-- Science Olympiad (Division C) | https://www.soinc.org/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '4a6c3f9a-bb11-4eb2-b304-f832aeb3799a'::uuid and country_eligibility_basis = 'not_researched';
-- Stockholm Junior Water Prize | https://dsi.gov.tr/Haber/Detay/15454 | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '17aeb772-5ee4-4448-a4af-36cb508ab305'::uuid and country_eligibility_basis = 'not_researched';
-- Technovation Girls | https://technovationchallenge.org/competition/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '35ddfc5e-1bed-4f28-9655-a1aa3422e554'::uuid and country_eligibility_basis = 'not_researched';
-- Three Dot Dash Global Teen Leaders | https://www.wearefamilyfoundation.org/three-dot-dash-program | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '4e17909d-ee0f-47c4-a901-44dda548fb9c'::uuid and country_eligibility_basis = 'not_researched';
-- UNO - United Nations Online | https://stanleyprep.com/united-nations-online/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '31856863-be50-440d-8ccc-229812277425'::uuid and country_eligibility_basis = 'not_researched';
-- University of Applied Sciences and Arts of Western Switzerland | https://www.heia-fr.ch/en/university/events/tech-and-engineering-swiss-summer-camp-2026/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '0f7a1ef0-004a-4ce8-88a1-7161dbb6bc48'::uuid and country_eligibility_basis = 'not_researched';
-- University of Notre Dame Pre-College: Summer Scholars | https://precollege.nd.edu/summer-scholars/eligibility-and-application-requirements/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '445f2003-1b9c-4cc9-bc63-22e65e7d8f85'::uuid and country_eligibility_basis = 'not_researched';
-- Wall Street 101 - Virtual Wall Street Classes | https://teachmewallstreet.com/wall-street-101-summer-camp | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '574ab33a-abc7-420e-893a-0b3b6f9d341e'::uuid and country_eligibility_basis = 'not_researched';
-- Waterloo Mathematics and Computing Contests | https://cemc.uwaterloo.ca/contests | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8'::uuid and country_eligibility_basis = 'not_researched';
-- Wharton Global High School Investment Competition | https://globalyouth.wharton.upenn.edu/competitions/investment-competition/rules-roles/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '2e2f995a-2ac3-4138-a3df-ca4e4033aa36'::uuid and country_eligibility_basis = 'not_researched';
-- Winchester College - Discover Summer Program | https://discoverysummer.com/faq/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = '483c0af4-92e1-4599-a4e9-8ac6eec69a57'::uuid and country_eligibility_basis = 'not_researched';
-- İBB Genç Gönüllü Programı | https://gencgonullu.ibb.istanbul/ | 2026-09-05
update public.opportunities set country_eligibility_basis = 'checked_not_stated' where id = 'ae702f36-4442-4979-a65f-4af78f6c1b2e'::uuid and country_eligibility_basis = 'not_researched';

-- Stockholm Junior Water Prize, GRADE -- https://dsi.gov.tr/Haber/Detay/16801, 2026-09-05
-- Reclassified from an original FOUND: the Turkish source repeats the already-known age range
-- (15-20) and says "lise öğrencileri" (high school students) but names no specific grade number
-- -- a real page read, genuinely uninformative on grade specifically, not a schema-gap case
-- like section 6 below.
update public.opportunities set grade_eligibility_basis = 'checked_not_stated' where id = '17aeb772-5ee4-4448-a4af-36cb508ab305'::uuid and grade_eligibility_basis = 'not_researched';

-- ============================================================================================
-- SECTION 6: free-text restrictions -- CEO's rule, applied: "if the schema can't express a
-- restriction, don't write a guessed encoding -- write the truth to free text." These 4 country/
-- residency findings don't reduce to a flat eligible_countries list or a clean confirmed-open
-- flag, but citizenship_restrictions/residency_restrictions (migration 0008/0047) already exist,
-- are already read by lib/counselor/eligibility.ts, and are already surfaced to the student as
-- an advisory note -- exactly the mechanism this rule calls for. Live-writable today (both
-- columns already exist), staged here anyway per instruction not to write live from this pass.
-- ============================================================================================

-- Breakthrough Junior Challenge -- https://breakthroughjuniorchallenge.org/rules, 2026-09-05
-- Sanctions-list-based, not a stable country name -- would silently go stale the day OFAC's own
-- list changes, exactly the "freshness field that always says fresh" class flagged elsewhere today.
update public.opportunities set residency_restrictions = 'Not eligible if you reside in any country or region subject to comprehensive U.S. economic sanctions, or are otherwise a person U.S. persons cannot transact with under U.S. law.'
  where id = '0412d94f-8b28-4f37-933c-cf6198914c12'::uuid and cardinality(eligible_countries) = 0 and residency_restrictions is null;

-- İstanbul Kent Konseyi Gençlik Meclisi -- https://istanbulkentkonseyi.org.tr/genclik-meclisi/, 2026-09-05
-- A CITY requirement, not a country one -- "Turkey" would read as true but wrongly admit a
-- student living anywhere else in the country.
update public.opportunities set residency_restrictions = 'Open to youth aged 16-29 living in Istanbul specifically (not all of Turkey).'
  where id = '4d2e55b3-8e5d-431b-8d5c-d8b3bbad2dbc'::uuid and cardinality(eligible_countries) = 0 and residency_restrictions is null;

-- Erasmus+ Youth Exchanges -- https://erasmus-plus.ec.europa.eu/programme-guide/part-b/key-action-1/youth-exchanges, 2026-09-05
-- A tiered EU/associated/neighboring-region rule, not a flat list.
update public.opportunities set residency_restrictions = 'Participating organisations must be established in an EU Member State, a non-EU country associated to the Erasmus+ Programme, or a non-associated third country neighbouring the EU (Programme Guide regions 1-4) -- not open by simple country name.'
  where id = 'eeb768c4-606a-4d28-91cf-a4a6a7693949'::uuid and cardinality(eligible_countries) = 0 and residency_restrictions is null;

-- International Physics Olympiad (IPhO) -- https://www.ipho-new.org/statutes-syllabus/, 2026-09-05 (spot-checked, verbatim match)
-- The actual eligibility gate is whether a student's own country fields a national team (an
-- organizing-committee-level invitation system), not a per-student country allow-list.
update public.opportunities set residency_restrictions = 'Participation is by national team, selected per country -- a student''s real eligibility depends on whether their country has an established IPhO delegation, not a simple list of eligible countries.'
  where id = '96a185f3-09e9-41db-b568-613d512d0e08'::uuid and cardinality(eligible_countries) = 0 and residency_restrictions is null;

-- ============================================================================================
-- SECTION 7: FLAGGED -- NOT written above, needs a decision before any SQL is added for these.
-- Full reasoning in docs/opportunity-96-partial-eligibility-findings-2026-09-05.md.
--
-- All 4 remaining items are AGE or GRADE restrictions too complex for the structured columns --
-- the same shape section 6 just resolved for country. The difference: country/citizenship has a
-- free-text fallback already wired into eligibility.ts (citizenship_restrictions/
-- residency_restrictions, migration 0008/0047); AGE and GRADE have no equivalent column at all.
-- Applying CEO's own rule consistently means NOT reusing `description` (a different field, for a
-- different purpose) as an improvised substitute -- that would be the same "guessed encoding"
-- the rule warns against, just at the schema level instead of the value level. Real question for
-- CEO: add `age_restrictions`/`grade_restrictions` text columns mirroring 0047's own pattern
-- exactly (a migration, a number needed), or leave these 4 flagged until such a column exists?
-- ============================================================================================
-- 1. Wharton Global HS Investment Competition, AGE (2e2f995a) -- "at least 16" applies to the
--    team LEADER role only, not every applicant -- writing minimum_age=16 would incorrectly
--    gate every team member.
-- 2. Millfield Sixth Form Scholarships, GRADE (5d67ce2b) -- source names "Year 9 or the Lower
--    Sixth" together; this specific opportunity is the Sixth Form scholarship, so likely only
--    "Lower Sixth" applies -- and that's a UK Year value with nowhere structured to go anyway.
-- 3. Nuffield Research Placements, GRADE (a4c5a08a) -- "in year 12 (or equivalent)" -- the AGE
--    half of this same row (over 16) is written in the today-writable file; this half is not.
-- 4. The Blackstone Law Review Competition, Junior Division, GRADE (e6bdef3f) -- "typically Year
--    12-13 in the UK, or high school juniors and seniors internationally" -- two systems named
--    together, neither reducible to this codebase's numeric eligible_grades convention without
--    inventing a conversion the source itself never states.
