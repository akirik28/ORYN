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

## Current rows (last updated 2026-08-20, by the Computer A session on `oryn/programs-pipeline-reconciled`)

| Workstream | Owner | Branch | Current package | Scope | Status |
|---|---|---|---|---|---|
| DATA-A | Claude A (this session) | `oryn/programs-pipeline-reconciled` | Admissions-URL coverage campaign (batches 1-3, 82 universities done, continuing) + programme-catalogue pipeline expansion (delegated to a background agent, batch 2 in flight) | University/opportunity data acquisition, canonical graph, ingestion pipelines, data QA — see `docs/MASTER-EXECUTION-STRATEGY.md` §3 "Computer A" for the full scope list | Active. Latest pushed commit: `ef93277`. Not yet merged to `main` — `main`'s integration owner is Computer B per the strategy doc. |
| PROD-B | Claude B (other computer) | `oryn/counselor-data-quality-v1` | Counselor data-quality hardening: opportunity eligibility evidence, duplicate audits, university-programs-card frontend fix (`036792f`), eligibility-badge rendering fix (`5cdf1bd`) | Counselor intelligence, product/UX, opportunity data quality as it gates counselor output, integration to `main` | Active as of `5cdf1bd` (most recent commit seen this session). Not yet merged to `main` — branched off `main`@`1f9c474` (post counselor-core-v1 merge), main hasn't moved since. |
| (unclaimed) | — | `oryn/university-intelligence-spine`, `oryn/product-ux`, `oryn/programs-opportunities-intel`, `oryn/programs-pipeline` | — | These branches exist on origin and have local worktrees on this machine (`.claude/worktrees/product-ux`, `.claude/worktrees/programs-opportunities`) but showed no commits ahead of what's already merged into the lineage this session inspected — treat as historical/superseded unless a session actively resumes one. Don't build new work on these without first checking whether their content already landed via the `2b9796c` integration merge. | Dormant as of this check. |

## Known cross-branch facts worth not re-discovering

- `origin/main` tip is `9c06610` ("docs: add canonical parallel execution strategy") —
  unchanged since this session's own merge into `oryn/programs-pipeline-reconciled`
  (`9e3d338`). Neither active branch (DATA-A, PROD-B) has been merged to `main` yet as of
  this row's timestamp.
- Migration numbering: `main` has 0001-0046 applied/committed cleanly (the 0043 collision
  between the spine and programs-pipeline branches was already resolved during the
  `2b9796c` integration — spine kept `0043_university_duplicate_supersession`, programs
  content moved to `0044`). `0047_structured_eligibility_facts.sql` exists only on
  `counselor-data-quality-v1` (PROD-B), not yet merged or applied live — DATA-A should use
  `0048+` for any new migration to avoid re-colliding.
- This environment (DATA-A's machine) has no local `SUPABASE_SECRET_KEY`,
  `ANTHROPIC_API_KEY`, or `TAVILY_API_KEY` — confirmed via `npm run check:integrations`.
  All DB writes this session went through the Supabase MCP tool (`execute_sql`) directly
  against project `qtcvcflzxbuagvvwahhu` (`oryn-qa-scratch`), not through the app's own
  `.env.local`-based scripts. `WebFetch`/`WebSearch` (Claude's own tools, not this repo's
  Tavily integration) were used for all admissions-URL and programme-catalogue research —
  real, verified, evidence-based, just not routed through the repo's own credential-gated
  pipeline. A session with real credentials can run `scripts/acquire-programs.ts` /
  `scripts/ingest-university-programs.ts` directly instead of the MCP workaround.
