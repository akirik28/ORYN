# Opportunity cost coverage — measurement and two schema questions

**Status:** measurement + design questions for the founder. **No database was written. No
migration applied.** The two runtime fixes this investigation led to (the advisor's fee
caveat, and `isPayToEnroll`'s disclosure) are built and covered separately — see
`lib/ai/fee-text.ts` and `lib/opportunities/commercial.ts`. This document is the two
findings that are schema questions, not code fixes: they need a founder decision about
what the data should look like before a backfill is worth running.

**Date:** 2026-09-03. **Dispatch:** oryn-a7, following bd's identical-shaped finding on
`minimum_age`/`maximum_age` coverage the same night — "measure first, propose second,
nothing to live."

---

## The numbers, query beside each one

282 active opportunities, confirmed live against `oryn-qa-scratch`:

```sql
select count(*) total_active, count(cost) has_cost, count(*) filter (where cost=0) cost_zero,
  count(financial_aid_available) has_financial_aid_flag, count(funding_available) has_funding_flag
from opportunities where status='active';
```
→ `total_active: 282`, `has_cost: 98` (34.8%), `cost_zero: 41`, `has_financial_aid_flag: 102`
(36.2%), `has_funding_flag: 10` (3.5%)

184/282 (65.2%) carry no cost figure at all — within two points of bd's 67% on age.

```sql
select (cost is not null) has_cost, (financial_aid_available is not null) has_aid_flag, count(*)
from opportunities where status='active' group by 1,2 order by 1,2;
```
→ neither: **141 (50.0%)** · aid-flag only: 43 (15.2%) · cost only: 39 (13.8%) · both: 59 (20.9%)

Half the catalogue has zero cost-related signal of any kind — not a dollar figure, not an
aid flag, nothing.

```sql
select min(cost), max(cost), percentile_cont(0.5) within group (order by cost) median_cost,
  count(*) filter (where cost > 0) positive_cost_n
from opportunities where status='active' and cost is not null;
```
→ range $0–$15,192, median $345 among the 98 priced rows, 57 with a genuinely positive figure.

---

## Question 1 — two columns for one concept, mutually exclusive by construction

`financial_aid_available` (36.2% coverage) is written by exactly one pipeline:
`lib/opportunities/ingest.ts`, the manual research-handoff path
(`docs/research-handoff-opportunities.md`'s contract). `funding_available` (3.5% coverage)
is written by exactly one different pipeline: `lib/ai/opportunity-extraction.ts` → the
automated discovery job (`lib/opportunities/discover.ts:92`). The extraction schema's own
field description calls it *"funding/financial aid"* — the same concept, in the writer's
own words, landing in a column the manual pipeline never touches and vice versa.

**Today.** Checked directly, not inferred: neither pipeline reads or writes the other
column. A record ingested through one path structurally cannot have the other path's flag
set, regardless of what's actually known about it. No code anywhere reconciles the two —
confirmed by grepping every file under `lib/opportunities/`, `lib/ai/`, and `lib/counselor/`
for both column names.

**Must.** One concept ("does this opportunity have money available to reduce or cover its
cost for a student") should resolve to one signal a caller can trust, regardless of which
pipeline touched the record.

**Change — not implemented, founder's call.** Two live shapes, not one obviously-correct
answer:

- **Merge into a single column.** Requires deciding which pipeline's semantics win where
  both happen to have written something (today: never, by construction, so no real
  conflict exists yet to resolve — but a future record could plausibly go through both
  paths at different times), and a migration to rename/consolidate plus backfill code in
  both writers.
- **Keep both, but read both everywhere a caller currently reads one.** Smaller change,
  but permanently carries the two-pipeline seam into every future reader, and the
  automated pipeline's extraction prompt would need its own field description reconciled
  with what the manual pipeline's researchers are actually told to record — right now
  nothing guarantees the two describe the same bar for "aid available."

Whichever direction, the fix belongs with a founder decision about which pipeline's
definition is authoritative, not a code-only call.

---

## Question 2 — a schema that can't hold data someone already found

The concrete example in oryn-a7's original dispatch is real, and it's a sharper case than
plain missing data:

```sql
select * from opportunities where id = 'c7c21f3f-fb33-4c6c-be76-66da4df0535d'; -- BUTI
```

Boston University Tanglewood Institute — `cost: null`, `financial_aid_available: true`.
The real, fully-researched price is sitting in `current_cycle_label`, a column documented
in `types/database.ts` for *"which cycle `cycle_status`/`deadline` describe"* — not cost:

> "Summer 2026 (60th-anniversary season); extended application deadline January 25, 2026.
> **2-week programs $4,055, 3-week $5,665, 4-week $6,995, 6-week $8,865, 8-week $10,205**
> (tuition + room & board + fees). This cycle has already concluded as of this research."

**Today.** `opportunities.cost` is a single `number | null`. BUTI runs 25 individual
programs, 2 to 8 weeks depending on discipline, at five different price points. There is
no structured place to put "the price depends on which of five tracks you pick" — so the
researcher who found and verified all five figures had nowhere to record them except free
text, and picked the field whose free-text nature was most forgiving, which happens not to
be a cost field at all.

**This means the 65.2%-null figure above is not a clean "unresearched" number.** Some
unknown share of it is BUTI's shape: real, verified pricing that exists in the corpus but
in a column no cost-aware code will ever read (`lib/opportunities/matching.ts`'s
eligibility/scoring, `lib/opportunities/commercial.ts`'s pay-to-enroll gate, and
`lib/ai/fee-text.ts`'s advisor caveat all read `cost` specifically, never
`current_cycle_label`). The true "genuinely unresearched" share is smaller than 65.2%; how
much smaller isn't measurable without reading every `current_cycle_label` for pricing
language, which this pass didn't do.

**Must.** A cost model that can represent "this genuinely varies by track/duration," so a
researcher who finds tiered pricing has somewhere real to put it, and so that data reaches
the same code paths a flat number does today.

**Change — not implemented, founder's call.** Shape options, roughly in order of how much
they cost to build:

- **A cost range** (`cost_min`, `cost_min` alone with a "starting at" convention, or a
  `cost_min`/`cost_max` pair) — cheapest schema change, loses the tier structure itself
  (which specific duration costs what) but would let BUTI report `cost_min: 4055` and
  become visible to every existing cost-aware function immediately, no logic changes
  needed beyond reading a different column name.
- **A genuine tiers table** (`opportunity_cost_tiers`: one row per duration/track with its
  own price) — represents the real shape faithfully, but every consumer (`matching.ts`,
  `commercial.ts`, `fee-text.ts`) would need a "which tier" or "cheapest tier" decision
  before it could use a single number again, which is real design work, not a backfill.
- **Leave `cost` as-is, add a `cost_notes` free-text field parallel to it** — smallest
  change, but re-creates today's problem one layer down: a `cost_notes` an admin can read
  but no matching/advisor code can act on is the same silent-treatment gap this whole
  investigation is about, just moved to a differently-named column.

**The backfill for Question 1 and any cost-completeness push on Question 2 should wait on
this decision.** Filling `cost` for every record that currently has a real number *somewhere*
in the row, using today's scalar shape, means re-doing that backfill by hand again the
moment the shape changes — filling a column whose shape is wrong bakes the wrong shape in.

---

## What already shipped, separately from this document

Two runtime fixes, built same night, not schema changes:

1. **`lib/ai/fee-text.ts`'s `formatFeeCaveat`** now has three distinguishable outputs —
   confirmed-free (silent, unchanged), priced (fee warning, unchanged), and unknown (new:
   an explicit "cost not on file, do not assume free" caveat). Reaches the advisor chat
   (`lib/ai/opportunity-context.ts`) and weekly-plan generation
   (`lib/ai/weekly-plan.ts`) — confirmed by running both surfaces' tests with a null-cost
   fixture and checking the rendered text, not just the unit function.
2. **`lib/opportunities/commercial.ts`'s `judgePayToEnroll`** gives `isPayToEnroll` a
   disclosure companion — `"cost_unverified"` as its own outcome, distinguishable from
   `"not_pay_to_enroll"` (a real, checked free/nominal/selective programme). `isPayToEnroll`
   and `competesInCoreRecommendations` keep their exact existing behavior (a null-cost
   record still competes in core recommendations — excluding it would drop half the
   catalogue and trade a disclosure bug for a discovery one, the same call already made for
   missing age); the new function exists so a caller that needs the distinction can get it
   without disturbing the one that doesn't.

Neither fix touches the schema questions above. Both are true regardless of which way
Questions 1 and 2 are eventually decided.
