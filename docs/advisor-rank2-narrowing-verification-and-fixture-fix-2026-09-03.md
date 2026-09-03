# bb28f2ff verified, plus the fixture bug it surfaced — fixed, and audited for reach

**Date:** 2026-09-03. **Author lane:** this session. Two things in one pass: independent
verification of 05's narrowing-instruction fix (`bb28f2ff`), and the follow-up CEO settled
before I ran a single call — a real fixture defect the narrowing pass's own honest
out-of-score flag led to. Fixing it and auditing its reach was handed to this session; this
doc covers both.

## Part 1 — `bb28f2ff` independently verified, clears the merge bar

Fresh worktree at the exact commit. Gate: typecheck/lint clean, 83/83 in the touched test
file, matching 05's own numbers exactly.

**5 fresh reads, this session, same fixture and question as every prior round, scored against
05's own pre-registered criterion — not a re-derived one.** Result: **0 of 5 made an ordinal
claim**, matching 05's own 0/5 exactly. Every read that discusses rank names only Awards &
Distinction as "your weakest" (the single tagged dimension, allowed); every read that mentions
a second lower-scoring dimension (Career Exploration, Entrepreneurship) does so without
ranking it against anything else — "also weak," "a good area to strengthen," grouped as "two
weaker areas" with no relative order claimed. None of the five used "second-weakest," "next
weakest," or equivalent language for any dimension but the tagged one. Rank 1 correct in
every read that names it. No hedging, no stilted phrasing, no refusal to discuss a
lower-scoring dimension when the reply's own reasoning called for it — the criterion's second
fail condition (quality degradation) also doesn't trigger.

**Verdict: confirmed, criterion held without softening.** Two independent sessions now at 0/5
on the exact same fixture. This clears for merge on the parts that were mine to verify.

## Part 2 — the fixture bug CEO traced to source before I ran anything

05's own doc flagged, correctly out-of-score: one read called Research "currently
unassessed" when `BASELINE_CONTEXT` has it at `62`/`developing`. CEO settled the "pre-existing
or new" question from the source rather than asking for a live re-test: `lib/ai/eval/
fixtures.ts`'s shared `rec()` helper hardcodes `why: ["Addresses Research, currently
unassessed — the profile's least-evidenced dimension."]`. True for `REGRESSION_CONTEXT`
(research really is `0`/`not_assessed` there). **False for `BASELINE_CONTEXT`**, which only
overrides `id`/`title` when calling `rec()` for its one recommendation — every other field,
including this one, came from the regression-shaped default. Verified directly (not just the
quoted line number): `grep` confirms the exact text at both fixture definitions and the
default. **The model wasn't inventing anything — `why[0]` is rendered directly into the
prompt** (`opportunity-context.ts` and `weekly-plan.ts` both do `if (recommendation.why[0])
parts.push(...)`) — it was accurately repeating a false sentence that was already there. Same
mechanism 05 already named for the "exam period" line earlier tonight: the prompt's own words,
echoed back.

**Fixed, and checked for siblings, not just the one confirmed field.** `matchedGapDimensions:
["research"]` has the identical defect for the identical reason — research is one of
`BASELINE_CONTEXT`'s *strongest* assessed dimensions (62, ahead of five others), not a gap —
but a direct grep of `lib/` confirms no caller in this package's rendering path reads it; it
never reached any prompt. Fixed anyway (`[]`, matching how `REGRESSION`'s own `avoid_for_now`
rec already uses `[]` when nothing real matches), since a confirmed drift left in place is a
live bug waiting for whoever adds the caller later. Checked the rest of `rec()`'s fields
against both fixtures' actual data: `deadline`, `costOnFile`, `applicationRequirements`,
`eligibility` are all consistent with what every live read this whole chain has already cited
correctly (Oct 1 deadline, cost genuinely unconfirmed). `evidence[].sourceId: "fixture-1"` and
`nextAction.href: "/opportunities/fixture-1"` still don't match baseline's overridden
`id: "opportunity:fixture-2"` — a real, minor internal inconsistency, but confirmed
not-model-visible (not read by any formatting function in `lib/`) and not touching any test
assertion — left as a known, harmless cosmetic mismatch rather than expanding this fix further
into fields nothing has ever measured.

**Verified the fix directly, no model call needed first**: printed the rendered opportunity
line for both fixtures. `baseline` now reads *"Builds on the OECD youth-unemployment research
already in progress, adding independent, verifiable recognition beyond the current
self-reported evidence"* — accurate to `BASELINE_CONTEXT`'s real data (an ongoing,
self-reported OECD project). `regression` is unchanged, still correctly says "currently
unassessed" — still true there. Full gate re-run after the fix: typecheck/lint clean, 388
files / 5,908 tests green (5,906 + 2 expected-fail, matching CEO's own reported merge count).
No existing test referenced the old text — `grep` across `__tests__/` for the exact string and
for `BASELINE_COUNSELOR_RESULT` found nothing, so nothing needed updating alongside the fix.

## Part 3 — does this call any earlier finding into question? Checked, not asserted.

**The ranking-error finding and both tagging passes: no.** That work is entirely about
`context.profileScores` — the array of real dimension scores, always internally correct and
untouched by this bug. `rec().why` is a separate piece of context (a recommendation's
rationale text) that never reaches `student-context.ts`'s ranking/tagging logic at all. Career
Exploration being named over Entrepreneurship, rank-1's reliability, rank-2's partial fix,
the narrowing instruction's clean result — all stand exactly as reported.

**Checked my own prior work specifically, not just this session's headline findings.** One of
this session's own 5 reads from the rank-2 corroboration pass (before this doc) said *"Research,
which is your least-evidenced dimension"* — a near-verbatim echo of `rec()`'s own hardcoded
text. At the time, that observation was noted only in this session's own working analysis and
never made it into the published addendum or the report to 05/CEO — checked directly, by grep,
against both before writing this: neither the doc nor the message contains it. So there is
nothing to retract; the record as published was never wrong on this point. Worth naming
anyway, for the same reason CEO asked the question in the first place: had that observation
been published as "a real inaccuracy" without tracing its source, it would have needed the
exact correction 05 had already modeled for "exam period" that same night — recognizing an
echoed contradiction already in the context, not a new model reasoning error. Good to catch
before it became a real correction to make, not after.

**Nothing else in this chain touches `rec()` or `why`.** The two softer findings from the
original `docs/advisor-chat-stability-eval-2026-09-03.md` (invented "exam period" reason,
marketplace user-numbers already on file) are unrelated code paths (`busy_mode` rendering,
`context.projects[].outcomeSummary` never read) — confirmed already, unaffected by this fix.

**Wider than this session's own work**: `weekly-plan.ts` shares the same `recommendation.why[0]`
render, so any `weekly_plan`-target case built on `BASELINE_COUNSELOR_RESULT` before this fix
carried the same contradiction — this session hasn't run weekly_plan cases, but whoever has
should know the fixture was wrong there too, now fixed for both targets by the same change.

## What this pass does not do

No further changes to `lib/ai/student-context.ts` — that function is done for tonight per
CEO's explicit stop. No broader fixture audit beyond `rec()`'s own fields against the two
fixtures that use it. No re-run of anything beyond what changed.

## Spend

5 more real `claude-sonnet-5` calls (bb28f2ff verification), direct provider calls, not
`ai_usage`-logged, same declared pattern as every comparison call tonight. Roughly $0.10-0.15.
Zero real student data throughout.
