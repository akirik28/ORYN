# 07 — Groningen: a 2×2 table read as a flat list

**Records:** `DL-2026-08-21-GRO0015`, `DL-2026-08-21-GRO0016`
(`de_nl_deadlines_groningen_2026-08-21.jsonl`, lines 15–16); related row `GRO0017`
**University:** University of Groningen (Netherlands)
**Status:** **Resolved — not a conflict. The sources agree exactly**
**Re-checked:** 2026-08-22

## What was recorded

Two official `rug.nl` pages appearing to disagree about the Faculty of Economics and Business
master's application deadline:

- `GRO0015`, from the FEB "apply with an international diploma" page: **1 May 2027** for a
  September 2027 start.
- `GRO0016`, from RUG's general master's-deadlines hub: **1 January**, recorded as the figure for
  "other prior education", under a heading reading "Overview deadlines per programme per faculty
  2026/2027".

The original researcher flagged that 1 January 2026 and 1 May 2027 are sixteen months apart —
"too large a gap to be an ordinary early/final-round split" — and offered two candidate
explanations: the FEB subpage had rolled ahead of the hub, or the two pages describe different
applicant populations. The second was closer than it looked.

## What I did

Re-fetched both pages on 2026-08-22 and read the hub page's FEB entry as the **table** it is,
rather than as a list of dates.

## The evidence

The hub page's FEB block has **two axes**, not one. Prior education × start month:

| Prior education | September start | February start |
|---|---|---|
| RUG ("own UG") Bachelor's | 1 August | 1 January |
| **Other prior education** | **1 May** | **15 October** |

And the FEB international-diploma page (last modified 28 July 2026) states:

> "1 May — September start" and "15 October — February start",
> each adding "This deadline applies to EU/EEA students and non-EU/EEA students."

**These are the same two dates.** The FEB page's pair — 1 May for September, 15 October for
February — is exactly the hub's "other prior education" row. An applicant with an international
diploma does not hold a RUG bachelor's, so "other prior education" is the row that applies to them,
and the researcher's own proxy mapping for that was correct.

## Resolution

**There is no conflict, and there never was one.** The two sources agree to the day, on both start
months.

The recorded conflict was an **extraction artefact**: the 2×2 table was flattened into a
one-dimensional list, which paired `1 August` and `1 January` as though they were the two competing
answers. They are not competing at all — they are the two cells of the *same* row (the RUG
bachelor's row), one for each start month. The "other prior education" row, which is the one that
actually applies to an international-diploma applicant, was never compared.

The "sixteen month gap" that made the conflict look serious was an artefact of the same flattening:
it compared a February-start date from one row against a September-start date from the other. Once
the axes are respected, the comparison is 1 May against 1 May.

These are also **recurring annual deadlines** — 1 May for every September start, 15 October for
every February start — which dissolves the remaining puzzle about cycle labelling. The hub's
"2026/2027" heading and the FEB page's "September 2027" framing are two ways of pointing at a
recurring pattern, not two conflicting cycle claims.

## Why this one matters beyond Groningen

This is the cheapest conflict in the set to have avoided and the most likely to recur. Nothing
about the sources was wrong, stale, ambiguous, or badly maintained. Both pages are accurate,
current and clearly laid out. The defect was entirely on the extraction side, and it produced a
confident, well-documented, thoroughly cross-referenced record of a disagreement that does not
exist.

Worth noting: the last-modified dates (FEB 28 July 2026, hub 18 August 2026) are irrelevant here
and were not used. When two sources actually agree, recency has nothing to arbitrate — which is a
useful reminder that reaching for it at all is usually a sign the comparison itself is wrong.

**Practical implication:** any deadline extracted from a table should carry the row and column
labels that qualified it. A deadline value without its `(prior education, start month)` or
`(applicant group, programme type)` qualifiers is not a fact, it is a fragment — and comparing two
fragments will manufacture conflicts indefinitely.

## Corpus action

- `GRO0015`: `verification_state` → `VERIFIED_CURRENT`; `retrieved_at` → `2026-08-22`; add
  `recurrence: recurring_annual` (1 May, September start).
- `GRO0016`: **correct the record.** Its `deadline_text_verbatim` attributes "1 January" to "other
  prior education"; the hub table puts 1 January in the RUG-bachelor's row for a February start.
  Either re-scope this row to `own RUG Bachelor's / February start` or replace it with the correct
  "other prior education / February start" figure of **15 October**. Set
  `verification_state` → `VERIFIED_CURRENT` once re-scoped, `retrieved_at` → `2026-08-22`.
- Check `GRO0017` (recorded as the "1 August own UG Bachelor's" figure) against the same table: it
  belongs to `own RUG Bachelor's / September start`.
- Retain the `rug.nl` `source_authority_note` on all rows.

## Proposed `requirement_source_conflicts` row

```yaml
university: University of Groningen
subject: "Master's application deadline, Faculty of Economics and Business"
status: resolved
resolution_note: >-
  Not a conflict — the two official pages agree exactly, and the recorded disagreement was an
  extraction artefact. The hub page's FEB entry is a 2x2 table of prior education by start month:
  RUG bachelor's = 1 August (Sept start) / 1 January (Feb start); other prior education = 1 May
  (Sept start) / 15 October (Feb start). It was flattened into a list, pairing 1 August with
  1 January as if they were the competing answers when they are the two cells of the same row. The
  FEB international-diploma page states 1 May for September start and 15 October for February
  start — precisely the "other prior education" row, which is the row an international-diploma
  applicant falls in. The apparent sixteen-month gap came from comparing a February-start date
  against a September-start date across rows. Both re-fetched 2026-08-22. These are recurring
  annual deadlines. Deadlines extracted from tables must retain their row/column qualifiers.
resolved_at: 2026-08-22
```
