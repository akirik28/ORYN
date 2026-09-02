# What would Ultra actually buy — 2026-09-02

**Status:** research only. No code, no migration, no live write. `lib/ai/monthly-quota.ts`
read but not touched — oryn-f5's territory tonight. Every claim below is grounded in code
read for this pass, not carried over from memory or inferred from a filename.

**The premise, checked first:** grepped `plan_tier`/`ultra` (case-insensitive) across `app`,
`features`, `lib`, `components`, `types`, `supabase` on `main` myself before writing anything
— zero matches, confirming the CEO's own count. **There is no tier concept in the shipped
product today.** Everything below is an inventory of what a tier *could* turn on, not a
description of anything that currently branches on one.

## 1. What is metered today — the full census, not just the quota

`MONTHLY_AI_QUOTAS` (`lib/ai/monthly-quota.ts`, read, not edited): exactly one entry,
`advisor_chat: 300`. Confirmed.

**Every distinct AI-backed feature, found by grepping every `feature:` string passed to
`logAIUsage`/`withUsageLogging` — ten, matching the standing finding's own count exactly, but
the ten split into shapes that matter more than the raw ratio:**

| Feature | Monthly quota | Burst limit | What it actually is |
|---|---|---|---|
| `advisor_chat` | **300/mo** | 30/10min | Student-facing, fully metered |
| `weekly_plan` | none | 5/60min | Student-facing, burst-only |
| `essay_story_bank` | none | 10/60min | Student-facing, burst-only |
| `cv_extraction` | none | 5/60min | Student-facing, burst-only |
| `achievement_refinement` | none | 20/30min | Student-facing, burst-only |
| `research_generator` | none | 10/60min | Student-facing, burst-only |
| `opportunity_extraction` | none | none | **System-wide** background job, own $25/mo budget — no student attached |
| `requirement_extraction` | none | none | **System-wide** background job, own $15/mo budget — no student attached |
| `requirement_interpretation` | none | none | **Admin-only** — `requireAdmin()`-gated, a catalog tool, never reachable by a student |
| `counselor_explanation` | none | none | **Dead in production** — its only caller anywhere in the codebase is the eval harness (`lib/ai/eval/harness.ts`); no Server Action, no page, calls it |

**The standing finding — "the quota covers 1 of 10 features, messages are the wrong
denominator" — is still literally true, re-verified fresh rather than trusted.** But the more
useful count for this question is narrower: **of the ten, six are things a student can
actually trigger. Of those six, one has a monthly number and five have only a burst guard.**
The other four aren't a metering gap in the sense that matters here — two are system-wide job
costs no single student's tier could scope, one is internal admin tooling, one doesn't run at
all yet.

## 2. The levers that already exist, and what turning each tier-dependent would cost

- **Monthly quota (`MONTHLY_AI_QUOTAS`)** — a plain object literal, one key per feature. Adding
  a tier axis is genuinely a config change: either a second table
  (`MONTHLY_AI_QUOTAS_ULTRA`) or turning the value into `{ standard: number; ultra: number }`
  and threading a tier lookup into `getMonthlyQuota`'s one call site per feature. **Config
  change**, not a rewrite — the read/enforce plumbing (`getMonthlyQuota`,
  `isMonthlyQuotaExhausted`) doesn't care where the number came from.
- **Burst limit (`assertWithinAIRateLimit`)** — already takes `{ maxCalls, windowMinutes }` as
  a parameter at every one of its six call sites, not a hardcoded constant inside the
  function. Making these tier-dependent is picking a different literal per call site based on
  a tier already known to the caller (session/profile). **Config change** at each call site,
  same shape six times over — not a new mechanism.
- **`budget.ts`'s per-user spend degrade (`MONTHLY_BUDGET_TARGET_USD` $0.50 /
  `MONTHLY_BUDGET_CEILING_USD` $1.00)** — currently one global threshold for every student.
  Making this tier-aware needs `selectModelForUser` to look up the caller's tier and branch the
  threshold, not just a constant edit — a **small, contained code change**, not a rewrite: the
  function already takes `userId` and does exactly one lookup: adding a second lookup (or a
  join) for tier is the same shape of change, not new architecture.
- **Model selection (`DEGRADE_MODEL`, `env.anthropic.model`)** — currently two global model
  strings, chosen by budget status alone. A tier-aware version (e.g., Ultra never degrades
  below Sonnet) is the same kind of change as the budget threshold above — add a tier read,
  branch on it — because the call-time model selection is already the single place every AI
  call routes through. **Small code change**, not a rewrite.
- **`job-budget.ts`'s per-feature spend cap** — checked directly and this one doesn't
  generalize the same way as the others: it has no student in scope at all (`selectModelForUser
  (null)`'s own documented reason — there's no one to attribute background-catalog spend to).
  There is no "Ultra's opportunity_extraction budget" to raise, because the job serves every
  student's shared catalog at once. **Not a tier lever** — raising it would need to be a
  product decision about the whole catalog's freshness, unconnected to who's paying.
- **Job refresh frequency** — same shape as job-budget: `sync_us_universities`,
  `discover-opportunities`, etc. write to shared, catalog-wide tables. A faster refresh
  benefits every student reading that data, Standard included — there's no way to scope "sync
  runs more often" to one tier's own view of a shared table without forking the data itself,
  which is a materially bigger change than anything else on this list.

## 3. Capped by cost vs. capped by design — sorted, not conflated

**Cost-based (legitimate tier levers — the limit exists because tokens cost real money):**
monthly quota, burst limits, the per-user spend degrade threshold, model selection. All four
answer "how much of this can we afford to give this specific student," which is exactly the
question a paid tier is allowed to answer differently for different payers.

**Design-based (not for sale, checked in code rather than assumed from the spec):**
`WeeklyPlanSchema`'s `actions: z.array(WeeklyActionSchema).min(1).max(3)`
(`lib/ai/weekly-plan.ts:33`) — a hard Zod-validated ceiling, not a cost artifact. Three actions
is the number AGENTS.md's own design principle names directly: the dashboard emphasizes the
top three, not twenty metrics, and Phase 38's whole prioritization engine exists so that three
is *enough*, not a budget shortfall. **Selling "Ultra gets ten priorities instead of three"
would sell the opposite of what this product is for** — more activity, when the entire
product thesis (Phase 38, the "avoid_for_now" mechanism, the advisor's own
"I would not prioritize another club" example in the founder's own spec) is that quantity is
usually the wrong axis to optimize. Refuse this one specifically if it comes up, not because
it's technically hard (raising `.max(3)` to `.max(10)` is trivial) but because it's the one
place the whole product's honesty is riding on staying small.

## 4. The honest floor

**If Ultra shipped today with zero new capability work, here's what would actually be true to
say it buys, and nothing more:**

- A visual treatment (the Ultra prototype/foundation oryn-4e is building, map pins once that
  lands) — real, already approved, not a metering question at all.
- A bigger `advisor_chat` allowance — the one feature with a real monthly number today, so
  "more advisor conversations per month" is the one quota claim that's honest without any new
  plumbing beyond adding a tier-keyed number.
- Faster response quality under load — raising the per-user spend ceiling before the model
  degrades to Haiku is a real, sellable difference, though it needs the small code change in
  §2, not zero code.

**What it would not honestly buy without more work than "flip a tier flag":** more of
`weekly_plan`/`essay_story_bank`/`cv_extraction`/`achievement_refinement`/`research_generator`
— all five are burst-protected only, no monthly ceiling exists to raise yet, so "more of
these per month" isn't a real lever until one gets built, not just turned on. And nothing
touching `opportunity_extraction`/`requirement_extraction` refresh speed or coverage, since
those serve the shared catalog every tier reads from — there's no version of "buy faster
catalog updates" that doesn't also improve Standard's own view of the same tables.

**The short true list, stated plainly: Ultra is a visual treatment and a bigger advisor
allowance today. A second, real lever (the spend-ceiling raise) is close — a small, scoped
code change, not a new mechanism. Everything past that needs either new plumbing (monthly
quotas for the other five student-facing features) or isn't a tier question at all (the two
job budgets, the 3-action design cap). That's the list — not because more couldn't be built,
but because more isn't true yet.**
