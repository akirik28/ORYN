# 12 — Glasgow: equal consideration date, 14 January against a peer consensus of 13 January

**Records:** `DL-2026-08-21-1007` (`deadlines_batch2_2026-08-21.jsonl`, line 7);
related row `deadlines_batch3_2026-08-21.jsonl` line 3
**University:** University of Glasgow (United Kingdom)
**Status:** **Resolved**
**Re-checked:** 2026-08-22

## What was recorded

Glasgow's dates-and-deadlines page listing an undated **14 January** against "Equal consideration
date for most undergraduate courses", while four peer UK institutions (Cambridge, LSE, Imperial,
Edinburgh) all publish **13 January 2027** for 2027 entry.

The record was marked `confidence: low` with a firm instruction — "DO NOT INGEST as a 2027 date.
Resolve against UCAS's own published 2027 cycle date first" — and the researcher noted that while
a stale carry-over was the likely explanation, "both readings are recorded and neither is chosen
here."

That instruction was exactly right, and it is what made this one quick to close.

## What I did

Re-fetched Glasgow's page on 2026-08-22, then resolved against UCAS as instructed.

## The evidence

**UCAS owns this date.** The equal consideration deadline is not an institutional policy — it is the
date by which an application must *arrive at UCAS*, published by UCAS as a dated cycle event. No
individual university sets it, and four peers agreeing is not four independent witnesses; it is
four correct restatements of one UCAS figure.

UCAS's own dated event page, already `VERIFIED_CURRENT` in this corpus
(`deadlines_batch3_2026-08-21.jsonl`, line 1):

> "Applications for all 2027 entry undergraduate courses, except those with a 15 October deadline,
> should arrive at UCAS by 18:00 (UK time) on **13 January 2027**."

Re-confirmed against UCAS's current key-dates guidance on 2026-08-22.

**Glasgow's page is unchanged and still says 14 January**, still with no year and no last-updated
date. It also still lists "15 October" for medicine/dentistry/veterinary/Oxbridge — which *does*
match UCAS — so the page is a copy of a UCAS cycle calendar with one figure left behind.

**A confirming detail on which cycle Glasgow is carrying.** UCAS's mid-January deadline falls on a
Wednesday:

- 14 January **2026** — Wednesday (2026 entry)
- 13 January **2027** — Wednesday (2027 entry)

Glasgow's "14 January" is therefore precisely the previous cycle's figure, one year stale. This is
not what resolves the conflict — UCAS's dated page does that on its own — but it confirms the
mechanism is an un-rolled carry-over rather than a genuine institutional divergence.

## Resolution

**13 January 2027, 18:00 UK time**, per UCAS, for 2027 entry. Glasgow's 14 January is the 2026-entry
date left un-updated.

Note how this differs from the reasoning the original record sketched. "Four peers say 13 January,
so Glasgow is probably wrong" is a majority-vote argument, and it happens to reach the right answer
here — but it would fail wherever a genuine institutional difference exists, and it treats four
restatements of one source as four pieces of evidence. Going to UCAS instead settles it in one
step and would keep working even if every peer page were also stale.

The corpus already contains the correct value: `deadlines_batch3` line 3 records Glasgow at
2027-01-13 sourced from UCAS, `VERIFIED_CURRENT`. That row is the one to trust; `DL-2026-08-21-1007`
is the record of Glasgow's own page being stale.

## Product implication

Glasgow's page is a live example of the staleness case already documented in
`source-authority-gap.md`. It matters more than the one-day difference suggests: a student who
applied on 14 January 2027 believing Glasgow's page would have **missed equal consideration by a
day**, and Glasgow would have been under no obligation to consider the application alongside
on-time ones.

The general rule this supports: for facts owned by an application system (UCAS, the UC Application,
QuestBridge, Studielink), the system's dated page should outrank an institutional restatement —
even when the institution is the one the student is applying to. Institutional pages are useful for
institution-specific requirements, not for platform-wide cycle dates.

## Corpus action

- `DL-2026-08-21-1007`: `verification_state` → `SUPERSEDED_BY_OWNER` (or `VERIFIED_HISTORICAL` for
  `cycle_year` 2026, which is what the figure actually is); `retrieved_at` → `2026-08-22`; retain
  `deadline_date: null` and the do-not-ingest instruction. Record that UCAS settles it and that
  the page is confirmed unchanged.
- `deadlines_batch3` line 3 (Glasgow @ 2027-01-13, UCAS-sourced) remains the authoritative row.
- Worth flagging for a separate pass: Glasgow's page also carries UCAS reply-by dates (6 May,
  3 June) and a 30 June final-application date that were not checked against UCAS in this pass. If
  one figure on the page is a cycle stale, the others deserve checking too.

## Proposed `requirement_source_conflicts` row

```yaml
university: University of Glasgow
subject: "Equal consideration date for undergraduate applications"
status: superseded
resolution_note: >-
  Resolved against the owner of the fact. The equal consideration deadline is the date an
  application must arrive at UCAS, published by UCAS as a dated cycle event; no university sets it.
  UCAS's own 2027-entry page gives 18:00 UK on 13 January 2027. Glasgow's dates-and-deadlines page,
  re-fetched 2026-08-22, still shows an undated "14 January" with no last-updated date, while
  correctly showing 15 October for medicine/dentistry/veterinary/Oxbridge — a UCAS calendar copy
  with one figure left behind. Confirming detail: UCAS's mid-January deadline falls on a Wednesday,
  and 14 Jan 2026 and 13 Jan 2027 are both Wednesdays, so Glasgow is carrying the 2026-entry
  figure one cycle stale. Note this was NOT resolved by peer majority — four peers publishing
  13 January are four restatements of one UCAS figure, not four independent witnesses. A student
  applying on 14 January 2027 would have missed equal consideration by a day.
resolved_at: 2026-08-22
```
