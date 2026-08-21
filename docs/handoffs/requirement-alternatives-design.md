# Requirement alternatives, exclusions, and clause-level traceability — design

Branch `oryn/requirement-alternatives`. Migration `0052` is written and committed, **not
applied** — schema only, per instruction. Full gate clean: lint 0, typecheck 0, test
1202/1202 (floor 1192, +10 new), build succeeds.

## The defect this starts from

`lib/requirements/evaluate.ts`'s `evaluateRequirement()` and every one of its callers
(`lib/requirements/persist.ts`, `lib/counselor/state.ts`) treat every `university_requirements`
row as independently mandatory. Edinburgh's four English-proficiency test routes
(IELTS/TOEFL/PTE/Duolingo) are ingested today as four separate rows with no relationship
between them, so a student with a valid IELTS score is told they failed the TOEFL requirement
— a confident wrong answer, worse than an honest unknown, because the student acts on it.

Reading the actual research JSONL (`requirements_batch6_sabanci_2026-08-21.jsonl`,
`requirements_batch7_turkey-yok_2026-08-21.jsonl`,
`requirements_batch8_yok-authority_2026-08-21.jsonl`,
`requirements_batch9_yok-esaslar_2026-08-21.jsonl` — 39 records read in full, not sampled)
before designing against it surfaced a second, real, previously-unknown gap in the same
family: `is_exclusion` is present and reliable on the YÖK-esaslar batch but **entirely absent**
(free-text only) on the Sabancı batch. Three genuine exclusion records
(`REQ-2026-08-21-5008/5009/5010`) were only distinguishable from ordinary positive requirements
by prose in `limitations` ("This is an EXCLUSION. Storing it alongside positive requirements
without an is_exclusion marker would invert its meaning" — the researcher's own words). They
were kept out of `university_requirements` during the 2026-08-21 apply run only because they
happened to also collide with the too-coarse scope constraint (a coincidence, not a safeguard)
— see `requirement-scope-constraint-collision-analysis.md`. This is why the brief asked for
`is_exclusion` to be folded into this same design rather than treated as a separate, smaller
problem.

## Schema (migration `0052`)

**`requirement_groups`** — a set of `university_requirements` rows evaluated together. Carries
no `university_id`/`program_id`/`scope` of its own: every member row already states those, and
duplicating them would be a second source of truth with no DB-level way to keep it in sync.
Starts empty; nothing is backfilled into it by inference.

**`university_requirements` additions:**

| Column | Meaning |
|---|---|
| `requirement_group_id` | Which group (if any) this row belongs to. `on delete set null` — deleting a group never destroys the underlying requirement facts. |
| `group_role` | `inclusion` \| `exclusion` \| `qualifier`. Null iff `requirement_group_id` is null (enforced by a CHECK). |
| `is_exclusion` | Standalone negative/carve-out flag, independent of grouping. |
| `clause_ref` | Source document's own clause numbering (e.g. `"B-a-1"`), stored verbatim. Never parsed. |

`group_role` values, each grounded in the evidence actually read:

- **`inclusion`** — one alternative in an any-of-N set. Edinburgh's four English tests (the
  brief's own motivating example) and the YÖK-esaslar batch's `B-a-1..B-a-N`
  "internationally-classified-applicant" categories, where matching *any one* category
  qualifies.
- **`exclusion`** — a carve-out that overrides the group's verdict regardless of which
  inclusion was met. The same batch's `B-b-1..B-b-N` list. The researcher's note on this data
  is explicit and load-bearing: *"the exclusion list is NOT the negation of the inclusion
  list — several categories appear in both with different qualifiers, so a flat boolean will
  get at least one wrong."* Stored as its own independently-evaluated fact for exactly that
  reason — neither this schema nor `evaluate.ts` ever derives an exclusion from the inclusion
  set, or the reverse.
- **`qualifier`** — a condition on the group as a whole (e.g. a recency window on whichever
  test was used), not one specific alternative. Named directly in the task brief as a shape
  the design must survive; unlike `inclusion`/`exclusion` it isn't drawn from one specific
  quoted source record in the batches read for this pass. Kept distinct from `inclusion` so a
  qualifier can never be miscounted as a fifth alternative that alone satisfies the group.

Why `is_exclusion` is a **separate column** from `group_role = 'exclusion'`, rather than the
same thing folded into one: `group_role` is only meaningful for a *grouped* row. Real exclusion
facts are not always grouped — the three Sabancı records above are standalone exclusion rows
with no accompanying alternative-set. `is_exclusion` covers that case; a CHECK constraint
(`university_requirements_exclusion_role_implies_flag`) keeps the two mechanisms from
disagreeing, so `evaluate.ts` has exactly one flag to test regardless of whether the exclusion
is grouped or standalone.

Also folded in: `requirement_research_queue.outcome`'s CHECK constraint gap found during the
2026-08-21 incident backfill (the live constraint was missing `'superseded'`, even though
migration `0051`'s own file already listed it) — see that migration's report, item 6. Migration
`0052` brings the live constraint in line with what `0051` always intended.

## `evaluate.ts`: `evaluateRequirementGroup()`

Every member is still evaluated individually through the existing, unchanged
`evaluateRequirement()` — no comparison logic is duplicated. The new function only adds a
combination step on top, and it combines conservatively:

- **`exclusion` present in the group → always `needs_manual_review`**, regardless of how any
  inclusion evaluates. An exclusion might apply to a student who otherwise looks like they
  qualify — that is the entire point of an exclusion — and there is no safe way for this
  evaluator to determine whether it does. Never a confident `met`, never a confident `not_met`.
- **`qualifier` present in the group → always `needs_manual_review`**, for a more mundane
  reason: `RequirementFacts` has no field a recency-style qualifier could even be checked
  against today (no date on a stored test score). Pretending to evaluate one would silently
  ignore its actual content rather than honestly deferring to a human.
- **Otherwise (pure `inclusion` set)** — each alternative's own result is ranked
  `met > likely_met > needs_manual_review > unknown > not_met`, and the group takes the
  best-ranked outcome. `not_met` therefore requires *every* alternative to be confidently
  `not_met`; a single `met` anywhere makes the whole group `met` — this is the specific fix for
  the IELTS/TOEFL defect. `needs_manual_review` outranks `unknown` deliberately: an unresolved
  alternative could still turn out to be the one that's met, so it must not be silently
  outweighed by a merely-missing one.

The function returns both the combined verdict and a `Map` of every member's own individually-
computed result, including exclusion/qualifier members — useful for a future detail view that
wants to show which specific alternative was met, without hard-coding that shape into this
change.

10 new tests in `__tests__/requirements/evaluate.test.ts`, including the literal defect-B
scenario (IELTS met, TOEFL/PTE/Duolingo individually unknown → group met), the not_met-requires-
unanimity case, and both exclusion/qualifier override cases.

## What this design deliberately does NOT represent

Stated plainly, per instruction — these are not oversights, they're the boundary of what's
safe to automate today:

1. **Cross-clause dependencies are not modeled as a queryable relationship.** The evidence
   contains real ones: `B-b-3`'s exclusion is explicitly "cancelled by an inclusion clause
   elsewhere in the same rule... requires B-a-4 to be evaluated first"; `A-2-c-ii`'s scope
   depends on the antecedent of "bu adaylar" (these candidates) in a preceding clause; a single
   Danıştay judicial carve-out appears written into *both* an inclusion clause and, separately,
   an exclusion clause. `clause_ref` preserves each clause's own label verbatim so a human
   reviewer can find and cross-reference these by hand, but nothing in this schema links
   `B-b-3` to `B-a-4`, resolves the anaphora, or recognizes the Danıştay carve-out as "the same
   provision" in two places. A structured dependency graph was considered and rejected for this
   pass — the evidence shows dependencies that are self-contained (depth-2 nesting within one
   clause), cross-referenced (two different clauses), and anaphoric (referring to prose, not a
   clause ID) in the same small sample; modeling one shape and leaving the others as free text
   would be worse than modeling none, because it would look complete when it isn't.
2. **The national-vs-institutional rule-set structure is not modeled.** The evidence shows
   Turkish universities split into "restate-in-full" (Sabancı) and "reference-only" (METU)
   patterns over *one shared national YÖK rule set*, itself annotated as cycle-versioned
   (annual editions) in the source. `university_requirements.university_id` is `not null`
   (migration `0006`), so a national-level fact has no single university to attach to under the
   current schema — the honest options are duplicating the same rule per institution (which the
   source researcher's own notes reject: "SIX DIFFERENT PARTIAL COPIES") or a genuinely new
   entity (something like a nullable-university "rule set" table institutions reference). Either
   is a real schema change with its own migration and its own review, not a corner of this one.
   Left as a named, explicit gap.
3. **Qualifiers are never auto-evaluated**, not because the concept is hard to represent but
   because the fact model underneath it doesn't exist yet — no date is stored against a test
   score, so a recency qualifier has nothing to compare against. Extending
   `RequirementFacts`/`assembleRequirementFacts` to carry test dates is future work, not
   attempted here.
4. **Exclusions are never auto-resolved**, on principle, not just for lack of a fact field —
   see `evaluateRequirementGroup`'s design above. Even a schema that could represent an
   exclusion's full logic would not be evaluated automatically by this change; it always
   surfaces for manual review.
5. **`clause_ref` is stored, never parsed.** No component extraction ("B", "a", "1"), no
   automatic parent/child clause hierarchy. A future admin UI can still group by shared prefix
   for *display* if that turns out to be useful, but nothing here relies on the string's
   internal structure meaning anything.
6. **Program-id resolution is untouched** — a separately-scoped problem (Case A), not folded in
   here.
7. **No existing row is touched.** `requirement_groups` starts empty and no ingestion code in
   this change writes `requirement_group_id`/`group_role`/`is_exclusion`/`clause_ref` for any
   row — schema first, nothing backfilled into the new structure by inference, per instruction.

## Known follow-up: callers are not yet group-aware

`lib/requirements/persist.ts` (`refreshRequirementEvaluations`) and `lib/counselor/state.ts`
(`getRequirementCandidateInputs`) both still call the plain, per-row `evaluateRequirement()` in
a flat `.map()` over every requirement row — neither has been wired to call
`evaluateRequirementGroup()` for grouped rows. This is safe to defer, not an oversight left
unstated: zero rows have a non-null `requirement_group_id` today (nothing populates one), so
both callers' current behavior is unchanged and correct for every row that exists. Wiring them
up is real, separate work — `persist.ts` currently upserts one `student_requirement_evaluations`
row per `requirement_id`; deciding how a *group's* combined verdict should be
persisted/displayed per member (same status copied to every member? a group-level record
instead?) is a product/UI decision this change deliberately doesn't make unilaterally, the same
posture taken toward program-id resolution and the national-rule-set question above. Flagging
this explicitly rather than silently wiring a live path with an unreviewed shape.

`lib/universities/counseling-adapter.ts`'s own use of `evaluateRequirement` was checked and
does **not** need this follow-up — it only calls it as a narrow fallback for informational/
manual-review categories using a placeholder facts object, never for a row with a real
`structured_rule`; its primary path reads already-computed evaluations passed in from outside,
so it's a pure downstream consumer of whatever `persist.ts`/`state.ts` eventually decide.

## Files

- `supabase/migrations/0052_requirement_alternatives_and_exclusions.sql` — new, **not applied**.
- `types/database.ts` — `RequirementGroupRole` type; new `RequirementGroup`/
  `RequirementGroupInsert`; `UniversityRequirement`/`UniversityRequirementInsert` extended with
  the four new columns, plus `scope`/`verification_state`/`verified_at` (migration `0042`
  columns that were live but missing from this hand-maintained file before this pass — fixed
  while touching this same interface rather than left stale next to the new fields).
  `requirement_groups` registered in the `Database` table map.
- `lib/requirements/types.ts` — `RequirementGroupMember`, `RequirementGroupEvaluationResult`.
- `lib/requirements/evaluate.ts` — `evaluateRequirementGroup()`.
- `__tests__/requirements/evaluate.test.ts` — 10 new tests.
- `__tests__/counselor/candidates.test.ts`, `__tests__/counselor/evidence.test.ts` — local
  `UniversityRequirement` test fixtures updated with the new columns (pre-existing fixtures,
  not otherwise related to this change — needed to keep compiling against the extended type).
- This file.
