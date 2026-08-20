# Applied extraction audit — 102 live opportunities, 32 proposed values

Reviewable summary for **DATA-A**. Full structured data (evidence quotes, per-row notes):
`data/research/opportunity-eligibility/opportunity-eligibility-v1.json` →
`extraction_audit_sample`. This is a **research proposal, not a write** — no
`opportunities` row was modified. Every value below should be reviewed against its quoted
evidence in the JSON before being applied to the live table.

## Methodology

102 live `opportunities` rows (two batches of 51, drawn from rows with eligibility gaps)
were re-examined by an agent against the extraction rules established in this package's
three methodology files, to (a) stress-test the methodology against real rows and (b)
produce a directly reviewable, sourced proposed-value batch. **32 of 102 rows (31%)**
yielded at least one new, sourced, extractable value under the "don't fabricate, quote the
evidence, default to unknown" discipline; the other 70 genuinely had no extractable value
for the fields checked — that is an expected, correct outcome under this methodology, not
a shortfall.

## Proposed values by row

| Title | Category | Proposed field(s) | Caveat |
|---|---|---|---|
| International Academic Marathon | competition | `eligible_grades`: 9-12 | — |
| Genesys Works | internship | `citizenship_restrictions`: US work authorization required | Work-authorization language, not an explicit citizenship/PR statement — closest schema fit |
| NYU Tandon Machine Learning Summer Program | summer_program | `minimum_age`: 15 | — |
| Nanoteknoloji ve Biyoteknoloji Lise Kış Kampı | summer_program | `application_requirements`: CEFR B2+ English | Grade eligibility left null — source uses Turkish "tamamlamış olan" (completed) phrasing, ambiguous vs. current grade, not guess-converted |
| RISE (Research in Science and Engineering) at BU | summer_program | `minimum_age`: 15; `citizenship_restrictions`: international students not eligible | Source has two conflicting grade statements for related tracks — grade left null rather than guessed |
| Warwick University Pre-University Summer Programme 2026 | summer_program | `minimum_age`: 16; `maximum_age`: 17 | — |
| Rockefeller University SSRP | summer_program | `minimum_age`: 16; `eligible_grades`: 11-12; `application_requirements`: 6 items | — |
| Stanford Summer Humanities Institute | summer_program | `application_requirements`: 6 items incl. $65 fee | Source text truncated mid-word; fee amount visible, exact wording not |
| Tulane University Pre-College | summer_program | `application_requirements`: English proficiency test + passport | Grade eligibility split by course track in source; left null since row doesn't specify which track |
| iD Tech Camps | summer_program | `minimum_age`: 7; `maximum_age`: 18 | This is iD Tech's full portfolio age span, not high-school-specific — flagged for reviewer awareness |
| UChicago College Pathway Program in Economics | summer_program | `eligible_grades`: 9-11 | — |
| Woodstock School: Mussoorie, India | summer_program | `eligible_grades`: 9-12 | — |
| Columbia University: New York, NY | summer_program | `minimum_age`: 16; `eligible_grades`: 9-12 | 16+ age floor is specific to the NYC Residential track; applied with that caveat since row appears to represent the general listing |
| Durham University Global Futures Summer School 2026 | summer_program | `minimum_age`: 16; `maximum_age`: 17 | — |
| University of Toronto | summer_program | `eligible_grades`: 9-12 | — |
| Two-week UM Academies (non-credit) | summer_program | `eligible_grades`: 9-11 | Seniors explicitly excluded in source text, not merely unmentioned |
| Harvard University (MA, USA) | summer_program | `minimum_age`: 16; `maximum_age`: 18 | Max age derived by one translation step from "will not turn 19 before July 31" — flagged for reviewer verification |
| Summer High School Programs at BU | summer_program | `application_requirements`: English test thresholds | Excerpt doesn't restate "non-native speaker" immediately before this passage — worth confirming universal applicability |
| RISE for the World | scholarship | `minimum_age`: 15; `maximum_age`: 17 | — |
| QuestBridge National College Match | scholarship | `eligible_grades`: 12 | `eligible_countries` intentionally left null — eligible regardless of which country a US citizen/PR lives in |
| Nat Geo Slingshot | competition | `minimum_age`: 13; `maximum_age`: 18 | — |
| Harvard Alumni for Global Women's Empowerment Essay Contest | competition | `eligible_grades`: 11 | Source names partnership-school locations but explicitly states "eligibility may vary by location" and mixes cities/states/countries — `eligible_countries` left null rather than guessed |
| InvestIN Young Lawyer / Young Political Leader (London) | internship | `minimum_age`: 15; `maximum_age`: 18 | — |
| Summer Science Research Program (SSRP) 2023 | summer_program | `minimum_age`: 16; `eligible_grades`: 11-12 | No maximum age stated — floor only |
| Purdue University | summer_program | `minimum_age`: 15 | — |
| University of St. Andrews (Scotland, UK) | summer_program | `minimum_age`: 16; `maximum_age`: 18 | — |
| ISSOS (St Andrews/Cambridge/Yale) | summer_program | `minimum_age`: 13; `maximum_age`: 18 | "From all over the world" is marketing language, not an explicit country list — no citizenship/country value extracted |
| Wharton Global Youth Program | summer_program | `application_requirements`: 4 items incl. GPA floor | Final list item paraphrased to close a truncated sentence — slightly less precise than the verbatim items |
| Clark Scholars Program | summer_program | `minimum_age`: 17; `eligible_grades`: 11-12; `application_requirements`: 4 items | Source truncated after "at least 17 years of age by the pro…" — quoted verbatim rather than completed |
| TechGirls | fellowship | `citizenship_restrictions`: 2026 participating country (37 total, incl. Türkiye); `residency_restrictions`: same | Full 37-country list not given in source — left `eligible_countries` null rather than guessed. Program is also women-only; schema has no gender field to record that |
| Coca-Cola Scholars Program | scholarship | `eligible_grades`: 12 | — |
| UNO - United Nations Online | online_program | `eligible_grades`: 11-12; `application_requirements`: fee + TOEFL for non-US students | Also open to college freshmen/sophomores per source — outside this high-school schema, not encoded |

## Cross-cutting caveats worth DATA-A's attention before applying any of these

- Several rows hit **truncated source text** (Stanford Summer Humanities Institute,
  Clark Scholars, Wharton, Tulane) — the extraction agent quoted verbatim up to the cut
  point rather than guessing the completion; a re-fetch of the original page would resolve
  these cleanly.
- Several rows had **genuinely ambiguous or conflicting source statements** (RISE at BU's
  two different grade rules, Tulane's per-track grade split, Nanoteknoloji's Turkish
  "completed" phrasing) and were deliberately left null on the ambiguous field rather than
  guessed — these are candidates for a manual/targeted re-check, not silent auto-fill.
- iD Tech Camps' age range (7-18) is the organization's full multi-camp portfolio span, not
  a high-school-specific figure — worth a narrower re-check if this row is meant to
  represent a specific high-school-relevant course.
