# Provenance / confidence contract audit (B6)

Compiled 2026-08-20, branch `oryn/counselor-data-quality-v1`. Scope: verify that provenance
fields (`source`/`source_url`, `verification_state`/`status`, `retrieved_at`/`verified_at`,
`confidence`, academic/application year) survive from the database schema through every
Supabase `select()` and TypeScript type into `app/(app)/universities/**` and
`app/(app)/opportunities/**`, without an intermediate query or type silently narrowing them
away — regardless of whether the current UI chooses to render every field it receives. This
is a data-availability audit, not a UI audit: a field the UI doesn't currently show is not a
finding by itself; a field the *query* doesn't fetch, or the *type* doesn't carry, is.

Read directly: migrations 0006, 0008, 0038–0041, 0043–0045, 0047; `lib/universities/*`
(excl. none — all in scope); `lib/opportunities/*` (excl. `matching.ts`/`persist-matches.ts`
per task brief — already verified correct in `docs/current-product-capability-map.md` §3);
`app/(app)/universities/**`; `app/(app)/opportunities/**`; `types/database.ts`. Did not touch
`app/(app)/dashboard/page.tsx`, `features/dashboard/**`, `features/entities/entity-combobox.tsx`,
`lib/entities/search.ts`, or `lib/counselor/{types,index}.ts` — concurrently owned by a
parallel workstream on this branch (confirmed via `git diff --stat`, which shows those files
already modified by other in-flight work, not by this audit).

**Verdict**: one genuine gap found and fixed (below). Everywhere else, provenance survives
intact — verified field-by-field with file:line evidence.

---

## Method

For each domain table with provenance columns, three questions:
1. Does the **schema** actually have the column (migration text)?
2. Does the **TypeScript type** in `types/database.ts` carry it?
3. Does every Supabase `select()` that feeds a page/component **fetch** it (either `select("*")`,
   or a narrow select that explicitly names it)?

A `select("*")` answers (3) trivially for every column the type has. A narrow `select("col1,
col2, ...")` only answers (3) for the columns it names — narrowing is exactly where a field can
be silently dropped before a page ever gets the chance to render it.

---

## Universities — `universities`, `university_programs`, `university_requirements`,
## `university_statistics`, `university_sources`, `university_rankings`, `university_profile_metrics`

| Table | Provenance columns (schema) | Type carries them (`types/database.ts`) | Query that feeds the page | Result |
|---|---|---|---|---|
| `universities` | `data_confidence`, `data_status`, `last_checked_at`, `last_changed_at` (0006) | Yes — `University` interface, `types/database.ts:699-702` | `select("*")` — `app/(app)/universities/[id]/page.tsx:49` | Full — all 4 columns present in the fetched row even though the detail page doesn't currently render them (UI choice, not a data gap) |
| `university_programs` | `source_url`, `source_type`, `verification_state`, `verified_at` (0044) | Yes — `UniversityProgram`, `types/database.ts:776-779` | `select("*")` filtered `.eq("verification_state","verified_current")` — `[id]/page.tsx:53` | Full — every provenance column present on each `program` object passed to the Programs section; `official_program_url` is rendered (`[id]/page.tsx:310-316`), `source_url`/`verification_state`/`verified_at` are fetched but not rendered on this card (UI choice) |
| `university_requirements` | `data_confidence`, `data_status`, `source_url`, `retrieved_at`, `last_checked_at` (0006, 0020, 0043) | Yes — `UniversityRequirement`, `types/database.ts:855-859` | `select("*")` — `[id]/page.tsx:54` | Full — `source_url` is rendered as "Source ↗" (`[id]/page.tsx:470-473`); `data_confidence`/`retrieved_at` fetched, not rendered (UI choice) |
| `university_statistics` | `stat_year`, `source`, `data_confidence`, `retrieved_at` (0006) | Yes — `UniversityStatistic`, `types/database.ts:880-882` | `select("*")` — `[id]/page.tsx:55` | Full — `stat_year`/`source`/`data_confidence`/`retrieved_at` all present on `stats`; none currently rendered on the detail page's stat cards (UI choice — the cards show the numeric value only, not its year/source) |
| `university_sources` | `source_domain`, `source_type`, `retrieved_at`, `confidence`, `raw_excerpt` (0006) | Yes — `UniversitySource`, `types/database.ts:906-910` | `select("*")` — `[id]/page.tsx:56` | Full — passed into `<SourceBadge sourceName retrieved_at url>` (`[id]/page.tsx:383-389`); `confidence` is fetched but **not passed to `SourceBadge`**, even though the component accepts a `confidence` prop (`components/oryn/source-badge.tsx:9-21`) and the opportunity detail page does pass it (`opportunities/[id]/page.tsx:169`). Data is present in `sourcesRes.data[i].confidence`; this is a UI-rendering choice, not a data-loss bug — flagging for the UI-simplification pass, not fixing here per task scope |
| `university_rankings` | `source_url`, `source_published_at`, `verified_at`, `correction_checked_at`, `data_quality_flag` (0038) | Yes — `UniversityRanking`, `types/database.ts:929-933` | **Was** `select("ranking_provider, ranking_edition, rank_display, source_url")` — `[id]/page.tsx:59` (pre-fix) | **Gap found and fixed** — see below |
| `university_profile_metrics` | `source_url`, `source_type`, `verified_at`, `precision_state`, `data_quality_flag` (0038) | Yes — `UniversityProfileMetric`, `types/database.ts:965-968` | **Was** `select("metric_code, value_numeric, value_text, unit, source_url, source_type, verified_at, precision_state")` — `[id]/page.tsx:60-62` (pre-fix) | **Partial gap found and fixed** — `data_quality_flag` was the only omitted provenance column; `source_url`/`source_type`/`verified_at`/`precision_state` were already selected and are rendered via `<SourceBadge>` for research topics (`[id]/page.tsx:341-343`) and via `tuitionQualifier(precision_state)` for tuition figures (`[id]/page.tsx:218-241`) |

### Gap found and fixed

`app/(app)/universities/[id]/page.tsx`'s `rankingsRes` and `metricsRes` queries were narrow
`select()`s that named only the columns the current render happens to use, silently excluding
`university_rankings.verified_at`/`data_quality_flag` and
`university_profile_metrics.data_quality_flag` — both real provenance columns that exist in
the schema (migration 0038) and in the TypeScript types, but that no page or component could
have rendered without first going back and editing the query. Every sibling query on the same
page (`programsRes`, `requirementsRes`, `statsRes`, `sourcesRes`) already uses `select("*")`
and therefore never has this problem; these two were the only two narrowed selects on the
detail page, and both happened to leave a provenance column on the table.

Fixed additively (no behavior change — the two new columns are fetched and unused until a UI
pass decides to render them):

```diff
- supabase.from("university_rankings").select("ranking_provider, ranking_edition, rank_display, source_url").eq("university_id", id).order("ranking_provider"),
+ supabase
+   .from("university_rankings")
+   .select("ranking_provider, ranking_edition, rank_display, source_url, verified_at, data_quality_flag")
+   .eq("university_id", id)
+   .order("ranking_provider"),
  supabase
    .from("university_profile_metrics")
-   .select("metric_code, value_numeric, value_text, unit, source_url, source_type, verified_at, precision_state")
+   .select("metric_code, value_numeric, value_text, unit, source_url, source_type, verified_at, precision_state, data_quality_flag")
```

`app/(app)/universities/[id]/page.tsx:52-79`.

### University identity note (pre-existing, not this audit's fix)

`universities.duplicate_status`/`superseded_by_id` (migration 0043) were never applied live
(confirmed in `docs/current-product-capability-map.md` §4, "migration-0043 drift" — no DDL
access in this environment) and correspondingly **do not exist** in the `University` TypeScript
type or in any `select()` at all — grepped `types/database.ts` and every read path, zero hits.
This is not a silent-narrowing bug (nothing drops a column that was ever fetchable): the live
app-layer substitute is `lib/universities/canonical.ts` + `duplicate-supersessions.json`, and
every university read path in scope (`[id]/page.tsx`, `page.tsx`, `compare/page.tsx`,
`alias-search.ts`, `queries.ts`) already resolves through `canonicalUniversityId()`/
`getSupersededUniversityIds()` before rendering. Flagged in the capability map as a different
workstream's (Claude A's) lane; not re-fixed here.

---

## Opportunities — `opportunities`, `opportunity_sources`

| Table | Provenance columns (schema) | Type carries them | Query that feeds the page | Result |
|---|---|---|---|---|
| `opportunities` | `source`, `source_url`, `source_confidence`, `last_verified_at`, `verification_state`, `verified_at`, `cycle_status`, `current_cycle_label` (0008, 0041) | Yes — `Opportunity`, `types/database.ts:1067-1098` | `select("*")` — detail page `opportunities/[id]/page.tsx:44`; "For you" `opportunities/page.tsx:106`; Browse `lib/opportunities/browse.ts:42` | Full — `source`/`source_url`/`source_confidence`/`last_verified_at` are rendered via `<SourceBadge>` as the fallback path when no `opportunity_sources` rows exist (`opportunities/[id]/page.tsx:174-182`), confidence correctly cast and passed; `cycle_status` rendered as a status badge on both the detail page (`:73`) and `OpportunityCard` (`features/opportunities/opportunity-card.tsx:123-125`); `verification_state` is fetched (full object) but not rendered anywhere in scope — UI choice, not a gap |
| `opportunity_sources` | `source_domain`, `source_type`, `retrieved_at`, `confidence`, `raw_excerpt` (0008) | Yes — `OpportunitySource`, `types/database.ts:1135-1143` (fields verified against 0008) | `select("*")` — `opportunities/[id]/page.tsx:51` | Full — `sourceName`/`retrieved_at`/`source_url`/`confidence` all passed to `<SourceBadge>` (`opportunities/[id]/page.tsx:163-171`), confidence cast to `ConfidenceLevel` correctly |
| `eligible_citizenships` (0047, opportunity-level structured eligibility) | text[] | Yes — `Opportunity.eligible_citizenships`, `types/database.ts:1092` | `select("*")` on both pages above | Full — carried through to `OpportunityBrowseRow`/`OpportunityCard` regardless of whether the card renders it (it doesn't; `lib/counselor/eligibility.ts`, out of scope for this task, is the actual consumer per the capability map) |

`OpportunityCard` (`features/opportunities/opportunity-card.tsx:70`) and the compare-equivalent
browse row (`lib/opportunities/browse.ts:16` `OpportunityBrowseRow.opportunity: Opportunity`)
both type their prop as the **full** `Opportunity` object, not a narrowed `Pick<>` — so even
fields the card never renders (e.g. `verification_state`, `eligible_citizenships`,
`organization_entity_id`) are structurally available to any future UI change with zero data-layer
work. No gap found in the opportunities surface.

---

## Cross-cutting confirmations

- **`DataConfidence`/`ConfidenceLevel` alignment**: `types/database.ts:38` (`"high"|"medium"|
  "low"`) matches `components/oryn/confidence-indicator.tsx:3` exactly — no silent value-set
  drift between the DB enum and the UI component's prop type.
- **Ingestion write path also preserves provenance** (confirms the chain isn't broken upstream
  either): `lib/opportunities/ingest.ts`'s `decideIngestion()` populates `source`, `source_url`,
  `source_confidence`, `verification_state`, `verified_at` on every accepted row
  (`lib/opportunities/ingest.ts:107-112, 223-228`) — nothing gets to "exist in the DB with no
  provenance" in the first place for records that go through this pipeline.
- **Compare page** (`app/(app)/universities/compare/page.tsx:46-49`) and **browse list**
  (`app/(app)/universities/page.tsx:196-198, 267-274`) deliberately fetch narrow field sets for
  card/table rendering (no `source_url`/`confidence` requested) — this is expected and correct,
  not a gap: both are summary surfaces that link back to `/universities/[id]`, which carries the
  full provenance set. Matches the capability map's documented pattern ("SourceBadge... Detail
  page" only).
- **`lib/opportunities/matching.ts` / `persist-matches.ts`**: excluded from this audit per task
  brief; already verified correct in `docs/current-product-capability-map.md` §3 ("Reads only
  `eligible=true` + `verified_current`").
- **`lib/opportunities/dedup.ts`, `discover.ts`, `duplicates.ts`, `readiness.ts`**: pure
  functions or admin-only ingestion helpers with no frontend-facing `select()` — checked, not
  in-scope for a frontend-provenance finding (grepped every `.select(` call in the directory).

---

## Verification

Touched one file: `app/(app)/universities/[id]/page.tsx` (2 `select()` calls widened,
additive-only, no render logic changed).

```
npx tsc --noEmit
```
→ clean, no errors.

```
npx eslint "app/(app)/universities/[id]/page.tsx"
```
→ clean, no errors/warnings.

```
npx vitest run __tests__/universities __tests__/opportunities
```
→ 18 test files, 259 tests, all passing.

```
npx vitest run
```
→ full suite: 98 test files, 1140 tests, all passing.

No `.test.ts`/`.test.tsx` targets `app/(app)/universities/[id]/page.tsx` directly (server
component page, consistent with the rest of this codebase's testing pattern of unit-testing
`lib/*` and integration-testing via `__tests__/universities/*`) — verification here is
type-level + full-suite regression, not a new test, since the change adds columns to an
existing read with no new branching logic to unit-test.
