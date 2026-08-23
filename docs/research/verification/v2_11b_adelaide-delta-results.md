# Package V2-11b — results: Adelaide delta since V2-8

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout.** Delta only, per BASORG's framing — V2-8's verdict covered the
original 119-record file; this checks the two commits since (`5d855e6`, `66f8ba3`) that V2-8
does not cover. No sampling design needed: every specifically-named affected record was checked
at full coverage (4 records), not sampled, since that's the entire affected population.

## The four pathway records — confirmed honest, one schema inconsistency worth naming

**Redirect behavior independently re-confirmed, fresh, with headers (not just a content diff):**
for all three original pathway records (ATSIP, CASM Foundation Year, Foundation Studies), both
the bare URL and the explicit `/int/` path return `301` with an identical `Location:` header
pointing to the `/dom/` variant (e.g. `/study/degrees/2027/foundation-studies/dom/`). There is
no way to reach a distinct international page for any of these three — confirmed at the
HTTP-redirect level, the strongest form of this check available. The new `international` key's
text ("the bare URL and the explicit /int/ path both 301-redirect to the /dom/ variant") states
exactly this, correctly.

**Foundation Studies' new `domestic` key confirmed**: fetched the live `/dom/` destination
directly — title "Study Foundation Studies at Adelaide University - Information for Domestic
students," consistent with the stored content.

**UniStart (`AU-R1-adelaide-120`) sourcing confirmed**: fetched `.../online/2027/unistart/dom/`
directly — page states `Program code XUNIS`, `0.5 year(s) full-time` duration, `Study as Full
time or part time`, matching the stored record exactly (and matching what V2-8 already found
independently before this record existed in the committed file).

**One schema-consistency note, not a factual error**: the commit message states the corrective
international-key text was applied "to all 4 pathway records (including UniStart)." **UniStart's
`entry_requirements`/`study_mode` dicts don't have an `international` key at all** — the
explanation lives only in `researcher_notes` prose ("no international variant exists, so
entry_requirements/study_mode carry only a `domestic` key here"), not as a value under an
`international` key the way the other three pathway records carry it. Both representations are
equally honest (neither duplicates domestic content under a misleading label), but they're not
the *same* shape: a consumer reading `record.entry_requirements.international` generically
across this four-record category gets an explanatory string for three of them and a missing key
(not even `null`) for the fourth. Worth flagging for consistency's sake, not worth blocking on —
low severity, since the honest-content goal the fix was actually for is met either way.

## Reconciliation restatement

Confirmed: 560 = 120 in-scope + 215 + 126 + 98 + 1, with the separate note that the original
560-URL enumeration itself was short by one (UniStart's own URL), true grand total 562 — the
enumeration was incomplete, not mis-bucketed. This matches what a fresh independent sitemap
count would show (not re-run here, since V2-8 already established the population-count method
for this corpus and nothing about the exclusion buckets changed in this delta).

## Bottom line

Both V2-8 findings were resolved correctly and verified independently rather than taken on the
commit message's word: the false-provenance labeling defect is fixed with an honest
representation (not a duplicate-under-a-new-label), and UniStart is sourced correctly. One minor
schema-shape inconsistency (UniStart's missing vs. present `international` key) noted for
whoever next touches this category, not blocking.

## Addendum — the schema note above had a direction, and it was the opposite of what I flagged

RES-V1's V1-12 check on this same field, cross-referenced with BASORG, resolved which of the two
shapes is actually correct — and independently re-confirmed here rather than taken on report.
`AU-R1-adelaide-002` ("Bachelor of Agricultural Sciences," an ordinary record) carries
`study_mode: {"international": "Full-time"}` — a short, enum-like value, the field's real
domain. **The three pathway records carry a full provenance paragraph in that same slot**
(`"No distinct international variant published for this pathway -- confirmed live
(2026-08-22)..."`) — a narrative explanation, not a study-mode value, sitting where
`"Full-time"` or `"Full time or part time"` belongs. **UniStart's shape — omitting the key
entirely when there is nothing to report — is the one consistent with every other record in the
corpus.** The three "more thoroughly fixed" records are the ones that actually don't fit the
field's own contract; the explanation belongs in `researcher_notes`, where it already,
separately, correctly lives.

Restating this plainly since I flagged the asymmetry but declined to call a direction: I had the
observation right and the direction backwards. The check that resolved it was the same one this
whole session keeps landing on — read the field's own ordinary values before judging one of its
edge cases, rather than treating two internally-consistent-looking shapes as equally plausible
candidates.
