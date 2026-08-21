# 04 — Harvard vs QuestBridge: "end of September" against "October 1"

**Records:** `DL-2026-08-21-HAR0005`, `DL-2026-08-21-HAR0006`
(`us_deadlines_harvard_2026-08-21.jsonl`, lines 5–6)
**University:** Harvard University (United States) / QuestBridge National College Match
**Status:** **Resolved**
**Re-checked:** 2026-08-22

## What was recorded

`HAR0005` — Harvard's own QuestBridge page:

> "QuestBridge applications are due at the end of September."

`HAR0006` — questbridge.org, the programme operator:

> "October 1 at 11:59 p.m. Pacific Time."

Both `deadline_date` and `cycle_year` were left NULL on the operator record because the original
fetch did not surface a year printed alongside "October 1", and a search snippet suggesting 2026
was correctly not promoted to fact.

## What I did

Re-fetched the operator's dates-and-deadlines page on 2026-08-22, specifically to recover the
surrounding cycle calendar — because a single undated date is ambiguous, but a *sequence* of dates
pins the cycle.

## The evidence

QuestBridge's own page, 2026-08-22, now yields the full National College Match cycle:

| Milestone | Date |
|---|---|
| **Application deadline** | **1 October 2026, 23:59 Pacific** |
| Match Rankings form deadline | 15 October 2026 |
| Finalist decisions released | 21 October 2026 |
| Match Day results | 1 December 2026 |
| Regular Decision form deadline | 10 December 2026 |
| Final admissions decisions | Spring 2027 |

The downstream sequence is what establishes the cycle: a Match Day of 1 December 2026 and final
decisions in spring 2027 can only belong to the cycle for Fall 2027 entry. The deadline is
therefore 1 October **2026**, and this is now sourced from the operator's own page rather than
inferred from a search snippet.

## Resolution

**QuestBridge owns this deadline.** The National College Match is a QuestBridge programme with a
single platform-wide application submitted to QuestBridge, not to Harvard. Harvard is one of
roughly fifty partner colleges and does not set the date. This is the same precedent already used
in this corpus for UCAS (conflict [12](12-glasgow-equal-consideration-date.md)) and the UC
Application ([14](14-ucla-application-filing-period.md)): the application system is the primary
authority for facts it owns, and a partner institution's restatement is a paraphrase.

So the operative figure is **1 October 2026, 23:59 Pacific**.

Harvard's "end of September" is not a competing fact. It is a loose restatement that is imprecise
by roughly one day — and, worth noting, **imprecise in the safe direction**: a student who acts on
Harvard's wording and submits by 30 September is comfortably inside the real deadline. It would be
wrong to display it, and wrong to treat it as evidence against the operator's date, but it is not
the kind of error that would cost a student their application.

## A note on the source-authority gap

`HAR0006` carries `source_authority_passes_gate: false` because `questbridge.org` is a plain `.org`
and fails the `.edu`/`.ac.`/`.gov` suffix check in `lib/acquisition/source-authority.ts`. This is
the gap already documented in `source-authority-gap.md` piece B.

The situation is worth stating plainly, because it inverts the usual risk: the source that is
**right** fails the authority gate, and the source that is **imprecise** passes it. QuestBridge is a
closed, hand-curatable application-system operator of exactly the same shape as UCAS, Common App
and Studielink. Until an `APPLICATION_SYSTEM_DOMAINS` tier exists, this deadline cannot be ingested
from its authoritative source — and must not be ingested by relaxing the domain gate generally,
which would admit far more than one trustworthy operator.

## Corpus action

- `HAR0006`: `deadline_date` → `2026-10-01`; `deadline_time` → `23:59 Pacific`; `cycle_year` →
  `2027`; `verification_state` → `VERIFIED_CURRENT`; `retrieved_at` → `2026-08-22`. Record the
  downstream milestone sequence as the evidence pinning the cycle. Retain the
  `source_authority_note` unchanged — the gate gap is not fixed by this lane.
- `HAR0005`: `verification_state` → `SUPERSEDED_BY_OWNER`, or `VERIFIED_CURRENT` with a note that
  it is an imprecise restatement not to be displayed. Keep the verbatim text.

## Proposed `requirement_source_conflicts` row

```yaml
university: Harvard University
subject: "QuestBridge National College Match application deadline"
status: resolved
resolution_note: >-
  Resolved in favour of the programme operator. The National College Match application is submitted
  to QuestBridge, not to Harvard; Harvard is one partner college among many and does not set the
  date. QuestBridge's own page (re-fetched 2026-08-22) gives 1 October 2026 at 23:59 Pacific, and
  the surrounding cycle calendar pins the year — Match Rankings 15 Oct 2026, finalists 21 Oct 2026,
  Match Day 1 Dec 2026, final decisions spring 2027, which can only be the Fall 2027 entry cycle.
  Harvard's "end of September" is a loose restatement, imprecise by about a day but erring safe;
  it is not a competing fact and should not be displayed. Same precedent as UCAS and the UC
  Application: the application system is primary authority for facts it owns. NOTE: questbridge.org
  fails the current .edu/.ac./.gov source-authority gate, so the authoritative figure cannot be
  ingested until an APPLICATION_SYSTEM_DOMAINS tier exists.
resolved_at: 2026-08-22
```
