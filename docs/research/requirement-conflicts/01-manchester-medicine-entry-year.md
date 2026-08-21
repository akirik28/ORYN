# 01 — Manchester: Medicine/Dentistry October deadline bound to the wrong entry year

**Records:** `DL-2026-08-21-9004` (`uk_tr_deadlines_batch1_2026-08-21.jsonl`, line 4)
**University:** The University of Manchester (United Kingdom)
**Status:** **Resolved — as two separate findings**
**Re-checked:** 2026-08-22

## What was recorded

One sentence on one official Manchester page:

> "If you're applying for Medicine or Dentistry courses, the deadline is 15 October 2026 (6pm, UK
> time) for September 2024 entry."

`deadline_date` and `cycle_year` were left NULL. The original researcher's reasoning was sound and
worth preserving: any value "would be this lane choosing which half of the sentence to believe."
The sentence is self-contradicting inside a single official source, so no cross-source precedence
rule helps — there is only one source.

## What I did

Re-fetched the page on 2026-08-22. **It is unchanged, verbatim.** Same sentence, same
"September 2024 entry", still no last-updated date, and the rest of the page still written for
September 2026 entry. So the contradiction is live, not an artefact of a stale capture.

Then went to the body that owns this deadline. UK undergraduate application deadlines are not set
by individual universities — applications are received by **UCAS**, and UCAS publishes the cycle
deadline as a dated event.

## The evidence

UCAS's own dated event page for 2027 entry — already in this corpus as `VERIFIED_CURRENT`
(`deadlines_batch3_2026-08-21.jsonl`, line 2):

> "Applications for any 2027 entry course at the universities of Oxford and Cambridge, or for most
> courses in medicine, veterinary medicine/science, and dentistry, should arrive at UCAS by 18:00
> (UK time) today"

— dated **15 October 2026**. Re-confirmed against UCAS's current key-dates guidance on 2026-08-22:
6pm on 15 October 2026 for medicine, dentistry, veterinary and Oxbridge; 13 January 2027 for
everything else.

Corroborating, independently in-corpus: Cambridge (`deadlines_batch1`, line 1) and Oxford
(`deadlines_batch3`, line 4) both publish 15 October 2026 for 2027 entry.

## Resolution

The sentence's two halves have different truth values, and an external source settles which is
which without this lane picking a half:

- **"15 October 2026 (6pm, UK time)" is correct.** It is the real UCAS deadline, to the hour.
- **"September 2024 entry" is wrong.** That date governs **September 2027 entry**. September 2024
  entry closed on 16 October 2023, four cycles ago.

So the record can now carry `deadline_date: 2026-10-15` and `cycle_year: 2027` — not by believing
half of Manchester's sentence, but because UCAS independently establishes the date and the cycle it
belongs to.

## The second finding, which does not go away

Knowing the right date does not fix the page. **A student reading Manchester's page today is still
misled**, and will be until Manchester edits it. Those are two different facts and both belong in
the record:

- *What the deadline is* — settled, 15 October 2026, 2027 entry.
- *What the page says* — still self-contradicting, confirmed live on 2026-08-22.

The second matters for the product. If Oryn ever surfaces Manchester's page to a student as a
source link, it links to text that names the wrong entry year. The date shown should come from the
UCAS record, and the Manchester page should not be the cited source for it.

## Corpus action

Update `DL-2026-08-21-9004`:

- `deadline_date` → `2026-10-15`; `cycle_year` → `2027`; `cycle_label` → `2027 entry`
- `verification_state` → `VERIFIED_CURRENT`
- `retrieved_at` → `2026-08-22` (re-fetch confirming the page is unchanged)
- Keep `deadline_text_verbatim` exactly as-is — the wrong entry year is the evidence for the
  second finding and must not be tidied away.
- Record in `limitations` that the source page remains self-contradicting and should not be used
  as the citation for this date.

## Proposed `requirement_source_conflicts` row

```yaml
university: The University of Manchester
subject: "Medicine and Dentistry application deadline"
status: resolved
resolution_note: >-
  Manchester's own page binds "15 October 2026 (6pm, UK time)" to "September 2024 entry" — a
  self-contradiction within a single official source, still live and unchanged as of 2026-08-22.
  Resolved externally rather than by choosing a half: UCAS receives UK undergraduate applications
  and publishes this deadline as a dated event. UCAS's 2027-entry page gives 18:00 UK on
  15 October 2026 for medicine/dentistry/veterinary and Oxbridge. The date on Manchester's page is
  therefore correct and the entry year is not; it governs September 2027 entry. September 2024
  entry closed 16 October 2023. Manchester's page remains an unsafe citation for this date until
  corrected.
resolved_at: 2026-08-22
```
