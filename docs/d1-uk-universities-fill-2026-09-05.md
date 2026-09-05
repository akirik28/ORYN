# D1 — United Kingdom universities fill, 2026-09-05

Founder's instruction relayed by CEO (session "CEO"), assigned after the QS 101-150 batch
merged (`07130093`): whoever is idle fills opportunity/university gaps. **This session's lane:
United Kingdom** — CEO measured live and chose this country deliberately, not arbitrarily:

| country | total | missing requirements |
|---|--:|--:|
| USA | 131 | 94 |
| **United Kingdom** | 79 | **54** |
| Germany | 49 | 32 |
| Italy | 38 | 31 |
| Turkey | 12 | 0 (already complete) |
| Netherlands | 13 | 0 (already complete) |

CEO's stated reasoning: UK entry requirements are structural (A-Level/IB grade profile, UCAS
code, IELTS threshold) so this data feeds the requirement-check feature directly rather than
sitting as free text; Turkish students target the UK heavily; and 54 is more manageable than
the USA's 94.

## Measured live before writing anything (own query, reconciled against CEO's number)

76 canonical UK universities (3 more are `duplicate_status='superseded'`, correctly excluded —
no point spending research time on a row a supersession mapping already points away from).
Breaking down by table:

```
neither university_requirements nor university_programs:   51
university_requirements only:                                1  (already fine, not in scope)
university_programs only (no requirements):                   3  (Leicester, City St George's, York)
both tables populated:                                       21
```

51 + 3 = **54**, reconciling exactly with CEO's own count — confirming CEO's number measures
"missing `university_requirements`" specifically (not the browse filter's own union-of-either
logic, under which the 3 programs-only rows already pass `detailedOnly` today). **Per CEO's
explicit ask, the 3 programs-only universities are flagged as the cheaper wins below** — they
already have a real programs table, so today's work is adding requirements only, not building
a university profile from zero.

**Note on a name that will look wrong if not explained:** Newcastle University (`id =
d1abbc0d-...`) appears in this session's own "missing requirements" list even though this same
session wrote a full requirements entry for it hours ago in the QS 101-150 batch
(`docs/d1-qs-101-150-fill-2026-09-05.md`, entry #27). That SQL is **staged, not applied** — per
this project's standing rule, every batch in this doc (like every batch before it) stops at a
markdown file; CEO packages, applies, and assigns the migration number separately. The live
database correctly still shows zero rows for Newcastle until that separate step happens. Not
re-researching Newcastle here; its already-staged entry stands.

**Ordering:** by QS World University Ranking ascending (nulls/band-ranks like "801-850" sorted
by their first number, unranked last) — the highest-value, most-recognizable-to-a-Turkish-
applicant universities get researched first. University of Leeds (QS **77**) having zero
requirements rows was the single most surprising line in the measurement.

## Standing methodology (unchanged from every prior batch)

Official source only (university's own site → government dataset → application platform →
secondary source, clearly labeled last resort) · `source_url` + retrieval date on every fact ·
unfound fields left NULL, never guessed · an inaccessible official page (HTTP 403/404, or
content that only renders client-side and defeats this session's fetch tooling) is marked
`data_confidence='medium'` with the reason stated, never silently treated as "no information
exists" · **program or requirement content is what the browse filter actually checks now**
(`d8e6fa43`) — a bare source-citation row does not move a university into the "detailed
profiles" list, so this batch does not waste effort on that alone.

## A standing finding, not new to this batch: the TOEFL iBT rescale

Independently corroborated **eight separate times** across today's two batches (QS 101-150 and
now the start of this one) — HKUST, Auckland, Leeds, KTH, DTU, Aarhus, University of California
(official system-wide page, exact quote), and Newcastle University (official page, full
per-sub-skill breakdown on both sides of the transition). **TOEFL iBT introduced a genuine new
6-point scale effective 21 January 2026** — a legacy score in the 60-120 range and a post-
rescale score in the roughly 1-6 range are NOT a data error when they appear for the same test
administration boundary; they reflect a real scale change. Recording this as a standalone note
here because CEO named the risk explicitly: **the next fill batch (Germany or Italy, whichever
lane picks it up) will hit the exact same "TOEFL score looks wrong" moment**, and should not
re-litigate it as a possible mistake — check the retrieval/exam date against 21 January 2026
before assuming an error.

**SQL below is staged, not applied** — CEO packages, applies, and assigns the migration number.

---

## 1. University of Leeds

`id = 'c66ae4af-34f8-4679-a38f-924096bf0e52'` — QS rank 77, the most surprising zero-requirements
row in the whole measurement.

**Source actually used:** `https://www.leeds.ac.uk/international-applying/doc/entry-requirements`
— official page, directly fetched, undergraduate-specific figures isolated from the same page's
Masters/Research-degree figures (a first search summary had blended the undergraduate 6.0 with
the Masters 6.5 as if one number — corrected against the page's own per-level breakdown).

**Ninth independent corroboration of the TOEFL iBT rescale today**, with Leeds' own specific
post-rescale mapping: a flat 4 across every component (not 4.5, the figure several other
universities used) — a real per-institution variation in how the new scale was adopted, not an
inconsistency to flag as an error.

**What was checked and NOT found:** Leeds does not publish one university-wide academic
threshold for international applicants — it directs applicants to a country-specific
qualification-equivalency system instead ("check the accepted qualifications for your country
or region"), so no single GPA/grade figure exists to record; application deadline, tuition, and
admission rate were not on the page reached in this pass.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('c66ae4af-34f8-4679-a38f-924096bf0e52', 'english_proficiency',
   'IELTS 6.0 overall (5.5+ per component), TOEFL iBT 80 legacy / 4 new scale (from 21 Jan 2026), or PTE Academic 60 overall (59+ per component); undergraduate-specific -- Masters/Research-degree thresholds are higher on the same page',
   'Undergraduate: IELTS Academic or IELTS for UKVI (Academic) 6.0 overall, no less than 5.5 in each component. PTE Academic or PTE Academic UKVI: 60 overall, no less than 59 in each component. TOEFL iBT: 80 overall with minimums Reading 18, Listening 17, Speaking 20, Writing 19 for tests taken before 21 January 2026; from 21 January 2026 (new scale), 4 overall with no less than 4 in each component. Results cannot be more than two years old at course start. (Masters requires IELTS 6.5/6.0 per component; Research Degrees require the same as undergraduate -- not to be conflated with the undergraduate figures above.)',
   true, 'high', 'https://www.leeds.ac.uk/international-applying/doc/entry-requirements', now()),
  ('c66ae4af-34f8-4679-a38f-924096bf0e52', 'international_requirement',
   'No single university-wide academic threshold for international applicants -- Leeds assesses each applicant against a country-specific qualification-equivalency list; an International Foundation Year exists for applicants who do not yet meet direct-entry requirements',
   'Leeds does not publish one university-wide minimum grade/GPA for international applicants. Instead, applicants are directed to check accepted qualifications for their specific country or region against Leeds'' own equivalency list. An International Foundation Year is available for underqualified applicants, including pre-sessional English courses to raise academic English ahead of degree study.',
   false, 'high', 'https://www.leeds.ac.uk/international-applying/doc/entry-requirements', now());
```

---

## 2. University of York — cheaper win: already has 34 programme rows, only requirements missing

`id = '2a48eaab-020e-43d7-bc43-f70ac8ee5c86'` — QS rank 158, skipped Newcastle (seq 2 in the
priority order) since its requirements are already staged in the QS 101-150 doc.

**Source actually used:** `https://www.york.ac.uk/study/undergraduate/applying/entry/english-
language/` — official undergraduate-specific page (a first search had cited "IELTS 6.5/6.0" as
if it were a single fixed threshold; the official page itself states scores are set **per
course**, not university-wide, so that figure is recorded below at `medium` confidence,
labeled explicitly as the commonly-cited standard rather than a confirmed single number).

**What was checked and NOT found:** a single numeric IELTS/TOEFL threshold — the page explicitly
defers to individual course pages rather than publishing one; enumerating all of York's
course-specific bands was out of scope for this pass. Tuition, deadline, admission rate: not
checked given the above.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('2a48eaab-020e-43d7-bc43-f70ac8ee5c86', 'english_proficiency',
   'Score thresholds are set per course, not university-wide; a commonly-cited standard figure is IELTS 6.5 overall (6.0+ per component), but this was not independently confirmed as universal on the official page itself',
   'York''s own undergraduate English-language page states that accepted qualification types (IELTS, TOEFL iBT, PTE Academic, and others) apply "for our undergraduate degrees," but explicitly does not publish one fixed score threshold -- individual course pages set their own. A commonly-cited figure (IELTS 6.5 overall, 6.0 per component) appears widely but was not confirmed as the single official standard by this session''s own direct read of the page.',
   true, 'medium', 'https://www.york.ac.uk/study/undergraduate/applying/entry/english-language/', now()),
  ('2a48eaab-020e-43d7-bc43-f70ac8ee5c86', 'international_requirement',
   'Exempt from English-language evidence: UK nationals, nationals of a UKVI-listed majority-English-speaking country, or anyone who completed a degree taught in English in the UK/Ireland/a listed country within 7 years of course start',
   'No English-language evidence is required from: UK nationals; nationals of a country UK Visas and Immigration (UKVI) lists as majority-English-speaking; or an applicant who has completed a degree (taught in English) in the UK, Ireland, or one of those listed countries, within seven years of the intended course start date. Test results, where required, cannot be more than two years old and cannot be combined across different test sittings or test types.',
   false, 'high', 'https://www.york.ac.uk/study/undergraduate/applying/entry/english-language/', now());
```

---

## 3. Lancaster University

`id = 'e9dc6d39-be4c-40f1-a680-446dcabc2f07'` — QS rank 164.

**Source actually used:** `https://www.lancaster.ac.uk/study/entry-requirements/undergraduate-
english-requirements/` — official page, directly fetched. A first search's "7.0" figure turned
out to be the **Medicine and Surgery-specific** threshold, not the general standard (6.5) --
caught by reading the page's own structure rather than the search summary, the same
course-specific-vs-general conflation risk already seen once this batch (York).

**Tenth independent corroboration of the TOEFL iBT rescale today:** 87 (legacy, with
per-component minimums 17/18/17/20) becoming 4.5 (new scale, 4+ per element) from 21 January
2026 -- consistent with the pattern, not an error.

**What was checked and NOT found:** a university-wide academic grade/GPA threshold -- Lancaster
states some science, mathematics, and social work courses set their own separate requirements
rather than following one unified tiered system, so no single figure exists to record; deadline,
tuition, and admission rate were not on the page reached in this pass.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('e9dc6d39-be4c-40f1-a680-446dcabc2f07', 'english_proficiency',
   'Standard undergraduate: IELTS 6.5 overall (5.5+ per element), TOEFL iBT 87 legacy / 4.5 new scale (from 21 Jan 2026, 4+ per element); Medicine and Surgery require IELTS 7.0 with no component below 7.0 -- a materially stricter, programme-specific exception',
   'Standard entry-level requirement for most undergraduate courses: IELTS Academic 6.5 overall, minimum 5.5 in each element. TOEFL iBT before 21 January 2026: 87 overall, minimums Listening 17, Reading 18, Speaking 17, Writing 20. TOEFL iBT from 21 January 2026 (new scale): 4.5 overall, minimum 4 in each element. IELTS/TOEFL/Pearson/LanguageCert certificates are valid for 2 years from test date and must remain valid at course start. Medicine and Surgery require IELTS 7.0 overall with no component below 7.0 (or equivalent Pearson PTE) -- a stricter, programme-specific exception to the standard figure above. Some science, mathematics, and social work courses set their own separate requirements on individual course pages rather than following this unified structure.',
   true, 'high', 'https://www.lancaster.ac.uk/study/entry-requirements/undergraduate-english-requirements/', now());
```

---

## 4. Queen's University Belfast

`id = 'e960cef6-a0d3-413c-b10d-b7335bd7b122'` — QS rank =174.

**Access note:** both the official English-requirements page and QUB's own published English
Language Policy PDF returned HTTP 403 to a direct fetch. Recorded at `medium` confidence from
a general search's summary of the same official page instead.

**What was checked and NOT found:** TOEFL iBT-specific numbers (before/after the 21 January
2026 rescale) -- the search summary confirmed TOEFL iBT is accepted but did not carry a score
figure; application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('e960cef6-a0d3-413c-b10d-b7335bd7b122', 'english_proficiency',
   'Standard undergraduate: IELTS Academic 6.0 overall, minimum 5.5 in each of the four elements; IELTS One Skill Retake accepted; some courses set higher or lower thresholds via the University Coursefinder',
   'For direct undergraduate admission, standard IELTS Academic requirement is 6.0 overall with a minimum of 5.5 in each of the four elements (Listening, Reading, Writing, Speaking). IELTS One Skill Retake results are accepted. Queen''s states some courses have higher or lower requirements than this standard figure, checked via the individual programme''s own Coursefinder entry -- not enumerated here. TOEFL iBT is also accepted for direct admission, but a specific score threshold was not confirmed in this pass (official page and policy PDF both returned HTTP 403 to direct access).',
   true, 'medium', 'https://www.qub.ac.uk/Study/international-students/applying/english-language-requirements', now());
```

---

## 5. Cardiff University

`id = 'a6d04869-f7a1-48b5-b4e8-2b56acccdac6'` — QS rank =179.

**Access note:** the official undergraduate English-requirements page returned HTTP 403 to a
direct fetch. Recorded at `medium` confidence from a general search's summary instead.

**A genuinely distinctive, actionable fact if it survives independent confirmation:** Cardiff
is reported to accept IELTS Academic (including One Skill Retake) from any test centre but to
NOT currently accept the online IELTS test -- a specific exclusion, not merely an omission, but
flagged at the same medium confidence as the rest of this entry since it comes from the same
unconfirmed search summary rather than this session's own read of the page.

**What was checked and NOT found:** TOEFL iBT-specific score, application deadline, tuition,
admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('a6d04869-f7a1-48b5-b4e8-2b56acccdac6', 'english_proficiency',
   'University minimum: IELTS Academic 6.5 overall, 5.5+ per subskill; some courses set higher; online IELTS reportedly NOT accepted (only in-person test centres, including One Skill Retake) -- this specific exclusion not independently confirmed',
   'Cardiff''s stated university-wide minimum is IELTS (Academic) 6.5 overall with a minimum of 5.5 in each subskill; individual undergraduate courses'' admissions tutors may require higher scores. Cardiff reportedly accepts IELTS (Academic) tests, including the One Skill Retake, from any physical IELTS test centre, but does not currently accept the online IELTS test -- this specific exclusion was not independently confirmed by this session''s own fetch of the official page (HTTP 403). A pre-sessional English course exists for applicants who do not yet meet the requirement for their intended course.',
   true, 'medium', 'https://www.cardiff.ac.uk/study/international/english-language-requirements/undergraduate', now());
```

---

## 6. University of Reading

`id = '27cc7719-09ea-4c0b-990a-0addac7ce1df'` — QS rank =196.

**Source actually used:** `https://www.reading.ac.uk/admissions/standard-english-language-
requirements` — official page, directly fetched.

**Structural clarification checked directly rather than assumed:** Reading does not use named
tiers/bands (an initial search's "depending on the course" phrasing could have implied a
lettered-band system like some other Russell Group universities use) -- confirmed instead that
requirements are set per School/Department, with a clear most-common figure and named
exceptions on both ends.

**What was checked and NOT found:** TOEFL iBT-equivalent scores -- the page itself states none
and instead defers to a separate "Acceptable English Language proficiency tests" page, not
fetched in this pass; application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('27cc7719-09ea-4c0b-990a-0addac7ce1df', 'english_proficiency',
   'Most common undergraduate requirement: IELTS 6.5 overall (5.5+ per element); some departments require 7.0/6.0 or 6.5/6.0; Clinical Language Sciences requires up to 8.0 overall (7.5+ per element) -- set per School/Department, no named band system',
   'Requirements are set per School/Department rather than via named tiers. Most common: IELTS 6.5 overall, no element below 5.5. Higher-requirement departments: 7.0 overall (no element below 6.0), or 6.5 overall (no element below 6.0). Highest: Clinical Language Sciences (e.g. Speech and Language Therapy) requires up to 8.0 overall, no element below 7.5. The university states it can advise individually on the best route (e.g. pre-sessional English) for an applicant not yet meeting their course''s specific level. TOEFL iBT equivalents are not listed on this page -- Reading directs applicants to a separate acceptable-tests page instead.',
   true, 'high', 'https://www.reading.ac.uk/admissions/standard-english-language-requirements', now());
```

---

## 7. University of Strathclyde

`id = 'eaf2b11c-e8ce-4a34-8392-fe5f61e08f3e'` — QS rank =230.

**Source actually used:** `https://www.strath.ac.uk/studywithus/englishlanguagerequirements/` —
official page, directly fetched. A first search surfaced only the Faculty of Engineering's own
(lower) figure; the general university-wide standard is confirmed higher on the main page --
recorded both rather than only the one a narrower search happened to return first.

**What was checked and NOT found:** TOEFL/PTE-equivalent scores (page defers to a separate
Recognised English Language Qualifications page, not fetched in this pass); application
deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('eaf2b11c-e8ce-4a34-8392-fe5f61e08f3e', 'english_proficiency',
   'General standard: IELTS 6.5 overall (5.5+ per band); Faculty of Science and Faculty of Engineering (undergraduate) both set a lower 6.0 overall (5.5+ per band); some individual courses differ from both',
   'General university-wide standard for undergraduate entry: IELTS (Academic) 6.5 overall, no individual band below 5.5. Two faculties set a lower figure specifically for undergraduate study: Faculty of Science and Faculty of Engineering both require IELTS (Academic) 6.0 overall, no individual band below 5.5. Strathclyde states some individual degree programmes differ from both of these and must be checked on their own course page. English Language Teaching courses are available to raise proficiency without retaking IELTS; a University preparation pathway exists via the Strathclyde International Study Centre for applicants not yet meeting academic entry requirements.',
   true, 'high', 'https://www.strath.ac.uk/studywithus/englishlanguagerequirements/', now());
```

---

## 8. University of Surrey

`id = '34127109-679a-4882-a579-c253febbaa5c'` — QS rank =246.

**Source actually used:** `https://www.surrey.ac.uk/apply/international/english-language-
requirements` — official page, directly fetched.

**Eleventh independent corroboration of the TOEFL iBT rescale today:** the page itself
publishes separate "new system"/"old system (pre-21 January 2026)" conversion tables, matching
today's pattern exactly even though a specific numeric TOEFL threshold wasn't extracted from
this pass.

**A genuine per-course structure, confirmed directly rather than assumed:** like York, Surrey
does not publish one fixed IELTS number for all undergraduate courses on this page -- it directs
applicants to individual course pages. A commonly-cited figure (6.5 overall, 6.0 per component)
appears in general search summaries; recorded at `medium` confidence since the official page
itself did not state it as a single fixed threshold.

**What was checked and NOT found:** the specific TOEFL iBT number on either side of the
rescale; application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('34127109-679a-4882-a579-c253febbaa5c', 'english_proficiency',
   'IELTS Academic, including IELTS Online and One Skill Retake results, accepted; specific score set per course rather than one university-wide figure -- a commonly-cited standard is 6.5 overall with 6.0+ per component; results valid within the past 2 years',
   'Surrey accepts IELTS Academic, explicitly including the IELTS Online delivery format and One Skill Retake results -- notably more permissive than at least one other UK university in this batch (Cardiff) which reportedly excludes online IELTS. The university publishes separate TOEFL iBT conversion tables for the "new system" and "old system" (pre-21 January 2026), confirming it follows the same industry-wide rescale, though a specific numeric threshold was not extracted in this pass. The exact IELTS overall/component minimum is set per undergraduate course rather than fixed university-wide; a commonly-cited figure is 6.5 overall with no component below 6.0, not independently confirmed as the single official standard. Test results must be within the past two years of the course start date.',
   true, 'medium', 'https://www.surrey.ac.uk/apply/international/english-language-requirements', now());
```

---

## 9. University of Sussex

`id = 'aad9dd7f-323a-4cec-880b-c9661502daed'` — QS rank 273.

**Source actually used:** `https://www.sussex.ac.uk/study/undergraduate/apply/international-
qualifications/english-language-requirements` — official page, directly fetched, full
three-tier table on both TOEFL scales.

**A genuine named three-tier system, confirmed directly:** Sussex explicitly grades courses
into Standard/High/Advanced English requirements -- a real structural fact, and a direct
contrast with Lancaster (this same batch, entry #3) which explicitly does NOT use named tiers.
Two UK universities researched back to back turned out to use opposite structures; recorded
each as actually found rather than assuming one pattern generalizes across the whole country.

**Twelfth independent corroboration of the TOEFL iBT rescale today**, and the richest single
data point yet -- all three tiers given on both sides of the 21 January 2026 transition.

**What was checked and NOT found:** which specific courses map to which tier (course-level
granularity was out of scope for this pass); application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('aad9dd7f-323a-4cec-880b-c9661502daed', 'english_proficiency',
   'Three named tiers by course -- Standard: IELTS 6.0 (5.5+/skill), TOEFL iBT 80 legacy/4.0 new scale; High: IELTS 6.5 (6.0+/skill), TOEFL 88/4.5; Advanced: IELTS 7.0 (6.5+/skill), TOEFL 95/5.0 -- new-scale figures apply to tests from 21 Jan 2026',
   'Sussex grades undergraduate courses into three named English-language tiers, each course page stating which applies. IELTS Academic: Standard 6.0 overall (5.5 in each of Listening/Reading/Speaking/Writing); High 6.5 overall (6.0 each); Advanced 7.0 overall (6.5 each). TOEFL iBT before 21 January 2026: Standard 80 (L17/R18/S20/W17); High 88 (L20/R19/S21/W23); Advanced 95 (L22/R23/S23/W24). TOEFL iBT from 21 January 2026 (new scale): Standard 4.0 (4 each skill); High 4.5 (4 each skill); Advanced 5.0 (4.5 each skill). Applicants without a current valid test score may still apply, with any offer conditional on meeting the stated tier; a Sussex Centre for Language Studies pre-sessional course is available as an alternative route.',
   true, 'high', 'https://www.sussex.ac.uk/study/undergraduate/apply/international-qualifications/english-language-requirements', now());
```

---

## 10. University of Aberdeen

`id = 'fd9f4dfe-e65c-4ad1-b6b7-7446cc1a90a3'` — QS rank 288.

**Source actually used:** `https://www.abdn.ac.uk/study/international/english/undergraduate-
degrees---english-requirements/` — official page, directly fetched. A first search summary
had stated Medicine's requirement as IELTS 6.0 overall while calling it "higher" than standard
-- internally contradictory, since standard is also 6.0. The official page itself resolves
this: Medicine is actually 7.0 overall (Speaking specifically 7.0), genuinely higher than
standard's 6.0 as the summary claimed but with the wrong number attached. Used the page's own
figure, not the search summary's.

**Thirteenth independent corroboration of the TOEFL iBT rescale today**, with a real quirk
worth flagging rather than silently smoothing: Medicine's LEGACY overall requirement (100) is
far above standard's (78), but Medicine's NEW-SCALE figure is stated as the same "4-4.5" range
as standard -- either a genuine compression at the top of the rescaled range, or Aberdeen has
not yet differentiated Medicine's new-scale figure from standard's. Recorded exactly as the
official page states it, not adjusted to match the legacy gap.

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('fd9f4dfe-e65c-4ad1-b6b7-7446cc1a90a3', 'english_proficiency',
   'Standard undergraduate: IELTS 6.0 overall (5.5+ Listening/Reading/Speaking, 6.0+ Writing), TOEFL iBT 78 legacy / 4-4.5 new scale; Medicine (MBChB): IELTS 7.0 overall (Speaking 7.0 specifically), TOEFL 100 legacy / 4-4.5 new scale -- alternative tests not accepted for Medicine',
   'Standard undergraduate IELTS Academic: Overall 6.0, Listening 5.5+, Reading 5.5+, Speaking 5.5+, Writing 6.0+. TOEFL iBT before 21 Jan 2026: Overall 78+, Listening 17+, Reading 18+, Speaking 20+, Writing 21+. TOEFL iBT from 21 Jan 2026 (new scale): Overall 4-4.5, Listening 4+, Reading 4+, Speaking 4+, Writing 4.5+. Medicine (MBChB) is a stricter, alternative-tests-not-accepted exception: IELTS Overall 7.0, Listening 5.5+, Reading 5.5+, Speaking 7.0+, Writing 6.0+; TOEFL legacy Overall 100+; TOEFL new scale stated as the same 4-4.5 range as standard undergraduate, despite the much higher legacy figure -- recorded as officially stated, not reconciled. Nationals of several countries (Australia, Canada, Ireland, Malta, New Zealand, UK, USA, among others) and holders of specific English-medium qualifications (A-Levels/IB in English, English-medium degrees) are exempt from providing a test.',
   true, 'high', 'https://www.abdn.ac.uk/study/international/english/undergraduate-degrees---english-requirements/', now());
```

---

## 11. University of Leicester — cheaper win: already has 98 programme rows, only requirements missing

`id = '65a15e7d-1cfd-4108-91b0-130aa738b84c'` — QS rank 314.

**Access note:** the main English-requirements page returned HTTP 403 to a direct fetch. The
facts below come from Leicester's own page titles surfaced by search (literal official text,
not a third-party synthesis) rather than a page body this session read directly -- recorded at
`medium` confidence for that reason.

**A genuinely useful structural fact confirmed via the pre-sessional course ladder itself:**
Leicester's own course-title naming makes the IELTS-to-weeks-of-preparation relationship
concrete: 40 weeks needs a starting IELTS of just 4.0, 30 weeks needs 4.5, 20 weeks needs 5.0,
10 weeks needs 5.5, and 6 weeks needs 6.0 -- i.e. 6.0 reads as Leicester's de facto entry
target, consistent with every UK university in this batch clustering around 6.0-6.5.

**What was checked and NOT found:** a single confirmed IELTS overall figure for direct
undergraduate entry -- Leicester states every course page sets its own minimum, and no
university-wide number was found; TOEFL iBT equivalents, application deadline, tuition,
admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('65a15e7d-1cfd-4108-91b0-130aa738b84c', 'english_proficiency',
   'Every course page sets its own minimum IELTS score rather than one university-wide figure; the pre-sessional course ladder (6 weeks needs 6.0 to enter) implies 6.0 as the de facto standard entry target; test must be within the past 2 years; English-medium secondary/university education in an approved country is an alternative route',
   'Leicester states every degree course page specifies its own minimum IELTS score rather than publishing one university-wide figure. English-medium secondary school or university education in a country the University approves as English-medium is an alternative way to demonstrate proficiency. IELTS results must be within the past two years. Leicester''s own pre-sessional course ladder (English Language Teaching Unit) implies the practical entry target: 40-week course requires a starting IELTS of 4.0, 30-week requires 4.5, 20-week requires 5.0, 10-week requires 5.5, and 6-week requires 6.0 -- i.e. IELTS 6.0 is the point at which no further pre-sessional study is needed, functioning as the de facto standard even though no single official figure was located directly.',
   true, 'medium', 'https://le.ac.uk/study/international-students/english-language-requirements', now());
```

---

## 12. Swansea University

`id = 'c5386c21-9657-4ba9-9ce4-737de65bb045'` — QS rank 322.

**Source actually used:** `https://www.swansea.ac.uk/admissions/english-language-requirements/`
— official page, directly fetched, confirming the 6.0 headline figure; per-component minimums
and TOEFL numbers were not present on this page and were not located elsewhere in this pass.

**What was checked and NOT found:** IELTS per-component minimum, TOEFL iBT equivalents,
application deadline, tuition, admission rate. A search summary separately reported that
Swansea accepts IELTS (Academic) from any test centre for degree-level programmes (not
restricted to UKVI-approved centres, unlike sub-degree pathway programmes) -- recorded at
`medium` confidence since this specific nuance was not itself confirmed by this session's own
page fetch.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('c5386c21-9657-4ba9-9ce4-737de65bb045', 'english_proficiency',
   'Most academic departments require IELTS 6.0 (or equivalent) for undergraduate degrees; some courses set exceptions, checked per course page; reportedly IELTS from any test centre is accepted for degree-level study (not confirmed independently)',
   'Swansea''s official page states: "Most academic departments will ask for an IELTS score of 6.0 (or equivalent) for undergraduate degrees," with exceptions on specific course pages. Per-component minimums and TOEFL iBT-equivalent scores were not stated on the page reached in this pass. Applicants below IELTS 6.0 are directed to Swansea''s own English Language Training Services (ELTS) pre-sessional courses. A separate, unconfirmed report states Swansea accepts IELTS (Academic) from any test centre (not limited to UKVI-approved ones) for degree-level programmes specifically, unlike its below-degree-level pathway programmes.',
   true, 'medium', 'https://www.swansea.ac.uk/admissions/english-language-requirements/', now());
```

---

## 13. Heriot-Watt University

`id = 'fd61318c-882e-4d5d-a431-1ae057d88b29'` — QS rank 325.

**Source actually used:** `https://www.hw.ac.uk/study/how-to-apply/entry-requirements/english-
language-requirements` — official page, directly fetched. Heriot-Watt also operates Dubai and
Malaysia campuses (surfaced by search); the page itself does not separate requirements by
campus, so recorded as applying university-wide rather than assumed Edinburgh-specific.

**Fourteenth independent corroboration of the TOEFL iBT rescale today.**

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('fd61318c-882e-4d5d-a431-1ae057d88b29', 'english_proficiency',
   'IELTS Academic 6.0 overall (5.5+ per component), TOEFL iBT 79 legacy / 4 new scale (4.5 for Writing) from 21 Jan 2026; IELTS Indicator and General Training NOT accepted; PTE Academic and LanguageCert (UKVI versions) also accepted',
   'Standard undergraduate entry (stated as applying across Heriot-Watt''s campuses, not Edinburgh-specific): IELTS Academic 6.0 overall, no component below 5.5 -- IELTS Academic Online and One Skill Retake accepted, but IELTS Indicator and IELTS General Training are explicitly NOT accepted. TOEFL iBT before 21 January 2026: 79 overall (Reading 18, Listening 17, Speaking 20, Writing 21). TOEFL iBT from 21 January 2026 (new scale): 4 overall, no component below 4 except Writing which must be at least 4.5. PTE Academic and LanguageCert (UKVI versions, from a UKVI-approved centre) also accepted; Trinity ISE II accepted for UK-based sittings. A Pre-Sessional English Language Programme is available for applicants scoring as low as 5.0-5.5 (depending on pathway), completable within 19 months of the degree start date.',
   true, 'high', 'https://www.hw.ac.uk/study/how-to-apply/entry-requirements/english-language-requirements', now());
```

---

## 14. Brunel University of London

`id = 'e60df6fe-8d07-417d-b324-1c67d4c3e305'` — QS rank 353.

**Source actually used:** `https://www.brunel.ac.uk/international/applicants/how-to-apply-
international-students/requirements-for-international-students-at-Brunel` — official main-
domain page, directly fetched (a first search had surfaced only `pathway.brunel.ac.uk`, a
separate foundation-college subdomain, not the university's own direct-entry page -- re-searched
to find the correct main-domain source).

**What was checked and NOT found:** the page confirms Brunel sets requirements per course
rather than one fixed figure, but did not itself state numbers -- a general search separately
reports "between IELTS 6.0 and 7.0," most commonly 6.0 overall with 5.5 per component, and
TOEFL iBT 79 (legacy scale), recorded at `medium` confidence since not confirmed by this
session's own direct page read. Application deadline, tuition, admission rate: not found.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('e60df6fe-8d07-417d-b324-1c67d4c3e305', 'english_proficiency',
   'Set per course rather than one fixed university-wide figure, officially confirmed; courses generally ask for IELTS 6.0-7.0, most commonly 6.0 overall (5.5+ per component) -- specific figure not confirmed by direct page read',
   'Brunel''s own international-requirements page confirms English-language thresholds are set per course, directing applicants to each course''s own page rather than stating one figure -- confirmed directly. A general search separately reports Brunel''s courses generally require between IELTS 6.0 and 7.0, most commonly 6.0 overall with no component below 5.5, and TOEFL iBT 79 (legacy scale: Reading 18, Listening 17, Speaking 20, Writing 17); these specific numbers were not independently confirmed by this session''s own fetch of the official page. Pre-sessional English courses are available for applicants below their course''s threshold.',
   true, 'medium', 'https://www.brunel.ac.uk/international/applicants/how-to-apply-international-students/requirements-for-international-students-at-Brunel', now());
```

---

## 15. Birkbeck, University of London

`id = '5b16dcd1-0945-4cf0-b590-2448b24ceb82'` — QS rank 354.

**Source actually used:** `https://www.bbk.ac.uk/student-services/admissions/english-language-
qualifications-and-tests` — official page, directly fetched (reached via the general
entry-requirements page, which itself deferred to this one).

**Fifteenth independent corroboration of the TOEFL iBT rescale today.**

**What was checked and NOT found:** application deadline, tuition, admission rate. Birkbeck is
historically a part-time/evening-study specialist within the University of London federation;
this was not separately verified as still true for its current undergraduate offering and is
not asserted here.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('5b16dcd1-0945-4cf0-b590-2448b24ceb82', 'english_proficiency',
   'IELTS Academic 6.5 overall (6.0+ per sub-test), TOEFL iBT 79 legacy / 4.5 new scale (from Jan 2026); a reduced 5.5-equivalent pathway exists for applicants with prior UK visa approval at RQF Level 6, subject to Admissions Tutor review; IELTS Academic Online and IELTS Indicator NOT accepted',
   'Standard taught-programme requirement: IELTS Academic (no more than 2 years old) 6.5 overall, minimum 6.0 in each sub-test. TOEFL iBT before January 2026: 79 total (Reading 18, Listening 19, Speaking 19, Writing 23). TOEFL iBT from January 2026 (new scale): 4.5 total (Reading 4, Listening 4, Speaking 4, Writing 4.5). A lower, conditional pathway (IELTS 5.5-equivalent, CEFR B2) exists for applicants who already hold UK visa approval at RQF Level 6, but is referred to an Admissions Tutor for individual review and may require additional testing. Birkbeck explicitly does NOT accept the IELTS Academic Online test or the IELTS Indicator test -- a specific exclusion, confirmed directly on the official page.',
   true, 'high', 'https://www.bbk.ac.uk/student-services/admissions/english-language-qualifications-and-tests', now());
```

---

## 16. City St George's, University of London — cheaper win: already has 97 programme rows, only requirements missing

`id = '36fb76fa-9b86-48dc-a8c9-530cf13f43d6'` — QS rank 361. Formed by the 2024 merger of City,
University of London and St George's, University of London (the medical school); the merged
institution's admissions structure was not independently verified beyond what the current
official domain states.

**Access note:** the official entry-requirements page returned HTTP 403 to a direct fetch.
Recorded at `medium` confidence from a general search's summary instead.

**What was checked and NOT found:** TOEFL iBT equivalents, application deadline, tuition,
admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('36fb76fa-9b86-48dc-a8c9-530cf13f43d6', 'english_proficiency',
   'Most courses require IELTS 6.0-6.5 (no band below 6.0); highly selective courses (e.g. Journalism, Law) require IELTS 7.0 with 7.0 in Writing; set per course, checked against individual course pages; test must be within 2 years of CAS issuance',
   'Individual course pages set the exact IELTS requirement; most programmes fall in the 6.0-6.5 overall range with no band below 6.0. Selective courses including Journalism and Law require a materially higher IELTS 7.0 overall with at least 7.0 specifically in Writing. Test results must be no more than two years old at the point the Confirmation of Acceptance for Studies (CAS) is generated. TOEFL iBT-equivalent figures were not confirmed in this pass (official page returned HTTP 403).',
   true, 'medium', 'https://www.citystgeorges.ac.uk/prospective-students/apply/entry-requirements', now());
```

---

## 17. University of East Anglia (UEA)

`id = '922a3d0c-87b5-4920-a1fe-95460b8eac0d'` — QS rank 381.

**Source actually used:** `https://www.uea.ac.uk/apply/our-admissions-policy/english-language-
equivalencies` — official page, directly fetched for the exemption list (confirmed at `high`
confidence); the page's own IELTS score tables are interactive elements that did not render as
extractable text in this pass -- exactly the "renders only client-side" case this batch's
methodology names as a reason to keep the numeric figures at `medium` rather than treat the
page as having stated nothing.

**What was checked and NOT found:** TOEFL iBT-equivalent numbers; application deadline,
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('922a3d0c-87b5-4920-a1fe-95460b8eac0d', 'english_proficiency',
   'For access to all modules: IELTS 6.5 overall (6.0+ per category); a lower IELTS 6.0 (6.0+ Writing/Speaking, 5.5+ Reading/Listening) grants restricted access limited to Economics and Language and Communication Studies modules only; some courses set their own higher levels',
   'For unrestricted access to any module: IELTS 6.5 overall, at least 6.0 in each category. A lower threshold -- IELTS 6.0 overall with a minimum of 6.0 in Writing and Speaking and 5.5 in Reading and Listening -- grants access restricted specifically to modules in Economics, and Language and Communication Studies (not a general-purpose lower tier). Individual course pages may set higher or more specific requirements. These figures come from a general search summarizing UEA''s policy rather than this session''s own direct read, since the official equivalencies page''s score tables are interactive and did not render as extractable text.',
   true, 'medium', 'https://www.uea.ac.uk/apply/our-admissions-policy/english-language-equivalencies', now()),
  ('922a3d0c-87b5-4920-a1fe-95460b8eac0d', 'international_requirement',
   'Nationals of 17 listed countries (mostly Caribbean, plus Australia/Canada/Ireland/Malta/New Zealand/USA) are exempt from providing English-language test evidence; also exempt if a full Bachelor''s-equivalent qualification was completed in English in a qualifying country',
   'Exempt from English-language proficiency evidence: nationals of Antigua and Barbuda, Australia, The Bahamas, Barbados, Belize, Canada, Dominica, Grenada, Guyana, Ireland, Jamaica, Malta, New Zealand, St Kitts and Nevis, St Lucia, St Vincent and the Grenadines, Trinidad and Tobago, and the United States of America. Also exempt: applicants who have completed a full academic qualification at least equivalent to a UK Bachelor''s degree, taught in a qualifying English-speaking country.',
   false, 'high', 'https://www.uea.ac.uk/apply/our-admissions-policy/english-language-equivalencies', now());
```

---

## 18. Oxford Brookes University

`id = '7d527043-8559-4681-95a0-9977e820cc5a'` — QS rank 411.

**Source actually used:** `https://www.brookes.ac.uk/study/international-students/applying-to-
arriving/how-to-apply/english-language-requirements` — official page, directly fetched.

**Sixteenth independent corroboration of the TOEFL iBT rescale today** -- though the page's own
post-21-Jan-2026 figure extracted as per-skill minimums (Reading 20, Listening 21, Speaking 24,
Writing 19) without a clean single overall number in this pass; recorded as extracted rather
than inferring a rounded overall figure.

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('7d527043-8559-4681-95a0-9977e820cc5a', 'english_proficiency',
   'Most undergraduate courses: IELTS 6.0 overall (6.0 Reading/Writing, 5.5 Listening/Speaking), TOEFL iBT 80 legacy; Law, Architecture, Interior Architecture, and English Literature require a higher IELTS 6.5 overall (6.0 Reading/Writing, 5.5 Listening/Speaking)',
   'Most undergraduate courses: IELTS 6.0 overall, with 6.0 in Reading and Writing and 5.5 in Listening and Speaking. TOEFL iBT before 21 January 2026: 80 overall. TOEFL iBT from 21 January 2026 (new scale): per-skill minimums extracted as Reading 20, Listening 21, Speaking 24, Writing 19, without a single clean overall figure in this pass. Law, Architecture, Interior Architecture, and English Literature require a higher IELTS 6.5 overall (same 6.0 Reading/Writing, 5.5 Listening/Speaking component split). A UKVI-approved Secure English Language Test (SELT) is required only for a Pre-sessional English course or a programme below the IELTS 6.0 level -- not required for standard-level direct undergraduate entry.',
   true, 'high', 'https://www.brookes.ac.uk/study/international-students/applying-to-arriving/how-to-apply/english-language-requirements', now());
```

---

## 19. University of Kent

`id = 'f75a14a2-97e6-452e-9f9a-b0d598709fac'` — QS rank 415.

**Source actually used:** `https://www.kent.ac.uk/courses/undergraduate/apply/english-language-
requirements` — official page, directly fetched. A third distinct UK tier-naming convention
found in this batch alone: Kent's "Good/Very Good/Excellent" (this batch's other two: Sussex's
Standard/High/Advanced, and universities with no named tiers at all, e.g. Lancaster) -- each
university's own structure recorded as actually found, not normalized to a single assumed
UK-wide pattern.

**What was checked and NOT found:** TOEFL iBT-equivalent scores (Kent accepts TOEFL with its
own institution code but a score table was not reached in this pass); application deadline,
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('f75a14a2-97e6-452e-9f9a-b0d598709fac', 'english_proficiency',
   'Three named CEFR-linked tiers by course -- Good (CEFR B2): IELTS 6.0 (5.5+/component); Very Good (CEFR B2): IELTS 6.5 (5.5+/component); Excellent (CEFR C1): IELTS 7.0 (7.0/component); actual course requirement stated on each course''s own entry-criteria section',
   'Kent publishes a general CEFR-benchmarked reference: "Good" (CEFR B2) = IELTS 6.0 overall, minimum 5.5 in each component; "Very Good" (CEFR B2) = IELTS 6.5 overall, minimum 5.5 in each component; "Excellent" (CEFR C1) = IELTS 7.0 overall, minimum 7.0 in each component. The specific level required for a given course is stated in that course''s own entry-criteria section, not fixed university-wide. Accepted alternative tests include Oxford ELLT (fully online), TOEFL (Kent''s own institution code 0826), LanguageCert Academic, and the LRN International English Language Competency Assessment (IELCA). Students needing a Student visa must take IELTS at a UKVI-approved centre with the UKVI number on the certificate. Pre-sessional courses are available for applicants not yet meeting their course''s required level.',
   true, 'high', 'https://www.kent.ac.uk/courses/undergraduate/apply/english-language-requirements', now());
```

---

## 20. Aston University

`id = 'bc0a028a-30c0-4be7-9f05-7302bcd98fca'` — QS rank 416.

**Source actually used:** `https://www.aston.ac.uk/international/english-language-requirements`
— official page, directly fetched.

**Seventeenth independent corroboration of the TOEFL iBT rescale today.**

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('bc0a028a-30c0-4be7-9f05-7302bcd98fca', 'english_proficiency',
   'General undergraduate (Engineering/Physical Sciences, Law/Social Sciences): IELTS 6.0 overall (5.5+ each component), TOEFL iBT 78 legacy / 4 new scale (from 21 Jan 2026); BSc Biochemistry/Neuroscience/Biology/Psychology allow one band at 5.5 with others 6.0+; Medical School requires 7.0 across all components; Nursing/Pharmacy/Optometry require 6.5-7.0',
   'General undergraduate entry (Engineering and Physical Sciences; School of Law and Social Sciences): IELTS 6.0 overall, minimum 5.5 in Reading, Writing, Listening, and Speaking. TOEFL iBT before 21 January 2026: Overall 78 (Reading 12, Writing 20, Listening 11, Speaking 17). TOEFL iBT from 21 January 2026 (new scale): Overall 4 (Reading 3.5, Writing 4, Listening 3, Speaking 3). A distinct exception applies to BSc Biochemistry, BSc Neuroscience, BSc Biology, and BSc Psychology (all variants): one band may be as low as 5.5 provided the others are 6.0 or above, a modest relaxation versus other Health and Life Sciences programmes. Materially stricter thresholds apply elsewhere: Medical School requires 7.0 across all components; Nursing, Pharmacy, and Optometry require 6.5-7.0. Test results must be within 2 years of course start.',
   true, 'high', 'https://www.aston.ac.uk/international/english-language-requirements', now());
```

---

## 21. University of Essex

`id = '2a45f192-251f-48e3-8ba7-8343f7c8ea25'` — QS rank 438.

**Source actually used:** `https://www1.essex.ac.uk/documents/admissions/englishInternational.pdf`
— official PDF, directly read in full (9 pages), dated 14 August 2026 -- genuinely current,
not a stale document. The richest single source in this batch: a full table of 10+ accepted
tests, each broken down by entry point (Foundation Year / First Year / Second-and-Final-Year
Direct Entry).

**Eighteenth independent corroboration of the TOEFL iBT rescale today**, with the same
new-scale-compression pattern already flagged once this batch (Aberdeen's Medicine figure):
Essex's legacy TOEFL requirement climbs by entry point (72 / 82 / 91) but the new-scale figure
is a flat 4 overall across all three -- recorded exactly as published, not smoothed to imply a
rising new-scale figure that was never actually stated.

**A genuinely distinctive validity-period fact, confirmed directly rather than assumed
uniform:** most accepted tests are valid for 5 years, but IELTS and PTE Academic are valid for
only 3 years, and TOEFL for only 2 years -- the shortest-validity test (TOEFL) is also the one
most commonly cited elsewhere in this batch, worth surfacing since a Turkish applicant
comparing multiple UK universities' pages could otherwise assume the same shelf-life applies
everywhere.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('2a45f192-251f-48e3-8ba7-8343f7c8ea25', 'english_proficiency',
   'By entry point -- Foundation Year: IELTS 5.5 (5.5+/component), TOEFL 72 legacy/4 new scale; First Year: IELTS 6.0 (5.5+/component), TOEFL 82/4; Second-and-Final-Year Direct Entry: IELTS 6.5 (5.5+/component), TOEFL 91/4 -- new scale applies from 21 Jan 2026; validity: IELTS/PTE 3 years, TOEFL 2 years, most other tests 5 years',
   'For applicants requiring a Student visa (excluding nationals of majority English-speaking countries per the UK Home Office list), by entry point: Foundation Year -- IELTS (Academic) 5.5 overall, 5.5+ each component; TOEFL iBT before 21 Jan 2026: 72 overall (Reading 18, Listening 17, Speaking 20, Writing 17); from 21 Jan 2026: 4 overall, 4+ each component. First Year entry -- IELTS 6.0 overall, 5.5+ each component; TOEFL 82 legacy / 4 new scale (same per-component structure). Second and Final Year Direct Entry -- IELTS 6.5 overall, 5.5+ each component; TOEFL 91 legacy / 4 new scale. Ten-plus other named tests (Cambridge English, LanguageCert, PTE Academic, Oxford Test of English, Trinity ISE, Michigan ECPE, KTE, and others) each have their own equivalent tier table in the same official document. Validity/shelf-life differs by test: IELTS and PTE Academic are valid 3 years, TOEFL 2 years, and most other listed tests up to 5 years before course start. Two tests of the same type may be combined if both overall and component minimums are met across the two sittings, within validity. Health and Social Care courses (Nursing, Social Work, Physiotherapy, etc.) and below-degree-level courses have separate, non-standard requirement tables not reproduced here.',
   true, 'high', 'https://www1.essex.ac.uk/documents/admissions/englishInternational.pdf', now());
```

---

## 22. University of Dundee

`id = '8f294730-0018-4f65-85fd-aebda67388f3'` — QS rank 447.

**Source actually used:** `https://www.dundee.ac.uk/guides/english-language-requirements` —
official page, directly fetched. The page itself confirms English requirements are set per
course/offer-letter rather than one fixed figure -- confirmed directly, not assumed.

**A genuine, distinctive exclusion confirmed directly:** Dundee explicitly states it will
"only accept TOEFL iBT scores taken in one sitting" and will NOT accept "MyBest" composite
scores (TOEFL's own superscoring feature that combines an applicant's best section scores
across multiple sittings) -- a specific policy several other UK universities in this batch do
not appear to share, recorded as actually found rather than assumed universal or ignored.

**What was checked and NOT found:** a single confirmed IELTS number -- a general search
reports 6.5 overall as the figure for "most degree programmes," not independently confirmed by
this session's own page read, recorded at `medium` confidence; TOEFL numeric equivalents (both
scales), application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('8f294730-0018-4f65-85fd-aebda67388f3', 'english_proficiency',
   'Set per course/offer letter rather than one fixed figure, officially confirmed; a commonly-cited figure is IELTS 6.5 overall for most degree programmes, not independently confirmed; TOEFL iBT accepted only from a single sitting -- MyBest composite scores explicitly NOT accepted',
   'Dundee''s own page states English language requirements "depend on the academic level of the course" and directs applicants to their offer letter and course page rather than one university-wide figure. A general search separately reports IELTS 6.5 overall for most degree programmes, not independently confirmed by this session''s direct page read. TOEFL iBT is accepted, but only scores from a single test sitting -- Dundee explicitly does not accept TOEFL''s "MyBest" superscored/composite results, a specific policy confirmed directly on the official page. An alternative route exists via UK/international high-school English qualifications, or a home-country degree taught and assessed fully in English (medium of instruction), verified via an official signed and stamped institutional letter, provided obtained within the past 10 years.',
   true, 'medium', 'https://www.dundee.ac.uk/guides/english-language-requirements', now());
```

---

## 23. SOAS University of London

`id = '9b3bd0ac-4ab4-447d-b067-5c05063b28c7'` — QS rank 458.

**Source actually used:** `https://www.soas.ac.uk/international/english-language-requirements`
— official page, directly fetched.

**Nineteenth independent corroboration of the TOEFL iBT rescale today.** Also the SECOND UK
university this batch (after Dundee, entry #22) to explicitly exclude TOEFL's "My Best Scores"
composite -- confirmed as a real shared pattern across at least two institutions, not a one-off
policy.

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('9b3bd0ac-4ab4-447d-b067-5c05063b28c7', 'english_proficiency',
   'Direct entry: IELTS 6.5 overall (6.0+ per subscore), TOEFL iBT 95 legacy (23 Writing, 20+ others) / 5.0 new scale (4.5 Writing, 4.0+ others) -- "My Best Scores" explicitly not accepted; exempt for UK/majority-English-speaking-country nationals with English-medium education, or a UK/MESC/Canada/Ghana/Kenya/Nigeria/South-Africa degree within 10 years',
   'Direct entry (no pre-sessional course needed): IELTS Academic/for UKVI/Online 6.5 overall, minimum 6.0 in all subscores. TOEFL iBT: 95 overall on the legacy scale (minimum 23 Writing, 20 in other components) or 5.0 on the new scale (minimum 4.5 Writing, 4.0 other components) -- "My Best Scores" superscored/composite results are explicitly not accepted. Exempt from providing test scores: UK nationals; nationals of a Majority English Speaking Country (MESC) who completed English-medium high school or a degree there; anyone who completed a degree in the UK or a MESC within the last decade; anyone with an English-taught degree from Canada, Ghana, Kenya, Nigeria, or South Africa within 10 years. Also acceptable: a UK university pre-sessional English course pass (2-year validity) or an International Foundation Programme completed with 55% in academic English (within 2 years).',
   true, 'high', 'https://www.soas.ac.uk/international/english-language-requirements', now());
```

---

## 24. Royal Holloway, University of London

`id = '537f9703-8a8c-4326-91ea-0f3475404491'` — QS rank 485.

**Source actually used:** `https://www.royalholloway.ac.uk/studying-here/international-
students/english-language-requirements/` — official page, directly fetched.

**A genuine absence worth flagging rather than silently filling in:** unlike roughly 19 other
UK universities checked so far this batch, this page does NOT reference the 21 January 2026
TOEFL iBT rescale at all -- only the legacy score (88) is given. Recorded as NULL/not-stated
for the new-scale figure rather than assuming the same conversion pattern seen elsewhere; the
page itself may simply not be updated yet, which is itself useful signal, not an error to
correct silently.

**What was checked and NOT found:** the new-scale TOEFL figure (see above); application
deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('537f9703-8a8c-4326-91ea-0f3475404491', 'english_proficiency',
   'IELTS 6.5 overall (Writing 6.0+, other components 5.5+); TOEFL iBT 88 (legacy scale only -- no new-scale figure stated on this page, unlike most other UK universities checked this batch); PTE Academic 67 (Writing 61+, others 54+); Cambridge English Advanced Grade C; STEM programmes generally lower, Business/Humanities/Social Sciences generally higher on Writing specifically',
   'Standard undergraduate entry: IELTS 6.5 overall, Writing minimum 6.0, other components minimum 5.5. TOEFL iBT: 88 overall (Reading 18, Listening 17, Speaking 20, Writing 17-19) -- this page states only the legacy figure, with no 21-January-2026 new-scale conversion given, notably different from most other UK universities checked in this batch. PTE Academic: 67 overall, Writing minimum 61, other components minimum 54. Cambridge English Advanced (CAE): Grade C. Requirements vary by programme -- STEM programmes generally set lower thresholds, while Business, Humanities, and Social Sciences programmes generally require higher Writing scores specifically. A preparation programme at the Royal Holloway International Study Centre is available for applicants not yet meeting their course''s requirement.',
   true, 'high', 'https://www.royalholloway.ac.uk/studying-here/international-students/english-language-requirements/', now());
```

---

## 25. University of Bradford

`id = '989b5673-9cc3-44c2-a562-27caae0fcd64'` — QS rank 497.

**Source actually used:** `https://www.bradford.ac.uk/international/entry-requirements/` —
official page, directly fetched.

**A genuinely distinctive fact: Bradford runs its own entry test, BASALT** (Bradford Academic
Skills and Language Test), accepted as an IELTS-equivalent at the identical 6.0/5.5 threshold
-- not seen at any other UK university checked in this batch so far.

**Twentieth independent corroboration of the TOEFL iBT rescale today** -- though this page's
own transition date reads as "1 January 2026" rather than the "21 January 2026" seen at every
other UK/international source this session. Recorded exactly as the page states it rather than
silently corrected to match the pattern from other universities; the ~3-week discrepancy could
be this page's own imprecision or a genuine institution-specific effective date, and wasn't
resolved further in this pass.

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('989b5673-9cc3-44c2-a562-27caae0fcd64', 'english_proficiency',
   'IELTS 6.0 overall (5.5+ per sub-test), or Bradford''s own BASALT test at the identical threshold; TOEFL iBT 80 legacy (72+ each sub-test) / 4.5 new scale (4+ each sub-test) -- page states the transition as 1 Jan 2026, not the 21 Jan 2026 seen elsewhere; Duolingo 110 (100+ per subscore)',
   'Standard University requirement: IELTS Academic Overall Band 6.0, at least 5.5 in each of Speaking/Listening/Reading/Writing -- OR Bradford''s own BASALT (Bradford Academic Skills and Language Test), administered by the university itself, at the identical 6.0 overall / 5.5+ per sub-test threshold. TOEFL iBT: this page states tests before 1 January 2026 need 80 overall (72+ each sub-test), and tests after that date need 4.5 overall (4+ each sub-test) -- note the stated date differs from the 21 January 2026 transition confirmed at every other source this session; not reconciled further in this pass. Duolingo English Test: 110 overall minimum, 100+ in each of the four subscores. LanguageCert Academic Online (65 overall, 60+ per subskill) and the Oxford English Language Level Test (6 overall, 5+ per sub-test) are also accepted for 2026 entrants. Some individual programmes require higher levels than these university-wide standards.',
   true, 'high', 'https://www.bradford.ac.uk/international/entry-requirements/', now());
```

---

## 26. University of Huddersfield

`id = '4f55b617-a17d-4dfc-af84-3edf636bc3d1'` — QS rank 521.

**Source actually used:** `https://www.hud.ac.uk/international/courses-and-entry-requirements/
international-entry-requirements/` — official page, directly fetched, giving the general
university-wide figure; course-specific variants (e.g. English Literature programmes require a
higher tier) come from a general search of course pages, recorded at `medium` for that part
only.

**A genuinely distinctive exclusion confirmed directly:** unlike most other UK universities
checked this batch (which explicitly accept the TOEFL iBT Home Edition as equivalent to the
standard test centre version), Huddersfield's own page states plainly that "Home Edition is
not accepted" -- the opposite policy, worth recording precisely rather than assuming
Home-Edition acceptance is universal across UK institutions.

**What was checked and NOT found:** a new-scale (post-21-Jan-2026) TOEFL conversion -- this
page states only the legacy figure (87), with no rescale conversion given, the second UK
university this batch (after Royal Holloway, #24) where this specific update was not found;
application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('4f55b617-a17d-4dfc-af84-3edf636bc3d1', 'english_proficiency',
   'General university-wide: IELTS 6.0 overall (5.5+ per element), TOEFL iBT 87 (legacy scale only, no new-scale figure found) -- TOEFL iBT Home Edition explicitly NOT accepted; English Literature and related programmes reportedly require a higher IELTS 6.5 (6.0+ per element); some other courses reportedly accept a lower 6.0/5.5',
   'General university-wide requirement (officially confirmed): IELTS Academic 6.0 overall, no element below 5.5, valid 2 years. TOEFL iBT: 87 overall (Reading 22, Listening 21, Speaking 23, Writing 21), valid 2 years -- the official page explicitly states "Home Edition is not accepted," and does not itself give a post-21-January-2026 new-scale conversion. Students from Majority English Speaking Countries (MESCs) are typically considered to have already met the requirement. Course-specific variation reported by a general search (not independently confirmed): English Literature and English Literature and History require a higher IELTS 6.5 overall (6.0+ per element); Film Studies and English Literature reportedly accepts the lower 6.0/5.5 general figure.',
   true, 'high', 'https://www.hud.ac.uk/international/courses-and-entry-requirements/international-entry-requirements/', now());
```

---

## 27. Northumbria University at Newcastle

`id = '117c7d03-7af9-44e9-a14e-d656a876a149'` — QS rank 528.

**Source actually used:** Northumbria's own official English Language Policy PDF (approved
8 June 2023, last reviewed May 2024) -- a governance document rather than a student-facing
score table, so it confirms the *structure* of the policy directly (standardised per Faculty
unless a variation order is approved; never below UKVI minimums; GCSE-based route for UK
nationals; fraud/verification rules; a Covid-era online-degree exemption; specific Amsterdam-
campus provisions) but defers the actual numeric scores to a separate "Acceptable English
Tests" webpage not itself fetched in this pass. The numeric figure below (6.0/5.5) comes from
a general search rather than this session's own direct read, recorded at `medium` confidence
for the number specifically while the structural facts are `high` (directly read from the
official policy PDF).

**What was checked and NOT found:** TOEFL iBT-specific numbers; application deadline, tuition,
admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('117c7d03-7af9-44e9-a14e-d656a876a149', 'english_proficiency',
   'Reportedly IELTS 6.0 overall (5.5+ per band) for undergraduate entry, not independently confirmed by number; officially confirmed structure: requirements are standardised per Faculty (not one flat university figure) unless a specific variation is approved, and never set below UKVI''s own minimums',
   'A general search reports IELTS 6.0 overall with 5.5 minimum in each band for undergraduate programmes; this specific number was not independently confirmed by this session''s own read of the official policy, which instead confirms the governing structure: English-language entry levels are standardised at Faculty level (not one flat university-wide figure) unless an approved English Language variation order applies to a specific programme, and are never set below UKVI''s own minimum score requirements. Applicants within 0.5-1.0 IELTS point of their required score may be eligible for Northumbria''s ELSS (English Language and Study Skills) Summer School pre-sessional pathway. UK nationals typically evidence English via GCSE (or equivalent) rather than a language test. Test validity typically follows UKVI/awarding-body periods, commonly two years.',
   true, 'medium', 'https://www.northumbria.ac.uk/study-at-northumbria/admissions/english-language-requirements/', now());
```

---

## 28. University of Stirling

`id = 'a8c482c1-0d60-46bd-858b-d70c2c283411'` — QS rank 560.

**Source actually used:** `https://www.stir.ac.uk/international/international-students/
english-language-requirements/` — official page, directly fetched.

**Twenty-first independent corroboration of the TOEFL iBT rescale today.**

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('a8c482c1-0d60-46bd-858b-d70c2c283411', 'english_proficiency',
   'Standard undergraduate: IELTS Academic/UKVI 6.0 overall (5.5+ per sub-skill), TOEFL iBT 80 legacy / 4 new scale (from 21 Jan 2026), PTE Academic 60 overall (59+ per sub-skill); waiver available for certain qualifications taken within 5 years where the course requirement is 6.0 or 6.5',
   'Standard undergraduate entry: IELTS Academic or UKVI 6.0 overall, no sub-skill below 5.5. TOEFL iBT before 21 January 2026: 80 overall (Reading 18, Writing 17, Listening 17, Speaking 20). TOEFL iBT from 21 January 2026 (new scale): 4 overall, no band below 4. PTE Academic: 60 overall, minimum 59 in each sub-skill. Test results must be within 2 years of course start. An English-language test waiver is available for courses with an overall IELTS requirement of 6.0 or 6.5 where the applicant holds certain qualifications obtained within 5 years of course start (specific qualifying qualifications not enumerated in this pass). Individual course pages may set additional or higher requirements.',
   true, 'high', 'https://www.stir.ac.uk/international/international-students/english-language-requirements/', now());
```

---

## 29. Bangor University

`id = '8b36f863-7174-4312-aa36-44d38681f6e1'` — QS rank 567.

**Source actually used:** `https://www.bangor.ac.uk/international/future/englishlanguage` —
official page, directly fetched.

**A notable inversion of a pattern seen elsewhere this batch:** Bangor's page states only
new-scale TOEFL iBT figures (4.0 for standard entry, 4.5 for Law) with no legacy-scale number
given at all -- the opposite gap from Royal Holloway and Huddersfield (entries #24 and #26),
which stated only the legacy figure with no new-scale conversion. Recorded exactly as found on
each page rather than assuming every UK university publishes both sides of the transition.

**What was checked and NOT found:** the legacy (pre-21-Jan-2026) TOEFL score; application
deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('8b36f863-7174-4312-aa36-44d38681f6e1', 'english_proficiency',
   'Standard undergraduate: IELTS 6.0 overall (5.5+ per component for non-SELT), TOEFL iBT new-scale 4.0 (3.5 non-SELT) -- no legacy-scale figure stated; Law requires a higher IELTS 6.5 (6.0+ non-SELT), TOEFL new-scale 4.5 (4.0 non-SELT)',
   'Standard undergraduate entry: IELTS 6.0 overall, with 5.5 minimum per component for non-SELT test types. Equivalent TOEFL iBT (new scale only -- no legacy/pre-21-Jan-2026 figure given on this page): 4.0 overall (3.5 for non-SELT). Law is a stricter exception: IELTS 6.5 overall (6.0+ non-SELT), equivalent TOEFL new-scale 4.5 (4.0 non-SELT). Nationals of UKVI-defined majority English-speaking countries may be exempt if they hold Grade C or above in IGCSE/O-Level English Language or equivalent. Bangor recognises Cambridge English, Trinity ISE II/III, and various Non-SELT and Online tests for direct entry. Pre-sessional English and Study Skills courses are available for applicants below the required level.',
   true, 'high', 'https://www.bangor.ac.uk/international/future/englishlanguage', now());
```

---

## 30. University of Hull

`id = '2c85e2ff-58b0-4ece-a245-776b69bb4cc0'` — QS rank 575.

**Source actually used:** `https://www.hull.ac.uk/study/international-students/how-to-apply/
english-language-requirements` — official page, directly fetched.

**Third UK university this batch (after Royal Holloway #24 and Huddersfield #26) where the
page does not reference the 21 January 2026 TOEFL rescale at all** -- only a legacy-scale
range is given. Recorded as NULL for the new-scale figure rather than assumed.

**What was checked and NOT found:** the new-scale TOEFL figure; application deadline, tuition,
admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('2c85e2ff-58b0-4ece-a245-776b69bb4cc0', 'english_proficiency',
   'For most courses: IELTS 6.0 overall (5.5+ per skill), TOEFL iBT 60-78 range (legacy scale only, no new-scale figure stated -- Reading 10+, Listening 9+, Speaking 17+, Writing 19+), PTE Academic 59 overall (51+ per skill); some courses set higher',
   'For most undergraduate courses: IELTS (Academic) 6.0 overall, minimum 5.5 in each of Reading/Writing/Speaking/Listening, test within 2 years of course start. Equivalent TOEFL iBT (legacy scale, no 21-January-2026 new-scale conversion given on this page): overall in the 60-78 range, with at least Reading 10, Listening 9, Speaking 17, Writing 19. PTE Academic: overall 59, minimum 51 in all skills. Some courses require higher scores, checked on individual course pages. Applicants below the requirement may receive a conditional offer requiring a pre-sessional English course.',
   true, 'high', 'https://www.hull.ac.uk/study/international-students/how-to-apply/english-language-requirements', now());
```

---

## 31. Coventry University

`id = 'a56ecc22-5a49-4601-93f2-097f18b80bb5'` — QS rank 581.

**Source actually used:** `https://www.coventry.ac.uk/international-students-hub/apply/
english-requirements/` — official page, directly fetched, confirming the CEFR framework
directly; the numeric IELTS figure (6.0) comes from a general search rather than this
session's own direct read of a specific number, recorded at `medium` for that part.

**What was checked and NOT found:** TOEFL iBT numeric equivalents (page gives only CEFR
levels, no conversion table); application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('a56ecc22-5a49-4601-93f2-097f18b80bb5', 'english_proficiency',
   'Undergraduate (NQF 6+): CEFR B2 minimum across all four components, officially confirmed, though most courses require higher than this Home-Office floor; a reported IELTS figure is 6.0 overall, not independently confirmed by number; a Secure English Language Test (SELT) is required; pre-sessional course entry floor reportedly as low as IELTS 4.5',
   'Officially confirmed via CEFR framework: undergraduate and postgraduate (NQF Level 6 and above) requires a minimum CEFR B2 across Reading, Listening, Writing, and Speaking, via a Secure English Language Test (SELT) -- Coventry states most courses set a higher bar than this Home Office minimum. A general search separately reports IELTS 6.0 overall as the commonly-cited undergraduate figure, not independently confirmed as the exact official number. Coventry''s own below-NQF-6 Pre-Sessional English Programme requires only CEFR B1, and a general search reports IELTS 4.5 as the minimum starting point Coventry will accept onto a pre-sessional pathway. No TOEFL iBT numeric conversion table was found on the official page.',
   true, 'medium', 'https://www.coventry.ac.uk/international-students-hub/apply/english-requirements/', now());
```

---

## 32. Ulster University

`id = '38f97dc1-8bfe-4932-83fc-c8b9c3825868'` — QS rank 595.

**Access note:** the official English-language-requirements page returned HTTP 403 to a direct
fetch. Recorded at `medium` confidence from a general search's summary instead.

**What was checked and NOT found:** TOEFL iBT numeric equivalents, application deadline,
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('38f97dc1-8bfe-4932-83fc-c8b9c3825868', 'english_proficiency',
   'Usually IELTS Academic 6.0 overall (no band below 5.5); some courses require higher; Duolingo English Test accepted only for tests taken after July 2024; conditional offers available with a requirement to meet the level before course start',
   'The minimum English language entry requirement is usually IELTS (Academic) 6.0 overall, with no band below 5.5 -- some courses ask for a higher score, checked on individual course pages. Ulster accepts the Duolingo English Test, but only for tests taken after July 2024 -- a specific cutoff date, not a blanket acceptance of any Duolingo result. Applicants below the requirement may receive a conditional offer, subject to meeting the requirement before the course begins; pre-sessional English preparation courses are available (including a named 12-week "Pre-Sessional Plus" option).',
   true, 'medium', 'https://www.ulster.ac.uk/global/apply/english-language-requirements', now());
```

---

## 33. Manchester Metropolitan University

`id = 'e4b55140-51ae-4fd8-b2f9-768d95cea5b8'` — QS rank 600.

**Source actually used:** `https://www.mmu.ac.uk/study/international/before-you-apply/
english-language-requirements` — official page, directly fetched.

**A genuine, opposite-direction policy from Essex (this batch's entry #21):** MMU explicitly
states it "cannot accept students based on a combination of scores from different tests or
different sittings of the same test," and assesses only the most recent complete sitting --
Essex explicitly allows combining two same-type sittings. Two UK universities with directly
contradictory score-combination policies, both confirmed on their own official pages -- a real
difference a Turkish applicant retaking IELTS should know before assuming UK-wide uniformity.

**Fourth UK university this batch (after Royal Holloway #24, Huddersfield #26, Hull #30) with
no reference to the 21 January 2026 TOEFL rescale at all** -- a pattern now large enough to
note explicitly rather than treat each instance as an isolated gap.

**What was checked and NOT found:** the new-scale TOEFL figure; application deadline, tuition,
admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('e4b55140-51ae-4fd8-b2f9-768d95cea5b8', 'english_proficiency',
   'Most undergraduate courses: IELTS 6.0 overall (5.5+ per component), TOEFL iBT 79 (legacy scale only, no new-scale figure stated on this page); scores/sittings from different tests or different dates CANNOT be combined -- assessed on the single most recent complete sitting only',
   'For most undergraduate programmes: IELTS 6.0 overall, no component below 5.5. TOEFL iBT: 79 overall (Listening 17, Reading 18, Speaking 20, Writing 17) -- this page does not give a post-21-January-2026 new-scale conversion. Some courses set a higher requirement, stated on the individual offer letter. Test results are valid for 2 years from the test date. MMU explicitly does not accept a combination of scores from different tests or different sittings of the same test -- applications are assessed on the single most recent complete test sitting only, a stricter and directly opposite policy to the University of Essex (this batch''s entry #21), which explicitly does allow combining two sittings of the same test type.',
   true, 'high', 'https://www.mmu.ac.uk/study/international/before-you-apply/english-language-requirements', now());
```

---

## 34. Nottingham Trent University (NTU)

`id = '22289ce8-45b1-4b16-8ee5-83cb5faf4714'` — QS rank 639.

**Access note:** the official English-requirements page returned HTTP 403 to a direct fetch.
Recorded at `medium` confidence from a general search's summary instead.

**A real, distinctive exclusion, consistent with a pattern seen elsewhere this batch (Birkbeck,
entry #15, excludes the same two test types):** NTU explicitly does not accept "IELTS
Indicator" or "IELTS Online" scores.

**What was checked and NOT found:** TOEFL iBT numeric equivalents, application deadline,
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('22289ce8-45b1-4b16-8ee5-83cb5faf4714', 'english_proficiency',
   'Most undergraduate courses: IELTS Academic 6.5 overall (5.5+ per component); IELTS Indicator and IELTS Online explicitly NOT accepted; also accepts Pearson, Oxford, LanguageCert, and various country-specific qualifications',
   'For most undergraduate courses, NTU requires an English-language grade equivalent to IELTS 6.5 overall, minimum 5.5 in all components. NTU explicitly does not accept "IELTS Indicator" or "IELTS Online" test results -- a specific exclusion (same two test types Birkbeck, this batch''s entry #15, also excludes). Other accepted tests/qualifications include Pearson (PTE), Oxford English tests, LanguageCert, and various country-specific qualifications. Applicants below the requirement may upload a certificate at the required grade once obtained, or complete NTU''s own Pre-sessional English for Academic Purposes (PEAP) course at the required grade. TOEFL iBT numeric equivalents were not confirmed in this pass (page returned HTTP 403).',
   true, 'medium', 'https://www.ntu.ac.uk/international/your-application/entry-requirements/english-language-requirements', now());
```

---

## 35. University of Portsmouth

`id = '9fd071b6-e5bf-4e9d-a62f-31ac2ca91173'` — QS rank 662.

**Source actually used:** `https://www.port.ac.uk/study/international-students/english-
language-requirements` — official page, directly fetched.

**Fifth UK university this batch with no reference to the 21 January 2026 TOEFL rescale.**

**What was checked and NOT found:** application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('9fd071b6-e5bf-4e9d-a62f-31ac2ca91173', 'english_proficiency',
   'Undergraduate: IELTS 6.0 overall (5.5+ per component), TOEFL iBT 79 (legacy scale only); Foundation/pathway courses: IELTS 5.5 overall (5.5+ per component), TOEFL 72',
   'Undergraduate entry: IELTS 6.0 overall, no component below 5.5. TOEFL iBT: 79 overall (Reading 18, Listening 17, Speaking 20, Writing 17) -- no post-21-January-2026 new-scale figure given on this page. Foundation/pathway courses (a lower entry tier): IELTS 5.5 overall, no component below 5.5; TOEFL 72 overall (same per-component minimums as undergraduate). Other accepted tests include LanguageCert and Oxford ELLT, with their own equivalency tables. A pre-sessional English programme is available for applicants not yet meeting their course''s level.',
   true, 'high', 'https://www.port.ac.uk/study/international-students/english-language-requirements', now());
```

---

## 36. Kingston University, London

`id = '5aa8b40c-45ad-4ca2-bf7e-1938c0d4c29e'` — QS rank 686.

**Access note:** the official English-language-entry-requirements page returned HTTP 403 to a
direct fetch. Recorded at `medium` confidence from a general search's summary instead.

**What was checked and NOT found:** TOEFL iBT numeric equivalents, application deadline,
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('5aa8b40c-45ad-4ca2-bf7e-1938c0d4c29e', 'english_proficiency',
   'Minimum Academic IELTS 6.0 overall (5.5+ per element); some courses set exceptions; a two-tier pre-sessional pathway exists -- Long course for applicants up to 1.5 IELTS points below target, Extended course for up to 2.0 points below',
   'Minimum Academic IELTS requirement for undergraduate courses: 6.0 overall, with 5.5 in each of Reading, Writing, Listening, and Speaking -- some courses set exceptions, checked on individual course pages. Applicants who have studied or lived in a Majority English Speaking Country (MESC) may not need to provide additional proof. A two-tier pre-sessional structure exists: applicants scoring up to 1.5 IELTS points below their target entry requirement can apply for the Long Pre-sessional English course, and those up to 2.0 points below can apply for the Extended Pre-sessional English course. TOEFL iBT numeric equivalents were not confirmed in this pass (official page returned HTTP 403).',
   true, 'medium', 'https://www.kingston.ac.uk/study/international-students/english-language-entry-requirements', now());
```

---

## 37. University of Plymouth

`id = 'd58420d2-3e01-49ef-a056-e6dbad0342cb'` — QS rank 691.

**Source actually used:** `https://www.plymouth.ac.uk/international/how-to-apply/english-
language-requirements` — official page, directly fetched for the validity-period structure;
the score table lives on separate per-qualification linked pages not fetched in this pass, so
the numeric IELTS figure (6.0/5.5) comes from a general search instead, recorded at `medium`.

**A genuinely counter-intuitive validity split, confirmed directly on the official page:**
non-SELT academic IELTS is valid for 3 years, while SELT (UKVI-required) academic IELTS is
valid for only 2 years -- the opposite of an assumption that the more official/regulated test
type would carry the longer validity.

**What was checked and NOT found:** the exact numeric IELTS score (not independently confirmed
by direct fetch); TOEFL iBT equivalents; application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('d58420d2-3e01-49ef-a056-e6dbad0342cb', 'english_proficiency',
   'Usually IELTS 6.0 overall (5.5+ per component) for undergraduate, not independently confirmed by number; non-SELT IELTS valid 3 years, SELT (UKVI) IELTS valid only 2 years from CAS issuance -- confirmed directly, a counter-intuitive reversal of which test type has the longer shelf life; IELTS Life Skills and IELTS Online NOT accepted for direct degree entry',
   'A general search reports the University of Plymouth usually requires IELTS 6.0 overall with no component below 5.5 for undergraduate courses, not independently confirmed by this session''s own direct page read. Officially confirmed directly: non-SELT academic IELTS tests must have been taken no more than 3 years before the course start date, while SELT (Secure English Language Test, required by UKVI) academic IELTS tests must have been taken within 2 years of the CAS issuance date -- the SELT version, despite being the more regulated/official route, carries the SHORTER validity window. Plymouth does not accept the IELTS Life Skills test or IELTS Online test for direct entry onto degree programmes. Pre-sessional courses are available for applicants not yet meeting the requirement.',
   true, 'medium', 'https://www.plymouth.ac.uk/international/how-to-apply/english-language-requirements', now());
```

---

## 38. Goldsmiths, University of London

`id = 'bd5e07ee-175b-4569-9700-c72ffbda0b41'` — QS rank 701-710.

**Source actually used:** `https://www.gold.ac.uk/apply/english-language-requirements/` —
official page, directly fetched.

**A genuine five-tier system, more granular than any other UK university confirmed in this
batch:** Goldsmiths sets requirements per programme across at least five distinct IELTS levels
(7.5, 7.0, 6.5, 6.0, 5.5) rather than the two-or-three-tier structures seen at Sussex (#9) or
Kent (#19).

**Twenty-second independent corroboration of the TOEFL iBT rescale today.**

**What was checked and NOT found:** which specific programmes map to which of the five tiers
(out of scope for this pass, beyond BA English's own confirmed figure); application deadline,
tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('bd5e07ee-175b-4569-9700-c72ffbda0b41', 'english_proficiency',
   'Set per programme across at least five IELTS tiers: 7.5, 7.0, 6.5, 6.0, 5.5 -- no single university-wide figure; BA English specifically requires 6.5 overall (6.5 Writing, 6.0+ other elements); TOEFL iBT for the 7.0 tier is 100 legacy (24 Reading/Listening, 26 Speaking/Writing) / 5.0 new scale (5.0 each component) from Jan 2026',
   'Goldsmiths sets English-language requirements per programme, spanning at least five distinct IELTS thresholds: 7.5, 7.0, 6.5, 6.0, and 5.5 overall -- applicants must check their specific programme page rather than one university-wide figure. As a concrete example, BA English specifically requires IELTS 6.5 overall, with 6.5 in Writing and no other element below 6.0. For the IELTS-7.0 tier specifically, TOEFL iBT before January 2026 requires 24 in Reading and Listening and 26 in Speaking and Writing; from January 2026 (new scale), a total of 5, with 5 in each of Reading/Writing/Speaking/Listening. Qualifications must be less than 2 years old at course start. Pre-sessional English courses are available for applicants not yet meeting their programme''s tier.',
   true, 'high', 'https://www.gold.ac.uk/apply/english-language-requirements/', now());
```

---

## 39. Keele University

`id = '09516940-5485-4100-af18-71e19d4e461c'` — QS rank 801-850.

**Source actually used:** `https://www.keele.ac.uk/study/undergraduate/apply/entryrequirements/
internationalentryrequirements/englishlanguagerequirements/` — official page, directly fetched.

**A claim checked and NOT asserted because it couldn't be confirmed:** a general search implied
Keele''s International Year One (delivered via Keele University International College, KUIC)
requires a HIGHER IELTS (7.0) than direct undergraduate entry (6.0) -- a counter-intuitive
ordering for what reads like a foundation-style pathway. The official page itself does not
state KUIC's specific figures at all, deferring to KUIC's own separate site, so this
comparison is NOT included below rather than repeated as fact from an unconfirmed source.

**What was checked and NOT found:** KUIC/International Year One's own English requirement;
application deadline, tuition, admission rate.

```sql
insert into public.university_requirements
  (university_id, requirement_type, title, requirement_detail, is_required, data_confidence, source_url, retrieved_at)
values
  ('09516940-5485-4100-af18-71e19d4e461c', 'english_proficiency',
   'Direct undergraduate entry: IELTS Academic 6.0 overall (5.5+ per component), TOEFL iBT 4 new scale (3.5 Reading, 3 Listening/Writing/Speaking) -- no legacy-scale figure stated on this page',
   'Direct undergraduate entry (Group A): IELTS Academic 6.0 overall, 5.5 in each component. TOEFL iBT: 4 overall (3.5 Reading, 3 Listening, 3 Writing, 3 Speaking) -- this page gives only this figure with no explicit before/after 21-January-2026 distinction, so it is recorded as the new-scale figure per the pattern from other UK universities, but this page itself does not label it that way. Meeting the minimum undergraduate requirement typically also satisfies the separate Student visa English requirement. A separate International Foundation Year / International Year One pathway exists via Keele University International College (KUIC), but its own specific score requirements are not stated on this page and were not independently confirmed in this pass.',
   true, 'high', 'https://www.keele.ac.uk/study/undergraduate/apply/entryrequirements/internationalentryrequirements/englishlanguagerequirements/', now());
```

---
