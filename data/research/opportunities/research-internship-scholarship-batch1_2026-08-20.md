# Research / Internship / Scholarship — Batch 1 (2026-08-20)

Session goal: expand ORYN's thinnest opportunity categories (`research`, `internship`,
`scholarship` — 9/2/3 rows respectively vs. 220 `summer_program` and 55 `competition`)
with real, currently-verified, high-school-accessible opportunities. Every accepted
record was fetched directly from the organizer's own official domain via WebFetch
(never from an aggregator or a search snippet alone); accuracy/provenance took priority
over volume throughout, per this campaign's data-trust rules.

## Result

Live counts after this batch: **research 9 → 13** (+4), **internship 2 → 7** (+5),
**scholarship 3 → 7** (+4). 13 net-new rows, 0 rejected after insertion (all candidates
that survived research + dedup were added; several more were researched and dropped
before reaching the insert stage — see below).

## Added

### Research (4)
- **STEM Enhancement in Earth Science (SEES) Summer Intern Program** — NASA / UT Austin
  Center for Space Research. Hybrid distance-learning + on-site NASA data research
  program for current HS sophomores/juniors, 16+, US citizens only. `closed`/2026
  (deadline was Feb 22, 2026); selectivity left `unknown` — no acceptance-rate figure
  found on the organizer's own pages.
- **International Journal of High School Research (IJHSR)** — Terra Journals. Peer-reviewed
  journal, open submissions grades 9-12 internationally, no submission fee, $350
  publication fee on acceptance (waivable for free/reduced-lunch-eligible US students).
- **Journal of Research High School (JRHS)** — Journal of Research. Peer-reviewed journal,
  open to any enrolled high schooler (no grade floor), requires a named research
  advisor, $350 submission fee.
- **American Journal of Student Research (AJSR)** — Open-access journal for HS/undergrad
  authors, no submission fee, $496 APC on acceptance (hardship reductions considered
  case-by-case pre-acceptance only).

### Internship (5)
- **Summer High School Internship Program (SHIP)** — Fred Hutch Cancer Center. Paid
  8-week research internship, Seattle-area residents only (no out-of-state/international),
  16+, entering senior year. `closed`/2026.
- **Genesys Works** — Free multi-city (Houston, Chicago, Jacksonville, Twin Cities, SF
  Bay Area, DC region, NYC, Tulsa, Nashville) 8-week paid training + year-long paid
  corporate internship for rising HS seniors via partner schools.
- **Science and Engineering Apprenticeship Program (SEAP)** — Office of Naval Research.
  Paid 8-week apprenticeship in DoD labs nationwide; US citizens; $4,000-4,500 stipend.
  Next cycle `date_not_announced` (portal expected ~Sept 2026 for Summer 2027).
- **Partners for the Future** — Cold Spring Harbor Laboratory. Long Island NY-only,
  nomination-only (school science chair nominates up to 2 juniors/school) academic-year
  research internship (Sept-March of senior year).
- **Aspiring Scientists Summer Internship Program (ASSIP)** — George Mason University.
  8-week hybrid/in-person research internship, 15+ (16+ for wet labs), $25 app fee
  (waivable), optional $1,299 college-credit fee (also waivable). `closed`/2026.

### Scholarship (4)
- **The Gates Scholarship** — Last-dollar full-cost-of-attendance scholarship, Pell-eligible
  HS seniors, 3.3+ weighted GPA, US citizen/national/permanent resident. Deadline
  Sept 15, 2026 (open).
- **Coolidge Scholarship** — Calvin Coolidge Presidential Foundation. Need-blind full-ride
  (4 years tuition/room/board), current HS juniors only, US citizen/permanent resident.
  2026-27 cycle deadline not yet posted by the Foundation (`date_not_announced`).
- **Cooke College Scholarship Program** — Jack Kent Cooke Foundation. Last-dollar award up
  to $55,000/year, HS seniors with financial need. Deadline Nov 11, 2026 (open).
- **Ron Brown Scholar Program** — $40,000 ($10,000/yr x4) for Black/African-American HS
  seniors, US citizen/permanent resident. Next deadline Dec 1 (per organizer's own page).

All 13 rows use `source_confidence: high` (every source is the organizer's own primary
domain — university department page, foundation site, or a `.navy.mil` government page)
and `verification_state: verified_current`, `verified_at: 2026-08-20`. `selectivity_tier`
was only set above `unknown`/`open_enrollment` where the organizer's own page gave a
concrete basis (e.g. a stated multi-step eligibility/GPA/financial-need gate for
scholarships → `competitive_award`; an explicit "highly selective" characterization for
Clark-Scholars-style single-digit-cohort programs — none of this batch's records made
an unearned `extremely_selective`/`highly_selective` claim from an aggregator-only
number). Reasoning for each tier is folded into the row's `description` text, since the
live `opportunities` table has no separate `selectivity_evidence` column.

## Tried and dropped

**Organizational duplicates caught by a fresh dedup check right before insert** (this is
the important operational finding of this session — a concurrent summer-programs pipeline
had, in the hours before this session ran, already loaded several genuinely
research-flavored programs under `category = 'summer_program'`):
- **Simons Summer Research Program** (Stony Brook) — already in DB as `summer_program`.
- **Garcia Summer Research Program** (Stony Brook) — already in DB as `summer_program`
  (twice: `Garcia Summer Research Program` and `Garcia Summer Scholars`).
- **Anson L. Clark Scholars Program** (Texas Tech) — already in DB as `summer_program`
  (twice, two different official_url paths).
- **Polygence** — already in DB as `summer_program` (official_url exact match to the
  organization's root domain).
- **Lumiere Education / Lumiere Research Scholar Program** — already in DB as
  `summer_program` (official_url exact match).
- **The Concord Review** — already in DB as `category = 'competition'`
  ("The Concord Review - Emerson Prize"); the general submission/publication pathway
  researched here is the same underlying organization and mechanism, so a second row
  would have been an organization-level duplicate rather than a distinct opportunity.

All six were fully researched (eligibility, cost, dates confirmed via direct WebFetch of
their official pages) before the dedup check caught them — the research wasn't wasted,
but per this campaign's rule ("if a candidate already exists under any title, skip it")
none were inserted, and none of their `summer_program`/`competition` rows were touched.

**Internship candidates rejected for not actually being high-school-accessible** (the
founder's specific concern — programs that market to "high schoolers" but gate the real
age/enrollment requirement to post-graduation 18-year-olds):
- **Bank of America Student Leaders Program** — official FAQ page states applicants must
  "be at least 18 years of age at the time of application," have already earned a HS
  diploma "within the last 2 years," and have "earned at least 12 hours and no more than
  18 credit hours of post-secondary credit." This is an early-college program, not a
  currently-enrolled-high-schooler program, despite marketing copy elsewhere describing
  it as being for "high school juniors and seniors." Dropped.
- **JAX Summer Student Program** (Jackson Laboratory) — high school applicants "must have
  completed grade 12 by program start and be at least 18 years old by program start";
  the program explicitly does not accept students who haven't yet graduated. Same pattern
  as Bank of America above — dropped for the same reason, even though JAX's own outreach
  page is filed under "high school students."
- **NIH Summer Internship Program (SIP)** — eligibility is also graduated-senior/18-leaning
  (17-year-olds only qualify if living within 40 miles of an NIH campus), AND the official
  `training.nih.gov` pages returned HTTP 403 on every fetch attempt (repeated, not
  transient) — so this was dropped on both the accessibility concern and, independently,
  on the inability to directly verify via WebFetch as this campaign's rules require.

**Dropped solely because the official domain could not be fetched** (403/connection-reset
on every retry, so the "must WebFetch the organizer's own page" rule could not be
satisfied, even though the underlying program is very likely real and well-known):
- **Elks National Foundation Most Valuable Student Scholarship** — `elks.org` returned
  `ECONNRESET` on every attempt.
- **Horatio Alger Association National Scholarship** — `horatioalger.org` and
  `scholars.horatioalger.org` returned HTTP 403 on every attempt.
- **Journal of Student Research (JSR, jsr.org)** — returned HTTP 523 (origin unreachable)
  on every attempt; could not confirm the site is currently live.
- **Cameron Impact Scholarship** — `bryancameroneducationfoundation.org` returned HTTP 403.
- **National Merit Scholarship Corporation** — `nationalmerit.org` returned HTTP 402.
- **Dell Scholars Program** — `dellscholars.org` returned HTTP 403 on every path tried.
- **Euler Circle** — `eulercircle.com` returned HTTP 403 on every path tried.

**Dropped for uncertain current status:**
- **Michigan State University HSHSP** (High School Honors Science, Math and Engineering
  Program) — multiple secondary sources indicate the program did not run in summer 2025
  with no confirmation it has resumed; could not verify it is currently running, so
  dropped per "if you can't verify something exists/is currently running, drop it."

## Method note

Every accepted record's `description` folds in the selectivity/eligibility reasoning
(GPA thresholds, financial-need gates, stated cohort sizes, etc.) actually quoted from
the organizer's own page, since the production `opportunities` table has no separate
`selectivity_evidence` column (unlike the idealized `ResearchOpportunityRecord` contract
in `lib/opportunities/ingest.ts`) — this mirrors how the existing CMU SAMS / SSTP rows
in the table already carry that reasoning as prose rather than a structured field.
Several facts search summaries reported confidently (e.g. a specific SEAP minimum age of
16, or a Coolidge "3-5 scholars nationally" figure) were deliberately **not** stored
because they came from aggregator pages or search-summary text rather than a page this
session actually WebFetched itself — left null / omitted rather than asserted, per the
"no fabricated facts" rule.
