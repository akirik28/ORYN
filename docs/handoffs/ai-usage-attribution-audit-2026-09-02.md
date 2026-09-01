# ai_usage.user_id = NULL — the precondition, audited before building on top of it

**Status:** investigation + one unapplied migration. No live writes, nothing deleted.
**Author lane:** oryn-60, at oryn-a7's explicit request as a precondition to the per-user AI
spend cap ("shipping the cap before this means shipping a cap with a known hole"). **Base:**
local `main`.

## The finding: not a live attribution bug

The 3 `ai_usage` rows with `user_id IS NULL`, queried directly:

```
model="test-model", input_tokens=100, output_tokens=50, estimated_cost=NULL,
created_at="2026-08-15 12:51:15.085589+00" — all three, identical, to the microsecond.
```

`"test-model"` is not a real Anthropic model — it doesn't appear in `lib/ai/pricing.ts`'s
pricing table, which is exactly why `estimated_cost` is NULL on all three
(`estimateCostUsd`'s own documented behavior for an unrecognized model). Round, identical
token counts and an identical-to-the-microsecond timestamp across all three rows is the
signature of a manual or fixture-driven exercise of `logAIUsage` directly, not three separate
real API calls. **This is test/fixture data that reached the live table, not evidence of a
write-path bug losing real student attribution.**

## Full audit of the write path, not just the three rows

Grepped every real `logAIUsage`/`withUsageLogging` call site (12 files) for how `userId` is
threaded through:

- **9 student-facing features** (`research_generator`, `counselor_explanation`,
  `essay_story_bank`, `weekly_plan`, `advisor_chat`, `cv_extraction`,
  `achievement_refinement`, plus the admin-triggered `requirement_interpretation`) —
  every one of these has `userId: string` as a **required, non-nullable parameter at the
  TypeScript level**. There is no code path in any of them that could produce `userId: null`
  even if a caller wanted to; it would not compile.
- **2 background/catalog jobs** (`opportunity_extraction`, `requirement_extraction`) —
  deliberately pass `userId: null`. Both process opportunity/requirement source pages
  independent of any specific student, matching `logAIUsage`'s own pre-existing doc comment
  ("some callers... log usage from a background-job context with no authenticated user at
  all"). This is the honest value, not a dropped one.

**Conclusion: there is no live hole in per-student attribution.** The premise that motivated
this precondition (real spend going unattributed, letting an over-budget student pass unseen)
does not hold once checked against the actual write paths — every real student call is
structurally required to carry a `userId`.

## Why this doesn't leave a gap in the cap anyway — checked, not assumed

Even setting aside the above: `lib/ai/limits/budget.ts`'s monthly-spend query filters
`.eq("user_id", userId)`. A `NULL` row can never satisfy a specific-UUID equality filter in
SQL — this is true regardless of *why* a row is null. So even a legitimate background-job
null row is automatically excluded from every student's own budget calculation, by
construction, not by a check that has to be remembered. The two real null-producing paths
(background jobs, deleted-profile cascade) were never going to be counted as a student's own
spend in the first place, because they were never a student's own spend.

## What was still done, given the audit's honest conclusion

**Made the contract explicit anyway** — worth doing even without a live bug, since
`ai_usage.user_id`'s meaning was previously only inferable from the FK definition and this
document. `supabase/migrations/0076_ai_usage_degrade_columns.sql` (same migration as the
spend-cap's own degrade-tracking columns, both `ai_usage` schema changes, kept together)
adds a `COMMENT ON COLUMN` stating the two legitimate NULL cases plainly and the reason a
per-user budget query is unaffected either way. **Not applied** — founder-gated, per this
package's own constraints, exactly like every other schema change proposed tonight.

**Not done:** deleting the 3 test rows. That's a live `DELETE`, outside "no live writes."
Recommending cleanup, not performing it — they're harmless to the cap (excluded automatically,
per above) but worth removing so a future person doesn't independently re-investigate the
same three rows without this document in hand.

## What this means for the cap built on top of it

`lib/ai/limits/budget.ts` was safe to build directly against live `ai_usage` reads without
any defensive workaround for the null rows — there was nothing to work around. The module
does still defend against a **different, real** gap this audit surfaced while reasoning about
correctness: `estimated_cost` can be NULL on a row with a *real* `user_id`, if that row's
`model` was priced against a model string absent from `pricing.ts` (e.g. `ANTHROPIC_MODEL`
gets bumped before the pricing table is updated to match). `SUM()` silently ignores NULLs, so
that scenario — not the one this precondition was written to investigate — really could have
under-counted a real student's spend. `selectModelForUser` treats any unknown-cost row this
month as sufficient reason to degrade defensively, documented in its own comment.
