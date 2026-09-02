# Catalog fill: competition / research / scholarship / internship — 2026-09-03

Assigned by the CEO session as a volume follow-up to
[`docs/opportunity-category-balance-2026-09-03.md`](./opportunity-category-balance-2026-09-03.md):
target 15-25 new records across competition, research, scholarship, and internship, same
filter (free or genuinely fundable, open internationally or at least to Turkish students, no
travel required, individually applicable), same research-handoff JSONL staging discipline,
explicitly framed as safe now that the age/grade-unverified fix
(`docs/eligibility-boolean-refactor-notes-2026-09-03.md`'s companion code change) means an
unrecorded field discloses itself to a student rather than silently passing as verified.

**Actual yield: 2 new records.** Both `category: "research"`. This document explains why,
with the full list of researched-and-rejected candidates, so the shortfall against the
15-25 target is a reported finding rather than a silent gap.

## Distribution at the start of this pass (live query, not the 2026-09-02 figure)

```sql
select category, count(*) as n
from public.opportunities
where status = 'active'
group by category
order by n desc;
```

| category | n | share of 282 active |
|---|---|---|
| summer_program | 139 | 49.3% |
| competition | 80 | 28.4% |
| research | 15 | 5.3% |
| internship | 8 | 2.8% |
| scholarship | 8 | 2.8% |
| student_program | 7 | 2.5% |
| online_program | 6 | 2.1% |
| volunteering | 6 | 2.1% |
| fellowship | 5 | 1.8% |
| entrepreneurship | 5 | 1.8% |
| conference | 2 | 0.7% |
| academic_program | 1 | 0.4% |

research/internship/scholarship together are 31 of 282 rows (11%) — genuinely thin, as the
brief said. Competition is a partial exception: 80 rows already includes nearly every major
international olympiad and academic competition for this age group (confirmed by reading the
full list before researching new candidates), so the realistic gap there is narrower than the
raw percentage suggests.

## What shipped

`data/research/opportunities/batch-catalog-fill-2026-09-03.jsonl` — 2 records, staged via the
research-handoff JSONL contract (not raw SQL), so both pass through
`decideIngestion()`'s dedup and description-quality gates exactly like any other batch.

1. **iNaturalist** (`inaturalist.org`) — free, global, community-run biodiversity citizen
   science; research-grade observations feed real academic datasets; 550,000+ species
   documented by the community. `minimum_age` is left `null`: it is not stated on the pages
   I could reach, and a follow-up fetch to `/pages/help` (looking specifically for an age
   floor) failed with a socket error rather than confirming its absence — left null and
   said so, rather than guessing a COPPA-shaped default the way the prior batch's CS50x/
   Zooniverse records also declined to guess.
2. **Winship Summer Scholars Program, virtual track** (Emory University / Winship Cancer
   Institute) — 6-week cancer-research program, `category: research`. The reason this
   passes the filter where most "prestige" research programs don't: the *virtual* track is
   explicitly carved out from the in-person track's U.S.-citizen/permanent-resident
   requirement ("applicants for the virtual-only option are not required to be U.S. citizen[s]
   or have U.S. Permanent Resident status" — official program page), and it pays a $2,400
   stipend rather than charging tuition. `minimum_age: 16`, confirmed directly ("at least 16
   years old by June 8, 2026"). `cycle_status: closed` — the 2026 cycle has already closed and
   the page says to check back in fall 2026 for 2027, so `deadline`/`start_date` are left
   `null` rather than projected forward from this year's dates.

## A dedup catch worth recording

A third candidate I had fully verified before this write-up — **Journal of Emerging
Investigators (JEI)**, `emerginginvestigators.org`, confirmed free-with-fee-waivers and
explicitly open to Turkish and other international students via its own FAQ — turned out to
already be in the catalog:

```sql
select id, title, official_url from public.opportunities
where title ilike '%emerging investigator%' or title ilike '%inaturalist%'
   or title ilike '%winship%' or title ilike '%emory%';
```

```
35f7475c-2567-4dde-ab61-c427059ff180 | Journal of Emerging Investigators (JEI) | https://emerginginvestigators.org/story
a71a7c76-1635-4fff-8027-f9b4fd865549  | Emory Pre-College Program              | https://precollege.emory.edu/programs/pre-college/index.html
```

JEI is already present and was dropped from this batch. The other hit, Emory Pre-College
Program, is a genuinely different offering from the same university — a general paid
pre-college enrichment program, not the free/stipended Winship research track — so it was not
treated as a duplicate. Flagging this because it's the reason the yield is 2, not 3: always
re-check the live catalog immediately before staging, not just at the start of a research
pass, since a candidate can look novel from memory alone.

## Researched and rejected, with reasons

Everything below was checked against a primary source (not just a search-result summary)
before being dropped. Listed so the 2-record yield reads as thorough, not under-researched.

| Candidate | Category considered | Why rejected |
|---|---|---|
| CyberStart | competition | Confirmed shut down / defunct |
| Gloria Barron Prize | scholarship | US/Canada residents only |
| Surfshark Scholarship | scholarship | A WebSearch summary claimed "open to all nationalities"; direct fetch of the official page said "currently enrolled in high school, or college/university in the United States" — US-only. The secondary source was wrong; only the primary source was trusted. |
| Journal of Student Research (JSR) | research | $50 submission fee + up to $299 publication fee — fails the free/fundable filter |
| Curieux Academic Journal | research | Contradictory cost reports across sources (one said free, another said $200); the domain first tried (`curieuxacademicjournal.com`) 404'd, and the correct domain (`curieuxreview.com`) was not independently verified before time ran out on this candidate. Dropped rather than staged on an unresolved contradiction. |
| Horizon Academic Essay Prize | competition | The official link redirected to a subdomain (`ww547.horizonacademic.org`) with the shape of a suspicious/parked redirect — treated as a red flag and dropped without further pursuit |
| World Historian Student Essay Competition | competition | Official page 404'd |
| Foldit | research | Real and free, but signup/cost/age details were inconclusive after a direct fetch — left out rather than staged with guessed fields |
| internationalinternships.com | internship | Confirmed to be a parked/for-sale GoDaddy domain, not a real organization |
| EPA high-school internship page | internship | Guessed URL path 404'd |
| Moody Scholars Catalyst Program | scholarship/research | Official page 404'd |

## Why 2, not 15-25

Competition and summer_program are not actually thin — they're the two most heavily
populated categories in the catalog already (80 and 139 rows), so a "thin category" pass
naturally has little room to add there without duplicating what's already covered. Research,
internship, and scholarship are thin, but for this age group under this filter (free or
funded, internationally open or Turkey-open, no travel, individually applicable), the set of
well-known, easily-verified options is small and mostly already in the catalog — this
session's own dedup check caught one of the three fully-verified candidates already present.
Most of the internationally-open remainder either charges a real fee (JSR, Curieux's
disputed figure), restricts by citizenship (Surfshark, Gloria Barron), or turned out not to
exist as a live, credible organization on inspection (CyberStart, internationalinternships.com,
several 404s).

This reads the same way the first category-balance batch did at 2 records: the honest
finding is that the reachable subset of "genuinely free/funded and internationally open" is
smaller than the raw category-share numbers suggest, not that research effort was cut short.
A next pass aiming to move this further would likely need either a lower bar on "genuinely
verifiable" (accepting medium-confidence secondary-source claims with a clear unverified
label) or a narrower geographic scope (e.g., Turkey-specific scholarship/internship programs,
which were out of scope for this international-first pass).
