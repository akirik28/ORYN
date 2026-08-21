# 06 — Erasmus University College: one page, two deadline pairs

**Records:** `DL-2026-08-21-ERA0016`, `DL-2026-08-21-ERA0017`
(`de_nl_deadlines_erasmus_2026-08-21.jsonl`, lines 16–17);
companion historical rows `ERA0014`, `ERA0015`; corroborating row `ERA0018`
**University:** Erasmus University Rotterdam (Netherlands)
**Status:** **Resolved — not a conflict**
**Re-checked:** 2026-08-22

## What was recorded

A single official EUC deadlines page carrying two different deadline pairs:

- **Introductory paragraph:** "Applications for the academic year 2026-2027 opened on 1 October,
  and the deadlines are 15 January 2026 (regular deadline) and 1 May 2026 (final deadline)."
- **Section headings:** "Regular deadline: 15 January 2027" and "Final deadline: 1 May 2027"

The original researcher leaned toward the headings on the grounds that "headings/structured fields
are typically what an editor updates each cycle" — and was careful to label this as inference, not
fact. That instinct was right; the reasoning behind it was a heuristic. The lean was also
corroborated by a third element (`ERA0018`, "Applications for 2027/2028 open on 1 October"), and
the whole thing was confirmed across four independent fetches, ruling out a single-fetch artefact.

## What I did

Re-fetched on 2026-08-22 — **the page is unchanged**, all three elements still present. Then, rather
than asking which element is better maintained, asked whether each figure is *individually true for
the cycle it names*.

## The evidence

The page names its own cycles, and once each pair is bound to its cycle, both are correct:

**The introductory paragraph is a correct statement about 2026-2027.** It says so itself: "the
academic year 2026-2027". For a September 2026 intake, applications open 1 October **2025**,
regular deadline 15 January **2026**, final deadline 1 May **2026**. Those are exactly the figures
it gives. The paragraph is internally consistent and factually right — about a cycle that has
closed.

**The headings are a correct statement about 2027-2028.** 15 January 2027 and 1 May 2027 are the
corresponding deadlines one cycle later.

**The page's own third element confirms which cycle is now open.** "Applications for 2027/2028 open
on 1 October" — that is 1 October 2026, roughly six weeks after this re-check.

And decisively: **as of 2026-08-22, 15 January 2026 and 1 May 2026 are in the past.** A deadline
that has already passed cannot be the operative deadline for an application round that opens on
1 October 2026. The academic year 2026-2027 begins in about two weeks.

## Resolution

**There is no conflict.** The page is not self-contradicting; it is *mid-rollover*. The intro
paragraph still describes the cycle that just closed, while the headings and the opening-date line
have moved to the cycle about to open. Every figure on the page is true of the year it names.

The operative deadlines for the currently-opening cycle are **15 January 2027** (regular) and
**1 May 2027** (final), both at 23:59 CET.

This reaches the same answer the original researcher leaned toward, but the reason matters. "The
headings are more likely to be maintained" is a heuristic that would be wrong at any institution
that maintains its prose and lets its headings rot. "Each figure is correct for the cycle the page
itself names, and one of those cycles has closed" is a fact about the content, checkable by anyone,
and it does not depend on guessing at an editor's habits.

The genuine defect here is not a contradiction but **an unlabelled stale paragraph**: the intro
does not say "for the 2026-2027 cycle, now closed", so a reader who starts at the top gets a dead
deadline presented in the present tense. That is a real hazard for a student and worth surfacing
differently from a conflict.

## Corpus action

- `ERA0016` / `ERA0017`: `verification_state` → `VERIFIED_CURRENT`, `cycle_year` 2027 (already
  correct), `retrieved_at` → `2026-08-22`. Replace the "conflicts with the intro paragraph"
  limitation with the cycle-binding explanation.
- `ERA0014` / `ERA0015` (the intro-paragraph figures): confirm as `VERIFIED_HISTORICAL` for
  `cycle_year` 2026 — they are correct records of a closed cycle, not erroneous readings.
- Retain the existing `source_authority_note` on all rows: `eur.nl` fails `looksOfficial()` and
  still needs the officialDomains-provenance fix, which this lane does not touch.

## Proposed `requirement_source_conflicts` row

```yaml
university: Erasmus University Rotterdam
subject: "Erasmus University College application deadlines"
status: resolved
resolution_note: >-
  Not a conflict — the page is mid-rollover and every figure on it is true of the cycle it names.
  The introductory paragraph explicitly says "the academic year 2026-2027" and gives 15 January
  2026 and 1 May 2026, which are the correct deadlines for that (now closed) cycle. The section
  headings give 15 January 2027 and 1 May 2027 for the next cycle, corroborated by the same page's
  "Applications for 2027/2028 open on 1 October". As of 2026-08-22 the 2026 dates are in the past
  and cannot govern a round opening 1 October 2026. Operative deadlines: 15 January 2027 (regular)
  and 1 May 2027 (final), 23:59 CET. Page re-fetched 2026-08-22, unchanged. The real defect is that
  the stale intro paragraph is not labelled as closed, so a reader starting at the top sees a dead
  deadline in the present tense.
resolved_at: 2026-08-22
```
