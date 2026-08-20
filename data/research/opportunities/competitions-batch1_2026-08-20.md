# Competitions batch 1 — 2026-08-20

Focus: fill thin fields in the competition category — philosophy/humanities, additional
CS/AI, entrepreneurship, public policy/international relations, psychology. Every record
below was found via WebSearch and then confirmed by directly WebFetching the organizer's
own official domain (not a search snippet, aggregator, or prior knowledge). Dedup was
checked fresh against the live `opportunities` table (by title and by official_url domain)
immediately before each insert batch — no collisions found.

`opportunities` (category='competition'): 52 -> 63.

## Added (11)

1. **National History Day (NHD)** — National History Day, Inc. — https://nhd.org/en/
   Grades 6-12 historical-research competition (paper/performance/documentary/exhibit/website);
   school -> affiliate -> national funnel (top 2 per category advance); National Contest
   June 13-17, 2027 at University of Maryland. Fills: humanities.

2. **National High School Ethics Bowl (NHSEB)** — Parr Center for Ethics, UNC Chapel Hill —
   https://nhseb.org/
   Team-based ethical case-discussion competition, grades 9-12, accredited U.S. high schools
   only; regional -> divisional -> National Championship. 2026-27 dates not yet posted at
   verification (2025-26 season's $175/$250 fee shown as most-recently-published, flagged as
   such). Fills: philosophy.

3. **The Concord Review — Emerson Prize** — The Concord Review, Inc. — https://tcr.org/
   Quarterly journal publishing ~5% of submitted high-school history research essays
   (worldwide, English-language); published authors are eligible for the $1,000 Emerson Prize
   / $5,000 Fitzhugh Prize. Submission fee $70-150 depending on edition. Fills: humanities.

4. **We the People: The Citizen and the Constitution** — Center for Civic Education —
   https://www.civiced.org/we-the-people
   Constitutional-studies simulated-congressional-hearing competition, grades 6-12, U.S.
   only; state-level circuit advancing to National Finals in Washington, D.C. each spring.
   Fills: public policy / civics.

5. **International Public Policy Forum (IPPF)** — The Brewer Foundation with NYU —
   https://www.ippfdebate.com/
   Global written-and-oral public-policy debate, open worldwide, teams of 3+; written rounds
   narrow 64 -> 32 -> 16 -> 8 to the NYU Finals. 2026-27 topic (UN vs. state sovereignty on
   women's/girls' rights) is set and early-bird registration is open; exact 2026-27 essay
   deadline not yet posted. Fills: public policy / international relations.

6. **NFTE Youth Entrepreneurship Showcase Series** — Network for Teaching Entrepreneurship —
   https://nfte.com/compete/
   Local -> regional -> national -> global pitch/business-plan competition; 2026 national
   Showcase event Nov 18, 2026; participants from 20+ countries. Core-challenge grade/age
   eligibility was not stated on the page reviewed (source_confidence set to medium
   accordingly). Fills: entrepreneurship.

7. **Technovation Girls** — Technovation — https://technovationchallenge.org/
   Free global mobile-app entrepreneurship competition for girls/nonbinary/genderfluid/
   transgender participants up to age 18; Quarterfinal -> Semifinal -> World Summit. 2026-27
   season dates not yet posted at verification. Fills: entrepreneurship / CS.

8. **Congressional App Challenge** — Internet Education Foundation (for the U.S. House) —
   https://www.congressionalappchallenge.us/
   Nationwide app-development competition, middle/high school, U.S. residents in a
   participating congressional district; individuals or teams of up to 4. 2026 deadline
   October 26, 2026. Fills: CS.

9. **CyberPatriot — National Youth Cyber Defense Competition** — Air & Space Forces
   Association — https://www.uscyberpatriot.org/
   Network-defense competition, teams of 2-6, middle/high school (schools, JROTC, scouting);
   Open/All Service/Middle School divisions; online rounds to an in-person National Finals
   near Bethesda, MD. CyberPatriot XIX (2026-27) registration deadline October 1, 2026.
   Fills: CS/cybersecurity.

10. **USA Computing Olympiad (USACO)** — USA Computing Olympiad —
    https://usaco.org/
    Free, year-round competitive-programming series, Bronze/Silver/Gold/Platinum divisions,
    4 contests/season, open worldwide online; only pre-college U.S. students are eligible for
    the training camp / USA IOI-EGOI team selection. Specific 2026-27 contest dates not yet
    posted at verification. Fills: CS.

11. **International Psychology Olympiad (IPsyO)** — International Psychology Olympiad —
    https://www.ipsyo.org/
    Free global online psychology competition for students graduating high school 2027 or
    later; Qualification Round (300 MCQ) then Final Round; top 6 per country/region advance.
    Registration for the 2026 edition was already closed at verification (competition in its
    qualification/final stage); next edition not yet announced — recorded with
    `cycle_status = 'closed'` rather than reusing 2026 dates as current. Fills: psychology.

## Tried and dropped (1)

- **APA TOPSS Competition for High School Psychology Students** (apa.org/ed/precollege/topss).
  Confirmed to exist via WebSearch (video/essay competition, up to three $300 awards,
  sponsored by a TOPSS member), but every WebFetch attempt against apa.org (multiple URLs,
  multiple retries) returned empty/blank content — the page did not yield fetchable text
  through the available tooling. Per this session's provenance rule (a record is only added
  after the official page is actually fetched and read), this candidate was dropped rather
  than sourced from search snippets. Worth retrying with a different fetch method in a future
  batch — IPsyO was added instead to cover the psychology gap.

## Notes on data-trust judgment calls

- Several organizers' sites had not yet posted 2026-27 cycle dates at verification (NHSEB,
  We the People, Technovation Girls, USACO, IPPF's exact essay deadline). Per the "distinguish
  current from historical" rule, these were stored with `cycle_status = 'date_not_announced'`
  (or `'closed'` for IPsyO, whose 2026 registration window had already ended) rather than
  reusing a prior cycle's dates as if current.
- `selectivity_tier` was set to `'selective'` only where the official page described an actual
  advancement/elimination mechanism (regional-to-national funnels, publication rates,
  bracket rounds); `'unknown'` where no such mechanism was stated (Congressional App
  Challenge).
- No numeric acceptance-rate or admissions-probability language was invented anywhere in
  these records.
