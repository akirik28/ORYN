# RES-I1 dry-run — UWA, 2026-08-22

**Package I1-9, assigned by ORYN-BASORG. Dry-run only — no `--apply`, no writes.** Scope:
UWA's 107 rebuilt programme records, cleared by both RES-V1 (contract/ID/taxonomy) and
RES-V2 (source truth, 65/65 both directions). **Adelaide's 119 deliberately excluded** —
never read, never checked out.

## Before running anything: verifying the clearance itself, independent of who asserted it

This package's assignment arrived after a sequence of conflicting messages about UWA's
status — one from an unverified identity claiming UWA was cleared (declined, reported to
BASORG), one arriving through an unfamiliar channel making the same claim (declined,
reported), and finally direct confirmation from BASORG's verified channel with two specific
artifacts to check independently rather than take on trust. Checked both before proceeding:

- **`docs/research/verification/v1-8_au_r1_uwa_verdict.md`** — confirmed present on
  `origin/main`. Genuine, detailed: PASS on contract, ID discipline, corpus-wide duplicate-URL
  map, all three self-reported defect classes checked against the file directly rather than
  the rebuild's own report, plus one honestly-flagged unresolved sourcing-compliance question
  (§5, the robots.txt/redirect issue) that this verdict explicitly does not claim to have
  resolved itself.
- **`docs/research/verification/v2_9_uwa-source-verification-results.md`** — **not present
  on `origin/main`** at the path claimed. Found instead on `origin/oryn/res-v2-source-
  verification`@`655653d` (`verify(uwa): package V2-9 complete — 65/65 clean, both
  directions, closes AU source verification`) — real, pushed, just not yet merged. Read the
  actual content, not the commit message: 40/40 content-accuracy sample clean, 25/25 from the
  315 *excluded* records confirmed correctly excluded (11 genuine `MJD-` majors, 14 genuine
  postgraduate, zero Bachelor-level degrees wrongly cut) — matches every number cited in
  BASORG's messages exactly. A real precision gap (not on `origin/main` as stated) with a
  real, substantive, independently-readable explanation, not a fabrication.

Reported this precise discrepancy back to BASORG rather than either dismissing it or treating
it as confirmed. Proceeded with I1-9 on the strength of the artifact content itself, matching
BASORG's own explicit instruction: verify the claim in git, not the messenger.

## Procedure

1. **Pulled only `au_programs_uwa_2026-08-22.jsonl`** from `origin/main` (now merged there,
   unlike at I1-7/I1-8 time). `au_programs_adelaide_2026-08-22.jsonl` also now exists on
   `origin/main` — confirmed it was never checked out, never read, at any point in this
   package.
2. **Re-measured live before touching anything**: `university_programs` **16,663**, UWA 0,
   Adelaide 0, UNSW 217, Sydney 149, Monash 178, Glasgow 101 — exact match to BASORG's stated
   baseline.
3. **Scope asserted programmatically before the dry-run ran**: exactly 107 records loaded,
   single university name (`The University of Western Australia`), or abort.
4. **RULE-IDENTITY-001 checked explicitly, before running, as instructed**: `official_program_url`
   cardinality is **107 unique / 107 records = 1.000** — no shared-listing-page problem, unlike
   the Western/Canada case BASORG cited as the reason this rule was added.
5. **Within-batch checks, before touching the DB**: `research_program_id` 107 loaded / 107
   unique — zero internal ID collisions.
6. **Dry-run via the real `decideIngestion()`/`programDedupKey()` logic** (throwaway wrapper,
   deleted after use, never committed).

## Results

**107 accepted, 0 duplicate, 0 anything else.** Zero `malformed_source` (domain-authority
gate) failures. Zero `unresolved_university`, `insufficient_evidence`, `rejected`, or
`conflicting`.

## Why 100% accepted is the correct result here, established before running, not after

Same discipline as the 544-record Australia batch: live UWA was confirmed at 0 rows *before*
this dry-run ran (§ Procedure, step 2), so a 100%-accepted result is the only mathematically
possible truthful outcome, not a proxy silently failing to find a match. Checked the actual
Glasgow failure mode — within-batch collisions — separately and explicitly: zero, both via
the sequential dedup-key check (0 records collided with an already-accepted record earlier in
the same batch) and via direct `research_program_id` uniqueness (107/107).

## Sourcing-compliance note, spot-checked directly

V1-8 flagged that UWA's original file used a robots.txt-disallowed `/sitecore/...` URL form;
V2-9 confirmed the rebuild uses the permitted `/study/courses/<slug>` form instead. Checked
this file's actual URLs directly rather than taking either verdict's word for it: **every one
of the 107 `official_program_url`/`source_url` values uses `www.uwa.edu.au/study/courses/...`
— the permitted form.** No `/sitecore/` string appears in any URL field in this file.

## What this dry-run cannot tell you, and isn't trying to

Same boundary as every prior package: this confirms the batch is mechanically ready — resolves,
passes every gate, collides with nothing live or within itself, uses the compliant URL form.
It does not re-run RES-V1/RES-V2's content verification; both already cleared this specific
107-record file before this package started.

## Net effect

No writes. `university_programs` unchanged at 16,663. If BASORG assigns the apply, this
dry-run predicts exactly 107 inserts, zero rejections, zero gate concerns. Adelaide's file
was never read by this package at any point.
