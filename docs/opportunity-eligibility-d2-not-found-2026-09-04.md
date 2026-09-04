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

## What this doesn't cover

Only the rows from batches 1-2 that produced no usable answer. The rows that DID resolve
(fills/corrections) are in the batch's own SQL file, not repeated here. See
`docs/PROXOLA-PLAN.md` / CEO dispatch history for the running batch count against the full
348.
