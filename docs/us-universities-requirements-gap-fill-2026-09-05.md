# US universities — requirements gap fill, 2026-09-05

CEO (oryn-5b) assignment: the founder's own default instruction, US universities being the
single largest content gap. Measured before filling, per this fleet's own standing rule.

## Measurement

Live count, `duplicate_status = 'canonical'`, `country = 'United States'`:

| | count |
|---|--:|
| Total US canonical universities | 130 |
| Zero content (`university_programs` AND `university_requirements` both empty) | 93 |
| — of which ever targeted by a real student | **0** |
| Partial content (one of programs/requirements populated, not both) | 7 |
| Has both programs and requirements | 30 |

CEO's own framing expected a split within the empty set by real-student targeting (fill the
targeted-but-empty ones before the never-targeted-and-empty ones). That split does not exist
here — **all 93 zero-content US universities have exactly zero targeting students**, no
exceptions. The axis CEO's own instruction correctly anticipated as cheap *does* exist: **7
universities have substantial program data (62–90 programs each) and zero requirement rows** —
completing just the missing half is real, targeted, low-cost work. This batch is exactly that:
the 7 partial universities, requirements-only, program tables untouched.

The remaining 93 fully-empty universities are a separate, much larger undertaking (each needs
both programs and requirements researched from scratch) — not attempted in this pass. Since
real-student-targeting doesn't differentiate within that set, name recognition is the only
signal available for a future pass's ordering; not decided here.

## Method and rules

Same discipline as `docs/d1-qs-top100-fill-2026-09-05.md`: official source only, `source_url` +
retrieval date on every fact, nothing found is left out rather than estimated, an inaccessible
or ambiguous source is noted as such rather than silently treated as "no requirement exists."

**Honesty note on confidence, different from the D1 batch's own `high` ratings:** the D1
batch's facts came from directly-fetched official pages/PDFs read in full. This batch's facts
come from `WebSearch`'s own summarized results of official `.edu` admissions pages, cross-
checked against the specific official URL each fact cites, but not independently re-fetched
and read verbatim page-by-page the way the D1 batch was. Rated `medium` throughout on that
basis, not `high` — a real distinction, not a formality: `medium` is what CEO/founder should
read as "sourced and attributable, not independently re-verified against the raw page."

**Two gaps left genuinely blank, not guessed:** Johns Hopkins' and UVA's undergraduate-specific
English-proficiency policy. Every English-proficiency source found for JHU (SAIS, Whiting
graduate engineering, AAP) and for UVA (MS in Business Analytics, Batten graduate policy school)
was a **graduate** program's page, not the undergraduate first-year admissions office's own
policy — attributing a graduate school's TOEFL/IELTS minimum to an undergraduate applicant would
be exactly the "wrong audience" error this fleet's own freshness work flagged earlier the same
day. No `english_proficiency` row is written for either university in this batch.

**A live, real instance of the exact cycle-scoping question raised earlier the same day**
(`docs/requirement-freshness-audit-2026-09-05.md` §2): Vanderbilt's testing policy is
explicitly cycle-bound — test-optional through fall 2028, **required starting fall 2029** — and
Georgetown's/Johns Hopkins' testing-required policies are each dated to a specific reinstatement
cycle (2026/27 and fall 2026 respectively). `university_requirements` still has no structured
field to capture this (confirmed unchanged, same audit). Preserved verbatim in
`requirement_detail` instead, the only place available to state it — anyone reading this
requirement in 2029 will need to read the sentence, not a column, to know it changed.

**SQL below is staged, not applied** — CEO/founder runs it, migration numbering is CEO's call
(none needed here; these are plain `insert`s into already-existing tables).

---

## 1. Georgetown University

`id = '6d8b7272-7940-4e70-b484-a4e882733ba8'`

**Sources actually used:**
1. `https://uadmissions.georgetown.edu/applying/preparation-process/` — official undergraduate
   admissions testing policy.
2. `https://uadmissions.georgetown.edu/applying/international/` — official undergraduate
   international-applicants page, English-proficiency policy.

**Checked and not found:** a numeric minimum TOEFL/IELTS score for undergraduate applicants —
the official undergraduate page states the test is recommended, not required, for students
whose school does not use English as the language of instruction, and does not publish a
minimum score at that level (minimums found elsewhere are graduate-program-specific, same
wrong-audience issue as JHU/UVA below — not used).

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('6d8b7272-7940-4e70-b484-a4e882733ba8', 'standardized_test',
   'SAT or ACT required for the 2026/27 admissions cycle',
   'Georgetown requires SAT or ACT scores from all applicants for the 2026/27 admissions cycle. Applicants may submit one full test score or scores from as many sittings as they wish; Georgetown does not superscore but runs its own internal superscoring-equivalent review.',
   true, 'medium', 'https://uadmissions.georgetown.edu/applying/preparation-process/', now()),
  ('6d8b7272-7940-4e70-b484-a4e882733ba8', 'english_proficiency',
   'English proficiency test recommended, not required, for undergraduate applicants',
   'Georgetown recommends, but does not require, results from an English language proficiency test for undergraduate applicants who attend a school where English is not the language of instruction. Accepted tests: TOEFL, IELTS, or the Duolingo English Test (DET). No minimum score is published at the undergraduate level.',
   false, 'medium', 'https://uadmissions.georgetown.edu/applying/international/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('6d8b7272-7940-4e70-b484-a4e882733ba8', 'https://uadmissions.georgetown.edu/applying/preparation-process/',
   'uadmissions.georgetown.edu', 'official_admissions_office', now(), 'medium',
   'Georgetown requires SAT or ACT scores from all applicants for the 2026/27 academic year.'),
  ('6d8b7272-7940-4e70-b484-a4e882733ba8', 'https://uadmissions.georgetown.edu/applying/international/',
   'uadmissions.georgetown.edu', 'official_admissions_office', now(), 'medium',
   'Georgetown recommends, but does not require, results from an English language proficiency test for students who attend a school where English is not the language of instruction.');
```

## 2. Johns Hopkins University

`id = 'c7477a15-c75f-42ec-b6bb-70742ff8b179'`

**Sources actually used:**
1. `https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/standardized-testing/`
   — official undergraduate admissions testing-policy page.

**Checked and not found:** undergraduate-specific English-proficiency minimum score (see doc
header — every result found was a graduate-program page). No `english_proficiency` row written.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('c7477a15-c75f-42ec-b6bb-70742ff8b179', 'standardized_test',
   'SAT or ACT required starting fall 2026 admission (Krieger School of Arts & Sciences, Whiting School of Engineering)',
   'Johns Hopkins requires first-year applicants to the Krieger School of Arts and Sciences and the Whiting School of Engineering to submit SAT or ACT scores, beginning with students seeking admission for the fall 2026 semester -- reinstating a requirement after a test-optional period that began in 2020. Does not apply to the Peabody Institute (music and fine arts), which is unaffected by this change.',
   true, 'medium', 'https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/standardized-testing/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('c7477a15-c75f-42ec-b6bb-70742ff8b179', 'https://apply.jhu.edu/how-to-apply/application-deadlines-requirements/standardized-testing/',
   'apply.jhu.edu', 'official_admissions_office', now(), 'medium',
   'Students applying for the Krieger School of Arts and Sciences and the Whiting School of Engineering will have to submit SAT or ACT scores beginning with those seeking admission for the fall 2026 semester.');
```

## 3. Northwestern University

`id = '6ef16496-8094-42d1-8d15-05e72a8fdc95'`

**Sources actually used:**
1. `https://admissions.northwestern.edu/faqs/standardized-testing-policy` — official
   undergraduate admissions testing-policy FAQ.
2. `https://admissions.northwestern.edu/faqs/international-applicants` — official undergraduate
   admissions international-applicants FAQ.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('6ef16496-8094-42d1-8d15-05e72a8fdc95', 'standardized_test',
   'Test-optional: SAT/ACT not required for first-year or transfer applicants',
   'Northwestern will not require ACT or SAT scores from first-year or transfer candidates. Submission is voluntary and applying without a score does not affect the review process. If submitted, Northwestern superscores across sittings and does not prefer either exam.',
   false, 'medium', 'https://admissions.northwestern.edu/faqs/standardized-testing-policy', now()),
  ('6ef16496-8094-42d1-8d15-05e72a8fdc95', 'english_proficiency',
   'English proficiency required if first/primary language or secondary schooling was not English; no published minimum score',
   'Any applicant whose first/primary language is not English or whose secondary schooling has not been in English must submit proof of English proficiency: Duolingo English Test (DET), IELTS (including IELTS Indicator), or TOEFL iBT (including Home Edition, but not TOEFL ITP Plus for China Solution). No minimum score is published; scores must be submitted officially, never self-reported, and are not superscored.',
   true, 'medium', 'https://admissions.northwestern.edu/faqs/international-applicants', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('6ef16496-8094-42d1-8d15-05e72a8fdc95', 'https://admissions.northwestern.edu/faqs/standardized-testing-policy',
   'admissions.northwestern.edu', 'official_admissions_office', now(), 'medium',
   'Northwestern follows a test-optional policy and will not require ACT or SAT scores from first-year or transfer candidates.'),
  ('6ef16496-8094-42d1-8d15-05e72a8fdc95', 'https://admissions.northwestern.edu/faqs/international-applicants',
   'admissions.northwestern.edu', 'official_admissions_office', now(), 'medium',
   'Any Northwestern applicant whose first/primary language is not English or whose secondary schooling has not been in English is required to submit proof of English proficiency.');
```

## 4. University of California, San Diego (UCSD)

`id = '9206ad82-0b07-4aad-9fc9-07b9bec788c3'`

**Sources actually used:**
1. `https://admissions.ucsd.edu/first-year/application-requirements.html` — official first-year
   admission requirements page (testing policy, GPA).
2. `https://admission.universityofcalifornia.edu/admission-requirements/international-applicants/english-language-proficiency-toefl-ielts.html`
   — official UC-systemwide English-language-proficiency policy page.

**Checked and a real ambiguity flagged, not smoothed over:** the English-proficiency source
above states scores "must be completed no more than two years prior to **transfer**," which
reads as possibly transfer-applicant-specific rather than confirmed for first-year applicants.
Inserted anyway at `medium` confidence with this caveat stated directly in
`requirement_detail`, rather than silently treating "possibly transfer-only" as "confirmed for
everyone" — the honest middle ground between omitting it and overstating it.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('9206ad82-0b07-4aad-9fc9-07b9bec788c3', 'standardized_test',
   'Test-blind: SAT/ACT not considered for admission or scholarship decisions',
   'UC San Diego does not consider SAT or ACT scores as a factor in admission or scholarship decisions. If submitted anyway, scores may be used only for course placement after enrollment, never for the admission decision itself.',
   false, 'medium', 'https://admissions.ucsd.edu/first-year/application-requirements.html', now()),
  ('9206ad82-0b07-4aad-9fc9-07b9bec788c3', 'minimum_grade',
   'GPA: 3.0 minimum for California residents, 3.4 minimum for non-residents and international applicants',
   'California residents must earn a GPA of 3.0 or better with no grade lower than "C" in A-G college-preparatory coursework taken in 10th and 11th grade. Non-California residents, including international applicants, must earn a GPA of 3.4 or better under the same conditions.',
   true, 'medium', 'https://admissions.ucsd.edu/first-year/application-requirements.html', now()),
  ('9206ad82-0b07-4aad-9fc9-07b9bec788c3', 'english_proficiency',
   'TOEFL 83+ (or 4.5+ on the new scale) or IELTS 7.0+ — source states this in the context of transfer applicants specifically, not confirmed for first-year',
   'The UC-systemwide English-language-proficiency page states international applicants must submit a TOEFL score of 83 or higher (internet-based, pre-2026 scale) or 4.5 or higher (new iBT scale from January 2026), or an IELTS academic-module score of 7.0 or higher, completed no more than two years prior to transfer. The "prior to transfer" phrasing means this may be transfer-specific rather than confirmed for first-year applicants -- flagged here rather than asserted as universal.',
   false, 'medium', 'https://admission.universityofcalifornia.edu/admission-requirements/international-applicants/english-language-proficiency-toefl-ielts.html', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('9206ad82-0b07-4aad-9fc9-07b9bec788c3', 'https://admissions.ucsd.edu/first-year/application-requirements.html',
   'admissions.ucsd.edu', 'official_admissions_office', now(), 'medium',
   'UC San Diego does not consider SAT or ACT test scores as a factor in admissions or scholarship decisions. California residents must earn a GPA of 3.0 (or better)... Non-California residents, including International applicants, must earn a GPA of 3.4 (or better).'),
  ('9206ad82-0b07-4aad-9fc9-07b9bec788c3', 'https://admission.universityofcalifornia.edu/admission-requirements/international-applicants/english-language-proficiency-toefl-ielts.html',
   'admission.universityofcalifornia.edu', 'official_admissions_office', now(), 'medium',
   'International students must submit a TOEFL score of 4.5 or better (Internet-based test) or 83 or higher..., or IELTS with a 7 or better band score.');
```

## 5. University of Notre Dame

`id = 'b7f447a3-edea-4c0e-b814-7d53ec18958a'`

**Sources actually used:**
1. `https://admissions.nd.edu/apply/evaluation-criteria/` — official undergraduate admissions
   testing policy.
2. `https://admissions.nd.edu/apply/resources-for/international-applicants/application-information/`
   — official undergraduate international-applicants page.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('b7f447a3-edea-4c0e-b814-7d53ec18958a', 'standardized_test',
   'Test-optional through the 2026-27 cycle for first-year and transfer applicants',
   'Notre Dame is test-optional for all first-year and transfer applicants through the 2026-27 admissions cycle. Scores, if submitted, are superscored across all test dates (SAT and ACT). Mid-50% range for admitted students: 1460-1540 SAT, 33-35 ACT.',
   false, 'medium', 'https://admissions.nd.edu/apply/evaluation-criteria/', now()),
  ('b7f447a3-edea-4c0e-b814-7d53ec18958a', 'english_proficiency',
   'TOEFL 100/125 recommended, IELTS 7.0 minimum, DET 120 minimum; waived if SAT EBRW 650+',
   'English proficiency testing is required if the applicant''s first language is not English or secondary education was not primarily in English. Accepted: TOEFL (100/125 strongly recommended), IELTS (7.0 minimum overall band), Duolingo English Test (120 minimum), or PTE Academic. Waived if the applicant scores 650 or higher on the SAT Evidence-Based Reading and Writing section, or if a testing site is unavailable (DET substituted).',
   true, 'medium', 'https://admissions.nd.edu/apply/resources-for/international-applicants/application-information/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('b7f447a3-edea-4c0e-b814-7d53ec18958a', 'https://admissions.nd.edu/apply/evaluation-criteria/',
   'admissions.nd.edu', 'official_admissions_office', now(), 'medium',
   'Notre Dame is test-optional for all applicants through the 2026-27 school year.'),
  ('b7f447a3-edea-4c0e-b814-7d53ec18958a', 'https://admissions.nd.edu/apply/resources-for/international-applicants/application-information/',
   'admissions.nd.edu', 'official_admissions_office', now(), 'medium',
   'Notre Dame strongly recommends 100 out of 125 on the Internet-based TOEFL exam. IELTS: a minimum overall band score of 7.0 is required. Duolingo English Test: a minimum score of 120 is required.');
```

## 6. University of Virginia

`id = '2861b0d3-a42b-4c5a-8451-d32623575ae8'`

**Sources actually used:**
1. `https://admission.virginia.edu/taxonomy/term/111` — official undergraduate admissions
   testing-and-scores page.

**Checked and not found:** undergraduate-specific English-proficiency policy (see doc header —
both results found were graduate-program pages, MS in Business Analytics and the Batten
graduate policy school). No `english_proficiency` row written.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('2861b0d3-a42b-4c5a-8451-d32623575ae8', 'standardized_test',
   'Test-optional for the Fall 2026 admission cycle',
   'UVA is test-optional for the Fall 2026 cycle, with no preference between SAT and ACT. Applicants are not disadvantaged by choosing not to submit scores. If submitted, the university uses the top score from each SAT section across all administrations, and ACT scores are read as reported without recalculation. Test-optional decisions can be changed up to a stated deadline (Nov 22 for Early Decision/Action, Jan 15 for Regular Decision) by emailing admissions.',
   false, 'medium', 'https://admission.virginia.edu/taxonomy/term/111', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('2861b0d3-a42b-4c5a-8451-d32623575ae8', 'https://admission.virginia.edu/taxonomy/term/111',
   'admission.virginia.edu', 'official_admissions_office', now(), 'medium',
   'UVA is test optional for the Fall 2026 cycle and has no preference between the SAT and ACT.');
```

## 7. Vanderbilt University

`id = '0de92c2f-404d-42e0-93ff-2582a8175534'`

**Sources actually used:**
1. `https://admissions.vanderbilt.edu/apply/testing-policies/` — official undergraduate
   admissions testing-policy page.
2. Search-summarized from `admissions.vanderbilt.edu` for the English-proficiency policy
   (specific sub-page URL not directly resolved in this pass — see confidence rating).

**The cycle-scoped fact this batch most needs the founder to actually read:** Vanderbilt's
testing policy is not a stable "test-optional" statement — it is test-optional **only through
fall 2028**, with testing becoming **required starting fall 2029**. A student using this data
in 2029 or later would be reading an already-superseded policy if only "test-optional" were
stored without the cycle qualifier.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('0de92c2f-404d-42e0-93ff-2582a8175534', 'standardized_test',
   'Test-optional through fall 2028 admission; SAT/ACT required starting fall 2029',
   'Vanderbilt is test-optional for undergraduate applicants entering fall 2027 and fall 2028 (applies to first-year, transfer, international, and homeschool applicants alike) -- applicants indicate whether to be considered with or without scores. Standardized testing (SAT or ACT) will be REQUIRED for applicants entering fall 2029 and beyond. This is a scheduled policy change, not a possibility -- the fall-2029 requirement should be treated as confirmed, not speculative, once that cycle arrives.',
   false, 'medium', 'https://admissions.vanderbilt.edu/apply/testing-policies/', now()),
  ('0de92c2f-404d-42e0-93ff-2582a8175534', 'english_proficiency',
   'TOEFL 100 or IELTS 7.0 for undergraduates, unless exempted by a qualifying SAT/ACT score',
   'Undergraduate applicants whose first language or language of instruction is not English must submit TOEFL (100+) or IELTS (7.0+), unless exempt: exemption applies if the applicant scores above 26 on the ACT English section or above 630 on the SAT Evidence-Based Reading and Writing section. Also accepted: TOEFL Essentials, Cambridge C1 Advanced/C2 Proficiency, LanguageCert, Duolingo English Test. Specific sub-page URL not independently re-resolved in this pass -- rated medium on that basis in addition to the general search-summary caveat in this doc''s header.',
   true, 'medium', 'https://admissions.vanderbilt.edu/apply/testing-policies/', now());

insert into public.university_sources
  (university_id, source_url, source_domain, source_type, retrieved_at, confidence, raw_excerpt)
values
  ('0de92c2f-404d-42e0-93ff-2582a8175534', 'https://admissions.vanderbilt.edu/apply/testing-policies/',
   'admissions.vanderbilt.edu', 'official_admissions_office', now(), 'medium',
   'Vanderbilt University will continue its test-optional policy for students applying for undergraduate admission to the classes entering in the fall of 2027 or 2028... ACT or SAT exam scores will be required for students applying for fall 2029.');
```

---

## Verification

Read-only against the live database (measurement queries only) plus `WebSearch` for the actual
content — no code changed, no live database writes. SQL above is staged for CEO/founder review
and application, not applied. Every `university_requirements` row above will, once applied,
move these 7 universities from "partial" (program-only) to "has both" — closing the exact gap
this batch was scoped to, without touching the already-populated program tables.
