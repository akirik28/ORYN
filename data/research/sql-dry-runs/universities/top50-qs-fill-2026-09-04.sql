-- Top-50 QS fill, 9 universities: Oxford, Princeton, University of Chicago, UPenn,
-- TU Munich, Universite PSL, Edinburgh, King's College London, TU Delft.
-- Full account: docs/fill-9-universities-findings-2026-09-04.md. Every fact below carries
-- its own source_url and retrieval date; anything not findable was left out entirely rather
-- than guessed. Research ran in a Claude Code session (WebSearch/WebFetch/Browser pane) --
-- the live app never called an AI API for any of this.
--
-- ORDERING: section C below references university_statistics.admission_rate_basis, added by
-- supabase/migrations/0119_admission_rate_basis.sql (written not applied). Apply 0119 first --
-- running section C before 0119 fails cleanly with 'column does not exist', which is the
-- correct failure; it does not half-apply. Sections A, B, D have no such dependency and can
-- run independently of 0119's timing.
--
-- BEFORE APPLYING: every INSERT below was checked against what already exists for these 9
-- universities as of 2026-09-04 (queried live, not assumed) to avoid duplicating rows another
-- pass already staged -- Delft, KCL, and Edinburgh already had real, well-sourced tuition
-- figures in university_profile_metrics from a 2026-08-16/19 UK/NL acquisition pass, and are
-- deliberately NOT touched again here. Section A is the one place this pass found existing
-- staged data that looks wrong, not just incomplete -- read it before anything else.


-- ============================================================================================
-- SECTION A -- CORRECTION, READ FIRST: TU Munich's existing tuition_international_annual
-- row appears to be wrong, sourced from a weaker tier than what this pass found.
-- ============================================================================================
--
-- The existing row (verified 2026-08-18, university_id 52409036-32ff-47ff-9815-c96a4bc89125)
-- sets BOTH tuition_domestic_annual and tuition_international_annual to 0, with a note citing
-- studying-in-germany.org (a third-party explainer, not TUM's own domain or an official
-- government source) and explicitly stating: "not a per-institution fee page individually
-- re-read this pass -- the fact being verified is a state-level policy, not an institutional
-- choice." Its reasoning: only Baden-Wurttemberg charges non-EU tuition, and TUM is in Bavaria.
--
-- This pass fetched TUM's OWN fees page directly (https://www.tum.de/en/studies/fees/tuition,
-- retrieved 2026-09-04) and found: "Bachelor's degree programs: usually 2,000 or 3,000 euros
-- per semester" for non-EU/EEA students, and "EU/EEA citizens are not required to pay tuition
-- fees" for the domestic case. Domestic matches the existing row (0 -- confirmed, not
-- disturbed below). International does not: TUM is a real, current exception to the general
-- Bavarian policy the existing row generalized from, per TUM's own page. Per the source-
-- priority rule (university's own page over a third-party explainer), this correction updates
-- the existing row rather than inserting a conflicting second one -- university_profile_metrics
-- has no unique constraint on (university_id, metric_code), so a second row would leave
-- lib/universities/queries.ts's getAllResolvedTuitionAmounts to pick between two same-metric
-- rows arbitrarily (whichever the unordered-within-university_id page returns first), the
-- exact "silently wrong for some readers" failure this whole fill is trying to avoid.
--
-- value_numeric uses the LOW end (2,000 EUR/semester x 2 = 4,000 EUR/year) as a conservative
-- anchor, matching scripts/acquire-university-statistics-uk.ts's own established convention
-- for a range ("never the number a student would actually be quoted without knowing their
-- course"); the full range is in notes. precision_state changes from 'exact' to 'range'
-- accordingly.
--
-- Review this section on its own before applying -- it changes a "free" claim to a "not free"
-- claim for real students, which is a bigger call than the additions in the rest of this file.
update university_profile_metrics
set
  value_numeric = 4000,
  precision_state = 'range',
  notes = 'CORRECTED 2026-09-04 (was 0, sourced to a third-party generalization about German state tuition policy not individually re-checked against this institution). TUM''s own fees page states non-EU/EEA bachelor''s tuition is "usually 2,000 or 3,000 euros per semester" (4,000-6,000 EUR/year) -- TUM is a real, current exception to the general Bavarian no-tuition policy. value_numeric is the low end (2,000 EUR/semester x 2), a conservative anchor, not a guaranteed figure -- the real range is 4,000-6,000 EUR/year depending on program. Semesterbeitrag (student-union dues, ~150-350 EUR/semester nationally) is separate and not itemised here, same as the prior row.',
  source_url = 'https://www.tum.de/en/studies/fees/tuition',
  verified_at = '2026-09-04T00:00:00Z',
  updated_at = now()
where university_id = '52409036-32ff-47ff-9815-c96a4bc89125'
  and metric_code = 'tuition_international_annual'
  and value_numeric = 0; -- guards against re-running after a manual fix already changed this


-- ============================================================================================
-- SECTION B -- university_requirements: UChicago, UPenn, TU Munich, PSL
-- ============================================================================================
-- TU Munich and PSL each already had 2 requirement rows (uni-assist/TUMonline deadline
-- mechanics for TUM; a general "follow these steps" pointer + "bachelor's are selective" for
-- PSL) -- checked live before writing these, and every row below is a genuinely different
-- fact from a different or more specific page, not a restatement.

-- UChicago (0 existing rows) -- collegeadmissions.uchicago.edu/apply/application/required-materials/, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'standardized_test',
 'No Harm testing policy: submitting an SAT or ACT is optional; any score submitted is only used if it helps the application',
 'Submitting an SAT or ACT is optional and not required for admission. "No Harm" policy: any SAT or ACT score submitted will only be used in review if it will positively affect an applicant''s chance of admission. Test scores that may negatively impact an admission decision will not be considered in review. Applies to domestic, international, and transfer applicants alike.',
 false, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'recommendation',
 'Two teacher evaluations required, from teachers who taught an academic subject',
 'We require two recommendations from teachers who have taught you in an academic subject (high school teachers for first-year applicants; college instructors for transfer applicants). An optional third supplemental letter from another teacher, employer, or mentor is also accepted.',
 true, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'essay',
 'Common/Coalition personal statement plus a UChicago Supplement: one extended essay (choice of prompts) and one short "why UChicago" essay',
 'Personal statement via the Common or Coalition Application, sent to every school applied to. Plus the UChicago Supplement: one extended essay of your choice from a list of prompts, and one short essay on why you would like to attend the University of Chicago.',
 true, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'supplemental_requirement',
 'Application fee $90, automatic waiver for applicants requesting need-based financial aid',
 'The University of Chicago does not charge an application fee for students applying for need-based financial aid. For students not applying for need-based financial aid, the application fee is $90.',
 true, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'curriculum',
 'No specific required course set, but the most challenging and rigorous coursework available is encouraged',
 'The University of Chicago does not require high school applicants to complete any specific set of courses for admission, but instead encourages students to pursue the most challenging and rigorous coursework available to them.',
 false, false, 'high', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', '2026-09-04', 'fresh', 'verified_current');

-- UPenn (0 existing rows) -- admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'standardized_test',
 'Testing REQUIRED starting the 2025-26 cycle (previously test-optional); hardship waiver available',
 'Penn applicants are required to submit the SAT or ACT. Applicants who face hardship in meeting this requirement can submit a waiver directly through the application instead. Confirmed on the primary admissions page specifically because this policy changed recently from test-optional.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'recommendation',
 'Two required letters (school counselor + one core-subject teacher), one further optional letter permitted',
 'Two required letters of recommendation: one from a school counselor or college official, and one from a teacher in a core subject area. One optional letter from a second teacher or community supporter is also permitted.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'essay',
 'Three prompts: a 150-200 word thank-you note, a 150-200 word "community at Penn" response, and one school-specific prompt',
 '(1) "Write a short thank-you note to someone you have not yet thanked and would like to acknowledge" (150-200 words). (2) "How will you explore community at Penn?" (150-200 words). (3) A school-specific prompt unique to the undergraduate school applied to.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'supplemental_requirement',
 'Application fee $75, waivers available through the application platform',
 'The application fee to apply to Penn is $75. Fee waivers are available through the application platform.',
 true, false, 'high', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', '2026-09-04', 'fresh', 'verified_current');

-- TU Munich (2 existing rows, both different facts -- see header) -- tum.de, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('52409036-32ff-47ff-9815-c96a4bc89125', 'curriculum',
 'University entrance qualification required (Abitur for German applicants); foreign qualifications evaluated via Uni-Assist',
 'To be admitted to TUM, you must hold a university entrance qualification. For German applicants, the Abitur or equivalent. Foreign higher education entrance qualifications are evaluated, often through Uni-Assist, which handles recognition of international university entrance qualifications.',
 true, false, 'high', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', '2026-09-04', 'fresh', 'verified_current'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'entrance_exam',
 'Most programs subject to an aptitude assessment; TUM categorizes programs as unrestricted, restricted (Numerus Clausus), or aptitude-assessment -- program-specific',
 'The majority of applicants are subject to an aptitude assessment. Programs are categorized as unrestricted (no selection process), restricted (Numerus Clausus / NC), or subject to aptitude assessment (both Bachelor and Master levels) -- which applies depends on the individual program.',
 false, false, 'medium', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', '2026-09-04', 'fresh', 'verified_current'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'language_proficiency',
 'German-taught programs: DSH-2, or TestDaF level 4 (all sections), or telc Deutsch C1 Hochschule, or DSD II level B2 (all four sections), or Goethe/OSD Certificate C2',
 'Accepted German-language certificates for programs taught in German: DSH passed with an overall result of at least DSH-2; TestDaF with level 4 in all sections; telc Deutsch C1 Hochschule; DSD II with level B2 in all four sections; Goethe Certificate C2; OSD Certificate C2. Aerospace and Information Engineering bachelor''s programs accept a lower tier (DSH-1, DSD I, telc A2, TestDaF level 3, Goethe/OSD A2) as a program-specific exception.',
 true, false, 'high', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates', '2026-09-04', 'fresh', 'verified_current'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'english_proficiency',
 'English-taught programs (incl. the Management & Technology bachelor''s): TOEFL iBT 88, or IELTS Academic 6.5, or Cambridge CAE/CPE grade A/B/C, or PTE Academic 65+',
 'Accepted English-language certificates for English-taught programs: TOEFL iBT minimum score 88; IELTS Academic minimum overall band score 6.5; Cambridge CAE or CPE with grades A, B, or C; PTE Academic overall score at least 65. Waivable with a full secondary school education in English, or a prior degree where the language of instruction was English in at least 50% of the program.',
 true, false, 'high', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates', '2026-09-04', 'fresh', 'verified_current');

-- Universite PSL (2 existing rows, both different facts -- see header) -- psl.eu, retrieved 2026-09-04
insert into university_requirements (university_id, requirement_type, title, requirement_detail, is_required, is_exclusion, data_confidence, source_url, retrieved_at, data_status, verification_state) values
('42f43a53-b072-4734-8c22-6499b1254b04', 'application_deadline',
 'French-track applicants (EU or French baccalaureate) apply via Parcoursup; 2026 cycle: registration opened January 19, confirm-choices deadline April 1',
 'French-track undergraduate applicants apply through the Parcoursup platform. 2026 admissions cycle: start of registration and program-choice drafting January 19, 2026; final deadline to confirm choices April 1, 2026. Selection process described as highly selective, prioritizing geographical, social, and cultural diversity; exact requirements vary by the specific PSL member school/program.',
 true, false, 'high', 'https://psl.eu/en/education/applying-bachelors-degree', '2026-09-04', 'fresh', 'verified_current'),
('42f43a53-b072-4734-8c22-6499b1254b04', 'international_requirement',
 'Non-EU applicants outside Etudes en France use the DAP procedure; those inside apply via Mon Master/PSL portals then Etudes en France pre-consular formalities; Dauphine-PSL requires both its own portal AND Etudes en France',
 'Non-EU applicants living outside the Etudes en France network use the DAP (Demande d''Admission Prealable) procedure. Those in Etudes-en-France-covered countries apply via Mon Master or PSL portals, then create an "Etudes en France" application for pre-consular formalities, then request a student visa through the French Embassy/Consulate. Dauphine-PSL specifically requires applying through BOTH the Etudes en France portal and its own Dauphine-PSL application portal.',
 true, false, 'high', 'https://psl.eu/en/international-admissions-procedures-psl', '2026-09-04', 'fresh', 'verified_current');


-- ============================================================================================
-- SECTION C -- university_statistics: Oxford, Edinburgh, TU Munich, TU Delft
-- (none of these 4 had an existing row -- has_stats was false for all)
-- REQUIRES migration 0119 applied first (admission_rate_basis).
-- ============================================================================================

-- Oxford: real admitted-count/demographic facts exist but don't map to any column here (no
-- applicant/offer totals found -- see docs/fill-9-universities-findings-2026-09-04.md).
-- admission_rate_basis omitted -- the column default ('not_researched') is the honest, correct
-- value: this is a genuine "haven't found it" gap, not a structural absence.
-- cost_of_attendance deliberately null -- see the findings doc's schema-gap section; the real
-- figures (Home GBP 10,050 / Overseas GBP 39,620-66,580, 2027/28) belong in
-- university_profile_metrics as a fill, not forced into this scalar column.
insert into university_statistics (university_id, stat_year, source, data_confidence, retrieved_at) values
('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 2025, 'https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students', 'medium', '2026-09-04T00:00:00Z');

-- Edinburgh: a genuinely clean single figure -- 2025 cycle, 68,862 applications, 36,195
-- offers, 53% offer rate, 7,626 acceptances. Using offer rate as the admission_rate analog,
-- matching how Princeton's own already-stored figure works (offers/applicants).
insert into university_statistics (university_id, stat_year, admission_rate, admission_rate_basis, source, data_confidence, retrieved_at) values
('e2feb81c-1bda-4889-8aa9-37783b720901', 2025, 0.53, 'published', 'https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics', 'high', '2026-09-04T00:00:00Z');

-- TU Munich: no admission_rate to report -- Germany's admission system is
-- unrestricted/NC/aptitude-assessment PER PROGRAM, not a single university-wide rate. This is
-- the structural case admission_rate_basis exists to distinguish from "not yet researched."
insert into university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at) values
('52409036-32ff-47ff-9815-c96a4bc89125', 'no_single_rate', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', 'high', '2026-09-04T00:00:00Z');

-- TU Delft: same reasoning as TU Munich, different mechanism -- 6 selective numerus-fixus
-- programs (Aerospace Engineering, Computer Science & Engineering, Architecture, Clinical
-- Technology, Nanobiology, +1) with per-department selection since 2017; the rest are
-- open-admission subject to meeting the diploma requirement. Most of the university has no
-- rate to report at all, not a gap in research.
-- `source` kept short, matching every other row's style (a plain display label, never a
-- clickable href -- app/(app)/universities/[id]/page.tsx passes it as SourceBadge's
-- sourceName only, no url prop); the two-page derivation is in this comment, not the value.
insert into university_statistics (university_id, admission_rate_basis, source, data_confidence, retrieved_at) values
('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'no_single_rate', 'https://www.tudelft.nl', 'high', '2026-09-04T00:00:00Z');


-- ============================================================================================
-- SECTION D -- university_sources: Princeton rollup (existing, already-verified citations
-- surfaced into the tracking table) + new specific pages actually used for sections B/C above
-- ============================================================================================
-- 'official_government_dataset' is a new source_type label (approved 2026-09-04) -- the
-- product's own source-priority list (AGENTS.md: official university site > official
-- government dataset > ...) already distinguishes this tier; university_sources.source_type
-- is plain text, not an enum, so no migration is needed to introduce it.

-- Princeton: pure rollup. Every fact below was already in the database (programs verified
-- 2026-08-17/21, requirements verified 2026-08-21 and 2026-09-03, statistics from College
-- Scorecard verified 2026-08-18) -- this section adds no new claims, only makes the existing
-- sourcing visible in the table the depth-check actually reads.
insert into university_sources (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt) values
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://ua.princeton.edu/fields-study/departmental-majors-degree-bachelor-arts', 'ua.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'A.B. degree program listing, Princeton Office of the Dean of the College.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://ua.princeton.edu/fields-study/departmental-majors-degree-bachelor-science-engineering', 'ua.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'B.S.E. degree program listing, Princeton Office of the Dean of the College.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://spia.princeton.edu/academics/undergraduate-program', 'spia.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton School of Public and International Affairs undergraduate program page.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://engineering.princeton.edu/departments/operations-research-and-financial-engineering', 'engineering.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton Engineering department page, ORFE.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://engineering.princeton.edu/departments/computer-science', 'engineering.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton Engineering department page, Computer Science.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://economics.princeton.edu/undergraduate-program/', 'economics.princeton.edu', 'official_primary', '2026-08-17T00:00:00Z', 'high', 'Princeton Economics department undergraduate program page.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/how-apply/application-dates-deadlines/single-choice-early-action', 'admission.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'Single-Choice Early Action dates and deadlines.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/princeton-specific-questions', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Princeton-specific supplemental essay prompts.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/standardized-testing', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Standardized testing policy, current and upcoming cycles.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/application-checklist', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'First-year application checklist.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/before-you-apply', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Curriculum expectations before applying.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/graded-written-paper', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Graded written paper submission requirement.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://finaid.princeton.edu/apply-aid-prospective-students', 'finaid.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'Financial aid application process for prospective students.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/international-students', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'International student application requirements.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/apply/us-military-applicants', 'admission.princeton.edu', 'official_primary', '2026-08-21T00:00:00Z', 'high', 'US military applicant process.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://admission.princeton.edu/faqs', 'admission.princeton.edu', 'official_primary', '2026-09-03T00:00:00Z', 'high', 'Admissions FAQ, incl. GPA/class rank policy.'),
('42a2cc3c-ee6b-42e7-8812-822718f68094', 'https://collegescorecard.ed.gov/school/?186131-Princeton-University=', 'collegescorecard.ed.gov', 'official_government_dataset', '2026-08-18T00:00:00Z', 'high', 'US Dept. of Education College Scorecard, UNITID 186131 -- admission_rate/SAT/ACT/graduation_rate/cost_of_attendance source, independently cross-checked 2026-09-04 (stored 4.62% admission_rate matches Scorecard''s own published figure).');

-- New specific pages this pass actually extracted facts from, beyond what each university's
-- existing (generic homepage-level) source rows already cite.
insert into university_sources (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt) values
('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 'https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students', 'ox.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'medium', '"In 2025, 3,302 students were admitted to Oxford to begin their undergraduate studies; 79% of undergraduate students admitted were from the UK."'),
('e5164eb3-88c1-4ecc-81d7-d591ea0c34ea', 'https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/course-fees', 'ox.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'high', '2027/28 course fees: Home GBP 10,050/yr; Overseas GBP 39,620-66,580/yr, varies by course.'),
('4e05164a-d824-4bc3-8bfe-676c89d809ab', 'https://collegeadmissions.uchicago.edu/apply/application/required-materials/', 'collegeadmissions.uchicago.edu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Full first-year application requirements: testing, recommendations, essays, fee.'),
('1185e720-36d4-4bbc-b4bb-fced79b73532', 'https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements', 'admissions.upenn.edu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Full first-year application requirements, incl. the 2025-26 testing-policy change to required.'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements', 'tum.de', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Entrance qualification and aptitude-assessment admission process.'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates', 'tum.de', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'German and English language certificate requirements, exact levels.'),
('52409036-32ff-47ff-9815-c96a4bc89125', 'https://www.tum.de/en/studies/fees/tuition', 'tum.de', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Non-EU/EEA bachelor''s tuition: "usually 2,000 or 3,000 euros per semester" -- the correction basis for Section A.'),
('42f43a53-b072-4734-8c22-6499b1254b04', 'https://psl.eu/en/education/applying-bachelors-degree', 'psl.eu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'Parcoursup process and 2026 cycle dates for bachelor''s applicants.'),
('42f43a53-b072-4734-8c22-6499b1254b04', 'https://psl.eu/en/international-admissions-procedures-psl', 'psl.eu', 'official_primary', '2026-09-04T00:00:00Z', 'high', 'DAP and Etudes en France procedures for non-EU applicants.'),
('e2feb81c-1bda-4889-8aa9-37783b720901', 'https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics', 'study.ed.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'high', '2025 cycle: 68,862 applications, 36,195 offers, 53% offer rate, 7,626 acceptances.'),
('5b97d896-2a17-47ec-84ae-b544183bbd4f', 'https://www.kcl.ac.uk/about/strategy/learning-and-teaching/admissions-statistics', 'kcl.ac.uk', 'official_primary', '2026-09-04T00:00:00Z', 'medium', 'Admissions statistics published per faculty (9 PDFs), no university-wide aggregate -- basis for leaving admission_rate unset.'),
('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'https://www.tudelft.nl/en/education/study-programme-orientation/practical-matters/tuition-fee-finances', 'tudelft.nl', 'official_primary', '2026-09-04T00:00:00Z', 'medium', 'Statutory vs institutional tuition-rate structure and DUO reference.'),
('b3e69141-b7fb-474a-a8df-44804aedd5f5', 'https://duo.nl/particulier/tuition-fees.jsp', 'duo.nl', 'official_government_dataset', '2026-09-04T00:00:00Z', 'high', '"EUR 2.694,-" statutory tuition fee, 2026-2027 academic year.');
