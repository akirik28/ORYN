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
