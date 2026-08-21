# ORYN Workstreams — live ownership map

**Purpose:** prevent duplicate work across concurrent Claude agents. This file answers
*who owns what, on which branch, right now* — nothing else. It is rewritten in place per
workstream row, not appended to as a log.

**This is not a duplicate planning system.** The other three canonical documents already
exist under different names and are not reproduced here:

- **Master plan / product direction** → [`docs/MASTER-EXECUTION-STRATEGY.md`](./MASTER-EXECUTION-STRATEGY.md)
  (reset 2026-08-20 — read this first, it is current)
- **Operational status / live coverage numbers** → [`docs/current-state.md`](./current-state.md)
  (rewritten at each integration checkpoint, not appended to — check its own "last
  measured" date before trusting it; a stale copy is worse than no copy)
- **Permanent decision log** → [`docs/product-decisions.md`](./product-decisions.md)
  (autonomous-decision record; append new enduring decisions there, not here)

If you're about to create `ORYN_MASTER_PLAN.md`, `ORYN_STATUS.md`, or `ORYN_DECISIONS.md`,
stop — those roles are already filled by the files above. Only this ownership table was
genuinely missing as of 2026-08-20.

## How to use this file

Before starting a substantial new package: `git fetch --all --prune`, re-read this file,
confirm nobody already owns what you're about to do. Claim your row (update it) before
starting large work; update it again when you finish or hand off. Do not rewrite another
agent's row from assumption — verify from git log/live DB first, then correct with
evidence if it's actually wrong.

## Current rows (last updated 2026-08-20, merged from both sessions — DATA-A row re-corrected again by DATA-A itself, since Claude B's version was already one checkpoint stale by the time it landed; that's expected in a live file like this, not a criticism)

| Workstream | Owner | Branch | Current package | Scope | Status |
|---|---|---|---|---|---|
| DATA-A | Claude A | `oryn/programs-pipeline-reconciled` | Admissions-URL coverage campaign (4 batches, 512/1019 universities, 50.2%) + programme-catalogue pipeline (Delft/Trinity pilot + Edinburgh/Waterloo/Glasgow batch 2, 6 real extraction bugs found and fixed with tests) + opportunities Wave 1 groups B/C/D/F applied + a 3-record opportunities dedup QA cleanup. 3 more background research agents in flight as of this checkpoint: competitions expansion, research/internship/scholarship expansion, student-count coverage. | University/opportunity data acquisition, canonical graph, ingestion pipelines, data QA — see `docs/MASTER-EXECUTION-STRATEGY.md` §3 "Computer A" for the full scope list | Active. Latest pushed commit as of this note: `29c2f97`. Not yet merged to `main`. |
| PROD-B | Claude B | `oryn/counselor-data-quality-v1` | Counselor data-quality hardening + product-integration/data-contracts/counselor-surfacing/UI-foundation/QA package (B1-B12) | Counselor intelligence, product/UX, opportunity data quality, canonical entity integration, `main` integration ownership per the strategy doc | Active. Latest pushed commit as of Claude B's own last check: `88061d6`. 5 correctness fixes shipped that checkpoint plus `docs/current-product-capability-map.md`. Not yet merged to `main`. |
| COORD | Claude B | `oryn/coordination-integration-2026-08-20` | Coordination-only package: brought this file in from DATA-A's branch without merging it wholesale, re-measured and rewrote `docs/current-state.md` with proper measurement-provenance framing, corrected this table — merged to `main` as `5c59115`. | Docs only (`docs/ORYN_WORKSTREAMS.md`, `docs/current-state.md`) — no code/schema/data changes | Landed on `main`; DATA-A merged it back into `oryn/programs-pipeline-reconciled` this checkpoint (resolving the add/add conflict this file itself hit — both sessions edited it concurrently, exactly the scenario this file exists to reduce). |
| UI-SIMPLIFY | Claude (third session) | `oryn/ui-simplification-v1` | UX research / simplification analysis (per the founder's `MASTER-EXECUTION-STRATEGY.md` §"UI / Simplification Claude" workstream) — first-pass simplification analysis, a dashboard opportunity-preview fix, a profile_views visibility-check fix, a profile-completeness scoring fix. | UX research, cognitive-load reduction, progressive disclosure, final information architecture | Active as of `1b964d0` (newest branch seen this checkpoint, not yet deeply investigated by DATA-A — different territory, no overlap expected). |
| (unclaimed) | — | `oryn/university-intelligence-spine`, `oryn/counselor-core-v1`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-2026-08-19`, `oryn/product-ux`, `oryn/programs-opportunities-intel`, `oryn/programs-pipeline` | — | No commits ahead of what's already in the DATA-A/PROD-B lineage as of the last check by either session — treat as historical/superseded unless a session actively resumes one. | Dormant. |
| COUNSEL-RESEARCH | Two coordinating Claude sessions (overnight research, started 2026-08-21 ~01:2x local) | `oryn/counseling-intelligence-research` (main checkout, one session) + `oryn/counseling-intelligence-research-013956` (isolated worktree, the other session) | Counseling-intelligence knowledge layer, now essentially complete: student-development taxonomy, opportunity→development evidence-state mapping, grade/geography-conditional recommendation-timing, profile-gap + redundancy/saturation frameworks, 17-family major/career evidence tree (all 17 done), explainability framework, consolidated unsafe-inference registry, persona testing, geography-admissions-systems deep dive, open questions — structured `RULE-COUNSEL-###` artifacts throughout (two colliding numeric ranges pending final integration, see below). | `docs/research/counseling-intelligence/**`, `data/research/counseling-intelligence/**`, `docs/handoffs/research-counseling-intelligence.md` only, on both branches. **Explicitly does not touch** `lib/counselor/**`, any schema/migration, or production Supabase. | **Both sessions have completed their full assigned scope as of this checkpoint** (~03:0x). Verified split (not assumed — confirmed via direct cross-session messages both ways): main-checkout session owns docs `03`, `06-major-family-evidence/00`+`01`-`09`, `07`, `08`; worktree session owns `00`-`02`, `04`-`05`, `06` families `10`-`17`, `09`-`12` (the last two beyond the original 10-doc plan). **One of the two integration items is now resolved; one remains**: (1) ~~`RULE-COUNSEL-034`-`059`+ double-minted by both sessions~~ — **resolved**: the main-checkout session renumbered its own colliding range to `200`-`230` (peer's own `034`-`086`+ range untouched, by mutual agreement); (2) still open: the two branches' `rules.json`/`sources.json` have not been merged into one canonical file — main checkout now has `200`-`230` pending merge into its own pre-existing `001`-`033`/`901`-`902` foundational registry, which itself still needs merging with the peer branch's separate, larger registry. Full chronological account, corrected topology, and next-action list in `docs/handoffs/research-counseling-intelligence.md` — that file also documents and corrects a misattribution introduced by what looks like an unrelated `canonical-entity-intelligence` session also using this same branch as scratch space; that unrelated mandate's commits are interleaved in this branch's `git log` and should **not** be pulled into any COUNSEL-RESEARCH integration. Timeboxed to 2026-08-21 11:00 Europe/Istanbul — both sessions continuing to deepen/broaden per the mission's own instruction rather than stopping now that the core plan is done. |

## Known cross-branch facts worth not re-discovering

- `origin/main` tip is `5c59115` ("docs: coordination integration — workstreams map +
  re-measured current-state"), merged from `oryn/coordination-integration-2026-08-20`. DATA-A
  has merged this into `oryn/programs-pipeline-reconciled`. Neither DATA-A nor PROD-B's
  product work has been merged into `main` yet as of this note.
- **Migration numbering, corrected by PROD-B, still current**: PROD-B's branch has migrations
  through **0048** (`0047_structured_eligibility_facts.sql`,
  `0048_profile_view_visibility_guard.sql` — both written, reviewed, **not yet applied
  live**). **DATA-A should use 0049+** for any new migration — DATA-A has not added any
  migrations this session, so this remains purely a heads-up, not yet consumed.
- **Live DB re-measured 2026-08-20 by Claude B** (`oryn-qa-scratch`, `qtcvcflzxbuagvvwahhu`,
  via Supabase MCP): migration `0043_university_duplicate_supersession`'s DDL **is now live**
  (the `duplicate_status`/`superseded_by_id` columns genuinely exist) — this corrects the
  prior "never applied" narrative still circulating in `docs/founder-blocked-backlog.md`.
  However the **data backfill has not run** (`select count(*) from universities where
  duplicate_status = 'superseded'` = 0 as of that check) — the 9 known duplicate pairs are
  still only suppressed by `lib/universities/duplicate-supersessions.json` at the application
  layer. `0046` is also confirmed live. This is a data-migration task now, not a DDL/access
  problem — DATA-A has not run it yet this session (out of scope for the batches run so far;
  a good next candidate). Also flagged by Claude B: a **new Supabase-secret-key regression**
  ("JWT issued in future") — full detail in `docs/current-state.md`.
- DATA-A's machine has no local `SUPABASE_SECRET_KEY`/`ANTHROPIC_API_KEY`/`TAVILY_API_KEY` —
  all its DB writes went through the Supabase MCP tool (`execute_sql`) directly against
  `qtcvcflzxbuagvvwahhu`, and its research went through `WebFetch`/`WebSearch` rather than
  this repo's own Tavily integration. A session with real credentials can run
  `scripts/acquire-programs.ts`/`scripts/ingest-university-programs.ts` directly instead.
