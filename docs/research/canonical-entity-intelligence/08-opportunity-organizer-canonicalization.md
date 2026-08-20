# 08 — Opportunity Organizer Canonicalization

`opportunities.organization_entity_id` exists (migration 0038) but is **0/369 populated** — every
opportunity's organizer is still exactly the raw text a researcher typed into `organization`. This
document works the problem directly from that live text (171 non-null distinct values across 369
rows; 198 rows have no organizer text at all) rather than from theory, because the real strings
already contain nearly every hard case this package's framework needs to handle.

## The granularity ladder, read directly from live organizer text

The same real university appears in `opportunities.organization` at multiple, genuinely different
levels of institutional granularity — not typos, not inconsistency, but real distinctions that
collapsing to one canonical entity would erase:

| Level | Live examples (verbatim from `opportunities.organization`) |
|---|---|
| University | `Stanford University`, `Massachusetts Institute of Technology`, `MIT` |
| School/faculty within a university | `University of Pennsylvania - Wharton School`, `NYU Stern School of Business`, `Stanford University School of Medicine`, `University of Illinois Urbana-Champaign, Grainger College of Engineering`, `Perelman School of Medicine, University of Pennsylvania (Penn Medicine)`, `Rutgers University (DIMACS)` |
| Named center/initiative within a school | `Horn Entrepreneurship, University of Delaware`, `Center for Education in Mathematics and Computing (CEMC), University of Waterloo`, `Parr Center for Ethics, University of North Carolina at Chapel Hill`, `Wharton AI & Analytics Initiative, University of Pennsylvania`, `Wharton Sports Analytics and Business Initiative / Wharton Global Youth Program` |
| Named program/competition run by that center | `PennApps, University of Pennsylvania`, `MIT Battlecode`, `Wharton Global Youth Program` |

**Six distinct organizer strings trace back to the University of Pennsylvania alone** in this
369-row table: the university itself (×2 rows), "- Wharton School", "The Wharton School... (Wharton
Global Youth Program)", "Perelman School of Medicine... (Penn Medicine)", "Wharton Sports Analytics
and Business Initiative / Wharton Global Youth Program", "Wharton AI & Analytics Initiative", and
"PennApps." This is this document's central case study because it is real, live, and exercises
every layer of the ladder at once.

**Recommended rule (`RULE-ENTITY-019`, new — see `06` for the registry, this is the one rule
this document adds beyond what `01`–`07` already established):** a named school/faculty with its
own admissions process, own brand, and own official subdomain (Wharton, Stern, Perelman) earns its
own `canonical_entities` row (`entity_type='organization'`, or a case could be made for a
dedicated type — this package does not propose a schema change for this specifically, see `11`),
related to its parent university via `school_of` or `part_of`. A narrower center/initiative
(Horn Entrepreneurship, CEMC, the Parr Center) is a judgment call between (a) its own row related
`part_of` the school, or (b) an alias of the school if the center has no independent brand a
student would search for — resolve per-case, never by a blanket rule, and default to *not*
creating a row until the same center appears more than once (mirroring `RULE-ENTITY-013`'s
"don't create a system entity for one known member" logic, applied one level down). A specific
*named program* (PennApps, Wharton Global Youth Program) is a **different `entity_type`
(`program`/`competition`)**, never an alias of its provider and never merged into it — related via
`provider_for` (provider → program) matching `03`'s table.

## The host-vs-operator problem: organizers that change by edition

Live, verbatim, and the clearest single example in the whole opportunities table of why
`operated_by` needs a temporal dimension this schema does not yet have:

> `Middle East Technical University (ODTÜ); organized by Arber Kongre A.Ş. with METU faculty
> (2026 edition to be organized by Radyo ODTÜ)`

Unpacked: METU (the university) lends its name, campus, and faculty — stable across editions. The
entity that actually *runs* the event changes: a private events company (Arber Kongre A.Ş.) one
year, METU's own student radio station (Radyo ODTÜ) the next. This is not an identity ambiguity —
all three organizations are presumably already distinguishable, real entities — it is a
**relationship that is true only for a bounded time window**, and `entity_relationships` has no
`valid_from`/`valid_to` columns (unlike `entity_locations`, which does). Recording
`operated_by(Arber Kongre A.Ş. → METU-hosted-competition)` as a permanent fact would already be
wrong the following year. This is flagged as a schema gap in `11`, not worked around here.

**Interim guidance for a researcher hitting this shape before a schema fix lands:** record the
*host* (METU) as the more stable fact, worth a relationship or at minimum the existing
`opportunities.organization_entity_id` pointing at the host institution; treat the *cycle
operator* as a fact to carry in `opportunities.notes`/description text (i.e., exactly where this
live row already correctly put it) rather than forcing it into a relationship table not built to
expire. This is not a novel recommendation — it is naming what the researcher who wrote this
specific live row already did correctly, generalized as guidance for the next one.

## Location and online/residential variants: checked, not yet a live problem

The mission brief separately flags "location variant" and "online vs residential variant" as
opportunity-canonicalization risks (the same real program offered at multiple sites, or in both
online and in-person form, potentially entered as separate-looking records). Checked directly:
`opportunities.location_mode` is populated for 164/369 rows (`in_person` 103, `online` 32,
`hybrid` 29 — the other 205 unset, a data-completeness question for whoever owns this table, not
an entity-identity one) and **zero opportunities currently share the same `normalized_title`** —
meaning no location- or mode-variant duplicate exists yet in live data. Recorded as a validated
negative, not a gap to build guidance for prematurely: the right rule (when this does arise) is
that the same program in two genuinely different formats is one `program`/`competition` entity
with either two `entity_locations` rows (physical variants) or a `location_mode` distinction
already available on `opportunities` itself (online/hybrid/in-person) — not two separate
canonical entities — but this session did not need to invent that guidance in detail against zero
real examples.

## Joint / co-organizer credit: the missing `partner_of`

At least four live rows name two independent organizations jointly with no ownership implied
either direction:

- `Center for Excellence in Education, in partnership with MIT`
- `The Brewer Foundation, in partnership with New York University`
- `ETH Zurich, Department of Computer Science (D-INFK), in partnership with Hebbian`
- `Finnish Association of Philosophy and Ethics Teachers (FETO) / Philosophical Society of Finland`
  (a joint credit using "/" rather than "in partnership with" — same shape, different punctuation)

As established in `03`/`06` (`RULE-ENTITY-016`), none of these should become an `operated_by` row
in either direction, and none should be merged. The schema's `relationship_type` constraint has no
symmetric peer relationship — `related_brand` is the closest existing fit but implies shared
branding, which is not the claim here (two independent brands running one thing together *is* the
claim). This package recommends adding `partner_of` to the migration-0038 constraint as a future,
symmetric relationship type (store one row; treat the pair as unordered at the application layer,
the way the mission brief's own vocabulary already assumed it would work) — a migration-level
change flagged in `11`, not applied here.

## What this document recommends as next research (not done in this pass)

`data/research/canonical-entities/opportunity-organizer-candidates.json` proposes canonical-entity
candidates for the highest-value cluster only (University of Pennsylvania/Wharton, MIT, and the
next handful of ≥2-occurrence organizers: Stanford, CMU, Northwestern, Columbia, Boston
University) rather than all 171 distinct strings — building all 171 out to full researched
candidates (official URL, ROR/registry id where applicable, entity_type, proposed relationships)
is real work this session did not have time to finish for the long tail and should not rush.
`10` prioritizes the remaining organizers by how many opportunity rows they'd disambiguate.
