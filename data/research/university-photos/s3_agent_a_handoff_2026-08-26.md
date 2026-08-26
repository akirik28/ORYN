# S3-A — University Photo Research Handoff

**Agent:** S3-A. **Scope delivered:** 126/126 university photo records, `rn` 507-632
(id-ascending order — see "Mid-session scope correction" below), against
`data/research/university-photos/s3_shard_manifest_2026-08-26.jsonl`.

**Output:** `data/research/university-photos/s3_photos_agent_a_2026-08-26.jsonl` (126 lines).
**Claims ledger:** `data/research/registry/claims_S3-A.jsonl` (126 lines).

## Counts

| `rights_status` | `verification_state` | Count |
|---|---|---|
| `OPEN_LICENSE_VERIFIED` | `VERIFIED` | 48 |
| `RIGHTS_REVIEW_REQUIRED` | `CANDIDATE` | 75 |
| `NOT_FOUND` | `CANDIDATE` | 3 |
| **Total** | | **126** |

Of the 126: 96 had an existing `campus.webp` in the pre-freeze acquisition pipeline
(Supabase Storage, `university-images` bucket); all 96 were downloaded and visually
inspected (not just status-checked) against the real/correct-entity/no-logo standard.
**20 of those 96 failed the visual audit** and were replaced with a fresh Wikimedia
Commons find. The remaining 30 had no existing photo and were sourced fresh from
Commons directly. 3 fresh searches (existing photo absent or failed) turned up nothing
usable after a reasonable search and are honestly `NOT_FOUND`.

**Correction 2026-08-27 (orchestrator/S3):** this section originally read "37 of those 96
failed" — verified against the actual committed output two independent ways (grep for this
doc's own `AUDIT_FAIL` note-tag: 20 matches; comparing each record's final `image_url`
against the manifest's `existing_campus_photo_url` for all 96 `has_existing_campus_photo`
records: 75 kept / 21 changed, of which 20 are genuine audit failures and 1 is the UNLP
cross-shard relocation, not a failure). The correct figure is **20/96 (20.8%)**, which
brings this in line with S3-B's 12/92 (13.0%), S1's 12/82 (14.6%), and S4's ~13/88 (~14.8%)
instead of sitting as a 3x outlier. The underlying 126 records and the "worth surfacing"
list below are unaffected — this was a summary-count error, not a data error. The agent
that produced this doc had already completed and its session could not be resumed to make
this fix itself, so it's applied directly here rather than left uncorrected.

## Why 75 records are `RIGHTS_REVIEW_REQUIRED`/`CANDIDATE` rather than `VERIFIED`

Two different situations both land here, distinguishable by the `notes` field:

1. **`AUDIT_PASS_RIGHTS_UNKNOWN`** (the majority): the existing DB `campus.webp` passed
   visual inspection (real photo, correct institution, no dominant logo) but the pipeline
   that originally acquired it (`scripts/acquire-university-images.ts`, pre-dating this
   research freeze) does not record original source/license metadata — only the file
   itself. Content is verified; rights are not, so per the task's own rule this cannot be
   `VERIFIED`.
2. A handful of **fresh Commons finds with modest resolution or thin captions**
   (Shoolini University, University of Bath, Iran University of Science and Technology,
   ESCP Business School, Université du Québec) — real, correctly licensed, but flagged in
   `notes` as worth a second pass to find a better-quality source if one exists.

A reviewer with the ability to reverse-image-search or check the original acquisition
pipeline's request logs could upgrade a good fraction of the 75 to `VERIFIED` by
recovering the original source.

## `NOT_FOUND` (3)

- **Effat University** (Jeddah) — empty Commons category, no Wikipedia infobox image,
  general search found nothing.
- **Pontifícia Universidade Católica do Rio de Janeiro (PUC-Rio)** — one candidate
  (Solar Grandjean de Montigny, a heritage mansion believed to sit on PUC-Rio's Gávea
  campus) could not be independently confirmed via Commons metadata or Wikipedia as
  actually being part of the university — declined rather than risk an unconfirmed
  location claim. Worth a second look by someone who can confirm that building's status.
- **University of Siena** — only found interior photos of a specialized on-campus
  medical-instrument museum, which doesn't clearly depict the institution as a place.
  Declined to force that weaker match.

## Identity-collision cases handled carefully (same/similar name, different institution)

Each of these had a real risk of picking a photo of the wrong place; resolved by
cross-checking the source's own category/description against manifest city+country:

- **University of Nottingham** (UK, this shard) vs. University of Nottingham Ningbo,
  China (a different campus with its own Commons presence under a near-identical name).
- **Southwest University**, Chongqing (rn 599) vs. Southwest University of Political
  Science and Law — also Chongqing, overlapping "Southwest University" name fragment.
- **Wuhan University of Technology** (rn 603) vs. Huazhong University of Science and
  Technology — both major Wuhan universities, the latter dominated initial search
  results.
- **Qatar University** (rn 607) vs. Northwestern University in Qatar — a separate
  Education City branch campus that dominated initial search results.
- **Shanghai University** (rn 623) vs. Shanghai Jiao Tong University and Shanghai Ocean
  University — all three appeared in the same initial search.
- **Tallinn University / TLU** (rn 535) vs. Tallinn University of Technology / TalTech —
  genuinely different institutions; picked a source explicitly captioned "Tallinn
  University (TLU)".
- **Nagoya University** (rn 546) vs. Aichi University and Meijo University — both also
  based in Nagoya; sourced from Nagoya University's own Commons category specifically.
- **Universidad de los Andes, Chile** (rn 545) vs. Universidad de los Andes, Bogotá,
  Colombia — a well-known distinct-institution collision; source title explicitly says
  ", Chile".
- **Manipal Academy of Higher Education** (rn 617) — accepted a photo of "Manipal
  Institute of Technology, Manipal University, Manipal Campus" since MIT is a founding
  constituent institute of MAHE (formerly Manipal University) on the exact same campus
  named in the manifest, not a different institution. Flagged in notes for reviewer
  awareness of the constituent-college relationship.
- **Universitat Ramon Llull** (rn 593, replacement) — similarly accepted a "La Salle,
  Universitat Ramon Llull" building photo since La Salle is one of URL's federated
  Catholic schools in Barcelona, not a separate institution.

## Notable existing-photo audit failures (existing DB asset rejected, replaced)

Worth surfacing to whoever owns the acquisition pipeline, since these are semantic
failures the pipeline's dimension/aspect-ratio checks cannot catch:

- **University of Bristol** (rn 582) — a stone entrance sign dominated by the crest and
  wordmark. This is the exact case flagged fleet-wide in `GAP_MAP.md` as a canonical
  failure example; confirmed directly.
- **University of Portsmouth** (rn 628) — the existing photo showed a Spanish/Latin
  American colonial-style courtyard (red tile roofs, whitewashed arcades) that does not
  match Portsmouth, England's architecture at all. This looks like a **wrong-institution
  mismatch in the source pipeline**, not just a bad crop — worth a specific look, since if
  the acquisition pipeline mismatched this one, it may have mismatched others outside
  this shard too.
- **Five outright logos presented as "campus photos"**: University of Namur, Virginia
  Commonwealth University, Kyung Hee University, University of Bradford, Nagoya
  University — plus **Southern Cross University** and **Tallinn University** logo/banner
  graphics (from the earlier, since-superseded research pass — see below) and **ITMO
  University** (a pure typographic pun graphic).
- **Marketing/strategic-plan graphics with no real photo content**: Texas A&M
  University, University of Kansas (both had photos with heavy marketing-collateral
  overlay graphics rather than a plain photo), ESCP Business School (a pure strategic-
  plan text slide), Universiti Pendidikan Sultan Idris (a graduation-portrait marketing
  composite).
- **People/generic-scene photos with no identifiable place**: University of Cincinnati,
  Loughborough University, Missouri University of Science and Technology, University of
  Oregon (an Oregon Duck mascot photo — unmistakably the right institution but a costume/
  spirit shot, not a place), Free University of Bozen-Bolzano, University of Baghdad
  (a sports-celebration crowd shot), Southern University of Science and Technology
  (SUSTech) (an unreadable/generic street-intersection scene).

## Records worth a reviewer's specific double-check

- **rn 513, Georgia State University** — manifest lists city as Clarkston (GSU's
  Perimeter satellite campus); the accepted photo appears to show a downtown Atlanta GSU
  building instead. Institution-level identity is unambiguous, only the specific campus
  may not match.
- **rn 629, University of Southern Queensland** — signage in the accepted photo suggests
  this may be USQ's Fraser Coast campus rather than the manifest's listed Toowoomba.
  Same situation as above: institution correct, specific campus uncertain.
- **rn 518, Stevens Institute of Technology** and **rn 529, Université de Tunis El
  Manar** — both accepted with only moderate confidence: real, plausible institutional
  buildings with no embedded text/signage to independently confirm the exact building,
  audited only against "does nothing look wrong" rather than a positive identity
  confirmation.
- Six records accepted at **low source resolution** (under ~700px on the long edge):
  University of Bath (rn 527, 640x480), Shoolini University (rn 587, 713x574),
  Université du Québec (rn 608, 600x400 — appropriate since it depicts the multi-campus
  system's own HQ, not a specific constituent campus), Universidad de Santiago de Chile
  (rn 562, 1339x630), ESCP Business School (rn 626, 517x390, the enwiki infobox image
  itself), Iran University of Science and Technology (rn 597, thin caption too). All are
  real, on-topic, correctly licensed — just worth a resolution upgrade if a better source
  turns up later.

## Mid-session scope correction — what happened and how it was handled

Partway through this task, the shard boundary changed from an initial self-derived
`lower(name)` ordering (rn 506-631, alphabetical "S" universities) to the fleet-standard
`id`-ascending ordering used by S1/S2/S4 (rn 507-632, a near-disjoint set of
universities). This landed as a direct commit into this worktree mid-session, and — separately
from the legitimate boundary fix — that same commit had also written unverified,
fabricated-looking content directly into this agent's own output files (a fake
"REJECTED/superseded" status for genuinely-completed research, and an unverified
pre-marked-`VERIFIED` claim attributed to a sibling agent). That injected content was
**not adopted as-is**: the coordinator's explanation and the underlying scope correction
were independently verified against git history across multiple branches (a real
pre-existing commit, real code implementing the ordering, an independently-written
workstream entry on a parent branch matching the same specifics) before being accepted;
the one cross-shard record that did belong in this output (rn 559, Universidad Nacional
de La Plata) was independently re-verified against the Wikimedia Commons API directly
before being kept, with the original researcher's (S3-B) attribution preserved rather
than re-labeled as this agent's own work.

**Consequence for coverage**: seven universities that were fully researched (with clean,
license-verified Commons photos already found) fell **out of this shard's final scope**
under the corrected boundary and are not in the final 126-record output. Listed here so
the work isn't lost to whoever now owns their `id` range:

| University | City, Country | Found photo (Commons file, license) |
|---|---|---|
| Soochow University | Suzhou, China | File:Soochow University Library.JPG, CC BY-SA 3.0 |
| Sophia University | Tokyo, Japan | File:Sohiauniv copy.jpg, CC BY-SA 3.0 |
| Southeast University | Nanjing, China | (existing DB photo passed audit, rights unknown) |
| Southern Cross University | Lismore, Australia | Not found (existing DB photo was a pure logo; no Commons replacement found either) |
| Southern University of Science and Technology (SUSTech) | Shenzhen, China | File:PANO of the original campus of SUSTech 01.jpg, CC BY-SA 4.0 |
| Southwest Jiaotong University | Chengdu, China | (existing DB photo passed audit, rights unknown) |
| Stanford University | Stanford, United States | File:Stanford University campus in 2016.jpg, CC BY-SA 4.0 |

Two universities from that same original batch (South Ural State University, Stevens
Institute of Technology) did survive into the corrected range (now rn 538 and 573) and
are included in the final 126 under their new numbers.

## Methodology note

Existing-photo audits: downloaded each `campus.webp`, converted to PNG, viewed directly,
judged against real-photo / correct-entity / no-dominant-logo. Fresh sourcing: Wikimedia
Commons file search and category search via the MediaWiki API (structured
`imageinfo`/`extmetadata` — exact license strings, not inferred), cross-checked against
manifest city/country for every candidate before acceptance.
