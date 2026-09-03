# What's actually empty, and what a student actually sees

**Date:** 2026-09-04. **Why this doc exists:** the founder's own closing instruction for the
night — *"tüm iş bitti raştırma yapmaya geç opportunity ve unilerle ilgili çok şey boş"* (all
the work is done, move to research — a lot is empty about opportunities and universities).
oryn-45's brief was explicit: turn "a lot is empty" into a count before anyone writes a single
record, rank by what a student actually sees rather than raw null percentage, and measure live
against the real database — not from a staged file, the way `academic_tier` was reported as
"277 institutions backfilled" tonight and is actually 1019/1019 null. **This is measurement
only. Nothing was filled. No table was written to.** Every number below came from a live query
against `qtcvcflzxbuagvvwahhu` (`oryn-qa-scratch`, run 2026-09-04) or a direct grep of the
current UI source — never inferred from a migration, a seed script, or a doc claiming a backfill
happened.

## The two headline numbers

**68.8% of universities (695 of 1,010 canonical rows) show Proxola's own "hasn't researched
this yet" empty state** — no statistics, no programs, no requirements, no sources at all. Not a
missing field on an otherwise-real page: the entire content section below the header, on more
than two out of every three university pages a student can open.

**94.8% of active opportunities (348 of 367) show at least one "not verified" eligibility
caveat** — age, grade, or country eligibility that Proxola cannot currently confirm one way or
the other. Only 19 of 367 active opportunities carry zero such caveat.

Both numbers use the app's own real logic, not a hand-rolled proxy — see Methodology.

## Ranked findings — what to prioritize if/when filling starts

Ranked by **visible impact × how many students it touches**, not by raw null percentage. A
90%-null column nobody renders ranks below a 45%-null column that drives a caveat on every
card. This is the ranking oryn-45 asked for; nothing below it has been acted on.

| # | Finding | Live measurement | Visible as |
|---|---|---|---|
| 1 | University detail pages with zero depth | 695/1,010 (68.8%) | The full "not researched" empty state — `lib/universities/data-depth.ts`'s own `lacksResearchDepth`, fired for real |
| 2 | Opportunity age eligibility unverified | 273/367 (74.4%) | "Has an age requirement — add your birth year to check" / no bound recorded at all caveat |
| 3 | Opportunity grade eligibility unverified | 272/367 (74.1%) | "Restricted by grade level..." / grade-unverified caveat |
| 4 | Opportunity deadlines missing | 272/367 (74.1%) | No deadline badge, no "due soon" signal, weaker urgency ranking |
| 5 | Opportunity country eligibility unverified | 224/367 (61.0%) | "Country eligibility not verified yet — check the official page" caveat |
| 6 | University statistics missing | 882/1,010 (87.3%) | Admission rate / test scores / graduation rate StatCards all read "Unavailable" |
| 7 | University requirements missing | 897/1,010 (88.8%) | Already has an honest empty message (fixed 2026-09-03); still 88.8% of pages show it |
| 8 | Opportunity `fields` missing | 168/367 (45.8%) | Relevance falls back to a flat 40-point score — the "why this matches you" reasoning is structurally weaker, not just absent |
| 9 | University programs missing | 860/1,010 (85.1%) | Section silently doesn't render — **unlike requirements, this one has no honest-empty message yet; a UI fix, not a data fix, and cheap** |
| 10 | University sources missing | 853/1,010 (84.5%) | No SourceBadge row at the bottom of the page |
| 11 | University logo missing | 672/1,010 (66.5%) | Falls back to a monogram on the browse-page card — real, but a graceful, already-handled degrade |
| 12 | University student size missing | 632/1,010 (62.6%) | Falls back to a QS size band if available, else "Unavailable" |

**Below the ranking, not on it — high null%, low or no visible impact today:**

- `universities.academic_tier` / `academic_tier_local_name`: **1,010/1,010 (100%) null, and referenced nowhere in `app/`, `features/`, or `lib/`** — grepped directly, zero hits outside tests/fixtures/scripts. This is tonight's own cited example, confirmed from both directions: not just wrongly reported as filled, but currently invisible even where it's genuinely empty. Filling it today would improve nothing a student sees — it has no renderer yet. Wiring a place for it to display is a separate, prior decision from filling it.
- `opportunities.access_channel`: 367/367 (100%) null, zero renderer hits anywhere.
- `opportunities.source_verified_at`: 367/367 (100%) null, but not a "blank field" in the way the others are — it's one of three columns (`last_verified_at`, `verified_at`, `source_verified_at`) that jointly feed `isOpportunitySufficientlyVerified`'s freshness gate. `last_verified_at` is only 30.8% null and `verified_at` only 7.1% null, so this specific column being empty rarely changes the gate's outcome on its own.
- `universities.selectivity`: 1,006/1,010 (99.6%) null, zero renderer hits. Worth naming since "selectivity" sounds adjacent to `selectivity_tier` (the *opportunity* column, actively used) and to Admission Outlook — it is neither; it's a separate, unused university-level column.

## Universities — full picture

Measured against `duplicate_status = 'canonical'` (1,010 of 1,019 rows — 9 are loser rows in a
dedup pair, correctly excluded per `lib/universities/canonical.ts`).

**Coverage (does a row exist in the child table at all — the bigger gap than any single column):**

| Table | Universities with ≥1 row | Coverage |
|---|---|---|
| `university_rankings` | 1,009 / 1,010 | 99.9% |
| `university_statistics` | 129 / 1,010 | 12.8% |
| `university_programs` | 150 / 1,010 | 14.9% |
| `university_requirements` | 113 / 1,010 | 11.2% |
| `university_deadlines` | 105 / 1,010 | 10.4% |

Rankings are essentially solved. Everything else that actually informs "should I apply here" —
statistics, programs, requirements, deadlines — exists for roughly one university in seven to
ten. This is the real shape of the gap: it is not that individual columns are sparsely filled
on well-populated rows, it's that most rows in these four tables **don't exist**.

**Column-level nulls on `universities` itself** (1,010 canonical rows), high-to-low:

`academic_tier` 100.0% · `academic_tier_local_name` 100.0% · `description` 99.6% ·
`selectivity` 99.6% · `application_system` 91.1% · `logo_url` 66.5% · `student_size` 62.6% ·
`admissions_url` 37.6% · `latitude`/`longitude` 2.6% · `website_url` 2.1% ·
`institution_type` 1.4% · `city` 0.0% · `last_checked_at` 0.0%.

`description` at 99.6% is worth a specific callout: it's rendered directly under the page
header (`{university.description ? <p>...</p> : null}`) whenever present, and is the one
near-100%-null column on the base table that IS actively rendered — it just doesn't appear on
these findings' top ranks because the `lacksResearchDepth` empty-state (finding #1) already
covers the same universities for a much larger reason.

## Opportunities — full picture

Measured against `status = 'active'` (367 of 422 rows). 338 of those 367 (92.1%) are also
`verification_state = 'verified_current'`, so this set closely tracks what a student actually
sees on the recommendation surfaces, not a looser "everything in the table" figure.

**The eligibility-note codes above were computed by replicating `computeEligibility`'s own real
logic** (`lib/opportunities/matching.ts`, converted to codes+params earlier tonight — see
`docs/eligibility-notes-codes-2026-09-03.md`), not approximated:

- `age_eligibility_unverified` fires when BOTH `minimum_age` and `maximum_age` are null (no
  bound recorded at all) — 273/367, 74.4%.
- `grade_eligibility_unverified` fires when `eligible_grades` is empty — 272/367, 74.1%.
- `country_eligibility_unverified` fires when `eligible_countries` is empty AND
  `eligible_citizenships` is empty AND neither `citizenship_restrictions` nor
  `residency_restrictions` prose exists AND `country_eligibility_confirmed_open` is false —
  224/367, 61.0%.
- **At least one of the three: 348/367, 94.8%.**

**Other column-level nulls**, high-to-low: `access_channel` 100.0% · `source_verified_at`
100.0% · `funding_available` 97.3% · `application_open_date` 96.5% · `image_url` 82.6% ·
`end_date`/`start_date` ~82% · `residency_restrictions` 83.4% · `maximum_age` 80.7% ·
`citizenship_restrictions` 80.9% · `minimum_age` 76.6% · `deadline` 74.1% · `financial_aid_available`
71.9% · `remote_allowed` 54.5% · `fields` (empty array) 45.8% · `location_mode` 45.8% ·
`current_cycle_label` 47.1% · `application_requirements` (empty array) 62.7% · `country` 49.9% ·
`source_url` 3.5% · `verified_at` 7.1% · `last_verified_at` 30.8%.

## Methodology — what "measured live" actually meant here

Every count above is a real `execute_sql` call against the `qtcvcflzxbuagvvwahhu` Supabase
project (confirmed as `oryn-qa-scratch` per this session's own standing reference — there is no
separate prod project; this is production in all but name). No number in this doc came from a
migration file, a seed script, an acquisition script's own claimed row count, or a prior doc's
narrative — the exact failure this task was dispatched to avoid, and the exact failure
`academic_tier`'s "277 backfilled" claim turned out to be tonight, confirmed independently here
(1,010/1,010 null, live).

"Visible" was decided by grepping the actual current page/component source
(`app/(app)/universities/[id]/page.tsx`, `app/(app)/universities/page.tsx`,
`features/universities/*.tsx`, and this session's own direct knowledge of
`lib/opportunities/matching.ts`'s eligibility logic from tonight's `eligibility_notes` codes
conversion), not assumed from a column's name or its table's general purpose. Where a column
had zero renderer hits outside tests/fixtures/scripts, it's reported as not currently visible,
explicitly — not silently omitted, so a future reader can see what was checked and ruled out
rather than wonder if it was simply missed.

## What this doc does not do

No record was written, updated, or backfilled. No AI call was made — this was pure
measurement, zero cost beyond the read queries themselves. The ranking above is a
recommendation for where filling would matter most, handed back for a decision on whether and
how to run it — filling is real research work (per oryn-45's own framing, work that runs
through Claude Code sessions, never the live app calling an AI API) with a real cost, and this
session would rather the target be agreed before any of it starts than fill the wrong column
well.
