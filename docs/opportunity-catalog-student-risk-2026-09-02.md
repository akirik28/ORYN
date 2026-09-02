# Opportunity catalog — what's still actually wrong, ranked by student risk

2026-09-02, oryn-31. CEO's ask: not a defect inventory, a ranked read of what a student would
actually hit, weighted toward deadline/eligibility errors that cost a student something —
not cosmetic issues. Read-only against live (`qtcvcflzxbuagvvwahhu`); no writes.

## 1. HIGHEST — unconfirmed programs shown with full confidence, and the homepage can't show the caveat even where the data has it

**74 active opportunities carry `cycle_status='unverified'`** (nobody has confirmed *this year's*
program is actually running) **but pass the system's own "sufficiently verified" gate anyway.**
`lib/opportunities/lifecycle.ts`'s `isOpportunitySufficientlyVerified` accepts *any* verification
timestamp as evidence — but `verified_at`/`last_verified_at` record which ingestion pipeline wrote
the row, not that anyone re-confirmed the current cycle (the file's own extensive comment says
so). All 74 have a timestamp from pipeline lineage, none from real cycle confirmation, so all 74
pass. Verified live: 0 of them are correctly excluded.

**Worse: even where the badge exists, the homepage doesn't render it.** The Browse page does the
right thing — `unverified` is in `CYCLE_STATUSES_WORTH_A_DESCRIPTOR`
(`features/opportunities/opportunity-card.tsx:129`), so a browsing student sees "Verification
pending." But the **dashboard homepage** — the single most-viewed page, what a student sees first
every time — builds its own preview shape and drops `cycle_status` entirely:
`app/(app)/dashboard/page.tsx:194` returns only `{ title, matchScore, deadline }`. There is no
field for the preview component to render a caveat from, even in principle. A student's first
impression of Oryn can be a confident-looking recommended card for a program nobody has confirmed
is actually running this year, with literally nothing telling them so.

This is the top of the list because of *where* it happens (the homepage, not a deep page) and
*how completely* the signal is lost (not degraded — absent from the data shape).

## 2. MODERATE — "open now" with nothing to plan around

**25 active opportunities have `cycle_status='open'` and no deadline on file**, and pass the same
verification gate via the same stale-timestamp mechanism as #1. These show as confident
recommendations that read as actionable ("open now") with nothing for a student to act on —
not wrong, but not useful, and indistinguishable in the UI from a program that genuinely has an
open, dateless rolling admission. Already known (`docs/known-issues.md`, 2026-09-01); still live,
unchanged count.

## 3. LOW-CONFIDENCE, WORTH A SPOT-CHECK — not confirmed as a defect

20 active rows have a specific `eligible_countries` list that excludes Turkey with no
`citizenship_restrictions` text explaining the restriction. Plausibly all legitimate (e.g. AI
Scholars, SEAP — both confirmed genuinely US-citizens-only during tonight's contamination
cleanup) rather than a bug. Flagging because I haven't read all 20 individually to confirm; not
claiming this is wrong, only that it's unverified.

## Genuinely clean, worth stating rather than silently confirming

- **Zero** active rows have contradictory age bounds (`minimum_age > maximum_age`).
- **Zero** active rows have no eligibility signal at all (every row has at least one of age
  bounds, country list, or citizenship-restriction text).
- **Zero** active rows contradict an "open to all countries" flag with a restrictive country list.
- The deadline-passed gate itself is solid: `isOpportunityActionable` correctly excludes any row
  whose stored deadline has passed, independent of `cycle_status`, and does so at read time (not a
  write that can go stale). 40 active rows do carry a passed deadline, but that's by the file's own
  explicit design — a closed cycle "still exists and is worth showing" in Browse (which has its
  own cycle-status filter) while being correctly excluded from matches/recommendations/urgency
  surfaces. Not a defect; did not re-litigate it.

## Deliberately not re-covered here

The research-note contamination (37 rows, closed and staged tonight) and the Tier-2 raw-pipe/
truncation set (~79 rows, already known and founder-escalated in `docs/known-issues.md` since
2026-08-22) are real but are text-quality problems, not deadline/eligibility ones — a garbled
description doesn't tell a student the wrong date or the wrong rule, it's just unpleasant to
read. Ranked below both findings above on purpose, per the weighting in the ask.

## What I did not do

Did not read all 421 opportunity rows individually for eligibility-text accuracy — item 3 above
is the one place that gap actually matters, and it's named as unconfirmed rather than counted.
Did not check whether the `deadline`-present branch of `isOpportunitySufficientlyVerified` ever
accepts a deadline that is itself wrong (e.g. from the contamination or Tier-2 sets) rather than
merely present — a present-but-wrong deadline is a different, unmeasured risk from an absent one.
