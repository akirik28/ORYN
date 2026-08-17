# Verified Data Acquisition Architecture

Phase 2 of the Cialfo data-gap work. Companion to
[cialfo-public-intelligence-audit.md](./cialfo-public-intelligence-audit.md), which is the
audit that identified the gaps; this file is how ORYN closes them without lowering its data
standards.

Founder-facing record: Google Drive doc **"ORYN — Cialfo Public Intelligence & Data Gap
Audit"** (see the audit doc for the current file ID — it changes on every update, because the
Drive connector cannot edit a document body in place).

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

### Coverage: before → after

| Field | Live now | Pilot adds | After (of 1,010) |
|---|---|---|---|
| `website_url` | partial | up to 30 gap-fills | unchanged where already set |
| `city` | partial | 0 written (cross-check only) | unchanged by design |
| `research_topics_top5` | **0** | 30 | 30 |
| `admissions_url` | no column | column added | 0 — awaits policy layer |
| `application_system` | no column | column added | 0 — awaits policy layer |

Live figures are carried from the same-day canonical Drive report and were **not re-queried**:
`SUPABASE_SECRET_KEY` is empty, so `report:universities` cannot read the database. The anon key
is not a substitute — global reference tables are authenticated-read only, so an anon count
returns zero rows for every table. **That is RLS working, not an empty database, and must
never be read as a coverage number.**

---

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
