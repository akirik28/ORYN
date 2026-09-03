# Does a real advisor generation fit inside Vercel's function duration limit?

**Date:** 2026-09-03. **Why this doc exists:** the founder bought `proxola.com` tonight and is
deciding whether Vercel Pro ($240/year) is worth it, ahead of this app's first real deployment.
The stated reason to lean toward Pro was that Hobby's function-duration ceiling is "much
tighter" than Pro's — flagged up front as a recollection, not a lookup, with an explicit
instruction to check it directly rather than trust anyone's memory of a number that moves.
It doesn't hold. This doc measures 20 real advisor/weekly-plan generations through the actual
production code path, against Vercel's current, sourced duration limits, and states the margin
plainly.

**Bottom line, up front:** the slowest of 20 real calls took 55.4s. Both Hobby and Pro give this
app a 300-second ceiling by default today. Function duration is not a reason to pay for Pro —
whatever else Pro is worth, it isn't this.

## The corrected numbers

Source: [vercel.com/docs/functions/configuring-functions/duration](https://vercel.com/docs/functions/configuring-functions/duration),
`last_updated: 2026-08-24` — fetched directly for this doc, not recalled.

| | Default | Maximum | Extended maximum |
|---|---|---|---|
| Hobby | 300s (5 min) | 300s (5 min) | — |
| Pro | 300s (5 min) | 800s (GA) | 1800s / 30 min (beta, opt-in per-function) |
| Enterprise | 300s (5 min) | 800s (GA) | 1800s / 30 min (beta, opt-in per-function) |

This is the table for projects using **Fluid Compute, which Vercel enables by default** for new
projects. It is *not* the table oryn-45's framing had in mind — there is an older, genuinely much
tighter table (Hobby 10s default / 60s max, Pro 15s default / 300s max) that still applies, per
the same docs, to projects **deployed before April 23, 2025 and not using Fluid Compute**. That
old table is where "Hobby much tighter than Pro" comes from, and it would have been the right
number to worry about for an older, non-Fluid project.

It doesn't apply here. Checked directly (read-only, via the Vercel MCP): the account's only team
is **"Stem and Buds," plan `hobby`**, and it currently has **zero Vercel projects** —
`list_projects` returns an empty list. Nothing has been deployed yet. Whatever project gets
created for this app, on either plan, will be a new project and will get Fluid Compute's current
defaults automatically — the top table, not the legacy one. There is no legacy-limits risk to
plan around.

Separately confirmed: this repo's `vercel.json` sets `maxDuration: 300` only for
`app/api/jobs/**` (the cron routes). The advisor Server Action carries no override, so it runs
under whatever the platform default is — 300s on both Hobby and Pro today.

## What was measured

The real, production-configured path end to end: context assembly (`buildStudentAdvisorContext`,
real DB reads), the opportunity-context lookup (`buildOpportunityContextText`), and the actual
model call (`provider.generateText` through `withUsageLogging`) — the same three steps
`generateAdvisorReply` (`lib/ai/advisor-chat.ts`) performs, in the same order, with the same
token budgets and prompt assembly. `generateWeeklyPlan` (`lib/ai/weekly-plan.ts`) was called
completely unmodified — it already accepts an injectable Supabase client, so no reconstruction
was needed there.

`generateAdvisorReply` itself doesn't expose an injectable client — it resolves one internally
via `cookies()`, which only works inside a real Next.js request. Outside that, it throws
immediately. So the advisor-chat measurement reconstructs `generateAdvisorReply`'s exact body
(same exported functions, same order, same `withUsageLogging` call) with one substitution: an
admin Supabase client at the two call sites that otherwise need `cookies()`. This is the same
"faithful reconstruction, not a call into the function itself" tradeoff `lib/ai/eval/harness.ts`
already documents and this session already wrote up in
`docs/eval-harness-capabilities-2026-09-03.md` — named here because it's the same caveat, not a
new one: if `generateAdvisorReply`'s real assembly changes and this script isn't updated to
match, a re-run of this measurement would silently grade a path production no longer takes.

Four conditions, 5 reads each, 20 real calls total, all against one Anthropic account and one
real seeded test profile ("Daniel Okafor" — the richest safe test profile in the database, used
deliberately so no condition is measuring a thin, fast-to-assemble context). `planTier` was
varied as a parameter to the reconstructed function, not by changing the account's actual stored
plan — isolating the token-budget effect from a confound where a different account also happens
to have a different profile. The one real Ultra-tier profile in the database that looks like the
founder's own personal account was excluded from this measurement entirely, per the standing
rule against reading a real, non-test account without a reason specific to that person — not
even for a timing read.

- **`advisor_chat` / standard / balanced** — `ADVISOR_MAX_TOKENS_STANDARD = 4096`.
- **`advisor_chat` / ultra / balanced** — `ADVISOR_MAX_TOKENS_ULTRA = 8192`.
- **`advisor_chat` / ultra / thorough** — 8192 tokens plus `THOROUGH_INSTRUCTION` appended to
  the system prompt. Real production gating only applies "thorough" when `planTier === "ultra"`
  — there's no distinct standard/thorough behavior in the actual code, so that's not a fifth
  condition, it's a condition that doesn't exist.
- **`weekly_plan`** — `generateWeeklyPlan`, unmodified, `maxTokens: 2048` (flat, tier-independent
  in the real code).

Every call sent the same real 2-turn history and asked "Can you look at my whole profile and
tell me what I should prioritize for the rest of this semester, and why?" — a deliberately broad,
generation-heavy prompt, chosen so this measurement doesn't understate latency with an easy
question.

## Results

All times are wall-clock, `performance.now()`-measured around the real call. With n=5 per
condition, a genuine 95th percentile isn't statistically meaningful — max is reported instead of
an interpolated p95, as the honest stand-in for "worst case observed" rather than dressing up 5
samples as more precision than they support.

| Condition | min | p50 (median) | max (≈ p95) | mean |
|---|---|---|---|---|
| advisor_chat / standard / balanced | 24.9s | 36.1s | 45.0s | 35.1s |
| advisor_chat / ultra / balanced | 30.9s | 36.5s | 43.3s | 36.1s |
| advisor_chat / ultra / thorough | 40.3s | 45.1s | **55.4s** | 47.2s |
| weekly_plan | 12.9s | 15.5s | 17.3s | 15.3s |

Raw per-read values (ms), in run order:

- standard/balanced: 38250, 45041, 31256, 36078, 24850
- ultra/balanced: 36467, 43276, 38834, 31174, 30850
- ultra/thorough: 55404, 45066, 44802, 50520, 40263
- weekly_plan: 17322, 17236, 12914, 15517, 13698

Ultra/thorough is the slowest condition, consistently — expected, since it's both the larger
token budget and the only condition that asks the model for more output. Standard and
ultra/balanced land close to each other; the token-budget ceiling alone doesn't move real
latency much when the model doesn't need the extra room. Weekly-plan is consistently the
fastest of the four, well under half of any advisor-chat condition.

## Margin against the ceiling

Both plans give this app a 300s default ceiling today (see above). Against that:

| Condition | Worst observed | % of 300s budget | Headroom |
|---|---|---|---|
| advisor_chat / standard / balanced | 45.0s | 15.0% | 255.0s (6.7×) |
| advisor_chat / ultra / balanced | 43.3s | 14.4% | 256.7s (6.9×) |
| advisor_chat / ultra / thorough | 55.4s | 18.5% | 244.6s (5.4×) |
| weekly_plan | 17.3s | 5.8% | 282.7s (17.3×) |

The worst single call across all 20 reads — 55.4s, an ultra/thorough advisor reply — used under
a fifth of the shared 300s ceiling. There is no condition here, on either plan, that comes close
to the limit.

None of the 5 real `weekly_plan` reads triggered the schema-validation retry path documented in
`anthropic-provider.ts` (no retry-related output in any of the 5 runs), so this sample doesn't
directly capture a retried call's duration. Given every observed weekly-plan call completed in
12.9–17.3s, even a full retry — roughly double the single-call cost in the worst case — would
land near 25–35s. Still far under 300s.

## Surrounding Server Action overhead — a bounded estimate, not a direct measurement

`sendAdvisorMessage` (`app/(app)/advisor/actions.ts`) wraps the generation call with real work
this measurement doesn't include directly: auth (`requireUser`), a burst rate-limit check
(`assertWithinAIRateLimit`), tier/quota resolution (`getCurrentProfile`, cache-deduplicated),
conversation lookup or creation, a history fetch, a generation-lock acquire, and — after
generation — a message insert and a lock release. All of this sits inside the same function
invocation as the model call, so it counts against the same 300s.

Reconstructing each of these individually risked repeating the same mistake this session already
made once tonight and corrected (see below) — bypassing a real resilience layer and measuring a
path production doesn't actually take. Instead, two representative query shapes were profiled
directly with `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` against the real database: a rate-limit
check (0.083ms Postgres engine time) and a history fetch (4.375ms engine time). Both numbers are
**engine time only** — they exclude the network and PostgREST round-trip, which this measurement
has no way to observe from outside a real request.

Even a generous bound — 8 such operations at up to 100ms each, well above anything the two
measured shapes suggest — adds under a second. Against 244–283 seconds of headroom, this doesn't
change the conclusion. It's named here as a bounded estimate, not folded into the results table,
because it wasn't measured the same way the rest of this doc was.

## What this measurement cannot tell you

This ran locally, once per condition set, against the real database and the real Anthropic API —
but not on Vercel. It does not include:

- **Cold starts.** A function that hasn't run recently pays a startup cost this measurement
  never pays.
- **Regional latency to Anthropic.** This machine's network path to the API is not Vercel's.
- **Any other Vercel infrastructure overhead** — routing, the platform's own request handling,
  anything specific to running inside their function environment rather than a local process.

**This is a floor, not a prediction.** A real deployed call will likely be slower than every
number in this doc, possibly by a meaningful amount. The headroom margins above (5.4×–17.3×) are
large enough that they'd absorb a substantial amount of added latency and still not approach
300s — but "large margin against a local floor" and "confirmed to fit once deployed" are
different claims, and only the first one is what this doc actually shows.

## Two unrelated bugs surfaced along the way

Neither is new, neither was introduced by this measurement, and neither is fixed here — this
task was explicitly latency-only, no code changes. Flagging both since they're real and
currently silent in production.

**1. A float value is being written to an integer column.** Every real call into
`getCounselorRecommendations` that reaches the opportunity-matches upsert fails with
`invalid input syntax for type integer: "48.33333333333333"`. It's caught — real production
resilience in `refreshOpportunityMatches` — so it doesn't surface to the student, but it means
this particular user's opportunity matches are silently never being persisted by this path. Some
upstream computed "hours" value is a float landing on an integer-typed column.

**2. `getTranslations` throws when called outside a request/render context.** Inside the same
counselor-recommendations path, `notifyNewlyEligibleMatches` calls `next-intl`'s
`getTranslations`, which only works in a real Client/Server Component render — not from a
background-style call. Also caught (`generateWeeklyPlan`'s own "failed to fetch counselor
grounding, continuing without it" wrapper), so weekly-plan generation degrades gracefully — but
degrades every time, for this user, in real production, not just in this measurement. Weekly
plans for this account are currently generated with zero counselor grounding, silently.

Both were first hit by an earlier, since-corrected version of this measurement's own script,
which called `getCounselorRecommendations` directly instead of through
`buildOpportunityContextText`'s real try/catch wrapper — that first attempt was bypassing real
production resilience, not exercising a code path production doesn't have. The fix was to go
back to calling the unmodified, real wrapper. Both bugs above are real regardless — they reproduce
identically through the real, unmodified functions this final measurement actually used.

One more thing worth naming as a measurement-methodology caveat, not a third bug: a one-time
`assembleScoringFacts` warning ("JWT issued at future," `failedCategories` varying between
`courses` and `activities` across two separate runs) appeared once per full run, likely an
artifact of substituting an admin-role JWT for a real per-request user session JWT rather than
anything a real student would hit. Noted for completeness, not treated as a finding.

## Bottom line

At today's real, measured latencies — 12.9s to 55.4s across 20 real calls, worst case under a
fifth of the shared 300-second ceiling — Vercel's function duration limit is not a reason to
choose Pro over Hobby for this app. Both give the same 300s ceiling by default, since Fluid
Compute applies automatically to the new project this deployment will create. If Pro is worth
$240/year, it has to be justified by something else — usage limits, team features, support,
bandwidth — not by function duration, because duration isn't close to being the constraint here.
