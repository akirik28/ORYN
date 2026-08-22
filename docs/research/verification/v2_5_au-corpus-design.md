# Package V2-5 — sampling design (pushed before fetching, per standing instruction)

**Verifier lane:** RES-V2 · **Date:** 2026-08-22 · **Branch:** `oryn/res-v2-source-verification`

Target: RES-R1's Australian programme corpus, `origin/oryn/res-r1-au-programmes` —
`data/research/university-programs/au_programs_{unsw,sydney,monash}_2026-08-22.jsonl`.
Population counted directly (matches the lane's own README exactly): UNSW 217, Sydney
149, Monash 178 = **544**.

Per-record check: does the official page state the recorded `program_name`,
`degree_level`, `degree_type`, `duration`, and `campus`.

## Reproducibility note

If this session ends before the verdict lands, the samples below are fully
re-derivable from the seeds alone against the two source files (`unsw.jsonl`,
`sydney.jsonl`, `monash.jsonl` pulled from the branch above) — a successor doesn't need
anything from me beyond this file.

## Instrument 1 — targeted (n=37), rare/edge `degree_level` categories

Aimed at where each university's derivation method is load-bearing, not generic
"edge cases":

- **UNSW** (AQF structured-code mapping): all 8 AQF-5 diplomas, all 3 non-award
  pathway programs, both "undergraduate certificate" records, 2 of 4 integrated-
  master's (`random.seed(20260822004)`, sampled from the 4-record pool).
- **Monash** (exact `aqf_level.value` string match, incl. its own `_combo`
  double-degree encoding): all 3 non-award pathway programs, 4 of 12 AQF-5 diplomas
  (`seed(20260822005)`), 2 of 4 integrated-master's (`seed(20260822005)`, second draw
  same run), 4 of 88 combo-code records identified by `"combo"` in `researcher_notes`
  (`seed(20260822006)`).
- **Sydney** (explicit title-token read, no structured field at all): 5 of 76
  dual-titled programs — title contains `" and "` (`seed(20260822007)`), 4 of 54
  Honours/Extension-titled programs (`seed(20260822008)`).

Exact IDs: see `targeted_sample.json` (committed alongside this file).

## Instrument 2 — random (n=45), proportional, unbiased population estimate

Drawn from the remainder after excluding the targeted 37 (confirmed zero overlap):
18 UNSW (`seed(20260822009)`), 12 Sydney (`seed(20260822010)`), 15 Monash
(`seed(20260822011)`) — proportional to each university's share of 544.

Exact IDs: see `random_sample.json`.

**Combined: 82/544 (15.1%).**

## Monash's 9 excluded postgraduate records — scoping note, decided before fetching

The excluded 9 are not identifiable by ID from the committed README (they're excluded
*from* the 178-record file, not present in it, and the source doesn't list their
specific course codes). Reconstructing them exactly would mean re-doing a meaningful
slice of RES-R1's own 503-code sitemap discovery. **Planned handling**: a best-effort
independent check of the *mechanism* the exclusion rests on (find a few Postgraduate
Diploma/Certificate codes at Monash directly, confirm the null-`aqf_level` pattern the
README describes actually holds) — reported as exactly that, not as "the 9 records
verified," which would be a different and unsupported claim.

## Method

Robots.txt fetched and evaluated as its own step before any content request — already
done for all three domains today (`www.handbook.unsw.edu.au`, `www.sydney.edu.au`,
`handbook.monash.edu`), all confirmed clean independently (no AI-crawler or wildcard
disallow), consistent with RES-R1's own findings. Sydney's course pages are fetched
via their own `.model.json` AEM export (the identical structured data the page's own
JS loads, same official host — RES-R1's documented method, not a workaround).

Results to follow in sub-batches, committed and pushed as each completes rather than
held for package close.
