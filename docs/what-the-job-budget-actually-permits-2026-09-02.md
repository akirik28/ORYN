# What the per-job AI budget actually permits — 2026-09-02

Companion to `docs/what-the-cap-actually-permits-2026-09-02.md` (the per-student cap's own
worst-case arithmetic, main `91fa592a`) — CEO's finding there ("degrades but never stops" and
"costs at most a dollar" are incompatible) is exactly the question this job budget had to
answer for itself before being built, not after it shipped.

## The mechanism is different on purpose, and the arithmetic reflects it

`lib/ai/limits/job-budget.ts` stops rather than degrades once a feature is over its monthly
figure (see that file's own header for the full reasoning — a job stopping early costs
nothing worse than doing the same work tomorrow; a student hitting a wall does). That
difference isn't just behavioral, it changes what the mechanism permits in dollars:

| | opportunity_extraction | requirement_extraction |
|---|---|---|
| Monthly budget | $25.00 | $15.00 |
| Cost/call — **ESTIMATED**, neither job has ever run, no measured `ai_usage` data exists yet | ~$0.017 | ~$0.025 |
| Checked | before every call, against month-to-date spend | before every call, against month-to-date spend |
| Worst case within the month | $25.00 + one more call ≈ **$25.02** | $15.00 + one more call ≈ **$15.03** |

The overshoot is bounded to roughly one call's cost, not a multiple of the budget, because the
check runs fresh before every call and the response to being over budget is "stop," not "keep
going at a discount." Once tripped, every later call this calendar month — including the next
several nights' scheduled runs — sees the same over-budget state on its very first candidate
and refuses immediately (`__tests__/requirements/discover-batch-budget.test.ts`'s "the batch
stops... universities are never started" cases confirm this directly). **Combined worst case
across both features, one month: ~$40.05 — for practical purposes, the two configured budget
figures themselves, not a multiple of them.**

## One residual gap, named rather than assumed away

The bound above is single-threaded — it holds within one job run's sequential loop, where
calls happen one at a time and each check reflects every prior call's actual, already-written
spend. It does **not** hold across two *concurrent* invocations of the same feature (a manual
`curl` trigger overlapping the scheduled cron, or a Cron retry): both could independently read
"under budget" before either one's `ai_usage` row lands, each then making one more call than
the single-threaded analysis assumes. Bounded — at most a small constant multiple of "one more
call," not unbounded — but real, and not eliminated by this package. The same class of race
this codebase already documents and accepts elsewhere (`lib/plan/persist.ts`'s own comments on
`buildActionStatusPatch`'s two-call race, and the `ai_recommendations`/`notifications` dedup
`.limit(1)` comments), not a new risk specific to this file.

## Why this doesn't need the same fix the student cap does

CEO's finding on the student side was that the *stated* ceiling ($1.00) and the *actual*
mechanism (degrade-and-keep-going, bounded only by an unrelated 300-message quota) were
incompatible by 3.8×. This file was designed after that shape of problem was already visible
in the student case — "stop," not "degrade," was chosen specifically so a job's worst case
would be legible and close to its own configured number, rather than dependent on some other,
unrelated limit. The $25/$15 defaults are still estimates pending real measured data (see
`job-budget.ts`'s own header for the volume/pricing math behind them) and are
env-var-overridable (`AI_JOB_BUDGET_OPPORTUNITY_EXTRACTION_USD`,
`AI_JOB_BUDGET_REQUIREMENT_EXTRACTION_USD`) once real data exists to check them against — but
the *shape* of the guarantee (worst case ≈ configured budget, not a multiple of it) doesn't
depend on getting those two numbers exactly right on the first try.

## What this means once the student side is fixed

CEO's own note applies here too: if the advisor quota drops to ~130 messages/month (their
recommendation, landing the student worst case at ~$1.02), background jobs stop being a
footnote and become the larger of the two spend categories — **$40.05/month worst case here**
versus roughly $1–8/month for a small cohort of students each near their own new ceiling. Both
figures are now visible; which total the founder is comfortable with is their call, not implied
by either package alone.
