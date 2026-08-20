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

The obvious edge cases (worth resolving deliberately, not silently, when this is built) are
disputed/partial-recognition territories already visible in ORYN's own live data:
`Northern Cyprus` (three universities already use this as their `country` text value — Eastern
Mediterranean University, European University of Lefke, Near East University — a jurisdiction ISO
3166-1 does not list as a country in its own right), `Hong Kong SAR` and `Macao SAR` (already
correctly distinguished from mainland China in ORYN's own `COUNTRY_ALIASES`, but ISO 3166-1 codes
them as `HK`/`MO`, not full ISO country entries in the ordinary sense), and `Taiwan` (politically
contested; ISO 3166-1 lists it, OpenAlex/ROR generally treat it as a distinct entity, and ORYN's
own `COUNTRY_ALIASES` already accepts "Taiwan, Province of China" as an alias form — a real
example of a decision this package recommends ORYN keep, not silently drop, when the country
entity table is finally built). **Cities are not the same kind of problem** — no small bounded
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
   source, per this document's own reasoning above) — decide the small number of disputed-territory
   edge cases (Northern Cyprus, Taiwan, Hong Kong/Macao SAR) deliberately and document the decision,
   rather than let the bulk import silently pick a default.
2. Backfill `universities.country_entity_id` against the newly-created country entities — this
   should be a nearly-mechanical exact-string match given how clean the existing `country` text
   column already is (confirmed above), unlike every other backfill this package has recommended.
3. Treat `city` as a normal entity type needing the same case-by-case research discipline as
   `school`/`organization` — no bulk shortcut recommended here.
4. Not this package's decision, but worth flagging: whether `country`/`city` should ever become
   student-extensible via the custom-fallback path, or should stay a closed, admin-populated set
   permanently — the current code already answers this (closed), confirm that's intentional.
