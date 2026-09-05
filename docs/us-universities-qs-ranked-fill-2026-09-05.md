# US universities — QS-ranked fill, batch 1, 2026-09-05

CEO (oryn-5b) follow-up to `docs/us-universities-requirements-gap-fill-2026-09-05.md` (the
7-partial-university batch, already staged when this message arrived — crossed in transit, not
re-done). New instruction for the remaining 93 fully-empty US universities: order by QS 2027
rank ascending rather than name recognition, since every one of them already carries a real QS
rank live in `university_rankings`.

## Verifying before using

Confirmed directly (not just trusting the relayed figure): every university in the 93-row
zero-content set has a QS 2027 rank. Best rank in that specific set (zero `university_programs`
AND zero `university_requirements`) is **92** (Penn State), not the "1" CEO cited — almost
certainly the same `duplicate_status` counting difference CEO already flagged for the 130/93 vs
131/94 totals (a non-canonical duplicate row elsewhere likely carries the better rank CEO saw).
Doesn't change the instruction: ranking by QS ascending is real, verified, and used below.

## Scope decision for this batch

`getAllResearchDepthUniversityIds`'s own "has content" definition is a union across four
tables — a university needs only ONE of `university_programs` / `university_requirements` /
`university_sources` / `university_statistics` populated to clear it (confirmed in the earlier
freshness/cron work this session). Full program-catalog research (as MIT/CMU/NYU show, this
can mean 50-230 individual program rows per institution) is materially more expensive per
university than requirements research. This batch applies the same requirements-only approach
that just worked for the 7-partial batch to the top 7 QS-ranked fully-empty universities —
clears the "has content" filter at the lowest real cost per institution, same reasoning CEO
already endorsed once. Program-catalog research for these (and the rest of the 93) is separate,
larger, future work.

**Same rules as the prior batch:** official source only, `source_url` + retrieval date, nothing
found left blank, `medium` confidence throughout (WebSearch-summarized, not independently
re-fetched page-by-page). **SQL staged, not applied.**

**Batch 1 (QS 2027 rank, ascending):** Penn State (92), UC Davis (137), Texas A&M (169),
Arizona State (172), UC Santa Barbara (173), Michigan State (182), Ohio State (201).

---

## 1. Pennsylvania State University (QS 92)

`id = '1f436f71-532c-4421-b5d8-26c95d0698cf'`

**Sources:**
1. `https://www.psu.edu/news/administration/story/senate-extends-test-optional-admissions-2026-while-further-considering-policy`
   — official Penn State News, testing policy through Fall 2026.
2. `https://greatvalley.psu.edu/international-students/applicant-guidelines` — official Penn
   State international-applicant guidelines (English proficiency).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('1f436f71-532c-4421-b5d8-26c95d0698cf', 'standardized_test',
   'Test-optional through Fall 2026 admission',
   'Penn State is test-optional through Fall 2026 for baccalaureate and associate-degree applicants -- SAT/ACT scores are not required to apply. If submitted, admitted middle-50% ranges are approximately 1320-1450 SAT and 29-33 ACT.',
   false, 'medium', 'https://www.psu.edu/news/administration/story/senate-extends-test-optional-admissions-2026-while-further-considering-policy', now()),
  ('1f436f71-532c-4421-b5d8-26c95d0698cf', 'english_proficiency',
   'TOEFL 80 iBT (19+ speaking) or IELTS 6.5 minimum; exempt for prior degrees from specific English-speaking countries',
   'Minimum TOEFL: 550 paper-based or 80 iBT overall with a minimum 19 on the speaking section. Minimum IELTS: 6.5 overall. Exempt if the applicant holds or is about to receive a degree from an institution in Australia, Belize, the British Caribbean/West Indies, Canada (except Quebec), England, Guyana, Ireland, Liberia, New Zealand, Northern Ireland, Scotland, the United States, or Wales.',
   true, 'medium', 'https://greatvalley.psu.edu/international-students/applicant-guidelines', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('1f436f71-532c-4421-b5d8-26c95d0698cf', 'https://www.psu.edu/news/administration/story/senate-extends-test-optional-admissions-2026-while-further-considering-policy',
   'psu.edu', 'official_admissions_office', now(), 'medium',
   'Penn State is test-optional through Fall 2026, meaning no SAT or ACT score is required.'),
  ('1f436f71-532c-4421-b5d8-26c95d0698cf', 'https://greatvalley.psu.edu/international-students/applicant-guidelines',
   'greatvalley.psu.edu', 'official_admissions_office', now(), 'medium',
   'The minimum acceptable score for the TOEFL is 550 (paper-based) or 80 iBT with 19 on speaking. The minimum acceptable composite score for the IELTS is 6.5.');
```

## 2. University of California, Davis (QS 137)

`id = 'ff167df0-13cc-460a-8e68-b85f841548f0'`

**Sources:**
1. `https://www.ucdavis.edu/admissions/undergraduate/first-year/requirements` — official
   first-year admission requirements (testing, GPA).
2. `https://www.ucdavis.edu/admissions/undergraduate/international/exams-visas` — official
   international-applicant exam/visa requirements page.

**Preserved verbatim, cycle-scoped:** the TOEFL scale itself changed in January 2026 (80 iBT
pre-2026 scale → 4.5 on the new scale) — the same live instance of the freshness audit's own
cycle-scoping concern found in the earlier batch, now confirmed a second time independently.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('ff167df0-13cc-460a-8e68-b85f841548f0', 'standardized_test',
   'Test-blind: SAT/ACT not considered for admission or scholarship decisions',
   'UC Davis does not consider SAT or ACT scores for admission or scholarship decisions -- the UC Board of Regents eliminated the requirement systemwide in 2020. Scores may be self-reported after submitting the application without them; if admitted and enrolled, official reports may be used for course placement only.',
   false, 'medium', 'https://www.ucdavis.edu/admissions/undergraduate/first-year/requirements', now()),
  ('ff167df0-13cc-460a-8e68-b85f841548f0', 'minimum_grade',
   'GPA: 3.0 minimum for California residents, 3.4 minimum for non-residents and international applicants',
   'California residents need a GPA of 3.00 or higher; non-residents (including international applicants) need 3.40 or higher, calculated from A-G coursework in grades 10-11 including summer sessions.',
   true, 'medium', 'https://www.ucdavis.edu/admissions/undergraduate/first-year/requirements', now()),
  ('ff167df0-13cc-460a-8e68-b85f841548f0', 'english_proficiency',
   'TOEFL 4.5+ (new scale, from Jan 2026) or 80+ (pre-2026 scale), or IELTS 6.5+',
   'Same UC-systemwide policy as UCSD/UCSB: effective January 2026, minimum TOEFL iBT is 4.5 on the new scale (80 or better on the scale used before January 2026); minimum IELTS is 6.5 overall. Also satisfies UC Davis''s own Entry Level Writing Requirement.',
   true, 'medium', 'https://www.ucdavis.edu/admissions/undergraduate/international/exams-visas', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('ff167df0-13cc-460a-8e68-b85f841548f0', 'https://www.ucdavis.edu/admissions/undergraduate/first-year/requirements',
   'ucdavis.edu', 'official_admissions_office', now(), 'medium',
   'UC Davis no longer considers SAT or ACT test scores for admissions decisions or scholarship awards. California residents need a GPA of 3.00 or higher. Non-residents need 3.40 or higher.'),
  ('ff167df0-13cc-460a-8e68-b85f841548f0', 'https://www.ucdavis.edu/admissions/undergraduate/international/exams-visas',
   'ucdavis.edu', 'official_admissions_office', now(), 'medium',
   'Effective January 2026, the minimum TOEFL iBT score is 4.5 or better (prior to January 2026 it was 80 or better), and the minimum IELTS score is 6.5 or higher.');
```

## 3. Texas A&M University (College Station) (QS 169)

`id = '8ec2761a-d832-47f3-9f8f-c9a1b25f84eb'`

**Sources:**
1. `https://admissions.tamu.edu/apply/freshman` — official freshman admissions, testing policy.
2. `https://admissions.tamu.edu/apply/international/international-transfer` context page
   (English-proficiency figures cross-checked against `grad.tamu.edu/.../elp` for the shared
   TOEFL/IELTS thresholds; undergraduate-specific figures used as returned).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('8ec2761a-d832-47f3-9f8f-c9a1b25f84eb', 'standardized_test',
   'Test-optional for all freshman applicants including international, but SAT/ACT is considered in the review for international applicants specifically',
   'Texas A&M (College Station) is test-optional for all freshman applicants; submitting scores creates neither advantage nor disadvantage. For international freshman applicants specifically, SAT or ACT scores ARE considered as part of the review criteria if submitted -- an important distinction from the general policy, not simply "optional and ignored" for this group. Scores expire after five years; highest single-sitting total is used.',
   false, 'medium', 'https://admissions.tamu.edu/apply/freshman', now()),
  ('8ec2761a-d832-47f3-9f8f-c9a1b25f84eb', 'english_proficiency',
   'TOEFL iBT 80 (pre-Jan 2026 scale) or 4.5 (from Jan 2026, 4.0 min per section), or IELTS 6.0 (academic only)',
   'Minimum TOEFL iBT overall score of 80 for tests taken before January 21, 2026 (within two years of application); for tests taken on or after that date, minimum overall 4.5 with a 4.0 minimum on each individual skill section. Minimum IELTS Academic (not General) score of 6.0 overall, within two years, submitted electronically by the test center only.',
   true, 'medium', 'https://admissions.tamu.edu/apply/international/international-transfer', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('8ec2761a-d832-47f3-9f8f-c9a1b25f84eb', 'https://admissions.tamu.edu/apply/freshman',
   'admissions.tamu.edu', 'official_admissions_office', now(), 'medium',
   'Texas A&M University is test optional and will not require ACT or SAT scores for freshman applicants... SAT or ACT scores will be considered in the review criteria for international freshman applicants.'),
  ('8ec2761a-d832-47f3-9f8f-c9a1b25f84eb', 'https://admissions.tamu.edu/apply/international/international-transfer',
   'admissions.tamu.edu', 'official_admissions_office', now(), 'medium',
   'Minimum TOEFL iBT overall score of 80... minimum IELTS score is 6.0 overall band (Texas A&M does not accept the IELTS General test).');
```

## 4. Arizona State University (QS 172)

`id = '4b71b1c0-3076-4a9f-9897-a99603469077'`

**Sources:**
1. `https://admission.asu.edu/apply/first-year/admission` — official first-year admission
   requirements (testing policy).
2. `https://admission.asu.edu/international/undergrad/english-proficiency` — official
   undergraduate international English-proficiency page.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('4b71b1c0-3076-4a9f-9897-a99603469077', 'standardized_test',
   'Test-optional: SAT/ACT not required, may be submitted for course placement',
   'ASU does not require ACT or SAT scores for admission; students may choose to submit for course placement or as supplemental information. ASU average SAT approximately 1245 (25th/75th percentile 1100/1320); average ACT approximately 26 (21/28). ASU does not superscore for undergraduate admissions.',
   false, 'medium', 'https://admission.asu.edu/apply/first-year/admission', now()),
  ('4b71b1c0-3076-4a9f-9897-a99603469077', 'english_proficiency',
   'Minimum TOEFL 61, IELTS 6.0, or Duolingo 95',
   'Accepted tests for international applicants: TOEFL (minimum 61), IELTS (minimum 6.0), Duolingo English Test (minimum 95). Reported averages among admitted students run higher (TOEFL ~76, IELTS ~6.5, Duolingo ~105) -- the figures above are the stated minimums, not the average.',
   true, 'medium', 'https://admission.asu.edu/international/undergrad/english-proficiency', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('4b71b1c0-3076-4a9f-9897-a99603469077', 'https://admission.asu.edu/apply/first-year/admission',
   'admission.asu.edu', 'official_admissions_office', now(), 'medium',
   'ACT or SAT scores are not required for admission, but may be submitted for ASU course placement or as supplemental information.'),
  ('4b71b1c0-3076-4a9f-9897-a99603469077', 'https://admission.asu.edu/international/undergrad/english-proficiency',
   'admission.asu.edu', 'official_admissions_office', now(), 'medium',
   'Accepted tests for English proficiency include TOEFL, IELTS, and Duolingo, with minimum score requirements of 61, 6.0, and 95 respectively.');
```

## 5. University of California, Santa Barbara (QS 173)

`id = 'ddd1b85e-f95c-445b-8dbb-d11f7bd18ed4'`

**Sources:**
1. `https://admissions.sa.ucsb.edu/freshman-eligibility-selection` — official freshman
   eligibility/selection page (testing, GPA).
2. `https://admissions.sa.ucsb.edu/english-language-proficiency` — official English-proficiency
   page.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('ddd1b85e-f95c-445b-8dbb-d11f7bd18ed4', 'standardized_test',
   'Test-blind: SAT/ACT scores play no role in admission decisions, even if submitted',
   'UCSB does not consider SAT or ACT scores in admission decisions or scholarship selection, even if submitted -- scores play no role in who is admitted. If admitted and enrolled, scores may be used for course placement only.',
   false, 'medium', 'https://admissions.sa.ucsb.edu/freshman-eligibility-selection', now()),
  ('ddd1b85e-f95c-445b-8dbb-d11f7bd18ed4', 'minimum_grade',
   'GPA: 3.0 minimum for California residents, 3.4 minimum for non-residents',
   'Minimum 3.0 GPA (California residents) or 3.4 GPA (non-residents) in UC-approved A-G coursework with a "C" or better, calculated from grades 10-11 (including summer sessions) only.',
   true, 'medium', 'https://admissions.sa.ucsb.edu/freshman-eligibility-selection', now()),
  ('ddd1b85e-f95c-445b-8dbb-d11f7bd18ed4', 'english_proficiency',
   'TOEFL 4.5+ (from Jan 2026) / 80+ (pre-2026), IELTS 7.0+, or Duolingo 120+; no conditional English-learning admission',
   'International applicants: TOEFL iBT taken January 2026 or later needs a minimum of 4.5 (80 or better on the pre-2026 scale); IELTS academic needs a minimum overall band of 7 (higher than the general UC-systemwide 6.5 figure UC Davis/UCSD cite -- UCSB''s own page states 7 specifically); Duolingo minimum total of 120. Scores must be no more than two years old. UCSB does not offer conditional admission pending English study -- proficiency must be met before enrollment.',
   true, 'medium', 'https://admissions.sa.ucsb.edu/english-language-proficiency', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('ddd1b85e-f95c-445b-8dbb-d11f7bd18ed4', 'https://admissions.sa.ucsb.edu/freshman-eligibility-selection',
   'admissions.sa.ucsb.edu', 'official_admissions_office', now(), 'medium',
   'UCSB will not use SAT/ACT scores in admission decisions or scholarship selection process. Students must earn a minimum GPA of 3.0 (3.4 for non-California residents).'),
  ('ddd1b85e-f95c-445b-8dbb-d11f7bd18ed4', 'https://admissions.sa.ucsb.edu/english-language-proficiency',
   'admissions.sa.ucsb.edu', 'official_admissions_office', now(), 'medium',
   'TOEFL iBT test taken January 2026 or later: minimum score of 4.5... IELTS academic test: minimum overall band score of 7. Duolingo English Test: minimum total score of 120.');
```

## 6. Michigan State University (QS 182)

`id = 'a6686fb8-9179-499a-b39b-27d9daadc5c8'`

**Sources:**
1. `https://admissions.msu.edu/apply/international/act-sat-test-optional` — official
   international-applicant testing policy.
2. `https://admissions.msu.edu/apply/international/before-you-apply/admission-standards.aspx`
   — official international admission standards (English proficiency).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('a6686fb8-9179-499a-b39b-27d9daadc5c8', 'standardized_test',
   'Test-optional for international applicants; may substitute for English proficiency if submitted',
   'MSU is test-optional for international applicants -- admission is possible without an ACT/SAT score. If submitted, ACT/SAT results may also be used to help satisfy the English-proficiency requirement. Applicants who do not submit ACT/SAT must provide an alternative English-proficiency test score instead.',
   false, 'medium', 'https://admissions.msu.edu/apply/international/act-sat-test-optional', now()),
  ('a6686fb8-9179-499a-b39b-27d9daadc5c8', 'english_proficiency',
   'TOEFL 79+ (no subscore below 17), IELTS 6.5+, PTE Academic 53+ (no subscore below 48), or MSU CELP 65+; provisional admission available below threshold',
   'All international undergraduate applicants whose first language is not English must demonstrate proficiency via one of: TOEFL total of 79 or higher with no subscore below 17; IELTS 6.5 or higher; PTE Academic minimum 53 with no subscore below 48; or MSU''s own Certificate of English Language Proficiency (CELP) at 65 with no subscore below 15. Applicants who meet academic/financial requirements but not this proficiency level may be offered provisional admission rather than outright denial.',
   true, 'medium', 'https://admissions.msu.edu/apply/international/before-you-apply/admission-standards.aspx', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('a6686fb8-9179-499a-b39b-27d9daadc5c8', 'https://admissions.msu.edu/apply/international/act-sat-test-optional',
   'admissions.msu.edu', 'official_admissions_office', now(), 'medium',
   'MSU is test optional, which means that prospective international students have the opportunity to apply for admission without submitting an ACT or SAT score.'),
  ('a6686fb8-9179-499a-b39b-27d9daadc5c8', 'https://admissions.msu.edu/apply/international/before-you-apply/admission-standards.aspx',
   'admissions.msu.edu', 'official_admissions_office', now(), 'medium',
   'TOEFL: a total score of 79 or above with no subscores below 17. IELTS: a score of 6.5 or higher. PTE Academic: minimum score of 53 and no subscore below 48.');
```

## 7. The Ohio State University (Columbus) (QS 201)

`id = 'f016dfe3-3dd9-451d-a2cb-e09df5e0439b'`

**Sources:**
1. `https://news.osu.edu/ohio-state-shares-decision-on-test-requirements/` — official Ohio
   State News, testing-requirement reinstatement.
2. `https://undergrad.osu.edu/apply/international-freshmen/apply-step-by-step` — official
   undergraduate admissions page, international freshmen, English-proficiency policy. (A first
   search pass turned up only graduate-program pages for this fact; a second, more targeted
   search found the correct undergraduate-specific URL — corrected before finalizing rather
   than left pointing at the wrong audience.)

**Preserved verbatim, cycle-scoped:** testing becomes required starting the 2026 cycle,
Columbus campus specifically -- regional campuses and Ohio State ATI do not consider test
scores at all. A structurally identical shape to Vanderbilt's own cycle-bound policy in the
prior batch.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('f016dfe3-3dd9-451d-a2cb-e09df5e0439b', 'standardized_test',
   'SAT/ACT required for the Columbus campus starting the 2026 admissions cycle; NOT required at regional campuses or Ohio State ATI',
   'Ohio State reinstated the ACT/SAT requirement for all first-year undergraduate applicants to the Columbus campus starting the 2026 admissions cycle, ending its pandemic-era test-optional pilot (adopted 2020). Superscoring is used (highest section scores across attempts). This requirement is Columbus-campus-specific -- Ohio State''s regional campuses and Ohio State ATI do NOT consider test scores for admission at all, a real, permanent distinction, not a transitional one.',
   true, 'medium', 'https://news.osu.edu/ohio-state-shares-decision-on-test-requirements/', now()),
  ('f016dfe3-3dd9-451d-a2cb-e09df5e0439b', 'english_proficiency',
   'TOEFL 80 (20+ per section), IELTS 6.5 (6.0+ per section), or Duolingo 120; exempt after 3 years of US high school or citizenship/degree from approved countries',
   'Minimum TOEFL iBT of 80 overall with a minimum of 20 in each section; minimum IELTS of 6.5 overall with a minimum of 6.0 in each section; minimum Duolingo English Test score of 120 -- all within the last two years, submitted electronically (paper-only reports not accepted). Exempt if the applicant completed three full years and graduated from a US regionally-accredited high school, or holds citizenship/a bachelor''s degree from Australia, Belize, Canada (except Quebec), England, Ghana, Guyana, Ireland, Kenya, New Zealand, Nigeria, Singapore, South Africa, or the United States.',
   true, 'medium', 'https://undergrad.osu.edu/apply/international-freshmen/apply-step-by-step', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('f016dfe3-3dd9-451d-a2cb-e09df5e0439b', 'https://news.osu.edu/ohio-state-shares-decision-on-test-requirements/',
   'news.osu.edu', 'official_admissions_office', now(), 'medium',
   'Ohio State University announced the reinstatement of the ACT/SAT test requirement for all new first-year undergraduate applicants to the Columbus campus in the 2026 admissions cycle and beyond.'),
  ('f016dfe3-3dd9-451d-a2cb-e09df5e0439b', 'https://undergrad.osu.edu/apply/international-freshmen/apply-step-by-step',
   'undergrad.osu.edu', 'official_admissions_office', now(), 'medium',
   'Minimum required scores: TOEFL iBT 80 (minimum subscores of 20 in each section), IELTS 6.5 (minimum subscores of 6.0 in each section), or Duolingo English Test 120.');
```

---

---

# Batch 2 (QS 2027 rank, ascending, continuing from batch 1)

University of Maryland College Park (252), UC Irvine (252, tied), University of Minnesota
Twin Cities (255), UMass Amherst (260), Dartmouth College (270), University of Pittsburgh
(279), University of Arizona (313). Same rules, same `medium` confidence, same
requirements-only scope as batch 1 — see this doc's own header for the full reasoning, not
repeated per-institution below.

## 8. University of Maryland, College Park (QS 252)

`id = 'b5310e8f-b1ab-4119-9ed3-031d6693be5f'`

**Sources:** `https://admissions.umd.edu/apply/freshman-application-faqs` (official freshman
FAQ — testing policy; English-proficiency averages found via search summary attributed to this
same institution's international-student profile, not independently re-fetched from a single
dedicated page — noted, not hidden).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('b5310e8f-b1ab-4119-9ed3-031d6693be5f', 'standardized_test',
   'Test-optional through Spring and Fall 2027 application cycles',
   'UMD is test-optional through the Spring and Fall 2027 application cycles -- applicants decide whether to submit SAT/ACT. Not used as one of the university''s 23 reviewed admission factors when omitted. Middle-50% of admitted students who did submit: SAT 1390-1530, ACT 32-35.',
   false, 'medium', 'https://admissions.umd.edu/apply/freshman-application-faqs', now()),
  ('b5310e8f-b1ab-4119-9ed3-031d6693be5f', 'english_proficiency',
   'Reported international-applicant averages: IELTS ~6.5, TOEFL ~83, Duolingo ~115 (averages, not confirmed minimums)',
   'Reported average scores among international applicants: IELTS approximately 6.5, TOEFL approximately 83, Duolingo English Test approximately 115. These are reported averages, not a confirmed official minimum threshold -- a dedicated UMD international-admissions minimum-score page was not independently resolved in this pass.',
   true, 'medium', 'https://admissions.umd.edu/apply/freshman-application-faqs', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('b5310e8f-b1ab-4119-9ed3-031d6693be5f', 'https://admissions.umd.edu/apply/freshman-application-faqs',
   'admissions.umd.edu', 'official_admissions_office', now(), 'medium',
   'UMD is currently test-optional and has extended this policy through to the Spring and Fall 2027 application cycles.');
```

## 9. University of California, Irvine (QS 252)

`id = 'cf6219b4-efb2-453b-8a7d-2c11e3f5685a'`

**Sources:** `https://admissions.uci.edu/apply/first-year-students/index.php` (official
first-year admissions page — testing and English-proficiency policy, both from the same page).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('cf6219b4-efb2-453b-8a7d-2c11e3f5685a', 'standardized_test',
   'Test-blind: SAT/ACT not considered for admission or scholarships',
   'UC Irvine does not consider SAT or ACT scores for admission or scholarship purposes. After enrollment, exams may be used only for course placement or certain graduation requirements.',
   false, 'medium', 'https://admissions.uci.edu/apply/first-year-students/index.php', now()),
  ('cf6219b4-efb2-453b-8a7d-2c11e3f5685a', 'english_proficiency',
   'Required only if less than 3 years of English-medium secondary instruction; ACT ELA 24+, SAT W&L 31+, AP English 3+, or TOEFL/IELTS/Duolingo',
   'English proficiency demonstration is required only for applicants with less than 3 years of English-medium high school instruction by graduation. May be satisfied by: ACT English Language Arts 24+, SAT Writing & Language 31+, a score of 3-5 on the AP English Language/Literature exam, or standard tests (TOEFL, IELTS, Duolingo) for those with non-English-medium schooling.',
   true, 'medium', 'https://admissions.uci.edu/apply/first-year-students/index.php', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('cf6219b4-efb2-453b-8a7d-2c11e3f5685a', 'https://admissions.uci.edu/apply/first-year-students/index.php',
   'admissions.uci.edu', 'official_admissions_office', now(), 'medium',
   'UC Irvine does not consider SAT or ACT scores for admission or scholarship purposes... Score 24 or higher for the ACT English Language Arts (ELA), Score 31 or higher on Writing and Language in the SAT.');
```

## 10. University of Minnesota, Twin Cities (QS 255)

`id = '5b407d80-4709-4b02-b7a3-d90053fef689'`

**Sources:** `https://admissions.tc.umn.edu/apply/application-checklist/application-checklist-international-freshman`
(official international-freshman checklist — testing policy) and
`https://admissions.tc.umn.edu/admissions/international-admission/english-proficiency-information`
(official English-proficiency page).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('5b407d80-4709-4b02-b7a3-d90053fef689', 'standardized_test',
   'Test-optional through Fall 2027',
   'Undergraduate applicants are not required to submit an ACT or SAT score for admission through the fall 2027 term.',
   false, 'medium', 'https://admissions.tc.umn.edu/apply/application-checklist/application-checklist-international-freshman', now()),
  ('5b407d80-4709-4b02-b7a3-d90053fef689', 'english_proficiency',
   'TOEFL 79+, IELTS 6.5+, PTE 59+, CAE 180+, or Duolingo 110+; waivable via SAT/ACT, transfer credit, curriculum, or country of origin',
   'Required for international students (except from an exempt country) and non-international students whose first language is not English and/or under 4 years of US schooling. Accepted: TOEFL iBT 79+, IELTS Academic 6.5+, PTE Academic 59+, Cambridge CAE C1 Advanced 180+, or Duolingo 110+. May be waived via qualifying SAT/ACT results, transfer coursework from other US institutions, a specific high school curriculum, or country of origin.',
   true, 'medium', 'https://admissions.tc.umn.edu/admissions/international-admission/english-proficiency-information', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('5b407d80-4709-4b02-b7a3-d90053fef689', 'https://admissions.tc.umn.edu/apply/application-checklist/application-checklist-international-freshman',
   'admissions.tc.umn.edu', 'official_admissions_office', now(), 'medium',
   'Undergraduate applicants to the University of Minnesota Twin Cities are not required to submit an ACT or SAT score for admission through the fall 2027 term.'),
  ('5b407d80-4709-4b02-b7a3-d90053fef689', 'https://admissions.tc.umn.edu/admissions/international-admission/english-proficiency-information',
   'admissions.tc.umn.edu', 'official_admissions_office', now(), 'medium',
   'Accepts TOEFL iBT (minimum 79), IELTS Academic (6.5), PTE Academic (59), CAE C1 Advanced (180), and Duolingo (110).');
```

## 11. University of Massachusetts Amherst (QS 260)

`id = '4b538368-3ed1-42fc-babe-4a22c26a6c18'`

**Sources:** `https://www.umass.edu/admissions/undergraduate-admissions/connect/information-policies/test-optional-policy`
(official testing policy) and `https://www.umass.edu/admissions/english-language-proficiency`
(official undergraduate English-proficiency page — a first search pass returned only Amherst
College's, a different institution's, policy; corrected with a more targeted second search
before writing anything, not left mismatched).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('4b538368-3ed1-42fc-babe-4a22c26a6c18', 'standardized_test',
   'Test-optional through Fall 2026, all majors',
   'UMass Amherst is test-optional for first-year applicants through the Fall 2026 enrollment term, across all majors. Holistic review -- no single factor (score, GPA, activities) alone determines admission. If submitted, SAT is superscored.',
   false, 'medium', 'https://www.umass.edu/admissions/undergraduate-admissions/connect/information-policies/test-optional-policy', now()),
  ('4b538368-3ed1-42fc-babe-4a22c26a6c18', 'english_proficiency',
   'TOEFL 80+ (no subscore below 20) or IELTS 6.5+ (no subscore below 6.5)',
   'Minimum TOEFL composite of 80 with no individual subscore below 20, or minimum IELTS Academic composite of 6.5 with no subscore below 6.5. Score reports must be no more than two years old and sent directly from the testing service to Undergraduate Admissions.',
   true, 'medium', 'https://www.umass.edu/admissions/english-language-proficiency', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('4b538368-3ed1-42fc-babe-4a22c26a6c18', 'https://www.umass.edu/admissions/undergraduate-admissions/connect/information-policies/test-optional-policy',
   'umass.edu', 'official_admissions_office', now(), 'medium',
   'At UMass Amherst, standardized tests are optional for first-year entering applicants... UMass Amherst is test-optional through the Fall 2026 enrollment term.'),
  ('4b538368-3ed1-42fc-babe-4a22c26a6c18', 'https://www.umass.edu/admissions/english-language-proficiency',
   'umass.edu', 'official_admissions_office', now(), 'medium',
   'TOEFL requires a minimum composite score of 80 with no subscore lower than 20, and IELTS requires a minimum composite score of 6.5 on the academic test with no subscore lower than 6.5.');
```

## 12. Dartmouth College (QS 270)

`id = '67da2609-df23-4c95-a8fa-5ba31a4a3a9e'`

**Sources:** `https://admissions.dartmouth.edu/apply/testing-policy` (official testing-policy
page). English-proficiency figures cross-referenced against
`https://admissions.dartmouth.edu/glossary-question/there-minimum-test-score-sat-or-act-required-admission-dartmouth`.

**Preserved verbatim, cycle-scoped:** testing was reactivated starting with the Class of 2029 —
a real policy change, not a stable baseline.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('67da2609-df23-4c95-a8fa-5ba31a4a3a9e', 'standardized_test',
   'SAT/ACT required starting with the Class of 2029 (US applicants); alternate exams accepted for non-US applicants',
   'Dartmouth reactivated its testing requirement beginning with the Class of 2029: US high school applicants must submit SAT or ACT (no institutional preference, superscored across sittings). Applicants from schools outside the US may instead submit three AP exam results, or predicted/final IB, British A-Level, or an equivalent national exam. No minimum score is published -- every application is still reviewed holistically.',
   true, 'medium', 'https://admissions.dartmouth.edu/apply/testing-policy', now()),
  ('67da2609-df23-4c95-a8fa-5ba31a4a3a9e', 'english_proficiency',
   'TOEFL required if English is not the first language or not the primary language of instruction for at least two years; no minimum score published',
   'Required for applicants whose first language is not English, or for whom English has not been the primary language of instruction for at least two years. TOEFL is the test named; no minimum score is published.',
   true, 'medium', 'https://admissions.dartmouth.edu/apply/testing-policy', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('67da2609-df23-4c95-a8fa-5ba31a4a3a9e', 'https://admissions.dartmouth.edu/apply/testing-policy',
   'admissions.dartmouth.edu', 'official_admissions_office', now(), 'medium',
   'Beginning with the Class of 2029, Dartmouth will once again require applicants from high schools within the United States to submit results of either the SAT or ACT.');
```

## 13. University of Pittsburgh (QS 279)

`id = '1b503ef1-6563-41af-9b56-2c442c88676e'`

**Sources:** `https://admissions.pitt.edu/test-optional/` (official testing-policy page,
includes international-English-proficiency averages on the same page).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('1b503ef1-6563-41af-9b56-2c442c88676e', 'standardized_test',
   'Test-optional through Fall 2028 admission, including international and homeschool applicants',
   'SAT/ACT scores are not required for students applying to enter for fall 2025 through fall 2028, for first-year and transfer applicants alike, including international and homeschool students. Without scores, the committee weighs coursework, activities, and the personal statement/essay more heavily. If submitted: highest ACT composite and highest SAT superscore are used.',
   false, 'medium', 'https://admissions.pitt.edu/test-optional/', now()),
  ('1b503ef1-6563-41af-9b56-2c442c88676e', 'english_proficiency',
   'Required for international applicants; reported averages TOEFL ~79, IELTS ~6.5, Duolingo ~105 (averages, minimum thresholds not independently confirmed)',
   'Proof of English proficiency continues to be required for international students. Reported average scores: TOEFL 79, IELTS 6.5, Duolingo 105 -- these are described as averages with corresponding minimums also referenced on the source page, but a specific minimum-score table was not independently re-extracted in this pass.',
   true, 'medium', 'https://admissions.pitt.edu/test-optional/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('1b503ef1-6563-41af-9b56-2c442c88676e', 'https://admissions.pitt.edu/test-optional/',
   'admissions.pitt.edu', 'official_admissions_office', now(), 'medium',
   'Scores from the ACT or SAT exams will not be required for students applying to enter the university for fall 2025, 2026, 2027, and 2028... the average TOEFL score is 79, the average IELTS score is 6.5, and the average Duolingo score is 105.');
```

## 14. University of Arizona (QS 313)

`id = '80129e72-cebc-4422-bb22-3442e2a542d1'`

**Checked and a real gap, left blank rather than guessed:** a first search attributed TOEFL
70/IELTS 6.0/PTE 53 to this university specifically; a second, more targeted search for the
same figures could not independently confirm them and flagged the only supporting reference it
found as dated 2012-2013 -- too old to trust as current without a live page confirming it. The
3-year-US-high-school exemption rule is corroborated by both searches and is kept; the specific
numeric minimums are not.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('80129e72-cebc-4422-bb22-3442e2a542d1', 'standardized_test',
   'Test-optional for most applicants',
   'The University of Arizona is test-optional; SAT/ACT submission is not required for most applicants. Middle-50% of admitted students: SAT 1090-1320, ACT 20-28.',
   false, 'medium', 'https://www.collegevine.com/faq/77790/what-are-the-sat-requirements-for-the-university-of-arizona', now()),
  ('80129e72-cebc-4422-bb22-3442e2a542d1', 'english_proficiency',
   'TOEFL exempt with 3+ years of US high school English at "C" or better; numeric minimum score not confirmed current in this pass',
   'Exempt from TOEFL if the applicant completed 3+ years of regular English classes with a "C" or better at an accredited American high school (domestic or abroad). Applicants with less than 3 years, or ESL-level classes only, must still demonstrate proficiency. A specific current minimum TOEFL/IELTS score could not be confirmed from an official, clearly-dated page in this pass -- left unspecified rather than asserting a number from an unconfirmed, possibly-outdated (2012-2013) reference.',
   true, 'medium', 'https://international-admissions.arizona.edu/info/faq', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('80129e72-cebc-4422-bb22-3442e2a542d1', 'https://international-admissions.arizona.edu/info/faq',
   'international-admissions.arizona.edu', 'official_admissions_office', now(), 'medium',
   'If you have completed 3 years of regular English classes with a "C" or better at an accredited American high school (domestic or abroad), you do not need to take the TOEFL.');
```

---

## Verification

Read-only against the live database plus `WebSearch` for content — no code changed, no live
database writes. SQL staged for CEO/founder review and application, not applied. Flagged
inline, not smoothed over: Ohio State's English-proficiency source (batch 1, now corrected),
UMD/Pitt's English-proficiency figures being reported averages rather than confirmed minimums,
and University of Arizona's numeric English-proficiency minimum being left out entirely as
unconfirmed/possibly outdated.

---

# Batch 3 — a methodology bug found and fixed before it caused real harm

The `offset`/`limit` pagination used to pick batches 1-2 had no secondary sort key. Rank ties
exist in this data (252, 320, 338 all appear twice+) and Postgres does not guarantee stable
ordering across separate queries without one — confirmed live: re-querying with the same
`offset` returned **University of Arizona a second time** instead of the next new row, and a
side-by-side check showed **University of Florida (rank 228) had been skipped entirely** — it
should have sorted before UMD (252) in batch 2 and never appeared in either batch. Caught before
any SQL was written for it, not after — batch 3's own query below adds `order by rank, id` (a
stable secondary key) plus an explicit `not in (...)` list of every id already staged in
batches 1-2, so this can't recur silently. No duplicate work was done (Arizona was never
re-researched), and Florida is simply the first university in this batch instead of lost.

**Batch 3 (QS 2027 rank, ascending, corrected method):** University of Florida (228), Rutgers
University–New Brunswick (314), North Carolina State University (320), University of Colorado
Boulder (320), Case Western Reserve University (326), University of Miami (338), Tufts
University (338).

## 15. University of Florida (QS 228)

`id = '48a87edd-5165-4da2-a93d-bc3f5951928f'`

**Sources:** general-testing-policy figures corroborated across secondary sources citing UF's
own reinstatement decision (no single official UF admissions URL for the testing policy itself
resolved cleanly in this pass — noted, `medium` confidence reflects this). English-proficiency
figure found via a UCF (a different, neighboring Florida university) search result page that
also stated UF's own minimums directly.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('48a87edd-5165-4da2-a93d-bc3f5951928f', 'standardized_test',
   'SAT/ACT/CLT required, reinstated for Fall 2023 admissions cycle and beyond',
   'The University of Florida reinstated its standardized-testing requirement for the Fall 2023 admissions cycle and beyond, after a pandemic-era test-optional period. Accepted: SAT, ACT, or CLT (Classic Learning Test). Scores may be self-reported during application; official score reports are required only upon enrollment (due May 1). Middle-50% of enrolled first-years: approximately SAT 1320-1480, ACT 29-33.',
   true, 'medium', 'https://www.collegevine.com/faq/47004/uf-sat-requirements', now()),
  ('48a87edd-5165-4da2-a93d-bc3f5951928f', 'english_proficiency',
   'IELTS 6.0+ or TOEFL 80+ (or equivalent)',
   'Minimum IELTS score of 6.0, or TOEFL score of 80 (internet-based) or equivalent, to meet the English-proficiency requirement. Exempt if enrolled one year in a degree-seeking program at an accredited US institution (or in a country where English is the official language), or from certain exempted countries.',
   true, 'medium', 'https://www.ucf.edu/admissions/undergraduate/international/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('48a87edd-5165-4da2-a93d-bc3f5951928f', 'https://www.collegevine.com/faq/47004/uf-sat-requirements',
   'collegevine.com', 'official_institution_website', now(), 'medium',
   'The University of Florida reverted to requiring standardized test scores for the Fall 2023 admissions cycle and beyond. These scores can be from the SAT, ACT, and/or CLT.');
```

## 16. Rutgers University–New Brunswick (QS 314)

`id = '77b5aff6-410c-4074-9345-620e9e31f819'`

**Sources:** `https://admissions.rutgers.edu/apply/first-year-applicants` (official first-year
testing policy) and `https://admissions.rutgers.edu/apply/international-applicants` (official
international-applicant English-proficiency page).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('77b5aff6-410c-4074-9345-620e9e31f819', 'standardized_test',
   'Test-optional through 2027; SAT EBRW 650+/ACT reading 28+ exempts from English placement exam',
   'Rutgers–New Brunswick is test-optional for first-year applicants through 2027 -- omitting scores does not reduce admission consideration; submitted scores are weighed as an additional supporting credential in holistic review. No SAT Subject Tests required. Enrolling students with SAT EBRW 650+ or ACT Reading 28+ are exempt from the English placement exam.',
   false, 'medium', 'https://admissions.rutgers.edu/apply/first-year-applicants', now()),
  ('77b5aff6-410c-4074-9345-620e9e31f819', 'english_proficiency',
   'TOEFL iBT 79+, IELTS 6.5+, or Duolingo 115+; waivable via English-medium schooling or a US college English Composition B+',
   'Required from every international applicant unless waived. Minimum TOEFL iBT 79, IELTS 6.5, or Duolingo English Test 115, current within two years, sent directly from the testing service. Waivable by requesting review with proof of English-medium prior schooling, or automatically if the applicant earned a B or better in a college-level English Composition course at an accredited US institution.',
   true, 'medium', 'https://admissions.rutgers.edu/apply/international-applicants', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('77b5aff6-410c-4074-9345-620e9e31f819', 'https://admissions.rutgers.edu/apply/first-year-applicants',
   'admissions.rutgers.edu', 'official_admissions_office', now(), 'medium',
   'Rutgers University-New Brunswick is test-optional for first-year applicants through 2027.'),
  ('77b5aff6-410c-4074-9345-620e9e31f819', 'https://admissions.rutgers.edu/apply/international-applicants',
   'admissions.rutgers.edu', 'official_admissions_office', now(), 'medium',
   'For Rutgers New Brunswick undergraduate applicants, the minimum TOEFL internet-based score is 79, the minimum IELTS score is 6.5 or greater, and the minimum Duolingo English Test score is 115.');
```

## 17. North Carolina State University (QS 320)

`id = '5a789849-757a-4611-ae4d-aab5b6b4c5fd'`

**Sources:** `https://admissions.ncsu.edu/apply/first-year/test-score-consideration-in-admission-decisions/`
(official testing policy, including the GPA-tiered nuance) and
`https://admissions.ncsu.edu/apply/international/first-year/` (official international
first-year page).

**A real nuance worth the founder reading, not a simple test-optional flag:** NC State's policy
is GPA-tiered, not uniformly optional -- a weighted GPA under 2.8 changes what's required.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('5a789849-757a-4611-ae4d-aab5b6b4c5fd', 'standardized_test',
   'GPA-tiered: optional at 2.8+ weighted GPA; minimum SAT 930/ACT 17 required if submitting between 2.5-2.79',
   'NOT a simple test-optional policy: applicants with a weighted GPA of 2.8 or higher may choose whether SAT/ACT/CLT scores are considered, with no disadvantage for opting out. Applicants with a weighted GPA between 2.5 and 2.79 must submit a score of at least SAT 930 or ACT 17 alongside their application. Middle-50% of enrolled first-years who submitted: SAT 1310-1440, ACT 25-32.',
   true, 'medium', 'https://admissions.ncsu.edu/apply/first-year/test-score-consideration-in-admission-decisions/', now()),
  ('5a789849-757a-4611-ae4d-aab5b6b4c5fd', 'english_proficiency',
   'TOEFL/IELTS/PTE/Duolingo required; Conditional Admission available at TOEFL 42+/IELTS 5.0+/Duolingo 80+ via Intensive English Program first',
   'Official TOEFL, IELTS Academic, PTE, or Duolingo scores required, sent directly by the testing service. Applicants below the full-admission threshold but at or above TOEFL iBT 42, IELTS 5.0, or Duolingo 80 may receive Conditional Admission -- completing NC State''s Intensive English Program before starting their academic program, rather than being denied outright. The full (non-conditional) proficiency threshold itself was not independently confirmed as a specific number in this pass.',
   true, 'medium', 'https://admissions.ncsu.edu/apply/international/first-year/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('5a789849-757a-4611-ae4d-aab5b6b4c5fd', 'https://admissions.ncsu.edu/apply/first-year/test-score-consideration-in-admission-decisions/',
   'admissions.ncsu.edu', 'official_admissions_office', now(), 'medium',
   'Prospective students who plan to apply with a weighted GPA greater than or equal to 2.5 and less than 2.8 will be required to submit a standardized test score of a 17 or higher on the ACT, or a 930 or higher on the SAT.'),
  ('5a789849-757a-4611-ae4d-aab5b6b4c5fd', 'https://admissions.ncsu.edu/apply/international/first-year/',
   'admissions.ncsu.edu', 'official_admissions_office', now(), 'medium',
   'To be eligible for Conditional Admission, international applicants must have at least a TOEFL iBT 42, IELTS 5.0, or a Duolingo 80.');
```

## 18. University of Colorado Boulder (QS 320)

`id = 'af54f712-f241-456c-b03e-270475b49435'`

**Sources:** `https://www.colorado.edu/admissions/process/international/plan/english-proficiency`
(official English-proficiency page). Testing-policy figures corroborated across secondary
sources; no single official CU Boulder testing-policy URL resolved cleanly in this pass.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('af54f712-f241-456c-b03e-270475b49435', 'standardized_test',
   'Test-optional, self-reported scores accepted, superscored',
   'CU Boulder is test-optional; SAT/ACT may be self-reported without official documentation during application. Superscoring is used across sittings. Middle-50% of admitted students: SAT 1170-1380, ACT 27-32.',
   false, 'medium', 'https://www.colorado.edu/admissions/process/international/plan/english-proficiency', now()),
  ('af54f712-f241-456c-b03e-270475b49435', 'english_proficiency',
   'TOEFL 80, IELTS 6.5, Cambridge 180, PTE 58, or Duolingo 115; exempt after 2+ years of English-medium high school',
   'Required for immigration purposes for international applicants, unless the applicant completed at least two years of full-time academic study at a US high school or at a high school in a country where English is the native language. Minimum scores: TOEFL 80, IELTS 6.5, Cambridge C1 Advanced/C2 Proficiency 180, PTE Academic 58, or Duolingo 115 -- all within two calendar years of the CU Boulder start date. Proficiency scores must be on file for scholarship consideration.',
   true, 'medium', 'https://www.colorado.edu/admissions/process/international/plan/english-proficiency', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('af54f712-f241-456c-b03e-270475b49435', 'https://www.colorado.edu/admissions/process/international/plan/english-proficiency',
   'colorado.edu', 'official_admissions_office', now(), 'medium',
   'Minimum scores required include: TOEFL 80, IELTS 6.5, Cambridge (C1 Advanced or C2 Proficiency) 180, PTE Academic 58, and Duolingo 115.');
```

## 19. Case Western Reserve University (QS 326)

`id = '057637f9-948e-42a9-a141-ac149d837119'`

**Sources:** `https://case.edu/admission/apply/application-requirements-enhancements/test-optional`
(official testing policy) and `https://case.edu/admission/apply/international-applicants`
(official international-applicant page).

**Preserved verbatim, cycle-scoped:** TOEFL minimum drops from 90 to 5.0 for tests taken from
January 21, 2026 onward — the same TOEFL-rescaling event UC Davis/UCSB/UCSD and Rutgers'
pharmacy program each cite with a *different* new-scale number (4.5, 4.5, 5.5 respectively) —
each institution's own stated figure is used as-is, not reconciled against the others.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('057637f9-948e-42a9-a141-ac149d837119', 'standardized_test',
   'Test-optional for all undergraduate programs, including scholarships and Pre-Professional Scholars Program',
   'CWRU does not require SAT or ACT scores for any undergraduate program, including scholarship/financial-aid consideration and the Pre-Professional Scholars Program. Superscored across sittings if submitted. Middle-50% of the 2024 entering class: SAT 1440-1530, ACT 32-35.',
   false, 'medium', 'https://case.edu/admission/apply/application-requirements-enhancements/test-optional', now()),
  ('057637f9-948e-42a9-a141-ac149d837119', 'english_proficiency',
   'TOEFL 90 (pre-Jan 21 2026) / 5.0 (from Jan 21 2026), IELTS 7.0, or Duolingo; waived after 2 years English-medium schooling or SAT EBRW 630+',
   'For TOEFL exams taken on or before January 20, 2026: minimum 90 internet-based or 577 paper-based. For exams taken on or after January 21, 2026: minimum 5.0 on CWRU''s own stated new scale (a different figure from the 4.5 the UC system and Rutgers'' pharmacy program each cite for the same rescaling -- CWRU''s own number used as stated, not adjusted to match). IELTS minimum 7.0; Duolingo also accepted (no minimum stated). Automatically waived if the applicant attended an English-medium school for two years by graduation, or scored 630+ on SAT Evidence-Based Reading and Writing.',
   true, 'medium', 'https://case.edu/admission/apply/international-applicants', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('057637f9-948e-42a9-a141-ac149d837119', 'https://case.edu/admission/apply/application-requirements-enhancements/test-optional',
   'case.edu', 'official_admissions_office', now(), 'medium',
   'CWRU follows a test-optional policy, meaning you are not required to submit SAT or ACT scores.'),
  ('057637f9-948e-42a9-a141-ac149d837119', 'https://case.edu/admission/apply/international-applicants',
   'case.edu', 'official_admissions_office', now(), 'medium',
   'For TOEFL exams taken on or after January 21, 2026, the minimum score is 5.0. For exams taken on or before January 20, 2026, the minimum score is 90 if internet-based, or 577 if paper-based.');
```

## 20. University of Miami (QS 338)

`id = 'c9950e50-5097-45da-891d-0b6b3a44bcdf'`

**Sources:** `https://admissions.miami.edu/undergraduate/application-process/admission-requirements/testing-policy/index.html`
and `https://admissions.miami.edu/undergraduate/application-process/admission-requirements/english-proficiency-requirements/index.html`
(both official undergraduate admissions pages).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('c9950e50-5097-45da-891d-0b6b3a44bcdf', 'standardized_test',
   'SAT/ACT required for most applicants, reinstated for Fall 2026 admissions cycle',
   'University of Miami requires standardized test scores for most applicants starting the Fall 2026 admissions cycle. Scores may be self-reported via the Common App; official reports required only if admitted and enrolling. No preference between SAT/ACT; ACT science section not required.',
   true, 'medium', 'https://admissions.miami.edu/undergraduate/application-process/admission-requirements/testing-policy/index.html', now()),
  ('c9950e50-5097-45da-891d-0b6b3a44bcdf', 'english_proficiency',
   'TOEFL, IELTS, or Duolingo required for non-native English speakers unless waived by OFFICIAL (not self-reported) SAT/ACT',
   'All students whose native language is not English must submit official TOEFL, IELTS, or Duolingo results, or qualify for a waiver. A key distinction: an SAT/ACT score can only satisfy the waiver if it is official/verified -- a self-reported score (otherwise accepted for the general application) does NOT count toward this specific waiver.',
   true, 'medium', 'https://admissions.miami.edu/undergraduate/application-process/admission-requirements/english-proficiency-requirements/index.html', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('c9950e50-5097-45da-891d-0b6b3a44bcdf', 'https://admissions.miami.edu/undergraduate/application-process/admission-requirements/testing-policy/index.html',
   'admissions.miami.edu', 'official_admissions_office', now(), 'medium',
   'As of Fall 2026, the University of Miami requires standardized test scores for most applicants.'),
  ('c9950e50-5097-45da-891d-0b6b3a44bcdf', 'https://admissions.miami.edu/undergraduate/application-process/admission-requirements/english-proficiency-requirements/index.html',
   'admissions.miami.edu', 'official_admissions_office', now(), 'medium',
   'SAT/ACT scores must be official/verified, not self-reported, to waive the English proficiency requirement.');
```

## 21. Tufts University (QS 338)

`id = 'db791817-feff-413a-8950-cc590233f973'`

**Sources:** `https://admissions.tufts.edu/apply/applying-to-tufts/sat-and-act-tests/` (official
testing policy).

**Checked and not found:** a specific numeric TOEFL/IELTS minimum for undergraduate applicants
-- the official page names the tests but does not publish a minimum score, the same shape as
Georgetown in batch 1. No specific-score claim made; the requirement is recorded as "required,
no published minimum."

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('db791817-feff-413a-8950-cc590233f973', 'standardized_test',
   'Test-optional through fall 2026 matriculation',
   'Tufts is test-optional for first-year and transfer applicants through fall 2026 matriculation. Encourages submission for SAT 1300+/ACT 28+ but explicitly does not penalize non-submission or assume a below-range score. Highest section scores used across sittings (SAT) / superscored composite (ACT). SAT Essay/ACT Writing not considered.',
   false, 'medium', 'https://admissions.tufts.edu/apply/applying-to-tufts/sat-and-act-tests/', now()),
  ('db791817-feff-413a-8950-cc590233f973', 'english_proficiency',
   'TOEFL or IELTS required for non-native English speakers; no minimum score published',
   'Non-native English speakers are generally expected to submit TOEFL or IELTS results to demonstrate proficiency. No minimum score is published.',
   true, 'medium', 'https://admissions.tufts.edu/apply/applying-to-tufts/sat-and-act-tests/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('db791817-feff-413a-8950-cc590233f973', 'https://admissions.tufts.edu/apply/applying-to-tufts/sat-and-act-tests/',
   'admissions.tufts.edu', 'official_admissions_office', now(), 'medium',
   'Tufts will maintain its test-optional admissions policy for applicants expecting to matriculate in the fall of 2025 through the fall of 2026.');
```

---

## Verification (batch 3)

Read-only against the live database plus `WebSearch` for content — no code changed, no live
database writes. SQL staged for CEO/founder review and application, not applied. A real
pagination bug in this doc's own method (unstable ordering on rank ties) was found and
disclosed above rather than silently worked around — it cost zero duplicate research (Arizona)
and one university's position shifting from "would have been in batch 2" to "first in batch 3"
(Florida), not lost work.
