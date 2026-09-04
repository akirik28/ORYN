# D2 — opportunities checked, official page didn't say (2026-09-04)

Running record so a later D2 batch doesn't re-fetch the same page and hit the same wall.
Append to this file, don't replace it, as each batch runs. Each row: what was missing, which
URL was actually fetched, and why it didn't resolve the field — not a guess at the answer,
a record of the dead end.

## Batch 1 (nearest-deadline 15, researched 2026-09-04)

| Opportunity | id | Missing | URL fetched | Why it didn't resolve |
|---|---|---|---|---|
| Boston University Tanglewood Institute | `c7c21f3f-fb33-4c6c-be76-66da4df0535d` | country | `https://www.bu.edu/cfa/tanglewood/` | Landing page only describes attendee diversity ("from across the country and around the world"), never states an eligibility policy. Needs the admissions/audition subpage, not fetched this pass. |
| World Wildlife Day International Youth Art Contest | `13d9416e-d2a7-4f55-b851-7d76acab2cb3` | country | `https://signup.ifaw.org/en-us/art-contest` | "International" in the contest's own name only — no explicit open/restricted statement on the page fetched. |
| BrUMO (Brown University Math Olympiad) | `6f0daac1-7f07-45da-a330-dc900be73ab9` | age | `https://www.brumo.org/` | No eligibility section on the page at all; page suggests contacting brumo@brown.edu directly. Needs the registration page, not fetched this pass. |
| Northwestern NHSI ("The Cherubs") | `2541b2e7-0782-4c88-be4a-d7be73c9e7c8` | age, country | `https://nhsi.northwestern.edu/` | Landing page has neither; the actual eligibility criteria live on each division's own page (Theatre Arts / Film & Video / Debate), none fetched this pass. |
| Sutton Trust UK Summer Schools | `27213610-1b19-4e85-b52a-50e165607159` | grade | `https://www.suttontrust.com/our-programmes/uk-summer-schools/` | Real eligibility exists (Year 12 in England/Wales, Year 13 Northern Ireland, S5 Scotland, state-funded school only) but doesn't map onto a US-style `eligible_grades` value cleanly — a schema/judgment question for whoever owns this row, not a missing-data one. Country is already correctly stored (`["United Kingdom"]`). |
| Sciences Po Summer School — Pre-College | `32b43654-2a63-4135-a91a-b492d1f8b3dc` | grade, country | `https://www.sciencespo.fr/summer-school/en/pre-college-programmes/key-information/how-to-apply/` | This page only covers language-proficiency requirements and explicitly defers to a separate Eligibility page (`.../key-information/eligibility/`), not fetched this pass. |
| Bocconi Summer School for High School Students | `0cbe26c6-c073-4ce5-9b9d-b928a3c0a7bc` | grade, country | `https://www.unibocconi.it/en/programs/summer-school/summer-school-high-school-students` | Program-overview page only (dates, subject choices); defers to a separate Info-and-Applying subpage, not fetched this pass. |
| Copenhagen Business School Summer University | `2f3ba478-aa17-4090-bdd3-117ab2185e08` | grade, country | `https://www.cbs.dk/en/study-programmes/summer-university` | Describes attendee diversity ("students from more than 50 countries") but never states an eligibility policy. Points to a separate Application-and-deadlines section, not fetched this pass. |
| ASSIP (George Mason University) | `7a0b2b4e-189d-4e7b-b4a1-ef8886e3a23d` | grade | `https://science.gmu.edu/assip` | **Resolved in batch 2's requires-0126 SQL** — not actually a gap, the official page confirms this program is genuinely age-gated only ("no maximum age limit"), no grade criterion at all. `grade_eligibility_confirmed_open: true` queued in `d2-batch2-requires-0126-2026-09-04.sql`, pending migration 0126's own application. |

## Batch 2 (next-nearest 15, researched 2026-09-04)

| Opportunity | id | Missing | URL fetched | Why it didn't resolve |
|---|---|---|---|---|
| University of Edinburgh Pre-University Summer School | `dc762fce-b83a-4217-a610-290ac2f65f17` | grade, country | `https://study.ed.ac.uk/summer-school` | Page repeats the age range (already correctly stored) but has no grade or country statement at all. |
| Zero Robotics (MIT) | `8bb401fa-d53f-45ae-8968-241ef641ccf4` | age, grade, country | `https://zerorobotics.mit.edu/` | Landing page references a "Middle School Program" and a Tournaments page but states no eligibility criteria directly; the Tournaments subpage wasn't fetched this pass. Possibly not this app's target age band at all (14-18) — a curation question, not just a data gap. |
| Bilkent University Summer Camp | `96557dbb-7c60-4097-9925-35cbd5ad9a57` | country | `https://liseyazkampi.bilkent.edu.tr/sikca-sorulan-sorular/` | FAQ page states the grade requirement (already correctly stored) but never states a nationality/country policy either way — absence, not confirmation, so left unfilled per this file's own standard (an explicit affirmative statement is required to set `country_eligibility_confirmed_open`, not just silence). |
| AI Summer Week @ ETH Zurich | `1259aa77-0b5e-4c55-a384-51dbd47de3ec` | grade, country | `https://forms.hebbian.ch/r/OD1gjp` | Page restates the age range (already correctly stored) but has no grade-level statement; country reads as "appears open" only by inference (hosted in Switzerland, no restriction mentioned) — not an explicit statement, so not used to set the confirmed-open flag. |
| NYU Precollege Program | `01f020d2-e7c5-4a7d-8154-d9ac9329d8de` | age, country | Two URLs tried (`.../nyu-precollege/application-information.html`, `.../nyu-precollege.html`) | First returned genuinely empty content; second failed with a socket error. Technical fetch failure both times, not a content gap — worth retrying with a different tool/approach next pass. |
| Girl Up Global Teen Advisor Board | `6fdf9578-f07d-448d-973e-e4990a94e7c4` | grade, country | `https://girlup.org/voices/what-you-need-to-know-about-teen-advisor-applications` | HTTP 403 Forbidden — page blocks the fetcher. Needs a different access path (the main `/programs/teen-advisors` page wasn't tried). |
| Sabancı University Summer School | `1d4f5e60-8fe3-4b1a-a7d6-acb29b124e3c` | age, grade, country | `https://liseyazokulu.sabanciuniv.edu/` | Landing page describes program history/scale (17,930+ alumni) but states no eligibility criteria at all. Needs a deeper application subpage, not fetched this pass. |

**Confirmed genuinely accurate, no gap**: Immerse Education and Penn Pre-College Program (Residential) both had explicit "open to international students" language and are now filled (see the batch's own SQL); Özyeğin, Penn Medicine, and İTÜ all had explicit "all high school students may apply" language and are now filled for grade. Geleceği Eşitle's single-country value was checked specifically against CEO's "false single-country" pattern and confirmed CORRECT as stored (residency-gated, not nationality-gated — see the SQL file's own note).

## Visible-priority batch (measured, not deadline-ordered — 2026-09-04)

CEO redirected priority after measuring: `saved_opportunities` (4 rows) ∪ `opportunity_matches`'
own top-5-per-student "actually shown" set (mirroring `lib/opportunities/home-strip.ts`
exactly) = 34 distinct opportunities, 33 of which carry a gap — a small, high-leverage set
worth its own tracking section rather than folding into the deadline-ordered batches above.

**Re-measured after this round, per CEO's own explicit requirement** (finish, then re-run
the same query — the set isn't static and a "we fixed things" claim needs a before/after
number, not a row count). Re-running found one new entrant, Tufts Pre-College Programs
(`310c976c-1a0f-4566-8df2-2e186c898804`) — already fully resolved on every axis, needed
nothing. Projected effect of this round's SQL, computed directly against live data rather
than assumed: **33/34 gapped (97%) → 30/34 (88%) once the additions/corrections file is
applied → 29/34 (85%) once 0126 is also applied and its own file runs.** Not a dramatic
swing — an honestly small, precisely computed one, reported as such rather than rounded up.

**Two of this round's own first-draft entries were wrong, caught by that same re-check
before they became a false claim**: NYC Commuter Summer's proposed grade fill turned out to
be a no-op — the row's `eligible_grades` was already `['9','10','11','12']`, and its real
gap (both `minimum_age`/`maximum_age` null) was never actually addressed by the WebFetch
answer used to write the SQL. Removed the no-op entirely rather than count it as a fix (see
below, back among the not-found rows with its real gap named). Yale Young Global Scholars'
proposed grade value differed from what's currently stored — a **correction**, not an
addition (existing `['11','12']` vs. the official page's own "sophomore or junior" =
`['10','11']`) — moved to its own section in the SQL file, same discipline as YIS in batch 1.

6 opportunities got a sourced fill this round (see `d2-visible-priority-additions-2026-09-04.sql`
and `d2-visible-priority-requires-0126-2026-09-04.sql`). The rest:

**Confirmed already accurate, no change needed**: BRI Student Fellowship (age 15-18 AND
grade 11-12 both explicitly confirmed: "15-18 year old's who are currently Juniors or
Seniors"); Istanbul Bilgi University Summer School (grade 9-12 confirmed: "9-10-11-12.
sınıf öğrencileri... başvurabilir"); Schoolhouse.world (minimum age 13 confirmed, no
maximum stated — genuinely no ceiling, not an unresearched one).

| Opportunity | id | Missing | URL fetched | Why it didn't resolve |
|---|---|---|---|---|
| LaunchX | `50392e5e-a7ab-4de4-9ad7-fc7b51a742dc` | country | `https://www.launchx.com/` | No eligibility statement on the landing page; application portal/FAQ not fetched this pass. |
| Girl Up Project Awards | `31f4ecf4-902c-4636-bcc8-77e300d42ae5` | grade, country | `https://girlup.org/programs/project-awards` | Fetch failed (socket hang up). |
| The Duke of Edinburgh's International Award — Türkiye | `cdb9da8a-3c8d-47ea-bcee-6cf749738246` | country | `https://www.intaward.org.tr/` | Page describes the participation mechanism (through schools/youth centers) but states no nationality/residency policy either way. |
| Wharton Global High School Investment Competition | `2e2f995a-2ac3-4138-a3df-ca4e4033aa36` | age, grade | `https://globalyouth.wharton.upenn.edu/competitions/investment-competition/` | Fetch failed (socket hang up); grade already correctly stored as 9-12, only age was the real gap and wasn't reached. |
| International Public Policy Forum (IPPF) | `bc303473-ba94-41e4-9b3d-038804858a8c` | age | `https://www.ippfdebate.com/` | Fetch failed (socket hang up) both times tried; grade already correctly stored. |
| AMC - AIME | `4ce6fd8f-5a9b-4399-b168-e38c0f44c7b1` | age, grade, country | `https://maa.org/events/mathfest-program/special-sessions/` | HTTP 403. Also worth flagging separately: this `official_url` looks wrong for AMC/AIME specifically (a MathFest special-sessions page, not an AMC/AIME eligibility page) — possibly a data-quality issue on the row itself, not just a fetch failure. |
| Waterloo Mathematics and Computing Contests | `51c4b57b-7ea1-4503-b9e6-f1468dc9f3f8` | grade | `https://cemc.uwaterloo.ca/contests` | Structural mismatch, not a missing-data gap: this one row bundles multiple distinct contests (Beaver Computing grades 5-10, Gauss 7-8, Euclid grade-12-only, etc.) with different eligibility each — no single `eligible_grades` value can represent it honestly. Whoever owns this row should decide whether it should be split into several opportunity rows, not something to guess at here. |
| Blue Ocean Competition | `cb4a1030-d035-4c1f-8579-37c458a88b0e` | age, grade | `https://blueoceancompetition.org/` | Page only says "high school students/entrepreneurs" generically, no specific age or grade numbers. |
| Purple Comet! Math Meet | `e5dd5ce7-4730-42d7-84a3-b6492779b038` | grade | `https://purplecomet.org/` | "middle and high school students" stated but no specific grade numbers given. |
| STEM Fellowship Journal | `b51bf24f-42c2-419f-a456-ca86dff0ad8e` | grade | `https://journal.stemfellowship.org/journal/sfj` | HTTP 403. |
| NYC Commuter Summer — Columbia University Pre-College Programs | `3318dba7-e099-4de2-83db-f27d6697f1be` | age, country | `https://precollege.sps.columbia.edu/programs/summer-programs/nyc-commuter-summer` | Grade is already correct (`['9','10','11','12']`, confirmed by the official page's "students entering grades 9-12"). First draft of this batch mistakenly proposed re-setting grade to the same value and counted it as a fix — corrected on re-check. The real gap, `minimum_age`/`maximum_age` (both null) and country, was never addressed: the fetched text only confirmed grade. |
| Lumiere Education | `bc678344-c213-4ae8-a4f8-48af2856338f` | age, grade, country | `https://www.lumiere-education.com/lumiere-programs` | Page describes "high school students around the world" but states no specific age/grade/country criteria. |
| Young Guru Academy (YGA) | `5d2aca22-26d5-4592-a5fb-a554c7a51f50` | age, grade, country | `https://yga.org.tr/en/` | Landing page lists several sub-programs but states no eligibility criteria for any of them; each sub-program's own page not fetched this pass. |
| Research Program KUSRP 2026 | `2116709f-e222-43c7-95e0-f801053f8f2e` | age, grade, country | `https://research.ku.edu.tr/research-outreach/summer-research/kusrp/2026-highschool-projects/` | HTTP 403. |
| Two-week UM Academies (non-credit) | `889c580c-dbb6-4490-9078-9faf2a2a2ed0` | age, grade, country | `https://precollege.dcie.miami.edu/summer-programs/academies/index.html` | Page states only dates ("June 27 - July 10, 2026"), no eligibility criteria of any kind. |
| UCSB Research Mentorship Programs | `647eb8da-9cb8-46d4-8ded-b4c516f7ac90` | age, grade, country | `https://www.summer.ucsb.edu/programs/research-mentorship-program/overview` | "High school students from all over the world" — descriptive, not a stated policy; no specific grade/age numbers. |
| InvestIN - Immersive Career Experiences | `8a7c89e4-e63a-4f64-a76d-4bae1b31e889` | grade, country | `https://investin.org/collections/our-programmes` | Age range roughly confirmed (12-18 across program tiers) but no grade numbers; page references an "international students" section not fetched this pass. |
| JA Company Programme (Europe) | `55a5efea-e280-4176-bf65-49a028b097af` | grade | `https://jaeurope.org/learning-experiences/portfolio/company-programme/` | Age (15-18) confirmed, matches stored value; no grade statement — genuinely age-only is plausible but not stated with the same completeness TechGirls' page had, so not used for the 0126 flag this pass. |
| Wall Street 101 | `574ab33a-abc7-420e-893a-0b3b6f9d341e` | age, country | — | Not attempted this pass; grade already correctly stored as 9-12. |
| International Economics Olympiad (IEO) | `9193db16-7a9e-42b1-95b6-74eda83a0ac9` | country, grade | `https://ieo-official.org/` | Age resolved (see SQL). Country: participation is mediated through "official national organizers" across 74 countries — a logistics structure, not a stated open/restricted policy, so not confirmed either way. Grade: no statement found. |
| Harvard Pre-Collegiate Economics Challenge (HPEC) | `a4a24425-2a6f-4902-99a4-4fb43dc110dd` | age, grade, country | `https://www.thehuea.org/competitions/hpec` | Page states rules for the upcoming cycle "will be posted when registration opens" — not yet published, not just unfetched. |
| ODTÜ (METU) Engineering Summer School | `0c8e00c1-b2b7-4039-8021-10a310de62e4` | country | `https://metusummerschool.org/` | Age/grade already correctly stored (15-18, grades 10-12). Page describes the program for "lise öğrencileri" (high school students) with no nationality/residency statement either way. |
| Wharton Data Science Competition | `cfb32772-6259-4e3a-9ead-bc289b463d08` | age, country | `https://globalyouth.wharton.upenn.edu/competitions/data-science/` | Grade resolved (see SQL). Age/country: no statement found beyond "all current high school students." |
| International Young Physicists' Tournament (IYPT) | `b41bf5f5-d2cb-4f5d-84e5-8d9e8630af07` | age, grade, country | `https://iypt.org/` | Page describes "high school students" generically; no specific eligibility criteria on the page fetched — needs the official regulations document, not fetched this pass. |
| European Youth Event (EYE) | `1acee3b0-eaac-479a-996a-b0a2a0570351` | grade, country | `https://european-youth-event.europarl.europa.eu/` | Age (16-30) already correctly stored. Country: page cites "160 different nationalities" among past attendees — descriptive attendee statistics, not a stated open-to-all policy, so not used to set the confirmed-open flag (same standard applied to BU Tanglewood/CBS in batch 1). |
| University of the Arts London — International Summer School | `ae5e73f0-43ba-42be-baed-423d3087e7e1` | age, grade, country | `https://www.arts.ac.uk/study-at-ual/short-courses/summer-short-courses` | Page has no eligibility statement of any kind, just a program description. |

## What this doesn't cover

Only the rows from batches 1-2 that produced no usable answer. The rows that DID resolve
(fills/corrections) are in the batch's own SQL file, not repeated here. See
`docs/PROXOLA-PLAN.md` / CEO dispatch history for the running batch count against the full
348.
