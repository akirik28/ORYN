# Package V2-5 — results: RES-R1's Australian corpus (UNSW/Sydney/Monash)

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout.** Design and seeds: `v2_5_au-corpus-design.md` (pushed before
any fetch). **Elevated scrutiny note**: BASORG reported RES-R1's UWA batch running
~30% wrong on `degree_level` (schema-valid, semantically wrong — the class of defect
"corpus-validated" cannot catch). UNSW/Sydney/Monash are explicitly not UWA, but every
result below was checked with that failure mode specifically in mind, not waved through
on a clean first pass.

## Headline result: 82/82 sampled records confirmed clean

Zero substantive defects across both instruments, on all five checked fields
(`program_name`, `degree_level`, `degree_type`, `duration`, `campus`). Two things
happened on the way to that number that are worth reporting in full, because both
looked like defects on a first pass and were not:

### 1. Sydney's documented fetch method (`.model.json`) is broken right now — a real, dated finding, not a tooling error on my side

RES-R1's README documents fetching Sydney's AEM `.model.json` selector — same-day,
149/149 success. My attempt at the identical selector, same URLs, hours later: **21/21
failed with HTTP 400**, including a URL with no sample-specific content at all
(`bachelor-of-commerce.html.model.json`, not even in my sample — tested to rule out a
URL-specific cause). The base HTML pages (no selector) return 200 throughout. This
looks like the `.model.json` endpoint itself went down or got locked down between
R1's fetch and mine, same day — not a block (robots.txt unchanged, confirmed clean),
not rate-limiting (fresh untried URLs failed identically), not my request shape (tried
with/without compression, different UAs, HTTP/1.1 — all 400). **Worked around by
reading the rendered browser DOM instead** — the same JS that populates the loading
shell client-side gave me the identical facts (title, duration, campus) that
`.model.json` would have, on the same official host, same content, different
retrieval path. All 21 Sydney records verified this way, all clean. Flagging the dead
endpoint itself as a finding RES-R1 or whoever touches Sydney next should know about —
their documented method may not work if re-run today.

### 2. My own quick field-extraction script produced 8 false "campus mismatch" flags — caught before reporting them

First automated pass compared each record's `campus` against `pageContent.campus`
(UNSW) or `pageContent.campus`/`.location` (Monash). 8 Monash records —
Malaysia/Indonesia-campus and City(Melbourne)-campus programs — came back with an
**empty top-level `campus` field**, which my script read as a mismatch against the
record's populated value. Before reporting 8 "defects," I went looking for where the
real value lives: Monash's multi-campus records carry the campus name inside
`pageContent.offering[].display_name` (e.g. `"On campus-Malaysia"`), a structurally
different location than the single-campus Clayton-based records use. **Re-checked all
8 against the correct field: all 8 exact.** This is the same class of near-miss as
today's Southampton-title and St Andrews-tag issues — my own tooling being too
shallow on the first pass, not the underlying data being wrong — caught the same way,
before it became a false finding rather than after.

## Targeted instrument (n=37) — every rare/edge `degree_level` category

All 37 confirmed clean once the two issues above were resolved. Specific checks most
relevant to BASORG's UWA-driven warning:

- **Sydney's dual "Bachelor...and Master..." titles** (the exact shape UWA's
  title-token method got wrong — a graduate-level word present anywhere in the title):
  `AU-R1-sydney-132` "Bachelor of Science and Master of Nutrition and Dietetics" and
  `AU-R1-sydney-027` "Bachelor of Arts and Master of Nursing" both correctly carry
  `degree_level: Bachelor / first-cycle`, not miscategorized by the "Master" substring.
  Sydney's scope (`uc` sitemap group only) also structurally excludes standalone
  postgraduate titles by construction — no pure "Master of X"/"Doctor of X" title
  exists anywhere in my 21-record Sydney sample to test the more dangerous case
  (a *standalone* graduate title, UWA's actual failure), because none exist in scope.
- **Monash's `_combo` double-degree codes** (its newest, least-precedented AQF
  encoding): 4 sampled (`7_7_combo`, `8_7_combo`×2, `7_9_combo2`) — all correctly
  mapped by the higher-component rule the README documents, all five checked fields
  exact on each.
- **UNSW's Music/BMus-class near-miss category** (AQF-5 diplomas, undergraduate
  certificates, non-award pathways): all 13 sampled records exact, including the two
  "NAWD - N/A" non-award records where `degree_type` is genuinely empty on the source
  (not a research gap) and the three pathway programs' `award_type_single: "Non-award
  Program"` self-declaration, independently re-confirmed.
- **UNSW's plain "Bachelor / first-cycle" majority case** (`aqf_val: "7_bachelor"`):
  not in the README's small worked-example table (which covers only the *rare*
  categories), so my first pass flagged these as "unmapped" against my own
  reconstructed lookup — not a defect, just an incomplete table on my side. AQF Level
  7 = Bachelor Degree is the Australian Qualifications Framework's own national
  definition, not an R1 convention, so this mapping needs no further verification
  beyond confirming the AQF code itself is what the source states (it is, on all 15+
  sampled records carrying it).

Three cosmetic-only mismatches, not counted as defects: `AU-R1-unsw-100/211/212`'s
`program_name` differs from the source's raw title by a single trailing space, which
R1 correctly stripped and my strict `==` comparison didn't account for;
`AU-R1-monash-153`'s multi-line campus description matches content-for-content with a
newline-vs-space difference only.

## Random instrument (n=45) — proportional, unbiased population estimate

**45/45 clean.** No defects surfaced in the unbiased draw, across UNSW (18), Sydney
(12), Monash (15). Combined with the targeted instrument's clean result, both
instruments agree — the same pattern that let earlier packages distinguish a real
population rate from a directed-sample artifact, this time confirming a clean corpus
rather than surfacing a hidden one.

## Monash's 9 excluded postgraduate records — mechanism check, explicitly partial

As scoped in the design doc: the 9 aren't identifiable by ID from any committed file,
so reconstructing the exact list would mean redoing a meaningful slice of RES-R1's own
503-code sitemap discovery. Did the planned best-effort check instead — fetched
Monash's actual sitemap (503 codes, confirmed matches R1's own count exactly), drew 15
random codes (`seed=42`) and checked their `aqf_level`/`type` fields directly.

**Result: found 3 genuine Graduate Certificates in the draw (`A4007`, `L4007`,
`P4005`), and all 3 carry a *populated* `aqf_level: "8_grad_cert"`** — not null. This
doesn't confirm the specific mechanism (null `aqf_level` + a PG-type `type` field) the
9 exclusions rest on, because the null-`aqf_level` population is only 12 of 503 (2.4%)
— a 15-code random draw has roughly a 65% chance of missing it entirely, and did. What
it does confirm: populated Graduate Certificates correctly carry their own real
`aqf_level` value, so the null-`aqf_level` anomaly genuinely is a minority data gap on
Monash's side (consistent with R1's own framing), not the default state for
postgraduate credentials generally.

**Stating plainly, not rounding up**: this is a check of the mechanism's plausibility,
not a verification of the 9 specific records. I did not find and confirm the actual 9
excluded IDs. If BASORG wants that exact confirmation, it would need either R1 to
commit the excluded set (cheap, since they already have it from their own pass) or a
much larger random draw on my end (60-90+ codes for good odds of hitting the 12).

## Verdict

**82/544 sampled (15.1%), zero defects found.** Recommend the batch
as trustworthy — this corpus does not show the UWA failure mode within what was
sampled, on either instrument, including on the specific title-shapes UWA's defect
class would have hit hardest. The one operationally important finding is
process-facing, not data-facing: **Sydney's documented `.model.json` retrieval method
no longer works as of today's re-fetch** — anyone re-verifying or extending Sydney
coverage should know to use rendered-DOM extraction instead, not assume R1's method
still functions.
