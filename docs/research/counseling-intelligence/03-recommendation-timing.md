# 03 — Recommendation Timing

**Answers:** When does a given recommendation type make sense, by grade/age, conditionally rather
than universally?

**The gap this document exists to fill**, stated plainly in `docs/counselor-core.md`'s own known
limitations: *"No grade-level computation. `eligible_grades` restrictions are always treated as
`unknown` rather than resolved — Oryn doesn't derive a student's current grade from
`graduation_year` anywhere in the codebase today."* This document does not implement that
derivation (out of scope — research only), but it does two things a future implementation needs:
(1) a concrete, low-risk proposal for *how* an approximate stage could be derived from data ORYN
already collects, and (2) the actual counseling content — what should differ by stage — which is
the harder, non-obvious part and the real point of this research package.

## 1. Why "grade" is the wrong universal unit, and what to use instead

ORYN is explicitly global (`TargetGeography`: `usa`/`uk`/`europe`/`canada`/`turkey`/`not_sure`;
`CurriculumType`: `ap`/`ib`/`a_level`/`turkish_curriculum`/`national_curriculum`/`other`). "Grade 10"
is a US-specific label; the UK uses "Year," the IB uses "DP1/DP2" (post a non-diploma lower-
secondary phase), and Turkey's system has its own structure. Rather than picking one country's
label as the default, this document uses **years-until-expected-graduation** as the portable unit
— a number, not a label — and separately gives the label-mapping per system where useful for
human-readable copy.

**RULE-COUNSEL-200 — derive an approximate stage from data already collected, never claim
precision it doesn't have.** ORYN's `profiles` table already stores `graduation_year` (collected at
onboarding, `PHASE 3` of the founder spec) and `curriculum`. `yearsUntilGraduation = graduation_year
- currentYear` is a simple, always-available computation requiring no new data collection. Mapped
per curriculum:

| `yearsUntilGraduation` | US-label equivalent | UK-label equivalent | IB equivalent | Approx. age |
|---|---|---|---|---|
| 4 | Grade 9 (Freshman) | Year 10 | Pre-DP | 14–15 |
| 3 | Grade 10 (Sophomore) | Year 11 (GCSE year) | Pre-DP / DP prep | 15–16 |
| 2 | Grade 11 (Junior) | Year 12 (start of A-level / DP1) | DP Year 1 | 16–17 |
| 1 | Grade 12 (Senior) | Year 13 (A-level exam year / DP2) | DP Year 2 | 17–18 |
| 0 or negative | Graduated / gap year | — | — | 18+ |

Sourced for the US↔UK↔IB correspondence: general schooling-age conversion resources converge on
this mapping (GCSE years = UK Years 10–11 ≈ US grades 9–10; A-levels/IB = UK Years 12–13 ≈ US grades
11–12) [S-GRADE-CONV] — **medium confidence**: no single official cross-government source
publishes this exact table (each country's education ministry documents its own system, not the
correspondence between systems), but the mapping is consistent across every source checked and
matches the age bands both systems publish independently. **This computation must be presented as
an approximation, never a confirmed fact** — a student who skipped a grade, is on a non-standard
timeline, or attends a system with a different structure (Turkish curriculum's own staging,
untested here in as much depth — flagged in `10-open-questions.md`) would be mismapped. The
implementation-facing recommendation: compute it as a *default/fallback* display ("approximately
Grade 11 based on your graduation year") and let a student override with an explicit current-grade
field if ORYN ever collects one — never silently treat the derived value as ground truth for a hard
eligibility gate (consistent with `lib/counselor/eligibility.ts`'s existing "unknown, not excluded"
posture for other uncertain facts, per `docs/counselor-core-plan.md`'s Assumption A2).

## 2. The two-stage model this research converges on

Every source pattern checked for this document — College Board's own published SAT/PSAT timeline,
IB subject-selection guidance, and the clustering of summer-research-program eligibility windows —
independently lands on approximately the same two-phase split, which this document adopts as the
operative model rather than inventing a finer-grained one not supported by evidence:

**Phase 1 — Exploration (roughly 4–3 years from graduation, ages ~14–16, US grades 9–10 / UK Years
10–11 / pre-DP):** breadth is developmentally appropriate and should not be flagged as a weakness.
**Phase 2 — Deepening & output (roughly 2–1 years from graduation, ages ~16–18, US grades 11–12 /
UK Years 12–13 / DP1–2):** the same breadth pattern that was healthy in Phase 1 becomes a legitimate
gap signal if it hasn't started converging — not because breadth became bad, but because the
runway to produce depth-evidence before applications is now genuinely short.

This directly operationalizes the "contextual severity" principle `docs/counselor-core-plan.md` §5
already commits to ("with N years before graduation, this is worth addressing early" /
"with limited time before applications, prioritize breadth over starting something new") without
requiring a numeric score adjustment — see `04-profile-gap-framework.md` for how this composes with
severity.

## 3. Recommendation-type timing table

For each recommendation family, what's appropriate in each phase, and why. "Inappropriate" below
means *not a priority*, never a hard block — a younger student who has genuinely already found deep
focus, or an older student legitimately still exploring for good reason (e.g., a genuine late
bloomer, or a student whose interests shifted), is a real case the counselor should still serve
honestly (§5), not force into the phase-typical pattern.

| Recommendation type | Phase 1 (exploration) | Phase 2 (deepening) |
|---|---|---|
| Trying several `student_interests`/activity types | **Appropriate, even encouraged** | Only if a genuine pivot is underway; otherwise reads as a gap, not a strength |
| Standardized testing | Diagnostic only (e.g. PSAT 10) — College Board's own guidance: "most sophomores are not ready for the SAT, and that is completely fine" [S-COLLEGEBOARD-TIMELINE] | Primary testing window — PSAT/NMSQT fall of the 3-years-out year, first official SAT/equivalent spring of the 2-years-out year, retakes into the 1-year-out year [S-COLLEGEBOARD-TIMELINE] |
| Summer research/academic programs | Appropriate at accessible/broad programs; most *selective* named research programs are structurally closed to this phase (see below) | Primary window — the large majority of selective pre-college research programs surveyed for this document explicitly gate on "rising junior/senior" status (roughly 2–1 years from graduation) [S-SUMMER-RESEARCH-ELIGIBILITY] |
| Founding a venture/club vs. joining one | Joining/exploring several is fine | Founding (if pursued) should ideally already be underway, not starting fresh with under a year of runway to show sustained evidence |
| Leadership role-seeking | Appropriate to start building toward | Should show progression (member → responsibility) already in evidence, not a first attempt |
| Career exploration breadth (shadowing, multiple fields) | Core activity of this phase | Should show narrowing toward 1–2 fields with deeper engagement, not still-flat breadth |
| IB/A-Level/AP subject selection | The actual decision point for IB (subject choice at the Grade 10/11 transition) and A-Level (chosen entering Year 12) [S-IB-SUBJECTS] | Already committed — recommendations should work within the chosen subjects, not suggest reopening the choice |
| University list building | Premature as a primary focus; fine as light, low-effort exploration | Core activity — target-university list should be forming/firming |
| Application-readiness tasks (essays, recommendations, requirement checklists) | Not yet relevant | Core activity, increasingly urgent as `yearsUntilGraduation` approaches 0 |

## 4. Interaction with student-set time budget and busy periods

The founder spec's `TimeBudget` (`under_2h`/`2_5h`/`5_10h`/`10h_plus`, Phase 64) and academic
busy-period marking (Phase 65, e.g. "exam week") are a **separate axis from stage** and must combine
multiplicatively in effect, not be confused with each other: a Phase-2 student in a genuinely
low-time-budget period should still get depth-oriented (not breadth-oriented) recommendations, just
fewer/smaller ones, or ones explicitly scoped to fit the available time (e.g., "spend the 90 minutes
you have this week finishing the research conclusion," not "start a new project"). **RULE-COUNSEL-
201:** stage determines *what kind* of recommendation is appropriate; time budget determines *how
much and how big*. Never let a tight time budget silently change a recommendation's category (e.g.,
substituting a breadth-exploration suggestion for a depth one merely because depth work would take
longer) — if nothing depth-appropriate fits the available time, the honest answer is a smaller depth
task or an explicit "not much fits this week" statement, not a category swap.

## 5. Explicit exceptions — where the phase-typical pattern must not be applied mechanically

**RULE-COUNSEL-202:** A student outside the typical phase pattern for their stage is not
automatically a gap — the "why" must distinguish *time remaining* (an objective fact) from
*implied deficiency* (a judgment this research explicitly warns against making automatically).
Concrete cases:
- A Phase-1 student who has already found deep focus (e.g., a 14-year-old with two years of
  sustained, self-directed project work in one area) should not be nudged toward artificial breadth
  "for its own sake" — `01-development-taxonomy.md`'s `intellectual_curiosity` section already
  notes breadth is valuable mainly as a *precursor* to depth, not a requirement independent of it.
- A Phase-2 student who is still broad because of a genuine, recent, legitimate interest shift
  (goal-system data, Phase 66 of the founder spec, would show a recently changed or added goal)
  should have that context surfaced explicitly ("your focus shifted recently, which is why
  breadth-stage patterns still apply") rather than being penalized as if the shift never happened.
- A student with `education_stage = "other"` or a `curriculum = "other"` has no reliable
  `yearsUntilGraduation` mapping at all — this must degrade to "insufficient data for timing
  context," never a silent default to one specific country's grade system.

## 6. A bigger caveat than timing alone: not every target geography evaluates a "developed profile" the same way

**This section exists because of a cross-branch finding worth flagging prominently rather than
burying**: the peer session's persona-testing pass (`09-persona-testing.md`) surfaced that this
entire package's admissions-signaling reasoning — depth-over-breadth, sustained extracurricular
commitment, the redundancy/saturation logic — is sourced almost entirely from **US holistic-review**
institutions (NACAC, the Common Data Set, MIT/Harvard GSE) and does not transfer uniformly across
ORYN's five target geographies (USA/UK/Europe/Turkey/international). Verified independently for
this document (not merely taken on the peer's word):

**Turkey — YKS is a centralized, exam-score-dominated placement system, not a holistic review.**
The Yükseköğretim Kurumları Sınavı (YKS), administered by ÖSYM, consists of standardized exam
sessions (the Basic Proficiency Test/TYT taken by all applicants, plus Field Qualification Tests/AYT
and a Foreign Language Test/YDT as applicable); students are placed into programs by score-ranked
preference matching, not by an application file containing essays, recommendations, or an
activities list [S-YKS]. **RULE-COUNSEL-228:** for a student targeting Turkish public university
placement specifically (as opposed to targeting a private Turkish university with its own
supplementary admission criteria, or targeting abroad), this package's entire "build a developed,
holistic profile across 9 dimensions" framing is **largely inapplicable to the admission decision
itself** — academic exam performance (this package's `academics` dimension, narrowly) is doing
nearly all of the admissions work, and the other 8 dimensions matter for the student's own genuine
development and future readiness, but should never be framed to a YKS-track student as "this will
help your admission chances" the way it legitimately could be for a US-holistic-track student. This
is a **structural, not incremental, difference** — the single most consequential country-caveat
this whole research package surfaced, and it applies to the redundancy/saturation framework
(peer's `05-redundancy-saturation.md`) and this document's own two-phase model at least as much as
to anything career-family-specific.

**A real gap this rule doesn't resolve on its own, surfaced by testing it against a concrete
persona (a 14-year-old in Turkey, `yearsUntilGraduation` ≈ 4, interested in Computer Science, no
`target_universities` added yet):** RULE-COUNSEL-228's Turkey clause is conditioned on the student
"targeting Turkish public university placement specifically" — but ORYN has no direct signal for
this until a student adds actual target universities, and a young Phase-1 student very plausibly
hasn't yet. `TargetGeography` only has one `"turkey"` value, not a public/YKS-track vs. private/
foundation-university vs. studying-abroad-from-Turkey split. **RULE-COUNSEL-230 (new):** absent a
specific target-university signal, a `target_geography = "turkey"` student should be treated as
*probably* YKS-track by default — not because every Turkey-targeting student is (some target
foundation/private universities with supplementary criteria, or study abroad, per the clause
above), but because YKS-track public-university placement is the larger, more common case in
Turkey's system, and the failure mode of wrongly suppressing US-holistic-style admissions framing
for a student who turns out to be private-track/abroad-track is far less harmful than the reverse
failure mode (implying a YKS-track student's extracurricular profile "helps their admission
chances," which this document's own analysis shows is close to false). This should be revisited
the moment the student adds a specific target university — at which point the actual institution's
admission model (checkable, at least approximately, from whether it is a state/public university
using the centralized YKS placement or a vakıf/foundation university with its own supplementary
process) should override this default, the same "unknown fact, safe default, override once known"
pattern already established elsewhere in this package (e.g. `lib/counselor/eligibility.ts`'s
`unknown` verdict never hard-excluding).

**UK — UCAS runs on a "super-curricular," subject-relevant logic, not a general "well-rounded
profile" logic.** UK admissions guidance draws an explicit, named distinction between
*super-curricular* activity (subject-relevant academic engagement beyond the school curriculum —
reading beyond the syllabus, attending relevant lectures, an independent project in the applied-for
subject) and *extracurricular* activity (general activities — sports, clubs, volunteering,
leadership) that would broaden a student as a person rather than demonstrate subject engagement
specifically [S-UCAS-SUPERCURRICULAR]. The 2026-entry UCAS personal statement format has a
dedicated question structure built around subject-specific engagement, with UCAS's own guidance
suggesting the large majority of statement content should be academic/subject-focused — meaning
general extracurricular
breadth across many `ProfileDimension`s is **a much weaker admissions signal for a UK-track
student than the same breadth would be for a US-track student**, even though it may still be
genuinely valuable for the student's own development. **RULE-COUNSEL-228 extends to this case**:
for a UK-track student, a recommendation drawing on this package's general depth-over-breadth
reasoning should specifically favor subject-relevant (super-curricular) deepening over general
extracurricular breadth, more sharply than for a US-track student.

**What this does not mean**: this package's underlying developmental content (what actually
constitutes genuine research depth, real leadership substance, etc. — `01-development-taxonomy.md`,
`06-major-family-evidence/`) remains valid regardless of target geography, since it describes real
skill/experience development, not an admissions-signaling claim. What changes by geography is
**whether, and how directly, that development is framed as mattering for admission** — the
`RULE-COUNSEL-217`-style boundary (never let Oryn's own developmental framing imply a university
requirement) already established in `07-explainability-framework.md` becomes even more load-bearing
for Turkey/UK-track students, where the gap between "genuinely useful for your development" and
"moves the needle on this specific admission decision" is largest. This is flagged as the highest-
leverage open item for future work by the peer session's `10-open-questions.md` and this document
concurs.

## 7. What this implies for a future implementation (not built here)

1. Compute `yearsUntilGraduation` from existing `graduation_year`; expose it as *context*, not a new
   `ProfileDimension` or a hard eligibility gate — closest existing analogue is how
   `RequirementEvaluationSummary`'s sourced reasoning is surfaced alongside, not merged into, gap
   severity (`docs/counselor-core-plan.md` §5's "Requirement/admissions boundary").
2. `lib/counselor/evidence.ts`'s `why[]` template strings are the natural place to reference stage
   context, exactly as `docs/counselor-core-plan.md` §5 already anticipates in prose — this document
   provides the actual phase-appropriate language content for those templates.
3. This does **not** touch `eligible_grades` eligibility resolution directly (a different, harder
   problem — free-text grade restrictions on opportunities, not a student's own stage) — flagged
   separately in `10-open-questions.md`.

## Sources referenced in this document

| ID | Source | Type | Confidence | Used for |
|---|---|---|---|---|
| S-GRADE-CONV | Cross-referenced general schooling-age/grade conversion resources (e.g. [UK Year Groups vs US Grades conversion](https://blog.doris.school/uk-year-groups-vs-us-grades-complete-age-conversion-chart), [UK to US School Years](https://www.omnicalculator.com/uk-to-us-school-years)) | Secondary/aggregator, cross-checked across multiple independent sources for consistency | Medium — no single official source, but convergent and consistent with each country's own independently published age bands | §1 grade/year/age mapping table |
| S-COLLEGEBOARD-TIMELINE | College Board's own [SAT Suite test dates page](https://satsuite.collegeboard.org/psat-nmsqt/test-dates) plus corroborating grade-by-grade guidance | Official (test-dates page) + secondary corroboration for the narrative timeline | High for the official dates structure (PSAT 10 sophomore spring, PSAT/NMSQT junior fall); medium for the narrative "most sophomores aren't ready" framing (secondary-sourced) | §3 standardized-testing row |
| S-IB-SUBJECTS | Cross-referenced IB subject-selection guidance (school/counseling sources; no single official IBO page found with the full timeline in one place) | Secondary, convergent across sources | Medium | §3 IB subject-selection row, §1 IB staging |
| S-SUMMER-RESEARCH-ELIGIBILITY | Pattern observed across multiple named pre-college research program pages (Harvard Pre-College, Stanford SIMR, Davidson Research Initiative, Rockefeller, Max Planck Florida — surveyed via secondary aggregation, not every program's own page individually fetched this pass) | Secondary aggregation of program eligibility patterns | Medium — the *pattern* (rising junior/senior gating) is consistent and directly relevant; individual program specifics should be re-verified against each program's own official page before being cited to a student as fact, which is exactly what `data/research/opportunities/*` acquisition work (a separate ORYN workstream) is already responsible for doing per-opportunity | §1 introductory framing, §3 summer-program row |
| S-YKS | [Student Selection and Placement System — overview](https://en.wikipedia.org/wiki/Student_Selection_and_Placement_System) corroborated by multiple independent sources describing ÖSYM's official YKS structure (TYT/AYT/YDT sessions, score-ranked preference placement); ÖSYM's own site (osym.gov.tr) not directly fetched this pass | Secondary description of an official, government-run exam system | Medium-high — the system's existence and general structure (centralized exam, score-based placement, no holistic application file) is well-corroborated and low-controversy; exact current-year exam-format details should be re-verified against ÖSYM's own site before being quoted as current | §6 |
| S-UCAS-SUPERCURRICULAR | Cross-referenced UK admissions-guidance sources describing UCAS's official super-curricular/extracurricular distinction and the 2026-entry personal statement's three-question format, corroborated directly against [UCAS's own personal-statement toolkit](https://www.ucas.com/advisers/help-and-training/toolkits/personal-statement-toolkit) and [how-to-write-your-personal-statement page](https://www.ucas.com/applying/applying-to-university/writing-your-personal-statement/how-to-write-your-personal-statement-for-2026-entry-onwards) (fetched independently by this session — not assumed present in the peer branch's differently-scoped `01-development-taxonomy.md`, which this pass confirmed focuses on US sources (Common Data Set/NACAC/MIT/Harvard GSE) and may not cover UCAS at all — a real, separate gap noted for `10-open-questions.md`) | Official (UCAS) for the format/ratio claim; secondary corroboration for the super-curricular/extracurricular terminology itself | High for the official UCAS pages; medium-high for the terminology distinction | §6 |

Full registry: `data/research/counseling-intelligence/sources.json` — this document's entries will
be merged into the unified registry at the final-integration pass (see handoff doc), using IDs
prefixed distinctly (`S-` vs. the peer session's `SRC-###`) to avoid collision until then.
