# RES-V2 session close-out — cold, per ORYN-CEO's wind-down

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
Written to stand alone for a session that may not resume. Package-by-package detail for DLOPP
through V2-9 is in `v2_10_lane-handoff.md`, not repeated here. This document: the instrument-bug
catalogue (the highest-priority item per BASORG/CEO), a brief note on the three packages since
V2-10, and final status.

## The instrument-bug catalogue — seven of mine, plus the wider pattern they belong to

The recurring lesson across all seven: **a check can be internally consistent and still answer a
narrower question than the one it looks like it's answering.** The first six are checks that
missed a real match through some form of format mismatch; the seventh (found last, and the most
important) is a check that was *structurally incapable of failing* — worth leading with, since it
generalizes furthest.

### 7. The invariance check that couldn't fail, because both sides came from one page

Adelaide's non-award pathway records (ATSIP, CASM Foundation Year, Foundation Studies) had
`entry_requirements`/`study_mode` keyed `{"international": ..., "domestic": ...}`. RES-R1's own
check compared the two keys for consistency, found them plausible, and moved on. **Why it looked
green**: the two values weren't just similar — they were byte-identical, because the bare URL,
the `/int/` path, and the `/dom/` path all 301-redirect to the same destination. A consistency
check between two values that share one origin cannot detect that shared origin; agreement is
guaranteed by construction, not earned by the content being correct. Confirmed via `Location`
header (not content diff — the header check is unambiguous where a content diff could be
mistaken for two independently-served identical pages). **This is the origin of rule 27**
(A consistency check between two values cannot detect a single-source origin), later confirmed as
the same species as: contract validation passing UWA's 63% misclassification (both pre-rebuild
passes were internally consistent, both wrong); a reconciliation closing perfectly on cancelling
terms; and — reported by RES-V1, not independently re-verified here, attributed rather than
absorbed — **a git-blob-hash-based dedup step in RES-V1's DLOPP verification** that initially
missed a file merged mid-verification because it compared paths, not content, across refs
(`docs/research/verification/v1_dlopp_verdict.md` on `main`, §"real bugs found and fixed") — same
family (a check whose comparison basis doesn't match the identity question being asked), not
independently confirmed as byte-for-byte the framing BASORG described, so cited rather than
claimed.

### The original six, symptom-first

1. **V2-3, Southampton** — title-only comparison missed the full name in the body heading; the
   `<title>` carries a shortened form. Fixed by checking body content.
2. **V2-3, St Andrews** — a regex requiring `</title>` missed all 10 records because the actual
   closing tag is `</title >` (trailing space).
3. **V2-4, `current_cycle_label`** — a literal string-inequality check produced 56 mostly-fake
   "holds" (live is often a fuller version of the same fact); a second trap in the same pass,
   `cycle_status_found: "unknown"` being a non-answer marker miscounted as a proposal. Net: 18
   genuine.
4. **V2-5, Monash** — a field-extraction script checked the wrong nested path for multi-campus
   programs (`campus` vs. `offering[].display_name`), producing 8 false mismatches.
5. **V2-6, NYT 403 page** — scored a false content-overlap match (0.43) against the row's title
   from shared common words alone; caught only by cross-referencing curl's raw status codes
   independently, not because the score looked wrong.
6. **V2-9, UWA** — a case-sensitive `Course Code` regex missed one record's all-caps card
   template (`COURSE CODE MJD-ESOFT`); flagged as genuinely unclear rather than assumed either
   way, resolved by reading the full page.

## A reusable technique, not an Adelaide detail

**Establish a field's job from the corpus, not from judgment.** When Adelaide's `researcher_notes`
needed a verdict on whether a moved provenance sentence belonged there, the answer wasn't reasoned
about — `DEGREE_TYPE CORRECTION` blocks were already present in 119/120 records, an existing,
corpus-wide convention for exactly this kind of dated, attributed correction narrative. The new
text matched that convention's structure exactly, which is evidence the field's actual domain
includes it, not an opinion that it should. Applicable anywhere a field's "real" domain is in
question: read what its other 100+ values already are before deciding what a new one should look
like.

## The three packages since V2-10, briefly

- **V2-11a — Ottawa (276 records): 72/72 clean.** Language-of-instruction confirmed genuinely
  per-record (9 French-titled-null records correctly null despite adjacent eligibility-French
  text; 8 explicitly-French records confirmed verbatim against the source); direction-of-defect
  on the excluded 123 (n=25): all genuine Minor/Major pages, nothing wrongly cut; new `status_note`
  field confirmed verbatim on 10/10; general content arm clean on 20/20.
- **V2-11b + V2-12 — Adelaide's provenance/slot fixes, both verified independently rather than
  taken on report.** V2-11b caught the schema asymmetry (UniStart's shape vs. the other 3) without
  calling a direction. V2-12 resolved the direction after RES-V1 diagnosed it: verified fresh
  against live pages (not cited from the prior package) that `domestic`-only is correct, that
  `researcher_notes`' own convention justifies where the text moved to, and that the rewritten
  README matches the current file exactly — including the arm that specifically tested whether
  BASORG's own proposed shape was wrong, which came back clean.
- **The 116-record sweep clearing Adelaide of the value-domain class entirely** (every
  non-pathway `international` value is exactly `"Full-time"`, `"Full time or part time"`, or
  ≤1000-char admission prose) — corroborated independently by RES-V1's V1-13, which ran first and
  reported this lane's sweep as a second confirmation. **Nobody should re-run either check on
  Adelaide.**

## Status at close

No active packages. No pending triggers — the Calgary pilot that would have set one didn't
happen. Everything in this lane's territory beyond that is gated behind a founder-level decision
(migration 0060, the Drive corpus, Path A), not something to pick up speculatively. All work
committed and pushed to `oryn/res-v2-source-verification`; nothing uncommitted, nothing half-done.
