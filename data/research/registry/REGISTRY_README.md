# ORYN Research Freeze — Claim / Coverage Registry

**Owner of this mechanism: CEO (control tower).** This file and its companion ledger exist so
S1-S8 workers never research the same canonical entity twice and so gaps are visible in one
place instead of scattered across chat. CEO maintains the consolidated view; CEO does not
research records, source photos, or edit evidence.

## Why append-only, per-worker shard files

Eleven-plus sessions are running concurrently. A single shared file that everyone edits in
place is a guaranteed conflict generator. Instead:

1. **Each worker owns exactly one shard file, named by role, not by session id**:
   `claims_S1.jsonl` … `claims_S8.jsonl`, `claims_S10.jsonl` (CFO). **Decided 2026-08-26 ~10:05**
   after S1 flagged the ambiguity — role-based names are the standard (S-numbers are the stable
   fleet identity per the session-naming protocol; session ids like `oryn-c8` are not). Append-
   only — one JSON object per line, never rewrite a previous line. If a record's status changes,
   append a NEW line with the same `research_id` and the updated `status`/`last_activity` — the
   ledger is a log, not a table.
2. **S8 (QA) is the one role that doesn't discover candidates, so its shard holds verdicts, not
   claims.** `claims_S8.jsonl` entries use `entity_type: "qa_verdict"`, reference the original
   `research_id` they're auditing, and carry a `recommended_status` field (e.g.
   `PRODUCTION_READY`, `REJECTED`, `BLOCKED`) plus `notes` with the evidence. **S8 does not edit
   another shard's file directly** — the owning worker (or CEO, if the owning worker is
   unresponsive or the row predates this registry) applies the actual status transition in
   their own shard after reading S8's verdict. This preserves one-writer-per-shard.
2. **CEO alone regenerates `MASTER_REGISTRY.jsonl`** (the consolidated, deduplicated,
   latest-status-per-`research_id` view) by scanning every `claims_*.jsonl` shard. Workers
   should treat `MASTER_REGISTRY.jsonl` as read-only and re-pull it before claiming new
   candidates, but write their own claims only to their own shard.
3. This mirrors the convention already proven in this repo (`cr1_*.jsonl`, `summer_*.jsonl`,
   `turkey_*.jsonl`, `de_nl_*.jsonl` — one prefix per lane in a shared directory).

## Before you research any candidate

1. Pull latest: `git -C <your worktree> fetch origin oryn/research-freeze-ceo-control-tower && git show origin/oryn/research-freeze-ceo-control-tower:data/research/registry/MASTER_REGISTRY.jsonl`
   (or just read the file if you're on a branch that has merged it).
2. Check the **live DB directly** too — the registry tracks in-flight research; the DB is the
   ground truth for what's already `PRODUCTION_READY`. A candidate can be absent from the
   registry but already live (shipped by a prior session, e.g. the 2026-08-23/24 overnight
   corpus — see "Prior coverage" below).
3. Normalize the candidate name (strip year suffixes, resolve organizer/official domain) before
   checking — "X Competition 2026" and "X Competition" are the same canonical entity unless
   materially different (separate application, eligibility, or outcome).
4. If found (anywhere: registry, DB, or a prior handoff doc) — do not re-research. If it's
   assigned to a different S-category, hand off rather than duplicate (see Common Operating
   Contract, "Category Ownership").
5. If genuinely new — append a `CLAIMED` line to your own shard, then proceed.

## Schema (one JSON object per line)

```json
{
  "research_id":        "S6-0001",
  "canonical_candidate": "International Chemistry Olympiad (IChO)",
  "entity_type":        "opportunity",
  "category":           "competition",
  "subcategory":        "science_olympiad",
  "owner_server":       "local-machine-1",
  "owner_agent":        "oryn-88",
  "status":             "CLAIMED",
  "official_domain":    "ichosc.org",
  "claimed_at":         "2026-08-26T09:00:00Z",
  "last_activity":      "2026-08-26T09:00:00Z",
  "turkey_access":      "UNCLEAR",
  "duplicate_of":       null,
  "notes":              ""
}
```

`entity_type`: `opportunity` | `university_photo` | `opportunity_photo` | `university_fact`
(only use this ledger for photos and net-new opportunity/fact candidates — routine field-level
research on an already-`PRODUCTION_READY` row doesn't need its own `research_id`, just note it
in your own handoff).

`status` (per Common Operating Contract §11, extended with the two working states from the
CEO brief):
`UNCLAIMED -> CLAIMED -> RESEARCHING -> READY_FOR_REVIEW -> VERIFIED -> PRODUCTION_READY`,
or `BLOCKED` / `REJECTED` at any point. `duplicate_of` set + status `REJECTED` for confirmed dupes.

`research_id` prefix = your category slot (S1-S4 photos, S5 summer/precollege/research/
internships, S6 competitions, S7 scholarships/awards/publications/leadership/online/Türkiye-
global, S8 QA). Number sequentially within your own shard; global uniqueness comes from the
`S<n>-####` prefix + your `owner_agent` id, so two workers in the same slot should also put
their agent id in the id, e.g. `S6-oryn88-0001`, to avoid collision if more than one session
ever shares a slot.

## Prior coverage — read before claiming S5/S6/S7 candidates

A full overnight multi-agent research pass ran **2026-08-23 -> 2026-08-24**, before this
week's freeze, covering exactly the S5 (summer/precollege/research/internships) and S6
(competitions) categories in significant depth. It is **not yet reflected in this registry**
(CEO is backfilling summary entries now) but it is real, already-live-in-production in large
part, and re-researching it from scratch would be wasted capacity. Read these first:

- `data/research/opportunities/cr1_2026-08-23_TRACKER.md` — competitions/olympiads + research
  category. 100+ records researched, **11 written to production** including all 6 TÜBİTAK-route
  flagship olympiads (IMO/IBO/IChO/IPhO/IOI/IOAI) with verified Türkiye national routes.
- `data/research/opportunities/summer_CHECKPOINT_2026-08-23.md` — summer/pre-college programmes.
  390+ findings, 200+ dry-run proposals, ~150 active rows individually verified.
- `docs/handoffs/ceo-morning-report-2026-08-24.md` — consolidated summary of what got written to
  production that night, plus one **still-open founder decision** (write-ownership on
  `opportunities*`) worth checking hasn't recurred with this week's larger fleet.
- Both files above are still **uncommitted in the primary checkout** as of this freeze's start
  (2026-08-26) — verify they're still there / ask CEO before assuming they've been lost or
  superseded.

**Practical read for S5/S6/S7 this week**: treat competitions+research+summer as
*deepen-and-fill-gaps*, not *start from zero*. S7 (scholarships/awards/publications/leadership/
online/Türkiye-global) has comparatively little prior coverage — the overnight corpus was
scoped to only two of the four S5-S7 categories.

**S1-S4 (university photos) — CORRECTED, see `GAP_MAP.md` §1 for full detail.** This was
originally (wrongly) written up here as greenfield/zero-coverage. It is not: 901/1,010
universities already have a `primary_image_status` row in the `university_profile_metrics` EAV
table (525 `wikimedia_verified`, 194 `official`, 2 `verified`, 180 `needs_review`), backed by a
real Supabase Storage pipeline (`lib/acquisition/image-storage.ts` + `image-validation.ts` +
`opengraph.ts`, `scripts/acquire-university-images.ts`). Caught by S10 (CFO) ~15 minutes after
this file first posted, independently confirmed by S2 and S8. Root cause of the original miss:
the data lives in an EAV table (`metric_code`/`value_text`), not a dedicated column, so a
migration/column grep for `image_url` structurally cannot see it. **S1-S4's real job is
verify-and-fill** (the existing pipeline only checks image dimensions/aspect ratio — zero
semantic check for wrong-campus or a crest that slipped past the logo split), not first-pass
sourcing from zero. New provenance fields likely fit as new `metric_code` values in the same
EAV table, probably **without** a migration — see `GAP_MAP.md` for the one open confirmation
still needed before relying on that.

## S1-S4 canonical shard boundaries (settled 2026-08-26 ~10:30)

1,010 canonical universities, id-ascending. **Precision correction, 2026-08-26 ~12:20 (S3):** the
`--range <start>-<end>` flag lives only on S4's own unmerged branch right now, not a tool the
other three shards actually invoke — describing it as something "S1/S2/S4 standardized on" was
imprecise. What's actually true, verified directly against all 3 pushed manifests: the
**ordering** (id-ascending) is genuinely convergent across S1/S2/S3's independently-run queries —
S1's range ends exactly where S2's begins, S2's ends exactly where S3's corrected range begins.
So the boundaries hold in practice, just not via one shared invoked script yet. Worth adopting
S4's flag as the actual shared tool once it merges, rather than relying on independent queries
continuing to agree:

| Shard | Range | Owner |
|---|---|---|
| S1 | 1-253 | confirmed |
| S2 | 254-506 | confirmed (moved off an initial accidental overlap with S1 — see below) |
| S3 | 507-759 | confirmed (corrected from an initial self-claimed 506-757, which overlapped S2 by 1 row at 506 and left 758-759 unclaimed) |
| S4 | 760-1010 | confirmed |

**Real collision caught and resolved this checkpoint, recorded so the pattern is visible**: S1
and S2 independently landed on the identical first shard (both reporting the same 177-accepted/
253-total numbers) before either had seen the other's claim. S3 separately self-derived a
boundary one row off from S2/S4's. Both caught by CEO cross-checking exact numbers peers reported
against each other, not by either peer noticing on their own — **if your shard's counts look
suspiciously round or your boundary was self-derived rather than pulled from this table, re-check
it against this table before spending real research time.**

## Consolidation model — lanes don't push to the CEO's branch

Each S1-S8 lane keeps its own `claims_S<n>.jsonl` on its **own** branch/worktree (already the
convention — nobody needs push access to `oryn/research-freeze-ceo-control-tower`). CEO pulls
from each lane's own pushed branch (`git show <branch>:data/research/registry/claims_S<n>.jsonl`
or an equivalent fetch) to build `MASTER_REGISTRY.jsonl`, rather than lanes pushing into a shared
branch. If your shard file isn't picked up in a checkpoint, it's because CEO hasn't pulled your
branch yet, not because the convention is wrong — ping if it's been more than a few hours.

## Non-negotiables (from the Common Operating Contract, restated here for this mechanism)

- No production writes from any S1-S8 worker. Dry-run proposals only; CEO/DATA promotes.
- `UNCLEAR` Turkey-access and `RIGHTS_REVIEW_REQUIRED` images are not `PRODUCTION_READY`.
- Do not count duplicates, ineligible, unclear, historical, or missing-second-review records
  toward any coverage target.

## Do not use as source material: `Claude.pdf`

Flagged by S6: `Claude.pdf` (untracked, sits in the primary checkout root) is **not** a research
seed document — it's an unrelated ORYN profile export naming a real minor student. Do not open
it for research purposes, do not treat it as opportunity/university source material, do not copy
anything from it into any shard. This is a privacy matter, not a coverage one.
