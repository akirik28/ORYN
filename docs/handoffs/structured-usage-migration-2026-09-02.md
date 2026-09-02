# The three flagged callers, migrated — and no genuine tension found in any of them

**Status:** all 3 migrated, gates green (typecheck/lint/3421 tests/build). **Author lane:**
oryn-31, at oryn-a7's request, following on directly from the spend/artefact sweep. **Base:**
local `main` (`c50eb679`). **Branch:** `oryn/structured-usage-migration-2026-09-02`.

---

## The honest answer to the thing I was asked to describe

oryn-a7 asked, correctly, that where the control flow genuinely resists a clean migration —
a retry that must stop for budget reasons, a loop that must continue past one bad candidate —
I describe the tension rather than resolve it by feel. Having now traced all three: **there
wasn't one.** `assertWithinJobBudget` (both discovery jobs) throws `JobBudgetExceededError`
*before* any AI call happens — it sits entirely outside `withUsageLogging`'s scope, not
interacting with it at all, so the "stop for budget" case and the "recover usage from a
billed failure" case never touch. The per-query/per-university loops in `discover.ts` already
catch *any* non-budget error into an `errors: string[]` array — that catch didn't need to
change, because I didn't change what gets thrown, only made sure the already-thrown case now
carries its usage. `generateWeeklyPlan` has no loop of its own at all — one call in, one
result or one throw out. Saying this plainly rather than writing up a tension that would have
made the package look more load-bearing than the diffs actually are.

## Order followed: discovery jobs first, `weekly_plan` second

Per oryn-a7's reasoning — the discovery jobs interact with a **live** per-job budget
(`lib/ai/limits/job-budget.ts`) that reads this exact month's `ai_usage` sum to decide whether
the *next* call is allowed, and both are scheduled to run for the first time ever on the
founder's first deploy. A retry-exhausted failure that logged nothing wouldn't just lose that
one call's spend from view — it would make every subsequent call in the run, and future runs
until the real total catches up, believe there's more budget headroom than actually exists.
That's the budget under-counting in exactly the direction that costs money, confirmed by
reading `checkJobBudget`'s own query, not assumed from the description.

## What changed

**`lib/ai/opportunity-extraction.ts` / `lib/ai/requirement-extraction.ts`** — identical shape,
both migrated the same way: `selectModelForUser(null)` + bare `generateStructured` +
`logAIUsage` replaced with `withUsageLogging({userId: null, feature}, (model) =>
generateStructured({...model}))`. `assertWithinJobBudget` stays exactly where it was, first
line, outside the new call. Confirmed the only callers of both extraction functions are their
respective `discover.ts` files (grepped, not assumed) — no other call site to worry about.

**`lib/ai/weekly-plan.ts`** — same migration, one extra thing worth naming: the original code
called `selectModelForUser(userId)` explicitly, separately from the AI call, specifically to
read `selection.degraded`/`selection.reason` for `logAIUsage`'s degrade fields.
`withUsageLogging` already resolves `selectModelForUser` internally and threads
`degraded`/`degradeReason` into *every* `logAIUsage` call it makes — including, now, the
newly-added billed-failure path, which the original code had no equivalent for at all (there
was no billed-failure path that logged anything before this). Net: the migration doesn't just
preserve the existing degrade-tracking, it extends it somewhere the original never reached.
This is the feature carrying roughly 90% of the product's AI spend to date — the largest
single instance of the class the 2026-09-02 sweep found in cv_extraction/achievement_refinement
would have been here.

**Tests**: `__tests__/ai/weekly-plan.test.ts`'s existing `@/lib/ai/usage` mock only exported
`logAIUsage`, which the file no longer imports — added a `withUsageLogging` mock (runs the
callback with a fixed model, returns/throws whatever it does) rather than restructuring this
file's mocks to drive the real usage-logging path, since this file's own stated purpose is the
plan-content self-contradiction fix, not usage-logging correctness — that's what the two files
below are for, and grepped first to confirm no existing test here actually asserted on
`logAIUsage` being called (only one, the mock declaration itself).

New file `__tests__/ai/extraction-jobs-usage.test.ts` (mirrors
`structured-output-usage.test.ts`'s real-`withUsageLogging`-path pattern, stubbed admin client
only) covers both extraction functions' success and retry-exhausted-failure paths, plus one
test specific to this pair's real stakes: a `JobBudgetExceededError` (budget already spent)
never reaches the provider at all and records nothing — confirming the boundary between "stop
before spending" and "recover what was spent" stays where it's supposed to.

## What this does NOT do

- Doesn't touch `assertWithinJobBudget`/`checkJobBudget` themselves — already correct, not in
  scope.
- Doesn't change `discover.ts`'s own error-collection logic — already correctly generic,
  needed no update.
- Doesn't add a fourth budget dimension or otherwise expand `job-budget.ts`'s design — this
  package makes the ledger it already reads more accurate, nothing more.
