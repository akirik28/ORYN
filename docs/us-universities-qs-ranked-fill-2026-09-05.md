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

## Verification

Read-only against the live database plus `WebSearch` for content — no code changed, no live
database writes. SQL staged for CEO/founder review and application, not applied. One fact (Ohio
State's English-proficiency minimums) is flagged above as needing re-verification against the
correct domain before being trusted at the same level as everything else in this batch.
