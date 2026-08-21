# 17 — The Canonical Entity Autocomplete System (`lib/entities/*`)

A second, more complete resolution architecture this package had entirely missed until late
in the research window — found by reading `scripts/entities-audit.ts` and
`scripts/entities-backfill-report.ts` in full (not just their headers) and following their
imports into `lib/entities/`. Everything in `01`–`16` was written against `lib/acquisition/*`
and `lib/universities/*` (the university/ROR-specific machinery). `lib/entities/*` is a
separate, general-purpose, entity-type-agnostic module (`audit.ts`, `backfill.ts`,
`field-policy.ts`, `normalize.ts`, `rank.ts`, `resolve.ts`, `search.ts`, `types.ts`,
`validation.ts`) that is the **actual production system** behind every student-facing
"search for a school / employer / organization" field in the app — the live analog of
several things this package had been researching mostly in the abstract. Running its real
code against a live snapshot of the registry (not a reimplementation — the actual
`lib/entities/audit.ts` functions, imported directly) turned up several genuinely new
findings (§1, §2, §4, §6, §7 below). §5, on first read, looked like the biggest of them — nine
duplicated world-famous universities — until cross-checking against this package's own earlier
`09` Finding 2 showed all nine were already documented there, discovered by a completely
different method, before this document existed. That correction is kept in below rather than
silently rewritten away, in the same spirit as `07`'s corrected İ hypothesis: this package's
discipline is to verify before claiming novelty, including against its own earlier work, not
only against the codebase. This document should be read as a correction and extension layer on
top of `01`, `02`, `06`, `07`, `09`, `10`, `11`, and `15`, not a standalone note.

## 1. What this system is

`lib/entities/field-policy.ts` defines `ENTITY_SCOPES` — the exact, authoritative mapping of
which of the 14 `canonical_entities.entity_type` values each of 11 student-facing fields
accepts (`school`, `activity_organization`, `work_organization`, `volunteering_organization`,
`research_organization`, `project_organization`, `award_organization`,
`certification_organization`, `sports_team`, `university`, `opportunity`). This is more
precise ground truth than anything derivable from the DB triggers alone, because it also
carries each field's **custom-fallback type** — what a student-created entity gets filed as
when nothing in the registry matches.

**Only 6 of the 14 entity types are ever student-creatable**: `school`, `organization`,
`employer`, `ngo`, `research_institution`, `sports_team`. `university` and `opportunity` have
`customFallbackType: null` by explicit design (`university`'s own comment: "curated global
reference data with sourced statistics attached... there is no custom fallback here" —
students cannot invent a university). `lab`, `club`, `opportunity_provider`, `program`,
`competition`, `scholarship`, `country`, and `city` are likewise never a `customFallbackType`
for any scope — any live row of those types was seeded/curated, never student-submitted. This
sharpens `01`'s description of `verification_state='user_submitted'`: that state can only ever
originate from six of the fourteen entity types, not all of them.

**Neither `country` nor `city` has a scope in `ENTITY_SCOPES` at all.** This is a mechanism
confirmation for `15`'s finding, not just a restatement of it: `15` established that the 6
`country_entity_id`/`city_entity_id` FK columns (`profiles.country_entity_id`,
`profiles.city_entity_id`, `education_records.country_entity_id`,
`universities.country_entity_id`, `universities.city_entity_id`,
`opportunities.country_entity_id` — confirmed directly against `information_schema.columns`
this session, matching `15`'s count of 6 exactly) are 0% populated. Now the reason is
precise: there is no code path through the Canonical Entity Autocomplete System that could
ever populate them, because no `EntityScope` targets `entity_type='country'` or `'city'`.
Separately, `profiles.country`/`education_records.country` (the free-text columns sitting
next to those FK columns) are populated through a **third, unrelated mechanism** —
`lib/vocabularies/countries.ts`'s `COUNTRY_SUGGESTIONS` list, a lightweight "suggest but never
require" widget (`features/entities/suggest-input.tsx`) that has nothing to do with the
`canonical_entities` registry. `scripts/reconcile-custom-vocabulary.ts` (read this session,
not previously examined) confirms this pattern extends to several other fields that are not
entities at all: `test_scores.test_name`, `courses.subject`/`course_name`,
`education_records.country`, `awards.level`, `volunteering_experiences.cause_area`,
`skills.proficiency` — each backed by a hardcoded suggestion list in `lib/vocabularies/*.ts`,
each allowing arbitrary free text, each with its own reconciliation script that surfaces
values typed often enough to be worth adding to the curated list. Three parallel, structurally
distinct "canonicalization" mechanisms now exist in this codebase — the ROR/OpenAlex
acquisition pipeline (`lib/acquisition/*`, universities only), the Canonical Entity
Autocomplete System (`lib/entities/*`, 14 entity types, 6 of them student-creatable), and
suggestion-list vocabularies (`lib/vocabularies/*`, not entities, free text always wins). This
package's recommendations are scoped to the first two; the third is out of scope but worth
naming so a future reader does not mistake `reconcile-custom-vocabulary.ts` for another
gap in entity resolution.

## 2. Two normalizers, and a correction to `07`

`lib/entities/normalize.ts`'s `normalizeEntitySearchText()` is a **separate function** from
`lib/acquisition/normalize.ts`'s `dbNormalizedName()`/`nameKey()`, which `07` is about. They
are not the same code, and — verified directly, not assumed — they do not have the same bugs:

| Character | `lib/acquisition/normalize.ts` (`07`'s subject — acquisition pipeline only) | `lib/entities/normalize.ts` (this doc — powers live student-facing search/backfill/audit/dedup) |
|---|---|---|
| Turkish ı (U+0131) | **Broken** — confirmed live, 26+ drifted rows (`07`) | **Fixed** — explicit `.replace(/ı/g, "i")` pre-step before NFKD, confirmed by a fresh test (`"Yıldız"` → `"yildiz"`) and by real production data (§4) |
| Turkish İ (U+0130) | Fixed (NFD decomposes it for free) | Fixed, same mechanism |
| German ß | **Broken** | **Also broken** — confirmed by a fresh test: `normalizeEntitySearchText("Universität Straße 5")` → `"universitat straße 5"`, ß untouched, because NFKD has no decomposition for ß either and this function has no ß-specific pre-step the way it does for ı |

This changes the framing `10`/`11` currently carry. The ı fix in `07`'s P0 recommendation is
**narrower in blast radius** than stated: it affects only the acquisition/ROR-enrichment
pipeline's identity matching (`resolveIdentity()`), not the live autocomplete a student
actually types into — that path already folds ı correctly. The ß fix is **more urgent** than
stated: it is broken in *both* places, including the production search/backfill/audit/dedup
path every German-script school or university name goes through today. A German student
typing "Universität" against a registry entry stored as "Universitaet" or vice versa, or two
near-duplicate German entities differing only in ß-vs-ss, will not be caught by
`normalizeEntitySearchText()` any more than by `dbNormalizedName()`. `10`/`11` should read
"fix ß in both normalizers; fix ı only in `lib/acquisition/normalize.ts`" rather than treating
the two functions as one problem.

## 3. The custom-entity duplicate check, traced end to end

`lib/entities/resolve.ts`'s `createCustomEntity()` — the function behind "my school isn't
listed, add it" — runs a real two-part check before creating anything: the
`search_canonical_entities` SQL ranker (flagging anything scoring ≥0.9) AND the pure-TS
`findPossibleDuplicates()` (flagging anything at tokenMatch tier or ≥0.85 fuzzy similarity)
over the same candidate set, so an abbreviation collision is caught even when the display
names look nothing alike (`matched_text` carries whichever alias actually matched). A hit
returns candidates for the student to confirm or override — never an automatic merge or
block. This is a well-built implementation of exactly this package's own central principle.

`09` Finding 10 already established the underlying gap — `create_or_resolve_user_submitted_entity`
accepts `p_country_code` with no validation, evidenced by 3 live malformed rows ("Sasmo" with
`country_code='singapour'`; two rows with `country_code='Türkiye'`, a name instead of a code).
Traced one layer further this session, not previously checked: the gap is not mitigated
anywhere above the RPC either. `country` flows from the client straight through
`createCustomEntityAction` (`app/(app)/entities/actions.ts`) → `createCustomEntity()` →
`create_or_resolve_user_submitted_entity` with **no format validation anywhere in that
chain** — `lib/entities/validation.ts`'s `validateCustomEntityInput()` checks only
`displayName` (empty / over 300 chars). Confirmed by reading the Server Action directly:
`country: string | null` is passed through unchanged at every hop. Same low severity `09`
already assigned — `verification_state` starts at `user_submitted` regardless, so a malformed
country doesn't inflate trust — but this confirms there is no defense-in-depth to fall back on
until `15`'s country-entity bootstrap lands; `09`'s recommended fix (validate/normalize
`p_country_code` in the function, or upstream) is the same fix that would close this too.

## 4. Running the real audit logic against the live registry

`entities-audit.ts` (`npm run entities:audit`) is read-only by default; its only mutating flag
(`--fix-drift`) touches nothing but already-stale denormalized display-text columns. Rather
than trust the tool's own description, this session fetched a live snapshot (1172
`canonical_entities` rows, 445 `entity_aliases` rows, via read-only SQL) and ran the actual
`lib/entities/audit.ts` functions — the real production code, not a reimplementation —
against it locally. Raw bucket counts:

```
SAFE_EXACT_LINK     24
POSSIBLE_DUPLICATE  301
AMBIGUOUS           24
UNRESOLVED          0
INVALID             24
```

**Important tool gap found in the process**: none of `findExactDuplicates`,
`findNearDuplicates`, `findDuplicateAliases`, or `findAliasCollisions` filter out
`verification_state IN ('merged','inactive')` before comparing — unlike `resolveCanonicalEntity()`,
`entities-backfill-report.ts`'s `liveEntities`, and `searchUniversities()`, which all
correctly exclude tombstones elsewhere in the same `lib/entities/` module. A `merged` row is
*supposed* to retain its original identity as a tombstone pointing at its replacement (`lib/
entities/resolve.ts`'s own documented design) — so a tombstone sharing its old identity tuple
with the row it was merged into is not a data bug, but the audit tool currently reports it as
one. Checked completely, not sampled: **all 24 SAFE_EXACT_LINK findings are a live row plus
its own already-merged predecessor** (confirmed by joining each finding's two entity ids
against `verification_state` — every pair is exactly one `merged` + one `source_verified`,
zero exceptions). Three of the 24 AMBIGUOUS findings (`alias_equals_other_canonical_name`,
naming KFUPM/UCL/University of Warwick) are the identical artifact — these are the same
`merge_canonical_entities()` pairs `05`/`09`/`10` already document as correctly merged on
2026-08-17. **Recommendation for whoever owns `lib/entities/audit.ts`**: add a
`verificationState !== "merged" && verificationState !== "inactive"` filter to the entity list
before calling `findExactDuplicates`/`findNearDuplicates`/`findDuplicateAliases`/
`findAliasCollisions` — a small, precise fix that would make SAFE_EXACT_LINK actually mean
"needs action" instead of "needs action, or is a correctly-tombstoned merge, indistinguishable
without checking by hand."

## 5. The 21 `alias_shared_by_multiple_entities` findings — cross-validation, not new duplicates

The 21 `alias_shared_by_multiple_entities` findings (an alias string independently claimed by
two different entity rows) collapse to 12 distinct id pairs, all `source_verified` on both
sides (not tombstones — the §4 artifact doesn't apply here). **Correction made during writing,
kept in rather than silently fixed**: this section originally presented nine of these twelve
pairs — UCLA, UC Berkeley, UC San Diego, UC Santa Barbara, NYU, Caltech, City University of
Hong Kong, National Cheng Kung University, National Yang Ming Chiao Tung University — as a new
discovery. Checking their entity ids against `duplicate-candidates-university.json` before
finalizing this document found **all 18 ids already present there** — every one of these nine
pairs is already part of `09` Finding 2's 41/43-pair set, discovered by re-running the Phase 6
`entity_verification_queue` audit query, written earlier in this same session, before this
document existed. Finding 2 already documents the identical two-timestamp mechanism (one side
created `2026-08-16 21:42:51.3+00` with a ROR id and a `universities` row, the other
`2026-08-16 23:29:46.9+00` with neither) and already raised substantially the same
product-surface-risk concern as a live search hazard. Separately, the three abbreviation-
collision pairs below — "UP", "UM", "UPM" — are not new either: they are the identical three
examples `02` and `06`'s RULE-ENTITY-006 already cite. None of this is new-duplicate discovery.

What this section actually adds to `09` Finding 2, having corrected the framing:

1. **Independent cross-validation by a completely different method.** Finding 2 found its 41/43
   pairs via an exact-normalized-name query against `entity_verification_queue`. This session
   found the same nine (among the twelve) via `lib/entities/audit.ts`'s alias-collision rule —
   a different table (`entity_aliases`), different logic (shared alias string, not matching
   name), different code path entirely (the live production audit tool, not a re-run of a
   migration-era query). Two independent methods converging on the same set is a meaningful
   confirmation that Finding 2's diagnosis is correct, not a coincidence of one query's phrasing.
2. **A fuller external-id picture.** Finding 2's prose names ROR specifically; direct query
   against `entity_external_ids` this session shows the enriched side of each pair typically
   carries 4-5 external ids (ROR, GRID, ISNI, WIKIDATA, and usually CROSSREF_FUNDER), not just
   ROR — a small precision-add, not a new fact.
3. **A code-traced, not merely theorized, version of Finding 2's product-surface-risk
   paragraph.** Finding 2 flags that `search_canonical_entities()` doesn't require a
   `universities` row and calls this "not verified against the actual product UI this session."
   Reading `lib/entities/search.ts` directly resolves part of that: `searchUniversities()`
   *does* require a matching `universities` row (confirmed in code), so the `university`-scope
   field a student uses to target a university is safe from ever offering an orphan row. But
   `activity_organization`, `work_organization`, and `research_organization` all list
   `university` as an allowed type and search `canonical_entities` directly with no
   `universities`-row requirement — so a student typing "UCLA" into a research-experience or
   activity field genuinely could be offered both the enriched and the orphan row. No crash, no
   wrong fact shown, but two students' UCLA-linked achievements could split across two different
   entity ids, silently undercounting either in a future aggregate/benchmarking query. Low
   severity today only because every `DENORMALIZED_LINKS` table is still empty (`09`, confirmed
   again this session) — worth fixing before those tables have real rows in them, not after.
4. **Which specific pairs, named**, which Finding 2's own prose (reasonably, at 41-pair scale)
   does not spell out — useful for prioritization given several of these are exactly the
   high-application-volume US institutions ORYN's own student users are most likely to search
   for (UCLA, Berkeley, NYU, Caltech), not obscure ones.

Full pair-by-pair detail (entity ids, both timestamps, external-id counts):
`data/research/canonical-entities/entities-lib-live-findings.json`. `10`/`11` should cite this
alongside `09` Finding 2 and `duplicate-candidates-university.json`, not as a separate item.

## 6. Calibrating the POSSIBLE_DUPLICATE bucket

301 raw findings (275 excluding the merged-tombstone artifact) is a large number, and reading
it as "275 likely duplicates" would be wrong. A 30-pair spot-check (every 9th finding across
the 275 — a characterized sample, not a complete review, unlike this package's "complete, not
sampled" claims elsewhere) found the large majority are structurally-similar-but-substantively-
different real institutions: Northeastern University vs. Northwestern University, University
of Toronto vs. University of Trento, University of Mumbai vs. University of Dubai, University
of Warsaw vs. University of Kansas, Nanjing University vs. Nanjing University of Aeronautics
and Astronautics. 274 of 275 are `entity_type=university` (one `school`). Only 73 of 275
(26.5%) involve an id already present in this package's own targeted 41-pair research
(`duplicate-candidates-university.json`) — the tool's lower, more permissive bar (tokenMatch
tier or ≥0.6 fuzzy similarity, deliberately generous because "surfaced for review, never
merged") is casting a much wider net than targeted research, which is the intended design for
a human-triage queue, not a flaw. One spot-check hit is genuinely worth keeping: "University
of Maryland, Baltimore" vs. "University of Maryland, Baltimore County" are two separately-
accredited institutions in the University System of Maryland (UMB: graduate/professional-only
— medicine, law, pharmacy, dentistry, nursing, social work, no undergraduate program; UMBC: a
separate comprehensive research university with its own undergraduate admissions) — a real
US-based collision trap, added to `12`. Unlike this package's ROR-verified claims, this one
rests on well-established public knowledge of the University System of Maryland's structure
rather than a fresh source check this session performed — flagged so the evidence basis stays
explicit. **Recommendation**: whoever triages `entities:audit`'s POSSIBLE_DUPLICATE output
should expect roughly this signal-to-noise ratio and budget review time accordingly, rather
than treating the raw count as a backlog size.

The one `school` in the 275 (and the entire non-university slice of the registry, checked
completely rather than sampled) turns out to be genuinely clean: see `09`'s strengthened
"checked and found clean" bullet for the full detail — one correctly-not-merged same-name-
different-city school pair, 21 cosmetic `INVALID` redundant-alias rows, zero real duplicate-
identity findings. This package's empirical duplicate-checking has been university-heavy
throughout; this is the first time the non-university slice was checked this thoroughly, and it
held up.

## 7. The registry's trust ladder is currently honest, checked completely

`scripts/verification-state-audit.ts` (not previously examined) checks a real, important
rule stated in `entity_evidence`'s own migration comment: a `verification_state` of
`official_verified` is only defensible when a matching `entity_evidence` row exists. Its own
docblock records a past finding — "EVERY university-type entity marked official_verified has
zero entity_evidence rows" — as of whenever that script was last run. Checked live this
session, directly, registry-wide (not scoped to the script's own `university`-only default):
that state no longer exists. Every `entity_type='university'` row is now `source_verified`
(1055) or `merged` (37) — **zero** currently claim `official_verified` at all, meaning the
prior gap the script's docblock describes has already been fully corrected. **Confirmed, not
just inferred**: `docs/handoffs/claude-a-university-spine.md` Phase 8 (read later this same
session) documents exactly this — "73/73 `official_verified` university entities had zero
`entity_evidence` rows... Applied: all 73 downgraded" via `--fix-downgrade`, matching
`founder-blocked-backlog.md` item 20's "RESOLVED 2026-08-17" note. The only entity type
currently holding `official_verified` anywhere in the registry is `school` (54 rows) — and all
54 have ≥1 supporting `entity_evidence` row. This is a clean, complete (not sampled) result
across the entire registry: **every `official_verified` claim in ORYN's canonical entity
registry today is backed by real evidence.** Worth stating plainly since most of this package's
findings are gaps — this one is a working safeguard, already exercised, currently holding.

**§4's tool-gap finding is also independently cross-validated by the same prior session**:
`claude-a-university-spine.md` Phase 8 separately found and fixed a real bug in
`entities-audit.ts` itself — an unpaginated `canonical_entities` read silently truncating at
PostgREST's 1000-row cap once the registry passed that size, causing POSSIBLE_DUPLICATE
findings to undercount (231 → 296 once fixed). That fix is why this session's own fresh run
(§4, 301 raw findings against today's larger 1172-entity registry) reflects the *current*,
correctly-paginated code — the number is different from their 296 simply because the registry
has grown further since their pass, not because of any remaining pagination gap.

## 8. What this document adds to the priority queue and handoff

Given §5's correction, most of this document is evidence and precision-adds to existing items,
not new priority items. `10`/`11` are updated to cite this document alongside `09` Finding 2
and `duplicate-candidates-university.json` (not as a separate action), with the ß-in-
`lib/entities/normalize.ts` fix (§2) called out as more urgent than `10`'s current P0 framing
suggests, since — unlike the `dbNormalizedName()` fix `10` already prioritizes — this one sits
on the live student-facing search path today. The `lib/entities/audit.ts` tool-gap (§4) is
recorded as a new, small, precise fix for whoever owns that module. Everything else in this
document (§6's calibration note, §1/§3's `ENTITY_SCOPES` findings, §7's evidence audit) is
context for a human reviewer or a standalone correction to `01`/`07`/`15`, not a queue item.
