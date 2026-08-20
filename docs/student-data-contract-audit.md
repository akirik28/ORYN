# ORYN student data contract audit (B2)

Compiled 2026-08-20, branch `oryn/counselor-data-quality-v1`, from direct code reads —
`types/database.ts`, `lib/scoring/*`, `lib/ai/student-context.ts`, `lib/requirements/*`,
`lib/benchmarking/*`, `lib/admissions/*`, `features/profile/field-config.ts`, `app/(app)/
profile/page.tsx`, `app/(app)/dashboard/page.tsx`, `__tests__/scoring/academics.test.ts` —
plus `grep` sweeps across `lib/`, `app/`, `features/`, `supabase/migrations/*.sql` for
`class_rank`, GPA-normalization helpers, and every `curriculum`/`overall_gpa`/`gpa_scale`
reference outside the profile/education surface. Cross-checked against
`docs/current-product-capability-map.md` §1 (Student), not just trusted from it.

**Task**: verify (a) native grades are preserved (value+scale, never silently converted),
(b) curriculum/course/exam stay genuinely distinct concepts, (c) nothing depends on a
class-rank field, and that this holds through one shared, product-semantic student model
rather than being incidentally true in some call sites and violated in others.

**Verdict: sufficient, no gap.** All three properties hold, and they hold *because* every
consumer that needs semantic student data goes through one of two existing typed
assemblers — `assembleScoringFacts` / `ScoringFacts` (scoring) and
`buildStudentAdvisorContext` / `StudentAdvisorContext` (advisor, weekly plan, Counselor
Core) — rather than each feature re-deriving raw Supabase queries. No new type was added.
This matches the founder brief's explicit instruction to reuse existing systems rather than
invent a third "StudentProfileViewModel."

---

## (a) Native grades preserved

`education_records` carries `overall_gpa: number | null` + `gpa_scale: number | null` as
two independent nullable columns (`types/database.ts:344-345`); `courses` carries
`grade_value: string | null` + `grade_scale: string | null` as free text
(`types/database.ts:361-362`). Neither pair is ever collapsed into one field or coerced
against the other:

- `lib/validation/achievements.ts:128-129` — the write-path Zod schema validates
  `overall_gpa`/`gpa_scale` as two separate `z.coerce.number()` fields with no cross-field
  transform between them.
- `lib/portfolio/build.ts:36` — the one read-path formatter that turns GPA into display text
  renders `` `GPA ${value}/${scale}` `` — the pair, never a single normalized number.
- `lib/scoring/dimensions/academics.ts:37-44` — the *only* place a GPA ratio is computed
  (`Math.min(1, overall_gpa / gpa_scale)`) is inside `scoreAcademics`, and the result feeds a
  bounded 0-100 **internal dimension score**, not a rewritten grade. The `reasonCodes` entry
  cites the raw pair (`` `GPA ${overall_gpa}/${gpa_scale}` ``, line 43), so even the
  scoring engine's own explainability trail shows the native numbers, not a converted one.
  A student on a Turkish 92.5/100 scale and one on a US 3.9/4.0 scale both produce a
  same-shaped ratio without the DB row itself ever being touched — the source columns are
  read-only inputs to this function, never written back to.
- `lib/requirements/facts.ts:22-25` and `lib/requirements/evaluate.ts:100-117` — requirement
  checking explicitly **refuses** to compare a student's GPA against a program's stated
  minimum unless both are on the identical `scale` (`sameScale = facts.gpas.filter((gpa) =>
  gpa.scale === rule.scale)`); if the scales differ it returns `unknown` with reasoning
  telling the student to compare it themselves rather than trust an automatic conversion
  (line 111). This is the one place a cross-system GPA comparison could plausibly have been
  faked, and it's the one place with an explicit code comment about why it isn't.
- `lib/ai/cv-extraction.ts:8-30` — `ExtractedItemSchema`/`CVExtractionSchema` has no GPA
  field at all. CV import never touches grades, so there is no AI-extraction path that could
  mis-scale or invent a GPA value in the first place — grades can only enter the system
  through the manual form, which writes the two raw fields directly
  (`features/profile/field-config.ts:266-267`, `app/(app)/profile/page.tsx:403`).

No `grep` hit anywhere in `lib/`, `app/`, or `features/` for a GPA-normalization helper
(`normalizeGpa`, `convertGpa`, `toFourPointScale`, a literal `/4.0` divide, etc.) — the only
`4.0` string in the codebase is a code comment explaining why such a conversion would be
invalid (`lib/requirements/evaluate.ts:102`).

## (b) Curriculum / course / exam stay distinct

Three independent types, confirmed to have zero FK/CHECK coupling and zero code path that
treats them as interchangeable:

| Concept | Type | Table.column | Consumers |
|---|---|---|---|
| Curriculum | `CurriculumType` (`types/database.ts:27`) | `profiles.curriculum`, `education_records.curriculum` | Onboarding, `CompletenessFacts.profile.curriculum`, `StudentAdvisorContext.student.curriculum`, benchmarking cohort filter |
| Course rigor | `CourseLevel` (`types/database.ts:31`) | `courses.level` | `RIGOR_WEIGHT` table in `academics.ts:5-14`, `COURSE_LEVEL_OPTIONS`/`COURSE_LEVEL_LABELS` |
| Exam / test | — (free-form `test_name`) | `test_scores.test_name`/`score`/`max_score`/`subscores` (`types/database.ts:370-381`) | Academic score's "testing presence" signal (`academics.ts:54-58`), requirement checking |

`features/profile/field-config.ts:271-272` documents the course-level list as "the one
rigor ontology, not a second parallel one" — `COURSE_LEVEL_OPTIONS` (lines 273-282) mirrors
migration 0003's `course_level` enum exactly, while `CURRICULUM_FIELD_OPTIONS` (lines 90-97)
is a separately maintained list for the unrelated `curriculum_type` enum. Every consumer
that reads `curriculum` (`lib/requirements/facts.ts:22`, `lib/ai/student-context.ts:191`,
`lib/scoring/completeness.ts:24`, `lib/benchmarking/cohort.ts:30`, `lib/benchmarking/
compute.ts:32`, `app/(app)/u/[id]/page.tsx:85,144`, `app/(onboarding)/onboarding/
actions.ts:125`) treats it as a standalone profile/education-record fact and never joins or
compares it against `courses.level`. Nothing validates that a student's `courses.level`
values are "consistent with" their declared `curriculum` — confirmed by design (capability
map §1, "AP / IB / A-Level" row), not an oversight: a Turkish-curriculum student can log an
AP course (e.g. self-studied or dual-enrolled) without the system rejecting it.

`TestScore` (`test_name`/`score`/`max_score`/`subscores`, `types/database.ts:370-381`) is a
genuinely separate entity from both — it is never written into or read from `courses.grade_value`,
and `academics.ts:54-58` scores test *presence* (`distinctTests`), explicitly not the test
*value*, exactly because a raw score can't be compared across test systems without a
validated conversion table (spec-level rule, restated in the function's own doc comment,
`academics.ts:24-30`).

## (c) No class-rank dependency

`grep -rn "class_rank\|classRank"` across every `.ts`/`.tsx`/`.sql` file in the repo (build
artifacts and `.claude/worktrees/*` mirrors excluded) returns zero hits. No migration
defines the column, no scoring dimension reads it, no requirement rule references it, no
UI field exists for it.

The one feature that could plausibly be confused with class rank — peer benchmarking
(`lib/benchmarking/compute.ts:9-15`, spec Phase 19) — is a different concept entirely: a
deterministic percentile of a student's **profile-scoring dimension score** against an
Oryn-wide cohort filtered by graduation year + curriculum (`lib/benchmarking/cohort.ts:30`),
gated at `MIN_COHORT_SIZE` and returning `percentile: null` below that threshold
(`compute.ts:21-27`) rather than inventing a number. It has no relationship to a student's
rank within their own school class, is not derived from any `class_rank`-shaped input, and
is not consumed by scoring, admissions, or the advisor — confirmed via `grep -rn
"percentile\|benchmark" lib/admissions/*.ts lib/scoring/index.ts lib/scoring/persist.ts`,
which returns nothing. Admission outlook (`lib/admissions/*`) consumes only the already-
computed academic dimension score, never raw GPA/curriculum/course data directly, keeping
the two systems decoupled.

---

## Why this is one contract, not several ad hoc ones

Two typed assemblers already exist and are the sole entry points for semantic student data:

- **`ScoringFacts`** (`lib/scoring/types.ts:17-30`), built by `assembleScoringFacts`
  (`lib/scoring/assemble-facts.ts:14-63`) — 10 tables fetched in parallel, scoped to one
  `userId`, RLS-respecting (request-scoped client, not admin). `CompletenessFacts`
  (`lib/scoring/completeness.ts:19-50`) is a documented superset used for the separate
  "does Oryn know enough" concept (`computeCounselingCompleteness`, lines 129-131).
- **`StudentAdvisorContext`** (`lib/ai/student-context.ts:11-58`), built by
  `buildStudentAdvisorContext` (lines 136-243) — explicitly **reuses**
  `assembleScoringFacts` internally (line 138: `const facts = await
  assembleScoringFacts(supabase, userId)`) rather than re-querying the same tables a second
  way, so the advisor's view of "the student's data" and the scoring engine's view can't
  drift apart. Confirmed consumers, all going through this one function (`grep -rln
  buildStudentAdvisorContext`): `lib/counselor/eligibility.ts`, `lib/counselor/state.ts`,
  `lib/ai/research-generator.ts`, `lib/ai/weekly-plan.ts`, `lib/ai/advisor-chat.ts`.

Neither assembler normalizes GPA against a fixed scale, conflates curriculum with course
level, or references a rank field — so every downstream consumer inherits (a)-(c) for free
instead of having to re-implement them.

## Do the pages themselves bypass the contract?

**`app/(app)/profile/page.tsx`** — checked directly. It fires ~15 raw per-table Supabase
queries (lines 112-129) for the achievement-CRUD sections (`AchievementSection` needs the
full editable rows — a semantic view-model wouldn't suffice there, and none of those raw
reads recompute a score, normalize a grade, or touch curriculum logic; they're plain
list-and-edit surfaces). Critically, for every place this page needs the *semantic* view —
completeness — it calls the shared assembler instead of re-deriving it: line 130
(`assembleScoringFacts(supabase, userId)`), then lines 137-150 pass that straight into
`getCompletenessChecklist(...)`. The Education section (lines 397-408) and Coursework
section (lines 410-426) render `overall_gpa`/`gpa_scale` and `level`/`grade_value` as
separate raw fields via `COURSE_LEVEL_LABELS[item.level]` (line 416) — display only, no
inline scoring or conversion logic lives in the page component.

**`app/(app)/dashboard/page.tsx`** — checked directly. It never reads `education_records`,
`courses`, `test_scores`, or `profiles.curriculum` at all. Every score-shaped value it shows
(`biggestGap`, `biggestImprovement`, career profile score/trend) comes from already-persisted
`profile_scores`/`profile_score_snapshots` rows plus `rankDimensionGaps()`
(`lib/counselor/gaps.ts`, imported line 8) — i.e. it consumes the *output* of the scoring
pipeline, never the raw academic facts, so there is no raw-grade logic here to drift.

## Conclusion

No genuine gap found. The founder brief's three properties are satisfied by the existing
`ScoringFacts`/`StudentAdvisorContext` pair and their shared `assembleScoringFacts` core,
and both pages that surface student-facing data (`profile/page.tsx`, `dashboard/page.tsx`)
either consume that shared pipeline for anything score-shaped or read raw per-table rows
only for plain CRUD display, never re-deriving curriculum/grade semantics on their own. No
new type, table, or function was added for this task.
