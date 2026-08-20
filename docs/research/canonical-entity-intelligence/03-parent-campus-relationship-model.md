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
| `campus_of` | A physical location of an institution | The institution | Same legal entity, different address — reserved for true single-institution multi-site cases (a branch campus with no independent admissions/degree-granting identity). **Zero live rows** — flagged in `10` as worth populating once a real candidate (e.g. a university with a distinct branch campus abroad) is identified with evidence, not asserted from this session's general knowledge. |
| `school_of` | A K-12 or preparatory school | A university that operates/sponsors it | Direction matters (see Bilkent above) — subject is always the smaller/dependent entity. |
| `operated_by` | Any entity | The organization that runs it day-to-day, which may not be its namesake | The general-purpose "who actually runs this" relationship — see `08` for its central role in opportunity-organizer modeling, including operators that change by edition/cycle. |
| `provider_for` | An organization | A program/competition/scholarship it provides | Distinguishes the provider (an `organization`/`university`/`opportunity_provider` entity) from the specific offering (a `program`/`competition`/`scholarship` entity) — see `08`. |
| `member_of` | An institution with independent identity | A federation/consortium/system it belongs to | The École Polytechnique case; a looser bond than `part_of` (a federation is usually opt-in and post-hoc, an org chart is usually not). |
| `successor_of` / `predecessor_of` | The newer / older entity | The older / newer entity | See `04` — reserved for cases where a genuine institutional discontinuity happened (merger, split, refounding) and both identities remain independently referenceable, not for a simple rename of one continuously-existing institution. |
| `related_brand` | Either | Either | The loosest tie — shared branding/naming without operational or legal integration. No live example; a plausible future candidate is a university's executive-education arm marketed under a distinct brand. |

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
