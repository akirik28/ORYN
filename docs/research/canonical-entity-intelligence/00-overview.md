# Canonical Entity Intelligence Research — Overview

**Status:** overnight research package, single session, started 2026-08-21 ~01:26 Europe/Istanbul,
timeboxed to 11:00 the same morning. Same branch and working tree as a second, concurrent
overnight session (`docs/research/counseling-intelligence/`) — the two packages are disjoint by
design (different directories, different subject matter) and neither touches the other's files.
See `docs/handoffs/research-canonical-entity-intelligence.md` for exact session-resumption state.

## What this package is

This is a **research and normalization-intelligence layer**, not a feature and not a schema
change. It answers the question ORYN's entity graph needs answered underneath its code: *when do
two records — a university, a school, an organization, an opportunity provider, an academic
program — name the same real-world thing, when are they genuinely different, and how do we know
that without ever guessing?*

It contains **no application code changes, no schema changes, no migrations, no production
Supabase writes.** Every database access this session made was read-only (`execute_sql` with
`SELECT` statements only, via the Supabase MCP against the `oryn-qa-scratch` project). It is
designed to be read by the session(s) that own the canonical-entity implementation — primarily
`oryn/university-intelligence-spine` ("Claude A") — and used as sourced evidence for entity-graph
decisions that session is already positioned to execute (via `merge_canonical_entities()`,
`entity_verification_queue`, and the acquisition pipeline), not to replace that architecture.

## Why this is a distinct, non-duplicative contribution

Before writing anything, this session read `supabase/migrations/0038_canonical_entity_registry.sql`
and `0039_canonical_registry_reconciliation.sql` in full, plus `lib/acquisition/identity.ts`,
`duplicates.ts`, `normalize.ts`, `source-authority.ts`, `precedence.ts`, `verification.ts`, and
`lib/universities/canonical.ts`/`alias-search.ts`. It also queried the live `oryn-qa-scratch`
database directly rather than trusting any prior session's report. **Found much later in this
session, and worth citing here as the authoritative original source for the paragraph below**:
`docs/live-db-reconciliation.md` (2026-08-17) is the actual founding account of this
architecture — the live registry was built directly against the project (via MCP/Studio, never
committed) before an earlier competing design, `0038_canonical_institutions.sql`
(`institutions` + `category` enum + `aliases text[]`), was formally rejected in favor of it; that
document's own requirement-by-requirement comparison table is more complete than this package's
independent re-derivation of the same conclusion below. Read it directly for the full account,
including the original discovery of the 43 duplicate pairs (`09` Finding 2's subject, first
found there, not by this package) and the original "UCLA search returned University College
London" bug (fixed the same session, before this package's research began).

**What already exists is substantial and should not be re-derived or contradicted:**

- One polymorphic registry, `canonical_entities`, keyed by `entity_type` (`school`, `university`,
  `employer`, `organization`, `research_institution`, `lab`, `ngo`, `club`, `opportunity_provider`,
  `program`, `competition`, `scholarship`, `sports_team`, `country`, `city`) — not a table per
  entity kind.
- `entity_aliases` (one row per alias, typed `official` / `common` / `abbreviation` / `legacy` /
  `translation` / `user_submitted`), `entity_external_ids` (registry IDs — ROR, Wikidata, GRID,
  ISNI, CrossRef Funder, IB school code, MEB institution code — all currently populated),
  `entity_relationships` (typed `part_of` / `operated_by` / `campus_of` / `school_of` /
  `provider_for` / `member_of` / `successor_of` / `predecessor_of` / `related_brand`),
  `entity_evidence`, `entity_verification_queue`, `canonical_entity_merges` — a real, working
  identity/alias/relationship/evidence/merge-audit architecture, not a prototype.
- `resolveIdentity()` (`lib/acquisition/identity.ts`): external id, then exact name within
  country, then name variant within country, then registered alias within country — every tier
  refuses to guess and reports `unresolved` on any ambiguity. This is the safe pattern this
  package's own identity framework (`01`) generalizes rather than re-invents.
- `classifyDuplicateCandidate()` (`lib/acquisition/duplicates.ts`): a four-tier duplicate
  classifier (`SAFE_TO_CANONICALIZE` / `LIKELY_DUPLICATE_REQUIRES_REVIEW` / `NOT_DUPLICATE` /
  `AMBIGUOUS`) that requires agreeing external ids — not name or even *pure Unicode-encoding*
  agreement — to ever reach the safe tier. This package's duplicate-detection document (`05`)
  extends this classifier's logic to entity types it does not yet cover and reports a real,
  live gap it exposed (see `09`).
- `merge_canonical_entities()`: never automatic, requires a human-supplied reason, keeps both
  rows (tombstones the source as `merged`), refuses cross-entity-type merges, and is
  `service_role`-only — no student or ordinary pipeline session can call it.
- A live, working example of exactly this package's subject matter already in production data:
  Turkish IB-school research (visible in `entity_verification_queue` and `entity_relationships`)
  has already modeled real school-group/campus distinctions — MEF Okulları → three separate
  campus schools, İSTEK Okulları → two separate campus schools, Terakki Vakfı Okulları → one
  linked campus with two more still correctly left unresolved pending exact IB-to-school mapping,
  Bilkent University → two affiliated K-12 schools via `school_of`. This is not this package's
  own work — it is evidence this package studied, cited throughout, and built on.

**What is genuinely white space**, confirmed by direct query rather than assumed:

- `entity_relationships` has **9 rows total** against 1,000+ active canonical entities — campus/
  parent/system modeling exists as a mechanism but is almost entirely unpopulated outside the
  Turkish schools work above.
- `opportunities.organization_entity_id` is **0/369 populated** — every opportunity's organizer
  is still a raw, uncanonicalized text string, and duplicate/near-duplicate organizer strings are
  already visible in that text (see `08`).
- `entity_type='school'` is real (59 entities) but is, so far, Turkish IB/MEB schools
  specifically; the general school/school-group/campus taxonomy this package develops in `03` is
  written to generalize beyond that set.
- `entity_type='organization'` (12 rows) and `opportunity_provider` (4 rows) are barely started
  relative to the ~170 distinct organizer strings already sitting in `opportunities.organization`.
- The Phase 6 duplicate audit from migration 0039 queued **43 `possible_duplicate` candidates**
  in `entity_verification_queue` on 2026-08-1x and **none have been resolved** — still `queued`/
  `P1` as of this session. This package re-derived and re-verified that candidate set directly
  against live data and found a specific, actionable, previously-undocumented pattern in it
  (see `09`).

## Documents in this package

| # | Document | Answers |
|---|---|---|
| 00 | `00-overview.md` (this file) | Scope, method, non-duplication rationale |
| 01 | `01-entity-identity-framework.md` | What makes two records "the same entity," generalized across all 14 `entity_type` values |
| 02 | `02-alias-taxonomy.md` | What counts as a safe alias, by type and language, and when an abbreviation is too ambiguous to auto-resolve |
| 03 | `03-parent-campus-relationship-model.md` | How to model systems, campuses, consortia, and affiliated schools without flattening them into one row |
| 04 | `04-rename-history-framework.md` | How a renamed or succeeded institution differs from a duplicate or a mere alias |
| 05 | `05-duplicate-detection-rules.md` | How to find candidate duplicates safely, classify them, and where the existing classifier's blind spot actually is |
| 06 | `06-unsafe-auto-merge-rules.md` | Consolidated `RULE-ENTITY-###` registry — every inference this system must never make |
| 07 | `07-normalization-guidance.md` | Turkish/multilingual/city-string normalization, tested against real, hard examples |
| 08 | `08-opportunity-organizer-canonicalization.md` | The specific, currently-unaddressed problem of canonicalizing 369 opportunities' organizer text |
| 09 | `09-existing-oryn-ambiguity-audit.md` | What direct query of the live registry actually found — evidence, not estimate |
| 10 | `10-prioritized-manual-review-queue.md` | What a human/agent should look at first, in what order, and why |
| 11 | `11-implementation-handoff.md` | Concrete next actions for Claude A / data architecture, in priority order |
| 12 | `12-institution-collision-traps.md` | Sourced, cross-country register of real same-name-different-institution traps (Sorbonne, TU-prefix, American University of X, etc.) |
| 13 | `13-opportunity-organizer-research-batch2.md` | The remaining 147 opportunity organizer strings, all resolved to a sourced official URL and proposed `entity_type` — completes coverage of all 171 distinct strings in `opportunities.organization` across `08`+`13` combined |
| 14 | `14-trigram-similarity-discovery-audit.md` | A new discovery-only candidate-finding method tried against live data, including one candidate researched to a sourced, resolved conclusion |
| 15 | `15-country-city-entity-gap.md` | `entity_type='country'`/`'city'` have zero rows despite six schema-enforced FK columns requiring them — the largest, cleanest gap this session found, and the one case where bulk pre-population is actually the right call |
| 16 | `16-school-brand-license-networks.md` | Forward-looking (no live ORYN data yet): UK independent-school international brand-licensing networks (Harrow, Dulwich), giving `related_brand` its first real, sourced example |
| 17 | `17-canonical-entity-autocomplete-system.md` | A second, more complete resolution architecture (`lib/entities/*`) this package had missed until late in the session — corrects and extends `01`/`07`/`09`/`10`/`11`/`15`, including a live-registry run of its production audit code and a self-caught correction where an apparent new duplicate finding turned out to already be documented in `09` Finding 2 |

Docs 12–13 were produced by two background research agents dispatched partway through this
session with the same evidence standard and non-duplication discipline as 00–11 (see
`docs/handoffs/research-canonical-entity-intelligence.md` for exactly when/how); 14–17 continue
the lead session's own direct-query/direct-research method. All are integrated here, not bolted
on — read them in the same pass as the rest of the package. **17 should be read especially
carefully** — it corrects part of `07`'s framing (two different normalizer functions, not one)
and sharpens `09` Finding 2 with nine specific, named, ready-to-merge pairs.

Machine-readable companions live in `data/research/canonical-entities/`:

- `rules.json` — every `RULE-ENTITY-###` rule, structured, cross-referenced to its source
  document section and its evidence.
- `sources.json` — the source registry backing every non-obvious claim.
- `duplicate-candidates-university.json` — the live-queried university duplicate pairs, full
  evidence, ready for a follow-up ROR-enrichment pass.
- `university-ror-gaps.json` — the complementary 70-entity ROR-gap list from `09` Finding 7
  (8 already-duplicate-flagged, 16 genuine single-row gaps).
- `opportunity-organizer-candidates.json` — proposed canonical-entity/alias/relationship
  candidates derived from real `opportunities.organization` text.
- `alias-taxonomy-examples.json` — worked alias examples across entity types and languages.
- `relationship-taxonomy-mapping.json` — mission-brief relationship vocabulary mapped onto the
  live `entity_relationships.relationship_type` constraint, with gaps called out explicitly.
- `institution-collision-traps.json`, `opportunity-organizer-candidates-batch2.json`,
  `trigram-similarity-candidates.json` — companions to docs 12–14 respectively.
- `live-country-values.json` — every distinct live `country` value (90), checked against ISO
  3166-1, ready to use for the `15` country-entity bootstrap.
- `entities-lib-live-findings.json` — companion to `17`: the nine confirmed duplicate pairs, the
  three real abbreviation-collision pairs, the POSSIBLE_DUPLICATE calibration sample, and the
  verification-state evidence audit, all from running `lib/entities/audit.ts`'s actual code
  against a live registry snapshot.
- `italy-netherlands-alias-research.json` — companion to `09` Finding 9: ROR-sourced
  `translation`/`abbreviation`/`common` alias candidates for all 13 Dutch and 22 of 38
  Italian universities, closing (Netherlands) or substantially narrowing (Italy) the
  thin-alias-coverage gap that Finding originally only diagnosed. Also surfaces two small
  display-name candidates (Roma Tre, University of Bari).

## Method and source standard

Priority order, per the mission brief:

1. Official entity website / official registry (ROR, Wikidata as an index only — never as a
   value, matching `lib/acquisition/source-authority.ts`'s existing exclusion of `wikidata.org`/
   `wikipedia.org` as a fact source).
2. Government / regulator identifiers (MEB institution codes, IB school codes, national
   education-ministry registries).
3. Official accreditation databases and recognized cross-institutional registries (ROR, GRID,
   ISNI, CrossRef Funder).
4. The live ORYN `oryn-qa-scratch` database itself, queried directly and cited by table/query,
   never recalled from a prior session's summary.
5. Secondary discovery sources (news of institutional mergers/renames, aggregator sites) — used
   only to find which official source to go verify, never cited as the evidentiary basis for a
   claim, matching this repo's own `EXCLUDED_DOMAINS` policy.

Every non-trivial claim in this package carries a `confidence` (`high` / `medium` / `low`) and,
where relevant, an explicit `limitations` note. **Unknown is written down as unknown.** Where this
package found a genuinely ambiguous live case, it is recorded as ambiguous — never resolved by
this session, because this session has no write access to production data and, more importantly,
because guessing is exactly the failure mode the mission brief exists to prevent.

## Relationship to the existing schema — the one binding design decision

Every document in this package **reuses the live `canonical_entities` / `entity_aliases` /
`entity_relationships` / `entity_verification_queue` schema as the outer model and never proposes
a competing architecture.** Migration 0038's own header records that an earlier competing design
(`institutions` + `aliases text[]`) was explicitly rejected in favor of exactly this schema — this
package treats that decision as settled. Where research surfaces a distinction the current
`relationship_type` or `alias_type` enums cannot express (for example: no `partner_of` for
co-organizers, no temporal validity window on a relationship), this package documents the gap
precisely — table, constraint, concrete example — as a candidate for a future migration, but never
proposes writing around it with a workaround this session could apply itself. Any place this
package genuinely believes a schema-level change would be justified is flagged explicitly in
`11-implementation-handoff.md`, never implied only in passing.
