# Handoff: Canonical Entity Intelligence Research — live session state

Research-only overnight mission, distinct from the concurrent `research-counseling-intelligence.md`
session sharing this branch/working directory. Owns exactly:
`docs/research/canonical-entity-intelligence/`, `data/research/canonical-entities/`, and this
file. Never touches `docs/research/counseling-intelligence/`, application code, schema, or
migrations. No production Supabase writes at any point — every database access was a read-only
`execute_sql` `SELECT` against `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`).

This file is updated as work lands, not chronologically archived — read top-to-bottom for current
state, matching the convention `docs/handoffs/claude-a-university-spine.md` already established.

## Current state (updated 2026-08-21 ~02:05 Europe/Istanbul)

**Core package complete and pushed**, `oryn/counseling-intelligence-research` @ `28457c0`:

- `docs/research/canonical-entity-intelligence/00-overview.md` through `11-implementation-handoff.md`
  — 12 documents, ~2,500 lines total. Full index and reading order in `00-overview.md`.
- `data/research/canonical-entities/*.json` — 6 files (rules, sources, duplicate candidates,
  opportunity-organizer candidates, alias-taxonomy examples, relationship-taxonomy mapping), all
  JSON-parse-validated before commit.
- Commit history on this branch (my own commits only, narrow `git add` throughout since this is a
  shared working tree with at least one other concurrent session):
  `7b0202b` (scaffold) → `5aa1968` (01-04) → `737defd` (05-06) → `e2e722e` (07) → `4e3ea25` (08-09)
  → `aa70463` (data companions) → `28457c0` (10-11).

## The three highest-value findings, if you read nothing else

1. **P0 — Turkish dotless-ı (U+0131) normalization is broken in `lib/acquisition/normalize.ts`,
   live, right now**, not just historically. `dbNormalizedName()` doesn't fold it the way
   Postgres's own `unaccent()` does; `nameKey()` actively deletes/splits on it. Confirmed 26/26
   sampled Turkish-script `canonical_entities` rows already have a stored `normalized_name` that
   disagrees with the database's own convention — `canonical_entities_identity_uq` is not actually
   protecting against duplicate inserts for these institutions today. Full detail: `07`, `09`
   Finding 1, `11` item 1-3.
2. **P1 — The 43-item Phase 6 duplicate-audit backlog (migration 0039, open since) is mechanically
   solvable.** All 41 live university-type pairs (re-verified fresh this session) are exactly one
   "complete" row (ROR + a `universities` row, created `2026-08-16T21:42:51Z`) paired against one
   "orphan" row (no external ids, no `universities` row, created `2026-08-16T23:29:46Z`, 1h47m
   later). Re-running the existing ROR-enrichment pipeline against the 41 orphan ids
   (`data/research/canonical-entities/duplicate-candidates-university.json` has them) is expected
   to resolve most of the backlog with zero new classifier logic. `05`, `09` Finding 2, `11` item 4.
3. **`entity_relationships` (9 rows) and `opportunities.organization_entity_id` (0/369) are both
   almost entirely white space** — not wrong, just barely started outside the Turkish-schools
   effort. `03` and `08` build real, evidence-grounded frameworks for both from live data (the
   Bilkent/MEF/İSTEK/Terakki relationship rows; the University of Pennsylvania/Wharton six-way
   opportunity-organizer granularity cluster; the METU/Arber-Kongre-A.Ş./Radyo-ODTÜ cycle-operator
   case).

## Coordination notes

- Sent a clarifying message to the peer session that authored the counseling-intelligence
  collision warning (`uds:/tmp/cc-socks/70081.sock`) confirming this mission is a separate,
  non-colliding effort — no response needed, informational only.
- `ListAgents` showed 7 concurrent peer sessions at the time this was checked (~01:35). This
  branch/working directory is shared by at minimum 2 (this mission + counseling-intelligence);
  the other ~5 are on different branches/worktrees per this repo's established parallel-lane
  pattern (see `[[project-oryn-parallel-sessions]]` in this founder's cross-session memory).
- Every commit this session used a narrow, explicit `git add <path>` (never `-A`/`.`) and was
  preceded by `git fetch` + a divergence check. No conflicts encountered. If resuming this work in
  a fresh session, keep the same discipline — the working tree is still shared.

## What's next (continuing past the core package)

Per the mission brief's "continue until 11:00" instruction, now working on, in roughly this order:

1. Extending normalization testing to French/German/Dutch/Italian scripts (cheap, no web access
   needed, direct extension of `07`'s method) — done directly, not delegated.
2. Two background research agents launched (see their task descriptions for exact scope):
   - Same-name-different-institution "trap" research across US/UK/Europe/Turkey, sourced.
   - Opportunity-organizer official-URL research for the remaining single-occurrence organizers.
3. Continued live-DB audit passes (alias-vs-canonical-name cross-matching, per `05`'s stated gap
   in exact-match-only candidate finding).

This section will be updated again before the 11:00 cutoff with final status and exact
resumption instructions if anything is left mid-flight.

## If you are resuming this session cold

Read `00-overview.md` first (method, scope, non-duplication rationale), then `11` for the
actionable handoff, then whichever of `01`-`10` your task touches. The machine-readable JSON in
`data/research/canonical-entities/` is meant to be consumed directly, not re-derived — especially
`duplicate-candidates-university.json`, which already has the exact 41 ids needed for the P1
enrichment pass.
