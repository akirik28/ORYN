# Ireland Technological University (TU) sector: bringing it into the spine

Fifth and, per this corridor-gap line's brief, final country for now -- after
[Netherlands](./netherlands-hbo-sector-2026-09-03.md), [Germany](./germany-haw-sector-2026-09-03.md),
[Finland](./finland-amk-sector-2026-09-03.md), and [Austria](./austria-fh-sector-2026-09-03.md).
This one is smaller than the others (5 institutions, 1 already in the catalogue) but carries a
different kind of significance the corridor scan already named: Ireland's Technological
Universities are the closest analogue in this corridor to the UK's 1992 polytechnic-to-university
conversions -- the applied-sciences institutions here didn't stay branded as a separate tier,
they became "University" by statute. That's offered as the standing explanation for why the
catalogue already held some applied-sciences institutions (the ones with "University" in the
name) and not others (the ones still branded Fachhochschule/hogeschool/ammattikorkeakoulu) --
Ireland is the country where that conversion happened recently enough that the risk of treating
a converted institution as a new, separate one was real and specifically worth checking for.

## Starting state, checked directly

`select name, city from universities where country = 'Ireland'` returned 8 existing rows,
including **Technological University Dublin** -- already present, city Dublin,
`website_url = https://www.tudublin.ie/`. Confirmed before writing anything, specifically to
avoid re-inserting it under either its current name or a stale one.

## The other 4, sourced to Ireland's statutory higher-education authority

**HEA** (Higher Education Authority)'s own "Higher Education Institutions" page -- the
institutions "with whom the HEA works under statute or who are in receipt of core public
funding" -- names exactly 5 Technological Universities among Ireland's full HEI list: Atlantic
Technological University, Munster Technological University, South East Technological
University, Technological University Dublin, and Technological University Shannon: Midlands
Midwest. TU Dublin already accounted for; the other 4 are this batch.

**HEA's own naming for the fifth one differs from what's commonly seen elsewhere.** Wikipedia
and several secondary sites call it "Technological University *of the* Shannon: Midlands
Midwest"; HEA's own list omits "of the" -- "Technological University Shannon: Midlands
Midwest." HEA's own naming is used as authoritative, being the primary statutory source, not
the more common secondary phrasing.

## The duplication risk, checked and resolved

HEA's list also includes **Dundalk Institute of Technology** as a separate, standalone entry --
confirming it has *not* converted to TU status and is genuinely a different, still-independent
institution, not a stale name for one of the 5 TUs. No old-name duplicate risk there. More
generally: none of the pre-merger Institutes of Technology (Cork IT, IT Tralee, Waterford IT, IT
Carlow, Athlone IT, Limerick IT, Galway-Mayo IT, IT Sligo, Letterkenny IT, Dublin IT, IT
Blanchardstown, IT Tallaght) appear anywhere on HEA's current list under their old names --
HEA's own list already reflects the post-merger state cleanly.

**Each merger was verified live, not assumed from general knowledge** -- the specific pairing of
which Institutes of Technology combined into which TU, and when, was confirmed via each
institution's own site plus independent corroboration, not asserted from recall:

| TU | Formed | From |
|---|---|---|
| Munster Technological University | January 2021 | Cork IT + IT Tralee |
| Technological University Shannon: Midlands Midwest | October 2021 | Athlone IT + Limerick IT |
| Atlantic Technological University | April 2022 | Galway-Mayo IT + IT Sligo + Letterkenny IT |
| South East Technological University | May 2022 | Waterford IT + IT Carlow |

## Per-row verification and city notes

All 4 website_urls live-verified by direct navigation, matching the Finland/Austria standard.
All 4 are genuinely multi-campus -- a structural fact of the merger process, not a data gap:
ATU spans Donegal/Sligo/Mayo/Galway (no single confirmed HQ page; Galway used as primary), MTU
brands itself "Cork & Kerry" (Cork used as primary, the larger of the two merging institutes),
SETU spans Carlow/Waterford/Wexford (Waterford used as primary, the larger of the two merging
institutes), and TUS spans 7 campuses with "principal campuses at Limerick and Athlone" per its
own site (Limerick used as primary). Each row's `description` carries the full campus list, not
just the chosen primary city.

## The schema question -- complete at five

Same interim as the prior four batches: `institution_type` NULL, sector fact in `description`.
**This closes the running list at five countries -- Netherlands, Germany, Finland, Austria,
Ireland -- covering roughly 275 institutions total across this corridor-gap line.** The founder's
decision on a dedicated academic-tier column is now about a known, fully-scoped population, not
an open-ended one that might grow with the next country someone thinks to check. If the decision
lands, all five batches carry the same NULL-plus-description interim and would need the same
follow-up UPDATE once a real column exists.

## Validation

- **Duplicate check against existing DB**: confirmed directly before writing (see above) --
  8 existing rows, TU Dublin among them, correctly excluded from this batch.
- **Internal duplicate check**: 4 names, case-insensitive, all unique; zero collisions with the
  8 existing rows (TU Dublin included).
- **Live dry-run**: single `begin;...rollback;` transaction, all 4 inserts clean. Inside the
  transaction: 8 existing + 4 new = 12 total Irish rows, all 4 new rows showing both
  `institution_type is null` and `website_url is not null`. Rolled back; a separate, fresh
  post-rollback query confirmed the count is back to 8.
- **Enum values reused from the prior four batches**: `data_confidence = 'high'`, `data_status
  = 'fresh'`.

## Staged SQL

`data/research/sql-dry-runs/universities/ireland-tu-2026-09-03.sql` -- 4
`insert into universities (...)` statements (TU Dublin deliberately not re-inserted), dry-run
validated as above, not yet applied to the live database.
