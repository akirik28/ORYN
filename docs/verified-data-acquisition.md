# Verified Data Acquisition Architecture

Phase 2 of the Cialfo data-gap work. Companion to
[cialfo-public-intelligence-audit.md](./cialfo-public-intelligence-audit.md), which is the
audit that identified the gaps; this file is how ORYN closes them without lowering its data
standards.

Founder-facing record for this phase: Google Drive doc **"ORYN — Verified Data Acquisition:
Architecture, Pilot & Coverage"**, ID `1nsd14SDhzysW66n0v_nAHd8_hyergnu5qbgyPHeujCM`, in the
Drive `ORYN` folder. That document is the living implementation/coverage record; the audit doc
(`1SeLGD4y8Rj4twWpZWeMj5fP_OIEahlwhTNBCtYubVLA`) stays the stable record of the audit itself.
They are split deliberately: the Drive connector cannot edit a document body in place, so every
update mints a new file ID — keeping the frequently-updated coverage record separate stops that
churn from invalidating references to the audit. Search by title, not ID.

---

## The one-paragraph version

Acquisition and application are separate programs. `acquire-university-facts.ts` talks to
external sources and writes a reviewable JSON fixture where **every fact carries its own
source URL, source date, retrieval time, scope, and a verification state computed from that
provenance**. `import-university-facts.ts` is the only thing that writes to the database: it
resolves each entry to an *existing* university through the canonical entity registry,
refuses to guess, and consults what is already stored before every write so that older or
weaker data can never replace better data. Re-running either is a no-op.

---

## Why the two layers behave differently

This is the central finding of Phase 2, and it shapes everything else.

| | Identity / research layer | Cost / policy / programme layer |
|---|---|---|
| Sources | ROR, OpenAlex | Each institution's own website |
| Format | JSON APIs, one record per institution | Multi-hop HTML, different on every site |
| Credentials | **None** | `TAVILY_API_KEY` (discovery) + `ANTHROPIC_API_KEY` (extraction) |
| Throughput | Whole spine in one run | Per institution, per page |
| Licensing | CC0 | Public facts, cited per use |
| Status | **Running today** | Architecture + schema ready, credential-blocked |

There is no global open dataset for tuition, entry requirements, or English-language
requirements. The ETH Zurich fees page was checked directly during this phase: it is a
1,674-character stub whose actual figures live another hop down, and that is the normal case,
not an outlier. So the cost/policy layer is inherently discovery-then-extract, and no amount
of engineering removes its need for a search provider and an extraction model.

The honest consequence: **the identity layer is automatable and is automated; the cost/policy
layer is designed, schema-backed, authority-gated, and waiting on two credentials.** It was
not populated with guesses in the meantime.

---

## Modules

All of `lib/acquisition/*` is pure and free of `import "server-only"`, so both the Next.js
app and plain `tsx` scripts can use it (the same constraint `check-integrations.ts` works
under).

### `source-authority.ts` — authority is per fact class, not per domain

The most important design decision here. A single global "is this domain trustworthy" score
is wrong, and being wrong about it is how invented-looking data reaches students.

```
sourceAuthority(factClass, url, officialDomains?) -> { tier, sourceType } | null
```

`null` means **"may not be used to publish this class of fact"** — not "low confidence".
There is deliberately no way to publish from a refused source at reduced confidence, because
that is exactly the coverage-over-truth trade the product's rules forbid.

- An institution's own academic/government domain → `HIGH`, `official_primary`, for every class.
- ROR / OpenAlex → `HIGH` for `identity` and `research_strength`; **refused** for `cost`,
  `policy`, `programs`. A registry that is authoritative about who an institution *is* says
  nothing about its fees.
- NACUBO / THE / QS / OECD → `MEDIUM` for `population` only.
- Wikipedia and Wikidata → refused for everything. They are an *index* used to find real
  sources (`enrich-student-counts.ts`), never a value.
- Cialfo → refused for everything. Discovery-only by policy.

Domain matching is suffix-aware and dot-anchored. That was a real bug caught by its own test:
the denylist held `wikipedia.org` while real URLs arrive as `en.wikipedia.org`, so Wikipedia
was briefly accepted as an identity source. `notwikipedia.org` still cannot match.

`officialDomains` lets a caller trust an institution's own non-academic domain (`ethz.ch`,
`tum.de`) — but only when it was established from an authoritative identity source, never
guessed. An excluded domain stays excluded even if a caller claims it is official.

### `verification.ts` — state is computed, never asserted

```
resolveVerificationState({ authority, sourceYear, retrievedAt, cadenceDays, conflicting?, derived? })
  -> verified_current | verified_historical | verified_derived | unverified | conflicting | stale
```

Precedence, in order: a refused source can never be verified → a same-tier disagreement is
`conflicting` → a derived value is `verified_derived` → a source stating a year more than two
old is `verified_historical` however recently it was fetched → past its cadence window it is
`stale` → otherwise `verified_current`.

`isPublishableAsFact()` allows only `verified_current` and `verified_derived` to be asserted
plainly. `requiresCaveat()` marks the states that must always be rendered with their date or a
caveat beside them. Cadence: deadlines 7d, cost and policy 90d, programmes 180d, population
and identity 365d.

### `precedence.ts` — where "never overwrite newer with older" lives

```
decideWrite(incoming, existing) -> { action, reason }
```

Actions: `insert`, `update`, `touch_only`, `skip_older`, `skip_lower_authority`,
`skip_human_verified`, `conflict`.

Order: a human-verified stored value outranks everything a machine can offer → newer stated
date wins → an undated value cannot supersede a dated one → at equal dates the stronger tier
wins → at equal date *and* equal tier a disagreement is a `conflict`, never a winner.

This module is pure and heavily tested because the failure it prevents is silent: a blind
upsert will happily replace a hand-verified 2026 tuition figure with a 2019 one, and nothing
about the resulting row looks wrong afterwards.

### `identity.ts` — refusing to guess

`resolveIdentity()` returns `matched` or `unresolved` **with a reason**, never a best guess.
Strength order: a cross-registry external id already stored against the canonical entity →
exact name + country → name variant + country → stored alias + country. Country must always
agree; a name match across countries is not a match. Two local rows matching equally well is
`unresolved`, because merging real entities is a human decision.

`compareLocation()` reports city/country disagreement rather than fixing it.

### `normalize.ts` — shared so two pipelines cannot disagree

Country aliasing (`Türkiye`/`Turkey`, `Hong Kong SAR`/`Hong Kong`), diacritic-insensitive
`nameKey`, name-variant generation, ROR type mapping, degree-level mapping, and money parsing.

`nameKey` drops a leading definite article: ranking tables and registries disagree about it
("The University of Edinburgh" vs "University of Edinburgh") and no two institutions differ
only by a leading "The". Country agreement is still required separately, so this is a
normalisation, not a relaxation.

`parseMoneyAmount` returns `null` rather than guessing, and refuses ranges outright — one end
of a stated range asserts something the source did not say. Its separator heuristic was
another real bug caught by test: with only one separator present, the group length decides
(exactly three trailing digits means thousands), because the naive "comma means decimal" rule
turned `CHF 15,000` into `15.0`.

### `fixture.ts` — the acquisition/import contract

Zod-enforced, because a fixture is data read from disk. Every provenance field is required:
there is no way to express a fact without a source URL, scope, retrieval time, and
verification state.

`validateFixture()` additionally catches what a schema cannot: two facts sharing a
field+scope (which would let import *order* pick the winner), duplicate ROR ids, future
dates, and a `verified_current` claim from a tier that cannot support it. It needs no database,
which makes it the meaningful pre-flight while `SUPABASE_SECRET_KEY` is unset.

Each fact declares a **write policy**, applied before dates are consulted:

- `fill_if_null` — only ever fills a gap; never replaces, however new the source.
- `supersede_by_date` — normal precedence applies.
- `cross_check_only` — never written; compared, and disagreements reported.

Write policy exists because "newer" and "better" are not the same thing. Two examples from
the pilot output, both caught by inspecting real data before importing it:

- ROR's geonames city for the University of Cape Town is `Rondebosch` and for HKU is
  `Pok Fu Lam`. Administratively correct, useless on a student-facing card, and a straight
  regression over `Cape Town` and `Hong Kong`. → `cross_check_only`.
- ROR's `institution_type` for all 30 pilot universities is just `education`, strictly coarser
  than the `Public research university` a hand-researched row already holds. Importing it
  would have degraded the column while looking like enrichment. → **not acquired at all.**

---

## Pipeline

```
roster / spine
   ↓  ROR search (name), country must agree, exact-name preferred, ambiguity -> UNRESOLVED
   ↓  OpenAlex lookup by ROR id (exact key, cannot drift to another institution)
   ↓  per-fact authority gate  (refused source -> fact dropped, never downgraded)
   ↓  verification state computed from provenance
fixture JSON  (reviewable, diffable, committed)
   ↓  schema + consistency validation      [no credentials needed]
   ↓  identity resolution via canonical_entities / entity_external_ids
   ↓  write policy, then precedence vs stored value
   ↓  idempotent write                     [needs SUPABASE_SECRET_KEY]
database
```

### Where facts land

No new table was needed for the pilot — the canonical registry and the flexible metric store
absorbed it, which is the registry doing its job:

| Fact | Destination |
|---|---|
| `website_url` | `universities.website_url` |
| `city` | compared against `universities.city`, never written |
| `research_topics_top5` | `university_profile_metrics` (`metric_code`, `value_text`) |
| Cross-registry ids | `entity_external_ids` |
| Name forms | `entity_aliases` |

The importer holds an allow-list of writable `universities` columns. `name`, `country`, and
`canonical_entity_id` are deliberately absent — a fixture can never rename or re-home an
institution.

### Migration 0042

Adds `universities.admissions_url` and `universities.application_system` (targets for the
policy layer), brings `university_requirements` onto the same `verification_state` vocabulary
as `opportunities` (migration 0041) plus a `scope` for applicant group, and closes two real
idempotency gaps:

- migration 0028's unique index on requirements was scoped `where program_id is not null`, so
  **university-wide requirements had no uniqueness at all** and any re-import duplicated every
  one of them.
- `university_profile_metrics` had only non-unique indexes, so importing the same metric twice
  inserted a second row. Natural key: `(university_id, metric_code, scope, coalesce(stats_as_of,''))`
  — several rows per metric over time is intended; same metric, scope *and* period is a duplicate.

Not applied to any database from this session (no credentials). It is additive and safe.

---

## Pilot result

30 universities, 23 countries, 6 continents. Deliberately not US/UK-dominated — a pilot that
is only US/UK proves nothing about non-Latin scripts (Boğaziçi), diacritics (São Paulo,
México), inconsistent leading articles, or institutions whose official domain carries no
academic suffix. A test asserts US+UK stays under 25% of the roster.

```
resolved             30 / 30
unresolved            0
facts                90
countries            23
verification state   verified_current  90
fields               website_url (fill_if_null)  30
                     city (cross_check_only)     30
                     research_topics_top5        30
```

The first run resolved 27/30 and refused the three `The University of X` entries — the system
working as intended. That was fixed by improving normalisation, not by loosening the matcher.

`research_topics_top5` is a dimension ORYN had no representation of at all: what an
institution actually publishes on, from OpenAlex, which feeds interest and research matching.

### Coverage: before → after (measured live, 2026-08-17)

Credentials arrived after the architecture was built, so these are real measurements against
`oryn-qa-scratch`.

| Field | Before | After pilot | Note |
|---|---|---|---|
| universities | 1010 | 1010 | unchanged |
| `official website` | **25 / 1010 (2.5%)** | **47 / 1010 (4.7%)** | +22; existing values preserved by `fill_if_null` |
| `research_topics_top5` | **0** | **30 rows** | dimension ORYN had no representation of |
| identity resolution | 28 / 30 | **30 / 30** | 0 unresolved after two registry aliases were added |
| `city` | 1010 / 1010 | unchanged | `cross_check_only`; disagreements reported, none written |
| `coordinates` | 0 / 1010 | 0 / 1010 | full-spine pass supplies these |

**Idempotency proven on real data.** Re-running the same fixture with `--apply` produced
`touch_only`, `skip_human_verified`, and **zero writes**. A direct duplicate check confirmed one
`research_topics_top5` row per university, 0 duplicated — so the explicit PATCH-or-POST path is
correct even without 0042's natural-key index.

**City disagreements are exactly what the write policy exists for.** Reported, never written:

```
University of Michigan       stored "Ann Arbor, MI"  vs registry "Ann Arbor"
Georgia Institute of Tech.   stored "Atlanta, GA"    vs registry "Atlanta"
University of Hong Kong      stored "Hong Kong"      vs registry "Pok Fu Lam"
University of Cape Town      stored "Cape Town"      vs registry "Rondebosch"
```

A date-based-precedence-only importer would have overwritten every one with the worse value.

### Full-spine result (measured live, 2026-08-17)

| Field | Before | After full spine | Change |
|---|---|---|---|
| universities | 1010 | 1010 | — |
| `official website` | **25 / 1010 (2.5%)** | **809 / 1010 (80.1%)** | **+784** |
| `coordinates` | **0 / 1010 (0%)** | **800 / 1010 (79.2%)** | **+800** |
| cross-registry external ids | **0** | **3,945** | ROR 800 · WIKIDATA 800 · GRID 796 · ISNI 790 · CROSSREF_FUNDER 759 |
| `research_topics_top5` | 0 | 30 | OpenAlex rate-limited mid-work — see below |
| `city` | 1010 / 1010 | unchanged | `cross_check_only`; 114 disagreements reported, 0 written |
| `institution_type` | 764 / 1010 | unchanged | deliberately not acquired |
| `total_students` | 283 / 1010 | unchanged | not in scope this pass |
| `university_programs` | 0 | 0 | Phase C |

Acquisition: 1010 processed, **806 resolved**, 204 unresolved (194 no exact name match, 5 country
mismatch, 1 no ROR hit, 4 withheld duplicate identities), 3,224 facts, 86 countries.

Import: 2,362 fact writes + 3,945 external ids. **0 conflicts.** 38 existing values preserved.
114 city disagreements reported, none written. 6 unresolved at import (all duplicate-row pairs).

**Idempotency proven:** two consecutive `--apply` runs after the fixes produced
`skip_human_verified 2400` and **0 fact writes**, with 0 duplicated rows across
`university_profile_metrics`, `entity_external_ids`, and `canonical_entities` (the importer never
creates entities).

### The silent truncation bug — and a correction

Mid-session this document (and a commit message) claimed the spine was **1000, not 1010**, and
that the canonical Drive report was wrong. **That was itself the bug.** PostgREST applies a
server-side `max-rows` cap — 1000 on Supabase — and returns a truncated result with a **200
status and no error**. `universities` holds 1010 rows, so:

- every coverage percentage was computed over 1000 of 1010 rows (wrong denominator *and* wrong
  numerator);
- the acquisition roster, ordered by name, silently dropped the last 10 alphabetically;
- the importer then could not match those same 10 back and reported them as "no name match" —
  **a truncation bug wearing the costume of a data-quality refusal**, which is the most
  dangerous shape this class of bug can take, because the pipeline looked like it was being
  appropriately strict.

The Drive report's figures (1,010 universities, 1,009 QS, 283 `total_students`) were correct
throughout. Fixed in `lib/acquisition/paginate.ts`: every read that must be complete pages
through the result **and asserts the assembled count against the server's own exact count**,
throwing rather than proceeding on a short read. `fetchAllRows` also refuses a query with no
`order=` clause, since paging without a stable order can skip or repeat rows.

Verified figures after the fix match the Drive report exactly: 1010 universities, QS 1009/1010,
`student_size` 283, `total_students` 283.

### Four more data-quality bugs found by running it for real

1. **Idempotency failed on the second full-spine run** (1,600 writes instead of 0).
   `latitude`/`longitude` were in the importer's writable-columns set but *not* in its SELECT
   list, so `existingVersion` always saw `undefined`, concluded nothing was stored, and
   re-wrote both every run. The select list was hardcoded and had drifted from the writable
   set. Fixed by **deriving** the select list from the writable sets, plus a startup assertion
   that every writable column was actually returned — the check that would have caught this on
   the first run rather than the second.
2. **External-id identity resolution had never once executed.** The query used `id_type` /
   `id_value`; the real columns are `id_system` / `external_id`, and the resulting HTTP 400 was
   swallowed by `.catch(() => [])`, so it silently fell through to name matching every time.
   Column names fixed and the catch removed — a schema mismatch must fail loudly.
3. **External ids were acquired and reported but never persisted.** Now written to
   `entity_external_ids` as `source_verified` (ROR is an authoritative open registry, not the
   institution itself, so `official_verified` would overstate it).
4. **`resolution=ignore-duplicates` without `on_conflict` still raised 23505.** PostgREST only
   considers the primary key unless given an explicit conflict target; the second run collided
   on `unique (id_system, external_id)`. Fixed with `?on_conflict=id_system,external_id`.

### A source failure that hid as missing data

One full-spine run produced **zero** `research_topics_top5` facts. OpenAlex was returning HTTP
429 for every request — self-inflicted, from running the full spine three times (~2,400 calls) —
and the field simply vanished from the run summary, which reads identically to "this source has
nothing for these institutions". **Missing data and a broken source are different facts.**
Acquisition now tallies per-provider outcomes (`ok` / `rate_limited` / `failed`), backs off on
429, and prints an explicit warning when a provider returned no successful response at all,
stating that the field is absent because the source was unavailable — not because the
institutions lack the data. `research_topics_top5` therefore stands at 30/1010 and needs one
follow-up pass once the limit clears.

### Duplicate identities in the live spine

The full-spine fixture failed validation on first pass with two duplicate ROR ids, which is the
validator doing its job. The cause was duplicate rows in our own spine, each with its **own**
`canonical_entity_id`:

| Institution | Row A | Row B |
|---|---|---|
| Warwick | `University of Warwick` (Coventry) | `The University of Warwick` (city recorded as "England") |
| UCL | `University College London` | `UCL` |

The import plan surfaced six more: MIT, LSE, HKUST, KFUPM, University of Newcastle (Australia),
and University of Technology Sydney all match two rows each.

Per the standing rule, none were merged — merging real entities is a human decision
(`founder-blocked-backlog.md` item 19). Acquisition now carries a **duplicate-identity guard**:
when two rows resolve to the same authoritative registry record, *both* entries are withdrawn
to `unresolved` with the conflict recorded. Writing facts to both would double one
institution's data across two identities and make the duplication harder to see, not easier.

### Resolving the two unmatched universities the designed way

The pilot could not place two rows, and both were genuine — not matcher weakness:

- `Universität Heidelberg` — ROR publishes "Heidelberg University" and
  "Ruprecht-Karls-Universität Heidelberg", neither of which is the short German form we store.
- `Trinity College Dublin, The University of Dublin` — our row concatenates two official
  titles; ROR publishes them as separate names.

Fixed by adding five verified, source-linked aliases to `entity_aliases` and teaching the
importer to consult the registry's aliases — **not** by loosening the matcher. That is the
canonical-registry path working as intended: a human confirms once, and every later import
resolves automatically. Identity resolution went 28/30 → 30/30 with zero change to matching
strictness.

## Commands

Acquire the pilot (no credentials needed):

```bash
npm run acquire:universities -- --pilot
```

Validate a fixture (no credentials needed):

```bash
npm run import:universities -- --file supabase/fixtures/university-identity-pilot.json
```

Staged coverage report (no credentials needed):

```bash
npm run report:universities -- --fixture supabase/fixtures/university-identity-pilot.json
```

Resolve identity against the live database and show the write plan without writing:

```bash
npm run import:universities -- --file supabase/fixtures/university-identity-pilot.json --plan
```

Apply:

```bash
npm run import:universities -- --file supabase/fixtures/university-identity-pilot.json --apply
```

Live coverage report:

```bash
npm run report:universities
```

`--plan` and `--apply` require `SUPABASE_SECRET_KEY` (founder-blocked-backlog item 2).

---

## Reproducibility

The fixture is committed, so the pilot is reproducible without re-running acquisition, and
`__tests__/acquisition/fixture.test.ts` validates **the real committed artefact** — not a
synthetic one — so a future acquisition run that violates the provenance rules fails in CI
rather than at import time.

Re-running acquisition regenerates the fixture from live registries; `sourceAsOf` and
`retrievedAt` will change, and ROR records genuinely change over time, so a diff is expected
and is the point.

Gate before committing any change here:

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

At the time of writing: lint clean, typecheck clean, **578/578 tests passing** (123 new in
`__tests__/acquisition/`), build succeeds.

Note: `scripts/enrich-student-counts.ts` contains bytes that make `file(1)` report it as
binary, so plain `grep` silently skips it — use `grep -a` on that file.

---

## What is deliberately not done

- **No cost, policy, or programme data was acquired.** Structurally blocked on
  `TAVILY_API_KEY` + `ANTHROPIC_API_KEY`, and the authority gate refuses those fact classes
  from the sources available here. Nothing was guessed to fill the gap.
- **Nothing was written to the database.** No `SUPABASE_SECRET_KEY` and no Supabase MCP in
  the session that built this. The importer's write path is implemented and gated; it has not
  been executed against a real database.
- **No scholarships table.** Held pending the sourcing decision (founder-blocked-backlog
  item 23) rather than shipped unused.
- **`institution_type` and `established_year` not imported.** See the write-policy section —
  both would have degraded existing data or asserted a contested value.
- **Full-spine acquisition not run.** Enumerating all 1,010 universities needs read access.
  `--pilot` is the only mode that works without credentials; the code path for the spine is
  the same one, and the script says so rather than pretending otherwise.

## Next

1. Set `SUPABASE_SECRET_KEY`, run `--plan`, review, then `--apply`. The plan output names
   every skip and its reason, so review is a real check rather than a rubber stamp.
2. Apply migration 0042.
3. Run acquisition across the full spine; expect a meaningful `website_url` gap-fill and 1,010
   `research_topics_top5` rows.
4. With `TAVILY_API_KEY` + `ANTHROPIC_API_KEY`, build the policy/cost layer on the same fixture
   contract: discovery from `universities.website_url`, extraction into `admissions_url`,
   `application_system`, and `university_requirements` rows scoped by applicant group.
5. `university_programs` remains the single largest product gap (0 rows). Same contract,
   seeded per university from the official catalogue — never open-web crawled.
