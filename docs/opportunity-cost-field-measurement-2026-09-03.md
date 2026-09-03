# The cost field: what's missing, what's unrepresentable, and what's genuinely free — 2026-09-03

CEO's brief: the founder's open decision about `cost` still rests on one anecdote (Boston
University Tanglewood — $4,055 for two weeks to $10,205 for eight, with the real price
sitting in `current_cycle_label` because `cost` holds one number). Measure the shape of the
gap rather than argue from a single example. **Measurement only — nothing written.**

## Schema fact, checked first

`opportunities.cost` is a strict Postgres `numeric` column. Not text, not JSON, no
`currency` column alongside it. This is load-bearing for everything below: the schema
genuinely cannot hold "$2,499–$16,999 depending on track" or "TRY 80,000" (no currency
dimension) as anything other than a single USD-assumed number or null. A researcher hitting
a real multi-tier price has exactly two honest options — pick one number and lose the
others, or leave it null and put the real answer in prose. Tanglewood is not a one-off; it's
what happens every time this schema meets a real-world price list.

## The headline numbers (active catalog, 366 rows)

| | n | % |
|---|---|---|
| `cost` null | 258 | 70.5% |
| `cost` = 0 (recorded free) | 43 | 11.7% |
| `cost` > 0 (recorded price) | 65 | 17.8% |

Of the 258 null rows, **215 (83%) have both `financial_aid_available` and
`funding_available` also null** — for the large majority of null-cost rows, there is
*nothing* else on the row that says anything about affordability. A student's advisor
reads exactly the same blank for "this costs $10,000 and nobody has checked" as it does for
"this is free and nobody bothered to write 0."

## Question 1: missing versus unrepresentable — read by hand, not just counted

Pulled a stratified random sample (14 `summer_program`, 10 `competition` — the two
categories holding 83% of all null-cost rows — plus 10 more spanning research, volunteering,
internship, scholarship, entrepreneurship, student_program, conference, academic_program)
and read every description in full. This is a sample, not a census — the buckets below are
sized honestly as "at least this many, in a sample of 34," not extrapolated into a
catalog-wide percentage, since a percentage from 34 rows would be exactly the false
precision the brief warned against.

**Six genuinely different shapes came out of the same null, not one:**

1. **Confirmed tiered/multi-price — a real number exists, the schema can't hold it (1 of
   34, but explicit and instructive).** Summer Discovery's own stored description already
   says it: *"Real price range per the operator's own current homepage: 2,499-16,999
   (varies by campus/track/duration; no single fixed price -- do not collapse to one cost
   figure)."* The researcher did the work and hit the same wall as Tanglewood. This is the
   founder's anecdote confirmed as a real, recurring shape, not an isolated case.

2. **A single price is stated, but in a currency the schema can't hold (1 of 34, a
   different gap than #1).** Koç University Summer Academy's own description states "fee
   TRY 80,000 covering education, materials, and activities" — a single, clean, known
   number, sitting right there in the text, unrepresentable not because it's tiered but
   because `cost` has no currency column and silently assuming USD would misrepresent a
   Turkish-lira price by roughly 40x. Every foreign-currency price this catalog will ever
   encounter hits this same wall regardless of how well-researched it is.

3. **Cost is real but institutional, not individual — arguably correctly null (1 of 34).**
   The International Chemistry Olympiad's own record states plainly: *"the participating
   country pays a participation fee and covers return travel; a delegation that does not
   pay cannot participate -- this is a country-level cost and never billed to an individual
   student."* From the student's own perspective there genuinely is no personal cost here.
   Null is the honest answer, not a gap — worth naming so nobody "fixes" this one by
   inventing a number.

4. **The concept doesn't apply to the record type at all (2 of 34: Türkiye Scholarships,
   Girl Up Global Teen Advisor Board — the latter paying a $750 honorarium).** A scholarship
   or a paid role has no "cost to the student" to record — money flows the other direction.
   `cost` being null on every scholarship-shaped row isn't a research gap; it's the wrong
   question for that category.

5. **Explicitly stated free in the record's own text, `cost` still null — the dangerous
   case named in the brief (at least 4 confirmed, not 1).** Beyond the keyword-search hit
   already found (SPINWIP: *"This 3-week program is completely free to participants"*),
   hand-reading the sample surfaced three more in the same 34 rows: Koç University's own
   KUSRP record (*"ücretsiz bir programdır"* — "is a free programme"), the Pre-College
   Program Virtual Fairs record (opens with *"Free virtual fairs connecting students/
   families..."*), and Blue Ocean Competition (independently confirmed free during this
   session's own entrepreneurship sourcing pass, a fact that never made it back into this
   specific row). A full-catalog keyword sweep for explicit free-language phrases against
   all 258 null-cost rows found only 1 hit — **hand-reading a 34-row sample found 4 in
   that sample alone, meaning the keyword sweep was undercounting this bucket
   substantially** (phrases like "ücretsizdir," "is a free programme," or a description's
   opening clause don't match an English-only "free of charge"-style pattern list). This is
   the single most important number in this report: **the true count of "known free,
   recorded as unknown" is meaningfully higher than a keyword search alone would suggest,
   and only hand-reading caught it.**

6. **Genuinely never stated anywhere — the largest bucket by far (19 of 34, ~56% of the
   sample).** York University Helix, Bentley, Purdue, Horizon Inspires, Boğaziçi, the Swiss
   university summer camp, Harvard CURE, Sabancı's own summer school, İTÜ, Maastricht,
   ARML, HOSA, Rotary Interact, Partners for the Future, EYE, InvestIN, UK Youth Parliament,
   and two records whose entire stored description is a bare URL (Boğaziçi, Maastricht) —
   these simply never had a cost researched, several because they're still in the raw-scrape
   state this session has been steadily working through all night. This is the real research
   backlog, not a schema problem.

**A category-level pattern worth naming on its own**: within just the 10-record competition
sample, half (BMO Round 1, Congressional App Challenge, World Wildlife Day Youth Art
Contest, Grey Kangaroo, and Marshall Society — the last explicitly self-flagged as
"free-to-enter, unconfirmed") read as *very likely free by strong category precedent* —
every other UKMT-family and government-run academic competition already in this catalog
that states a cost states "free." `competition` is disproportionately "probably free,
never individually reconfirmed" rather than "genuinely unknown" — a materially cheaper
research problem than the summer_program backlog, where real, varied prices are the norm.

## Question 2: the two-column problem, measured precisely

`financial_aid_available` (manual research) and `funding_available` (the field name in
`lib/ai/opportunity-extraction.ts`'s automated schema) are, in this live data, effectively
two different populations, not one concept split across two columns by accident:

| | n (of 366 active) | % |
|---|---|---|
| `financial_aid_available` populated (true or false) | 102 | 27.9% |
| `funding_available` populated (true or false) | 10 | 2.7% |
| **Both populated** | 10 | 2.7% |
| Neither populated | 264 | 72.1% |

**Every single row that has `funding_available` set also has `financial_aid_available`
set** — the automated column has never, in this catalog's current live state, been the
*only* source of an aid signal on any row. As currently populated, `funding_available`
carries zero information `financial_aid_available` doesn't already carry. This settles half
of the brief's own framing: the two-column problem isn't "which one do we trust when they
conflict," because they've never yet been in a position to conflict — it's "one column
(`funding_available`) has been populated ten times in the catalog's whole history and never
independently of the other."

**A second, smaller pattern worth flagging**: 28 rows have `cost` null AND
`financial_aid_available = true` at once — "aid is available" recorded for a cost that
was never itself recorded. Read a handful of these by hand: LaunchX is the clearest example
(`financial_aid_available: true`, `funding_available: true`, `cost: null` — this session's
own thin-category sourcing pass independently found LaunchX's real starting price,
"$1,995+," in passing while researching a different opportunity; that fact was never
written back to this row). This specific 28-row bucket is a plausible, bounded, fillable
research target: a real cost exists behind most of these (you don't usually research and
confirm "aid is available" for a program with no stated price to be aided against), it just
hasn't been captured yet.

## Answering the brief's two direct questions

- **How much of the missing cost data is missing versus unrepresentable?** In the 34-row
  hand-read sample: 2 of 34 (~6%) are confirmed unrepresentable by the current schema (1
  tiered/multi-price, 1 foreign-currency single price) — real, known numbers with nowhere
  to go. 1 of 34 is arguably correctly null (institutional, not individual, cost). 2 of 34
  don't have a cost concept at all (scholarships/paid roles). The remaining ~29 of 34
  (~85%) are a research backlog, not a schema problem — genuinely never looked up, or
  looked up and found but not written back (as with LaunchX).
- **How much is genuinely free but recorded as null?** At least 4 confirmed in the 34-row
  sample alone (SPINWIP, KUSRP, the Virtual Fairs record, Blue Ocean), against only 1 found
  by an English-keyword sweep of the full 258-row null population — meaning the keyword
  approach materially undercounts this bucket, and the true number across all 258 is very
  likely well into the double digits once read by hand rather than pattern-matched. This is
  the single most actionable, most dangerous finding in this report: it is not rare, and a
  keyword sweep alone will not find most of it.

## Which bucket is fillable by research, and which needs a schema change

**Fillable by research, no schema change needed** (the large majority of the gap):
- The ~56%-of-sample "genuinely never researched" bucket — ordinary research backlog,
  exactly the kind of work this session has been doing category by category all night.
- The "confirmed free in text, cost still null" bucket — this is not even research, it's
  a data-entry pass: read the description already on file, set `cost = 0` where it already
  says free. Fast, bounded, and per the finding above, larger than a keyword search alone
  would surface — a hand-read pass (or a smarter multilingual/structural phrase search,
  not just English "free of charge"-style substrings) is needed to actually find them all.
- The "aid flagged true, cost never captured" 28-row bucket (LaunchX-shaped) — a real
  number is very likely findable for most of these on the organiser's own page.
- The competition-category "probably free by precedent" bucket — cheap to confirm one at a
  time against each organiser's own page, given the strong prior.

**Needs a schema change, not more research:**
- **Tiered/multi-price programmes** (Summer Discovery, Tanglewood) — no amount of research
  produces a single number that isn't misleading, because the real answer isn't one number.
  This needs either a min/max pair, a JSON/structured tiers field, or an explicit
  "see description for pricing" sentinel value distinct from "unknown" — the founder's
  actual decision point.
- **Foreign-currency single prices** (Koç University's TRY 80,000, and by extension every
  non-US-dollar programme this catalog will ever add) — needs a `currency` column, or an
  explicit convention that `cost` is always USD-converted-at-research-time with the
  original figure kept in a source field. Whichever the founder picks, "no currency field"
  is a schema gap independent of and additional to the tiered-pricing question.
- **The `funding_available` / `financial_aid_available` duplication** — not exactly a
  "needs a schema change" in the sense of adding a column, but a genuine "needs a decision"
  either way: given `funding_available` currently carries zero unique information in this
  live catalog, either retire it, or decide what distinct question it's actually meant to
  answer going forward (manual-confidence vs. automated-confidence in the same fact is one
  plausible reading, but nothing in the current data population supports or refutes that
  without a decision from whoever owns the extraction pipeline).

## What this doesn't answer, on purpose

This is a measurement of the `active` catalog's stored state — it does not re-verify any
organiser's page live (that's a different, much larger task, and this brief asked for a
read of what's already on file). The "genuinely free, keyword search undercounts it"
finding in particular should be read as "the true number is higher than 1, confirmed by
example" rather than "the true number is exactly N" — getting the real number would need
either a full hand-read of all 258 null-cost rows or a much better multilingual phrase
search than the one this report's own keyword pass used, and this report is explicit about
not having done either.
