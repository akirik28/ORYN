# Tier proposal — 2026-09-02

The founder asked for free/mid/premium tiers and set a cost constraint: **$0.50 per student
per month target, $1.00 ceiling.** Three research packages and a night of cost measurement
are now in. This is the recommendation, with the numbers it rests on and the two tensions it
does not resolve.

## What a budget actually buys

Every unit cost measured from real assembled prompts on 2026-09-02, not estimated.

Fixed monthly floor — four weekly plans plus thirty counselor explanations, which every
active student gets:

| | Sonnet 5 | Haiku 4.5 |
|---|---|---|
| fixed floor | $0.266 | **$0.089** |

What remains, spent on advisor messages:

| budget | all Haiku | all Sonnet |
|---|---|---|
| **$0.50** (target) | **35 msg/mo** — 1.2/day | 7 msg/mo — 0.2/day |
| **$1.00** (ceiling) | **79 msg/mo** — 2.6/day | 21 msg/mo — 0.7/day |

For contrast, today's shipped design — everyone on Sonnet, degrading to Haiku at $0.50, with
a 300-message quota — permits a worst case of **$4.10**.

## The recommendation

**Free tier: everything on Haiku, 75 advisor messages a month. ~$0.96 per student.**

Sized to the **ceiling**, not the target, and that is the substantive choice in this
document. $0.50 buys 35 messages — barely one a day — and the comparison that matters is not
against zero:

- **Grammarly gives 100 free AI prompts a month.** Quizlet and Duolingo both give a real,
  usable daily allowance before any wall.
- **CollegeVine's Sage — the closest analog anyone found, same age group, same AI-advisor
  shape — is free and unlimited**, stated twice in their own FAQ. They can afford it because
  universities pay for access to opted-in students. ORYN has no second side.

A student arriving from any of those meets 35 messages as a restriction, not a gift. 75 is
2.5 a day, which is defensible against them; $0.96 is inside the founder's own stated
ceiling, which exists precisely for tradeoffs like this one.

**Do not launch paid tiers yet.** Not for economic reasons — for a legal one, below.

## Two tensions this does not resolve

**1. The cheap model is weakest exactly where the free tier lives.** Measured across 12
cases: Haiku scores **315/360** against Sonnet's 325 overall, and *beats* Sonnet on a sharp
profile (175 vs 164) — but **collapses on the ordinary one, 140 against 161**, with its worst
case at 16/30 and the judge calling it "verbose and repetitive… padded". The ordinary,
thin, unremarkable profile **is** the free tier's typical user. So the free tier is the cheap
model at its worst.

This is addressable and partly addressed — a prompt fix merged tonight removed the flagship
defect — but it is a real cost of the recommendation, not a footnote to it.

**2. Paid tiers are blocked on a legal question, not a product one.** The minor-payment
research found nothing that makes selling to a 14-to-18-year-old categorically illegal, but
also found that **"parent pays, student uses" does not dissolve the consent problem** —
payment authorization and data-processing consent are separate, and each needs its own
capture step. And whether the payer must be a parent determines **what a tier attaches to** —
if it attaches to a guardian rather than a student, a `tier` column on `profiles` is the
wrong data model.

So the tier scaffolding should not be built until that is answered. Free-only is not a
compromise here; it is the only shape that doesn't risk building the wrong entity.

## The thing most worth saying

**All of this is protecting against a tail that has not happened.** Real measured usage
across six students with any activity: **five are under $0.25 lifetime.** The one outlier
reached $3.04 in a week and that was ~100 clicks on a regenerate button whose
duplicate-suppression has since landed. **Nobody has ever approached 300 messages, let alone
75.**

So: **pick the ceiling, ship free-only, and revisit with real data.** The difference between
35 and 79 messages a month is currently a difference between two numbers no living user has
come close to. Setting a bound is prudent. Tuning it precisely, before a single real signup
exists, is not — and the eleven accounts in the database today are all QA.
