# Advanced Placement (AP)

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

College Board domains were fetched **directly** without issue in this research pass, so
AP facts below carry higher confidence than the IB findings (which relied on
search-snippet extraction due to Cloudflare blocking).

## A. System identity

- **Owner/authority:** College Board, a US non-profit membership organization —
  apstudents.collegeboard.org (student-facing), apcentral.collegeboard.org
  (educator-facing), international.collegeboard.org (international-school-facing, whose
  existence directly confirms AP is administered outside the US at authorized schools,
  not purely domestic).
- **Contexts:** Originates in and is predominantly associated with the US (grades 9-12),
  also administered internationally. No fixed age minimum/maximum for the exam itself —
  self-study/independent candidates are explicitly permitted for most subjects.
- **Qualification type — AP is not a diploma and not, by itself, a curriculum.** Three
  separate concepts that must never be conflated:
  1. **AP course** — a year-long class (at the student's school, an authorized online
     provider, or via self-study) following a College Board course framework. Only
     carries official "AP" transcript status if the specific school's course section was
     authorized via the **AP Course Audit** and appears on that school's **AP Course
     Ledger** — a teacher informally calling a class "AP" without Ledger authorization is
     a real, if edge-case, gap between label and recognized status.
  2. **AP Exam** — the standardized assessment, externally authored and scored by College
     Board, fixed May window, independent of how (or whether) the student was taught.
  3. **AP Exam score** — the 1-5 result.

  There is **no general "AP diploma."** The one narrow exception: the **AP Capstone
  Diploma** — an optional, additional recognition (not a graduation-credential
  replacement) requiring 3+ on both AP Seminar and AP Research plus four more AP exams at
  3+ (Seminar+Research alone at 3+ yields the lesser "AP Seminar and Research
  Certificate"). A separate **AP Scholar** award family exists too, based on patterns of
  exam scores.

## B. Native grading model

- **AP course grade:** an ordinary school-assigned grade (letter/numeric/percentage,
  whatever the school itself uses) — **not standardized or controlled by College Board in
  any way.**
- **AP exam score:** College-Board-set **1-5** scale (5 = extremely well qualified ... 1 =
  no recommendation), via College Board's own statistical "score-setting" process intended
  to keep a given score's meaning stable year to year.
- **These two numbers are independent**, from independent authorities, and can diverge
  significantly in either direction (an A in the course with a 2 on the exam, or vice
  versa) — directly confirmed by the course/exam independence findings in C.
- **No official AP→GPA conversion exists.** A commonly-repeated "college course grade
  equivalent" table (5≈A/A+, 4≈A-/B+/B, 3≈B-/C+/C) appears consistently in secondary/
  test-prep sources but is **credit/placement-equivalence guidance**, not a GPA-conversion
  rule, and was **not** independently re-confirmed against a raw, current College Board
  page this session — must not be used by ORYN as a universal GPA table; any real
  conversion must be sourced to a specific named university's own stated policy.

## C. Course / qualification structure

- **AP course vs. AP course grade vs. AP exam vs. AP exam score** — kept fully separate.
- **Course/exam independence — directly confirmed via two official College Board
  help-center pages (fetched, not search-snippet):**
  - Taking an AP course does **not** require taking the exam. College Board's own words:
    *"While we recommend taking the AP Exam after taking an AP course, it is not required
    by College Board,"* though some schools require it as local policy.
  - Taking the exam does **not** require having taken the course, with named exceptions
    (below).
- **Named exceptions:** for **AP Seminar, AP Research, and AP Computer Science
  Principles** specifically, the course (or at minimum its through-course
  performance-task/portfolio component) is effectively required — per a directly-fetched
  international.collegeboard.org page, verbatim: *"For most AP subjects, no. However, for
  the following, you must take these courses before taking the corresponding AP Exam: AP
  Seminar, AP Research, and AP Computer Science Principles."* Students attempting only the
  end-of-course exam for these three "will not receive a complete score." (AP CSP does
  allow a formal exam-only/independent-study path if the student separately submits the
  Create performance task — secondary-sourced detail, not independently re-fetched
  verbatim.)
- **AP Course Ledger** — the school-level authorization mechanism (AP Course Audit) that
  determines whether "is this an AP course" is really a Ledger-authorized fact, not merely
  a teacher's label.
- **AP Scholar / AP Capstone Diploma** — College-Board-issued recognitions based on
  patterns of exam scores, reported on the student's official score report from July.

## D. Academic rigor signals

The number/breadth of AP courses a student has taken is only meaningful **relative to
what their own school actually offers** — 5 APs at a school offering 6 total is a very
different signal from 5 APs at a school offering 25. This school-catalog context is not
present in ORYN's current schema and is a genuine external-data need, not something to
fabricate. Given the confirmed course/exam independence, whether a student (a) took both
course and exam, (b) course only, (c) exam only (self-study), or (d) course with no
recorded exam result are four genuinely different, informative patterns ORYN should
surface — not assume (a) by default. This research does not propose a synthetic "AP rigor
score."

## E. Predicted grades

**No formal College-Board-administered equivalent to IB's predicted grade exists** — this
was actively investigated, not assumed (no official College Board page describing an
institutional "predicted AP score" process was found, in clear contrast to IB's named,
official, UCAS-integrated mechanism). What exists informally: school counselors sometimes
giving non-official estimates (particularly referenced where UK students take AP
alongside/instead of A-Levels for international applications), and third-party
unofficial AP-score-predictor calculators. Neither is equivalent to real data or to IB's
formal mechanism.

## F. Class rank

College Board does not compute, define, or report class rank as part of AP. Whether a
school reports rank — and whether/how it weights AP courses in a weighted-GPA scheme used
for ranking — is entirely school/district policy, unrelated to College Board. **Never
infer or derive class rank from AP exam scores or course counts.**

## G. Standardized / external assessment

The AP Exam is externally authored and scored by College Board — the clearest,
single most product-relevant distinction from the entirely school-controlled AP course
grade. Exams administered in a College-Board-set May window (illustrative 2027-cycle
pattern: primary May 3-7 and May 10-14, late-testing May 17-21 — year-specific, re-verify
per cycle). Scores released starting in July via rolling regional release (2026 cycle:
began "Monday, July 6, 2026," colleges receiving data slightly earlier from July 1).

## H. Unsafe inferences

- Do not assume a student took the AP Exam just because they took the AP course.
- Do not assume a student took the AP course just because a score exists — self-study/
  independent exam-taking is explicitly permitted for most subjects.
- Do not treat the AP course grade (school-assigned) as interchangeable with, predictive
  of, or a substitute for the AP exam score (College-Board-assigned).
- Do not assume a school not offering a given AP means the student chose not to take it —
  availability varies, and self-study has its own access barriers (cost, test-center
  access).
- Do not invent a GPA-equivalent conversion of AP scores as a universal rule; the "college
  course grade equivalent" figures found are credit-equivalence guidance, not GPA
  conversion, and were not independently reconfirmed this session.
- Do not infer class rank from AP course count or exam scores.
- Do not treat an AP Scholar Award or AP Capstone Diploma as equivalent to earning an
  actual high-school diploma — they are College-Board recognitions layered on top of a
  student's real diploma-granting curriculum.
- Do not assume every teacher-labeled "AP" class is Ledger-authorized (rare edge case,
  but real).
- Do not treat informal/unofficial "predicted AP score" estimates as equivalent to any
  official College Board data point.

## I. Counselor interpretation

**Should care about:** subject alignment between AP courses and the student's target
field; AP exam scores where available (the one externally-verified, College-Board-
controlled data point — more evidentially weighty than the course grade alone); number of
APs relative to what the school actually offers (a data need, not something to fabricate);
whether the student's pattern is course-only, exam-only, or both, since these carry
different evidentiary weight; AP Capstone/Scholar recognitions where present.

**Should not care about:** fabricating a GPA conversion from AP scores; assuming exam
participation from course enrollment or vice versa; computing an inferred class rank;
treating an unauthorized/non-Ledger "AP" label the same as an authorized one without being
able to tell the difference.

## J. Profile data-model implications (grounded against ORYN's actual schema — key finding)

**`education_records.curriculum='ap'` is a modeling error, confirmed by this research, not
assumed.** IB DP, A-Level, and a national curriculum are all school-wide frameworks a
student is enrolled *in* for a stage of schooling — a school "is" or "is not" an IB World
School; a UK school "runs" A-Levels. AP has no equivalent whole-school-framework meaning:
there is no "AP curriculum" a school's entire programme follows, no "AP diploma" standing
in for a real high-school diploma (the AP Capstone Diploma is supplementary, not a
replacement — see A), and no concept of a school "being an AP school" the way it can "be
an IB World School." Virtually any school on virtually any base curriculum can *also*
offer some AP courses as enrichment. So `curriculum='ap'` invites a student's base
`education_records` row to be mis-tagged with a course-level enrichment label instead of
their actual school-wide framework — exactly the flattening error this research brief
warned against.

**Recommended fit:** an AP course belongs as a `courses` row (`level='ap'`,
`course_name='AP Calculus BC'`, `subject='Mathematics'`) nested under an
`education_records` row whose `curriculum` describes the student's **actual** base
schooling framework (e.g. `'national_curriculum'` for a typical US school) — **not**
`curriculum='ap'`. Recommend either removing `'ap'` from the `education_records.curriculum`
enum, or restricting its legitimate use to a narrow, deliberately-scoped edge case (e.g. a
self-study candidate with no normal school enrollment) that the product team should decide
explicitly.

**The AP-exam-score-in-`test_scores`-vs-AP-course-grade-in-`courses.grade_value` split is
assessed as correct** and is a genuine strength of the current schema — it faithfully
mirrors the real-world independence of course grade (school-controlled) and exam score
(College-Board-controlled). This part does not need to change.

**Confirmed gaps:**
- No link between an AP `courses` row and its corresponding `test_scores` exam-score row
  — given course-taking and exam-taking are independently optional, ORYN cannot currently
  tell whether a given AP score corresponds to a course the student also took, a
  self-study exam, or a course with no matching result. Recommend a nullable FK (e.g.
  `test_scores.course_id`).
- No representation of AP Course Ledger status, AP Scholar tiers, or the AP Capstone
  Diploma — likely fit into the product's existing certifications/awards tables, but not
  confirmed in this research.
- No school-AP-catalog context (how many/which APs the student's own school offers) exists
  anywhere in the described schema — needed to correctly read "number of APs taken" per
  section D; an external-data gap, not a fabrication risk, but worth flagging.

## Unresolved questions

- Exact current AP Scholar award tier thresholds — search-snippet only, not independently
  re-fetched verbatim.
- Whether the "college course grade equivalent" table (5≈A, etc.) is still College Board's
  own current framing or a test-prep-industry construction — recommend a direct follow-up
  fetch of the score-setting/scoring page before using this in product copy.
- Full, current mechanics/practical prevalence of AP Course Audit/Ledger authorization —
  only the existence of the mechanism was confirmed, not how common non-Ledger labeling
  actually is.
- Whether AP is meaningfully offered at scale in ORYN's other target geographies (UK,
  Europe, Türkiye) — international.collegeboard.org confirms non-US administration
  happens, but country-level prevalence wasn't established.
- Exact, current, exhaustive list of AP subjects requiring the through-course component
  beyond the three named — should be reconfirmed periodically, College Board updates
  requirements over time.

## Primary sources

- [Do I have to take the AP Exam?](https://apstudents.collegeboard.org/help-center/do-i-have-to-take-ap-exam) — direct fetch, official
- [Can I take the AP Exam if I haven't taken the AP course?](https://apstudents.collegeboard.org/help-center/can-i-take-ap-exam-if-i-havent-taken-ap-course) — direct fetch, official
- [Do I have to take an AP course to take the corresponding AP Exam? (international)](https://international.collegeboard.org/help-center/do-i-have-take-ap-course-take-corresponding-ap-exam) — direct fetch, official; verbatim exception list
- [AP Course Ledger / Understanding AP](https://international.collegeboard.org/toolkit/ap-policy/understanding-ap) — search-snippet
- [About AP Scores](https://apstudents.collegeboard.org/about-ap-scores) — direct fetch, official; 1-5 scale confirmed
- [AP Capstone Award](https://apstudents.collegeboard.org/awards-recognitions/ap-capstone-award) — search-snippet
- [AP Scholar Award](https://apstudents.collegeboard.org/awards-recognitions/ap-scholar-award) — search-snippet
- [How AP Develops Courses and Exams — Score Setting](https://apcentral.collegeboard.org/courses/how-ap-develops-courses-and-exams/score-setting-and-scoring) — found via search, not independently re-fetched verbatim
- [AP Exam Dates](https://apcentral.collegeboard.org/exam-administration-ordering-scores/exam-dates) — search-snippet
- [View Scores](https://apstudents.collegeboard.org/view-scores) — search-snippet
