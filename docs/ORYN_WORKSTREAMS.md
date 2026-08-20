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

## Current rows (last updated 2026-08-20, PROD-B row re-corrected by Claude B itself — this row was one checkpoint stale by the time DATA-A's version landed; expected in a live file like this)

| Workstream | Owner | Branch | Current package | Scope | Status |
|---|---|---|---|---|---|
| DATA-A | Claude A | `oryn/programs-pipeline-reconciled` | Admissions-URL coverage campaign (4 batches, 512/1019 universities, 50.2%) + programme-catalogue pipeline (Delft/Trinity pilot + Edinburgh/Waterloo/Glasgow batch 2, 6 real extraction bugs found and fixed with tests) + opportunities Wave 1 groups B/C/D/F/G applied + dedup QA cleanups + **0043 data backfill run and verified (9/9 pairs correctly `duplicate_status='superseded'`)**. | University/opportunity data acquisition, canonical graph, ingestion pipelines, data QA — see `docs/MASTER-EXECUTION-STRATEGY.md` §3 "Computer A" for the full scope list | Active. Latest pushed commit as of Claude B's last check: `afb973f`. Not yet merged to `main`. |
| PROD-B | Claude B | `oryn/counselor-data-quality-v1` | B1-B12 complete (see `docs/integration-readiness-report-2026-08-20.md`) + freeze/merge-prep phase (see `docs/handoffs/claude-b-merge-plan-2026-08-20.md`) — found and fixed a real live-crash bug this pass (`refreshOpportunityMatches` 42703-erroring on any env without migration 0047). | Counselor intelligence, product/UX, opportunity data quality, canonical entity integration, `main` integration ownership per the strategy doc | Feature-frozen as of this checkpoint per founder instruction. Latest pushed commit: `5c1d4e4`. Not yet merged to `main` — a full, verified, ordered merge plan now exists and recommends merging this branch first (zero unresolved dependencies on DATA-A or UI-SIMPLIFY). |
| COORD | Claude B | `oryn/coordination-integration-2026-08-20` | Coordination-only package, merged to `main` as `5c59115`. | Docs only | Done — DATA-A already merged it back into their branch (`19c6fca`). |
| UI-SIMPLIFY | Claude (third session) | `oryn/ui-simplification-v1` | UX simplification — dashboard hierarchy pass, sticky profile jump-nav, citizenship settings form, opportunity-preview label fix. **Has merged PROD-B's entire branch in twice** (`6bbe245`, then `1488ec4` after PROD-B's `41a5d5a`) — confirmed via `git merge-base --is-ancestor`, every PROD-B commit through `41a5d5a` is an ancestor of their tip. | UX research, cognitive-load reduction, progressive disclosure, final information architecture | Active. Latest pushed commit as of Claude B's last check: `aa7fb2b`. Not yet merged to `main`. |
| (unclaimed) | — | `oryn/university-intelligence-spine`, `oryn/counselor-core-v1`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-2026-08-19`, `oryn/product-ux`, `oryn/programs-opportunities-intel`, `oryn/programs-pipeline` | — | No commits ahead of what's already in the DATA-A/PROD-B lineage as of the last check by either session — treat as historical/superseded unless a session actively resumes one. Also seen this checkpoint: `oryn/research-turkey-schools` (Turkey high-schools registry research, not yet investigated for overlap — likely none, pure data/research branch). | Dormant unless noted. |

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
- **Migration 0043 — fully resolved 2026-08-20**: DDL live (found by Claude B), data backfill
  run and verified by DATA-A (`4dd66cd`) — 9/9 pairs correctly `duplicate_status='superseded'`
  with matching `superseded_by_id`, confirmed against `lib/universities/
  duplicate-supersessions.json` and re-verified live again by Claude B during merge-prep.
  `0046` also confirmed live. **What's left is application code, not data or DDL**:
  `lib/universities/canonical.ts`'s 16 read paths still use the JSON snapshot instead of
  querying the now-correct DB columns — scoped as a post-integration follow-up in
  `docs/handoffs/claude-b-merge-plan-2026-08-20.md`, deliberately not started (async-boundary
  refactor, real scope, not opportunistic cleanup).
- **Migration 0047 had a real live-crash bug, now fixed**: `lib/opportunities/
  persist-matches.ts` named `citizenship_countries`/`eligible_citizenships` in an explicit
  Supabase column list — PostgREST rejects the whole query (42703) when a named column is
  missing, so `refreshOpportunityMatches()` (unconditional on every `/opportunities` page
  load, no try/catch) crashed the entire page on any environment without 0047 applied,
  including this one. Fixed by Claude B (`5c1d4e4`, `select("*")`, same pattern as `08ddf0f`'s
  earlier fix for the identical failure mode). Confirmed live before/after against
  `oryn-qa-scratch`.
- **Still open, unchanged**: a new Supabase-secret-key regression ("JWT issued in future"),
  full detail in `docs/current-state.md`. Neither 0047 nor 0048 applied live yet.
- DATA-A's machine has no local `SUPABASE_SECRET_KEY`/`ANTHROPIC_API_KEY`/`TAVILY_API_KEY` —
  all its DB writes went through the Supabase MCP tool (`execute_sql`) directly against
  `qtcvcflzxbuagvvwahhu`, and its research went through `WebFetch`/`WebSearch` rather than
  this repo's own Tavily integration. A session with real credentials can run
  `scripts/acquire-programs.ts`/`scripts/ingest-university-programs.ts` directly instead.
