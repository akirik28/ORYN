# Spend/artefact sweep — one real gap found and fixed, rest confirmed clean or already closed

**Status:** systematic sweep of the Job D technique across every candidate pair, one real
live gap found and fixed, gates green (typecheck/lint/3396 tests/build). **Author lane:**
oryn-31, at oryn-a7's request. **Base:** local `main` (`4478ca0f`). **Branch:**
`oryn/spend-artefact-sweep-2026-09-02`.

---

## Method note, honored before concluding anything

Per the brief: the spend side is only visible where `logAIUsage` actually runs, so a gap in
`ai_usage` isn't automatically a finding. Full census first: only 4 features have **ever**
logged usage — `weekly_plan` (112 rows, already fixed), `advisor_chat` (13), `cv_extraction`
(2), `achievement_refinement` (1). `counselor_explain` has never logged a single row — no
finding to make there, just an unused feature. Small enough to check every real row
individually rather than sample.

## 1. `advisor_chat` → `advisor_messages` — historical, already fixed, confirmed not live

3 of the 13 `advisor_chat` rows have `user_id: null`, identical timestamps, identical token
counts — test/fixture artefacts, not real usage, set aside (nothing to cross-reference them
against).

Of the 9 real, user-attributed rows: one user (`026e9295-…`) has **three `advisor_messages`
rows with `status: 'failed'`** on 2026-08-23, none with a matching `ai_usage` row. Looked like
exactly the Job D shape at first. It isn't — it's the historical footprint of an **already-
fixed** incident: `lib/ai/usage.ts`'s `withUsageLogging` exists specifically because of a
SEV-1 fixed the same day (commit `08016743`, "stop losing failed-turn spend", 2026-08-23
19:34:47 +03 = 16:34:47 UTC). The three failures are timestamped 15:53–15:55 UTC — **40 to 80
minutes before that fix landed.** Timing, not a raw error-class log (the stored
`error_message` is the generic user-facing fallback), so this is strong circumstantial
evidence, not a certainty — stated as such, not overclaimed.

**`advisor_chat` is clean going forward** — `generateAdvisorReply` already routes through
`withUsageLogging`.

**CEO's specific question — does a failed turn leave a recoverable conversation or a stuck
one — has a real, already-shipped answer: recoverable.** `app/(app)/advisor/actions.ts` has a
dedicated `retryAdvisorMessage` action (its own comment: "P0 fix... previously nothing was
written here at all... a reload shows a retry-able failed bubble instead of a silent gap"),
retrying the *same* row in place rather than duplicating it. It calls the same
`generateAdvisorReply`, so it inherits `withUsageLogging`'s protection automatically — no
separate fix needed for the retry path.

## 2. `cv_extraction` / `achievement_refinement` — real, live gap, fixed

Both call `provider.generateStructured` directly and only ever called `logAIUsage` on the
success path — neither had been migrated to `withUsageLogging` the way `advisor_chat` was.
Worse, tracing deeper: **`generateStructured`'s own retry-exhausted error carried no usage at
all**, unlike `generateText`'s `AIResponseIncompleteError` — so even a caller written as
carefully as `advisor_chat`'s couldn't have recovered this spend by catching a known error
type, because the provider itself never attached it. Up to two real, billed calls (the retry
is a second real attempt, not a local recheck) with the tokens spent nowhere in reach.

**Fixed at the provider, not just the two call sites**, since the gap was structural:

- `lib/ai/provider.ts`: new `AIStructuredResponseFailedError` (`usage`, `model`, matching
  `AIResponseIncompleteError`'s existing shape) rather than reusing that class directly — its
  message is specific to the `generateText` "no text block" failure and would have been wrong
  for a schema-validation failure.
- `lib/ai/anthropic-provider.ts`: `generateStructured` now accumulates usage across every
  attempt (summed, not just the last one — each attempt is a separate billed request) and
  throws the new error with the total on retry exhaustion.
- `lib/ai/usage.ts`: `withUsageLogging` now catches either error type, so it's a single,
  reusable safe pattern for both `generateText` and `generateStructured` callers.
- `lib/ai/cv-extraction.ts` / `lib/ai/refine-achievement.ts`: migrated to `withUsageLogging`.
  `cv-extraction.ts`'s outer catch still wraps everything into `CVExtractionFailedError` as
  before (external contract unchanged) — usage now logs correctly *before* that wrapping
  happens, not instead of it.

**Not migrated, flagged instead**: `weekly_plan`, `discover_opportunities`,
`discover_requirements` all also call `generateStructured` directly without
`withUsageLogging`, and now *can* benefit from the provider-level fix (usage is available on
the thrown error) the moment someone adopts it — but migrating those three touches files with
real, carefully-reasoned control flow (job-budget retry stopping, per-query/per-university
loops) I didn't want to restructure under tonight's time pressure without the same
line-by-line care Job D itself got. Naming it rather than expanding into it.

**Tests**: `__tests__/ai/anthropic-provider-health.test.ts` gets one new test asserting the
accumulated-usage behavior directly (two attempts, different token counts each, asserts the
sum). New file `__tests__/ai/structured-output-usage.test.ts` (mirrors
`advisor-chat-usage.test.ts`'s established real-`logAIUsage`-path pattern) covers both
migrated features' success and retry-exhausted-failure paths, asserting real `ai_usage` rows
land with the right feature/tokens in both cases.

## 3. `requirement_research_queue` → `university_requirements` — not a new finding

1170 of 2454 `outcome = 'accepted'` rows have no `promoted_requirement_id` link. Checked the
code before treating this as a finding: `outcome = 'accepted'` means `decideRequirementIngestion`
judged the candidate acceptable, a policy decision distinct from actually being written —
`lib/requirements/shape-audit.ts` (already-existing tooling on this exact table) documents this
exact distinction. Consistent with this whole session's standing "research, stage, gate-check,
leave unapplied pending founder authorization" discipline, applied across every research batch
tonight — not silently lost value, not the Job D shape.

The reverse-direction asymmetry CEO referenced (~193 records labelled rejected/unresolved that
were actually already live) is **my own prior finding from earlier tonight**
(docs referenced there), already diagnosed, not re-verified with fresh numbers in this pass —
CEO's mention was illustrative of the technique pointing the other way, not a re-ask.

## 4. `profile_score_snapshots` → `profile_scores` — clean

`lib/scoring/persist.ts`'s `recomputeCareerProfile`: every write (`profile_scores` upsert,
`profiles` cache update, `profile_score_snapshots` insert) checks its own error and throws —
no silent swallowing anywhere in the chain. The two tables are written in the same function,
in order, both fatal on failure; there's no code path where one succeeds and the other
silently doesn't. The only fallback (`admin` client unavailable) computes and returns without
persisting *anything*, logged clearly — and there's no AI/external cost in this function at
all (pure deterministic computation over already-fetched data), so even that fallback has no
Job-D-shaped "spent money, got nothing" risk. 26 snapshot rows total is consistent with a
real, appropriately conservative `changedMeaningfully` gate, not evidence of undercounting.

## What this does NOT do

- No migration of `weekly_plan`/`discover_opportunities`/`discover_requirements` to
  `withUsageLogging` — flagged as a real, related follow-up, not built tonight.
- No fresh re-verification of the ~193 `requirement_research_queue` label-lag figure — that's
  prior, already-diagnosed work, not reopened here.
- No code change to `requirement_research_queue` or `profile_score_snapshots` — both checked
  and found to need none.
