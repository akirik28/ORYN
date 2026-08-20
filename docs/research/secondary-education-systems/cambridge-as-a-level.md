# Cambridge International AS & A Level

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

Treated as related to, but genuinely **distinct** from, Cambridge IGCSE (see that document
separately) — the two are never collapsed into one "Cambridge curriculum" score.

## A. System identity

- **Owner/authority:** Cambridge Assessment International Education, offered since 1951.
- **Contexts:** Global — 175,000+ students, 125+ countries/year (Cambridge's own "guide
  for universities"). Ages 16-19, immediately following Cambridge IGCSE/O Level in the
  Cambridge Pathway (UK-equivalent Years 12-13).
- **Important distinction:** "**Cambridge International** AS & A Level" is a specific,
  internationally-administered qualification, **distinct** from the UK-domestic "A Level"
  administered by UK exam boards (AQA, Edexcel, OCR) for schools in England/Wales/NI.
  Cambridge's own materials state its qualifications are *"recognised by UCAS, UK
  universities and institutions overseas as equivalent in standard and grade to the AS and
  A Levels taken by students in the UK"* — i.e. Cambridge asserts equivalence for
  recognition purposes, but they are administratively separate qualifications/awarding
  bodies.
- **Qualification type:** Subject-based, not a required holistic diploma — though an
  *optional* aggregate credential (the **Cambridge AICE Diploma**) exists; see C.

## B. Native grading model

- **A Level:** A* (highest) to E (minimum pass); below E is "Ungraded" (U) — no
  F-equivalent.
- **AS Level:** lowercase a-e, with **no A\* available at AS** (ceiling is "a"); below e is
  U.
- **Percentage Uniform Mark (PUM)** — for some countries, a supplementary 0-100 numeric
  mark showing where within a grade band a candidate performed (e.g. PUM 79 = top of a B).
  Officially published bands: A Level A*=90-100, A=80-89, B=70-79, C=60-69, D=50-59,
  E=40-49; AS a=80-100, b=70-79, c=60-69, d=50-59, e=40-49. A **per-subject** mark, not an
  aggregate, not a GPA.
- **"No Grade Point Average is calculated"** — Cambridge's own official "guide for
  universities" states this explicitly. A direct, authoritative confirmation Cambridge
  itself does not compute or endorse any GPA.
- **No GPA conversion provided by Cambridge.** A separate US-audience Cambridge document
  gives a rough **letter-grade** comparison to US letter grades (A Level A≈US "A", A Level
  E≈US "C") for general orientation — explicitly letter-to-letter, **not** a 4.0 GPA
  conversion. Do not extend it into a numeric GPA.

## C. Course / qualification structure

**The single most important structural fact:** AS Level is explicitly documented by
Cambridge as **three distinct options**, not one:
1. **Standalone AS** — taken as a complete, final qualification in its own right (content
   = half the full A Level programme).
2. **Staged** — AS in Year 1 (separately certificated at that point), remaining content in
   Year 2, with the AS mark **carried forward** into the final A Level grade (allowed
   twice within a 13-month window; not possible for all subjects, notably language
   syllabuses).
3. **Full/linear A Level** — all papers taken in the same session, usually end of Year 2,
   no separate AS certification along the way.

**Precision note:** this is specific to **Cambridge International**. UK-domestic AS Level
(English exam boards) was **decoupled** from A Level by the 2015-2017 UK linear reform and
generally no longer counts toward the A Level grade in England — Cambridge International's
staged/carry-forward route is a genuine structural difference from that. (Source dated
2018 — confirm against live grade-threshold pages if precision for a specific
session/syllabus matters.)

**Cambridge AICE Diploma exists** — an *optional* aggregate/group credential across three
curriculum areas (maths & science, languages, arts & humanities): each AS = 1 credit, each
full A Level = 2 credits, minimum 7 credits (including compulsory AS Global Perspectives &
Research since 2017), "taken primarily in the USA." **A Level does have an optional
holistic layer**, unlike IGCSE — but assume it's absent unless a student's record
specifically indicates AICE participation.

Two exam series/year (May/June, October/November). Cambridge's own guide: students
"typically study four subjects at AS Level and three at A Level"; standard UK-university
requirement is three A Levels; 50+ subjects, no compulsory subjects.

## D. Academic rigor signals

**Subject choice relative to intended major is a real, documented admissions signal —
verified at the individual-university level, not asserted as a universal exam-board
rule.** Directly confirmed example: LSE's BSc Economics page states A-level Mathematics
"is required" (standard offer A\*AA including A\* in Maths; Further Maths "desirable" not
required). The wider "Russell Group Informed Choices facilitating subjects" claim is
widely repeated in secondary sources but the official informedchoices.ac.uk page 404'd
when checked — treat as probably true but lower-confidence pending a working citation.
Cambridge itself publishes no rigor score; any subject-choice interpretation is downstream
university/college admissions policy.

## E. Predicted grades

**Formally central to UCAS/UK-style applications** (UCAS: 80%+ of offers conditional on
predicted grades; international guidance confirms universities "cannot consider your
application without grade predictions" for not-yet-sat exams). **But the predicted grade
is generated by the student's school**, not issued by Cambridge as an official result.
Cambridge draws a precise, sourced distinction between two related things:
- **Predicted grades** — issued by the school to students/parents/universities for the
  application process (external, application-process artifact).
- **Forecast grades** — the *same* teacher judgment, submitted by the school *to Cambridge
  itself* for internal exam-board QA (syllabus thresholds, special-consideration checks) —
  a genuine Cambridge process, but an internal QA input, not a student-facing "predicted
  grade."

Cambridge International schools **outside** the UK still generate predicted grades for
their own students' applications (UCAS or otherwise) — a school-level practice Cambridge
publishes guidance for, but the *formal requirement* to submit one is a UCAS/university
convention layered on top of the qualification, not something Cambridge itself issues to
the public. **Useful signal:** for staged-route students, Cambridge's own guidance notes
"their final AS grades will count as very helpful indicators of A Level predicted grades"
— an actual (not predicted) AS result can inform confidence in an A Level trajectory.
**Accuracy caveat:** external reporting found in this research indicates predictions are
frequently inaccurate (historically ~16% exactly accurate, skewing optimistic) — treat any
predicted grade as provisional, never a stand-in for a final result.

## F. Class rank

No evidence AS & A Level involves class rank as part of the qualification itself —
school/country-specific if it exists at all. **Never infer or fabricate one.**

## G. Standardized / external assessment

Externally set and marked by Cambridge Assessment International Education. Per subject,
per session, a grade (and where applicable PUM) is issued; **no GPA/aggregate by default**
— the sole exception is the optional AICE Diploma (must be explicitly earned/claimed, not
assumed present).

## H. Unsafe inferences

- Do not compute a fake aggregate "A Level GPA" — Cambridge explicitly states none is
  calculated; per-subject results are the only official artifact unless AICE participation
  is separately confirmed.
- Do not assume a standalone AS result and a full A Level result in the same subject are
  equivalent evidence — AS = half the syllabus content; some universities (e.g. University
  of Sydney, per Cambridge's own guide) explicitly state AS will not be accepted in place
  of A Level.
- Do not assume a predicted/forecast grade is the final result — school-generated
  estimates, historically accurate only a minority of the time.
- Do not assume Cambridge International AS Level works like UK-domestic (England) AS Level
  — UK domestic AS was decoupled post-2015-17 and generally doesn't carry forward in
  England, whereas Cambridge International's staged route still explicitly allows
  carry-forward.
- Do not assume IGCSE subject choice constrains A Level subject choice.
- Do not infer class rank.
- Do not treat "facilitating subject" advice as a hard Cambridge or universal-university
  rule — it's university-specific policy (verified for LSE Economics + Maths; other
  university/subject pairs need their own verification).
- Do not assume every A Level student has an AICE Diploma or other aggregate credential —
  optional, must be separately confirmed.

## I. Counselor interpretation

**Should care about:** subject-level A Level (and, where present, AS Level) results
exactly as reported, preserving whether a result is standalone AS, staged/carried-forward
AS, or full linear A Level; alignment between subject choices and stated target
major/field using specific, verifiable university requirements (like LSE's Maths
requirement) rather than generic assumptions; predicted-vs-final trajectory where both
exist, including whether an interim AS result updates confidence; whether AICE Diploma
participation is present (a distinct additional signal, not assumed).

**Should not care about:** a fabricated aggregate A Level GPA or score; a fabricated
percentile or class rank; treating a predicted grade as equivalent in certainty to a final
grade; treating AS-only evidence as equivalent to full A Level evidence in the same
subject.

## J. Profile data-model implications (grounded against ORYN's actual schema)

`curriculum='a_level'` fits the A Level stage reasonably well by name, and
`courses.level='a_level'` likewise names a full A Level course correctly — this is the one
part of the Cambridge pathway ORYN's existing enum vocabulary was clearly built to
describe.

**Confirmed, real gaps:**
- `courses.level` has **no distinct value for a standalone or staged AS Level result**,
  separate from a full `a_level`. Since AS and full A Level are demonstrably not
  equivalent evidence (section H), forcing an AS result into `level='a_level'` would
  misrepresent its depth/weight. Recommend adding an `as_level` (or
  `cambridge_as_level`) value.
- **The same predicted-vs-final grade gap the IB/AP research independently found** applies
  here too, with its own sourcing: no field marks a `grade_value` as
  predicted/forecast vs. final, despite Cambridge itself drawing a sharp, sourced line
  between them (epistemically different kinds of evidence — self/school-reported estimate
  vs. externally-verified official result). Recommend a `grade_status`
  (predicted/forecast/final) field, or a clearly separate mechanism.
- **PUM** is a natural fit for `test_scores.subscores` (jsonb) if AS/A Level results are
  modeled there rather than in `courses` — worth a deliberate decision on which table is
  canonical for externally-set/marked exam results (arguably closer to `test_scores` in
  spirit than school-internal coursework, which `courses.grade_value` seems designed
  around). Nothing currently prevents either choice, and neither table is described as
  clearly authoritative for this case.
- No field for AICE Diploma participation/credit count — not urgent, but a real (if
  currently low-priority) gap.

## Unresolved questions

- The 2018-dated "guide for universities" (subject counts, staged-route mechanics) is
  structurally stable but wasn't re-confirmed against a 2026-current page — check the live
  grade-threshold pages if precision for a specific session/syllabus matters.
- The Russell Group "Informed Choices" facilitating-subjects claim couldn't be re-verified
  against a live URL (404) — only the directly-verified LSE example should be treated as
  confidently sourced.
- No independent verification of which specific Turkish schools offer Cambridge AS & A
  Level — draw this from ORYN's own school registry instead.

## Primary sources

- [Cambridge International AS & A Level: A guide for universities (2018)](https://www.cambridgeinternational.org/images/255120-cambridge-international-as-and-a-level-factsheet-english.pdf) — official PDF, primary source for A/B/C/E/G
- [Cambridge Advanced Grading Scale](https://www.cambridgeinternational.org/Images/635652-cambridge-advanced-grading-scale.pdf) — official PDF, primary source for B
- [Cambridge International AS & A Level qualification page](https://www.cambridgeinternational.org/programmes-and-qualifications/cambridge-advanced/cambridge-international-as-and-a-levels/qualification/) — official page
- [Predicted grades: A guide for schools](https://www.cambridgeinternational.org/Images/682063-predicted-grades-a-guide-for-schools.pdf) — official PDF
- [LSE BSc Economics admissions page](https://www.lse.ac.uk/study-at-lse/undergraduate/bsc-economics) — official university page, directly verified
- [UCAS predicted grades guide](https://www.ucas.com/advisers/help-and-training/guides-resources-and-training/application-overview/predicted-grades-what-you-need-to-know-for-entry-this-year) — application-process context only, not exam-board authority
