# Dashboard "avoid for now" precedence — 2026-09-01

Branch `oryn/avoid-for-now-precedence-2026-09-01`. Pushed, not merged — oryn-a7 merges.
oryn-a7 found and reported the bug; this is the fix, reported back for review before
implementation per their explicit request (a visible product-behaviour change), then built.

## The bug

`app/(app)/dashboard/page.tsx`'s "One thing not to do" card had two possible sources: a
stored `ai_recommendations` row (`.eq("user_response", null).order("shown_at", desc).limit(1)`
— the single most recent row the student hasn't acted on, no matter how old) and Counselor
Core's freshly-computed, deterministic `avoidForNow` (recomputed from the student's current
profile on every render). The stored row was checked first and always won when present; the
deterministic one was only ever consulted when no stored row existed at all.

A prompt bug that let raw `ProfileDimension` identifiers (`career_exploration`,
`community_impact`, `awards_distinction`, ...) leak into AI-generated recommendation prose
was fixed for new generations, but nothing swept what was already stored. Because the
stored-row query has no freshness check on `shown_at`, those old rows kept winning
indefinitely. oryn-a7 found three accounts whose most-recent-unresponded row would render
today, including the founder's own: *"...your **career_exploration** gap is better
addressed by..."*.

## Root cause, and the design question underneath

The code comment on the old precedence explained the *intended* fallback direction —
"Counselor Core's avoidForNow fills the same gap" stored rows fill — but the actual
precedence ran the opposite way. Traced why before picking a fix: `avoidForNow` is derived
via `find(r => r.recommendationClass === "avoid_for_now")`, and that classification
(`lib/counselor/scoring.ts`'s `avoidEligible`) is a narrow, deterministic condition — every
matched gap must already be a strong dimension, *and* the same dimension as the single
overall strongest gap. A `null` result from a computation that actually ran is a confident
"nothing currently warrants this," not a placeholder or an "insufficient data" state.

That distinction is what decided the fix. "Prefer deterministic, fall back to stored
whenever `avoidForNow` is empty" would still have been wrong — it would resurface stale
stored advice on every confident-null render, the same bug one layer up. The correct
precedence trusts a successful computation completely, populated or confidently empty
either way, and treats the stored row as a fallback for exactly one condition: the
computation didn't run at all.

## What changed

New `resolveAvoidRecommendation(contract, storedRecommendation)` in
`lib/counselor/dashboard-contract.ts`, extracted out of the page component so this
precedence has one place to live and one place to test — same rationale as
`lib/scoring/dashboard-hero.ts`'s `computeDashboardHeroState`, which this file's own history
shows got a very similar precedence question wrong once already (the three-state hero fix,
2026-08-24).

```
contract === null            → stored row (or null) — the only real fallback case
contract.avoidForNow present → that, always — never the stored row
contract.avoidForNow null    → null — never the stored row
```

`app/(app)/dashboard/page.tsx` now calls this function instead of carrying the ternary
inline. No other files needed to change — `counselorContract` and `recommendationRes.data`
were already computed exactly where they're used.

**Deliberately not built**: a render-time guard that detects raw identifiers in the stored
row's text and falls back on match. After this fix, the stored row is reachable only on
genuine computation failure — narrower exposure than a render-time regex, and a
hand-maintained identifier pattern is the exact failure shape oryn-a7's own detector just
hit (missed `awards_distinction` on the first pass). Adding a second one here trades a
small residual exposure for a maintenance liability with the same known failure mode.

## Tests

New `describe("resolveAvoidRecommendation")` in
`__tests__/counselor/dashboard-contract.test.ts` (5 tests) pins the exact matrix the fix
depends on: a populated `avoidForNow` wins over a stored row even when both exist; a
confident null wins too (the case a naive "prefer deterministic" fix would get wrong); the
stored row is used only when `contract` itself is `null`; null when neither is available; a
stored row's `null` reason becomes `""`, not the literal string `"null"`.

## Verification

All 4 gates green: lint, typecheck, full suite (212 files / 3094 tests, zero flakes),
build.

**Live, on the founder's real account, in English — no locale switch needed, since the
leak itself is in English AI-generated prose**: loaded `/dashboard`. No "One thing not to
do" card renders at all — confirming `counselorContract.avoidForNow` is a confident null for
this account right now, and confirming the fix actually suppresses the stale
`career_exploration` row that would have rendered under the old precedence (oryn-a7's exact
live finding on this account). Zero console errors.

**An unplanned, useful side effect of that same check**: the "Your focus this week" panel's
third action card read *"Career_exploration is at 9/100 with low confidence — one of your
weakest, least-understood dimensions"* — a live, third example (independent of the two
oryn-a7 already quoted) of the *separate* leak they found in `weekly_actions` rows while I
was implementing this fix. Recording it here because it's corroborating evidence gathered
incidentally, not because this branch touches it.

## Scope boundary — the part this branch does NOT fix

oryn-a7 swept the other three surfaces sharing the same historical leak while this was in
progress: `weekly_actions` (6 of 22 rows, all 5 users — renders on the dashboard **and**
`/plan`), `weekly_plans.summary` (1 of 8), `advisor_messages.content` (3 of 26, 2
conversations). None of these have a deterministic alternative to prefer — a stored weekly
action or a past advisor message is the only copy that exists, unlike `ai_recommendations`,
which had a rival, freshly-computable answer to fall back to. The precedence fix in this
branch cannot help them; only a data write can, and that's founder-gated.

**Net effect on urgency, stated plainly**: this fix neutralizes all 105 historically-tainted
`ai_recommendations` rows, not just the 3 currently live — none of them can reach a render
via this code path again, live or via the failure-path fallback. It does nothing for the
~10 rows across the other three tables, which remain live and reachable today, including on
the founder's own account (confirmed above, independently, during this same verification
pass). The founder-gated cleanup this unlocks is smaller than it looked before oryn-a7's
sweep, not resolved.

## The general lesson, worth stating once rather than per-table

The prompt fix that stopped new raw-identifier leaks was never paired with a sweep of what
was already stored, across any of the four affected tables. Fixing a generator and auditing
its output are two different tasks, and the second one is easy to skip because nothing
fails loudly when it's missing — the old rows just sit there, correct-looking, until an
old-enough one becomes the "most recent" answer again.
