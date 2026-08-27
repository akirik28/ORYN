# S2 Follow-On — Official-Tier Image Cross-Check (S1/S3/S4) — Handoff (2026-08-27)

## STATUS

**Complete.** CEO-approved follow-on to the UNIVERSITY-PHOTOS-S2 handoff finding. All 147
`primary_image_status='official'` universities outside S2's own shard (S1 55, S3 42, S4 50)
individually visually inspected, classified, and (where wrong) replaced with a sourced, verified
photo. Zero coverage gaps, zero file corruption (independently re-verified by this session
directly against each output file, not taken on the sub-agents' self-reports alone).

## ASSIGNED SCOPE

Read-only cross-check of S1/S3/S4's `official`-tier `university_profile_metrics` rows — the
tier sourced from an institution's own `og:image` meta tag, as opposed to `wikimedia_verified`.
Does not touch S1/S3/S4's own research files, branches, or the `universities`/
`university_profile_metrics` tables (no Supabase writes anywhere in this task).

## HEADLINE FINDING — refines the S2 handoff's own number

**The true official-tier-only defect rate is ~41-44%, consistent across every shard checked, not
the ~16% originally reported.** The S2 handoff's 16% figure blended the official tier (which has
real defects) with the `wikimedia_verified` tier (which has ~0% defects) into one denominator,
diluting the real number. Measured directly this pass, official-tier only:

| Shard | Checked | Pass | Fail | Fail rate |
|---|---|---|---|---|
| S1 | 55 | 32 | 23 | 41.8% |
| S3 | 42 | 25 | 17 | 40.5% |
| S4 | 50 | 28 | 22 | 44.0% |
| **Total** | **147** | **85** | **62** | **42.2%** |

This means roughly **2 in 5 "official"-tier images in the live `universities` database were wrong
before this check** — not a shard-specific anomaly, a fleet-wide pipeline defect. `wikimedia_verified`-tier
images continue to show ~0% defects across every shard checked so far (S1/S2/S3/S4 combined).

## PRODUCTION-READY COUNT

**0**, same posture as the S2 handoff — this is single-agent-verified, no second review has run
on this cross-check's own output. Every PASS and every replacement is real and sourced, but
counts as VERIFIED, not PRODUCTION_READY, by this mission's own definition.

## FAIL BREAKDOWN BY TYPE (all 62)

- `fail_logo` (crest/wordmark mistaken for a campus photo): **41** — the dominant failure mode by
  far. Named examples: UCL, Nagasaki University, Northumbria, Penn, Saskatchewan, Buffalo, Turku,
  Tomsk Polytechnic, Guelph, UAEU, TUAT, Radboud, TU Eindhoven, Hokkaido, Palacký Olomouc,
  Delaware, Tohoku, Hohenheim (S1); Western University, Australian Catholic University, Wayne
  State, Newcastle, Tampere, TalTech, IIT Gandhinagar, Southern Cross, Universidad de los Andes,
  Manchester Met, Exeter, Tartu, NTU Singapore (S4); plus S3's 10 (see `s3_output.jsonl`).
- `fail_generic_noncampus` (stock/lifestyle photo, no institution content): **11** — includes RWTH
  Aachen (chalkboard portrait), LSE (Big Ben tourist photo), Cyberjaya (lab stock photo), TU
  Darmstadt (chess-hands stock photo), Swinburne (podcast-studio stock photo), Victoria University
  Australia, VU Amsterdam, Hull, NMBU.
- `fail_wrong_content` (marketing composites, illustrated graphics, or entirely unrelated
  content): **10** — includes Osaka Metropolitan University (illustrated graphic, not a photo);
  Rochester and VUB (composites); Chandigarh University (illustrated hand-frame composite); and
  the most striking single case found this pass: **University of Victoria (S4, rn=1004) — the
  stored image was a menstrual-care e-commerce brand's office lifestyle photo, with zero
  connection to any university.**
- `fail_wrong_institution`: **0** across all 147 — no case of a genuinely different institution's
  photo being stored under the wrong university.

## REPLACEMENTS

**61 of 62 sourced and visually verified** (not just description-matched — each replacement was
actually downloaded/viewed before being finalized). Predominantly Wikimedia Commons; one
(Southern Cross University, S4) from the institution's own official site since Commons had no
usable building photo. Licenses are mostly CC BY-SA / CC BY / public domain — recorded per-record
in `rights_status`.

**1 unresolved**: United Arab Emirates University (S1, rn=143). Real, multi-angle effort made
(Commons general + Al Ain-specific categories, UAEU's own og:image — which turned out to be the
same logo already stored — UAEU's about-page, a UAEU Flickr pool with no usable license). The
agent explicitly declined a tempting near-miss — "Abu Dhabi University – Al Ain Campus" is a
genuinely different institution that happens to share a city — rather than risk a
wrong-institution substitution. Marked `RIGHTS_REVIEW_REQUIRED` / `could_not_replace`, honestly,
not forced.

## LOWER-CONFIDENCE PASS CALLS WORTH A SECOND LOOK

Two S1 records passed but flagged by the checking agent as borderline, worth a human/second-agent
glance rather than treated as fully settled: rn=101 National Taiwan University (a real photograph
of an engraved stone gate — text-dominant, close to the logo/photo boundary) and rn=156 University
of Manchester (a genuine candid student photo with no identifiable campus landmark — authentic but
unverifiable as Manchester-specific from the image alone).

## DUPLICATES / IDENTITY ISSUES FOUND

**0.** No `*_issues.jsonl` file was created by any of the three agents — each explicitly checked
per-university and found nothing warranting escalation (one specific negative check worth noting:
S1's agent confirmed Nagasaki University and the separate prefectural "University of Nagasaki"
were not confused with each other).

## OPERATIONAL NOTE — scratchpad collision, now recorded to memory

Mid-task, the S4 agent's generically-named scratch script collided with a sibling agent's
identically-named script in the shared scratchpad directory, briefly duplicating 22 records into
`s1_output.jsonl` (32→44 lines). S1's own agent self-corrected before finishing; this session
independently re-verified `s1_output.jsonl` was clean (32/32, then 55/55 at final completion) both
mid-task and again after all three agents finished. No data was actually lost or left corrupted,
but the near-miss is worth the next fleet operator knowing about — full detail and the general
lesson (any shared-namespace parallel dispatch needs per-agent-unique naming, for scratch files as
much as record IDs) is in this session's own memory, not repeated here.

## FILES CREATED

- `data/research/universities/crosscheck-official-tier/crosscheck_S1_input.json`,
  `crosscheck_S3_input.json`, `crosscheck_S4_input.json` — the live-queried input (147 universities).
- `data/research/universities/crosscheck-official-tier/s1_output.jsonl` (55 records),
  `s3_output.jsonl` (42 records), `s4_output.jsonl` (50 records).
- `docs/ORYN_WORKSTREAMS.md` — S2-CROSSCHECK-OFFICIAL-TIER row updated to closed.
- This file.

**No Supabase writes. No edits to S1/S3/S4's own research files.**

## BRANCH

`oryn/s2-crosscheck-official-tier`, isolated worktree at `.claude/worktrees/s2-crosscheck-official`,
pushed to origin. **Not merged to main.**

## WHAT THE NEXT OWNER SHOULD DO

1. **Treat the ~42% official-tier defect rate as a fleet-wide fact**, not a per-shard anomaly —
   worth considering whether `scripts/university-image-coverage-report.ts`'s "real_verified"
   count should distinguish official-tier (needs visual check) from wikimedia-tier (low-risk)
   until every official-tier record has actually been looked at.
2. **UAEU (S1, rn=143) needs a different sourcing strategy** — direct outreach or a paid
   stock/licensed source, since open-license options were genuinely exhausted.
3. **Second-review the 2 lower-confidence PASS calls** (Taiwan, Manchester) and, ideally, a sample
   of the 85 total PASS calls across all three shards, before treating any of this as
   `PRODUCTION_READY`.
4. **Promotion**: same as the S2 handoff — these become new `university_profile_metrics` rows via
   the existing EAV pattern (no migration needed) once second-reviewed, applied by CEO/DATA, not
   this lane.
