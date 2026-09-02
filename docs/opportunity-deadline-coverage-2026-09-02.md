# Opportunity deadline coverage — 2026-09-02

CEO's framing: 421 opportunities in the catalogue, only 42 with a future deadline. Assigned
read-only, in a specific order — establish what a student actually sees before judging
severity, separate the causes, then say what would fix it without building anything tonight.

## 0. Reconciling the headline number

CEO's 42 counts every row with a future deadline regardless of `status`. Restricted to
`status = 'active'` — the filter both `browseOpportunities` (`lib/opportunities/browse.ts`)
and the "For you" default view apply, so it's what a student can actually reach at all — the
real count is **37**. The other 5 have a real future deadline but are hidden entirely
(disabled/under_review/expired), invisible regardless of deadline. 37 is the number that
matters for what follows; 42 slightly overstates it.

```
total 421, active 283
  active + future deadline ......... 37
  active + null deadline ........... 206
  active + past deadline ........... 40
```

Category breakdown (active rows only) matches CEO's totals exactly:

| category | rows | active | future | null | past |
|---|---|---|---|---|---|
| summer_program | 245 | 140 | 4 | 113 | 23 |
| competition | 101 | 80 | 26 | 46 | 8 |
| research | 20 | 15 | 1 | 10 | 4 |
| scholarship | 9 | 8 | 4 | 4 | 0 |
| everything else (7 categories) | 39 | 40 | 2 | 27 | 5 |

Summer programs are almost the entire null-deadline problem (113 of 206) and a large chunk of
the past-deadline one (23 of 40). Competitions are the one category where the catalogue
mostly works (26 of 80 active rows have a real future deadline).

## 1. What a student actually sees (checked first, per instruction)

Two surfaces, two different answers — this is the load-bearing fact for how severe any of
this is.

**"For you"** (`app/(app)/opportunities/page.tsx`'s default tab, `ForYouView`) reads stored
`opportunity_matches`, then re-checks every candidate against `isOpportunityActionable`
(`lib/opportunities/lifecycle.ts`) before rendering. That function returns `false` the moment
a deadline has passed, independent of `cycle_status`. **A past-deadline opportunity cannot
appear on "For you."** No bug here — this is the surface most students land on first, and it
already excludes what CEO's number is worried about.

**"Browse all"** (`browseOpportunities`) filters only on `status = 'active'` — no deadline
filter, by design (its own docstring: "a Browse/Discover surface shouldn't silently narrow
what a student can see"). A non-actionable row (past deadline or closed cycle) gets
`eligible: false, notActionable: true` and a real explanation on the card
("This opportunity's application deadline has passed" —
`nonActionableOpportunityReason`). **The card itself is honest.** But the sort key is:

```ts
rows.sort((a, b) => Number(a.needsVerification) - Number(b.needsVerification) || b.matchScore - a.matchScore);
```

`needsVerification` requires `eligible === true` (see its definition in `browse.ts`), so a
`notActionable` row — `eligible: false` by construction — always has `needsVerification:
false`. That puts it in the **same top sort bucket as genuinely open, fully-verified rows**,
ranked only by `matchScore`. A closed opportunity with a high match score can occupy a page-1
slot ahead of an open opportunity with a lower one.

**So: this is a ranking/prioritization defect, not a deceptive one.** A student who reads a
card sees the truth. A student who trusts the ordering — which is the entire premise of
Phase 38, "Oryn prioritizes" — can have a dead opportunity occupying the slot a live one
should hold. Not touching this tonight per instruction, but it's a one-line fix if wanted
later: sort on `notActionable` too (`Number(a.needsVerification || a.notActionable) -
Number(b.needsVerification || b.notActionable)` or equivalent), same shape "For you" already
achieves by excluding outright.

Secondary, adjacent observation, not central to this: "For you" fetches `.eq("eligible",
true).limit(30)` from stored matches *before* the `isOpportunityActionable` re-check, then
filters. If enough of the top-30 stored matches turn out non-actionable after the re-check,
the view can render fewer than 30 cards without backfilling from beyond the top 30 — a
different, smaller gap from the one asked about here, flagging only so it isn't rediscovered
as if new.

## 2. Separating the causes

### 2a. Null deadline (206 active rows)

Not one undifferentiated bucket — `cycle_status` splits it into two very different stories:

| cycle_status | n | what it means |
|---|---|---|
| unverified | 74 | honestly labeled — no claim being made either way |
| date_not_announced | 50 | researched; the programme genuinely hasn't announced dates |
| closed | 34 | researched and correctly closed — see below |
| **open** | **25** | **claims to be currently actionable, no deadline recorded** |
| **upcoming** | **20** | **claims to be currently actionable, no deadline recorded** |
| historical | 3 | correctly marked as no longer running |

87 of 206 (unverified + date_not_announced + closed + historical) are honestly labeled —
either admitting no verdict, or a real researched fact that happens not to need a date. The
`closed`-with-no-deadline case is real and structurally unfixable by any date rule: the
canonical example already in `lifecycle.ts`'s own comments is Stanford Anesthesia Summer
Institute, closed with `deadline` null, caught only because a researcher read the page.

**The 45 rows (`open`/`upcoming`, no deadline) are the genuinely ambiguous slice** — exactly
the shape `lifecycle.ts` says is undetectable from stored data ("a genuinely rolling
programme would look identical to one nobody ever researched"). Checked whether that's really
true today by reading a sample rather than trusting the comment at face value:

```
current_cycle_label ilike '%rolling%' or '%no fixed%' or '%no formal%' ... 8
current_cycle_label is exactly a 4-digit year (e.g. "2026") ............. 9
current_cycle_label is null .............................................. 5
(remaining 23: other free text)
```

Concretely: **8 of the 45 already carry an explicit rolling-admission signal as free text** —
InvestIN's `current_cycle_label` literally reads "Rolling registration; no formal application
deadline by design," Coursera's "Rolling enrollment; individual courses have no fixed
application deadline." **9 more carry only a bare year** ("2026") on rows that are
`source: official_primary`, `verification_state: verified_current` — Tufts, Georgetown,
Boston University, Wharton M&TSI, Columbia's NYC Commuter Summer, Global Achievers Academy —
genuinely researched, current-cycle, flagship programmes that are simply missing one field.

This matters for what to build later, if anything: `lifecycle.ts`'s own comment frames the
rolling/unresearched ambiguity as fully unrecoverable without a new `deadline_mode` column.
That's true for a *structured, filterable* signal — nothing queries on `current_cycle_label`
today. But it's not true that no evidence exists: for at least 8 of these 45 rows, the
distinction is already sitting in the data as prose, just not in a shape any current code
reads.

### 2b. Past deadline (40 active rows)

```
cycle_status: closed .............. 28
              historical ........... 5
              open ................. 3
              upcoming ............. 2
              date_not_announced ... 1
              unverified ........... 1
```

33 of 40 are already correctly self-healed to a closed-type `cycle_status`. `lifecycle.ts`
cites a 2026-08-22 measurement claiming *zero* rows would need correction — true then, no
longer fully true now: **7 rows have crossed their deadline in the 11 days since without
being relabeled**, because `deriveCycleStatusForPassedDeadline` is "a write-time derivation
for a backfill/maintenance pass ... never called from a request path" — a one-time script,
not a schedule. Its guarantee decays by construction the moment it isn't run again.

This is a display/labeling accuracy issue on Browse, not a recommendation-safety one: the
7 mislabeled rows are still correctly excluded from "For you" and from
`opportunity_matches` by `isOpportunityActionable`'s own read-time deadline check, independent
of what `cycle_status` says. Browse would still show them as `notActionable` with the correct
"deadline has passed" wording (Section 1) — the stored `cycle_status` label being briefly
wrong doesn't currently produce a wrong *outcome* anywhere, just a `cycle_status` filter
option in Browse's own filter bar that would undercount by 7 rows if a student selected
"Closed."

## 3. What would fix it (not building it tonight)

The real fix already has a name, a full design, and is explicitly *not* built:
`opportunity_reverification` (`docs/opportunity-reverification-job-design-2026-08-23.md`),
combining Phase 30 Job B (deadline validation) and Job E (stale-data detection) for
opportunities specifically. Confirmed still true today, three ways:

1. **It's excluded from the job that already exists and covers everything adjacent.**
   `lib/jobs/detect-stale-data.ts` (Job E, built and live for `universities`,
   `university_requirements`, `university_deadlines`) documents in its own header exactly why
   `opportunities` is deliberately out of its scope: Job E is "a pure, stored-data-only
   recompute... no network call, no source re-fetch" — it can raise "worth re-checking" from
   timestamps alone, never confirm liveness. Opportunities need a **live Tavily re-fetch** to
   do the one thing a date-only rule structurally cannot: look at the current page. That's a
   materially larger job (row-level leases, a runs table, retry/backoff tiers per the design
   doc) than Job E's shape, which is exactly why it's a separate, still-unbuilt job rather
   than a scope extension of an existing one.

2. **Discovery cannot substitute for it, even running perfectly.** `discover_opportunities`
   (Job A, the job that *does* exist) finds new candidates via search. When a candidate
   duplicate-matches an existing row, `lib/opportunities/ingest.ts` returns `{ outcome:
   "duplicate", row: null }` and **discards the candidate entirely** — any fresher deadline
   or cycle status that search just turned up is thrown away, not applied to the existing row.
   Discovery only ever adds new rows; it structurally cannot refresh a stale one. This isn't
   a theoretical gap — it's why the 7 rows in 2b never got corrected even though the
   discovery job's default query set plausibly re-surfaces some of the same programmes each
   run.

3. **Even if `opportunity_reverification` existed, it wouldn't run yet.** `external_sync_jobs`
   has zero rows for `discover_opportunities` (the job that *is* built) and, expectedly, zero
   for `opportunity_reverification` (unbuilt). Consistent with this fleet's now-repeated
   finding that ORYN has never actually been deployed — Vercel Cron only fires against a live
   deployment. Building the job alone would not close this gap without deployment landing
   too; naming both separately so neither gets treated as sufficient on its own.

**If the honest answer is "build `opportunity_reverification`,"** that's the finding, not a
task to start tonight per instruction. Two smaller, much cheaper things sit next to it and are
worth naming separately since they don't require the full job:

- The Browse sort fix (Section 1) — one line, no new data, no job.
- Re-running `scripts/derive-opportunity-cycle-status.ts` (the existing one-time backfill) —
  would fix the 7 drifted rows in 2b today, though it would drift again by the same amount
  without a schedule; it was never designed to be more than a one-off.

## Summary

- The number that matters is 37, not 42 (5 of CEO's 42 are hidden by moderation status
  regardless of deadline).
- "For you" already excludes what's broken; "Browse" doesn't exclude it but doesn't lie about
  it either — it just doesn't rank it down, which is a real but narrower defect than "students
  see stale opportunities as live."
- The 206 null-deadline rows are mostly honest (161 of 206 are unverified/date_not_announced/
  closed/historical); the 45 `open`/`upcoming`-with-no-deadline rows are the real ambiguity,
  and at least 8 of those already have the answer sitting in `current_cycle_label` as
  unstructured text.
- The 40 past-deadline rows are mostly (33/40) already self-healed by a one-time script whose
  guarantee has already started eroding (7/40) for lack of a schedule.
- The fix is already fully designed (`opportunity_reverification`) and deliberately excluded
  from the job that covers everything adjacent to it, for a documented, still-valid reason.
  It hasn't been built, and even the job that has been built has never run, because nothing
  has been deployed yet.
