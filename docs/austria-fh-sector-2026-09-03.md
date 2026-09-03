# Austria Fachhochschule (FH) sector: bringing it into the spine

Fourth in the applied-sciences corridor-gap line, after
[Netherlands](./netherlands-hbo-sector-2026-09-03.md), [Germany](./germany-haw-sector-2026-09-03.md),
and [Finland](./finland-amk-sector-2026-09-03.md). Austria's `universities` rows were, until
this batch, all 10 traditional research universities -- confirmed directly (`select name, city
from universities where country = 'Austria'`), zero Fachhochschulen. Matches the corridor scan's
"0/21".

## The count: 21, triple-corroborated

Three independent-vantage-point sources, all naming the same 21 institutions:

1. **BMFWF** (Bundesministerium für Frauen, Wissenschaft und Forschung -- the Austrian federal
   ministry), its own "Liste Fachhochschulen" page: 21 institutions, bare names, no addresses.
2. **FHK** (Österreichische Fachhochschul-Konferenz), the FH sector's own self-governance body
   (the Austrian equivalent of HRK): its member-representative list, one leadership contact per
   institution, "21 Personen."
3. **fachhochschulen.ac.at**, FHK's own public study-guide portal, listing "all universities of
   applied sciences" with a detail page per institution.

A ministry, a sector self-governance body, and that body's own public-facing directory are three
genuinely different organizational vantage points, not three copies of the same list -- and all
three landed on 21, matched name-for-name (allowing for legal-name vs. brand-name differences,
e.g. BMFWF's "Fachhochschule des bfi Wien GmbH" = fachhochschulen.ac.at's "UAS for Business &
Society BFI Vienna"). No fourth source was pursued; three independently agreeing is the stopping
condition, not a floor to keep raising.

## The 22nd name that isn't a 22nd institution

fachhochschulen.ac.at's public list actually shows 22 entries, not 21. The extra one, **Schloss
Hofen Weiterbildungszentrum FH Vorarlberg**, describes itself on its own page as "Schloss Hofen
als Weiterbildungszentrum des Landes und der Fachhochschule Vorarlberg" -- Schloss Hofen, as the
continuing-education center of the [Vorarlberg] state government and FH Vorarlberg -- offering
part-time professional continuing education, not standalone FH degree programmes. It's FHV
Vorarlberg's own branch, confirmed with the branch's own words, not inferred from its absence on
the other two lists. Excluded from the 21, not silently folded in.

## Full per-row website verification -- all 21

Every `website_url` below was live-verified by direct navigation to the institution's own site,
matching the Finland standard (contrasted with Germany's partial 10/192, where the source's own
bot-protection made full coverage infeasible). fachhochschulen.ac.at's own detail pages turned
out to have an inconsistent template -- some show a clean city field, others substitute a
marketing tagline in the same position -- so city and website were resolved by going to each
institution's own official site directly rather than trusting that portal's layout.

**One institution is structurally different from the other 20, and that's flagged rather than
smoothed over**: Fachhochschule für angewandte Militärwissenschaften is not an independent
campus but a Bachelor's programme (Militärische Führung, military leadership) housed at the
Theresian Military Academy (Theresianische Militärakademie) in Wiener Neustadt, part of the
Austrian Armed Forces. Its own page states the programme is open to civilian applicants, and it
carries FH accreditation and appears on all three source lists identically to the other 20 -- so
it's included -- but its website (`milak.at`) is the military academy's own site, not a typical
`.ac.at` civilian FH domain, and that's worth a reader knowing rather than discovering later.

Several institutions are genuinely multi-campus with no single confirmed "headquarters" page
(unlike, say, FHV Vorarlberg, which has one clear site): FH Kärnten (Villach/Feldkirchen/
Klagenfurt/Spittal), FH Salzburg (Puch bei Hallein/Salzburg city/Schwarzach im Pongau/Kuchl), FH
Upper Austria (Wels/Hagenberg/Linz/Steyr -- four genuinely co-equal locations), FH Gesundheitsberufe
OÖ (Linz/Ried/Steyr/Vöcklabruck/Wels), FH JOANNEUM (Graz primary/Kapfenberg/Bad Gleichenberg),
and Burgenland/Wiener Neustadt (a primary site plus one or two secondary ones). For these, `city`
uses the most commonly cited primary location -- **not verified with the same single-page
confidence as the single-site institutions**, and that distinction is recorded in each row's own
`description`, not hidden behind a uniform-looking table.

## The schema question -- fourth country

Same interim as the prior three batches: `institution_type` NULL, the sector fact in
`description`. Austria is now the fourth country waiting on the founder's academic-tier column
decision (Netherlands, Germany, Finland, Austria). Ireland, covered separately (see
[docs/ireland-tu-sector-2026-09-03.md](./ireland-tu-sector-2026-09-03.md)), is the fifth and, per
CEO's brief, closes this out at "one column covering a known population of five countries."

## Per-institution table (all 21)

| Name | City | Website |
|---|---|---|
| UAS for Business & Society BFI Vienna | Vienna | fh-vie.ac.at |
| University of Applied Sciences Technikum Vienna | Vienna | technikum-wien.at |
| Hochschule Campus Wien | Vienna | hcw.ac.at |
| FHV - Vorarlberg University of Applied Sciences | Dornbirn | fhv.at |
| FH Kärnten | Villach* | fh-kaernten.at |
| University of Applied Sciences Wiener Neustadt | Wiener Neustadt | fhwn.ac.at |
| USTP – University of Applied Sciences St. Pölten | St. Pölten | ustp.at |
| IMC Krems University of Applied Sciences | Krems | imc.ac.at |
| FH Salzburg | Puch bei Hallein* | fh-salzburg.ac.at |
| HOK \| University of Applied Sciences Kufstein Tirol | Kufstein | hok.ac.at |
| FH Campus 02 | Graz | campus02.at |
| FH JOANNEUM | Graz* | fh-joanneum.at |
| FH Upper Austria | Wels* | fh-ooe.at |
| University of Applied Sciences Burgenland | Eisenstadt* | hochschule-burgenland.at |
| MCI \| The Entrepreneurial School | Innsbruck | mci.edu |
| FHWien der WKW | Vienna | fh-wien.ac.at |
| Lauder Business School | Vienna | lbs.ac.at |
| fh gesundheit | Innsbruck | fhg-tirol.ac.at |
| Ferdinand Porsche FernFH | Wiener Neustadt | fernfh.ac.at |
| Fachhochschule für angewandte Militärwissenschaften | Wiener Neustadt | milak.at |
| FH Gesundheitsberufe OÖ | Linz* | fh-gesundheitsberufe.at |

\* multi-campus; city is the most commonly cited primary location, see `description` per row.

## Validation

- **Duplicate check against existing DB**: `select name, city from universities where country
  = 'Austria'` returned exactly the 10 existing research-university rows, zero Fachhochschule-named
  institutions -- confirms the "0" side of the corridor gap directly.
- **Internal duplicate check**: 21 names, case-insensitive, all unique; zero collisions with the
  10 existing rows.
- **Live dry-run**: single `begin;...rollback;` transaction, all 21 inserts clean. Inside the
  transaction: 10 existing + 21 new = 31 total Austrian rows, with all 21 new rows showing both
  `institution_type is null` and `website_url is not null`. Rolled back; a separate, fresh
  post-rollback query confirmed the count is back to 10.
- **Enum values reused from the prior three batches**: `data_confidence = 'high'`
  (triple-corroborated official/sector-authoritative sources), `data_status = 'fresh'`.

## Staged SQL

`data/research/sql-dry-runs/universities/austria-fh-2026-09-03.sql` -- 21
`insert into universities (...)` statements, dry-run validated as above, not yet applied to the
live database.
