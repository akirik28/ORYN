# Cambridge IGCSE

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

Treated as related to, but genuinely **distinct** from, Cambridge International AS & A
Level — see that document separately; the two are never collapsed into one "Cambridge
curriculum" score.

## A. System identity

- **Owner/authority:** Cambridge Assessment International Education (part of Cambridge
  University Press & Assessment, University of Cambridge).
- **Contexts:** Global — Cambridge states A*-G grading is used in 150+ countries, 6,000+
  schools. Sits as the **Cambridge Upper Secondary** stage (ages 14-16) in the "Cambridge
  Pathway," immediately preceding Cambridge International AS & A Level (16-19). No fixed
  1:1 grade-level mapping should be assumed for every country without country-specific
  verification.
  *(No ORYN-internal document confirming which specific Turkish schools offer Cambridge
  IGCSE was found in this repository — that link should be drawn from ORYN's own school
  registry, not assumed here.)*
- **Qualification type:** Subject-by-subject secondary-level qualification, **not a
  diploma** — each subject is a separately certificated award.

## B. Native grading model

- **A*-G is Cambridge's current, primary, reaffirmed scale.** A 2025 Cambridge factsheet
  states plainly: *"Cambridge IGCSE is graded A*-G... Are Cambridge still using A*-G
  grading? Yes."*
- **A 9-1 numeric option exists as an alternative** for certain subjects/regions since
  June 2019 (historically "Administration Zone 3" schools) — but the 2025 factsheet
  doesn't mention it, suggesting A*-G is the default/standard answer while 9-1 is a
  narrower variant. **This is a two-layered fact — never report only one half of it.**
- **Not the same reform as UK domestic GCSE.** The 9-1 scale was introduced by the **UK
  government** for domestic GCSEs taken in England specifically (from 2017) — a different
  qualification (via AQA/Edexcel/OCR) from Cambridge's own IGCSE. Wales/Scotland/Northern
  Ireland don't use 9-1 for their domestic GCSEs either.
- **Cambridge's own published anchor-point equivalence:** A*=9/8/7, (B/C)=6/5/4,
  (D/E/F/G)=3/2/1, U=U — Cambridge's own crosswalk, not an invented conversion. Still a
  **grade-set equivalence, not a GPA conversion.**
- G (or grade 1) is the lowest pass; below is "U" (ungraded) — there is no F-equivalent.
- **No GPA conversion exists anywhere**, official or otherwise credible.

## C. Course / qualification structure

Confirmed directly from Cambridge's own qualification page: each of 70+ subjects (30+
languages) is a **separate certificated qualification** — no holistic "IGCSE diploma"
aggregate the way IB DP is holistic. No minimum subject count is set by Cambridge itself
(schools set their own expectations). Many subjects offer a **Core vs. Extended** tier
choice (different difficulty/grade-ceiling), a real structural nuance similar in spirit to
tiered exams. Two exam series/year (June, November); results issued August and January
respectively.

## D. Academic rigor signals

Because IGCSE is subject-by-subject, rigor signals here are about **breadth and choice**
(e.g. Additional Mathematics, three separate sciences vs. combined science, a second/third
language) rather than a single aggregate figure — Cambridge publishes no official rigor
index. IGCSE functions as preparatory to A Level and other post-16 routes; strong results
commonly inform A Level subject choice, but that's school-level advising practice, not a
Cambridge rule. Do not fabricate an ORYN-generated "IGCSE rigor score"; do not assume a
fixed "standard" subject count — it varies by school.

## E. Predicted grades

**Not primarily an IGCSE use case.** University admissions in the Cambridge pathway are
decided on A Level results (16-19), not IGCSE results (14-16) — IGCSE results are usually
already final/known by application time (two years prior), so there's normally no need to
predict them. Cambridge's general "Predicted grades: A guide for schools" document is
written generically for "formal qualifications" and doesn't exclude IGCSE — schools
*could* in principle issue predicted IGCSE grades (internal streaming, A Level
subject-entry requirements, mid-course transfer applications) — but this isn't the same
high-stakes, university-facing use case predicted A Level grades have. Treat any
"predicted IGCSE grade" as a school-internal planning artifact, not a university-admissions
input, unless a specific case shows otherwise.

## F. Class rank

No evidence IGCSE involves class rank as part of the qualification itself — a
school/country-specific practice entirely outside Cambridge's exam-board role, if it
exists at all. **Never infer or fabricate one.**

## G. Standardized / external assessment

Externally set and marked by Cambridge Assessment International Education (not
school-internal). No total/aggregate IGCSE score across subjects — confirmed by absence of
any diploma-level mechanism on the official qualification page (contrast: the Cambridge
**AICE Diploma** does exist for A Level, built from AS/A Level credits — there is no
IGCSE equivalent).

## H. Unsafe inferences

- Do not compute a fake aggregate "IGCSE GPA" across independent subject qualifications.
- Do not assume every record uses A*-G or that every record uses 9-1 — both scales
  coexist by school/region/subject; preserve the native grade symbol exactly as reported
  (`grade_value` as TEXT is correct — never coerce "9" into "A*" or vice versa without an
  explicit, sourced anchor-point table, and even then only for display, never as if they
  were the same grade).
- Do not treat a Core-tier grade as equivalent in ceiling/difficulty to an Extended-tier
  grade in the same subject without noting the tier.
- Do not assume a predicted IGCSE grade (if present) is a final, official result.
- Do not infer class rank.
- Do not assume IGCSE subject choice mechanically constrains later A Level subject choice
  — no Cambridge rule enforces this.
- Do not assume Cambridge IGCSE is "the same as" UK domestic GCSE for admissions purposes
  without checking — related but administratively distinct (different exam
  boards/bodies), even where grade scales overlap.

## I. Counselor interpretation

**Should care about:** breadth and level (Core vs. Extended) of subjects taken, especially
in areas relevant to the student's stated interests; subject-level grade trend across the
two IGCSE years if multiple sittings/mock data exist; whether strong IGCSE performance
foreshadows a natural A Level subject choice (a discussion point, not a hard rule); native
grade values exactly as reported (preserve A*-G or 9-1, plus which scale).

**Should not care about:** a fabricated aggregate IGCSE score or GPA; a fabricated
percentile or class rank; cross-scale grade conversion presented as equivalence rather
than Cambridge's own anchor-point comparison.

## J. Profile data-model implications (grounded against ORYN's actual schema)

An `education_records` row for an IGCSE stage would currently need `curriculum='other'`
(or risk mis-coding as `'a_level'` — **wrong**, since IGCSE and A Level are
administratively/developmentally distinct qualifications/stages, not the same curriculum
type). Individual subject rows in `courses` would likewise need `level='other'` since no
IGCSE-adjacent value exists.

**Confirmed, real gaps:**
- `curriculum_type` enum (`ap|ib|a_level|turkish_curriculum|national_curriculum|other`)
  has **no `cambridge_igcse`/`igcse` value**, even though it has a specific `a_level`
  value for the *very next* stage of the same Cambridge Pathway — an inconsistent
  granularity that loses the ability to distinguish a Cambridge-system 14-16 student from
  a generic "other" student. Worth a deliberate schema decision (add the value, or
  document "other + notes" as the intentional choice).
- `courses.level` has the same asymmetry — no IGCSE-specific value, even though `a_level`
  is named.
- `grade_value`/`grade_scale` (TEXT) already correctly preserve "A*" vs. "9"-style symbols
  without forcing a GPA — this part needs no change.
- Core/Extended tiering has no explicit field anywhere in the schema — would currently
  have to live in free-text `notes`/`course_name` if ORYN wants to preserve it.

## Unresolved questions

- Exactly which countries/"administration zones" currently retain the 9-1 IGCSE option as
  of 2026 — the relevant Cambridge "choosing grade sets" guidance PDF could not be parsed
  as text.
- No independent verification (in-repo or web) of which specific Turkish schools offer
  Cambridge IGCSE — flagged as unconfirmed, not fabricated; draw this from ORYN's own
  school registry instead.

## Primary sources

- [Cambridge IGCSE overview](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/) — search-snippet
- [Cambridge International AS & A Level factsheet (pathway diagram)](https://www.cambridgeinternational.org/images/255120-cambridge-international-as-and-a-level-factsheet-english.pdf) — official PDF
- [Cambridge IGCSE: A guide to A*-G and 9-1 grades (2025)](https://www.cambridgeinternational.org/Images/412121-igcse-9-1-grading-factsheet.pdf) — official PDF, primary source for B
- [Cambridge IGCSE qualification page](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-upper-secondary/cambridge-igcse/qualification/) — official page, primary source for C/D/G
- [Predicted grades: A guide for schools](https://www.cambridgeinternational.org/Images/682063-predicted-grades-a-guide-for-schools.pdf) — official PDF
