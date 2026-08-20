# 11 — Implementation Handoff for Claude A / Data Architecture

Addressed primarily to whoever owns `oryn/university-intelligence-spine` (canonical entity/
identity resolution, `lib/acquisition/*`, the `canonical_entities` family of tables) — this
session had no write access to production/live-write paths and no migration authority, by design
(see `00`). Everything below is a recommendation with evidence attached, not an action taken.

## Code changes (no migration required)

**1. Fix `dbNormalizedName()` in `lib/acquisition/normalize.ts` for Turkish dotless-ı — and German
ß, confirmed to be the identical bug in a second language, not a Turkish-specific case.**
Evidence: `07`. The function currently leaves `ı` (U+0131) and `ß` unfolded, disagreeing with the
database's own `lower(unaccent(x))` convention its docstring says it must match — confirmed live
that `unaccent()` folds both (`ı`→`i`, `ß`→`ss`) while `dbNormalizedName()` folds neither. Minimal
shape of the fix: explicit `ı`→`i` and `ß`→`ss` mappings (`İ`→`i` already works correctly once NFD
runs first — see `07`'s corrected hypothesis), placed so they survive the existing
NFD/diacritic-strip/lowercase chain. Add the full Turkish alphabet (`ç ğ ı ö ş ü` + capitals) as a
permanent test fixture once fixed.

**2. Decide and fix `nameKey()`'s treatment of `ı` in the same file.**
Currently deletes it or splits the word (`07`'s table: "Yıldız" → `"y ld z"`). Recommend folding
to `i` (matching #1) rather than treating it as a word boundary, since `nameKey()`'s whole purpose
is loose identity matching and silent deletion works against that.

**3. Audit already-stored `normalized_name` values for Turkish-script entities.**
26+ rows confirmed live-drifted from the DB convention (`07`, query included). Regenerate-and-diff
against the fixed function (matching this repo's own established pattern per
`docs/handoffs/claude-a-university-spine.md`'s "regenerate full-spine fixture, apply the delta"),
not a blind bulk `UPDATE`.

## Data operations (existing tooling, new target set)

**4. Run the existing ROR-enrichment pipeline against the 41 IDs in
`data/research/canonical-entities/duplicate-candidates-university.json`'s `incomplete` side, plus
the 70 entities in `university-ror-gaps.json`.**
This is the same pipeline already responsible for 93.4% ROR coverage elsewhere — no new code
expected, just a targeted run. Once both sides of a pair carry a ROR id,
`classifyDuplicateCandidate()` requires no changes to correctly resolve most of these to
`SAFE_TO_CANONICALIZE` (`05`). Purdue University needs both sides checked (neither currently has
ROR). Worth a direct look at why MIT/UCL/LSE/Warwick specifically show no ROR despite a prior
session's account of a near-complete (1018/1019) registry-wide ROR pass — this session's live
query and that account diverge for exactly these already-duplicate-flagged entities, and this
session could not determine the mechanism from a read-only pass (`09` Finding 7).

**5. Decide disposition of the ~45 `universities`-row-less canonical_entities rows.**
`09` Finding 2. Options: delete (if genuinely unreachable dead weight), or leave and confirm
`search_canonical_entities()`'s behavior against them is actually benign in the live product (not
verified this session — flagged, not confirmed, as a risk).

**6. Populate `opportunities.organization_entity_id`, starting from
`data/research/canonical-entities/opportunity-organizer-candidates.json`'s two worked clusters
(University of Pennsylvania/Wharton, MIT) plus the ≥2-occurrence tier.**
Most of the ≥2-occurrence organizers (Stanford, CMU, Northwestern, Columbia, Boston University)
are expected to be straightforward alias-resolver runs against the existing university registry —
real research is only needed for the school/center/program-granularity decisions (Wharton, Horn
Entrepreneurship) per `08`'s ladder.

## Schema changes (migration required — this session recommends, does not draft)

**7. Add `partner_of` to `entity_relationships.relationship_type`'s check constraint.**
Evidence: `03`, `08` — at least 4 live `opportunities.organization` strings encode joint-organizer
credit with no relationship type to express it. Recommend a symmetric-in-practice convention
(store one row per pair, treat order as insignificant at the application layer) rather than
requiring both directions stored.

**8. Consider `organized_by` (or a temporal-validity pair, `valid_from`/`valid_to`, added to
`entity_relationships` generally) for the cycle-varying-operator case.**
Evidence: `08`'s METU/Arber-Kongre-A.Ş./Radyo-ODTÜ live example. Lower priority than #7 — the
current workaround (host in the relationship/organizer field, operator noted in free text) is
already what the one live example correctly does, so this is an improvement, not a blocker.

**9. (Lower priority, no live evidence yet) Consider whether `campus_of` and
`successor_of`/`predecessor_of` need any structural support beyond what exists.**
Both types are already in the constraint and unpopulated — this is a "watch for the first real
case" item, not a schema gap. Recorded so it isn't mistaken for one.

## What this package explicitly does NOT recommend

- No new `entity_type` values.
- No relaxation of `resolveIdentity()`'s country-agreement gate or `classifyDuplicateCandidate()`'s
  external-id-required bar for the safe tier — `05`'s one proposed refinement (splitting a
  `NEEDS_ENRICHMENT` case out of `AMBIGUOUS`) is additive, not a loosening of the existing bar.
- No bulk auto-merge of the 41 pairs, the 45 orphans, or anything else, on this package's evidence
  alone, at any point in this priority list.
- No competing identity architecture — this package found the existing one to be materially more
  precise than the mission brief's own starting relationship vocabulary (`03`) and built entirely
  on top of it.

## Where to read more

Full reasoning and evidence for every item above: `01`–`10` in this same directory. Machine-
readable form of the candidate data referenced here: `data/research/canonical-entities/*.json`,
all JSON-schema-validated (parsed successfully) before this handoff was written.
