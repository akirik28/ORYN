# Counselor-Loop Defect Fixes — Report

**Assignment:** ORYN multi-agent coordination ("Org Leader"), founder-approved scope change
(production code changes in bounds for this task specifically; schema/migrations, production
Supabase writes, and merging to `main` remain off-limits without coming back to the Org Leader).
Branch `oryn/counselor-fixes`, forked from `main` at `3a5c63f`.

**Full gate, run clean before this report:** `lint` 0 problems, `typecheck` 0 errors, `test`
**1165/1165 passing** (baseline was 1155 — up by 10, all new, all regression tests for the fixes
below; nothing removed or skipped), `build` succeeds.

## Defect 1 — `lib/admissions/outlook.ts` — fixed, with one honestly-scoped limitation

Added `admissionSystemType?: "holistic" | "credential_gate"` to `AdmissionOutlookInputs`
(optional; omitting it is byte-identical to pre-fix behavior — confirmed by a dedicated test) and
`notApplicableReason: string | null` to `AdmissionOutlookResult`, per the Gate-1 mechanism in
`18-geography-conditional-scoring-design-spec.md` §2. For `"credential_gate"` targets:

- The numeric `estimateRangeLow`/`estimateRangeHigh`/`estimateConfidence` — the actual percentage-
  style figure — are now always `null`, even when an admission rate happens to be on file. This is
  the part of the result the shipped non-negotiables most directly prohibit (AGENTS.md #5, "never
  presented with false precision") for a system this formula doesn't model, and it's now fully
  suppressed. Verified: a credential-gate persona with a known admission rate gets no range at all.
- `notApplicableReason` is set to an explanation pointing at the design spec, so any caller can
  detect "don't display this as a normal outlook" programmatically.

**What this does NOT fix, and why, stated plainly rather than silently left:** `outlook` itself
(`extreme_reach`/`reach`/`competitive`/`strong`/`likely`) is still computed via the unchanged
profile-strength/selectivity formula even for `credential_gate` — checked, `outlook_label` is a
genuine Postgres enum (`supabase/migrations/0007_target_universities_and_applications.sql`) with no
"not applicable" member, and `lib/admissions/persist.ts` writes this value directly to that column.
Adding a 6th enum value needs a migration, which is out of this fix's bounds. Coopting one of the 5
existing labels to mean "not applicable" would be worse (a second, silent meaning for an existing
value). So the label is still produced — for type/DB-write compatibility only — and
`notApplicableReason` is the actual signal a caller must check before displaying it. **This is a
real, remaining gap**, not a claim of completeness: the recommended follow-up is a 6th
`outlook_label` value (or a UI/explanation-layer change that never surfaces `outlook` at all for
`notApplicableReason !== null` targets), and that decision needs the Org Leader/founder, not a
unilateral schema change here.

## Defect 2 — `lib/scoring/dimensions/academics.ts` — fixed the GPA gap, rigor gap explicitly not fixed (schema-blocked)

Added a fallback: when no `overall_gpa` is on file, a student's per-course `grade_value` presence
(not value — same "presence, not magnitude" discipline the code already uses for standardized
tests, since per-course grades are free text on incompatible scales with no validated conversion)
now contributes up to 25 points and a `course_grade_presence` reason code. Only engages when
`overall_gpa` is absent, so a student with both never double-counts. Verified live: the QA harness's
UK A-level persona went from `academics=15` (rigor only) to `academics=31`
(`course_grade_presence` + `course_rigor`) with this fix.

**Rigor gap (RIGOR_WEIGHT / CourseLevel enum) — investigated, not fixed, documented in code.**
`Course["level"]` is also a Postgres enum with no value for rigor within a curriculum outside AP/
IB/A-level/dual-enrollment — a Turkish student's advanced coursework has no legal value to score
above `regular`/`other` regardless of actual rigor. Fixing this needs a new `CourseLevel` enum
value — a migration, out of bounds. Flagged directly in the code (`academics.ts`, above
`RIGOR_WEIGHT`) so a future engineer sees it in context, not just in this report.

## Defect 3 — `lib/opportunities/matching.ts:126-130` — fixed

`field.includes(interest) || interest.includes(field)` (substring containment) replaced with exact
post-normalization equality. Reproduced-then-fixed: a "Computer Science" interest against a
`["chemistry", "science"]`-tagged opportunity went from `relevanceScore=100` (false positive, "computer
science" contains "science") to `0`. Also added a test for the same failure shape between two
different "X Science" interests/fields (`"Environmental Science"` vs. `"Political Science"`), and
confirmed exact matches after case/whitespace normalization still work (`"  Physics  "` vs.
`"PHYSICS"`).

## Defect 4 — investigated further, the original QA finding does not hold against the real production code; not fixed, because there was nothing to fix

The original report characterized "weakest 3 dimensions" tie-breaking as `DIMENSION_SCORERS`
array-order-dependent and not semantic. That claim was based on this session's own QA test
harness — a stand-in I wrote myself for the opportunity-matching test, not the real gap-selection
code, which wasn't in the QA pass's assigned file list. Reading the actual production logic
(`lib/counselor/gaps.ts`, `rankDimensionGaps`) for this task found it already handles this
correctly:

- `severityFor()` checks `confidence === "low"` **first** and returns `"insufficient_data"`
  regardless of rank — exactly the case this report worried about (many dimensions tied at 0 with
  low confidence, e.g. a sparse or genuinely-credential-gate-appropriate profile) is already
  excluded from being presented as a hard "critical" gap.
- The function's own doc comment explicitly states and owns the stable-sort tie-break
  ("ties keep their original input order... so identical input always produces identical output")
  as a deliberate determinism choice, not an oversight.

**Withdrawing this defect rather than leaving it as an open item or fixing something that isn't
broken.** No code change made for #4.

## Defect 5 — unweighted 9-dimension average — write-up only, per assignment, no code change

**The trade-off, not a recommendation:**

- **Option A — leave it unweighted.** Simple, transparent, no per-student judgment calls about
  which dimensions "should" count more. Cost: a genuinely strong, focused profile (the founder's
  own Phase 8.3/39 worked example, run as data: `academics=66, leadership=29,
  entrepreneurship=30, execution=35`) scores `overall=21` — far below what `AGENTS.md`'s own
  dashboard mockup ("Career Profile: 77") implies for a good student, purely because the same
  average also includes untouched dimensions at full weight.
- **Option B — weight by dimensions with real signal, ignore/down-weight zero-confidence ones.**
  Would make `overallScore` track "how strong is what this student has actually built" rather than
  "how strong is this student across all 9 areas at once" — arguably closer to the product's own
  stated philosophy (`AGENTS.md` §2: reward depth, not omnidirectional breadth). Cost: `overallScore`
  becomes a genuinely different, less directly comparable number than it is today (two students with
  identical raw dimension scores but different completeness would no longer necessarily have the
  same overall), and needs its own validated design, not an ad hoc formula tweak.
- **Option C — keep `overallScore` as-is, but stop treating it as the single headline number.**
  Show the top 2-3 dimension scores directly on the dashboard (already computed, already
  confidence-rated) alongside or instead of one blended average. Smallest change, but changes what
  the dashboard visually leads with.

No option was implemented. This needs a product decision, not a unilateral formula change.

## Files changed

- `lib/admissions/outlook.ts`, `lib/scoring/dimensions/academics.ts`, `lib/opportunities/matching.ts`
  — the 3 fixes.
- `__tests__/admissions/outlook.test.ts`, `__tests__/scoring/academics.test.ts`,
  `__tests__/opportunities/matching.test.ts` — regression tests, each fails against the pre-fix
  code and passes against the fixed code (verified by re-reading the diff against what each test
  actually exercises, not just running them once after the fix already existed).
- `scripts/qa-counselor-loop.ts` — carried over from the prior QA branch via the `main` merge;
  fixed 3 pre-existing lint errors (`no-explicit-any`) and 2 unused-var warnings found while
  running this task's own lint gate, and updated Persona C's fixture data to actually exercise the
  new `course_grade_presence` signal end-to-end (previously had course rigor but no grade values —
  the fix wasn't visible in the harness's own output until this update).
- This file.
