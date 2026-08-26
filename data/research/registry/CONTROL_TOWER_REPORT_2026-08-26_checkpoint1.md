# ORYN RESEARCH CONTROL TOWER
**2026-08-26, checkpoint 1 (~45min into freeze day 1)**

Full roster confirmed: S1 (oryn-c8) · S2 (oryn-c0) · S3 (oryn-85) · S4 (oryn-88) · S5 (oryn-83)
· S6 (oryn-71) · S7 (oryn-4d) · S8 (oryn-53) · S10/CFO (oryn-99) · S9/CEO (this session).

## UNIVERSITY PHOTOS
- Total needing coverage: **1,010** canonical universities
- Production-ready: **0** — nothing has cleared full §10 verification yet (checkpoint 1 of a
  multi-day pass; pipeline pre-dates this week)
- Pipeline-accepted but semantic-verification status unknown: **721** (525 wikimedia_verified +
  194 official + 2 verified) — **do not read this as 71% done.** S3 hand-checked 3 samples and
  found 2 fail the real standard (Bristol: crest/wordmark-dominated sign; Stanford: unidentifiable
  generic crowd photo). Real production-ready count is currently unmeasured, likely well below 721.
- Remaining with no candidate at all: **109**
- `needs_review` (candidate found, failed dimension/aspect checks): **180**
- Blocked: **0** — no migration needed (confirmed: writes land in existing
  `university_profile_metrics` EAV table; surfacing a new field in UI needs a small code change,
  not DDL, when promotion happens)
- Logo failures: **1 confirmed** (Bristol, this checkpoint's sample). Real rate unmeasured — S1-S4
  now auditing full shards, not just the un-sourced remainder.

## OPPORTUNITIES
Live corpus (all `opportunities`, any status): 421 rows.
- candidate / verified / production-ready: **not yet re-measured against this week's new
  verification states** (`turkey_student_access` etc. don't exist as DB fields yet — S5/S6/S7
  are producing dry-run proposals now, none written live yet this checkpoint)
- rejected this checkpoint: **0** reported yet
- not Turkey eligible / unclear: **unmeasured** — this is itself a gap. Proxy from live columns:
  only 15/276 active rows have `country_eligibility_confirmed_open=true`; 193/276 have zero
  eligibility signal in any of `eligible_countries`/`citizenship_restrictions`/
  `country_eligibility_confirmed_open`. Read "421 live" as "eligibility mostly unverified," not
  "421 usable by a Türkiye-based student."

## DUPLICATION
- **Duplicate attempts prevented: 2, both real, both caught by cross-checking peers' exact
  numbers against each other, not self-reported by either party:**
  1. S1 and S2 independently claimed the identical first photo-shard (both reporting 177
     accepted / 253 total before seeing each other's claim). Root cause identified: S2 had
     derived their own quartile boundary with an independent formula, off-by-one from the
     script-verified split. Resolved — S2 moved to 254-506, ceded rn=253 explicitly.
  2. S3 self-derived a shard boundary one row off from S2/S4's (506-757 vs. the canonical
     507-759), which both overlapped S2 by one row and left 2 rows uncovered. Resolved — S3
     moved to the canonical range.
- Possible duplicates still open: **0** reported. S7 found a third pocket of prior uncommitted
  research (`leadership_batch*`/`thincat_*`/`discovery_*` files) beyond the two I'd already found
  in recon (`cr1_*`/`summer_*` from 2026-08-23/24) — not a duplicate risk itself, but a reminder
  the shared checkout has more untracked prior work than my own first pass caught.

## CATEGORY GAPS
`summer_program` (253) + `competition` (101) = 84% of the live opportunities corpus.
Thin, high-leverage categories: research (13), internship (8), fellowship (5), academic_program
(3), conference (2). **Publications/awards/leadership have no dedicated `category` enum value at
all** — living inside other categories or not captured, S7 confirming which. S7 is this
checkpoint's correctly-prioritized highest-leverage lane (4 parallel sub-agents on exactly this).

## GEOGRAPHIC / ACCESS GAPS
Not yet quantified this checkpoint. Known from prior corpus (unverified live this pass): strong
US/UK coverage; real DE/NL/CA/AU programme-catalogue depth (separate table); one dedicated Turkey-
opportunities pass (2026-08-21) plus Turkey-route resolution for 6 flagship olympiads. Asia
(beyond a few named competitions) and "online/year-round, geography-agnostic" as an explicit shape
are both thin on first read. S6 confirmed weighting Turkey-access-gating over new-record padding
this checkpoint, consistent with this gap.

## IMAGE GAP
1,010 - 0 production-ready = **1,010** (see University Photos above for the pipeline-accepted-vs-
verified distinction — this is not the same as "1,010 need sourcing from zero," most need
verification of an existing candidate, not first discovery).

## QA BACKLOG
S8 running 2 audit tracks: (A) re-verifying whether the 2026-08-23/24 corpus's own dry-run
findings (HMMT missing deadline, AMC wrong URL, Breakthrough Junior Challenge gaps, Stockholm
Water Prize wrong-entity, etc.) actually landed live or are still open on real `verified_current`
rows; (B) link-integrity + duplicate-cluster sweep on `opportunities`, re-checking two previously-
"retired" duplicate pairs. Not yet pushed (local-only pending their own correction pass). Count:
**2 tracks in flight, 0 verdicts logged to the registry yet.**

## BLOCKED RECORDS
**0.** No S1-S8 lane has reported a blocker >30min this checkpoint.

## CAPACITY DIRECTIVES
- **S1-S4**: shift from "source the missing 289" to "audit the full shard, including the 721
  marked accepted" — S3's finding means the accepted count is not a quality signal yet.
- **S5**: S5B (research/internship) full net-new discovery, unchanged. S5A (summer_program)
  reweighted toward production-readiness completion of the 253 already-live rows over adding a
  254th.
- **S6**: weight toward Turkey-access-gating and depth-completion on the existing 101 competition
  rows (+ the real, unshipped 2026-08-23/24 `cr1_*` backlog) over volume toward a nominal target.
- **S7**: proceed at full capacity — smallest base, least prior attention, correctly self-
  identified and already dispatched 4 sub-agents.
- **S8**: continue both tracks; began appropriately (didn't sit idle waiting for S1-S7 to push).

## QUALITY INCIDENTS
- **Wrong image, now 3 confirmed instances across 2 distinct failure modes**: Bristol's
  `primary_image_url` is a crest/wordmark-dominated sign, Stanford's is a generic unidentifiable
  crowd photo (both S3's original sample — passed the pipeline's dimension check, fail §10). A
  third, from S3-B mid-audit: a heavily color-graded, likely-wrong-building stock-style image,
  caught and replaced with a properly Commons-traced Public Domain photo. The third is a
  *different* failure shape than the first two (plausible-looking but wrong, vs. obviously a
  crest or obviously generic) — evidence this is a real, varied defect class recurring under
  audit, not a one-off 3-sample fluke.
- **Stale/unresolved from prior corpus, not yet re-verified this checkpoint**: IE University
  Pre-University Summer Program tier conflict (open_enrollment vs. fresh evidence suggesting
  selective), flagged 2026-08-24, status unknown — on S8's Track A list to re-check.
- **Process incident, not data**: this report's own first draft (checkpoint 0, superseded) wrongly
  claimed zero university-photo infrastructure existed — caught and corrected within ~15 minutes
  by S10, independently confirmed by 3 more peers before it could mislead S1-S4. Recorded in
  `GAP_MAP.md` with the wrong version struck through rather than silently edited.

## Operational risk (infrastructure, not research)
Disk space on the data volume: **94% used, 12GB free**, verified independently by S3, CFO, and
CEO via three separate `df`/`du`-style checks that all agree. Not an emergency at 12GB, but this
repo has exhausted disk before (50+ worktrees, per prior incident docs) and 10+ worktrees are
running for this freeze alone. Broadcast fleet-wide: skip `npm install` in research-only
worktrees (pure data/doc work doesn't need `node_modules` — confirmed safe by S3/CFO), and
report rather than self-remediate on any `ENOSPC`.

## Not yet resolved / open with the founder
Nothing urgent enough to interrupt for yet. Two items queued for a single founder update once
there's more to report: (1) the `turkey_student_access` field is genuinely new and may need an
opportunities-table migration, unlike the photo case (S5's finding, unlike photos there's no
known EAV escape hatch here — unconfirmed either way yet); (2) worth knowing `Claude.pdf` (an
unrelated minor's personal data export) is sitting untracked in the checkout root — not a research
matter, flagging so it doesn't get swept into a broad `git add` by anyone.
