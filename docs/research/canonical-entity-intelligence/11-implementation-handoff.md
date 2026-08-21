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
permanent test fixture once fixed. **This item is scoped to the acquisition pipeline only — `17`
found a second, separate normalizer (`lib/entities/normalize.ts`) behind live student search,
already correctly fixed for `ı` but not for `ß`; fix that one too (`17` §2), independently of
this item, since it's a different file with its own copy of the same gap.**

**1b. Add a `verificationState !== "merged" && verificationState !== "inactive"` filter to
`lib/entities/audit.ts`'s `findExactDuplicates`/`findNearDuplicates`/`findDuplicateAliases`/
`findAliasCollisions`.** Evidence: `17` §4. Without it, `npm run entities:audit`'s
SAFE_EXACT_LINK bucket is currently 100% (24/24, checked completely) already-merged tombstones
correctly retaining their old identity — not a data problem, but the tool reports it as one,
indistinguishable from a real finding without checking each by hand. Small, precise, isolated
fix; does not affect `entities-backfill-report.ts` or `search.ts`, which already filter
correctly elsewhere in the same module.

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

**4. For the 43 `duplicate-candidates-university.json` orphan pairs: merge directly
(`merge_canonical_entities(orphan, enriched_sibling, reason)`), no acquisition script run needed
— corrected late in this session, see `05`'s "mechanical precision correction" section.**
`--from-db` builds its roster from the `universities` table (confirmed by reading
`scripts/acquire-university-facts.ts` directly); every orphan side has zero `universities` rows
by construction, so the pipeline cannot reach them no matter how it's invoked — this is not a
targeting problem the `--limit`/roster flags can fix. Each orphan's sibling already carries a
verified ROR id; that is the confirmation. The evidence already assembled in this package
(identical normalized name, compatible city, the two-bulk-import-timestamp pattern) is what
justifies each specific merge call — no new research step.

Separately, run `npm run acquire:universities -- --from-db` + `npm run import:universities`
(`scripts/acquire-university-facts.ts`/`scripts/import-university-facts.ts` — the actual, already-
built ROR-enrichment pipeline, found by reading `package.json` partway through this session, not
at the start) against the 70 entities in `university-ror-gaps.json`'s genuine single-row gap list
— a real, different, complementary enrichment target this pipeline *can* reach, since those are
ordinary `universities` rows lacking ROR, not orphans. This is the same pipeline already
responsible for 93.4% ROR coverage elsewhere. Purdue University needs both sides checked (neither
currently has ROR). **If sequencing the merge batch above, `17` independently cross-validated 9
of the 43 pairs via
a second method (UCLA, UC Berkeley, UC San Diego, UC Santa Barbara, NYU, Caltech, City
University of Hong Kong, National Cheng Kung University, National Yang Ming Chiao Tung
University) — reasonable to merge first given several are high-application-volume US
institutions; see `entities-lib-live-findings.json` for full detail. Not additional scope, just
a sequencing suggestion.** **For 9 of the entities in `university-ror-gaps.json`'s
duplicate-supersession list (MIT, UCL, LSE, Warwick, KFUPM, HKUST, UTS, Newcastle-Australia, and
Al-Farabi Kazakh National University — the 9th confirmed late in this session via
`founder-blocked-backlog.md`/`claude-a-university-spine.md`; this document said "8" until this
correction, see `09` Finding 2), skip the research step entirely —
`npm run audit:university-duplicates` (`scripts/university-duplicates-audit.ts`) already
identified and hand-verified the correct ROR id for each on 2026-08-17/18 (independently cross-
confirmed by this session for 4 of the 9); `merge_canonical_entities()` (run via that script's
`--merge-verified`) merged their identity already but does not itself write `entity_external_ids`
rows, so the known id was apparently never separately applied. Write the 9 known ids directly —
see `05`'s dedicated section on this discovery and `university-ror-gaps.json`'s
`ror_id_already_known` fields.**

**5. Decide disposition of the ~45 `universities`-row-less canonical_entities rows.**
`09` Finding 2. Options: delete (if genuinely unreachable dead weight), or leave and confirm
`search_canonical_entities()`'s behavior against them is actually benign in the live product (not
verified this session — flagged, not confirmed, as a risk).

**6. Bootstrap `entity_type='country'` from ISO 3166-1, then backfill the six FK columns that
require it.** `15`, `10` item 1b — this session's highest-priority *infrastructure* (not bug) gap:
schema-required, DB-enforced, and 0% populated. Not this session's to build (would need write
access and a real decision on the disputed-territory edge cases), but it's a self-contained,
one-time bulk operation unlike everything else in this handoff.

**6. Populate `opportunities.organization_entity_id` — every one of the 171 distinct organizer
strings now has a researched candidate**, not just the high-value clusters:
`opportunity-organizer-candidates.json` (Penn/Wharton, MIT, next-tier) plus
`opportunity-organizer-candidates-batch2.json` (the remaining 147: 118 high confidence, 28
medium, 1 low, `13`). Most of the ≥2-occurrence organizers (Stanford, CMU, Northwestern, Columbia,
Boston University) are expected to be straightforward alias-resolver runs against the existing
university registry. Apply `RULE-ENTITY-021`/`022` (`06`) when writing these: the FK always points
at the organizing body, never at a `program`/`competition`/`scholarship` entity (the column's own
trigger rejects those three types); `opportunity_provider` vs. generic `organization` is a
judgment call `13` §4 documents a working heuristic for.

## Schema changes (migration required — this session recommends, does not draft)

**7. Add `partner_of` to `entity_relationships.relationship_type`'s check constraint.**
Evidence: `03`, `08`, `13` — 11 live `opportunities.organization` strings (not 4; `13` found 7
more) encode joint-organizer credit with no relationship type to express it, in at least three
distinguishable shapes (see `relationship-taxonomy-mapping.json`: symmetric partnership,
asymmetric sponsor, unincorporated joint effort). Recommend a symmetric-in-practice convention for
the peer-partnership shape (store one row per pair, treat order as insignificant at the
application layer) and design against all three shapes, not just the simplest one.

**8. Consider `organized_by` (or a temporal-validity pair, `valid_from`/`valid_to`, added to
`entity_relationships` generally) for the cycle-varying-operator case.**
Evidence: `08`'s METU/Arber-Kongre-A.Ş./Radyo-ODTÜ live example. Lower priority than #7 — the
current workaround (host in the relationship/organizer field, operator noted in free text) is
already what the one live example correctly does, so this is an improvement, not a blocker.

**9. (Lower priority, no live evidence yet) Consider whether `campus_of` and
`successor_of`/`predecessor_of` need any structural support beyond what exists.**
Both types are already in the constraint and unpopulated — this is a "watch for the first real
case" item, not a schema gap. Recorded so it isn't mistaken for one. Separately, `13` found 5 of
147 researched opportunity organizers are government bodies with no clean `entity_type` fit among
the current 14 (European Commission DG R&I, US Office of Naval Research, NASA, Turkey's YTB, US
State Department ECA) — `organization` used as the closest available type throughout. Noted here
at the same low priority as `campus_of`/`successor_of` (small blast radius, `organization` works
as a stopgap) — not elevated to its own numbered recommendation below, consistent with this
document's stated bias against proposing new `entity_type` values lightly.

**10. Consider a `split_from`/`split_into` relationship type.** Evidence: `12` case 12 (İstanbul
University's 2018 legislative split into İstanbul University and İstanbul University-Cerrahpaşa,
both remaining live, independent, non-hierarchical peers) — neither `successor_of`/`predecessor_of`
nor `part_of` cleanly fits an institutional split where nothing stopped being independently
referenceable and neither half owns the other. Third priority after `partner_of` (#7) and
`organized_by` (#8) — one confirmed real case so far, versus `partner_of`'s multiple live
`opportunities.organization` instances.

**11. Populate the five relationship candidates `12` researched and sourced directly**: Charité
`part_of` both Humboldt-Universität zu Berlin and Freie Universität Berlin; Amsterdam University
College `part_of` both University of Amsterdam and Vrije Universiteit Amsterdam; King's College
London, UCL, and LSE each `member_of` University of London. All five use relationship types that
already exist in the live constraint — no migration needed, just confirming each institution's
ORYN row id before writing. See `10` item 3b.

## What this package explicitly does NOT recommend

- No new `entity_type` values.
- No relaxation of `resolveIdentity()`'s country-agreement gate or `classifyDuplicateCandidate()`'s
  external-id-required bar for the safe tier — `05`'s one proposed refinement (splitting a
  `NEEDS_ENRICHMENT` case out of `AMBIGUOUS`) is additive, not a loosening of the existing bar.
- No bulk auto-merge of the 43 pairs, the 45 orphans, or anything else, on this package's evidence
  alone, at any point in this priority list.
- No competing identity architecture — this package found the existing one to be materially more
  precise than the mission brief's own starting relationship vocabulary (`03`) and built entirely
  on top of it.

## Where to read more

Full reasoning and evidence for every item above: `01`–`10` in this same directory. Machine-
readable form of the candidate data referenced here: `data/research/canonical-entities/*.json`,
all JSON-schema-validated (parsed successfully) before this handoff was written.
