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

## Current state (updated 2026-08-21 ~05:25 Europe/Istanbul)

**Latest work**: acted on `09` Finding 9 / `10` item 11 rather than leaving it diagnosed-only —
real, ROR-sourced alias research for all 13 Dutch universities (full 0/13 gap closed) and a
priority 12 of 38 Italian universities, confirming the two specific forms Finding 9 named as
likely missing ("La Sapienza," "Milan Polytechnic") are real, plus a few explicit collision
cautions for whoever eventually writes these (e.g. "UM" for Maastricht would be a third live
claimant on an already-collision-prone abbreviation). `italy-netherlands-alias-research.json`.



**Latest work**: forward-looking relationship research (a ROR-verified `campus_of`/`member_of`
candidate — University of Nottingham's Malaysia/Ningbo China campuses, genuinely undetermined
between the two pending an admissions-independence check; live verification that 3 of the 5
previously-proposed `entity_relationships` candidates in `10` need a *new* entity created first,
not just an id lookup — Charité, Amsterdam University College, and "University of London" itself
none exist as rows yet, though all parent/subject-side ids are ready), then a dedicated
consistency-audit background agent (independently re-reading all 18 docs + 12 JSON companions for
cross-reference drift, after this session caught one such drift by hand — a stale `successor_of`
reference in `10`). The agent found seven more confirmed issues, all independently verified
before fixing, none taken on trust: the 41→43 correction hadn't propagated to three JSON files;
`university-ror-gaps.json`'s single-row-gap list had 18 entries for 16 real institutions (two
duplicated); `institution-collision-traps.json`'s raw entry count (17) didn't match the doc's
"Sixteen cases" without a note explaining why; `09` Finding 8 said "9 institutions" against its
own 10-name list (confirmed live against `program_research_queue` directly — genuinely 10, not a
typo); `14` said "19 candidate pairs" against 18 actual, and while fixing it a real editorial gap
came with it (a second already-resolved non-duplicate pair, MEF Izmir/Istanbul, present in the
JSON but never discussed in the doc's prose); plus two smaller arithmetic slips (`05`: 43+70=113,
not 111; `08`: seven Penn/Wharton organizer strings, not six) and a duplicate item number in `11`.
All fixed and verified, not just reported.

**Package: 18 documents (00–17, including 12–13 from two background research agents) + 12 JSON
data files.** Every mission-brief deliverable (entity identity framework, alias taxonomy,
parent/campus model, rename/history framework, duplicate-detection rules, unsafe auto-merge
rules, normalization guidance, machine-readable candidates, live ambiguity audit, prioritized
review queue, implementation handoff) is complete, cross-referenced, and — where the mission's
own "continue until 11:00" list asked for it — extended well past the minimum: two background
research agents' work fully reviewed and integrated (not appended), this package's own top
recommendation externally verified against ROR's live API for 25+ real institutions, and (new
this update) a second, previously-missed production resolution system fully read and its actual
code run live against the registry.

**New since the last update: `17-canonical-entity-autocomplete-system.md`.** Reading
`scripts/entities-audit.ts`/`scripts/entities-backfill-report.ts` in full (not just their
headers, which is where the previous update stopped) led into `lib/entities/*` — a second,
general-purpose (all 14 entity types, not just universities), already-in-production resolution
architecture this package had not examined at all: `field-policy.ts` (`ENTITY_SCOPES` — the
authoritative list of which entity types each student-facing field accepts, and that only 6 of
14 types are ever student-creatable), `normalize.ts` (a *second* normalizer, separate from
`lib/acquisition/normalize.ts`, with a different bug profile — Turkish `ı` already fixed there,
German `ß` still broken, confirmed by fresh tests), `rank.ts`/`audit.ts`/`backfill.ts`/
`resolve.ts`/`search.ts`. Ran the actual `lib/entities/audit.ts` functions (not a
reimplementation) against a live snapshot (1172 entities, 445 aliases) and found: a real,
precise tool gap (its duplicate-detection functions don't filter `merged`/`inactive` rows,
contaminating its own SAFE_EXACT_LINK output 24/24); that the registry's `official_verified`
trust tier is currently 100% evidence-backed registry-wide (checked completely); and a
POSSIBLE_DUPLICATE-bucket calibration (301 raw findings, ~91% likely false-positive per a
30-pair spot-check) worth knowing before anyone treats that count as a backlog size. One spot-
check pair (University of Maryland, Baltimore vs. Baltimore County) turned into a fourth,
ROR-verified new case for `12`.

**A self-caught correction, worth flagging explicitly for whoever reads `17` next**: a first
draft of `17` presented nine duplicate pairs found via this new tool (UCLA, Berkeley, UCSD,
UCSB, NYU, Caltech, and three Asia-Pacific universities) as a new discovery. Before finalizing,
checking their entity ids against `duplicate-candidates-university.json` found all 18 already
present there — they are nine of `09` Finding 2's already-documented 43/43 pairs, independently
rediscovered via a different method, not new. Corrected in place in `17` §5 (kept in, not
silently rewritten) and in the JSON companion — see there for what genuinely is new (cross-
validation, a fuller external-id picture, a code-traced product-risk detail, and which specific
famous institutions are in the set). The three "UP"/"UM"/"UPM" abbreviation-collision pairs in
the same section were likewise already `02`/`06`'s worked examples, not new. This is the same
verify-before-claiming discipline the rest of this package tries to model, applied here against
this session's *own* earlier work rather than only against the codebase.

## The complete list of major findings

1. **P0 — Turkish `ı` and German `ß` normalization are both broken in `lib/acquisition/
   normalize.ts`, live.** `07`, `09` Findings 1 & 6.
2. **P1 — 43 live duplicate-pair universities, mechanically solvable but not risk-free.**
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
7. **`scripts/university-duplicates-audit.ts` already exists, already ran, already hand-verified
   ROR ids for 9 already-merged pairs this package had been treating as needing fresh research
   (8, until a later correction — see item 9 below).** Found by finally reading `package.json`'s
   full script list, not at the start of the duplicate-detection work — `05`'s dedicated section,
   `09` Finding 6, `university-ror-gaps.json`'s `ror_id_already_known` fields. The lesson (check
   for existing automation before recommending a fresh approach) repeated itself almost exactly
   with finding 8 below, and yet again with finding 9.
8. **A second, general-purpose (all 14 entity types) production resolution system,
   `lib/entities/*`, existed the whole session and was found only by reading two scripts' full
   bodies instead of their headers.** `17`. Its live audit tool has one small precise gap (no
   `merged`/`inactive` filter); the registry's strictest trust tier is currently fully evidence-
   backed; and this package caught and corrected its own attempt to re-claim nine already-known
   duplicate pairs as new, in the same document, before it was finalized.
9. **`docs/founder-blocked-backlog.md` — the repo's own canonical, founder-maintained tracking
   document — existed the whole session and was never read until very late.** Reading it (plus
   the 2,700-line `docs/handoffs/claude-a-university-spine.md` it points to) triggered three
   corrections this package now carries: the "41 pairs" figure throughout `01`/`05`/`06`/`07`/
   `09`/`10`/`11` is corrected to **43** (three-ways-confirmed: `founder-blocked-backlog.md` item
   19, `claude-a-university-spine.md` Phase 2, and a fresh direct re-count this session); this
   package's own "8 already-known duplicate-supersession" list was short one institution
   (**Al-Farabi Kazakh National University**, always in `scripts/university-duplicates-audit.ts`'s
   `MANUALLY_VERIFIED` list but never extracted into this package's own files until now — the true
   count is 9, though Al-Farabi's own ROR id is already written, unlike the other 8's); and a
   cohort this package briefly worried it had entirely missed (item 19's "28 more pairs," found by
   a name-variant matching technique this package never itself applied) turned out to already be
   fully resolved by the prior session (2026-08-18) — a relief, not a gap. `09` Finding 2 carries
   the full account. Same lesson as findings 7 and 8, now landed a third time: **read the
   founder-blocked-backlog and any directly-referenced prior-session handoff before trusting a
   research package's own from-scratch count of anything the repo has already investigated.**
10. **Migration `0043_university_duplicate_supersession.sql` is no longer blocked — it is applied
    and correctly backfilled, verified live at the end of this session.** `docs/
    ORYN_WORKSTREAMS.md` (a live cross-session coordination file, also not read until very late)
    recorded a concurrent session's 2026-08-20 finding that the DDL had been applied (data
    backfill still pending at that check). This session verified directly, not trusted: both
    `universities.duplicate_status`/`superseded_by_id` exist, and the backfill has since run too
    — exactly the 9 known pairs, every id matching what this package already had, checked row by
    row. The "identity resolved, row layer still blocked" framing this package repeated
    throughout (from `founder-blocked-backlog.md` item 25, accurate as of 2026-08-17) is now
    stale — all three layers (identity/schema/data) are resolved for these 9. `09` carries the
    full, clearly-dated update note. Also read late: `docs/entity-canonicalization-audit.md` (the
    original design/build document for the entire `lib/entities/*` system `17` is about — cited
    there for provenance) and `docs/live-db-reconciliation.md` (the actual founding account of
    why `canonical_entities` was chosen over an earlier competing `institutions` design — traces
    the 43-pair finding back one hop further than `founder-blocked-backlog.md`, to its true
    original discovery). **Six documents this package should have read at the very start, found
    only by finally listing `docs/*.md` in full this late in the session**: `founder-blocked-
    backlog.md`, `claude-a-university-spine.md`, `live-db-reconciliation.md`, `entity-
    canonicalization-audit.md`, `ORYN_WORKSTREAMS.md`, and `research-handoff-opportunities.md`
    (confirmed non-contradictory — describes a not-yet-built future ingestion path for
    `opportunities.organization_entity_id`, still genuinely 0% wired in current code, checked
    directly). This is the single clearest process lesson of the entire session, recurring across
    six independent instances: **before researching what a codebase's registry contains, list and
    read what the codebase's own prior sessions already wrote down about it.**

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

## Update (2026-08-21 ~04:45): a mechanical fix to the package's own top recommendation

Continuing to read `claude-a-university-spine.md` past its Phase 2 section (Phases 5/7/8/9)
found one more correction worth its own note: `05`/`10`/`11`'s top P1 recommendation ("run
existing ROR enrichment targeted at the 43 orphan rows") was not actually executable as literally
stated. Reading `scripts/acquire-university-facts.ts` directly: `--from-db` builds its roster
from the `universities` table, and every orphan side of the 43 pairs has zero `universities` rows
by construction — the pipeline structurally cannot reach them. `claude-a-university-spine.md`
Phase 7 independently confirms this (an already-completed full-spine `--from-db` pass left 203
rows unresolved, a population that doesn't include these 43 orphans, since they were never in its
input). Corrected: no new ROR research is needed for these 43 pairs at all — each orphan's
sibling already carries a verified ROR id, which is the confirmation; the actual unlock is a
direct `merge_canonical_entities()` call per pair. `05`/`10`/`11` all updated. Also upgraded a
"presumably" hedge in `17` to a confirmed citation (Phase 8 documents the `official_verified`
downgrade directly) and cross-validated `17`'s live `entities-audit.ts` run against Phase 8's own
independent fix of the same script's pagination bug (231→296 POSSIBLE_DUPLICATE findings once
fixed — this session's own 301, against a larger current registry, is consistent, not a new gap).

Remaining unread: `claude-a-university-spine.md`'s Phases 10-11 (University Explorer P0/UX
package) and whatever follows past line ~1022 of 2763 — skimmed the table of contents, these
read as UI/product work outside this package's canonical-entity-identity scope, not queued for a
full read unless a specific reason to expect identity-relevant content emerges.

## What's next

~6h10m remain until the 11:00 cutoff as of this update. The package comprehensively covers every
mission-brief category with real, externally-verified evidence, well past the "first package"
threshold, now also covers a second production system this session did not know existed until
partway through, and has been checked against every founder/prior-session document this session
could find (`docs/*.md` listed and triaged in full) rather than only against the codebase.

**Resolved since the last update**: the non-university POSSIBLE_DUPLICATE question — ran
`lib/entities/audit.ts`'s full logic against all 80 non-university entities (complete, not
sampled): one correctly-not-merged same-name-different-city school pair, 21 cosmetic
`INVALID` redundant-alias rows, zero real duplicate-identity findings. `09`'s "checked and found
clean" bullet carries the detail. `scripts/entities-backfill-report.ts` remains read-but-not-run
(still correct to skip — its 9 source tables are still confirmed empty, checked again this
session via the same live queries used throughout).

**Not yet done, lowest-remaining-priority candidates if continuing**: a full sequential read of
`claude-a-university-spine.md`'s Phases 10-11 (University Explorer P0/UX package, ~1700 lines) —
skimmed as UI/product work outside this package's scope, not expected to contain identity
findings, but not verified by reading; and whichever of `docs/current-state.md`/`docs/
MASTER-EXECUTION-STRATEGY.md`/`docs/product-decisions.md` this session has still not opened (only
`ORYN_WORKSTREAMS.md` was read in full, per its own pointer to those three as the other
canonical status documents) — worth a quick check for any further entity-identity-relevant status
this package hasn't yet surfaced, though diminishing-returns territory after six independent
document-discovery corrections already landed this session. Favor genuinely new verified threads
over restating what already exists, per the mission's own "continue until 11:00" instruction.

## Coordination and self-correction notes

- Confirmed early this session that this mission is separate from the concurrent counseling-
  intelligence session sharing this branch/working directory (informational message sent, no
  response needed). Shared working tree confirmed active throughout — every commit used a
  narrow, explicit `git add <path>` (never `-A`/`.`) preceded by `git fetch` + divergence check.
- This session has now caught and transparently corrected several of its own errors before they
  could mislead a reader, rather than silently fixing them: an arithmetic miscount in the
  country-value accounting (88→90 total); a premature reading of a German-university duplicate
  pattern a second query showed was already resolved (`09` Finding 6); a `rules.json`/`06` prose
  drift (23 rules vs. 18 documented, backfilled and cross-checked both directions); and, most
  recently, `17` §5's in-document correction of nine duplicate pairs it briefly and incorrectly
  presented as new before checking them against this session's own earlier `09` Finding 2. The
  pattern is consistent: verify before claiming, including against this session's own prior
  output, not only against the codebase — and when a correction is needed, show it rather than
  erase the evidence of the mistake.

## If you are resuming this session cold

Read `00-overview.md` first (method, scope, non-duplication rationale, full document index), then
`11` for the actionable handoff, then whichever of `01`-`17` your task touches. `17` specifically
corrects part of `07`'s framing (two separate normalizer functions with different bug profiles,
not one) and adds precision to `09` Finding 2 (nine of its pairs independently cross-validated,
named specifically) — read it alongside those two rather than treating it as fully standalone.
Before running the P1 ROR-enrichment recommendation specifically, read `05`'s full "Verifying the
recommendation itself" section and check every `WARNING_verified_live_against_ror_api` field in
`duplicate-candidates-university.json` and `university-ror-gaps.json` — both files now carry a
complete (not sampled) verification record for every entity they list.
