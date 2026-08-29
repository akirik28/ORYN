# S4 — University Photo Coverage, Final Shard — Handoff

**Server:** S4
**Role:** University Photos 04 (final quarter of the canonical university registry)
**Branch / worktree:** `oryn/s4-university-photos`, isolated worktree at `.claude/worktrees/s4-university-photos`, branched from `origin/main`@`f7af914`
**Status:** COMPLETE for this assignment, requesting next from S9

## Scope and method

Assigned shard: the final quarter of the live (non-superseded) `universities` table, ordered
`id ASC` (the same order `scripts/acquire-university-images.ts` already uses) — positions
760–1010 of 1010, 251 universities. This exact boundary was cross-checked against a fleet-wide
per-quarter SQL breakdown at close-out and reconciles precisely (S4: 251 total / 30 missing / 42
needs_review, matching this shard's own numbers from the first hour), so there should be no
boundary gap or overlap with S1–S3.

**No competing pipeline was built.** `scripts/acquire-university-images.ts` (Wikidata P18 →
Commons, official og:image, dimension/aspect validation, checksum dedup, Supabase Storage upload
with serve verification) already existed and already covered 179/251 of this shard before today.
The one code change is additive: a `--range <start>-<end>` flag (1-based, inclusive, over the
script's existing `id.asc` live-university list) so a shard can be run reproducibly without a
parallel sharding mechanism. Everything else this pass produced is research/proposal data in
`data/research/registry/`, per the Research Freeze contract — nothing was written to Supabase,
no `--apply` was ever run, `universities.logo_url` was never touched.

Two internal workers split the shard and then cross-reviewed each other's half (reciprocal
review, redone once from scratch after an account-wide usage limit killed both agents' first
attempt mid-task with nothing on disk):

- **S4-A** — positions 760–885 (126 universities)
- **S4-B** — positions 886–1010 (125 universities)

## Headline finding

**25 of 179 already-"verified" photos (14%) are real defects** — logos, generic/unrelated stock
photography, or (one case, corrected below) a wrong-entity concern — currently live in
`university_profile_metrics` with a status (`official`/`wikimedia_verified`) that the product
would otherwise treat as trustworthy. This is the gap the mission was actually about: the
automated pipeline's dimension/aspect checks catch resolution and cropping problems, but have no
way to know that an image is a *logo* or *the wrong building* if it happens to pass those checks.

## Final numbers (251 universities)

| Bucket | Count | Detail |
|---|---|---|
| Confirmed good photo, keep as-is | **154** | 153 original + 1 correction (University of Utah, see below). 128 fully sourced (`cleared`); 26 are real, correct photos with no recorded license (`official`-tier og:image scrapes never had a license field to begin with) — flagged `RIGHTS_REVIEW_REQUIRED`, not a photo defect. |
| Confirmed real defect, replacement found | **24** | Logo/crest, generic/unrelated stock imagery. Real Commons/official-site replacement downloaded, dimension-checked, and visually confirmed for each. |
| Confirmed real defect, no replacement yet | **1** | Southern Cross University — genuine dead end after a real search by two independent passes (original + reviewer). |
| New candidate found for a prior "no image" gap | **65** | 60 from the original source pass + 5 found only during reciprocal review (see disputes below) after the first pass's search missed real, well-licensed Commons material. |
| Confirmed genuine gap, no candidate exists | **7** | Two independent passes each found nothing but a logo or an unrelated image: Sohar University, Al Ain University, Taif University, INTI International University (Nilai vs. Penang campus ambiguity), Ajman University, Alfaisal University, Cyprus University of Technology. |

154 + 24 + 1 + 65 + 7 = 251.

**89 real, licensed, visually-verified image candidates are ready for a data-writer lane to
apply** (24 replacements + 65 new). None of them have been applied — this shard is research/
proposal-only per the Freeze contract.

## Reciprocal review — what was actually checked, and what wasn't

Every consequential judgment call got a second, independent look; a sample of the routine ones
did too. This is not a claim that all 251 records were re-verified twice.

- **100% of FAIL verdicts** (26 originally, one shard's worth each): re-downloaded and viewed
  the *current* image independently, described in the reviewer's own words rather than
  re-stating the original reasoning. 25/26 confirmed; 1 corrected (Utah, below).
- **100% of STILL_NO_CANDIDATE verdicts** (12): re-searched independently. 7/12 confirmed as
  genuine gaps; 5/12 disputed — the reviewer found a real, licensed, correctly-identified photo
  the first pass missed (see below).
- **~20% random sample of PASS verdicts** (30 of 153): re-viewed independently. 30/30 confirmed.
  This is a spot-check for systematic misses, not exhaustive re-verification — the remaining
  ~123 PASS entries carry only their original auditor's judgment.

### Correction: University of Utah (S4-B-0039)

Original verdict was `FAIL_WRONG_ENTITY` ("this is the Utah State Capitol, not the university"),
briefly reported to the fleet as a confirmed example before the reciprocal-review agent — cut off
mid-sentence by the usage-limit failure — flagged a specific, checkable error: the column
capitals in the photo are Ionic (paired volutes), not Corinthian (acanthus leaves), and Ionic is
what the University of Utah's own Park Building has, while the Capitol is specifically Corinthian.
Independently re-verified directly (re-downloaded the image, confirmed the capital style myself,
confirmed both architectural facts via web search). Reverted to `PASS`
(`S4-B-0039-CORRECTED`, original line preserved, not deleted). The fleet coordinator (S9/S10) was
notified of the correction as soon as it was confirmed.

### Disputes: 5 gaps that weren't actually gaps

Both directions of reciprocal review turned up cases where the *original searcher* was wrong, not
the reviewer — the same failure mode as Utah, but "we searched and found nothing" instead of
"we found the wrong thing":

| University | What the first pass missed |
|---|---|
| Universidade Federal de São Paulo (UNIFESP) | Original notes claimed an exhaustive six-campus Commons search found only the logo. The category actually holds 47 files, most of them real campus photos, including named files for every campus claimed to have been checked. Independently re-confirmed via a direct Commons API `categorymembers` query (47 files) and a `titles`/`imageinfo` lookup on the recommended file. |
| Kazakh National Agrarian Research University | Real photo exists with the university's name lettered directly on the building. Independently re-confirmed via the Commons API and by downloading and viewing the image myself. |
| Khoja Akhmet Yassawi International Kazakh-Turkish University | Commons category is filed under an alternate transliteration ("Ahmet Yesevi University") the original search didn't try. Independently re-confirmed via the Commons API. The reviewer also caught that a same-category file (`Rectorat.jpg`) is almost certainly mis-categorized (Arabic/French signage, wrong country) — flagged so no one uses it by mistake. |
| National University of Uzbekistan | Entrance archway photo with the full institution name lettered on it, one targeted search away. Independently re-confirmed via the Commons API. |
| Kyrgyz Russian Slavic University | CC0 photo, one direct-name search away. Independently re-confirmed via the Commons API. |

All 5 have been written up as full `CANDIDATE_FOUND` records (URL, license, attribution,
dimensions, entity-verification notes) in the claims files, not left as prose in a review file —
they're as actionable as any other candidate in this handoff.

**Net effect of the whole reciprocal-review pass: 1 record moved from confirmed-defect to
confirmed-good, and 5 records moved from confirmed-gap to confirmed-candidate.** Zero cases where
a reviewer's push-back was itself wrong.

## Fleet-wide structural audit (all 1,010 live universities, not just this shard)

This is a database-level scan, not a repeat of the manual visual audit above — "image without
entity verification" outside this shard is a statement about what S1–S3's own shards have or
haven't checked, which this lane has no visibility into and is not claiming to have done.

| Status | Count | What it means |
|---|---|---|
| `wikimedia_verified` / `verified` | 527 | Has a recorded source; not independently re-verified fleet-wide (this shard's 154 PASS + 30 sampled FAILs/gaps are the only part of this bucket anyone has actually looked at again) |
| `official` | 194 | Has an image but **zero** have a recorded license/attribution, by construction — the acquisition pipeline never populates one for an og:image scrape. Of this shard's 50, manual review found 26 are genuinely fine photos (just missing a license lookup) and 24 are the real defects counted above. |
| `needs_review` | 180 | Candidate found but failed validation or the post-upload serve check |
| no row at all (missing entirely) | 109 | No tier ever found a candidate worth even rejecting |

Per-quarter breakdown (same `id.asc` ordering this shard used, so S1–S3 can locate their own
numbers directly):

| Quarter | Total | Missing entirely | needs_review | official (no source) | wikimedia/verified |
|---|---|---|---|---|---|
| S1 (Q1) | 253 | 24 | 52 | 55 | 122 |
| S2 (Q2) | 253 | 29 | 47 | 47 | 130 |
| S3 (Q3) | 253 | 26 | 39 | 42 | 146 |
| **S4 (Q4, this shard)** | 251 | 30 | 42 | 50 | 129 |

No `logo_url` == `primary_image_url` collisions found anywhere in the fleet (checked directly,
0 rows) — the one purely-structural "logo used as campus photo" check this shard's SQL access
could run cleanly. It does not catch a *different* logo-like image being used (that needs a human
look, which is what this shard's 6+10=16 `FAIL_LOGO_OR_CREST` findings actually are).

## Exception list for S8 / CEO

**Owned by S4, needs a different approach (not silently touched further by this lane):**

| university_id | Problem | Current image | Recommended action | Owner |
|---|---|---|---|---|
| (Southern Cross University, S4-A-0058) | Real defect (logo/crest), no replacement found after two independent searches | Logo card | Needs a human with different search tools/access, or accept as a longer-term gap | S4 |
| Sohar University, Al Ain University, Taif University, INTI International University, Ajman University, Alfaisal University, Cyprus University of Technology (7 total) | No usable image exists on Commons or the official site after two independent searches each | None / logo only | Same as above — genuine gap, not a search-effort problem | S4 |

**Not owned by S4, flagged structurally only (counts above), not silently repaired:**

- 79 universities outside this shard with no image row at all (109 fleet-wide − 30 in this shard)
- 138 outside this shard sitting at `needs_review`
- ~168 outside this shard at `official` status with no recorded source
- Whether any of S1–S3's `wikimedia_verified`/`official` images have the same class of defect
  found here (logo-slipped-through, wrong entity, generic stock) is **unknown** — nobody has
  looked, and this lane's 14% real-defect rate on a reviewed sample is the only evidence anyone
  has that the false-verified rate is non-trivial. Worth the same reciprocal-review treatment.

## Second review coverage

35 + 33 = 68 items independently re-checked across both review files (100% of FAILs and
STILL_NO_CANDIDATEs, ~20% sample of PASS). Both review files, plus this shard's own two claims
files, plus the 5 newly-structured candidate records, are committed below.

## Files created/updated

- `scripts/acquire-university-images.ts` — additive `--range` flag only
- `data/research/registry/claims_S4_A.jsonl` (130 lines) — S4-A's audit/source findings + 4
  candidates found for it during reciprocal review
- `data/research/registry/claims_S4_B.jsonl` (139 lines) — S4-B's audit/source findings, its 12
  own-FAIL replacement candidates, the Utah correction, and 1 candidate found for it during
  reciprocal review
- `data/research/registry/review_S4A_by_S4B.jsonl` (35 lines) — S4-B's review of S4-A's shard
- `data/research/registry/review_S4B_by_S4A.jsonl` (33 lines) — S4-A's review of S4-B's shard
- `data/research/registry/S4_A_summary.md`, `data/research/registry/S4_B_summary.md` — each
  worker's own narrative summary
- This handoff

## What the next owner should do

1. Apply the 89 ready candidates (24 replacements + 65 new) through the existing acquisition
   script's write path (or an equivalent), then re-run the fleet-wide status query to confirm.
2. Southern Cross + the 7 confirmed gaps need a different research approach, not more Commons
   searching — possibly a direct outreach/manual-photo-request angle, or accept as long-tail gaps.
3. Consider the same reciprocal-review treatment for S1–S3's shards — this pass's 14% real-defect
   rate on `official`/`wikimedia_verified` rows previously assumed fine is the only measured data
   point the fleet has on how common this failure mode is, and it was not rare.
4. `docs/design-system.md`'s existing note that `opportunities` has no image column/pipeline at
   all (unlike universities, which have both) is still true and still someone else's dependency,
   unrelated to this shard's own work.

## Commit / push

Committed to `oryn/s4-university-photos` and pushed to `origin/oryn/s4-university-photos`. Not
merged to `main` (out of scope for this lane per the Research Freeze contract). Exact commit SHA
in the push confirmation below.
