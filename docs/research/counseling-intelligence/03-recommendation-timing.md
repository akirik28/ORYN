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

**RULE-COUNSEL-034 — derive an approximate stage from data already collected, never claim
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
035:** stage determines *what kind* of recommendation is appropriate; time budget determines *how
much and how big*. Never let a tight time budget silently change a recommendation's category (e.g.,
substituting a breadth-exploration suggestion for a depth one merely because depth work would take
longer) — if nothing depth-appropriate fits the available time, the honest answer is a smaller depth
task or an explicit "not much fits this week" statement, not a category swap.

## 5. Explicit exceptions — where the phase-typical pattern must not be applied mechanically

**RULE-COUNSEL-036:** A student outside the typical phase pattern for their stage is not
automatically a gap — the "why" must distinguish *time remaining* (an objective fact) from
*implied deficiency* (a judgment this research explicitly warns against making automatically).
Concrete cases:
- A Phase-1 student who has already found deep focus (e.g., a 14-year-old with two years of
  sustained, self-directed project work in one area) should not be nudged toward artificial breadth
  "for its own sake" — `01-development-taxonomy.md` §2.2 already notes breadth is valuable mainly as
  a *precursor* to depth, not a requirement independent of it.
- A Phase-2 student who is still broad because of a genuine, recent, legitimate interest shift
  (goal-system data, Phase 66 of the founder spec, would show a recently changed or added goal)
  should have that context surfaced explicitly ("your focus shifted recently, which is why
  breadth-stage patterns still apply") rather than being penalized as if the shift never happened.
- A student with `education_stage = "other"` or a `curriculum = "other"` has no reliable
  `yearsUntilGraduation` mapping at all — this must degrade to "insufficient data for timing
  context," never a silent default to one specific country's grade system.

## 6. What this implies for a future implementation (not built here)

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

Full registry: `data/research/counseling-intelligence/sources.json` — this document's entries will
be merged into the unified registry at the final-integration pass (see handoff doc), using IDs
prefixed distinctly (`S-` vs. the peer session's `SRC-###`) to avoid collision until then.
