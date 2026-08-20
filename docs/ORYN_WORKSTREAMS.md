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

## Current rows (last updated 2026-08-20, by the Claude B session on `oryn/coordination-integration-2026-08-20` — re-verified against live branch/commit state, not copied from the prior version of this file)

| Workstream | Owner | Branch | Current package | Scope | Status |
|---|---|---|---|---|---|
| DATA-A | Claude A | `oryn/programs-pipeline-reconciled` | Admissions-URL coverage campaign (batch 3, 82 universities) + programme-catalogue pipeline work | University/opportunity data acquisition, canonical graph, ingestion pipelines, data QA — see `docs/MASTER-EXECUTION-STRATEGY.md` §3 "Computer A" for the full scope list | Active. Latest pushed commit as of this check: `13f2e9a` ("data: admissions_url batch 3 (82 total) + opportunities dedup QA sweep") — newer than this file's own prior `ef93277` reference, corrected here. Not yet merged to `main`. |
| PROD-B | Claude B | `oryn/counselor-data-quality-v1` | Counselor data-quality hardening + product-integration/data-contracts/counselor-surfacing/UI-foundation/QA package (B1-B12) | Counselor intelligence, product/UX, opportunity data quality, canonical entity integration, `main` integration ownership per the strategy doc | Active. Latest pushed commit as of this check: `88061d6` (merge of `origin/main`'s 3 commits, zero conflicts — 2 were byte-identical patches already independently on this branch, 1 was this file's sibling `MASTER-EXECUTION-STRATEGY.md` itself). 5 correctness fixes shipped this checkpoint (see `docs/current-state.md`) plus `docs/current-product-capability-map.md`. Not yet merged to `main`. |
| COORD | Claude B | `oryn/coordination-integration-2026-08-20` | This coordination-only package: bring this file in from DATA-A's branch without merging it wholesale, re-measure and rewrite `docs/current-state.md` with proper measurement-provenance framing, correct this table | Docs only (`docs/ORYN_WORKSTREAMS.md`, `docs/current-state.md`) — no code/schema/data changes | In progress this checkpoint; branched from `origin/main`, will merge back to `main` once verified, then this branch's owning session syncs its product branch with the result. |
| (unclaimed) | — | `oryn/university-intelligence-spine`, `oryn/counselor-core-v1`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-2026-08-19` | — | Re-checked this session: no commits ahead of what's already in the DATA-A/PROD-B lineage — treat as historical/superseded unless a session actively resumes one. | Dormant as of this check (2026-08-20). |
| RESEARCH | Research Claude | `oryn/research-turkey-schools` (isolated worktree at `.claude/worktrees/research-intelligence`, branched from `origin/main`@`5c59115`; branch name is now Wave-1-specific but the lane carries R2.1/R3.1 too — not renamed mid-package to avoid branch churn) | Three packages complete this checkpoint: (1) Turkey high-schools canonical registry, Wave 1 — 100/100. (2) Secondary-education-system intelligence (R2.1) — 8/8 systems, incl. a confirmed schema-modeling error (`education_records.curriculum='ap'`) flagged for Claude B. (3) Country-level admissions-system intelligence (R3.1) — 6/6 destination systems (US/UK/Netherlands/Italy/Germany/Canada), each with a dedicated Türkiye-applicant section and a 12-rule evidence-based ruleset; key finding: DSD-vs-academic-qualification-recognition conflation (Germany) is the highest-stakes counselor risk found across all 3 packages. | `docs/research/**`, `data/research/schools/**`, `data/research/academic-systems/**`, `data/research/admissions-systems/**`, `docs/handoffs/research-*.md` — research/evidence only, no schema/app/production writes | All three packages complete and pushed. Handoffs: `docs/handoffs/research-turkey-high-schools.md` (consumer: DATA-A), `docs/handoffs/research-secondary-education-systems.md` and `docs/handoffs/research-admissions-systems.md` (consumer: PROD-B). This lane does not write to Supabase or production code — every output is a reviewed proposal. Next: re-checking `docs/current-state.md`/this file for the highest-leverage next research package — `opportunities.eligible_countries` was measured live at 14/334 rows populated as of the R2.1 checkpoint (re-measure before citing), still a candidate for the largest data-trust gap blocking real eligibility matching per `docs/MASTER-EXECUTION-STRATEGY.md` §6 P3, but not assumed to automatically win over other candidates. |

## Known cross-branch facts worth not re-discovering

- `origin/main` tip is `9c06610` ("docs: add canonical parallel execution strategy"). Neither
  DATA-A nor PROD-B has merged into `main` yet as of this check. PROD-B has merged `main`'s 3
  commits *into itself* (the reverse direction), cleanly, no conflicts.
- **Migration numbering, corrected**: PROD-B's branch has migrations through **0048**
  (`0047_structured_eligibility_facts.sql`, `0048_profile_view_visibility_guard.sql` — both
  written, reviewed, **not yet applied live**). **DATA-A should use 0049+** for any new
  migration — 0047 and 0048 are both claimed now, not just 0047.
- **Live DB re-measured 2026-08-20** (`oryn-qa-scratch`, `qtcvcflzxbuagvvwahhu`, via Supabase
  MCP): migration `0043_university_duplicate_supersession`'s DDL **is now live** (the
  `duplicate_status`/`superseded_by_id` columns genuinely exist) — this corrects the prior
  "never applied" narrative that was still circulating in `docs/founder-blocked-backlog.md`
  and an earlier draft of `docs/current-product-capability-map.md`. However the **data
  backfill has not run** (`select count(*) from universities where duplicate_status =
  'superseded'` = 0) — the 9 known duplicate pairs are still only suppressed by
  `lib/universities/duplicate-supersessions.json` at the application layer. `0046` is also
  confirmed live. Whoever's next on this: it's a data migration now, not a DDL/access
  problem. Full detail and other freshly re-measured numbers (university/program/opportunity
  counts, external-service health including a **new Supabase-secret-key regression found this
  checkpoint**): `docs/current-state.md`.
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
