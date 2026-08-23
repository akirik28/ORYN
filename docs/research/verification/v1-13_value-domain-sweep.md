# Sweep — the value-domain defect class, across every delivered corpus (RES-V1, package V1-13)

**Lane:** RES-V1 · **Swept:** 2026-08-22 · **Posture: read-only throughout.** No fixes, no
database writes, no repair proposals. The class this sweeps for (BASORG + RES-V2, found in
Adelaide, 2026-08-22): a provenance/derivation sentence sitting in a value slot whose
sibling records all hold a genuine value — the same field, wrong axis, a corpus-internal
version of the field_provenance-vs-audience axis-mixing V1-9 already ruled against.

**Scope, as revised mid-package**: originally all 6 corpora (UNSW, Sydney, Monash, UWA,
Adelaide, Ottawa). RES-V2's V2-12 (`9be7e53`) independently swept Adelaide's remaining
116 unaffected records as a bonus arm and found the class nowhere else there — **Adelaide
is cleared by that work, not duplicated here.** This sweep's own Adelaide pass (run before
that message arrived) reached the same conclusion independently; both are reported below
for the corroboration, but the authoritative Adelaide clearance is RES-V2's. **Everything
else in scope is now live**: UNSW (217), Sydney (149), Monash (178), UWA (107), and — as
of tonight, mid-package — **Ottawa (276)**. Anything found there needs Path A, not a
source fix; framed accordingly throughout.

## Headline: the class does not exist outside Adelaide's already-fixed 3 records

Swept all six corpora (1,047 records) with two independent, corpus-agnostic signals
before Adelaide's scope reduction arrived, and re-confirmed the live four plus Ottawa
specifically afterward. **Zero instances of the target class in UNSW, Sydney, Monash,
UWA, or Ottawa.** A related-but-distinct signal fired 13 times across Sydney and Monash;
every one, read in full, is genuine multi-campus or multi-band admission content, not the
defect class — reported below with the reasoning, not just the count.

## Method — two signals, corpus-agnostic, run without knowing a field's "correct" shape in advance

Built as a reusable function (`findValueDomainOutliers`,
`scripts/validate-research-records.ts`, unit-tested — 4 new tests, calibrated on the real
Adelaide case), not a one-off script, per BASORG's standing invitation to judge whether
this belongs in the validator. Wired into both `au-r1` and `ca-r1` as a **finding**, not a
defect — deliberately, because the false-positive rate on the length signal alone is real
and was measured in this same sweep (below), not assumed:

1. **Length outlier**: a field whose values are normally short across its own corpus
   (median < 150 chars — i.e., enum/label-shaped) getting a value dramatically longer than
   its own median. Judged against the field's own sibling values in the same corpus, not
   a fixed schema, so a genuinely complex program's longer value isn't penalized relative
   to some universal template.
2. **Provenance-language marker**: text matching phrasing that explains how a value was
   derived rather than stating what it is (`"confirmed live"`, `"301-redirect"`,
   `"byte-identical"`, a parenthetical date-stamp, etc. — the exact vocabulary of the real
   Adelaide instance). Independent of field length, so it would catch a similarly-long
   provenance sentence replacing similarly-long genuine content in a normally-long field
   like `entry_requirements`, where signal 1 alone wouldn't flag the length as unusual.

Metadata/URL/free-text fields (`researcher_notes`, `verification_status`,
`official_program_url`, `field_provenance`, etc.) are excluded from both signals —
expected to be long or provenance-flavored, not value slots.

## Per-corpus result

| Corpus | Records | Live? | Signal 1 (length outlier) | Signal 2 (provenance marker) |
|---|---|---|---|---|
| UNSW | 217 | Live | 0 | 0 |
| Sydney | 149 | Live | 8 (`campus`) | 0 |
| Monash | 178 | Live | 5 (`campus` ×2, `atar.value` ×3) | 0 |
| UWA | 107 | Live | 0 | 0 |
| Adelaide | 120 | Not live | 0 (post-fix; see below) | 0 |
| Ottawa | 276 | **Live as of tonight** | 0 | 0 |

**Zero provenance-language hits anywhere** — the exact phrasing of the known defect does
not recur. **13 length outliers, all in two AU universities, none in the two corpora
carrying the highest current stakes (UWA, Ottawa).**

## The 13 length outliers, read individually — genuine content, not the defect class

Read every flagged value in full rather than trusting the outlier flag itself (the same
discipline the flag exists to enforce on the corpus, applied to the flag's own output):

- **Sydney `campus` (8 records)**: e.g. *"The University of Sydney (Camperdown/Darlington
  campus) AND Camden Campus (Plant Breeding Institute)"* — genuine dual-site programs
  (agriculture/veterinary science splitting time between the main campus and a
  specialized rural campus, one music program spanning the Conservatorium and main
  campus). Real, correct, useful information; longer because the underlying arrangement
  is genuinely more complex than a single-campus program's.
- **Monash `campus` (2 records)**: a genuine dual-campus double degree (Clayton +
  Parkville for a combined Engineering/Pharmaceutical Science program) and a program
  whose campus depends on entry pathway (school-leaver vs. graduate entry). Same
  character as Sydney's.
- **Monash `atar.value` (3 records)**: genuinely tiered ATAR cutoffs with real caveats
  (e.g., *"UERT score only applicable to Year 12 qualifications... foundations cannot be
  accepted into this program"*) for programs with multiple entry bands or components.
  Accurate, useful admission detail, not filler.

None of these describe how the data was obtained; all of them describe what the program
actually is. **Correctly distinguished from the target class by reading the content, not
by the length flag alone** — which is exactly why this ships as a finding for review, not
a defect that fails a batch.

## Adelaide — cleared, corroborated by two independent sweeps

Fetched Adelaide's current file (post-fix, commit `871bbc9` — landed before this sweep's
Adelaide pass ran): the 3 previously-defective records (`001`, `085`, `089`) and UniStart
(`120`) now share one consistent shape — `entry_requirements`/`study_mode` carry a
`domestic` key only, no `international` key at all, matching UniStart's original "correct"
shape exactly. **0 findings from either signal on the current file.** RES-V2's V2-12 swept
the other 116 records specifically (this sweep's own scope, before the reduction, covered
the same ground); both land on "nowhere else in Adelaide" independently — reported as
corroboration, not claimed as this package's own discovery.

## Explicit live/not-live split, restated because the stakes changed mid-package

**Live and carrying the defect class: none.** UNSW, Sydney, Monash, UWA — all already
live — and Ottawa, which went live tonight mid-package (17,046-record live total,
verified against the table per tonight's note, not this package's own count) — **all
return zero instances of the target class.** Nothing found here needs Path A, because
nothing was found. Ottawa in particular got a full, deliberate re-check after learning it
had gone live under methods (both lanes' original passes) that predate this defect
class's discovery and could not have seen it — same zero result on recheck as on the
original pass.

**Not live, fixable at source: Adelaide only, and already fixed** before this sweep
reached it, corroborated by RES-V2's independent pass.

## Reusable check — added to the validator, scoped as a finding deliberately

`findValueDomainOutliers` is wired into both `au-r1` and `ca-r1`'s `customLiveChecks`,
runs corpus-wide with no per-lane tuning required, and is unit-tested against the
calibrated real case (flags it), a synthetic length-only outlier (flags it, confirming
the lead-generation signal fires independent of wording), a uniform clean corpus (flags
nothing), and the metadata-field exclusion (`researcher_notes` never flagged regardless
of length). Deliberately a **finding**, not a defect: this sweep measured a real
false-positive rate on signal 1 alone (13 flagged, 0 confirmed defects) — a hard gate
would have failed Sydney's and Monash's batches over correct data.

## Scope: what this covers, and what it does not

**Covered:** all six delivered corpora, both signals, every flagged candidate read
individually rather than trusted at face value; the live/not-live split, restated to
reflect Ottawa's ingestion mid-package.

**NOT covered:**
- **Fields not represented as a plain string or a one-level string-valued dict** — the
  walk doesn't descend into arrays or nested objects beyond one level; if a corpus
  represents a value-domain-violating field in a shape other than AU-R1/CA-R1's own
  (string, or `{international, domestic}`-shaped dict), it wouldn't be walked. No corpus
  in scope currently has such a shape, so this is a stated boundary, not a known gap.
- **Corpora outside this org's own delivered-research pipeline** — the pre-existing live
  Canada universities characterized in V1-11 (Western, Toronto, Alberta, Montreal, UBC,
  Queen's, Waterloo) predate this pipeline and have no corresponding JSONL file to sweep;
  out of this package's scope by definition, not overlooked.
- **Whether the 13 length-outlier records' content is independently verified correct**
  (source-truth, not shape) — read for plausibility and internal consistency (matching
  program names, sensible campus/ATAR structure), not re-fetched live against
  Sydney's/Monash's own pages; that would be RES-V2's territory if warranted.
