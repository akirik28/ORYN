# Package V2-3 — content verification: url_repair's 1,429 + Glasgow's 62

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`
**Read-only throughout — no writes, no migrations, no researcher-file edits.**

## Scope of this verdict

**Covered**: does each sampled record's *content claim* hold against the live official
source, fetched directly by me today. For url_repair: does the corrected URL resolve,
and does it resolve to the *specific programme* the record claims (not merely "a page").
For Glasgow: is the proposed `degree_type` a qualification the official page actually
lists for that programme, today.

**Not covered**: identity resolution (I1 already did the URL-exact-match design and I
independently re-derived it — see Target 2 below — but I did not re-litigate whether
URL-matching is the right resolution method, only whether its output is factually
correct); the `superseded_by_id`/Path A vs Path B write-mechanism design (I1's, not
mine); and, for Glasgow specifically, **whether a single-value `degree_type` column is
even the right schema for a programme that offers several qualifications** — that
question is named explicitly below, not answered by me.

---

## Target 1 — url_repair: 1,429 corrected URLs

**Population note**: I count 1,437 records across the 12 files, all with
`previous != corrected`. Per BASORG, RES-I1's 1,429 is the count that would *actually
change* the live value; 8 of the 1,437 are no-ops (corrected already equals live) — a
minor self-consistency signal that the batch was built against a slightly earlier
snapshot, not a defect. Sampled from the 1,429 that would change something; a no-op
tells us nothing about correction quality.

**Sample**: n=80 (5.6%), stratified by `correction_type` (not plain random — see prior
message for the full rationale): 55/1,188 `shared_portal_root`, 15/162
`pagination_link` (100% Durham), 10/87 `actively_misleading_archived_cycle` (100% St
Andrews, oversampled because it's the researcher's own risk label on itself). Seed
`20260822003`.

**Method, per BASORG's refinement**: two failure modes, checked and reported
separately, with different bars.
- **Type A (doesn't resolve)**: robots.txt fetched per-domain before any content
  request (17 domains, sequential, unbatched); direct `curl` first, rendered browser on
  tooling-level bot-detection with clean robots.txt (Durham + KU Engineering — both
  403'd via CloudFront on `curl`, both loaded cleanly via browser, confirmed not a
  policy block by reading each host's actual robots.txt).
- **Type B (resolves to the wrong programme)**: for every record, read the fetched
  page's own title/heading and — critically, after my first pass's title-only check
  gave false positives — its **body content**, and confirmed it names the *specific*
  claimed programme, not merely "a plausible-looking page." Southampton's pages in
  particular have a shortened `<title>` (e.g. "Nanotechnology Engineering") that
  differs from the full body heading (e.g. "Electronic Engineering with Nanotechnology
  (MEng)") — a title-only check would have produced false "mismatch" flags on ~8
  records; checking body content resolved all of them as genuine matches. St Andrews'
  10 records (the highest-risk stratum) all render their `<title>` via a
  `</title >`-with-trailing-space tag my first regex missed entirely — refetching the
  actual tag confirmed all 10 exact.

### Result

**Type A: 0/80 failed to resolve. Type B: 0/80 resolved to the wrong programme.**

Every one of the 80 sampled corrected URLs loads and is confirmably about the specific
programme the record claims — not just a same-university plausible neighbor. Two
records worth naming individually because they were the sample's own stress-test of
Type B: Durham's `engineering-mechanical-h314` (BEng) and `engineering-mechanical-h311`
(MEng) are two different degrees with nearly identical names and both landed in the
sample — each resolves to its own distinct UCAS code and its own distinct page, not
conflated with the other.

**Verdict: PASS on both instruments.** Type A's rule-of-three bound is now moot (0
found, not just an upper bound), and Type B — the bar BASORG set at "essentially
zero, even 1–2 in 80 fails it" — is exactly zero. Recommend the batch (1,429 records)
as safe to apply wholesale, sampling-instrument caveat below notwithstanding.

**Caveat, stated precisely rather than rounded away**: 5.6% of 1,429 is not a census.
Two of the three strata are single-institution by construction (Durham,
St Andrews) — a finding in either would have been about that university's repair
specifically, not the batch; since neither produced a finding, this caveat is now moot
for those two, but the `shared_portal_root` stratum (1,188 records, 10 universities,
sampled at 55) carries more residual uncertainty per-university than the other two,
proportionally. Zero defects at n=55 from a population of 1,188 bounds the true rate at
roughly 5% (rule of three), same as the overall figure — not tighter, since it's the
largest and least-uniform stratum.

---

## Target 2 — Glasgow's 62 `degree_type` enrichment candidates

**Re-derivation, not re-quoting**: pulled the source file
(`acquire-programs-batch2_2026-08-20.jsonl`, Glasgow's 101 records) and the live 101
Glasgow `university_programs` rows myself, ran the URL-exact-match resolution
independently. **62 clean/31 zero-match/0 ambiguous — matches I1-4's numbers exactly.**
Third independent derivation of this number today (I1, CFO, now me) — sampling from my
own candidate list, not a re-quoted one.

**Sample**: n=30/62 (48%). Stratified to guarantee coverage rather than pure random,
given the small population: Glasgow's 3 singleton degree types in the 62
(BA, MBChB, BN — one candidate each) are **all** included, since a random draw could
easily miss a rare professional/vocational abbreviation entirely; the remaining 27 are
a seeded random draw (seed `20260822002`) from the 59 BSc/BEng/LLB candidates.
Composition: 16 BSc, 8 BEng, 3 LLB, 1 each BA/MBChB/BN.

**Method**: `gla.ac.uk` robots.txt checked once (clean, no AI-specific or wildcard
rule), then all 30 programme pages fetched directly. Each page states its own
qualification(s) in a consistent, structured heading — e.g. "Community Development BA",
"Sport & Exercise Science BSc/MSci" — immediately below the page title. Compared each
record's proposed `degree_type` against that heading.

### Result

**30/30 — every proposed `degree_type` is a real, currently-listed qualification for
that specific programme on the live official page. Zero factual errors.**

### The finding underneath the clean number

5 of the 30 sampled programmes are genuinely single-award (Community Development→BA,
Medicine→MBChB, Nursing→BN, Finance & Statistics→BSc, Common Law→LLB) — for these, the
file's value is simply *the* answer.

**The other 25 of 30 (83%) are multi-award programmes** — the live page lists 2 to 4
valid qualifications (e.g. `BSc/MSci`, `BEng/MEng`, `MA(SocSci)/LLB/MA`), and the file's
`degree_type` column holds exactly one of them. Every one of those single values is
real and true — that's what "30/30 pass" means — but a single-column field cannot
represent "BSc or MSci" as two things, and the record's own `researcher_notes`
("Deterministic extraction, `scripts/acquire-programs.ts` batch2") indicate this is a
mechanical parse of the source catalogue's bracketed text
(`program_name: "Politics [MA/LLB/MA(SocSci)]"` → `degree_type: "LLB"`), not a
deliberate "this is the primary/base award" judgment. I checked two of the three-option
cases (Politics, Social & Public Policy) specifically because "LLB" is an odd pick to
land on from `MA/LLB/MA(SocSci)` if the intent were "pick the base Scottish MA" — the
provenance confirms it's extraction-order, not editorial judgment.

**This is not a defect under the question asked** (is the value true — yes, for all 30)
**but it is a real seam, and it is not mine to close.** If my stratified sample's 83%
multi-award rate extrapolates to the full 62 (it should, roughly, since the sample was
drawn to match the population's own degree_type distribution), then applying all 62
values as-is will silently drop the MSci/MEng/MA-alternative information for roughly 51
of the 62 rows — each written value stays individually true, but "Sport & Exercise
Science: BSc" reads as more complete than it is for a programme also offered as a 5-year
MSci. Flagging for BASORG/CFO, not deciding: is a single `degree_type` column the right
target for a multi-award programme, or does this want a structural answer (an
alternates array, a deliberate base-award convention, or holding multi-award rows for a
richer field) before the batch is applied? The narrow factual question this package
was asked has a clean answer; this adjacent one doesn't, and rounding it into either
"pass" or "fail" would hide it rather than surface it.

**Verdict: PASS on factual accuracy (30/30, zero errors) — recommend the 62-record
batch as safe to apply on the single-value-is-true standard.** The multi-award
completeness question is separate from that verdict, not a reason to withhold it, but
worth resolving before anyone treats a written `degree_type` as the whole story for a
BSc/MSci-style programme.

---

## Summary for both targets

| Target | n | Population | Result | Verdict |
|---|---|---|---|---|
| url_repair | 80 | 1,429 | 0 Type A, 0 Type B | **PASS — apply wholesale** |
| Glasgow degree_type | 30 | 62 | 0/30 factually wrong; 25/30 (83%) multi-award simplified to one value | **PASS on accuracy — flag completeness question before applying** |

Both batches clear the bar this package set out to measure. Neither result is a
census; both are reported with their seeds, strata, and residual uncertainty stated
rather than rounded away, per the standing discipline this package has held all day.
