# Handoff: Canonical Entity Intelligence Research — live session state

Research-only overnight mission, distinct from the concurrent `research-counseling-intelligence.md`
session sharing this branch/working directory. Owns exactly:
`docs/research/canonical-entity-intelligence/`, `data/research/canonical-entities/`, and this
file. Never touches `docs/research/counseling-intelligence/`, application code, schema, or
migrations. No production Supabase writes at any point — every database access was a read-only
`execute_sql` `SELECT` against `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`).

This file is updated as work lands, not chronologically archived — read top-to-bottom for current
state, matching the convention `docs/handoffs/claude-a-university-spine.md` already established.

## Current state (updated 2026-08-21 ~02:34 Europe/Istanbul)

**Package: 16 documents (00–15) + 10 JSON data files**, all committed and pushed to
`oryn/counseling-intelligence-research` @ `1ab9118`. Full index in `00-overview.md`.

Two background research agents were dispatched mid-session, same evidence standard as the lead
session; agent 1 (institution collision traps → doc `12`) completed and is reviewed/integrated.
Agent 2 (opportunity-organizer research batch 2 → doc `13`) still running as of this update.

Commit history (this session's own commits only — narrow `git add` throughout, since this is a
shared working tree with at least one other concurrent session, confirmed still active): scaffold
→ 01-04 → 05-06 → 07 → 08-09 → data companions → 10-11 → normalization/German-ß extension →
14 (trigram method) → Finding 7 (ROR gaps) → Finding 8 (cross-lane observation) → 15 (country/city
gap) → 12 (agent 1, reviewed + integrated). Every push was preceded by `git fetch` +
divergence check; zero conflicts across ~14 pushes.

## The highest-value findings, if you read nothing else

1. **P0 — Turkish dotless-ı (U+0131) *and* German ß normalization are both broken in
   `lib/acquisition/normalize.ts`, live, right now** — not historical, and not Turkish-specific.
   `dbNormalizedName()` doesn't fold either the way Postgres's own `unaccent()` does (confirmed
   directly: `unaccent('Kırıkkale')='Kirikkale'`, `unaccent('Weißensee')='Weissensee'`);
   `nameKey()` actively deletes/splits words on both. Confirmed 26/26 sampled Turkish-script
   `canonical_entities` rows already have a stored `normalized_name` that disagrees with the
   database's own convention — `canonical_entities_identity_uq` is not actually protecting
   against duplicate inserts for these institutions today. No live ß example exists yet (defensive
   finding). `07`, `09` Findings 1 & 6, `11` items 1-3.
2. **P1 — The Phase 6 duplicate-audit backlog (migration 0039, open since) is mechanically
   solvable.** All 41 live university-type pairs are exactly one "complete" row (ROR + a
   `universities` row, created `2026-08-16T21:42:51Z`) paired against one "orphan" row (no
   external ids, no `universities` row, created `2026-08-16T23:29:46Z`, 1h47m later).
   `duplicate-candidates-university.json` has the exact ids. `05`, `09` Finding 2, `11` item 4.
3. **A different, complementary ROR gap: 70 active university entities have no ROR at all**,
   including MIT, UCL, and LSE — which turn out to belong to the *original* known "two
   `universities` rows, one `canonical_entities` row" duplicate-supersession set (a pre-pipeline
   pilot batch, `created_at` even earlier than the pairs above), not a new problem. `university-
   ror-gaps.json`. `09` Finding 7, `11` item 4.
4. **`entity_type='country'`/`'city'` have zero rows despite six schema-enforced, `canonical_
   required` FK columns needing them.** The underlying free-text `country` data is already clean
   (checked directly) — this is a pure infrastructure gap. Argues country is the one entity type
   where bulk pre-population (from ISO 3166-1) is actually correct, unlike everything else in this
   registry. `15`, `10` item 1b, `11` item 6.
5. **`entity_relationships` (9 rows) and `opportunities.organization_entity_id` (0/369) are both
   almost entirely white space.** `03`/`08` build real frameworks from live data (Bilkent/MEF/
   İSTEK/Terakki; the Wharton six-way opportunity-organizer cluster; the METU/Arber-Kongre-A.Ş./
   Radyo-ODTÜ cycle-operator case). `12` (agent 1) adds 3 concrete, sourced, ready-to-populate
   `entity_relationships` candidates using types that already exist (Charité/AUC as two-parent
   `part_of` cases, King's/UCL/LSE `member_of` University of London) plus a genuine new
   relationship-type gap (`split_from`, from İstanbul University's 2018 split). `10` item 3b.

## Coordination notes

- Sent a clarifying message early in the session to the peer session that authored a
  counseling-intelligence collision warning (`uds:/tmp/cc-socks/70081.sock`) confirming this
  mission is a separate, non-colliding effort — no response needed, informational only.
- `ListAgents` showed 7 concurrent peer sessions when checked (~01:35). This branch/working
  directory is shared by at minimum 2 (this mission + counseling-intelligence, confirmed still
  active via ongoing file changes visible in `git status` throughout this session); the other ~5
  are presumably on different branches/worktrees per this repo's established parallel-lane pattern.
- Every commit this session used a narrow, explicit `git add <path>` (never `-A`/`.`) and was
  preceded by `git fetch` + a divergence check. Zero conflicts across ~14 pushes. If resuming this
  work in a fresh session, keep the same discipline — the working tree is still shared and active.
- Two of this session's own background agents (general-purpose, `run_in_background: true`) were
  dispatched with explicit instructions not to run git commands themselves — the lead session
  reviews and commits their output after reading it in full, not blindly.

## What's next (continuing past the core package, per the mission's "continue until 11:00")

1. Waiting for agent 2 (opportunity-organizer batch 2, doc `13` + JSON) to complete, then review
   and integrate the same way agent 1's output was handled.
2. Continuing direct live-DB research: alias-vs-canonical cross-matching and `pg_trgm`
   similarity-based discovery are both done (`14`); considering `entity_evidence`/`entity_
   locations` table population next (not yet checked), and whether more of the 171 opportunity
   organizer strings warrant individual research beyond what agent 2 covers.
3. Periodic re-reads of the whole package for internal consistency as it grows — last full
   consistency pass was after integrating agent 1's output.

This section will be updated again as agent 2 lands and again before the 11:00 cutoff with final
status.

## If you are resuming this session cold

Read `00-overview.md` first (method, scope, non-duplication rationale, full document index), then
`11` for the actionable handoff, then whichever of `01`-`15` your task touches. The
machine-readable JSON in `data/research/canonical-entities/` is meant to be consumed directly, not
re-derived — especially `duplicate-candidates-university.json` and `university-ror-gaps.json`
(ready-to-enrich id lists) and `institution-collision-traps.json` (ROR ids for 40+ verified
institutions across 15 collision-trap cases).
