# Package V2-12 — results: verifying RES-R1's slot-correction fix (`871bbc9`), shape not just diff

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout, nothing fixed.** Per BASORG's framing (rule 28: a delta check confirms a
change matches its intent, not that the intent was right) — every check below asks whether the
resulting shape belongs, verified against the live pages and the corpus's own conventions, not
against the commit's description of itself.

## The ordinary half — confirmed exactly, exhaustively rather than sampled

- Diffstat: 6 JSONL lines / 56 README lines, exactly as stated.
- **Exactly 3 records changed** — checked all 120, not the 3 named ones: `AU-R1-adelaide-001`,
  `085`, `089` are the only records where before ≠ after. Zero unintended changes anywhere else.
- **Exactly 3 fields per record** — `study_mode`, `entry_requirements`, `researcher_notes`. No
  other field touched on any of the 3.
- **Corpus-wide count and ID set unchanged**: 120 before, 120 after, identical ID set.
- **Verbatim preservation, confirmed by exact substring match, not eyeballed**: the old
  `study_mode.international` provenance sentence and the old `entry_requirements.international`
  provenance sentence both appear byte-for-byte inside the new `researcher_notes` on all 3
  records — programmatically confirmed, not paraphrased or truncated.

## The half that matters more — does the resulting shape actually belong

**1. Is `domestic`-only the right shape, checked against the live pages fresh, not cited from an
earlier pass?** Re-fetched all three URLs' headers just now: bare URL and the explicit `/int/`
path both still return `301` to a `/dom/` destination on all three (e.g. `/study/degrees/2027/
foundation-studies/dom/`). There is genuinely no international-specific content to represent —
`domestic`-only is not an assumption borrowed from UniStart, it's independently true of these
three pages today.

**2. Does `researcher_notes` have its own convention, and does the moved text meet it — or did
the fix just relocate the defect?** Checked directly: `DEGREE_TYPE CORRECTION` is not a phrase
invented for this fix — it appears in **119/120** records corpus-wide, an already-established,
near-universal convention for appending a dated, attributed, labeled explanation of a prior
correction to `researcher_notes`. The new `PROVENANCE CORRECTION` and `SLOT CORRECTION` blocks
(3/120 records, exactly the 3 affected) follow that identical structure — dated, attributed,
stating what was wrong and why, quoting the preserved text verbatim at the end. This is not a
narrative paragraph dropped into an unstructured field; `researcher_notes`' actual convention is
exactly "hold dated correction narratives," which is what got moved into it. **One plain
observation, not a defect**: these 3 records' `researcher_notes` are now 3542–3999 characters,
well above the other 117 records' range (921–2054) — the corpus's new outliers by length. This is
the expected, correct consequence of the convention being additive (corrections append, never
overwrite) on records that have now been through three correction rounds each, not a sign the
convention was misapplied.

**3. Does the rewritten README prose match the current file, not just the change description?**
Checked the two specific quantitative claims in the new text directly against all 120 records,
not sampled: *"Populated for all 116 non-pathway records on the `international` key"* — confirmed
exactly, 0/116 missing it in either `entry_requirements` or `study_mode`. *"All 4 non-award
pathway records... carry no `international` key at all"* — confirmed exactly, 0/4 have one
anywhere. Both rewritten passages are accurate against the corpus as it stands today.

**4. Bonus check, not explicitly asked but directly in scope of "does this defect class exist
elsewhere in this same corpus": swept all 116 non-pathway records' `international` values for
length anomalies.** Every `study_mode.international` value is exactly `"Full-time"` (9 chars) or
`"Full time or part time"` (22 chars) — no outliers. Every `entry_requirements.international`
caps at exactly 1000 characters (a consistent extraction limit, not narrative text). **The slot
defect does not exist anywhere else in Adelaide's 120 records beyond the 3 already found and
fixed here.**

## Bottom line

The fix is correct on every dimension checked, including the one a diff-against-intent can't see:
the resulting shape genuinely belongs, independently confirmed against the live pages rather than
accepted because it matches UniStart or matches what was proposed. Nothing routed back — this is
the outcome where BASORG's proposed shape held up, not the outcome where it didn't.
