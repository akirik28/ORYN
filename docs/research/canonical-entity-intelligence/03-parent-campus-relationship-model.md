# 03 — Parent / Campus Relationship Model

`entity_relationships` exists, is schema-complete, and is almost entirely unpopulated: **9 rows**
against 1,000+ live entities as of this session. The 9 that exist are real, well-evidenced, and
form the best available worked-example set for this document — this section reads them closely
rather than inventing hypotheticals, then maps the mission brief's own suggested relationship
vocabulary onto the schema's actual `relationship_type` constraint and states exactly where they
diverge.

## The live constraint

```text
relationship_type in (
  'part_of', 'operated_by', 'campus_of', 'school_of', 'provider_for',
  'member_of', 'successor_of', 'predecessor_of', 'related_brand'
)
```

`subject_entity_id <> object_entity_id` is enforced, and `(subject, relationship_type, object)`
is unique — a pair can hold more than one *kind* of relationship simultaneously (rare, but not
forbidden), but not the same kind twice.

## Reading the 9 live rows as worked examples

**École Polytechnique `member_of` Institut Polytechnique de Paris.** Evidence: ROR's own
`relationships` field marks IP Paris as École Polytechnique's `parent`. Modeled as `member_of`
rather than merged, with an explicit note: *"each retains its own legal identity, admissions
process, and... a 220-year-older institutional history predating the 2019 federation."* This is
the correct call and the clearest live illustration of question 7 in `01`: a federation/consortium
member is never the same entity as the federation, no matter how tightly integrated. Two more
federation-shaped candidates this package found in the wider registry but which have **no**
`entity_relationships` row yet: PSL (Paris Sciences & Lettres, home to Université Paris
Dauphine - PSL) and, more distantly, the University of California system (10 `UC*` campuses, each
already its own `universities` row per the live duplicate-pair data in `09`, e.g. UC Berkeley/UCLA/
UCSD/UCSB/UC Davis). Neither is this package's to create — both are flagged as candidates in `10`.

**Bilkent University `school_of` BELS and BLIS.** A university operating K-12 laboratory schools.
`school_of` here means "this school belongs to this university's institutional family," the
mirror-image direction of a school being `part_of` a non-university operator (below). Notice the
schema's choice here: BELS/BLIS are `subject`, Bilkent University is `object` — i.e.
`school_of` reads as "X is a school of Y," not "Y operates a school called X." Get the direction
right when writing new rows; reversing subject/object silently changes the claim's meaning even
though the row would still validate.

**MEF Okulları `part_of`-receiving three schools; İSTEK Okulları two; Terakki Vakfı Okulları one
(with two more explicitly deferred).** All three are the same shape: a non-university
`organization`-type entity representing a Turkish foundation/holding school system, with
individual `school`-type campuses/curricula each keeping their own row and pointing `part_of` at
the system. This is the general pattern this document generalizes as the **school-group model**
below. The Terakki case is additionally valuable *because it is incomplete*: the still-open
`entity_verification_queue` item reads (verbatim) *"Entity granularity unresolved: IB provider
name Terakki Foundation Schools can represent a broader school-system/campus layer while current
official site has separate Levent Lisesi, Levent Fen Lisesi and Tepeören Anadolu Lisesi. Do not
merge until exact IB-to-school mapping is resolved."* — a live, correctly-unresolved instance of
question 10 in `01`. This package does not attempt to resolve it either; naming it here is meant
to keep it visible as the canonical example of "ambiguous, and that's fine."

## Generalized relationship semantics

| `relationship_type` | Subject is... | Object is... | Distinguishing test |
|---|---|---|---|
| `part_of` | A component with its own legal/operational identity | A larger organization/system that owns or federates it | Would the subject still be recognizable/nameable if the object disappeared? If yes, `part_of`, not the same row. |
| `campus_of` | A physical location of an institution | The institution | Same legal entity, different address — reserved for true single-institution multi-site cases (a branch campus with no independent admissions/degree-granting identity). **Zero live rows** — but this now reads as a correct, explained zero rather than an unexplained gap: `entity_locations` (a separate table, `03` addendum below) is what the live data actually uses for "same entity, multiple physical sites" — e.g. British International School Istanbul (BISI) has two `entity_locations` rows (Etiler STEAM Campus, Zekeriyaköy Forest Campus) under one `canonical_entities` row, not two entities linked by `campus_of`. A `campus_of` *relationship* row would only be the right tool if a specific campus were significant enough to arguably deserve its own entity row while still being legally the same institution — genuinely rare, and not encountered in live data yet. |
| `school_of` | A K-12 or preparatory school | A university that operates/sponsors it | Direction matters (see Bilkent above) — subject is always the smaller/dependent entity. |

**A first `campus_of`-or-`member_of` candidate, found late in this session — genuinely
undetermined, not resolved here.** `10`/`11`'s "P2 — add a `campus_of` example" item flagged
this as unencountered in live data; ROR has a real, concrete case ORYN's registry doesn't
contain yet: **University of Nottingham Malaysia Campus** (`ror.org/04mz9mt17`, Semenyih) and
**University of Nottingham Ningbo China** (`ror.org/03y4dt428`, Ningbo) both carry an explicit
ROR `parent` relationship to **University of Nottingham** (`ror.org/01ee9ar58`, the UK
institution already live in ORYN's registry) — confirmed live against `api.ror.org` this
session. This is genuinely a candidate for either `campus_of` or `member_of`, not cleanly one or
the other, because the deciding fact — whether the Malaysia/China campuses have their own
independent admissions process (this table's own `campus_of` bar) or share the UK institution's
— was not confirmed this session; two live web-fetch attempts against the university's own site
did not return usable content (one 404, one returned only page chrome), and this package's own
standard is to record an unresolved verification honestly rather than assume either answer.
ROR's own `parent`/`child` relationship type is not itself decisive either way — the same field
also links University of Nottingham to clearly-different-shape things (a spin-off company, a
research institute), so "ROR calls it a child" is a signal worth having, not proof of `campus_of`
specifically. **Recommendation**: if/when ORYN's registry acquires either campus (plausible —
both are real, ranked, English-medium institutions a student researching UK-adjacent options
might target), check the campus's own admissions page directly before choosing between
`campus_of` and `member_of` — both ROR ids above are ready to use as `entity_external_ids`
either way, so this note saves the identity-research step, not the relationship-classification
one.
| `operated_by` | Any entity | The organization that runs it day-to-day, which may not be its namesake | The general-purpose "who actually runs this" relationship — see `08` for its central role in opportunity-organizer modeling, including operators that change by edition/cycle. |
| `provider_for` | An organization | A program/competition/scholarship it provides | Distinguishes the provider (an `organization`/`university`/`opportunity_provider` entity) from the specific offering (a `program`/`competition`/`scholarship` entity) — see `08`. |
| `member_of` | An institution with independent identity | A federation/consortium/system it belongs to | The École Polytechnique case; a looser bond than `part_of` (a federation is usually opt-in and post-hoc, an org chart is usually not). |
| `successor_of` / `predecessor_of` | The newer / older entity | The older / newer entity | See `04` — reserved for cases where a genuine institutional discontinuity happened (merger, split, refounding) and both identities remain independently referenceable, not for a simple rename of one continuously-existing institution. |
| `related_brand` | Either | Either | The loosest tie — shared branding/naming without operational or legal integration. No live *ORYN* example yet, but `16` now documents a real, sourced, forward-looking one: UK independent schools (Harrow, Dulwich) licensing their name/brand to financially and operationally independent international schools worldwide, confirmed directly from the schools' own published relationship-disclosure pages. |

## Where the mission brief's vocabulary and the schema diverge

The mission brief suggests: `same_as`, `alias_of`, `parent_of`, `child_of`, `campus_of`,
`operated_by`, `organized_by`, `formerly_known_as`, `successor_of`, `partner_of`, `unknown_relation`.
Mapped against the live constraint:

| Mission concept | Schema equivalent | Verdict |
|---|---|---|
| `same_as` | Not a relationship at all — this is identity (`01`), resolved by merging entity references, never by a persistent `entity_relationships` row between two "same" things | Correctly absent |
| `alias_of` | `entity_aliases`, not `entity_relationships` | Correctly modeled elsewhere |
| `parent_of` / `child_of` | `part_of` (inverse direction) covers the org-chart case; `member_of` covers the federation case | Covered, via two more specific types rather than one generic pair — an improvement, not a gap |
| `campus_of` | Present verbatim | Covered, unpopulated |
| `operated_by` | Present verbatim | Covered |
| `organized_by` | Not present as its own type | **Real gap for opportunities specifically** — `operated_by` is the closest fit but conflates "who legally operates this entity" with "who is running this specific cycle/edition," which are different claims for exactly the METU/Arber-Kongre/Radyo-ODTÜ case in `08`. Flagged in `11`, not fixed here. |
| `formerly_known_as` | `legacy` alias type, or `successor_of`/`predecessor_of` depending on whether one row or two | Covered, but by a different mechanism depending on case — see `04` for the decision rule |
| `successor_of` | Present verbatim | Covered, unpopulated |
| `partner_of` | **Not present** | **Real gap.** The live `opportunities.organization` text already contains multiple explicit "in partnership with" joint-organizer strings (`08`) with no relationship type to express "these two co-organize this, neither owns the other." `related_brand` and `member_of` are both a poor fit (neither implies the loose, often single-instance nature of a co-organizer credit). Flagged as a migration candidate in `11`. |
| `unknown_relation` | `entity_verification_queue` (as a queued, typed item) rather than a relationship row | Covered by a different, arguably better mechanism — an unknown relationship is a *task*, not a *fact*, so it belongs in the queue rather than as a row asserting "relationship: unknown" |

**Net assessment:** the live schema's vocabulary is more precise than the mission brief's starting
list in most places (splitting `parent_of`/`child_of` into `part_of` vs `member_of` vs `school_of`
is a real improvement — it captures a distinction, organizational subordination vs. federation
membership vs. school-sponsorship, that a single generic `parent_of` would flatten). The one
unambiguous, evidence-backed gap is `partner_of` for joint/co-organizer credit, with `organized_by`
as a secondary, lower-priority gap specific to cycle-varying opportunity operators.

## The school-group model, stated generally

Generalizing from MEF/İSTEK/Terakki/Bilkent to a reusable pattern for any future school-chain or
multi-campus-organization research:

1. The system/foundation/holding entity is `entity_type='organization'` (not `school`, even if
   colloquially called a "school" — e.g. "MEF Okulları"), unless it is itself a degree-granting
   institution operating satellite schools (then `university`, per Bilkent).
2. Each individually-addressable campus/curriculum with its own admissions process, its own
   physical site, or its own official page is its own `entity_type='school'` row, `part_of` (or
   `school_of`, if the parent is a university) the system entity.
3. Do **not** create the system entity at all until at least two of its schools are individually
   researched — a single-school "system" with no sibling is just the school itself, and inventing
   a parent row prematurely creates an entity with nothing distinguishing it from its only child.
4. When official evidence does not clearly separate two campuses (the Terakki Levent case), leave
   both as they currently are (whatever granularity the source material already established) and
   queue the granularity question rather than guessing a `part_of` row into existence.

## Addendum: `entity_locations` is not `entity_relationships`, and the live data already gets this right

A distinction worth stating explicitly, confirmed by reading the 3 live `entity_locations` rows
directly rather than assumed from the schema alone: **`entity_locations` (one entity, multiple
physical sites) and `entity_relationships`'s `campus_of` (two entities, a legal/organizational
tie) answer different questions, and mixing them up is an easy mistake this document exists to
head off.** British International School Istanbul (BISI) has two `entity_locations` rows —
"Etiler STEAM Campus" and "Zekeriyaköy Forest Campus," both under the *same* `canonical_entities`
row, `is_primary=false` on both (worth someone eventually deciding which, if either, is primary) —
correctly modeling "one school, two addresses," never two entities. Compare this with MEF
Okulları's three schools (`03` main text above): those are `part_of` rows between three genuinely
*separate* `canonical_entities` rows, because each has its own admissions/curriculum identity, not
merely a different building. The test: **if closing one site would not end the other's ability to
operate independently, it's one entity with multiple `entity_locations`; if the two operate with
genuinely separate admissions/identity, they are separate entities related by `part_of`/`school_
of`.** The third live `entity_locations` row (Şişli Terakki Tepeören Anadolu Lisesi's "Tepeören
Campus," `is_primary=true`) has a notes field that states its own purpose directly: *"this location
prevents collapse into Terakki Levent schools"* — a researcher using `entity_locations` explicitly
to keep the Tepeören/Levent granularity question (`03` main text, the still-open
`entity_verification_queue` item) from being accidentally resolved by an address field rather than
real research. This is exactly the discipline `RULE-ENTITY-002`/`013` argue for, already being
practiced correctly in this one small table.
