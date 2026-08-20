# 01 — Entity Identity Framework

What makes two records the same real-world entity, stated as a framework that generalizes
`lib/acquisition/identity.ts`'s `resolveIdentity()` (built and proven for `entity_type='university'`
only) across all 14 `canonical_entities.entity_type` values.

## The ten core questions, answered as a decision order

The mission brief poses ten questions for any two records. In practice they collapse into one
ordered evidence check — the same shape `resolveIdentity()` already uses, generalized:

1. **Do they share a strong external identifier?** (ROR, Wikidata, GRID, ISNI, CrossRef Funder,
   IB school code, MEB institution code, or any future registry id in `entity_external_ids`.)
   If yes and it's the *same* id on both sides → same entity (`RULE-ENTITY-001`, `02-05`). If
   both have ids in the *same system* that *disagree* → definitely not the same entity, full
   stop, no further check matters (`classifyDuplicateCandidate`'s `conflicting` branch already
   encodes this).
2. **Do they share an entity_type?** `merge_canonical_entities()` already refuses cross-type
   merges outright. A `school` and a `university` are never candidates for "same entity," even
   if a real institution genuinely offers both — that is a `school_of` relationship (question 9
   below), not identity.
3. **Do they agree on country?** No external id and no country agreement together — `unresolved`,
   always. This is `resolveIdentity()`'s hard gate, and there is no proposed relaxation of it
   anywhere in this package.
4. **Is the name match exact, once normalized?** (`nameKey`/`dbNormalizedName` — see `07`.) Exact
   match within an agreeing country is strong but, per this repo's own standard
   (`isPureEncodingVariant`'s comment in `duplicates.ts`), **still not sufficient alone** — see
   `09` for a live case (41 real pairs) where exact-name-within-plausible-city was *not* enough
   to safely auto-merge without external-id confirmation, and why that turned out to be the
   right call.
5. **Is the name match a known variant form** (parenthetical acronym, dash-acronym suffix,
   leading-acronym prefix, "X, University of" inversion — `nameVariants()`)? Weaker than exact,
   used only when nothing stronger is available.
6. **Is the name match only via a registered alias?** Weakest positional signal in
   `resolveIdentity()`'s ladder — deliberately, since an alias can itself be ambiguous (see `02`).
7. **Are they campus/system siblings rather than the same entity?** (Question 2/3 in the mission
   brief.) A shared parent does not make two entities the same entity — it makes them related
   (`03`). Conflating "part of the same system" with "is the same row" is the single most common
   real failure mode this package found evidence of (Turkish school-group modeling gets this
   right already; nothing in the live data gets it wrong, which is itself worth stating plainly
   as a validated pattern, not just a risk).
8. **Is one a renamed version of the other?** A rename is a fact about one entity's history, not
   a relationship between two entities that continue to coexist — see `04` for exactly where this
   differs from `successor_of` (where two persist) and from a plain `legacy` alias (where only one
   ever existed).
9. **Is one operated by, or a program of, the other?** (`operated_by`, `provider_for`,
   `school_of`.) A program is not an alias of its provider and not the same entity as its
   provider — see `08` for the concrete, currently-unaddressed version of this in
   `opportunities.organization`.
10. **Is the relationship genuinely unknown?** Always an acceptable, and often the *correct*,
    terminal answer. `entity_verification_queue` exists precisely so "unknown" is a recorded,
    actionable state rather than a silent gap.

## Evidence tiers, generalized

`resolveIdentity()` was written for one entity type. The tiering below is the same logic stated so
it applies to a `school`, an `organization`, an `opportunity_provider`, or a `program` exactly as
it already applies to a `university` — no entity-type-specific exception is proposed anywhere in
this package.

| Tier | Evidence | Resolves identity alone? | Notes |
|---|---|---|---|
| 1 | Agreeing external id, same `id_system`, both sides | Yes | Strongest possible signal; a registry curates exactly this |
| 2 | Disagreeing external id, same `id_system`, both sides | Decisive **against** | Overrides every other signal, including an identical name |
| 3 | Exact normalized name + agreeing country/city (or one side missing geography) | No, alone | Necessary but not sufficient — promote to `entity_verification_queue`, never auto-merge (`05`, `06`) |
| 4 | Name-variant match + agreeing country | No | Weaker than tier 3; same treatment |
| 5 | Alias-only match + agreeing country | No | Weakest; an alias can itself be shared across genuinely different entities (`02`) |
| 6 | Name similarity with no country/geography evidence at all | Never | `resolveIdentity()`'s hard refusal; this package proposes no exception |

Nothing in tiers 3–6 alone should ever authorize `merge_canonical_entities()`. That function's own
`service_role`-only grant and mandatory `reason` argument already enforce "never automatic" at the
access-control layer; this framework's contribution is defining what evidence makes a *human or
verification-queue reviewer's* decision defensible, not what a pipeline may do unattended.

## `canonicality_rule` as an identity-strength declaration

`canonical_entities.canonicality_rule` (`required` / `preferred_custom_fallback` /
`free_text_not_entity`) is already, in effect, a per-record declaration of how much identity
confidence is expected before something counts as "this entity." `canonical_field_policies`
extends the same idea per (table, column) — e.g. `universities.name` is `canonical_required`
while `activities.title` is `free_text_remains`. This framework's addition: **the same three-value
scale is a useful lens for entity *resolution* strategy, not only for form-field UI policy.**

- `required` fields (school/country/city on `profiles`, university identity) justify spending the
  most verification effort per record, because every downstream fact depends on getting the row
  right.
- `preferred_custom_fallback` fields (organization on activities/work/volunteering/research/
  projects/awards/certifications, team on sports, provider on opportunities) are exactly where
  `create_or_resolve_user_submitted_entity()`'s alias-aware resolution matters most — a
  `user_submitted` row is *expected* to be common here, not an error state, and should be treated
  as `needs_review` rather than as noise.
- `free_text_remains` fields are explicitly out of scope for this entire framework by design —
  titles and narrative text are not reusable real-world entities, and no amount of NLP cleverness
  should try to make them one.

## The verification-state ladder is not a linear "trust score"

`verification_state` (`unverified` → `user_submitted` → `source_verified` → `official_verified`,
plus the terminal `conflict`/`merged`/`inactive`) reads like a monotonic trust ladder but is not
quite one, and treating it as strictly linear is a mistake worth naming explicitly:

- `user_submitted` is not "less trustworthy `source_verified`" — it is a *different kind of claim*
  (a student asserted this entity exists) that happens to sit below `source_verified` in the
  `create_or_resolve_user_submitted_entity()` tie-break `ORDER BY`. It is correctly treated as
  weak evidence for *identity* but is not evidence of anything false — most `user_submitted` rows
  will turn out to be real schools/employers that simply have not been looked up yet.
  `entity_verification_queue`'s `custom_fallback` source hint exists to close exactly this loop.
- `conflict` is a state a *fact* about an entity reaches (see `precedence.ts`'s `decideWrite`
  returning `"conflict"`), and separately a state an *entity_relationships* row can reach — these
  are different conflicts (a disputed fact value vs. a disputed relationship claim) that happen to
  share a label. Don't collapse them when reasoning about a specific queue item.
- `merged` is not "deleted" and not "less canonical" — it is a *pointer*. `getSupersededUniversityIds()`
  /`canonicalUniversityId()` in `lib/universities/canonical.ts` exist precisely because a `merged`
  row must remain resolvable (FK safety, audit trail) while never independently surfacing on a
  product read path. Any future canonicalization work for non-university entity types will need
  the equivalent of this module, or the same UCL-search-returns-two-rows bug this package's `09`
  found no live instance of (for non-university types) only because so little has been populated
  yet — it is a matter of *when*, not *if*, once `entity_type='school'`/`organization` coverage
  grows past its current ~70 rows.

## What this framework deliberately does not add

No new `entity_type`, no new top-level identity table, no relaxation of the country-agreement
gate, no fuzzy-name-similarity path to `SAFE_TO_CANONICALIZE`. Every generalization above is a
restatement of a rule the codebase already enforces for one entity type, applied to the rest —
this package's job was confirming that generalization holds, not inventing a new one.
