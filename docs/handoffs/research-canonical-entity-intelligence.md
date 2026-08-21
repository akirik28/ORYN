# Handoff: Canonical Entity Intelligence Research — live session state

Research-only overnight mission, distinct from the concurrent `research-counseling-intelligence.md`
session sharing this branch/working directory. Owns exactly:
`docs/research/canonical-entity-intelligence/`, `data/research/canonical-entities/`, and this
file. Never touches `docs/research/counseling-intelligence/`, application code, schema, or
migrations. No production Supabase writes at any point — every database access was a read-only
`execute_sql` `SELECT` against `oryn-qa-scratch` (project `qtcvcflzxbuagvvwahhu`); external
verification used ROR's public API (`api.ror.org`) via read-only `curl`/`WebSearch`, nothing else.

This file is updated as work lands, not chronologically archived — read top-to-bottom for current
state, matching the convention `docs/handoffs/claude-a-university-spine.md` already established.

## Current state (updated 2026-08-21 ~03:21 Europe/Istanbul)

**Package: 18 documents (00–16, including 12–13 from two background research agents) + 11 JSON
data files, 32 commits this session.** Every mission-brief deliverable (entity identity framework,
alias taxonomy, parent/campus model, rename/history framework, duplicate-detection rules, unsafe
auto-merge rules, normalization guidance, machine-readable candidates, live ambiguity audit,
prioritized review queue, implementation handoff) is complete, cross-referenced, and — where the
mission's own "continue until 11:00" list asked for it — extended well past the minimum: two
background research agents' work fully reviewed and integrated (not appended), and this package's
own top recommendation externally verified against ROR's live API for 25 real institutions,
catching 6 concrete pitfalls a purely mechanical enrichment pass would have hit.

## The complete list of major findings

1. **P0 — Turkish `ı` and German `ß` normalization are both broken in `lib/acquisition/
   normalize.ts`, live.** `07`, `09` Findings 1 & 6.
2. **P1 — 41 live duplicate-pair universities, mechanically solvable but not risk-free.**
   Externally verified: Purdue needs a campus-specific ROR id, not the system-level one a naive
   search returns; Rutgers has no per-campus ROR entity at all (constraint-violation risk if
   enriched naively); two more "genuine gap" candidates (Université de Franche-Comté, Université
   Paul Sabatier Toulouse III) turned out to be live 2024/2025 French university mergers ROR
   already reflects and ORYN doesn't; University of the Philippines has the same system-vs-campus
   question as Purdue; Khoja Akhmet Yassawi has no ROR record found at all. **10 of the 16
   "genuine single-row gap" candidates and 9 of the other checked candidates are confirmed clean**
   — this is a real, bounded risk profile, not a reason to distrust the recommendation. `05`'s
   "Verifying the recommendation itself" section, `RULE-ENTITY-023`, `university-ror-gaps.json`.
3. **All 171 distinct `opportunities.organization` strings have a researched candidate** (`08`+`13`
   combined). Corrected a real imprecision in this package's own earlier work in the process
   (`RULE-ENTITY-021`).
4. **`entity_type='country'`/`'city'` have zero rows** despite six `canonical_required` FK columns.
   Exact accounting of all 90 live `country` text values against ISO 3166-1: 88 clean, 2 real
   exceptions (`International` — not a country; `Northern Cyprus` — no ISO code exists).
   `15`, `live-country-values.json`.
5. **15 sourced institution collision traps** (agent 1, `12`) plus **a new one found directly**:
   UK independent schools' international brand-licensing networks (Harrow, Dulwich — `16`), giving
   `related_brand` its first real example anywhere.
6. **`entity_relationships`/`entity_locations` are careful, correct, under-populated work**, not
   neglect — confirmed by reading every live row directly (`03` and its addendum).

## Coordination notes

- Confirmed early this session that this mission is separate from the concurrent counseling-
  intelligence session sharing this branch/working directory (informational message sent, no
  response needed).
- Shared working tree confirmed active throughout (ongoing file changes visible in `git status`).
  Every commit used a narrow, explicit `git add <path>` (never `-A`/`.`) preceded by `git fetch` +
  divergence check — zero conflicts across 32 pushes.
- Two background agents dispatched, both completed, both read in full and critically reviewed
  before integration (not trusted blindly) — agent 2 caught a real correction to this session's
  own earlier work, which was fixed transparently rather than quietly.
- This session caught and transparently corrected two of its own errors before they could mislead
  a reader: an arithmetic miscount in the country-value accounting (88→90 total, corrected with an
  explicit note in both the doc and the JSON), and a premature reading of a German-university
  duplicate pattern that a second, more careful query showed was already resolved (`09` Finding 6).
- A full end-to-end re-read of every document (not spot checks) found and fixed one more real
  inconsistency: `rules.json` had grown to 23 rules through incremental edits, but `06`'s prose
  registry (which `rules.json` itself claims as its source document) stopped at 18 — five rules
  existed only as terse JSON with no prose "why." Backfilled. Cross-checked afterward that every
  `RULE-ENTITY-###` referenced anywhere in the package now has exactly one definition in
  `rules.json` and vice versa — clean.

## What's next

The package comprehensively covers every mission-brief category with real, externally-verified
evidence, well past the "first package" threshold. Continuing per the mission's "continue until
11:00" instruction: watching for genuinely new, non-duplicative threads (favoring real external
verification over further DB-only mining, which has diminishing returns at this point) rather than
manufacturing volume. Will do a final comprehensive wrap-up pass — full consistency re-check,
final handoff state — as 11:00 approaches.

## If you are resuming this session cold

Read `00-overview.md` first (method, scope, non-duplication rationale, full document index), then
`11` for the actionable handoff, then whichever of `01`-`16` your task touches. Before running the
P1 ROR-enrichment recommendation specifically, read `05`'s full "Verifying the recommendation
itself" section and check every `WARNING_verified_live_against_ror_api` field in
`duplicate-candidates-university.json` and `university-ror-gaps.json` — both files now carry a
complete (not sampled) verification record for every entity they list.
