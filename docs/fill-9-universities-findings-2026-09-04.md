# Fill-target research findings: 9 top-50 QS universities (2026-09-04)

Research report only. **No SQL staged, no writes — live or otherwise.** Per the
brief: report findings before writing anything, so this is what gets reviewed.

## Scope and method

Nine universities: the top-50-by-QS-rank subset of the 449-university reachable
set (US/UK/Turkey/Germany/Italy/France/Spain/Netherlands/Switzerland/Austria/
Belgium/Poland/Finland/Portugal/Ireland/Czechia/Sweden) that fail this product's
own full-depth check (`lib/universities/data-depth.ts` — statistics, ≥1 program,
≥1 requirement, ≥1 source, all four). See
[docs/empty-field-measurement-2026-09-04.md](./empty-field-measurement-2026-09-04.md)
for how that target was scoped and counted.

Rules followed throughout, restated because they shaped every decision below:
official sources only (university's own pages first, official government dataset
second); `source_url` and retrieval date on every fact; where a fact isn't
findable, it is left null — no inference, no averaging, no borrowing a plausible
number from a secondary source; research ran in this session via WebSearch/
WebFetch/the Browser pane, never a live AI call.

**One general finding up front, because it changed how several rows turned out:**
each university's gap was a *different* one or two of the four dimensions, not
uniformly "everything." Checking exact per-university gaps before researching
(rather than assuming each needed full-depth research from zero) saved real
effort and is why some entries below are much lighter than others.

## Schema gap — this is the most important finding in this report

`university_statistics.cost_of_attendance` is a single scalar number.
`admission_rate` is likewise a single number. Both assume every institution has
one cost and one admission rate. **That assumption is false by construction for
most of this batch, and it isn't a foreign-country quirk — it's the normal case
for the two axes this product depends on most: UK/Ireland-style dual fee
statuses, and continental Europe's per-program admission structures.**

Five of the nine universities hit this independently, for two different
underlying reasons:

**Fee-status splits (cost varies by who the student is, not what they study):**
- Oxford: Home £10,050/yr vs Overseas £39,620–£66,580/yr (2027/28) — a sixfold
  spread, and the overseas figure itself varies further by course.
- Edinburgh: fees looked up per program/level via a fee-finder tool, no single
  figure published.
- King's College London: Home £9,790/yr (2026/27) confirmed; international
  "found on each individual course page," no aggregate.
- TU Munich: EU/EEA students pay no tuition (administrative semester fee only);
  non-EU bachelor's "usually 2,000 or 3,000 euros per semester" — two values,
  not one, even within the non-EU category.
- TU Delft: this one actually resolves to two *clean* flat numbers rather than a
  range — statutory rate (Dutch/EU/EEA/Swiss/Surinamese) €2,694/yr (2026-27,
  sourced to DUO, the Dutch government's own education agency), institutional
  rate (everyone else) €18,175/yr (2026-27 and 2027-28 held flat). Still two
  numbers competing for one column.

**Admission-rate splits (no single university-wide rate exists, for two distinct
underlying reasons):**
- KCL publishes admissions statistics per faculty (9 separate PDFs), never as a
  university-wide aggregate.
- TU Delft runs 6 selective numerus-fixus programs and leaves the rest open-
  admission (diploma-qualification-based, no selection at all) — most of the
  university literally has no "rate" to report.
- Oxford's and PSL's overall figures weren't accessible within this pass (see
  their entries), which is a research gap, not the same structural issue — worth
  keeping distinct from the five above.

**One clean counter-example, worth keeping in view:** Edinburgh *does* publish a
real single-figure admission rate (53% offer rate, 2025 cycle, 68,862
applications). So the schema isn't wrong everywhere — it's wrong specifically
where a university's own fee or admission structure is genuinely multi-valued,
which turns out to be most of non-US higher ed, not an edge case.

**Proposed shapes (not implemented — founder's call):**
1. Split `university_statistics` by a `fee_status` or `applicant_category`
   dimension (home/overseas, statutory/institutional), allowing multiple rows
   per university per `stat_year`.
2. Push per-course fee variation into the *already-existing*
   `university_programs.tuition_amount`/`tuition_currency` columns (schema
   support exists today, just unpopulated) — the more granular fix for
   Oxford/TUM/Delft where fees genuinely vary by course, not just by category.
3. For admission rate specifically: either accept "null at the university level,
   real at the program/faculty level" as the honest shape and surface it that
   way in the product, or add an explicit `admission_rate_basis` field
   (`"university_wide"` / `"faculty_aggregate_unavailable"` / `"program_varies"`)
   so a null doesn't read as "not researched yet" when it's actually "doesn't
   exist as one number."

A filled `cost_of_attendance` picked from one end of a range would be wrong for
most students who read it — worse than the blank it replaces, since a blank
sends someone to go look and a confident wrong number doesn't. Every
`cost_of_attendance` and `admission_rate` below that isn't a genuinely single,
official figure has been left null.

## Timing note

Oxford (university #1) took materially longer than the rest — flagged to oryn-45
mid-research, per instruction. Cause was specific to Oxford's site (Cloudflare
bot-check, a recently restructured stats section with several dead links, numbers
published through JS dashboards rather than static text), not representative of
the batch. Princeton (#2) confirmed the opposite extreme — effectively free, a
rollup of citations that already existed in the database from other lanes' work
dated 2026-08-17 through 2026-09-03. The remaining seven landed in between,
closer to Princeton than Oxford. Actual per-university effort, roughly ascending:
Princeton (rollup only) < UChicago ≈ UPenn ≈ Edinburgh ≈ KCL ≈ Delft (one clean
official page each) < PSL (structural, federation-of-schools finding) < TU Munich
(genuinely most fields from zero) < Oxford (site friction, not research
difficulty).

---

## Findings by university

### 1. University of Oxford — UK, QS 4
**Gap: statistics only** (had 52 programs, 25 requirements, 2 sources already).

| Field | Value | Source | Retrieved |
|---|---|---|---|
| Admitted (2025) | 3,302 students; 79% UK-domiciled | [ox.ac.uk/.../admissions-statistics/undergraduate-students](https://www.ox.ac.uk/about/facts-and-figures/admissions-statistics/undergraduate-students) | 2026-09-04 |
| Home course fee (2027/28) | £10,050/yr | [ox.ac.uk/.../course-fees](https://www.ox.ac.uk/admissions/undergraduate/fees-and-funding/course-fees) | 2026-09-04 |
| Overseas course fee (2027/28) | £39,620–£66,580/yr, varies by course | same as above | 2026-09-04 |

**Not found, left null:** total applicants/offer rate (no `admission_rate` —
Oxford's stats site was restructured, several previously-indexed URLs now 404,
and the current pages are JS dashboards, not static text; the PDF annual report
lives on an asset subdomain WebFetch couldn't verify and the Browser pane
couldn't open without triggering a download — did not attempt to force either
open, since that would mean working around the Cloudflare check). Graduation/
completion rate — only surfaced in search-engine synthesis, never a direct
citable fetch, so not used. `cost_of_attendance` deliberately not staged as a
single figure — see the schema-gap section above.
**SAT/ACT range: correctly N/A**, not a gap — UK admissions doesn't use them.

### 2. Princeton University — US, QS 27
**Gap: `university_sources` only** — the other three dimensions were already
populated and properly sourced before this pass started (42 programs across 6
distinct princeton.edu pages, verified 2026-08-17/21; 27 requirements across 9
distinct admission.princeton.edu/finaid pages, verified 2026-08-21 and
2026-09-03; statistics from College Scorecard, verified 2026-08-18). This pass's
only job was rolling those existing citations into the `university_sources`
tracking table the depth-check actually reads — not new research.

Independently cross-checked the stored `admission_rate` (0.0462) against a fresh
search rather than trusting it because it was already in the table — matches
College Scorecard's real published 4.62% for Princeton, so the existing row is
not fabricated. (`stat_year` is null on that row — a small pre-existing gap,
noted, not touched — out of this task's scope.)

17 distinct source URLs identified for rollup (6 program pages, 9 requirement
pages, 1 finance-aid page, 1 College Scorecard entry — verified as the real URL,
`collegescorecard.ed.gov/school/?186131-Princeton-University=`, independent of
what was already stored). Full list in the working notes; omitted here for
length since it's a straightforward rollup, not new factual claims.

**Open question for oryn-45:** the existing `university_sources` rows elsewhere
in the DB only use `official_primary`/`official_institution_website` as
`source_type` — neither honestly describes a federal dataset. Proposing a new
label, `official_government_dataset`, for the College Scorecard row rather than
overloading an existing one. Flagging the choice rather than deciding it
silently.

### 3. University of Chicago — US, QS 24
**Gap: requirements only** (0 rows; had stats, 1 source, 60 programs already).
Source: [collegeadmissions.uchicago.edu/apply/application/required-materials](https://collegeadmissions.uchicago.edu/apply/application/required-materials/), retrieved 2026-09-04 (page is JS-rendered — WebFetch returned only the heading; the Browser pane got full text after a short wait).

Found, 5 requirement facts:
1. **Testing** — optional, plus a "No Harm" policy, quoted exactly: *"Any SAT or
   ACT score submitted will only be used in review if it will positively affect
   an applicant's chance of admission. Test scores that may negatively impact an
   admission decision will not be considered in review."* Applies to domestic,
   international, and transfer applicants alike.
2. **Recommendations** — two required, from teachers who taught an academic
   subject.
3. **Essays** — Common/Coalition personal statement, plus UChicago Supplement:
   one extended essay (choice of several prompts) + one short "why UChicago"
   essay.
4. **Fee** — $90, automatic waiver for need-based financial aid applicants.
5. **Coursework** — no specific required course set, but the page explicitly
   "encourage[s] students to pursue the most challenging and rigorous coursework
   available to them."

**Not found, left null:** undergraduate English-proficiency requirement. Found
TOEFL 104 / IELTS 7 thresholds, but only for *graduate* programs
(digitalstudies.uchicago.edu, humdev.uchicago.edu) — did not cross-apply a
graduate requirement to undergraduate admissions. Also declined to use "no
minimum GPA," which appears on several secondary/aggregator sites but not on the
official required-materials page actually fetched.

### 4. University of Pennsylvania — US, QS 15
**Gap: requirements only** (0 rows; had stats, 1 source; 5 programs, thin but
non-zero so out of this task's scope). Source:
[admissions.upenn.edu/.../application-requirements](https://admissions.upenn.edu/how-to-apply/first-year-applicants/application-requirements), retrieved 2026-09-04 (WebFetch worked cleanly).

Found, 4 requirement facts:
1. **Testing** — policy **changed** for the 2025-26 cycle onward: now required
   (previously test-optional). Exact quote: *"Penn applicants are required to
   submit the SAT or ACT. Applicants who face hardship in meeting this
   requirement can submit a waiver directly through the application instead."*
   Confirmed on the primary page specifically because this is the kind of fact
   that goes stale fast if copied from an older secondary source.
2. **Recommendations** — two required (school counselor/college official + one
   core-subject teacher), one further optional letter permitted.
3. **Essays** — 3 prompts: a 150–200 word thank-you note, a 150–200 word
   "community at Penn" response, and one school-specific prompt.
4. **Fee** — $75, waivers available through the application platform.

**Not found, left null:** interview policy — the page doesn't mention one either
way, and silence isn't being read as "no interview."

### 5. Technical University of Munich — Germany, QS 25
**Heaviest-lift case**: started with only 3 programs, 2 requirements, 0
statistics, 0 sources. All facts from tum.de directly (WebFetch worked cleanly
throughout — no Cloudflare issue here), retrieved 2026-09-04.

Found, 5 requirement facts:
1. University entrance qualification required (Abitur for German applicants;
   foreign qualifications evaluated via Uni-Assist). [Source](https://www.tum.de/en/studies/application/application-info-portal/admission-requirements)
2. Most programs subject to an "aptitude assessment"; programs split into
   unrestricted / restricted (Numerus Clausus) / aptitude-assessment categories,
   which applies is program-specific. Same source as above.
3. **German-taught programs**: DSH-2 overall, OR TestDaF level 4 (all
   sections), OR telc Deutsch C1 Hochschule, OR DSD II level B2 (all four
   sections), OR Goethe/ÖSD Certificate C2. (Aerospace & Information Engineering
   accepts a lower tier — recorded as a program-specific exception.)
   [Source](https://www.tum.de/en/studies/application/application-info-portal/admission-requirements/language-certificates)
4. **English-taught programs** (including the Management & Technology
   bachelor's already in the DB): TOEFL iBT 88 minimum, OR IELTS Academic 6.5
   overall, OR Cambridge CAE/CPE grade A/B/C, OR PTE Academic 65+. Waivable with
   a full secondary education in English or a prior degree ≥50% English-taught.
   Same source as #3.
5. Tuition: EU/EEA students pay no tuition (administrative semester fee only,
   amount varies by campus); non-EU/EEA bachelor's "usually 2,000 or 3,000 euros
   per semester." [Source](https://www.tum.de/en/studies/fees/tuition)

**Not staged as statistics:** enrollment-scale facts were found and are real (TUM:
~50,000 total students, 41–45% international, ~140 countries represented, ~7,000
new bachelor's starters/year — [source](https://www.tum.de/en/about-tum/facts-and-figures/), retrieved 2026-09-04) but don't map to
`admission_rate`/`graduation_rate`/`cost_of_attendance` — Germany's admission
system is unrestricted/NC/aptitude-assessment *per program*, not a single
university-level rate. Left the statistics row out entirely rather than
force-fit enrollment-scale numbers into admission-rate-shaped fields.

### 6. Université PSL — France, QS 34
**Gap: statistics** (had 13 programs, 1 source; 2 requirements, thin).
Sources: [psl.eu/.../applying-bachelors-degree](https://psl.eu/en/education/applying-bachelors-degree)
and [psl.eu/.../international-admissions-procedures-psl](https://psl.eu/en/international-admissions-procedures-psl), both retrieved 2026-09-04.

**Structural finding, not a research gap:** PSL is a federation of member
grandes écoles (Dauphine-PSL, ENS, Mines Paris, Chimie ParisTech, etc.), each
setting its own program-level admission criteria. The umbrella site says so
directly — applicants must "consult individual program websites for admission
requirements for each program." There is no single PSL-wide language-proficiency
or academic threshold to record. This is the same shape of problem as TUM's
per-program variation, one more data point for the schema-gap pattern.

Found, 2 requirement facts (university-level):
1. French-track applicants apply via Parcoursup; 2026 cycle opened January 19,
   2026, confirm-choices deadline April 1, 2026.
2. Non-EU applicants outside the Études-en-France network use the DAP
   procedure; those inside it apply via Mon Master/PSL portals, then request
   pre-consular formalities through Études en France, then a student visa.
   Dauphine-PSL specifically requires both the Études en France portal and its
   own application portal.

**Not found, left null:** uniform French/English language-proficiency levels
(explicitly absent at the PSL-umbrella level — would need per-member-school
research, out of scope here). No statistics — PSL doesn't publish a single
acceptance rate or cost at the federation level; this pass didn't chase per-school
figures down.

### 7. The University of Edinburgh — UK, QS 35
**Gap: statistics + sources** (had 98 programs, 12 requirements already).
Source: [study.ed.ac.uk/.../admissions-statistics](https://study.ed.ac.uk/undergraduate/applying/selection/admissions-statistics), retrieved 2026-09-04.

**A genuinely clean single figure, rare in this batch:**
`admission_rate` (2025 cycle): 68,862 applications, 36,195 offers, **53% offer
rate**, 7,626 acceptances. Used offer rate (not accept/applicant ratio) as the
`admission_rate` analog, matching how Princeton's already-stored figure works.
`stat_year`: 2025. (Trend data also on the page if ever wanted: 2024 47%, 2023
40%, 2022 33%, 2021 47% — not staging these, noting they exist.)

**Not staged:** `cost_of_attendance` — same schema-gap pattern, confirmed
directly rather than assumed from the Oxford/TUM precedent (Edinburgh's fees are
looked up per program/level via a fee-finder tool, no single figure).
`graduation_rate` — searched specifically, found only UK-sector-wide retention
data (87–89%), not Edinburgh-specific; left null rather than substitute a sector
average for an institution-specific claim.

### 8. King's College London — UK, QS 37
**Gap: statistics + sources** (had 152 programs, 5 requirements already).
Sources: [kcl.ac.uk/.../admissions-statistics](https://www.kcl.ac.uk/about/strategy/learning-and-teaching/admissions-statistics)
and [kcl.ac.uk/.../tuition-fees](https://www.kcl.ac.uk/study/undergraduate/fees-and-funding/tuition-fees), both retrieved 2026-09-04.

**Not found, genuinely:** `admission_rate`. KCL's transparency page publishes
stats per faculty (9 separate PDFs), never as a university-wide aggregate.
Computing a synthetic weighted average across 9 PDFs myself would be arithmetic
on real numbers rather than invention, but it's a figure KCL itself has chosen
not to publish as one number — judged this disproportionate effort for one field
on one university and out of spirit with "don't manufacture a value the
institution doesn't state," so left null. Also checked for a marketing-style
headline rate outside the transparency pages; found only a third-party site's
"13%" claim, not used.

Found: Home tuition fee for **2026/27** entry: £9,790 (note — a different
admissions cycle than Oxford/Edinburgh's 2027/28 figures above; not the same
year, recorded as such rather than implied comparable).

**Not staged:** `cost_of_attendance` — 4th confirming instance of the schema-gap
pattern. KCL's own page: "All tuition fees can be found on each individual
course page" — international fees vary by course, no single figure to cite.

**Added after this doc first merged:** while staging the fill, found that
`scripts/acquire-university-statistics-uk.ts` — a 2026-08 UK tuition-acquisition
pass, weeks before this one — had already reached the identical conclusion about
KCL independently: "University College London, University of Manchester, King's
College London, University of Birmingham, University of Leeds, and Durham
University each confirmed to have NO single published international figure —
fees are programme-specific." Two independent passes, weeks apart, hitting the
same structural wall is stronger evidence for the schema-gap argument above than
one night's research on its own — noted here rather than left buried in a
staging-branch commit message.

### 9. Delft University of Technology — Netherlands, QS 48
**Gap: statistics only** — best-covered of the 9 going in (53 programs, 43
requirements, 1 source already).
Sources: [tudelft.nl/.../tuition-fee-finances](https://www.tudelft.nl/en/education/study-programme-orientation/practical-matters/tuition-fee-finances)
(retrieved 2026-09-04 via the Browser pane — WebFetch's domain-verification
blocked this one, same failure mode as the Oxford PDF asset subdomain) and
[duo.nl/particulier/tuition-fees.jsp](https://duo.nl/particulier/tuition-fees.jsp) (retrieved 2026-09-04, WebFetch clean).

Found — two real, clean flat figures (not a range, for once):
- **Statutory rate** (Dutch/EU/EEA/Swiss/Surinamese, or qualifying residence
  permit), 2026-2027: **€2,694/yr**. Sourced to DUO, the Dutch government's own
  education executive agency, which TU Delft's own page names as the
  authoritative rate source — followed that chain rather than fighting a
  collapsed accordion on tudelft.nl that wouldn't expand for the Browser pane
  (element existed but repeatedly reported outside the viewport, a tool
  limitation, not a site block).
- **Institutional rate** (everyone else), 2026-2027 *and* 2027-2028 (TU Delft
  holds this flat across both years): **€18,175/yr**. Sourced to tudelft.nl
  content surfaced via search of the official domain; flagging this one as
  slightly less directly confirmed than the DUO figure (couldn't get the
  accordion open to verify by direct page load) but still official-domain-sourced.

**Structural finding, explains the `admission_rate` null too:** TU Delft runs 6
numerus-fixus (selective) bachelor's programs (Aerospace Engineering, Computer
Science & Engineering, Architecture, Clinical Technology, Nanobiology, +1) with
per-department selection since 2017; the rest are open-admission subject to
meeting the diploma requirement, some with a non-selective "Study Choice Check."
Most of the university has no admission "rate" to report at all — a different
root cause than Oxford/Edinburgh/KCL's fee-status split, same practical result.

**Not staged:** `cost_of_attendance` — 5th confirming instance of the schema-gap
pattern, now spanning 4 countries.

---

## What this leaves for the next step

All nine researched, all facts source-tagged and dated, nothing written —
staged or live. Waiting on review before any SQL gets written, per instruction.
Two things worth a decision before staging:
1. The `official_government_dataset` source-type label proposed for Princeton's
   College Scorecard row (and, by the same logic, Delft's DUO row) — new label
   vs. reusing an existing one.
2. Whether the schema-gap proposal above is worth a real migration on its own,
   separate from this fill, given it'll recur on every UK/Ireland/Germany/
   Netherlands university this product ever researches.
