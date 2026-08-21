# 02 — Alias Taxonomy

`entity_aliases.alias_type` already encodes six categories (`official`, `common`, `abbreviation`,
`legacy`, `translation`, `user_submitted`). This document defines each precisely, states the
safety rule for each, and grounds every rule in a real row from the live registry rather than a
hypothetical.

## The six types

### `official`
The name a legal/regulatory document uses, when it differs from `display_name`. Example, live:
**The Koç School**'s official Turkish name is stored as an `official`-type, `tr`-language alias:
`VKV Koç Özel Lisesi` ("VKV" = Vehbi Koç Vakfı, the foundation that operates it). This is a real,
useful case of *why* `official` and `translation` are separate axes (a name can be both, or
either alone) — see the `alias_type` × `language_code` cross-cut below.

**Safety rule:** an `official` alias is evidence *for* identity (it is effectively a second name
for the same legal entity) but must still never be the sole basis for a cross-entity merge without
also passing the country/external-id checks in `01` — an official name collision across two
countries is exactly the shape of the `UM`/`UP`/`UPM` problem below, just at the canonical-name
layer instead of the alias layer.

### `common`
The name people actually use in speech/search, when it differs from `display_name`. Example,
live: `Massachusetts Institute of Technology`'s canonical `display_name` already *is* the common
form, so its `common`-type alias row is the redundant full form kept for search symmetry; a
better example of `common` doing real work is a case where `display_name` is the *formal* form
and `common` is what a student would actually type — this is the majority of the 204 `common`
rows in the live registry and the type this package expects to grow fastest as school-chain and
opportunity-provider coverage expands.

**Safety rule:** none beyond the general alias-match tier (weakest positional signal in
`resolveIdentity()`'s ladder, per `01`) — `common` aliases are exactly what free-text search
should match against, which is the entire reason `search_canonical_entities()` unions
`entity_aliases` into its candidate set.

### `abbreviation`
Example, live and unambiguous so far: `MIT` → Massachusetts Institute of Technology, `UCL` →
University College London (`verified: true`). Example, live and **genuinely ambiguous** — the
most important finding in this document:

| Alias | Entity A | Entity B |
|---|---|---|
| `UM` | Universidad de Montevideo (Uruguay) | Universiti Malaya (Malaysia) |
| `UP` | Universidad de Palermo (Argentina) | Universidad Panamericana (Mexico) |
| `UPM` | Universidad Politécnica de Madrid (Spain) | Universiti Putra Malaysia (Malaysia) |

These are not a hypothetical the mission brief warned about in the abstract — they are three real
pairs already coexisting correctly in `entity_aliases` today, each pair only disambiguable by
country. This validates, with live evidence, the mission brief's explicit instruction: *"do NOT
assume all abbreviations are globally unique."* It also validates that the current schema already
handles this correctly — `entity_aliases` has no `unique(alias)` constraint, only
`unique(entity_id, normalized_alias)`, so the same abbreviation legitimately attaching to multiple
entities is expected, working behavior, not a data-quality bug to fix.

**Safety rule (`RULE-ENTITY-006`):** an abbreviation match is never sufficient on its own,
regardless of how well-known the abbreviation feels to a researcher. Always require the
country-scoping step. A search-time UI (autocomplete) can and should show *all* matching entities
for an ambiguous abbreviation rather than picking one — `search_canonical_entities()` already
returns a ranked list rather than a single winner, which is the correct shape for this; the risk
is entirely in any *batch/pipeline* code that might be tempted to take "first match" as good
enough. None of the code this package read does that (`resolveIdentity()` explicitly returns
`unresolved` on `alias.length > 1`), and this rule exists to keep it that way as new pipelines are
written for non-university entity types.

### `legacy`
The name an entity used to have, kept as a still-searchable alias after a rename. Only 1 live row
currently (the registry is young for non-university types); the concept is real and important —
see `04` for exactly where `legacy` differs from a `successor_of` relationship (same row,
renamed, vs. two rows, one succeeding the other).

**Safety rule:** a `legacy` alias should generally be paired with a note or evidence row stating
*when* the rename happened, so a source that still cites the old name can be dated correctly
against it. The schema does not currently enforce this (no rename-date column on `entity_aliases`
itself) — flagged as a possible future enhancement in `11`, not something this package can add.

### `translation`
The same name in a different language/script, when the institution itself operates
multilingually and both forms are genuinely official (not merely "how an English speaker would
refer to it"). Example, live: 27 rows, predominantly Turkish-university and Turkish-school English
forms alongside their Turkish canonical names — e.g. Boğaziçi Üniversitesi's English form,
Özyeğin's, İstanbul Teknik Üniversitesi's. The mission brief's own examples (Boğaziçi
Üniversitesi ↔ Bogazici University ↔ Boğaziçi University) are exactly this pattern, live in the
registry today.

**Safety rule:** a `translation` is not the same thing as a loose transliteration match. `07`
covers the normalization mechanics (`unaccent`, `search_key`) that make "bogazici" find "Boğaziçi"
without needing every possible transliteration spelled out as its own alias row — the alias row
should exist for the *genuinely distinct language form* (Turkish vs. English name), not for every
ASCII-folding variant of the same string, which normalization already handles for free.

### `user_submitted`
Created only by `create_or_resolve_user_submitted_entity()`, only ever unverified at creation
(`verified: false` always), and always paired with an `entity_verification_queue` row with
`source_hint='custom_fallback'`. 3 live rows. This is the one alias type with a machine-enforced
safety rule already: the database function that creates it cannot mark it anything else, and no
broader INSERT policy exists that could bypass that (migration 0039's rationale for choosing
`SECURITY DEFINER` over a policy is exactly this containment).

**Safety rule:** treat every `user_submitted` alias/entity as an open item until an
`entity_verification_queue` reviewer (human or a future verification pipeline) closes it — never
promote it to `source_verified` on the strength of the alias existing, no matter how plausible the
name looks.

## `alias_type` × `language_code`: two independent axes

A common modeling mistake this taxonomy exists to head off: treating `translation` as "the
non-English name" and everything else as implicitly English. They are independent:

- An `official` alias can also carry a `language_code` (Koç School's `VKV Koç Özel Lisesi` is
  simultaneously `official` *and* `tr`).
  `translation` is reserved for the case where the *only* thing distinguishing the alias from the
  canonical form is the language — not every foreign-language alias is a `translation`, and not
  every `translation` is a foreign-language *official* name.
- An `abbreviation` can carry a `language_code` too (a Turkish-only initialism that would be
  meaningless translated) — none observed live yet, but nothing in the schema forbids it and this
  taxonomy does not either.

## Practical resolution guidance this taxonomy implies

1. When researching a new entity's aliases, populate `official` and `translation` from the
   institution's own site (its own language switcher / legal-notice page is definitive) before
   reaching for `common`/`abbreviation`, which are better sourced from how the institution is
   actually referenced in its target audience's context (this product's own opportunity/program
   corpus, admissions guidance, news coverage).
2. Never write an `abbreviation` alias without also confirming — by direct query, the way this
   session did for `UM`/`UP`/`UPM` — whether that exact string is already attached to a different
   entity elsewhere in the registry. A collision is not an error to fix; it is a fact to record
   correctly (both rows keep the alias; resolution stays country-scoped).
3. Never delete or "correct" a `legacy` alias after a rename — the old name remaining searchable
   is a feature (a source published before the rename should still resolve), not stale data.
