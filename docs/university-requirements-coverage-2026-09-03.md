# University requirements coverage — rows 8 and 9, measured

2026-09-03, oryn-6e. Research-queue rows 8 (`university_requirements` coverage + the `is_exclusion`
correction) and 9 (`program_id` exact-match pipeline coverage), assigned together by the integrator.
3f already confirmed sourcing is clean everywhere it exists — zero missing `source_url`/`retrieved_at`
across all eight spec'd countries — so this is purely a coverage and behavior question, not a
provenance one. **Measure first. Nothing to live** — no code changed, no SQL staged.

The `docs/handoffs/requirements-ingestion-design.md` doc (2026-08-21) is background on the mechanism,
not current data — it explicitly says "no migration was applied" at the time it was written, and git
history since (`1c4bc7c5`, `a6fc62df`, `66b485b0`, `2be9ec8f`) shows most of what it recommended has
since landed. Every number below is queried live today, 2026-09-03.

## Row 8 — `university_requirements` coverage

```
total_requirements              1,325
universities_with_requirement      111  of 1,010 active universities  (11.0%)
program_linked_requirements         88  of 1,325                       (6.6%)
distinct_programs_covered           32  of 17,046 programs            (0.19%)
has_evaluation_gate                257  of 1,325                      (19.4%)
has_structured_rule                  0  of 1,325                      (0.0%)
requirement_groups                   0  rows, by design (see below)
requirement_research_queue       3,142  rows (2,454 accepted / 219 not_ingestible /
                                        166 duplicate / 157 unresolved_university /
                                        90 malformed_source / 36 rejected / 20 superseded)
```

**Program-level linkage hasn't structurally improved, it's just scaled with volume.** The 2026-08-21
doc measured 51/830 = 6.1% of requirements resolving to a `program_id`; today it's 88/1,325 = 6.6% —
essentially the same rate, after the requirements table nearly doubled (830 → 1,325) and programmes
grew by 81% (9,423 → 17,046, mostly this week's new country-registry work). The linkage mechanism
hasn't gotten worse, but nothing has moved it forward either.

### The `is_exclusion` correction — measured before/after

The design doc's finding: `university_requirements.is_exclusion` existed (migration 0052) but
`AcceptedRequirementRow` never set it, so `decideRequirementIngestion` blocked every
`is_exclusion=true` record outright — Ankara's "programmes EXCLUDING the above-listed" heading (the
entire eligibility rule for Medicine/Dentistry/Computer Eng/AI/Software/Law/Veterinary/Pharmacy) was
being dropped, while the general SAT row it governs landed unqualified. Before the fix: **0** exclusion
rows could ever land.

Commit `a6fc62df fix(requirements): teach the row builder migration 0056's qualifier columns` closed
this. Measured today:

```
is_exclusion = true                       27  rows now live
  → evaluation_gate = eligibility_restriction   17
  → evaluation_gate = something more specific   10  (e.g. an exclusion whose text ALSO
                                                       matches an age-bar or recency pattern —
                                                       SHAPE_TO_GATE's ordering means the more
                                                       specific shape wins, which is correct:
                                                       shape-audit.ts orders these deliberately)
  → evaluation_gate = null (ungated)             0   ← the dangerous outcome, confirmed absent
```

**27 came back, all 27 correctly gated, zero landed ungated.** `evaluateRequirement()` in
`lib/requirements/evaluate.ts` reads `is_exclusion` before touching category or rule — a rule authored
later onto an exclusion row cannot override the gate, and the code comment names exactly why: "a
student excluded by a carve-out is told they qualify" is the failure this exists to prevent. Verified
this is live, not just present in code: all 27 rows checked above.

### `requirement_groups` — still zero, and not a matter of time

The design doc predicted the unique-index fix (§5) would unblock `requirement_groups`, since the index
was the thing preventing Edinburgh's four alternative English-proficiency routes from ever landing
together. The index fix has landed (rejected-row count held flat at 36 despite the queue nearly
tripling — the exact signature of the collision no longer firing on new inserts). **`requirement_groups`
is still 0 rows regardless**, and the reason isn't a lagging pipeline — it's a deliberate decision in
the code, stated in `lib/requirements/ingest.ts`'s own comment at the row-builder:

> "Grouping is deliberately NOT inferred here. `requirement_groups` models 'any one of N' ... "
> `requirement_group_id: null, group_role: null`

Every accepted row, unconditionally, gets `requirement_group_id = null`. Grouping was scoped out of
automatic ingestion on purpose — correctly, since inferring which rows are alternatives to each other
from prose is exactly the kind of judgment call this codebase elsewhere refuses to automate. But the
practical consequence is that `evaluateRequirementGroup()` — built, unit-tested, with Edinburgh named
as its own motivating test case, and the one function specifically designed to stop "a student with a
valid IELTS score being told they failed the TOEFL requirement" — **has never once run against real
data**, and has no path to unless a separate, distinct group-authoring step gets built. This is a second
instance of the exact shape row 9 asks about for the program-matching pipeline: a correct, tested
mechanism sitting at zero coverage because nothing upstream of it was ever built to feed it.

## Row 9 — the `program_id` exact-match pipeline

The pipeline itself is real and correctly built, not merely started. Tracing it end to end:

1. `university_requirements.program_id` — the column.
2. `app/(app)/universities/actions.ts`'s `addTargetUniversity(rawUniversityId, programId = null)` —
   accepts a specific program at save time.
3. `app/(app)/universities/[id]/page.tsx` — at read time, groups requirements into
   `universityWideRequirements` (`program_id IS NULL`, always shown) and `requirementsByProgram` (a
   `Map` keyed by exact `program_id`), and passes `targetRes.data?.program_id` into
   `refreshRequirementEvaluations` so only the student's own target program's rows get evaluated
   against their facts.
4. `features/universities/requirement-group.tsx` renders each program's matched group under its own
   heading.

Every layer of this is exact-match only, deliberately: `lib/requirements/program-linkage.ts` (the
separate, measurement-only classifier that estimates how many corpus records *could* resolve to a
programme) documents three past name-matching misses that motivated this — `ILIKE '%ITU%'` matching
Georgia Tech for İTÜ, a ranked search returning Uşak University first for "Anadolu" — so nothing here
falls back to fuzzy matching. That discipline is correct and this task doesn't second-guess it.

**Measured coverage: zero, in practice, on both sides of the join.**

```
target_universities (live rows)              20
  → with program_id set                        0
  → distinct universities targeted             12
    → of which have ANY requirement row        10
    → of which have a program-linked row        0   (would be irrelevant anyway — no
                                                       target row could ever match one)
```

**Root cause, fully traced, not just observed:** grepped every call site of `addTargetUniversity` in
the codebase. There are exactly two — `features/universities/save-university-button.tsx:59` and
`features/universities/university-card.tsx:182` — and both call it as `addTargetUniversity(university.id)`,
with no second argument. `programId` defaults to `null` at the function signature and nothing anywhere
overrides it. There is also no edit-after-save path: `updateTargetUniversityStatus` only takes a
status. **No UI surface anywhere in the product today lets a student pick a specific program when
saving or later editing a target university.** This is not a data-entry gap that will close as more
students sign up — it is a missing UI control. The schema column, the save-action parameter, the
query-time exact match, and the per-program rendering component were all built assuming this input
would eventually exist; nothing yet produces it.

So "the pipeline was built, coverage wasn't measured" resolves to: **the pipeline is correct and the
coverage is exactly zero**, for a specific, single, findable reason — not degraded, not partial, not
growing over time on its own.

## The part that matters to a student — absence rendering as a confident answer

Traced to one line: `app/(app)/universities/[id]/page.tsx:630` —

```tsx
{requirements.length > 0 ? (
  <section className="space-y-4">
    <SectionHeader title={t("requirementCheckTitle")} description={t("requirementCheckDescription")} />
    ...
  </section>
) : null}
```

When a university has zero requirement rows — **899 of 1,010 active universities, 89.0%**, confirmed
after applying the same `verification_state` filter the page itself applies (excluding
`verified_historical`/`conflicting`; the count is unchanged by that filter, 111 either way) — the
entire "Requirement check" section renders `null`. Not a placeholder, not an "Unknown," not "Oryn
hasn't researched this university yet." The section is simply absent, indistinguishable from having
scrolled past where it would be.

This is the fourth instance this fleet found tonight of the same shape, and it's worth being precise
about which variant it is: not a wrong badge (structured_rule is 0 everywhere, so no verdict is ever
fabricated), but a **silent omission that reads as confident by contrast**. The tell is right there in
the same file: the admission-outlook section, a few dozen lines below this one, was clearly built with
Phase 68's "Oryn should know when it does not know enough" in mind — it computes
`showMechanismUnknowns`, carries a `notApplicableReason`, and lists per-dimension unknowns explicitly
rather than hiding the section when data is thin. The Requirement Check section, in the same file, for
the identical underlying situation — "we don't have this data" — has no equivalent. One feature in
this file tells a student what it doesn't know; its sibling, three sections down, just isn't there.

**This isn't page-specific.** `app/(app)/applications/[id]/page.tsx` reuses the identical
`RequirementGroup` component (confirmed via its own code comment: "so
`app/(app)/applications/[id]/page.tsx` can render the same Phase 69 requirement check... without a
second component that could drift from this one's rendering rules") and gates it the same way. Whatever
fixes this needs to fix it once, at the shared surface, not twice.

## What's already honest, and stays true

`structured_rule` is 0 of 1,325, unchanged from the design doc's finding three weeks ago despite the
table nearly doubling. **No student can be shown a wrong `met` or `not_met` through the evaluator
today** — every evaluable row currently falls through to `needs_manual_review` or `unknown`, by
construction, because nothing has ever authored a `structured_rule` onto a live row. The 27 newly-landed
exclusion rows land correctly gated, not ungated. The evaluator's own qualifier logic (recency
direction, scale families, provenance refusal) is real, tested, and biased in exactly one direction —
toward caution — everywhere it has data to run on. The gap this task found is coverage and a rendering
omission, not a fabricated verdict anywhere in the chain today.

## Not done here, named rather than skipped

- **No fix implemented for the silent section omission** — this was a measurement task. The concrete
  shape of a fix (an explicit "not yet available" state, matching the outlook section's own pattern)
  is visible from the trace above but not designed or built here.
- **No UI designed for program selection at target-save time** — same reasoning; row 9's root cause is
  now fully traced, but building the control is a separate, larger task with its own product decisions
  (where in the save flow, whether it's required or optional, what happens to existing null rows).
- **`requirement_groups`' authoring gap was not designed** — flagged as a sibling finding to row 9, not
  in either row's literal scope tonight.
- **The 3,142-row queue's current shape breakdown (accepted/rejected/etc.) was measured but not
  audited row-by-row** — that's a much larger task than this one; the totals above are as far as this
  pass went.

## Gates

Measurement only — no source, schema, or test file touched in this worktree. `git status` confirms
this doc is the only change. Every number above was queried live against project `qtcvcflzxbuagvvwahhu`
today, 2026-09-03; the query for each headline figure is inline above rather than only in a separate
appendix, per the standing "give the query you actually ran" rule.
