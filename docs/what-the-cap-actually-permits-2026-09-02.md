# What the spend cap actually permits per student — 2026-09-02

The founder set **$0.50/student/month as the target and $1.00 as the absolute ceiling**
("en fazla 0.5 çıksın, 1 dolar olsun"). The cap built tonight degrades to a cheaper model at
the target and, deliberately, never hard-stops — their explicit choice, and the right one for
a 16-year-old mid-question.

Nobody had computed what that mechanism permits **in dollars**. This is that number.

## The worst case is ~$3.83, not $1.00

Every input below was measured tonight, not estimated:

| | |
|---|---|
| Advisor message, Sonnet 5 | **$0.035** (~1,600 in + ~2,000 out at $3/$15 per M) |
| Advisor message, Haiku 4.5 | **$0.0116** ($1/$5 per M) |
| Degrade threshold | **$0.50** measured spend this month (`MONTHLY_BUDGET_TARGET_USD`) |
| The only hard stop that exists | **`advisor_chat: 300` messages/month** (`MONTHLY_AI_QUOTAS`) |

```
  15 messages on Sonnet before spend crosses $0.50 ....... $0.53
+ 285 remaining messages on Haiku (285 × $0.0116) ........ $3.31
                                                          ------
  advisor alone, one student, one month .................. $3.83
```

**That is 3.8× the stated ceiling**, and it is reachable without any abuse — 300 messages
across a month is ten a day. Weekly plans, CV imports and counselor explanations sit on top
of it; **none of them has a monthly quota at all**, so nothing bounds them except the burst
limiter and how often a student clicks.

## This is not a defect in the cap

`budget.ts` says outright that `MONTHLY_BUDGET_CEILING_USD` is a monitoring number, not a
second gate, and that a hard stop is "a product decision for the founder to make explicitly,
not an inference from 'ceiling' sounding stricter than 'target'." That reasoning is correct
and I would not overturn it unasked.

What was missing is the arithmetic. "Degrades but never stops" and "costs at most a dollar"
are incompatible, and until now only the first half had been decided.

## Perspective, so this isn't read as an emergency

**This is a tail risk, not an expectation.** Live `ai_usage` across six users: five are under
**$0.25 lifetime**. The one outlier reached $3.04 in a week, and that was ~100 clicks on a
regenerate button whose duplicate-suppression has since landed. Nobody has ever approached
300 advisor messages.

So the honest framing is: the *expected* cost per student is comfortably inside the founder's
target, and the *maximum* is roughly four times their ceiling. Both are true, and only the
first has been visible until now.

## The options, costed

Each is a founder decision; none is implemented.

1. **Lower the advisor quota.** At **130 messages/month**, worst case lands at ~$1.02 — the
   stated ceiling almost exactly. Simplest change, and it converts an unbounded soft mechanism
   into a bounded one without introducing a wall the student meets in normal use. 130 is still
   more than four messages a day.
2. **Add a second degrade step** — a shorter `max_tokens` once past the target, since output
   is 86% of an advisor message's cost. Halving output on the degraded path takes the worst
   case to roughly $2.20. Cheaper than option 1 in student experience, less effective.
3. **Enforce the ceiling as a real stop at $1.00.** Bounds the cost exactly, and reintroduces
   the wall the founder explicitly rejected. Listed for completeness, not recommended.
4. **Accept it**, knowing the number. Defensible while the cohort is eight students, and the
   decision should be revisited before any real cohort exists.

**My recommendation is option 1**, with option 2 alongside it if the reply-length work
currently in flight proves out — they compose, and together they land the worst case near
$0.60.

## What this does not cover

Weekly plan, CV extraction and counselor explanation have no monthly quota, so their
contribution to a worst case is unbounded and not modelled here. Background jobs
(`opportunity_extraction`, `requirement_extraction`) have no budget of any kind — that is a
separate piece of work already assigned, and it is the one that scales with the catalogue
rather than with students.
