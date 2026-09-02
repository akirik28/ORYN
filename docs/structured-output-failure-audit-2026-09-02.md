# Structured-output validation failures — 2026-09-02

**Status:** 8 files changed (5 source, 3 test), 2 real gaps found and fixed, gates green
(typecheck/lint/3988 tests/build). **Author lane:** oryn (this session), at oryn-a7's
request. **Branch:** `oryn/structured-output-failures-2026-09-02`.

## The ask

Phase 26: *"Never parse important AI responses from arbitrary prose. Use structured
outputs / validated JSON patterns. Validate with Zod... If validation fails: retry safely
or return a controlled error."* Trace the validation-failure path for every structured
surface — weekly plan, CV extraction, opportunity extraction, requirement extraction,
research generator, counselor explanation — plus, found along the way, essay outlines and
requirement interpretation (the other two `generateStructured` callers in the codebase).
Specifically: does a failure still bill, is a retry bounded, is there live evidence it has
ever happened, and is the student-facing degrade honest.

## The mechanism, read once at the provider level

`lib/ai/anthropic-provider.ts`'s `generateStructured` (`for (let attempt = 0; attempt < 2;
attempt += 1)`): exactly one retry, hard-coded, not configurable per caller. On a schema
validation failure it appends the Zod issue summary to the prompt and retries once; a
second failure throws `AIStructuredResponseFailedError`, carrying the token usage of **both**
attempts summed. `lib/ai/usage.ts`'s `withUsageLogging` wraps a call, resolves the
per-student model/degrade decision, and logs **exactly one** `ai_usage` row whether the call
succeeds or fails-with-usage — never two, confirmed by reading the function directly (a
`try { result = await run(...) } catch (error) { if (carries usage) logAIUsage(...); throw
error }` shape, success path logs once below the try/catch).

This directly answers three of the assignment's questions before looking at any individual
feature: **the retry is bounded** (not the unbounded-loop shape that cost $2.97 on
`weekly_plan` in a separate, already-fixed incident), and **a retry never produces two
`ai_usage` rows**, only one, with the correct combined tokens — *when* the caller uses
`withUsageLogging`. Whether every caller does is what the per-feature trace below checks.

## Per-feature trace

| Feature | Uses `withUsageLogging`? | Billed on total failure? | Controlled error reaches student? |
|---|---|---|---|
| `weekly_plan` | Yes | Yes | Yes — dashboard: deterministic fallback or honest `EmptyState`; Regenerate action: classified + generic honest message |
| `cv_extraction` | Yes | Yes | Yes — Phase 61's exact message, file preserved |
| `opportunity_extraction` | Yes | Yes | N/A (background job) — per-candidate isolation, job budget stop |
| `requirement_extraction` | Yes | Yes | N/A (background job) — same shape |
| `research_generator` | Yes | Yes | Yes — rate-limited, classified, honest fallback |
| `achievement_refinement` | Yes | Yes | Yes — rate-limited, classified, honest fallback |
| `counselor_explanation` | **No → fixed this pass** | **No → fixed this pass** | Yes (swallows to `null` by design — a narrated explanation is optional) |
| `essay_story_bank` | **No → fixed this pass** | **No → fixed this pass** | Yes — rate-limited, classified, honest fallback |
| `requirement_interpretation` | **No → fixed this pass** | **No → fixed this pass** | Yes (admin-only Server Action, classified) |

Six of nine were already correct — `docs/handoffs/spend-artefact-sweep-2026-09-02.md`
(earlier the same night) found and fixed this exact gap for `cv_extraction`/
`achievement_refinement`; `weekly_plan`/`opportunity_extraction`/`requirement_extraction`/
`research_generator` were migrated in the same or an adjacent pass. It was never extended
to the remaining three.

## Fix 1: three features had the "spent money, no record" gap

`counselor-explain.ts`, `essay-outlines.ts`, `interpret-requirement.ts` each called
`provider.generateStructured` directly, selected a model via `selectModelForUser`, and
called `logAIUsage` only immediately after a successful response — never inside a catch, and
`essay-outlines.ts`/`interpret-requirement.ts` had no catch at all in the function itself. A
retry-exhausted `AIStructuredResponseFailedError` (up to two real, billed Anthropic calls)
propagated with zero trace in `ai_usage`.

**Fixed**: migrated all three to `withUsageLogging`, replacing the manual `selectModelForUser`
+ `generateStructured` + `logAIUsage` triplet with the one-call pattern the other six
features already use. `counselor-explain.ts` keeps its own outer try/catch (swallows to
`null` — a narrated explanation is optional by design, per its own existing comment); the
other two already had a Server Action layer classifying the re-thrown error.

**Blast radius, stated precisely**: `counselor_explanation` and `essay_story_bank` both have
zero real `ai_usage` rows ever (confirmed live, and independently by three other packages
tonight for `counselor_explanation` specifically) — this gap has never actually cost
anything. `requirement_interpretation` is admin-only, triggered by the founder's own account
via the "suggest a rule" tool, not student-reachable. Fixed because the code path is real
and live regardless of how often it's exercised, not because of an observed incident.

## Fix 2: a second, smaller gap — under-billing on a succeeded retry

Found auditing the provider function directly, not from a report. `generateStructured`'s
success branch returned `usage` (the *current* attempt's tokens) rather than
`accumulatedUsage` (the running sum) — so a call that failed validation once and then
succeeded on its second attempt logged only the second attempt's tokens, silently dropping
the first attempt's real, billed spend. This is the success-path sibling of the exact gap
`AIStructuredResponseFailedError.usage` exists to close on the failure side; it just never
got the same treatment.

**Fixed** (`lib/ai/anthropic-provider.ts`): the success return now uses `accumulatedUsage`
too. Affects all 9 features equally, at the shared provider level — no per-feature changes
needed. **Verified the fix is real, not cosmetic**: `git stash`'d it, reran the new test
(`__tests__/ai/anthropic-provider-health.test.ts`, "reports the summed usage of both
attempts, not just the second"), confirmed it fails against the pre-fix code (150/40 instead
of the correct 250/70), then restored and reran green.

## Live evidence, checked directly

`ai_usage` (excluding `model = 'test-model'` fixture rows): only 4 features have ever
logged anything — `weekly_plan` (115), `advisor_chat` (10, a `generateText` surface, out of
this audit's structured-output scope), `cv_extraction` (2), `achievement_refinement` (1).
The other 5 named surfaces (`opportunity_extraction`, `requirement_extraction`,
`research_generator`, `counselor_explanation`, `essay_story_bank`) and
`requirement_interpretation` have zero rows — nothing to check for a retry signature
because nothing has run against real traffic.

Checked `weekly_plan`'s 115 rows for a token-count outlier consistent with a
retry-exhausted, summed-usage row (would read roughly double a normal single-attempt call):
`avg 5500, stddev 392, max 6867` — no row is anywhere near double the average, so **no
evidence a retry-exhausted failure has ever happened for `weekly_plan`** specifically. Named
precisely what this method can and can't show: it can only detect a *total failure*
(summed, elevated usage); a quiet succeeded-on-second-attempt call — before today's fix —
would have looked identical to a normal single-attempt row in this same table, so its
absence from the data doesn't mean it never happened, only that it's unprovable either way
from `ai_usage` alone.

## Degrade honesty, checked per surface rather than assumed

- **Dashboard weekly plan** (`app/(app)/dashboard/page.tsx` → `features/dashboard/
  dashboard-view.tsx`): a real deterministic fallback (`CounselorWeekFallback`, Counselor
  Core's own ranked, non-AI candidates) renders when available; otherwise an honest,
  translated `EmptyState` ("We couldn't generate this week's plan. Please try again.") with
  a retry action. Never a blank section, never a fabricated plan.
- **CV extraction** (`app/(onboarding)/onboarding/actions.ts`): matches Phase 61 verbatim —
  the file is uploaded to storage *before* extraction is attempted, so a validation failure
  never loses it; `CVExtractionFailedError`'s message is Phase 61's own exact sentence ("We
  couldn't fully read this document. You can retry or add the information manually.").
- **Regenerate weekly plan** (`app/(app)/plan/actions.ts`): classifies
  `RateLimitExceededError`/`AIProviderNotConfiguredError` specifically via
  `aiServiceFailureMessage` (HTTP-status-based, not message-text matching); a schema-
  validation-exhausted failure has no `status` field, so it falls to the generic fallback
  ("Something went wrong generating your plan. Please try again.") — honest and not
  actively bad advice for this specific error class (a validation retry failure can
  plausibly succeed on a genuine retry, unlike a spent-balance or outage case), but less
  informative than it could be. Not changed — a real product-copy decision, not a bug.
- **Research ideas, essay outlines**: both rate-limited (10/60min), classified, honest
  generic fallback on the residual case. No uncaught throw reaches either page.
- **Background jobs** (opportunity/requirement extraction): per-candidate try/catch isolates
  one failure from the rest of the batch; a job-level monthly budget ceiling stops the run
  cleanly (not a crash) when exceeded, checked *before* each AI call so the stop never costs
  an extra billed request.

## What this deliberately did not do

- No change to `aiServiceFailureMessage`'s generic fallback copy for schema-validation
  failures — a real product-copy call, named above, not made unilaterally.
- No live model call anywhere in this pass — every test uses `MockAIProvider` or a mocked
  Anthropic SDK client, matching this codebase's "no live model call, ever" test convention.
- No change to `advisor_chat`/`generateText`'s own failure handling — out of this audit's
  structured-output scope, and already covered by its own `AIResponseIncompleteError`
  mechanism and dedicated tests.
- No attempt to build a live-fire test against a real Anthropic API to force a validation
  failure — every finding here is from source, live `ai_usage` data, and mocked-provider
  tests, consistent with this session's standing no-live-spend-without-approval discipline.

## Verification

```
typecheck   clean
lint        clean
test        3988 passed (269 files) — 7 new
build       succeeded (Next.js 16.3.1)
```

New tests: 6 usage-recording tests for the three newly-migrated features
(`__tests__/ai/structured-output-usage.test.ts`, mirroring its own existing
`cv_extraction`/`achievement_refinement` pattern exactly — success logs once, retry-exhausted
failure still logs once with the correct summed tokens), 1 provider-level test for the
success-after-retry billing fix (`__tests__/ai/anthropic-provider-health.test.ts`), plus a
mock-module fix in `__tests__/ai/eval/harness.test.ts` (it pre-mocked `@/lib/ai/usage` with
only `logAIUsage`; `counselor-explain.ts` migrating to `withUsageLogging` needed that export
added to the mock too — found by the test suite itself, not missed silently).
