# S2 — University Photo Coverage, Shard 2 — Handoff (2026-08-27)

## STATUS

**Closing out per direct founder/CEO instruction ("wind down for the night, commit and push, then
stop") — not a normal completion.** Both research halves (S2-A, S2-B) finished their assigned
ranges with zero gaps in coverage, but the mission's required 100% cross-review pass (A reviews
B, B reviews A) did not happen — a fleet-wide session/rate-limit interruption (~2026-08-27
00:15-00:45 local) hit S2-A mid-task (and, per CFO/CEO relay, other shards too) before either
sub-agent could review the other. **No record in this shard should be read as `PRODUCTION_READY`
by this mission's own definition** (which requires the second-review step). Everything below is
first-pass `VERIFIED` at best.

## ASSIGNED SCOPE

Shard 2 of 4, canonical university registry, `qtcvcflzxbuagvvwahhu` (the live app DB despite its
`oryn-qa-scratch` project name — confirmed via `.env.local`/`docs/current-state.md`). Boundary
corrected once mid-session (see Commits): final range is **rn 254–506 inclusive, 253 universities**,
ordered `id.asc` on `duplicate_status <> 'superseded'`, matching S4's `--range` flag on
`scripts/acquire-university-images.ts`, adopted fleet-wide as the canonical split after a
same-count collision with S1 traced to an off-by-one in this session's own initial
`floor(N·k/4)` quartile math. Split internally: S2-A rn 254–378 (125), S2-B rn 379–506 (128).

## PRODUCTION-READY COUNT

**0** — by design, since second review never ran. See VERIFIED below for the closest honest
equivalent (first-pass-verified, single-reviewer).

## CANDIDATE COUNT

**27** (all S2-A). These are records S2-A logged before its interruption where the sourced/
existing image is plausible but the agent's own confidence bar wasn't fully cleared (e.g. a
generic-but-plausible campus scene, or a corroborating source found but not independently
cross-checked a second way). S2-B produced zero CANDIDATE — every S2-B record resolved cleanly to
VERIFIED or BLOCKED, per its own report.

## REJECTED COUNT

**0.** No record was found to be an unfixable duplicate or a non-institution; every problem found
was resolved by sourcing a real replacement or, where that failed, marked BLOCKED (below) rather
than rejected outright.

## BLOCKED / UNCLEAR COUNT

**16** (11 from S2-A, 5 from S2-B) — genuine gaps after real per-university search effort, not
laziness. Every one has a documented reason in its own JSONL record (`action_taken: still_gap`).
Named examples from S2-B: COMSATS University Islamabad (multi-campus; only found photos of other
constituent campuses, declined to substitute and risk a wrong-campus error), Applied Science
Private University Jordan (no Commons/Wikipedia photo exists, official site TLS error), Jouf
University (no usable licensed photo found), Baku State University (only generic/unidentifiable
photos found, judged too weak to represent the institution), Universidad Adolfo Ibáñez (only a
logo and a portrait of the namesake found, no reusable campus photo). S2-A's 10 `still_gap`
records are in `s2a_output.jsonl` with the same per-record reasoning — not separately summarized
here to avoid this doc going stale relative to the source file.

## IMAGE COMPLETE COUNT

**253 / 253 processed** (100% of the assigned shard has a record — VERIFIED, CANDIDATE, or
BLOCKED — nothing silently skipped). Of those, **210 have a real, sourced-or-verified campus/
building/library/lab/student-life photo attached** (149 verified-existing-ok + 61 sourced-new,
summed across both halves — see breakdown below). The remaining 43 are the 27 CANDIDATE + 16
BLOCKED above.

## SECOND REVIEW COUNT

**0.** This is the mission's central unmet requirement — flagging clearly rather than burying it.
Neither S2-A nor S2-B reviewed the other's output before the fleet-wide interruption. Each did
review its *own* bucket-1 records against the live pipeline's prior "accepted" state (see Key
Findings), which is a real quality pass but not the mission's specified cross-review.

## DUPLICATES FOUND

**0 canonical/identity duplicates** found in this shard. Both S2-A and S2-B explicitly checked for
this per-university and reported nothing warranting escalation — neither `s2a_issues.jsonl` nor
`s2b_issues.jsonl` was created, since nothing needed them.

## KEY GAPS

The 16 BLOCKED universities above (no defensible photo exists yet, need either a different source
strategy or founder/CEO sign-off to leave without a real photo). The unrun cross-review is the
other structural gap — the 27 CANDIDATE and the 210 VERIFIED records have only ever had one
agent's eyes on them.

## KEY UNCERTAINTIES / FINDINGS WORTH FLEET-WIDE ATTENTION

**1. The existing acquisition pipeline's "accepted" images have a real, non-trivial defect
rate — already relayed to S9/S10 live, restated here for the record.** Of 176 bucket-1
universities across both halves (already carrying a pipeline-accepted `primary_image_url` before
this mission started), **28 (~15.9%) were actually wrong on direct visual inspection**: S2-A found
17/83 (~20.5%) — including a case of completely unrelated content (IPB University's stored image
was a photo of crochet dolls), cartoon/illustrated maps, marketing composite graphics with cartoon
overlays, and generic non-campus lifestyle photos; S2-B found 11/93 (~11.8%), all logos/branding
graphics, and notably **100% of S2-B's failures came from the pipeline's `official` (og:image-
scraped) tier, 0% from `wikimedia_verified`** — a university's own social-share image is
frequently its logo, not a campus photo. All 28 were corrected with real sourced replacements, so
this shard has no net gap from it, but if a similar rate holds in S1/S3/S4's own bucket-1 records,
`scripts/university-image-coverage-report.ts`'s current "real_verified" count is materially
overstating genuinely-correct coverage fleet-wide, since that script has no semantic check by
design (documented in its own source).

**2. Provenance for the pipeline's pre-existing images is richer than a first grep suggested.**
`university_profile_metrics` carries `primary_image_status`, `primary_image_url`,
`primary_image_checksum`, `primary_image_license`, and `primary_image_attribution` — so most
bucket-1 records had real license/attribution metadata to check against, not just a bare URL. This
was live-corrected with S9 early in this session (see prior chat), separate from this handoff.

**3. Operational: `upload.wikimedia.org` 429-rate-limits direct `curl`**, plausibly a shared
fleet egress IP — `WebFetch` on the same URLs worked reliably. Already relayed to S10.

**4. No schema/migration is strictly required to promote this data**, since images live in the
generic EAV table `university_profile_metrics` (new `metric_code` values need no DDL) — also
already relayed to S9, worth confirming before anyone drafts a migration ask to the founder.

## FILES CREATED/UPDATED

- `data/research/universities/photos-s2/shard2_full_input.json`, `s2a_input.json`,
  `s2b_input.json` — the live-queried shard input (253 universities, id/name/country/website_url/
  logo_url/prior image_url/prior status), corrected boundary version.
- `data/research/universities/photos-s2/s2a_output.jsonl` — 125 records, rn 254–378.
- `data/research/universities/photos-s2/s2b_output.jsonl` — 128 records, rn 379–506.
- `docs/ORYN_WORKSTREAMS.md` — UNIVERSITY-PHOTOS-S2 row claimed and will be updated to closed
  status alongside this handoff.
- This file.

**No Supabase writes.** No production code touched. No migrations.

## COMMITS

- `8aba354` — lane claim + shard-boundary correction (253–505 → 254–506) after the S1 collision.
- `3bc55b9` — protective recovery commit (made by another session/process after this session's
  sub-agents were interrupted; not authored by this session's own tool calls, included here for a
  complete record) — the 253 output records.
- This handoff + workstream-status update (next commit).

## BRANCH

`oryn/university-photos-s2`, isolated worktree at `.claude/worktrees/university-photos-s2`,
pushed to `origin/oryn/university-photos-s2`. **Not merged to main**, per the contract.

## WHAT THE NEXT OWNER SHOULD DO

1. **Run the missing cross-review** before treating anything here as `PRODUCTION_READY`: have a
   fresh agent (or S8/QA) review S2-A's 125 against S2-B's methodology and vice versa, focused
   especially on the 27 CANDIDATE records and a sample of the 210 VERIFIED ones.
2. **Decide the 16 BLOCKED cases** — accept without a photo (fall back to logo/ORYN icon tier, per
   the existing display chain), or authorize a different sourcing strategy (e.g. a paid stock
   source, direct outreach to the institution) for a founder/CEO call, not a research-lane one.
3. **Consider whether S1/S3/S4 should re-check their own bucket-1 `official`-tier records**
   against Finding #1 above — a ~12-20% defect rate in "accepted" images is a real fleet-wide
   data-quality issue, not unique to this shard.
4. **Promotion path**: once second-reviewed, these are ready to become new
   `university_profile_metrics` rows (`primary_image_url`/`primary_image_status`/
   `primary_image_license`/`primary_image_attribution`) via the existing EAV pattern — no
   migration needed (Finding #4) — but per the Research Freeze contract, only CEO/DATA promotes
   research-lane output to production, not this lane.
