# S3 — University Photo Coverage, Third Quarter — FINAL HANDOFF

**Server:** S3 | **Role:** University Photos 03 | **Date:** 2026-08-26/27

## STATUS

**COMPLETE.** Full shard researched (253/253), both halves independently second-reviewed
by fresh agents, all findings verified by this orchestrator with direct visual inspection
at every stage (not just self-reports trusted). Nothing left in progress.

## ASSIGNED SCOPE

Third quarter of ORYN's canonical `universities` registry: **rn 507–759 of 1,010 canonical
rows, ordered by `id` ascending** (253 institutions) — corrected mid-session from an
initial self-derived `lower(name)` ordering (rn 506–757) after the fleet standardized on
id-ascending (matching `scripts/acquire-university-images.ts`'s `--range` convention,
independently confirmed present in S1's and S2's own manifests too, not just asserted).
Split into two parallel sub-agents: S3-A (rn 507–632, 126 universities) and S3-B (rn
633–759, 127 universities), then two independent review agents cross-checking each half.

## PRODUCTION-READY COUNT

**89 / 253 (35%)** — real photo, correct institution, no dominant logo, **and** a traced,
verified open license (`rights_status: OPEN_LICENSE_VERIFIED`, `verification_state:
VERIFIED`). **All 89 have passed independent second review** — this is the genuinely
ship-ready tier under the Common Operating Contract's full bar (§11: verification states;
§10: photo standard).

## CANDIDATE COUNT

**155 / 253 (61%)** — content fully verified (real photo, correct institution, no
dominant logo — confirmed by direct visual inspection, most by two independent
researchers) but rights/license genuinely unknown (`RIGHTS_REVIEW_REQUIRED`). This is
**not a research gap** — it's a structural limitation of the pre-existing acquisition
pipeline these photos mostly came from (`university-images` Supabase bucket, uploaded
2026-08-18, predates this freeze), which never recorded original source/license metadata,
only the file. A reviewer with reverse-image-search or access to the original pipeline's
request logs could likely upgrade a meaningful fraction of these to `VERIFIED` without new
photography — the content work is already done.

## REJECTED COUNT

**6 records** where the originally-accepted photo was replaced or downgraded after
independent review found a real defect the first pass missed (see "Second review" below
for detail). All 6 are corrected in the final dataset, not just flagged.

## BLOCKED / UNCLEAR COUNT

**3 / 253** genuinely `NOT_FOUND` after real search effort by both original researcher and
independent reviewer, not corner-cut: Effat University (Jeddah), Central European
University (Vienna — only event/inauguration photos exist, not the actual campus
building), Gulf University for Science and Technology (Kuwait — zero Commons coverage).

## IMAGE COMPLETE COUNT

**250 / 253 (99%)** have a real candidate image (89 VERIFIED + 155 CANDIDATE + 6 replaced-
and-included-in-the-above). Only the 3 NOT_FOUND lack one.

## SECOND REVIEW COUNT

**185 / 253 (73%)** independently re-verified by a fresh reviewer agent (not the original
researcher) with direct image download+view: all 89 that reached `VERIFIED`, every
researcher-flagged low-confidence record, all 7 original `NOT_FOUND`s, plus a ~35-40
random spread sample per half. The other 68 (all `CANDIDATE`/`RIGHTS_REVIEW_REQUIRED`,
not randomly sampled) were not individually re-verified — flagged as the natural next
priority if further QA capacity becomes available, not asserted as risk-free.

**What the second pass actually caught** (this is the reason the reciprocal-review
requirement exists, demonstrated concretely, not theoretically):
- **rn 617, Manipal Academy** — real, correctly-identified building, but a third-party
  "State Bank of India" sign dominates ~30% of the frame. Found by this orchestrator's own
  spot-check, confirmed independently by the reviewer. `DOWNGRADED`.
- **rn 539, Hacettepe University** — the accepted photo is a tree with a birdhouse; a
  campus building is barely visible in one corner. Found independently by the reviewer,
  confirmed by this orchestrator downloading and viewing it directly. `DOWNGRADED`.
- **rn 603, Wuhan University of Technology** — a hazy, generic high-rise cityscape with no
  discernible campus content. Same pattern: reviewer-found, orchestrator-confirmed.
  `DOWNGRADED`.
- **rn 659, Al-Ahliyya Amman University** — the `VERIFIED` photo was real, correctly
  licensed, and correctly identified, but was an indoor graduation-ceremony crowd shot
  with zero campus architecture — the same defect class the original researcher itself
  used to reject *other* records in the same dataset. `REPLACED` with a real elevated
  campus-entrance photo (orchestrator-confirmed).
- **rn 586 (PUC-Rio) and rn 588 (Siena)** — both were honest `NOT_FOUND`s caused by a
  category-naming mismatch (searched under the Portuguese/Italian canonical name; the real
  Commons category used the English name). Reviewer found both, `REPLACED` NOT_FOUND →
  VERIFIED.
- **rn 663 (TIIAME) and rn 694 (Princess Sumaya)** — same root cause, `UPGRADED`.
- **rn 529 (Université de Tunis El Manar)** — moderate-confidence signage the original
  researcher couldn't read; reviewer zoomed in, identified the institute name, confirmed
  via web search it's a constituent of the named university. `UPGRADED` to firm confidence.

Net: **6 real defects caught across 185 reviewed records (~3.2%)** in work that had
already passed one careful researcher's own audit — a concrete demonstration that
single-pass verification, however careful, has a residual error rate independent review
catches. Zero wrong-institution or hidden-logo findings beyond what's listed above.

## CROSS-CHECK AGAINST S4'S FLEET-WIDE RIGHTS CLASSIFICATION (added 2026-08-27, post-completion)

S9 flagged that S4 completed a follow-on task (P2) classifying rights for all 194
fleet-wide `official`-status images and asked whether it affected this shard's 155
`RIGHTS_REVIEW_REQUIRED` rows. Checked directly rather than assumed either way
(`docs/handoffs/s4-p2-rights-classification-2026-08-27.md` and its two data files on
`origin/oryn/s4-university-photos`, independently confirmed real and substantive before
relying on it): **42 of this shard's 253 universities also appear in S4's 194-record set.**
Of those 42, two needed action:

- **rn 572, UC San Diego — corrected.** This record still uses the original pipeline
  `campus.webp` (never replaced), previously `RIGHTS_REVIEW_REQUIRED` (generic "unknown").
  S4 independently found and verbatim-confirmed UCSD's own Terms of Use: *"No material from
  any official UC San Diego website may be copied, reproduced, republished... without
  explicit permission."* Updated to a new, more precise status, **`NOT_SUITABLE_FOR_REUSE`**
  (adopting S4's category — this dataset's original three-state schema didn't have a
  "checked and found restrictive" state, only "checked and clear" vs. "never checked"; worth
  the schema question going to whoever owns the eventual production migration). Real photo,
  correct institution, confirmed identity — purely a rights blocker, and now a *known* one
  instead of an *unknown* one.
- **rn 636, Tecnológico de Monterrey — flagged, not downgraded.** This record's photo was
  already replaced with an independently-sourced Commons photo (the original pipeline image
  was a pure logo graphic, rejected during research). S4 found Tec de Monterrey's own legal
  notice requires "express written authorization" to reproduce *site* content — which doesn't
  directly govern a third party's own photograph. But given this dataset already downgraded
  Bocconi over a comparable indirect signal (Italy's lack of freedom-of-panorama for
  copyrighted architecture, despite a clean-looking photographer license), consistency calls
  for the same caution here: Mexico's freedom-of-panorama status for this specific building
  was not verified before this record reached `VERIFIED`. Flagged in the record's own notes
  for a targeted check, not silently left as-is and not force-downgraded on an inference this
  dataset can't confirm either way.

The other 40 overlapping records needed no change — both this dataset and S4's classification
independently landed on "rights unknown" for the same universities, which is corroboration,
not new information.

## DUPLICATES FOUND

**Zero** — full-shard `rn`/`university_id` uniqueness verified programmatically (see
Files below), no duplicate rows across either half or across the boundary-correction
reconciliation.

## KEY GAPS

1. **No production schema to write into.** `universities` has no `image_url`-equivalent
   column (confirmed directly against `information_schema.columns`) — this entire corpus
   is CANDIDATE/VERIFIED research output pending a founder-authorized migration decision.
   No research lane may create one per the Common Operating Contract.
2. **The pre-existing acquisition pipeline's rights-metadata gap is structural, not a
   sampling issue** — confirmed independently by S4's full-registry audit: 0/194
   `official`-status images fleet-wide have any recorded license, vs. 100% for
   `wikimedia_verified`-status images. This shard's 155 `RIGHTS_REVIEW_REQUIRED` records
   are a direct symptom of that same gap, not a research shortfall.
3. **68 records never got independent second review** (see Second Review Count) — genuine
   remaining risk surface, not hidden.

## KEY UNCERTAINTIES

- **University of Portsmouth** (rn 628) — its *original* pre-freeze pipeline photo showed
  Spanish/Latin-American colonial architecture, nothing like Portsmouth, England. Likely a
  wrong-institution mismatch in the acquisition pipeline itself — worth checking whether
  it mismatched others **outside this shard** too, since S1/S2/S4 use the same pipeline.
- **Manifest data-quality issues found, not silently corrected**: Sofia University's
  manifest city says "Burgas" but its verified photo is unambiguously the real Sofia
  flagship building (name carved into the facade) — likely a manifest error. SEGi
  University and Catholic University of Korea both have real campus/city mismatches
  between the manifest and the verified photo (same institution, different specific
  campus than the manifest's city field implies).
- **rn 715, Bocconi University** — replacement photo carries a nominal CC BY-SA license,
  but its Commons subcategory explicitly warns Italy has no freedom-of-panorama for
  copyrighted architecture in public spaces — the photographer's tag may not clear the
  underlying building design's rights. Deliberately kept at `RIGHTS_REVIEW_REQUIRED`
  despite the clean-looking tag; needs an actual legal judgment call, not a license-field
  read.
- **7 universities fully researched with clean licensed photos, then fell out of scope**
  when the shard boundary corrected (Soochow, Sophia, Southeast, Southern Cross, SUSTech,
  Southwest Jiaotong, Stanford) — findings preserved in `s3_agent_a_handoff_2026-08-26.md`
  for whoever now owns their `id` range, not lost.
- **A real operational lesson, not a data uncertainty**: doing direct file-surgery on a
  live sub-agent's output file (this orchestrator's own boundary-correction commit)
  raced against S3-B's concurrent write and corrupted its in-progress file. S3-B's own
  defensive practice (independent scratchpad source-of-truth, rebuild-from-source after)
  is what prevented actual data loss. Future orchestration should pause/message a live
  agent before writing directly into its worktree, not just write and hope.

## FILES CREATED/UPDATED

**Final consolidated dataset** (this handoff's actual deliverable):
- `data/research/university-photos/s3_FINAL_consolidated_2026-08-27.jsonl` — all 253
  records, merged from both research passes and both review passes, one row per
  university, `rn`-ordered, every review verdict applied.

**Per-stage detail** (kept for traceability, not duplicated content):
- `s3_shard_manifest_2026-08-26.jsonl` — the 253-university input roster.
- `s3_photos_agent_a_2026-08-26.jsonl` / `s3_photos_agent_b_2026-08-26.jsonl` — original
  research (126 + 127).
- `s3_agent_a_handoff_2026-08-26.md` / `s3_agent_b_handoff_2026-08-26.md` — original
  researchers' own detailed handoffs (collision cases, methodology, out-of-scope finds).
- `s3_review_of_a_2026-08-27.jsonl` / `s3_review_of_b_2026-08-27.jsonl` — independent
  review verdicts (92 + 93 records).
- `s3_review_of_a_handoff_2026-08-27.md` / `s3_review_of_b_handoff_2026-08-27.md` —
  reviewers' own handoffs.
- `s3_existing_pipeline_finding_2026-08-26.md` — the original discovery that a pre-freeze,
  unverified photo pipeline already existed (721/1,010 universities fleet-wide), relayed
  to and incorporated into `GAP_MAP.md` by CEO.
- `data/research/registry/claims_S3.jsonl`, `claims_S3-A.jsonl`, `claims_S3-B.jsonl` —
  fleet coordination registry entries.

## COMMITS

All pushed, all clean working trees, verified directly (not just self-reported) at every
stage of this handoff:
- `oryn/s3-university-photos` (orchestrator) — shard claim, boundary correction,
  existing-pipeline finding, this final consolidation.
- `oryn/s3-photos-agent-a` — 126-record research, corrected boundary, handoff (incl. one
  orchestrator-applied correction to a self-reported count: 37→20 audit failures).
- `oryn/s3-photos-agent-b` — 127-record research, boundary reconciliation after a real
  file-corruption incident, handoff.
- `oryn/s3-review-of-a` — 92-record independent review, handoff.
- `oryn/s3-review-of-b` — 93-record independent review, handoff.

## BRANCH

Primary: `oryn/s3-university-photos`. Sub-branches above all merge cleanly into it (no
file-path overlap between any two). **Not merged to `main`** — per the Common Operating
Contract, research lanes don't merge to main; this is ready for CEO/DATA/founder review
and promotion.

## WHAT THE NEXT OWNER SHOULD DO

1. **Schema decision** (founder/DATA, not a research lane): add the columns this corpus
   needs (`image_url`, `image_source_url`, `image_depicts`, `image_verified`,
   `no_logo_verified`, `correct_entity_verified`, `rights_status`) — CEO's `GAP_MAP.md`
   already has this queued as founder escalation #1, shared with S1/S2/S4.
2. **Promote the 89 PRODUCTION_READY rows** once schema exists — no further research
   needed, these are done.
3. **Decide the product bar for the 155 CANDIDATE rows** — ship with an honest
   "source unverified" treatment, hold for a rights-recovery pass, or something else. Not
   this lane's call.
4. **Check the Portsmouth wrong-institution-mismatch pattern against S1/S2/S4's shards** —
   same pipeline, real chance of recurrence elsewhere.
5. **If more QA capacity opens up**: the 68 never-independently-reviewed CANDIDATE records
   are the clearly-labeled next-highest-value target, not a hidden gap.
