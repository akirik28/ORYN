# What `lib/ai/eval/` can and cannot see

**Date:** 2026-09-03. **Author lane:** this session, after five separate measurement passes
through this harness in one night — the retention-summary chain (which built its own, separate
throwaway scripts reusing similar techniques) and then the advisor-chat ranking chain
(`docs/advisor-chat-stability-eval-2026-09-03.md` through the fixture fix), all of which used
this package's real, exported pieces directly rather than a second implementation. CEO's own
framing for why this is worth writing down: the ranking error survived a green gate because the
harness's judge explicitly excludes fact-checking — not a missing check, a check whose scope
excludes the thing. Nobody should have to rediscover that boundary live, the way this session
did.

This is a map of the terrain, not a proposal to change it. Nothing here is a build request.

## What actually gets tested — and what's real about it

`buildAdvisorChatPrompt`/`buildWeeklyPlanPrompt`/`buildCounselorExplainPrompt`
(`harness.ts`) assemble prompts from the same exported, pure formatting functions production
calls — `formatContextForPrompt`, `formatOpportunityContext`, `formatCounselorGrounding`,
`buildWeeklyPlanInstruction`. For `weekly_plan` and `counselor_explain`, this means there is
nothing left to drift: the harness calls the real assembly code, and (for `weekly_plan`) the
real post-processing (`resolvePlanSelfContradiction`, `enforceTimeBudget`) before scoring,
not raw model output nobody would ever actually see.

**`advisor_chat` is the one exception, and it's self-documented, not hidden.** `harness.ts`'s
own header says `buildAdvisorChatPrompt` is a *faithful reconstruction* of what
`generateAdvisorReply` currently does — built from the same exported pieces, but not a call
into that function itself, since it needs a live database. The same comment names the
consequence plainly: if `generateAdvisorReply`'s real prompt assembly changes and this
reconstruction isn't updated to match, the harness "keeps grading a request that no student
ever actually receives, and would report a clean pass on production code it is no longer
actually exercising." No tripwire catches that drift today. Every finding in this session's
whole ranking-error chain came through this exact reconstruction — worth knowing, not worth
distrusting; nothing found tonight suggests it has actually drifted, only that nothing would
say so if it had.

**Two independent layers grade a reply**, and they check different things:

- **Deterministic checks** (`deterministic-checks.ts`): `findRawIdentifierLeaks` (a snake_case
  enum value like `career_exploration` escaping into prose the student would read raw) and
  `findUnassessedDimensionScored` (a number quoted next to a dimension that should say "not
  enough evidence" instead). Both are real regex/string-matching against the model's actual
  output — no judgment call, no second model call, no cost. Both were built to catch two
  *specific, previously observed* live defects (`student-context.ts`'s own comments name them:
  "Academics is 0/100" for real, and a raw `extreme_reach` reaching a student). They catch
  exactly those failure shapes and nothing structurally similar-but-different — a check built
  for one observed defect does not generalize to a new one shaped differently.
- **The LLM judge** (`judge.ts`): six tone criteria (specific, concise, analytical, calm,
  evidence-aware, action-oriented) plus a discourage verdict, each scored independently.
  **Its own system prompt states the boundary explicitly**: *"You are grading the reply's
  voice and judgment, not fact-checking it — assume the facts it states about the student are
  accurate; that is not your job here."* This is not an oversight to close, it's a scope
  decision, and it's the right one for what the judge is for — but it means nothing in this
  pipeline, on any single run, checks whether "your two weakest dimensions are X and Y" is
  actually true. The ranking error would have scored well on all six tone criteria, every
  time, because it was specific, calm, and analytical about the wrong dimension.

**The gated CLI** (`scripts/run-ai-eval.ts`, `npm run eval:ai`) is the only thing in this
package allowed to spend model credit — a dry-run cost projection by default,
`--live --confirm-spend` required together for a real run, `--judge` opt-in separately from
the target call. `ALL_CASES` (`cases.ts`) is the full cross-product this CLI runs: **2
fixtures × 3 targets × 2 locales = 12 cases, one read each.**

## What it cannot see — each grounded in what actually happened tonight, not speculation

**1. Whether a claim about the student's own data is true.** Already covered above — this is
the confirmed, headline gap. The judge grades *how* something is said, never *whether the
specific fact is right*. Nothing else in the pipeline checks this either.

**2. Anything that only shows up under repetition.** The standard CLI run is **one read per
case.** Every stability finding this session produced — the original 3/3 ranking error, the
30-call summary-chain sweep, all three ranking-fix verification passes — required a bespoke
script running the same case multiple times, built by hand each time from the harness's
exported pure pieces, never through `ALL_CASES`/`runEval` itself. A defect present at, say,
4-in-5 would show up in roughly 1 of every 5 standard single-read runs — indistinguishable
from noise until someone happens to re-run it, or has a specific reason to suspect a pattern.
This session's own first eval pass on a completely different fixture (the retention-summary
disagreement case) called a single good read "the best result in the set" — it was an n=1
lucky draw, caught only because a later dispatch insisted on repetition. The harness has no
built-in mechanism for this at all; it's something every lane has re-invented from scratch,
including this session, five times.

**3. Whether a fixture's own data is internally consistent.** Confirmed live tonight:
`fixtures.ts`'s shared `rec()` helper hardcoded a `why` sentence true for `REGRESSION_CONTEXT`
and false for `BASELINE_CONTEXT`, which only overrode `id`/`title`. Nothing checks a fixture
against itself — not the judge (which explicitly isn't fact-checking), not the deterministic
checks (which look at the model's *output*, not the *input* it was given), not any test in
`__tests__/ai/eval/`. A model faithfully reading a self-contradictory fixture and repeating the
contradiction back reads exactly like the model inventing something, until someone traces it
to source. This is now fixed for the one confirmed instance and the one sibling field that
had the identical defect, but the general risk — a shared fixture-builder default silently
wrong for a fixture that doesn't override every field — has no standing check.

**4. Only two fixtures, built for two specific historical regressions plus Phase 39.**
`fixtures.ts`'s own header says this plainly: "this package's job is the two known regressions
plus one general baseline, not an exhaustive persona sweep." Any defect that only manifests on
a profile shape the two fixtures don't cover — an all-unassessed profile, a tie at the weakest
boundary, a profile with ties across several dimensions at once — has never been exercised by
the standard suite. (Two of tonight's own unit tests, added during the ranking-fix passes, do
cover a tie case and an unassessed-with-a-lower-hidden-score case — but as `__tests__/ai/
student-context.test.ts` assertions on synthetic data, not as `lib/ai/eval/` fixtures a live
run would ever touch.)

**5. The Turkish-locale interaction with rank tags, specifically — untested, not confirmed
broken.** `ALL_CASES` includes `tr` locale cases, but nothing in tonight's three ranking
passes ran one. Checked directly for this doc: the `— weakest` / `— tied for weakest` tags in
`student-context.ts` are hardcoded English literals, unaffected by `locale` — consistent with
the rest of `ADVISOR_SYSTEM_PROMPT` (plain English instructions throughout, with
`withOutputLanguage` as the separate, existing mechanism that controls what language the
*reply* comes back in) rather than an anomaly specific to this fix. So this is not a newly
found bug — it's an untested combination worth naming: nobody has confirmed a model correctly
withholds an ordinal claim, or correctly uses a same-language "weakest" framing, when composing
in Turkish specifically. Given this exact feature area just spent three passes on an English
fixture, that's a real gap in tonight's own coverage, not a hypothetical one.

## The practical takeaway

A green run through this harness — deterministic checks clean, judge scores good, single
read — answers "does this sound right, once, and does it avoid two specific known defects." It
does not answer "is what it said about this student actually true," "does this hold up on a
second read," or "would this look this good on a fixture nobody wrote yet." All three questions
mattered tonight. None of them were the harness's job to answer on its own — they needed a
human (or a lane standing in for one) to ask them on purpose.

## Addendum — 2026-09-03, the standard path itself smoke-tested after tonight's changes

The observation above — that nothing tonight's ranking chain did went through `ALL_CASES`/
`runEval`/the gated CLI, only bespoke scripts reusing its pure pieces — prompted the obvious
follow-up: after three passes changed `student-context.ts` and a fourth rewrote parts of
`fixtures.ts`, does the harness's own actual entry point still run at all? Not a measurement —
a smoke test, run once against merged `b498c73b`.

`npm run eval:ai -- --live --confirm-spend` (no `--judge`, to keep this a smoke test rather
than a full qualitative pass): all 12 cases in `ALL_CASES` assembled and ran. 11 completed
clean, zero deterministic findings on any of them. One — `weekly_plan/en/baseline` — failed
schema validation ("actions: Invalid input: expected array, received undefined"). Before
calling that a regression, checked it against `harness.ts`'s own header, which already
documents this exact failure shape as pre-existing: *"the model omitted a required field
twice, which anthropic-provider.ts's own retry comment documents as a known, pre-existing
model behaviour."* Re-ran that one case three more times immediately after: 3/3 succeeded.
Transient, matching the documented pattern — not something tonight's changes broke.

**Answer to "does it still run": yes.** The standard path assembles all 12 cases without
throwing, the two deterministic checks execute correctly against real output with no false
positives across 14 total completed runs (11 + 3 recheck), and the one failure observed is the
harness's own already-documented flakiness, confirmed transient by immediate re-run rather than
assumed. Real spend: ~$0.27 for the 12-case pass plus a few cents for the 3-case recheck,
`ai_usage`-logged normally (a real CLI run, not a direct provider call like this session's own
comparison scripts).

## What this pass does not do

No code changed — `student-context.ts` and `fixtures.ts` are untouched, per CEO's explicit
stop on both tonight. No new fixture, no new check, no build proposal. This is a map, handed to
whoever reaches for this harness next.
