# Finland ammattikorkeakoulu (AMK) sector: bringing it into the spine

Follow-up to [docs/netherlands-hbo-sector-2026-09-03.md](./netherlands-hbo-sector-2026-09-03.md)
and [docs/germany-haw-sector-2026-09-03.md](./germany-haw-sector-2026-09-03.md), closing out
the applied-sciences corridor-gap line of work from `docs/applied-sciences-coverage-2026-09-03.md`
for now. Of the countries that scan flagged, this one carries the most weight: per that
research, Finland's ammattikorkeakoulu (AMK, university of applied sciences) sector is
specifically the route into Finnish higher education that opens without the university
entrance-exam gauntlet -- for a Turkish applicant, the more accessible path this product
claims to help find. The catalogue held zero of it. Finland's 9 in-corridor institutions
were, until this batch, all traditional research universities (yliopisto) -- confirmed
directly (`select name, city from universities where country = 'Finland'`), not assumed.

## The real count: 22

Two sources, cross-corroborated, both sector-authoritative:

1. **Vipunen** (vipunen.fi), the joint statistics reporting portal of OKM (the Ministry of
   Education and Culture) and Opetushallitus (the Finnish National Agency for Education).
   Its "University of applied sciences (UAS) education" page states plainly: **"There are 22
   institutions providing education that are administered by the Ministry of Education and
   Culture. In addition, Högskolan på Åland provides education in the Åland Islands and the
   Police University College works under the Ministry of the Interior."** The same page
   names all 22 explicitly. This settles which institutions exist and under whose
   administration -- the direct government-statistics equivalent of DUO's dataset.
2. **UASinfo.fi**, the Finnish AMK sector's own joint admissions website -- not a secondary
   aggregator: it coordinates the actual joint application process and the International UAS
   Exam, and its privacy notice ties it to Vallu, Finland's national entrance-examination
   service for higher-education student selection. Its contact-details page gives a physical
   address (city) and admissions email (revealing the institution's own domain) for every one
   of the 22.

No refusal was needed here, unlike some of the other corridor-gap countries in this line of
work -- both sources held up cleanly and corroborated each other on identity (22 names match
exactly across both) without needing a third source.

## Two institutions named but out of scope, on purpose

Högskolan på Åland (Åland Islands) and the Police University College (Poliisiammattikorkeakoulu,
under the Ministry of the Interior, not OKM) are both AMK-type institutions by function, named
in Vipunen's own text, but excluded from this batch: Vipunen's own statistics explicitly don't
cover them ("Vipunen's statistics only include data on the higher education institutions
administered by the Ministry of Education and Culture"), and neither appeared in UASinfo.fi's
joint contact list either. Flagged as a known, real, adjacent gap -- not silently absorbed into
the 22, and not independently re-verified against a third source to add them in this pass.

## Full per-row verification -- genuinely achievable at this scale

Every one of the 22 `website_url` values below was **live-verified by direct navigation to the
institution's own site**, not merely inferred from the admissions-email domain UASinfo.fi
provides. This is a deliberate contrast with the Germany batch (10 of 192 verified, the rest
left `NULL`) -- Hochschulkompass's own bot-protection made full coverage infeasible there;
nothing here blocked the same standard, and Finland's sector is small enough that doing it
properly, row by row, cost about twenty extra navigations rather than an infeasible 22-times
multiple. Two verification finds worth naming:

- **Metropolia's mailing address is `FI-00079 Metropolia`** -- a dedicated organizational
  postal code Finland issues to large institutions, not a literal place name. Confirmed the
  real headquarters city (Helsinki) directly from Metropolia's own "Contact Information" page
  ("Visiting address: Myllypurontie 1, Helsinki"), rather than guessing from the postal code.
- **Tampere University of Applied Sciences (TAMK) has no independent primary domain.** It
  operates under the joint "Tampere Universities" portal at `tuni.fi`, alongside Tampere
  University (the separate research university already in the catalogue) -- confirmed live by
  navigating to `tuni.fi/en/tamk`, which resolves to TAMK's real page. `website_url` is set to
  that joint-portal URL rather than a `tamk.fi` domain that no longer functions as the
  institution's real front door.

Several institutions are genuinely multi-campus (Centria: Kokkola/Ylivieska/Jakobstad; Diaconia:
five cities; Haaga-Helia: three; JAMK: two; Laurea: five; Xamk: four). Each row's `city` uses
the headquarters location as UASinfo.fi's own contact page lists it; the other campus cities are
recorded in `description`, not silently dropped.

## The schema question -- now the third country

Same interim as the Netherlands and Germany batches, for the same reason: `institution_type`
is occupied table-wide by US College-Scorecard-style ownership classification, incompatible
with the yliopisto/ammattikorkeakoulu academic-tier axis this data needs. `institution_type`
is left `NULL` on all 22 rows; the AMK-sector fact is recorded in `description`, which is
unused for every existing Finnish row.

**Finland is the third country now waiting on this founder decision** -- after the Netherlands
(WO/HBO) and Germany (university/Fachhochschule). The corridor scan's original list of
countries with the identical split also named Austria's FH sector, Ireland's Technological
Universities, and Switzerland's Fachhochschulen, still un-built. Whoever picks this decision up
should treat it as one column covering (at minimum) five known cases, not three separate
one-off notes plus two more to come.

## Per-institution table (all 22)

| Name | City | Website |
|---|---|---|
| Arcada University of Applied Sciences | Helsinki | arcada.fi |
| Centria University of Applied Sciences | Kokkola | centria.fi |
| Diaconia University of Applied Sciences | Helsinki | diak.fi |
| Haaga-Helia University of Applied Sciences | Helsinki | haaga-helia.fi |
| HAMK University of Applied Sciences | Hämeenlinna | hamk.fi |
| HUMAK University of Applied Sciences | Helsinki | humak.fi |
| JAMK University of Applied Sciences | Jyväskylä | jamk.fi |
| Kajaani University of Applied Sciences | Kajaani | kamk.fi |
| Karelia University of Applied Sciences | Joensuu | karelia.fi |
| LAB University of Applied Sciences | Lappeenranta | lab.fi |
| Lapland University of Applied Sciences | Rovaniemi | lapinamk.fi |
| Laurea University of Applied Sciences | Vantaa | laurea.fi |
| Metropolia University of Applied Sciences | Helsinki | metropolia.fi |
| Novia University of Applied Sciences | Vaasa | novia.fi |
| Oulu University of Applied Sciences | Oulu | oamk.fi |
| Satakunta University of Applied Sciences | Pori | samk.fi |
| Savonia University of Applied Sciences | Kuopio | savonia.fi |
| Seinäjoki University of Applied Sciences | Seinäjoki | seamk.fi |
| South-Eastern Finland University of Applied Sciences (Xamk) | Kouvola | xamk.fi |
| Tampere University of Applied Sciences | Tampere | tuni.fi/en/tamk |
| Turku University of Applied Sciences | Turku | turkuamk.fi |
| Vaasa University of Applied Sciences | Vaasa | vamk.fi |

## Validation

- **Duplicate check against existing DB**: `select name, city from universities where
  country = 'Finland'` returned exactly the 9 existing yliopisto rows, zero AMK-named
  institutions among them -- confirms the "0" side of the corridor gap directly.
- **Internal duplicate check**: 22 names, case-insensitive, all unique; zero collisions with
  the 9 existing rows.
- **Live dry-run**: single `begin;...rollback;` transaction, all 22 inserts clean (small
  enough not to need chunking, unlike the Germany batch). Inside the transaction: 9 existing
  + 22 new = 31 total Finnish rows, with all 22 new rows showing both `institution_type is
  null` and `website_url is not null` -- confirming the full-coverage claim structurally, not
  just by assertion. Rolled back; a separate, fresh post-rollback query confirmed the count is
  back to 9.
- **Enum values reused from the prior two batches**: `data_confidence = 'high'` (two
  corroborating official/sector-authoritative sources), `data_status = 'fresh'` (retrieved
  today).

## Staged SQL

`data/research/sql-dry-runs/universities/finland-amk-2026-09-03.sql` -- 22
`insert into universities (...)` statements, dry-run validated as above, not yet applied to
the live database.

## What's left in this corridor-gap line of work

Austria (0/21 FH institutions per the corridor scan) and Ireland (1/5 Technological
Universities) remain open. Both are smaller than Germany's batch and can wait -- not started,
not assigned as part of this task.
