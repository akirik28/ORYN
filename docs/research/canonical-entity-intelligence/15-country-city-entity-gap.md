# 15 — Country / City Entity Gap

The single largest, cleanest piece of white space this session found — different in *kind* from
every other finding in this package, so it gets its own document rather than another audit
bullet.

## The finding, stated precisely

**`entity_type='country'` and `entity_type='city'` have zero rows in the live registry.** Not
low coverage — zero. This is despite:

- The schema explicitly building first-class support for both types from the start (migration
  0038's `entity_type` check constraint includes `country`/`city` alongside every other type).
- **Six** foreign-key columns across the schema specifically for linking to them:
  `profiles.country_entity_id`, `profiles.city_entity_id`, `education_records.country_entity_id`,
  `universities.country_entity_id`, `universities.city_entity_id`,
  `opportunities.country_entity_id` — each with a live, active `enforce_canonical_entity_type()`
  trigger already installed (migration 0038 §"Per-field entity-type enforcement").
- `canonical_field_policies` declaring `country`/`city` on `profiles`/`education_records`/
  `universities` as **`canonical_required`** — the *strictest* of the three policy tiers this
  registry defines (stricter than the `canonical_preferred_custom_fallback` tier every
  organization-type field gets). The schema's own stated intent is that country/city are *more*
  mandatory to canonicalize than an employer or a school, not less.

Confirmed by direct count: `profiles.country_entity_id` 0/2 populated, `education_records
.country_entity_id` 0/0 (table currently empty), `universities.country_entity_id` 0/1019,
`opportunities.country_entity_id` 0/369 (already known from `08`, now understood as part of this
larger pattern rather than an opportunities-specific gap).

## This is not a data-quality problem — the underlying text is already clean

Before assuming the raw `country`/`city` text columns are a mess that canonicalization would need
to clean up, this session checked directly. They are not a mess: `universities.country` uses
consistent English short forms ("United States", "Turkey" — not "USA"/"Türkiye"/other variants
that `lib/acquisition/normalize.ts`'s `COUNTRY_ALIASES` map is built to reconcile); across 1,019
rows and ~90 distinct countries, nothing looked like an obvious duplicate-by-spelling. Same for
`opportunities.country` (12 distinct clean values, including a deliberate non-country value,
`"International"`, for opportunities open worldwide — a sensible modeling choice, not an error).
**The gap is infrastructural, not corrective**: the free-text data was entered carefully and
consistently; the canonical entity layer it's schema-required to link to simply doesn't exist yet.

## Why countries are the one case where bulk pre-population is actually safe — and cities are not

Every other document in this package argues against bulk/blind entity creation (`06`,
`RULE-ENTITY-001`/`013` especially) — research and verify each one, never guess, never create a
system entity ahead of real evidence. **Countries are a structural exception worth naming
explicitly**, for a reason specific to what a country *is*: a bounded, small (~195–249 depending
on the reference standard), authoritatively enumerated set with a single, stable, canonical
source (ISO 3166-1) that virtually every other registry ORYN already integrates with (ROR,
OpenAlex, GRID) also keys against. There is no case-by-case research question for "is Country X
real and distinct from Country Y" the way there genuinely is for a university or a school — the
entire list can be sourced once, from one place, and is correct. **This is the one place in
ORYN's entity graph where a full, upfront bulk population is the right call, not a shortcut.**

**Exact accounting, not a vague gesture at "some edge cases":** the full, distinct set of
`country` values actually in live use — `select distinct country from universities` unioned with
the same from `opportunities`, 90 distinct values — was checked one by one against ISO 3166-1
(re-derived programmatically after an initial manual count came out wrong, per this package's own
verify-before-claiming discipline — see `09` Finding 6 for the same pattern elsewhere).
**88 of 90 map cleanly** (standard ISO short names, or forms `COUNTRY_ALIASES` already reconciles:
`Hong Kong SAR`→`HK`, `Macao SAR`→`MO`, `Taiwan`→`TW` as "Taiwan, Province of China," `South
Korea`→`KR` as "Korea, Republic of," `Palestine`→`PS` as "Palestine, State of," `Czechia` already
matching ISO's current short name exactly). **Exactly two do not:**

- **`International`** (`opportunities.country` only) — not a country at all, a deliberate
  ORYN modeling choice for globally-open opportunities (`08`). Must never receive a
  `country_entity_id` — needs to stay unset, or the product needs a separate boolean/flag for
  "not country-scoped" rather than overloading the country field with a non-country value.
- **`Northern Cyprus`** — the one genuine disputed-territory gap. Three live universities use it
  (Eastern Mediterranean University, European University of Lefke, Near East University) and **ISO
  3166-1 has no code for it at all** (only Turkey recognises it as a sovereign state; the UN and
  ISO both treat the area as part of Cyprus). A naive ISO-only bootstrap would leave these three
  universities with no country entity to link to. This needs an explicit decision before
  bootstrapping, not a silent default: create a non-ISO `country` entity for it anyway (matching
  what ORYN's own live data already does), or map it to Cyprus's ISO code with a note preserving
  the distinction elsewhere (e.g. in `city`/notes) — this package does not pick for whoever
  implements it, per `01`'s standing rule that a genuine source conflict is recorded, not resolved
  by guessing.

**Cities are not the same kind of problem** — no small bounded
authoritative source enumerates "every city a university or school might be in," multiple cities
share names across countries (a real live example already in ORYN's data: this package's own `03`
noted "Boston"/"Boston, MA" as one *university's* city field, but ORYN's live data separately has
genuinely distinct real places like a "Cambridge, UK" and "Cambridge, MA" that a future city-entity
layer would need country-scoped, exactly like every other entity type in this package). This
package's recommendation is therefore split: bulk-populate `country`, research `city` the normal
case-by-case way.

## Why this matters beyond "an unused column"

Every one of the six FK columns above is `canonical_required` or feeds a `canonical_required`
policy — meaning the intended product behavior (per `canonical_field_policies`' own row) is that
a student's country/city should *always* resolve to a real entity, never sit as unlinked free
text the way an employer name is allowed to (`canonical_preferred_custom_fallback`, with a
fallback). Two concrete downstream consequences of the current gap:

1. Any future feature that wants to reason about "students from country X" or "universities in
   city Y" structurally (joins, filters, peer-benchmarking cohorts per `AGENTS.md` Phase 19)
   currently has nothing to join against — it would have to fall back to fragile text matching on
   `profiles.country`/`universities.city`, exactly the failure mode this whole registry exists to
   avoid for every other entity type.
2. `create_or_resolve_user_submitted_entity()` already lists `'school'` and similar types as
   valid for its custom-fallback path, but **does not include `'country'`/`'city'`** in its
   allow-listed types (`p_entity_type not in (...)` check in migration 0038/0039) — meaning even
   if a student-facing form tried to let a student "create" a country entity the way it can for a
   school, the database would reject it. This is consistent with countries being intended as a
   pre-populated, closed set (reinforcing the recommendation above) rather than an open,
   student-extensible one — worth confirming that reading is correct before building the UI.

## Recommendation

1. Bulk-populate `entity_type='country'` from ISO 3166-1 in one pass (a single authoritative
   source, per this document's own reasoning above) — decide `Northern Cyprus` deliberately (the
   one real disputed-territory gap found; see the exact accounting above) and document the
   decision, rather than let the bulk import silently drop it or pick a default.
2. Backfill `universities.country_entity_id`/`opportunities.country_entity_id` against the
   newly-created country entities — this should be a nearly-mechanical exact-string match for 88
   of 90 live distinct values (confirmed above, full list in
   `data/research/canonical-entities/live-country-values.json`), unlike every other backfill this
   package has recommended. `International` must never receive a `country_entity_id` (it isn't a
   country); `Northern Cyprus` depends on the decision in step 1.
3. Treat `city` as a normal entity type needing the same case-by-case research discipline as
   `school`/`organization` — no bulk shortcut recommended here.
4. Not this package's decision, but worth flagging: whether `country`/`city` should ever become
   student-extensible via the custom-fallback path, or should stay a closed, admin-populated set
   permanently — the current code already answers this (closed), confirm that's intentional.
