# Calling real business logic directly with synthetic input — no DB, no dev server, no mock harness

Three lanes hit *"I want to measure this but can't run it"* today: one blocked by `server-only`
(solved separately, see [docs/running-server-only-scripts-2026-09-05.md](./running-server-only-scripts-2026-09-05.md)
— cross-referenced here, not duplicated), one with no live DB access, one whose query was
blocked. This is a fourth way around the same wall, used twice today for real answers:
`computeDashboardHeroState`'s zero-signal state
([docs/first-experience-post-onboarding-2026-09-05.md](./first-experience-post-onboarding-2026-09-05.md))
and whether a fresh, zero-activity student gets a real opportunity match. Writing down how it
works, and — more important — what it can't answer, so the next lane reaching for this doesn't
have to rediscover either half.

## What it is

Some of this codebase's most decision-relevant logic is a **pure function**: no Supabase
client, no `cookies()`/`headers()`, no network call — just data in, data out. When the question
is "what does this function actually do with input shaped like X," the fastest, most direct
answer is calling the real, unmodified function with a hand-built `X`, in a throwaway script,
and reading what comes back. No mocking library, no test framework, no running server.

## How

1. Confirm the target function doesn't do I/O — read its own file's imports. No
   `@/lib/supabase/*`, no `"server-only"` at the top of *this specific file or its own direct
   imports* (a transitive `server-only` import elsewhere in the chain is survivable — see step
   3 below — but plan for it).
2. Write a plain `.ts` file anywhere writable (this session used its own scratchpad — never a
   tracked project path, since these are throwaway checks, not committed scripts). Import the
   real function by its real `@/...` path, construct the input by hand as the *type* the
   function declares (not a loose object — let the compiler hold you to the same shape a real
   caller would have to produce), call it, `console.log(JSON.stringify(result, null, 2))`.
3. Run it: `npx tsx path/to/script.ts`. **If this fails with `Cannot find module 'server-only'`**,
   the function (or something it imports) is tagged — switch to
   `npx tsx --tsconfig tsconfig.eval-cli.json path/to/script.ts` per the other doc; both of
   today's two checks happened not to need this, but the next one might.

Two real, run-today examples:

```ts
// computeDashboardHeroState -- lib/scoring/dashboard-hero.ts, lib/scoring/signal.ts.
// No server-only import in either file -- ran with plain `npx tsx`.
import { computeDashboardHeroState } from "@/lib/scoring/dashboard-hero";
const heroState = computeDashboardHeroState(freshAccountSignal, biggestGap, "en");
// → { kind: "empty", gapLabel: null }
```

```ts
// computeOpportunityMatch -- lib/opportunities/matching.ts. Also no server-only import.
import { computeOpportunityMatch } from "@/lib/opportunities/matching";
const result = computeOpportunityMatch(freshStudentProfile, realOpportunityShape, null);
// → { eligible: true, matchScore: 67, ... }
```

## What this proves, precisely

**The function's own behavior, given the input you constructed.** Nothing more, nothing less
— and that boundary matters more than the technique itself.

## What it does NOT answer — read this before trusting a result

- **Whether the wiring above the function actually produces the input you constructed.**
  Today's hero-state check proves *"if `toProfileSignal`/`rankDimensionGaps` hand
  `computeDashboardHeroState` an all-`not_assessed` signal, the result is `kind: 'empty'`"* — it
  does not, by itself, re-verify that `DashboardPage`'s real Server Component definitely
  produces that exact shape for a real fresh account today. That second half was established
  separately, by reading the actual call sites and reusing this morning's own live-query fact
  (every `profile_scores` row with empty `reason_codes` scores exactly 0) — the pure-function
  call and the wiring check are two different proofs, and both are needed. Citing only the
  function result as if it proved the whole pipeline would be the same mistake this session
  flagged nine times today in other forms: a check that's real, but narrower than the claim
  resting on it.
- **Whether real accounts actually have data shaped like your synthetic input.** You are
  testing the *function*, not the *population*. A live query is still the only way to confirm
  actual rows look like what you assumed.
- **Anything requiring a database.** No Supabase client exists in this call path by
  construction — RLS behavior, actual query results, joins, real row counts: none of that is
  reachable this way. `getCounselorState`, `getCurrentWeeklyPlan`, and anything else that
  fetches are a different, harder problem (mock the client, or query live) — only their
  downstream pure helpers (`rankCandidates`, `computeOpportunityMatch`, `computeDashboardHeroState`)
  are reachable directly.
- **Anything needing Next.js request context.** `requireUser()`, `resolveLocale()`,
  `redirect()`, `revalidatePath()` — none of these have anything to resolve against outside a
  real request. A function that calls any of them isn't callable this way at all.
- **Live AI-provider behavior.** No model call happens. This proves the deterministic logic
  *around* an AI call (a fallback path, a schema, a gate), never the model's actual output,
  latency, or cost.
- **End-to-end integration.** This is not a substitute for a render test
  ([docs/render-test-as-safe-browser-substitute](../__tests__/universities/compare-page-render.test.tsx)'s
  own established pattern) when the real question is "what does the page actually render" —
  that needs the React tree and a mocked Supabase table, not a bare function call. Reach for
  this technique specifically when the question is about one function's decision logic in
  isolation, not the assembled screen.

## When to reach for this instead of something else

- The question is "does function F do X given input shaped like Y" — not "does the whole page
  do X."
- The function is genuinely pure (no I/O) — checked, not assumed, before writing the script.
- A live DB measurement can't answer it because the shape you need to test doesn't exist in
  live data yet (today's exact case: no live account has zero activities *and* a real
  onboarding-shaped profile sitting in `profile_scores` in exactly the post-onboarding moment —
  synthesizing that moment was the only way to see the real function's real behavior on it).
