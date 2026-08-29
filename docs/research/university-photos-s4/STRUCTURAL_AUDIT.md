# S4 — Full-Registry Structural Image Audit

**Owner:** S4 (University Photos, Final Shard). **Scope:** all 1,010 live (non-superseded)
`universities` rows — not just S4's own shard (positions 760-1010). This is a **structural,
DB/HTTP-level pass**, not a visual re-verification of other shards' images — per the Common
Operating Contract, S4 does not repair or re-judge another server's records. Findings below are
for S8 (QA) / S9 (CEO) to route back to the owning shard (S1/S2/S3) or to DATA for promotion.

Measured live against `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), 2026-08-26, this checkpoint.

## Headline counts (all 1,010 live universities)

| Check | Count | Note |
|---|---|---|
| Have a `primary_image_status` row at all | 901 | 109 have none — true cold gap |
| — `wikimedia_verified` | 525 | |
| — `official` | 194 | |
| — `verified` (hand-verified override) | 2 | Oxford, Cambridge |
| — `needs_review` | 180 | candidate tried and rejected, reason in `notes` |
| **No status row at all** | **109** | never processed by the pipeline |
| Accepted status but `primary_image_url` missing (should be impossible) | 0 | clean — no anomaly |
| Accepted row missing `primary_image_checksum` (should be impossible) | 0 | clean — dedup registry complete |
| Two different universities sharing one checksum (cross-institution mismatch) | 0 | clean |
| `primary_image_url` containing the literal substring "logo" | 0 | clean — no obvious mislabeled-logo heuristic hit |
| Broken image link (HEAD non-200) across all 714 live `primary_image_url` rows | **0** | see methodology note below — first pass showed 22 failures, all false positives |
| `wikimedia_verified` with `primary_image_license` populated | 525 / 525 | **100%** — license is never actually missing for this status |
| `wikimedia_verified` with `primary_image_attribution` null | 17 / 525 | license known, artist/attribution field empty — see list below |
| `official` with `primary_image_license` populated | 0 / 194 | **systemic, not anomalous** — official-site scraping has no license source. Every `official`-status row needs `rights_status: RIGHTS_REVIEW_REQUIRED` under Common Operating Contract §10, not just a completeness nit. |

## Methodology note: the broken-link false alarm

A first HEAD-check pass (Node `fetch`, concurrency 20) reported 22/714 URLs as unreachable
(`fetch failed`, no HTTP status). All 22 shared the same host and path shape as the 692 that
passed, which is the signature of a client-side burst/connection-limit artifact, not 22
independently broken files. Re-checked all 22 individually with `curl`, one at a time with a
0.3-0.5s gap: **all 22 returned HTTP 200.** Recorded here so nobody re-discovers the same false
alarm — **there are zero broken image links in the live registry**, confirmed on retry, not just
on the first (wrong) pass.

## The 17 `wikimedia_verified` rows with no recorded attribution

License is present and correct for all of these — only the Commons "artist" field came back
empty from the API (consistent with older or bulk-imported Commons files that were never fully
annotated), not an extraction bug. Low severity, but worth a note if/when attribution is ever
surfaced in the product UI next to the image:

Aarhus University · Central South University · Coventry University · Florida State University ·
Graz University of Technology · KU Leuven · National Tsing Hua University (NTHU) · Novosibirsk
State University · Paris Lodron University of Salzburg · Politecnico di Torino · University of
Bucharest · University of California, Los Angeles (UCLA) · University of Florida · University of
Missouri, Columbia · University of St Andrews · University of Wisconsin-Madison · Utrecht
University.

## What this audit does NOT cover (by design)

- **Semantic correctness** (real photo vs. logo/crest that slipped past dimension checks; correct
  entity depicted) for the 721 "accepted" rows outside S4's own shard. That is S1/S2/S3's job on
  their own shards, per the corrected `GAP_MAP.md` §1 — this document only confirms the
  *plumbing* is sound (no broken links, no cross-institution dedup failures, license/attribution
  completeness), not that every photo is semantically right.
- The 109-no-row and 180-needs_review gaps outside S4's shard — those are first-pass-sourcing
  work for whichever shard owns that position range.

## For S8 / S9: suggested exception-list actions

| university_id | problem | current image | recommended action | owning shard |
|---|---|---|---|---|
| (all 194 `official`-status rows) | no license recorded — systemic, not per-row | present (official-site og:image) | tag `rights_status: RIGHTS_REVIEW_REQUIRED` fleet-wide when the new provenance fields land; not a per-row defect to chase individually | whichever shard (S1-S4) owns each row's position |
| (17 rows listed above) | `primary_image_attribution` null despite known license | present, visually unaudited by this pass | low priority — note as "attribution unavailable from source," don't block on it | S1-S4 per position |

No production writes were made. This file and the HEAD-check script (`.tmp-link-check.ts`,
deleted after use — not committed) only read from Supabase.
