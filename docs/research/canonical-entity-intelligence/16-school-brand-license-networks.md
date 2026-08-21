# 16 — School Brand-License Networks (UK independent schools, forward-looking research)

`entity_type='school'` currently has zero non-Turkish rows (`09`) — this document is explicitly
**anticipatory**, not an audit of existing ORYN data, unlike almost everything else in this
package. It exists because UK independent ("public") schools' international-brand-licensing
pattern is real, common, well-documented, and gives `related_brand` — the one live
`relationship_type` this package had found zero examples for anywhere — its first concrete,
sourced, real-world shape. Written now so it doesn't have to be rediscovered the first time ORYN
ingests a UK school or a "[Famous UK School] International" entry.

## The pattern, in three distinguishable shapes, each independently verified

**Shape 1 — no network (Eton College).** Eton College (charity no. 1139086, governed by "The
Provost and Fellows") has no international brand-licensing network. Searched directly; found none.
A clean contrast case: not every famous UK school has this shape, and assuming one does without
checking would be exactly the kind of guess `01`'s framework forbids.

**Shape 2 — charity-owned trademark, licensed through a subsidiary (Harrow School).** Harrow
School's name and badge are owned by its UK charity (no. 310033); a wholly-owned trading
subsidiary, Harrow International Schools Limited (HISL), sub-licenses the name/badge to
independently-owned-and-operated "Harrow-branded" schools worldwide (confirmed live: Beijing, Hong
Kong, Bangalore, New York, among others) in exchange for a fee. Confirmed directly from Harrow
International School Hong Kong's and AISL Harrow Beijing's own published "Relationship Statement"
pages — both state explicitly that "the educational, administrative, financial and other
operational responsibilities... are separate from those of Harrow School," and that school fees
are paid to the independent owner/operator, never to Harrow School or HISL. **The license can be
revoked**: a live, real example — "Harrow's Beijing school loses British name" (a 2020s licensing
dispute/termination, found via search, not independently confirmed against a primary legal
document this session) — meaning any `related_brand` row modeling this needs to tolerate a license
ending, which is exactly why `06`'s recommendation for a temporal-validity window on relationships
generally (originally motivated by the METU/Arber-Kongre cycle-operator case, `08`) applies here
too, not just to opportunity-organizer relationships.

**Shape 3 — a separate commercial operator holds the charter, not the original school itself
(Dulwich College).** More layered than Harrow: "Dulwich College International" is not simply a
department of Dulwich College — the international network operates under "an exclusive worldwide
charter agreement" and is owned by a distinct company, Education in Motion, not by Dulwich College
itself. A further wrinkle, confirmed live: in mainland China specifically, the actual
locally-registered legal entity carries a wholly different name required by Chinese education
law — "Dehong Senior High School" (德闳高级中学), operating under the Dulwich brand and curriculum
but not named "Dulwich" in its own jurisdiction's registration at all. This is a real,
concrete example of the `alias_type='official'` + `language_code` pattern `02` already
documents (a jurisdiction-required local legal name, not a translation of convenience) — arising
here at the school level, in a country other than Turkey, exactly the generalization `02`'s own
text says it is written to support.

## What this means for ORYN's future canonicalization of these schools

1. **Never model a brand-licensed international school as `part_of`, `campus_of`, or `school_of`
   the original UK school.** All three shapes above are explicitly, sourced-confirmed operationally
   and financially independent — the correct relationship, when evidence supports it, is
   `related_brand`, the loosest tie in the live constraint, which is exactly what it was defined
   for. This is a direct extension of `RULE-ENTITY-003`'s "a shared parent/system does not make two
   entities the same entity" to a new, brand-driven (rather than ownership-driven) version of the
   same principle.
2. **Do not assume the relationship exists without evidence per school.** Not every "[UK School]
   [City]"-named institution is a licensed franchise — some are unrelated schools that merely
   share a word (the same caution `12` already applies at the university level). Check each one's
   own "relationship statement" or equivalent page — Harrow's and Dulwich's own sites publish this
   proactively, which is unusually good practice worth noting; not every network will be this
   transparent.
3. **Expect a jurisdiction-specific legal name distinct from the brand name** for any
   internationally-licensed school operating in a country with strict private-school registration
   rules (China is the confirmed example; plausible elsewhere) — research the `official`-type
   alias in the operating country's own language/register, not just the brand name translated.
4. **A meaningful number of famous UK schools are also English place names** — Eton, Harrow, and
   Rugby (School) all share their name with the town/borough they sit in; this session did not
   individually re-verify Winchester, Malvern, or Shrewsbury but flags them as the same shape by
   pattern, unconfirmed. This connects directly to `15`'s finding that `entity_type='city'` has
   zero rows: once city entities exist, "Harrow" as a school-name lookup will need the same
   country/entity-type-scoped disambiguation this package's alias framework (`02`) already
   requires for institutions — a real future collision between `entity_type='school'` and
   `entity_type='city'` search results, not merely a school-vs-school one.

## What this document does not do

Does not create any `canonical_entities` row (none exist for these institutions yet). Does not
exhaustively catalogue every UK school with an international network — Wellington College, King's
College (multiple international brands), Repton, and others are known by general awareness to
follow a similar pattern but were not individually verified this session; naming them here is
flagged explicitly as unconfirmed, not asserted as researched fact, consistent with this package's
standing discipline throughout.
