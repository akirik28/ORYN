# 13 — Glasgow's TOEFL 92 against Edinburgh's TOEFL 4.5

**Records:** `REQ-2026-08-21-3007` (Glasgow), `REQ-2026-08-21-3021` (Edinburgh)
(`requirements_batch4_2026-08-21.jsonl`, lines 7 and 21)
**Status:** **Resolved — not a conflict. The record's premise was false**
**Re-checked:** 2026-08-22

## What was recorded

Two UK universities stating TOEFL requirements for tests taken from the same date boundary,
apparently on incompatible scales:

- **Glasgow**, Computing Science: "TOEFL (tests from Jan 21, 2026): 92 Overall, no subtest lower
  than Reading 22; Listening 20; Speaking 23; Writing 21"
- **Edinburgh**, Computer Science BSc: "TOEFL-iBT (including Home Edition) from 21 January 2026:
  total 4.5 with at least 4.0 in each component."

Both were marked `confidence: low` with "DO NOT INGEST until the post-January-2026 TOEFL scale is
confirmed at source", and Edinburgh's anomalous-looking 4.5 was deliberately recorded verbatim
rather than "corrected" — which was the right call and is why this resolved cleanly.

The record's stated reasoning was:

> "a different scale entirely for the same test on the same date boundary... whichever page is
> right, the two cannot both be applied to one student's score."

## What I did

Went to **ETS**, which owns the TOEFL scale, and then re-fetched both university pages.

## The evidence

**ETS rescaled TOEFL iBT on 21 January 2026.** Score reports now use a **1–6 scale** in half-point
increments, for the overall score and each of the four sections, aligned to CEFR levels.

**ETS reports both scales concurrently for two years.** During the transition ending **January
2028**, every score report carries the new 1–6 score *and* "a comparable overall score on the 0–120
scale, representing the midpoint of the corresponding total range" — alongside a CEFR designation.

**ETS's concordance:** overall **4.5 ↔ 86+** on the 0–120 scale; overall **4.0 ↔ 72+**.

Re-fetching both pages on 2026-08-22 shows each carries a **before/after boundary pair**, which the
original single-value capture did not surface:

| | Tests to 20 Jan 2026 | Tests from 21 Jan 2026 |
|---|---|---|
| **Glasgow** | 90 overall (0–120) | **92 overall (0–120)** |
| **Edinburgh** | 92 overall, 20 per component (0–120) | **4.5 overall, 4.0 per component (1–6)** |

## Resolution

**There is no conflict, and the record's central claim is false.**

The claim that "the two cannot both be applied to one student's score" fails on ETS's dual
reporting. A student sitting TOEFL in 2026 receives **one score report carrying both numbers** — a
1–6 score and a comparable 0–120 score. Glasgow's rule reads the 0–120 figure; Edinburgh's reads
the 1–6 figure. Both are evaluable, from the same report, at the same time. Nothing has to be
converted and nothing has to be chosen.

What the two universities did at the boundary simply differs, and both responses are coherent:

- **Edinburgh switched scales** — 92 on the old scale becomes 4.5 on the new one.
- **Glasgow stayed on the 0–120 comparable score** and adjusted its threshold from 90 to 92.

Glasgow's 92 is therefore **not a stale legacy number**. The page explicitly distinguishes tests
before and after 21 January 2026 and deliberately sets a *different* figure on each side of the
boundary. That is a considered response to the rescale, not an un-updated one.

Underneath the presentation, the two requirements are close but not identical: Edinburgh's 4.5
corresponds to 86+ on the 0–120 scale, so Glasgow's 92 is somewhat stricter. **That is allowed.**
Two universities are simply permitted to have different English requirements — and this points at
the deeper error in the original record. Two institutions stating different thresholds is not
evidence of a conflict at all; it is the normal state of the world. The only genuinely puzzling
thing was the *scale*, and ETS resolves that.

## Why this needed the correction spelled out

It would be easy to log this as "verdict changed" and move on. The more useful finding is that the
record's **reasoning** was wrong, not just its classification. A future reader who sees only a
flipped status might reconstruct the same false premise — that two scales for one test are mutually
exclusive — and re-flag the next pair of institutions that quote different TOEFL scales. There will
be many, for the next eighteen months.

The general rule: during a dual-reporting window, two thresholds on two scales are not competing
claims. They are two rules, each evaluable, and the `test_scale` qualifier is what makes them
independently usable rather than ambiguous.

## Corpus action

Both records are correct as captured and need no factual change — only qualification.

- `REQ-2026-08-21-3007` (Glasgow): `verification_state` → `VERIFIED_CURRENT`;
  `test_scale: TOEFL_IBT_0_120_LEGACY`; `scale_ambiguity: resolved_unambiguous`;
  `confidence` → `high`; `retrieved_at` → `2026-08-22`. Remove the do-not-ingest instruction.
  Add the newly surfaced pre-boundary figure (90 overall) as its own row.
- `REQ-2026-08-21-3021` (Edinburgh): `verification_state` → `VERIFIED_CURRENT`;
  `test_scale` → the new 1–6 scale (`TOEFL_IBT_1_6`); `scale_ambiguity: resolved_unambiguous`;
  `confidence` → `high`; `retrieved_at` → `2026-08-22`. Remove the do-not-ingest instruction.
  Add the pre-boundary figure (92 overall, 20 per component) as its own row.
- Both: retain the MyBest policy difference — Glasgow accepts MyBest, Edinburgh explicitly does
  not. Another genuine institutional difference, not a conflict.

**These are corpus-record specifications only. This lane wrote nothing to the database**; the
`test_scale` and `scale_ambiguity` columns added by migration 0056 are populated by the ingestion
path, not here.

**Scope note.** The 142 corpus records already carrying a `test_scale` and the 44 carrying an
incomparable one are outside this conflict, but the January 2028 deadline in migration 0056's
header applies to all of them: once dual reporting ends, an unqualified 0–120 threshold becomes
unmeasurable, because the comparable score disappears from the report.

## Proposed `requirement_source_conflicts` row

```yaml
university: University of Glasgow  # replicate for The University of Edinburgh
subject: "TOEFL threshold for tests taken from 21 January 2026"
status: resolved
resolution_note: >-
  Not a conflict, and the original record's premise was false. It claimed the two thresholds
  "cannot both be applied to one student's score". ETS rescaled TOEFL iBT to a 1-6 half-point scale
  on 21 January 2026 and dual-reports BOTH scales until January 2028 — every score report carries
  the 1-6 score and a comparable 0-120 overall score. So one report satisfies both rules
  independently, with no conversion. Re-fetched 2026-08-22, each page carries a before/after pair:
  Glasgow 90 then 92, both on 0-120; Edinburgh 92 with 20 per component, then 4.5 with 4.0 per
  component on 1-6. Edinburgh switched scales at the boundary; Glasgow stayed on the 0-120
  comparable score and raised its threshold, so Glasgow's 92 is a considered post-rescale figure,
  not a legacy leftover. ETS concordance: 4.5 = 86+, 4.0 = 72+, so Glasgow is somewhat stricter —
  which is simply allowed. Fix is qualification, not resolution: Glasgow needs
  test_scale TOEFL_IBT_0_120_LEGACY, Edinburgh the 1-6 scale, both scale_ambiguity
  resolved_unambiguous. Retain the genuine institutional difference that Glasgow accepts TOEFL
  MyBest and Edinburgh does not.
resolved_at: 2026-08-22
```
