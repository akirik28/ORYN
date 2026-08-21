# Handoff: Canonical Entity Intelligence Research — live session state

Research-only overnight mission, distinct from the concurrent `research-counseling-intelligence.md`
session sharing this branch/working directory. Owns exactly:
`docs/research/canonical-entity-intelligence/`, `data/research/canonical-entities/`, and this
file. Never touches `docs/research/counseling-intelligence/`, application code, schema, or
migrations. No production Supabase writes at any point — every database access was a read-only
`execute_sql` `SELECT` against `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`).

This file is updated as work lands, not chronologically archived — read top-to-bottom for current
state, matching the convention `docs/handoffs/claude-a-university-spine.md` already established.

## Current state (updated 2026-08-21 ~03:06 Europe/Istanbul) — major milestone, plus external verification pass

**Package: 18 documents (00–15, including 12–13 from two background research agents) + 12 JSON
data files, 27 commits.** Both dispatched background agents have completed, been reviewed in full,
and been integrated (not just appended) — cross-references, corrections, and new rules flow both
directions between the lead session's own work and the agents' findings. Beyond that: this
package's own top recommendation (re-run ROR enrichment) was tested against ROR's live API for 9
real candidates, not assumed risk-free — found 4 genuine pitfalls (Purdue's system-vs-campus ROR
split, Rutgers' one-entity-for-two-ORYN-rows conflict, and two live 2024/2025 French university
mergers ROR already reflects and ORYN doesn't) and 5 clean confirmations, giving `10`/`11`'s P1
item real, externally-grounded confidence rather than a theoretical one. Full index in
`00-overview.md`. All committed and pushed to `oryn/counseling-intelligence-research` @ `673fba7`.

## The highest-value findings, if you read nothing else

1. **P0 — Turkish dotless-ı (U+0131) *and* German ß normalization are both broken in
   `lib/acquisition/normalize.ts`, live, right now.** `dbNormalizedName()` doesn't fold either the
   way Postgres's own `unaccent()` does (verified directly); `nameKey()` deletes/splits words on
   both. 26/26 sampled Turkish-script `canonical_entities` rows already have a stored
   `normalized_name` that disagrees with the database's own convention. `07`, `09` Findings 1 & 6,
   `11` items 1-3.
2. **P1 — The Phase 6 duplicate-audit backlog (41 live pairs) is mechanically solvable, but not
   risk-free — verified against ROR's live API, not just assumed.** Every pair is one "complete"
   row (ROR-enriched) against one "orphan" row from an earlier, less-complete import batch.
   Testing the recommended fix (re-run ROR enrichment) against two real candidates found two
   concrete pitfalls: **Purdue** needs the campus-specific ROR child
   (`ror.org/02dqehb95`), not the system-level parent a naive search returns first
   (`ror.org/05p8z3f47`); **Rutgers** has only one ROR entity for the whole university, so
   enriching both ORYN rows (New Brunswick, Newark) with it would violate a live uniqueness
   constraint. `05` "Verifying the recommendation itself," `RULE-ENTITY-023`.
3. **All 171 distinct `opportunities.organization` strings now have a researched candidate**,
   combining `08`'s worked clusters with `13`'s 147-string follow-on pass (118 high confidence, 28
   medium, 1 low, 0 unresolved). `13` also caught a real correction to `08`'s own earlier
   candidates: `opportunities.organization_entity_id`'s trigger rejects
   `program`/`competition`/`scholarship` types, so PennApps/MIT Battlecode must be linked via
   their parent university, never themselves (`RULE-ENTITY-021`). 11 joint-organizer cases now
   documented across 3 distinguishable shapes, up from `08`'s original 4.
4. **`entity_type='country'`/`'city'` have zero rows despite six schema-enforced,
   `canonical_required` FK columns needing them** — the largest, cleanest infrastructure gap
   found. Country is the one entity type where bulk pre-population (ISO 3166-1) is actually
   correct, unlike everything else in this registry. `15`, `RULE-ENTITY-020`.
5. **15 sourced institution name-collision traps** across US/UK/France/Germany/Netherlands/
   Switzerland/Turkey (agent 1, `12`) — the sharpest is the 4-way Sorbonne cluster, where even
   city-scoping doesn't disambiguate. Found a genuine new relationship-type gap (`split_from`,
   from İstanbul University's 2018 split) and 3 concrete, sourced, ready-to-populate
   `entity_relationships` candidates using types that already exist.
6. **`entity_relationships` (9 rows) is real, careful work, not neglect** — reading the live rows
   directly (Bilkent/MEF/İSTEK/Terakki) plus the 3 live `entity_locations` rows (BISI's two
   campuses) shows the Turkish-schools research effort correctly distinguishing "one entity,
   multiple sites" from "multiple entities, one relationship" throughout. `03`'s addendum.

## Coordination notes

- Sent a clarifying message early in the session to a peer session that raised a counseling-
  intelligence collision warning (`uds:/tmp/cc-socks/70081.sock`) — confirmed this mission is
  separate and non-colliding. No response needed.
- Shared working directory with at least the counseling-intelligence session throughout (confirmed
  via ongoing file changes visible in `git status` across the whole session). Every commit used a
  narrow, explicit `git add <path>` (never `-A`/`.`) preceded by `git fetch` + a divergence check —
  zero conflicts across 22 pushes.
- Two background agents (general-purpose, `run_in_background: true`) were dispatched with explicit
  instructions not to run git commands themselves. Both were read in full and reviewed for quality
  before integration — not trusted blindly. Both delivered genuinely high-quality, well-sourced
  work; agent 2 in particular caught a real correction to the lead session's own earlier output.

## What's next (continuing past this milestone, per the mission's "continue until 11:00")

The package now comprehensively covers every category in the mission brief with real, verified
evidence. Remaining time will continue in this pattern: periodic additional direct research
(favoring genuine external verification, like the ROR API check above, over more DB-only mining
where returns are diminishing), light ongoing consistency maintenance, and a final wrap-up pass
before 11:00. Not planning further background agent dispatches unless a clearly-scoped,
non-duplicative need presents itself — the two already run covered the highest-value delegable
work well.

## If you are resuming this session cold

Read `00-overview.md` first (method, scope, non-duplication rationale, full document index), then
`11` for the actionable handoff, then whichever of `01`-`15` your task touches. The
machine-readable JSON in `data/research/canonical-entities/` is meant to be consumed directly, not
re-derived. Before running the P1 ROR-enrichment recommendation, read `05`'s "Verifying the
recommendation itself" section and check every `WARNING_verified_live_against_ror_api` field in
`duplicate-candidates-university.json`/`university-ror-gaps.json` — two of the ~111 candidate
entities have a confirmed pitfall, and the same "registry granularity doesn't match ORYN's" shape
may affect others not individually checked.
