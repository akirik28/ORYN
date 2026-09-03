# Germany Fachhochschule/HAW sector: bringing it into the spine

Follow-up to [docs/netherlands-hbo-sector-2026-09-03.md](./netherlands-hbo-sector-2026-09-03.md)
and the original corridor scan (`docs/applied-sciences-coverage-2026-09-03.md`) that found
Germany had 0 of an estimated "243" universities of applied sciences (Fachhochschule/HAW
sector) in the `universities` table — the corridor doc's own largest single gap, and, per
DAAD, the sector roughly 40% of all German higher-education students attend.

CEO gated this batch on two conditions given the 7x jump in scale versus the Netherlands
batch: settle the registry's own authority on a small sample before extracting all of it,
and be explicit about what was verified per-row versus trusted-from-registry at full scale.
Both are addressed below, in that order, before the data itself.

## Part 1: the registry question, settled before extracting anything

**The real count is 192, not 243.**

- **Source**: Hochschulkompass, run by HRK (Hochschulrektorenkonferenz — the German
  Rectors' Conference, the universities' own national self-governance body). Its live
  institution search (`hochschulkompass.de/hochschulen/hochschulsuche.html`) has a
  `Hochschultyp` filter with five official categories — read directly from the page's own
  HTML form fields, not guessed: `Universitäten` (122), `Fachhochschulen / HAW` (**192**),
  `Künstlerische Hochschulen` (56), `Verwaltungshochschule` (9), `Hochschulen eigenen Typs`
  (9). All five sum to exactly 388, the site's own total headline count — confirming these
  are a clean partition with no overlap, not an undercount.
- **Where "243" came from, and why it isn't used**: the corridor doc's own citation was
  "(DAAD-sourced figure)," with no link. DAAD's own current page
  (`daad.de/en/studying-in-germany/universities/haw/`) says only "more than 200 HAW/FH" —
  consistent with 192, not contradicting it. A web search surfaced "243" repeated on a
  third-party aggregator (mygermanuniversity.com) attributing it to DAAD, but it could not
  be traced to any DAAD primary page. This is not two authoritative sources disagreeing —
  it's one precise, structured, institution-level primary source queried live today (192),
  next to one imprecise-but-consistent headline ("more than 200") and one unverifiable
  secondary repetition. Sent to CEO before extracting any rows; confirmed: proceed with 192.
- **Adjacent category flagged, not folded in**: `Verwaltungshochschule` (public-administration
  university, legally a distinct HRK type) adds 9 more institutions if bundled with
  Fachhochschule/HAW. The brief asked for Fachhochschule/HAW specifically, so those 9 are
  left out rather than silently absorbed — a decision for whoever wants that adjacent sector
  later, not made here.

## Part 2: what was verified per-row versus trusted-from-registry

Institution identity (name, Bundesland, city, Trägerschaft/sponsorship) for all 192 came
from Hochschulkompass's own paginated list view — two polite, sequential page-size requests
(the site returns up to 100 results per page), not bulk automation. Zero parsing failures,
zero duplicate names, all 16 German Bundesländer represented (not a partial or regionally
skewed pull). Two real data-quality issues were caught and fixed during construction, not
after: one institution's own name contains the literal word "Trägerschaft"
("...Hochschule für angewandte Wissenschaften **in Trägerschaft** der Wirtschaftsakademie
Schleswig-Holstein"), which broke a naive field-boundary regex and had to be corrected by
hand against the source page; five institution names had embedded double-spaces or a raw
newline character from the source markup, normalized before insertion.

**Website URLs were NOT bulk-extracted, and that's a deliberate, respected boundary, not a
shortcut.** A first attempt to fetch all 192 detail pages concurrently in the background
triggered Hochschulkompass's Enodia bot-protection (HTTP 400, an explicit verification
challenge) — the site actively defends against bulk automated access to its detail pages.
That block was respected, not routed around: no header spoofing, no solving the challenge,
no disguised slow-drip scraping of all 192 pages to get the same result more quietly.
Instead: **10 of 192 (5.2%) have a live-verified `website_url`**, obtained via genuine,
one-at-a-time browser navigation (not fetch) spanning different states and sponsorship
types (public, private, and one dual-study institution), cross-validated against each
page's own `title` attribute naming the institution. One of those eleven spot-checks
(Fachhochschule für Sport und Management Potsdam) turned out to have no website registered
on its own Hochschulkompass page at all — a genuine absence, not a failed fetch, left NULL
rather than guessed. **The remaining 181 (94.3%) have `website_url` left NULL** — not
fabricated, not scraped around the site's own protection. This is a smaller resolved
fraction than the Netherlands batch (35/36, where DUO's dataset carried the website field
directly in the same CSV with no extra per-institution fetch required), and that gap is the
honest cost of respecting Hochschulkompass's access controls rather than defeating them.

## Part 3: the schema question — no longer a Netherlands-only question

Same interim as the Dutch batch, for the same reason: `universities.institution_type` is
occupied table-wide by US College-Scorecard-style ownership classification (`university`,
`Public`, `Private not for Profit`, etc, 1,000+ existing rows) — a different axis from the
WO/HBO-equivalent, university/Fachhochschule academic-tier distinction this data needs.
`institution_type` is left `NULL` on all 192 rows; the Fachhochschule/HAW fact, plus
Bundesland and Trägerschaft (sponsorship type — public / private-state-recognized /
church-sponsored-state-recognized), is recorded in `description` instead, which is unused
for every existing German row, so nothing collides.

**Germany is now the second country with this exact gap**, and CEO's framing from the
Netherlands round applies with more force here: a column added for one country leaves the
catalogue half-labelled, which is worse than uniformly unlabelled. This isn't a
Netherlands-specific quirk anymore — it's the same axis, twice, and the corridor scan
already named more countries with the identical split (Austria's FH sector, Ireland's
Technological Universities, Finland's AMKs, Switzerland's Fachhochschulen). The founder
decision this needs — a dedicated column, applied consistently across every country with
the distinction, not invented per-country as each one comes up — is now waiting on two
countries' worth of data, not one.

## Coverage by Bundesland and Trägerschaft

| Bundesland | Count |
|---|---|
| Baden-Württemberg | 33 |
| Nordrhein-Westfalen | 30 |
| Bayern | 23 |
| Berlin | 18 |
| Hessen | 14 |
| Brandenburg | 14 |
| Niedersachsen | 13 |
| Rheinland-Pfalz | 8 |
| Sachsen | 7 |
| Schleswig-Holstein | 7 |
| Hamburg | 7 |
| Thüringen | 5 |
| Sachsen-Anhalt | 5 |
| Bremen | 3 |
| Mecklenburg-Vorpommern | 3 |
| Saarland | 2 |
| **Total** | **192** |

| Trägerschaft (sponsorship) | Count |
|---|---|
| öffentlich-rechtlich (public) | 101 |
| privat, staatlich anerkannt (private, state-recognized) | 74 |
| kirchlich, staatlich anerkannt (church-sponsored, state-recognized) | 17 |

All 192 institution names, cities, Bundesländer, and Trägerschaft values are in the staged
SQL file below (in `description`, per row) — not duplicated into a 192-row table here.

## Validation

- **Duplicate check against existing DB**: queried `select name, city from universities
  where country = 'Germany'` directly — 49 existing rows (not the corridor doc's "43";
  a minor, unreconciled drift, reported as counted rather than repeated uncritically), all
  traditional research universities (Universität/TU/etc), zero Fachhochschule-named
  institutions among them. Confirms the "0" side of "0/243" — now "0/192" — directly, not
  by trusting the earlier doc's claim.
- **Internal duplicate check**: 192 names, case-insensitive, all unique. Zero
  case-insensitive collisions with the 49 existing German rows.
- **Unique-index awareness**: `universities_name_country_idx`, the live unique index on
  `(lower(name), country)` found via `pg_indexes` (not `pg_constraint`, which misses it —
  same blind spot as `university_requirements`'s equivalent index from earlier this
  session), checked before writing anything.
- **Live dry-run**: 192 inserts split into five `begin;...rollback;` transactions (40, 40,
  40, 40, 32 statements), each independently clean — every chunk showed the existing 49
  plus that chunk's own new rows, matching exactly. A fresh, separate post-rollback query
  confirmed the German row count is back to 49 — zero persistence.
- **Enum values reused from the Netherlands batch, not re-derived from guesswork**:
  `data_confidence = 'high'` (official/HRK-adjacent national registry, same standard as
  DUO), `data_status = 'fresh'` (retrieved today).

## Staged SQL

`data/research/sql-dry-runs/universities/germany-haw-2026-09-03.sql` — 192
`insert into universities (...)` statements, dry-run validated as above, not yet applied
to the live database. Ready to apply as-is; the 10 rows with a verified `website_url` and
the 182 without are both explicit in the file, not merged into an undifferentiated batch.
