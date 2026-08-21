# 14 — UCLA: "October 1–December 1" against "October 1–November 30"

**Records:** `DL-2026-08-21-UCL0003` (`us_deadlines_ucla_2026-08-21.jsonl`, line 3);
related rows `UCL0001`, `UCL0002`
**University:** University of California, Los Angeles (United States)
**Status:** **Resolved**
**Re-checked:** 2026-08-22

## What was recorded

An internal inconsistency on a single UCLA page, in the same "Dates and Deadlines" section:

- **Prose:** "Applications can be submitted October 1-December 1."
- **Tabular entry:** "October 1 - November 30: Application filing period"

The original researcher established something important: "October 1–December 1" is **not a typo**.
It appears identically on three independent official UCLA pages — the first-year admission page and
two Herb Alpert School of Music department pages. Meanwhile every *specific, tabular, dated*
statement across UCLA's own bulleted list, the UC systemwide table, and Nursing's page says
November 30.

The working hypothesis recorded was that "December 1" is a loose one-month-rounded figure some
UCLA copy uses colloquially. The record was flagged as a documented anomaly, with November 30
treated as authoritative for evaluator logic.

## What I did

Re-fetched UCLA's page on 2026-08-22 — **unchanged**, both statements still present in the same
section. Then went to the owner of the fact.

## The evidence

**UCLA does not own this deadline.** UCLA does not run its own application. Applicants apply
through the **UC Application**, a systemwide platform serving all nine undergraduate UC campuses,
and the filing period is set systemwide by the University of California, not per campus.

The University of California's own admissions site states the filing period as:

> "Fall quarter/semester: **October 1–November 30**"

UC says the application closes **November 30**, not December 1.

## Resolution

**The application filing period closes 30 November.** UCLA's "December 1" prose is wrong — not a
distinct later campus deadline, and not a genuine institutional variation.

This is the same precedent applied in conflicts [01](01-manchester-medicine-entry-year.md),
[04](04-harvard-questbridge-deadline.md) and [12](12-glasgow-equal-consideration-date.md): where an
application system owns a fact, the system's figure governs and an institutional restatement is a
paraphrase. A UCLA page cannot extend a UC-wide filing period, any more than a Manchester page can
move a UCAS deadline.

The repetition across three UCLA pages — which was the strongest argument for treating "December 1"
as a real fact — turns out to carry no evidential weight once the ownership question is asked.
Three UCLA pages repeating a loose paraphrase of a UC deadline are not three witnesses; they are
one error, copied. That is worth stating because "it appears on three independent pages" is
normally good evidence, and here it was actively misleading.

The original recommendation — treat November 30 as authoritative — was correct. What is added here
is the *reason*, which upgrades it from a well-judged working hypothesis to a sourced fact, and a
correction to the framing: this is not an unexplained anomaly requiring no action. It is an error
on UCLA's pages, and the resolution is settled.

## Product implication

The consequence for a student is severe and asymmetric. Someone who believed UCLA's prose and
submitted on **1 December would have missed the deadline entirely** — the UC Application closes on
30 November, and there is no equal-consideration grace period equivalent to UCAS's. Losing all nine
UC campuses in one submission is not a degraded outcome; it is a total one.

This makes it a good argument for a specific ingestion rule: **when a page contains both a prose
statement and a structured/tabular statement of the same deadline, and they disagree, neither
should be ingested on the page's own authority.** Resolve against the application system. Here the
tabular figure happened to be right, but preferring "tabular over prose" is another heuristic — the
same shape as "newer over older" — and it would fail wherever a table is the stale element.

## Corpus action

- `DL-2026-08-21-UCL0003`: `verification_state` → `SUPERSEDED_BY_OWNER`; keep `deadline_date: null`
  (there is no real deadline for this row to hold — the figure is an error, not a date);
  `retrieved_at` → `2026-08-22`. Replace the "documented anomaly requiring no action" note with
  the UC systemwide resolution, and record that the UCLA page is unchanged and still carries the
  incorrect prose.
- `UCL0001` / `UCL0002` (November 30): confirm `VERIFIED_CURRENT`, sourced to the UC systemwide
  filing period.
- The two Herb Alpert School of Music pages carrying "October 1 to December 1" should be recorded
  as carrying the same error, so a later pass does not re-discover them as fresh corroboration.

## Proposed `requirement_source_conflicts` row

```yaml
university: University of California, Los Angeles (UCLA)
subject: "First-year application filing period"
status: superseded
resolution_note: >-
  Resolved against the owner of the fact. UCLA does not run its own application — applicants apply
  through the UC Application, a systemwide platform for all nine undergraduate UC campuses, and the
  filing period is set by the University of California, not per campus. UC's own admissions site
  states "Fall quarter/semester: October 1-November 30". The filing period therefore closes
  30 November, and UCLA's "October 1-December 1" prose is an error, not a distinct campus deadline.
  UCLA's page re-fetched 2026-08-22, unchanged, still carrying both statements in the same section.
  The fact that "December 1" appears on three independent official UCLA pages (first-year admission
  plus two Herb Alpert School of Music pages) carries no evidential weight here — three pages
  repeating a loose paraphrase of a UC deadline are one error copied, not three witnesses.
  Consequence for a student is total rather than partial: submitting on 1 December misses the UC
  Application entirely, across all nine campuses, with no equal-consideration grace period.
resolved_at: 2026-08-22
```
