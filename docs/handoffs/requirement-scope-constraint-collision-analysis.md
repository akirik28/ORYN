# The 36 collisions — what they actually are

Every one of the 36 requirement records that hit `university_requirements_university_type_scope_idx`
(`(university_id, requirement_type, COALESCE(scope,'')) WHERE program_id IS NULL`) was pulled
back out — from `requirement_research_queue`'s now-complete audit trail, not re-derived — and
read individually. **They are not one problem.** Four distinct root causes, evidenced below,
none of which share a single fix the way the Bologna campus case did this morning.

## A. Per-program facts, forced to share one university-wide slot (majority of the 36)

Every row this ingestion writes has `program_id: null` — the pipeline never resolves a research
record's `program_name` text to an actual `university_programs` row. So a university's genuinely
different, genuinely correct per-program requirements all compete for the same
`(university_id, requirement_type, scope)` slot.

**University of Glasgow — all 8 of its collisions, confirmed by `program_name_input`:**

| Type | Programme | Text |
|---|---|---|
| minimum_grade | Computing Science | AAA – AAB |
| minimum_grade | Computing Science | 38 (6,6,6) |
| minimum_grade | Economics | 36 (6,6,5) |
| minimum_grade | Economics | AAABB |
| minimum_grade | Economics | AAB – BBB |
| required_subject | Computing Science | HL6 Mathematics (Analysis & Approaches) |
| required_subject | Economics | HL English or Humanities and HL Mathematics |
| required_subject | Economics | A-level English or Humanities subject and A-level Mathematics |

**LSE — 4 of its 5**, `program_name_input` = `BSc Economics` (39pts/38pts/GCSE) and
`LLB Bachelor of Laws` (LNAT) respectively; the 5th (`"37–39 points overall"`) has
`program_name: null` — a university-wide statement genuinely competing with per-programme ones
for the identical slot.

**Imperial College London's single collision** ("41 points") is presumably the same shape,
not independently confirmed here.

The schema already anticipates this: `university_requirements_program_type_idx`
`(program_id, requirement_type) WHERE program_id IS NOT NULL` exists specifically for the
per-programme case. It's unusable today because nothing resolves `program_id` — a real, separate
body of work (matching `program_name` text against `university_programs`, itself only 99 of 1019
universities deep as of this morning), not something to bolt onto this ingestion pass.

## B. Genuine alternatives for one requirement, not competing facts

**University of Edinburgh's `english_proficiency`/null-scope, all 4 collisions**: TOEFL
(post-cutover, `scale_ambiguity: resolved_unambiguous`), IELTS, Cambridge CAE/CPE, and the
two-year recency rule. These aren't different facts fighting over one slot — they're four
different **accepted ways to satisfy the same requirement** ("any one of these test results is
fine"). The data model has no way to express "one of N" at all; each alternative can only exist
as its own row, and they collide because nothing distinguishes them beyond type+scope.

## C. Sub-clauses of one compound eligibility rule

**Sabancı University's `international_requirement`/international_undergraduate, all 7
collisions**: seven distinct citizenship/schooling scenarios (Turkish-by-birth-with-dual-
citizenship, TRNC residents, students who didn't attend a Turkish high school, embassy-school
graduates, renounced-citizenship cases, …). These aren't alternatives (a student meets exactly
one) and aren't per-programme (nothing programme-specific about any of them) — they're clauses
of a single "who counts as international here" definition that the research process captured as
seven separate records. Arguably closer to one compound rule than seven independent facts.

## D. Unrelated caveats that happen to share a category

**Koç University (5)**: a superscore-exclusion note, a 2-year test-validity recency rule, a
"minimum scores are a guide only" disclaimer, a predicted-scores-acceptable note, a
transcripts-required note. **Bilkent (2)** and **Boğaziçi (2)**: similarly a grade-band note
alongside an unrelated evidentiary caveat. These have nothing in common except
`requirement_type` — no shared programme, no shared alternative-satisfies-the-same-thing
relationship, no shared sub-clause structure. This is the cleanest evidence that
`requirement_type` (even combined with `scope`) is just too coarse a grouping for "how many
distinct admissions facts can exist" — nothing bounds how many unrelated one-off notes a real
admissions page can carry under one category.

## What this suggests about a fix, without picking one

Deliberately not proposing a single change, because the four causes above don't share one:

- **(A) has a real, already-designed answer** (`university_requirements_program_type_idx`) —
  gated on resolving `program_id`, out of scope for this pass.
- **(B) and (C) are not indexing problems at all.** No key shape distinguishes "four
  alternatives" or "seven sub-clauses" from "four/seven competing facts" — that's a data-model
  question (does `university_requirements` need an alternatives-group concept? a compound-rule
  concept?), not a constraint-tuning one.
- **(D) is the strongest case for simply widening or dropping the constraint** for
  program_id-null rows — but the constraint's own stated purpose (migration 0042: stop a
  re-run from duplicating every row) is already served, arguably better, by the application-level
  fuzzy title-similarity dedup this ingestion already does. The DB constraint may be catching
  less than it costs.

Every one of the 36 is fully audited now (`requirement_research_queue`, `outcome: rejected`,
`batch_id: requirements-deadlines_2026-08-21`) — nothing here is blocking anything further, this
is evidence for a decision, not a request to make one.
