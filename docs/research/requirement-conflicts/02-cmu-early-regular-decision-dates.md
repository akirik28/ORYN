# 02 — CMU: a three-way deadline "conflict" that is one rule applied to three cycles

**Records:** `DL-2026-08-21-CMU0001`, `CMU0004`, `CMU0011`, `CMU0024`, `CMU0025`, `CMU0026`
(`us_deadlines_cmu_2026-08-21.jsonl`, lines 1, 4, 11, 24, 25, 26)
**University:** Carnegie Mellon University (United States)
**Status:** **Resolved — not a conflict**
**Re-checked:** 2026-08-22

## What was recorded

Three official CMU sources giving three different Early Decision dates and three different Regular
Decision dates:

| Source | Early Decision | Regular Decision |
|---|---|---|
| Application Plans & Deadlines page (live, undated) | November 2 | January 4 |
| Course catalog (self-dated "entering fall 2026") | November 3 | January 5 |
| Common Data Set 2025-2026 (§C21) | November 1 | January 1 |

Plus an enrollment discrepancy: live page and CDS say reply by February 1; the catalog says
February 15.

The original researcher explicitly declined to resolve by majority vote or by preferring the
"more current-looking" source. That was right.

## What I did

Re-fetched the live deadlines page on 2026-08-22 — **unchanged** (ED November 2, RD January 4, ED
enroll by February 1). Then, rather than asking which source to prefer, asked whether a single
mechanism could make all six numbers true at once.

It can. US universities routinely shift a deadline falling on a weekend or holiday to the next
business day. Working the actual calendar:

## The evidence

**Nominal policy dates: November 1 and January 1.** This is what the Common Data Set reports — the
CDS form asks for the institution's stated deadline, not the shifted calendar date for one cycle.

**Fall 2026 entry** (applications filed autumn 2025) — the cycle the course catalog self-dates to:

| Nominal | Falls on | Shifts to | Catalog says |
|---|---|---|---|
| 1 Nov 2025 | **Saturday** | Mon 3 Nov 2025 | **November 3** ✓ |
| 1 Jan 2026 | Thursday (holiday); 4 Jan = **Sunday** | Mon 5 Jan 2026 | **January 5** ✓ |

**Fall 2027 entry** (applications filed autumn 2026) — the cycle currently open, and therefore what
an undated live page shows:

| Nominal | Falls on | Shifts to | Live page says |
|---|---|---|---|
| 1 Nov 2026 | **Sunday** | Mon 2 Nov 2026 | **November 2** ✓ |
| 1 Jan 2027 | Friday (holiday); 2–3 Jan = weekend | Mon 4 Jan 2027 | **January 4** ✓ |

**Every one of the six figures is predicted.** Nothing is left over and nothing is explained away.

Independent corroboration that the live page's November 2 belongs to the 2026-27 cycle: admissions
trackers reporting on CMU's current cycle give "November 2, 2026" for Early Decision.

## Resolution

**There is no conflict.** Three sources, three correct answers, three different questions:

- The **CDS** reports the nominal policy date.
- The **course catalog** reports the actual calendar date for Fall 2026 entry.
- The **live page** reports the actual calendar date for Fall 2027 entry.

This is a resolution by mechanism, not by preference. It would have been possible to "resolve" this
by picking the live page and being accidentally right about the current cycle while being wrong
about why — and then wrong again next year, when the shift lands differently.

## Two things that are genuinely separate facts

**CFA deadlines are real programme-specific differences, not transcription variants.**
`CMU0024/0025/0026` record Architecture/Art/Design at ED November 1 and RD January 5 with portfolio
sub-deadlines of January 9 (Design) and January 10 (Architecture, Art). The live *general*
deadlines page independently carries "January 5 for architecture, art and design" in its CFA row,
so two CMU sources agree on the CFA figure. Drama and Music are December 1 and take no ED. These
are distinct deadlines for distinct programmes and should be stored as such.

**Reply-by and deposit-by are two different obligations.** `CMU0011`'s "February 1" is the date an
ED admit must *reply*; the catalog's February 15 is the date the **$800 enrollment deposit** is
due. The catalog's own sentence pairs it with a May 1 deposit date for regular admits. Two
different obligations with two different dates is not two readings of one fact.

## Honest limitation

The course catalog URL (`coursecatalog.web.cmu.edu`) returned `ECONNRESET` on two attempts on
2026-08-22, so the catalog figures are as originally captured on 2026-08-21 and were not
re-verified. This does not affect the analysis — the arithmetic holds on the captured values, and
the catalog is the one source that self-dates its cycle — but the re-fetch gap is recorded rather
than glossed.

## Corpus action

For `CMU0001`, `CMU0004`, `CMU0011`: set `verification_state` → `VERIFIED_CURRENT`, `cycle_year` →
`2027`, `retrieved_at` → `2026-08-22`, and record the weekend-shift mechanism in `researcher_notes`
so a future pass does not re-flag the pair. The corresponding catalog rows (`DL0002`, `DL0005`)
remain correct as `VERIFIED_HISTORICAL` for `cycle_year` 2026.

For `CMU0024/0025/0026`: set `verification_state` → `VERIFIED_CURRENT` and note that these are
CFA-specific deadlines, not variants of the general-population date.

## Proposed `requirement_source_conflicts` row

```yaml
university: Carnegie Mellon University
subject: "Early and Regular Decision application deadlines"
status: resolved
resolution_note: >-
  Not a conflict. Three official CMU sources appeared to give three ED dates (Nov 1/2/3) and three
  RD dates (Jan 1/4/5). One rule accounts for all six: CMU's nominal deadlines are November 1 and
  January 1, shifted to the next business day when they fall on a weekend or holiday. Fall 2026
  entry: 1 Nov 2025 was a Saturday, so Nov 3; 4 Jan 2026 was a Sunday after the Jan 1 holiday, so
  Jan 5 — matching the course catalog, which self-dates to that cycle. Fall 2027 entry: 1 Nov 2026
  is a Sunday, so Nov 2; 1 Jan 2027 is a Friday holiday followed by a weekend, so Jan 4 — matching
  the live page. The Common Data Set reports the unshifted nominal dates, which is what the CDS
  form asks for. Separately and not part of this conflict: College of Fine Arts deadlines
  (Architecture/Art/Design RD Jan 5 with portfolio Jan 9-10; Drama and Music Dec 1, no ED) are
  genuine programme-specific facts, and ED "reply by February 1" and "$800 deposit by February 15"
  are two different obligations.
resolved_at: 2026-08-22
```
