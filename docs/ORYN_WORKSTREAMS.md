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

## Current rows (last updated 2026-08-21, reconciled during the non-UI integration wave — DATA-A/PROD-B/COORD/UI-SIMPLIFY rows carried from Claude B's copy, the RESEARCH row carried from Research Claude's copy since only it had the full R2.1/R3.1/R4 detail. Neither side rewritten from assumption.)

| Workstream | Owner | Branch | Current package | Scope | Status |
|---|---|---|---|---|---|
| DATA-A | Claude A | `oryn/programs-pipeline-reconciled` | Admissions-URL coverage campaign (4 batches, 512/1019 universities, 50.2%) + programme-catalogue pipeline (Delft/Trinity pilot + Edinburgh/Waterloo/Glasgow batch 2, 6 real extraction bugs found and fixed with tests) + opportunities Wave 1 groups B/C/D/F/G applied + dedup QA cleanups + **0043 data backfill run and verified (9/9 pairs correctly `duplicate_status='superseded'`)**. | University/opportunity data acquisition, canonical graph, ingestion pipelines, data QA — see `docs/MASTER-EXECUTION-STRATEGY.md` §3 "Computer A" for the full scope list | **Deferred from the 2026-08-21 non-UI integration wave** — branch was observed moving continuously throughout the integration window (10+ new pushed commits in under an hour, including code changes in `lib/acquisition/programs.ts` and two new acquisition scripts that were never independently validated). Per the freeze-test rule, a still-moving branch is not merged. Not yet merged to `main`; re-attempt once it holds still long enough to validate. |
| PROD-B | Claude B | `oryn/counselor-data-quality-v1` | B1-B12 complete (see `docs/integration-readiness-report-2026-08-20.md`) + freeze/merge-prep phase (see `docs/handoffs/claude-b-merge-plan-2026-08-20.md`) — found and fixed a real live-crash bug this pass (`refreshOpportunityMatches` 42703-erroring on any env without migration 0047). | Counselor intelligence, product/UX, opportunity data quality, canonical entity integration, `main` integration ownership per the strategy doc | Feature-frozen, stable and unchanged across two separate integration checkpoints (`4d3eb5e`). Included in the 2026-08-21 non-UI integration wave. |
| COORD | Claude B | `oryn/coordination-integration-2026-08-20` | Coordination-only package, merged to `main` as `5c59115`. | Docs only | Done — DATA-A already merged it back into their branch (`19c6fca`). |
| UI-SIMPLIFY | Claude (third session) | `oryn/ui-simplification-v1` | UX simplification — dashboard hierarchy pass, sticky profile jump-nav, citizenship settings form, opportunity-preview label fix, Discovery/Map package, Opportunity Detail Experience V1. **Has merged PROD-B's entire branch in twice** (`6bbe245`, then `1488ec4` after PROD-B's `41a5d5a`) — confirmed via `git merge-base --is-ancestor`. | UX research, cognitive-load reduction, progressive disclosure, final information architecture | **Explicitly excluded from the 2026-08-21 non-UI integration wave per founder instruction.** Continuing independently; will rebase/merge from the updated `main` and undergo its own integration gate in a later wave. Latest observed: `d87912b`. |
| (unclaimed) | — | `oryn/university-intelligence-spine`, `oryn/counselor-core-v1`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-2026-08-19`, `oryn/product-ux`, `oryn/programs-opportunities-intel`, `oryn/programs-pipeline` | — | No commits ahead of what's already in the DATA-A/PROD-B lineage as of the last check by either session — treat as historical/superseded unless a session actively resumes one. | Dormant unless noted. |
| RESEARCH | Research Claude | `oryn/research-turkey-schools` (isolated worktree at `.claude/worktrees/research-intelligence`, branched from `origin/main`@`5c59115`; branch name is now Wave-1-specific but the lane carries R2.1/R3.1/R4/5th package too — not renamed mid-package to avoid branch churn) | Five packages complete this checkpoint: (1) Turkey high-schools canonical registry, Wave 1 — 100/100. (2) Secondary-education-system intelligence (R2.1) — 8/8 systems, incl. a confirmed schema-modeling error (`education_records.curriculum='ap'`) flagged for Claude B. (3) Country-level admissions-system intelligence (R3.1) — 6/6 destination systems (US/UK/Netherlands/Italy/Germany/Canada), each with a dedicated Türkiye-applicant section and a 12-rule evidence-based ruleset; key finding: DSD-vs-academic-qualification-recognition conflation (Germany) is the highest-stakes counselor risk found across all 3 packages. (4) Opportunity eligibility intelligence (R4, self-directed) — grade/age normalization across 6 systems, a citizenship/residency/school-location 3-axis taxonomy across 20 real programs, prerequisite/timing patterns across 5 opportunity categories, plus a 32-row sourced extraction-audit sample against 102 live `opportunities` rows and a 14-rule evidence-based ruleset. (5) Counseling-materials discovery-list gap closure — 2 new verified opportunity candidates, 4 selectivity-evidence update proposals, and 2 unplanned data-quality findings (a university-only "Hack-AI-thon" row wrongly live as a high-school opportunity, and a likely Wharton Data Science Competition / Sports Analytics duplicate pair). | `docs/research/**`, `data/research/schools/**`, `data/research/academic-systems/**`, `data/research/admissions-systems/**`, `data/research/opportunity-eligibility/**`, `data/research/opportunities/**`, `docs/handoffs/research-*.md` — research/evidence only, no schema/app/production writes | All five packages complete and pushed; confirmed pure (zero app code/migrations/schema across its entire diff vs `main`). Included in the 2026-08-21 non-UI integration wave. Handoffs: `docs/handoffs/research-turkey-high-schools.md`, `docs/handoffs/research-secondary-education-systems.md`, `docs/handoffs/research-admissions-systems.md`, `docs/handoffs/research-opportunity-eligibility.md`, `docs/handoffs/research-opportunities-counseling-list.md` (consumers: DATA-A and PROD-B per package). This lane does not write to Supabase or production code — every output is a reviewed proposal. Live-remeasured this checkpoint: `opportunities.eligible_countries` moved from 14/334 (R2.1 checkpoint) to only 18/352 (~5.1%) — the gap has not materially closed. |
| ADMISSIONS-INTEL | Claude (overnight research session, 2026-08-21 ~01:2x–13:00+ local; continued past 11:00 once the founder directly lifted the stand-down and confirmed the coordination session's delegated authority) | `oryn/admissions-intelligence-research` (isolated worktree at `.claude/worktrees/admissions-intelligence`, branched from `main`@`5ec6700`) | R3.1 continuation/expansion, now three layers deep: (1) 15 country systems (original 6 unmodified + 8 destinations + Turkey's own domestic YKS/ÖSYM system) in `admissions-systems-v1.json`; (2) 7 program-family requirements docs (Medicine/Law/Architecture/Arts-Design/Engineering/Computer-Science/Economics-Business) covering all 15 countries each, in `docs/research/admissions-systems/program-requirements/`; (3) RULE-ADMISSIONS-001 through 021 (001-012 original, 013-017 country-pass, 018-021 program-family-pass — none renumbered). Two real data-quality catches this pass, fixed not shipped: Law's JSON used hyphenated country keys instead of this package's underscore convention (would've silently broken cross-referencing), and Turkey's conservatory-exception hedge was strengthened with a more specific cross-check finding (two unreconciled threshold logics, one no-floor institution) rather than left as a single unqualified number. Batch 3 (Sweden/Belgium/Austria/Poland/Czech Republic) still not started — not blocked, just not yet assigned. Full detail: `docs/handoffs/research-admissions-systems-v2.md`. | `docs/research/admissions-systems/**` + `README.md` (existing content preserved, additive only), `data/research/admissions-systems/**`, `docs/handoffs/research-admissions-systems-v2.md`. Research/evidence only, no schema/app/production writes — same posture as the RESEARCH row. | **Complete for this session's authorized scope, idle pending next assignment.** Every committed file is finished/validated, no half-written docs. Zero file-path overlap with COUNSEL-RESEARCH or any code/data lane. |

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
- **Turkish school registry (`canonical_entities` where `entity_type='school'` and
  `country_code='TR'`) is further along than any doc currently states**: 58 schools live,
  133 aliases, `school_profiles` populated for all 58, and `school_credentials` already
  carries 42 IB Diploma Programme rows plus assorted AP/Cambridge IGCSE/German
  Abitur-DSD/French Baccalaureate-equivalency rows — re-measured directly 2026-08-20 via
  Supabase MCP `execute_sql`, not copied from `docs/entity-canonicalization-audit.md`
  (which predates it and undercounts at "54 of 58"). `entity_verification_queue` also has
  ~50 more school rows in `queued`/`in_progress`/`verified` states from that same
  2026-08-15/17 pass — 8 of them (`Aka Koleji`, `AlJazari International School of Science
  and Technology`, `Anka Bilim Koleji`, `Ankara ABC Okulları`, `BALIKESIR ACI COLLEGE`,
  `Cakir Schools`, `Yeni Yol Schools`, `ZAFER COLLEGE`) have no matching `canonical_entities`
  row yet — genuinely unresolved, not just unverified. Nobody currently owns finishing this
  queue or extending the school registry further; the RESEARCH row above is picking up
  exactly that (resolving the 8 open queue names plus new geographic coverage), as a
  research handoff, not a live write.
