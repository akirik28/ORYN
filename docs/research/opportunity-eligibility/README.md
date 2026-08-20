# R4 — Opportunity eligibility intelligence

Research package on how ORYN should classify and extract eligibility criteria (grade/age,
citizenship/residency/school-location, prerequisites, deadline timing) for its live
`opportunities` table. Self-directed by this research lane, ranked #1 of 3 candidates
proposed in the R3.1 wrap-up (`docs/handoffs/research-admissions-systems.md`), on the
strength of `eligible_countries` being the largest measured data-trust gap blocking real
eligibility matching. Builds on nothing from R2.1/R3.1 directly (those covered secondary
academic systems and destination-country admissions; this covers ORYN's own opportunity
eligibility fields) but shares the same non-fabrication discipline throughout.

Full sourcing, quoted evidence, and the applied extraction-audit rows:
`data/research/opportunity-eligibility/opportunity-eligibility-v1.json`. Per-topic detail:
[`grade-age-normalization.md`](./grade-age-normalization.md),
[`citizenship-residency-taxonomy.md`](./citizenship-residency-taxonomy.md),
[`prerequisites-timing-patterns.md`](./prerequisites-timing-patterns.md).

## Live database snapshot (measured 2026-08-21, read-only Supabase MCP, `qtcvcflzxbuagvvwahhu`)

352 total `opportunities` rows. Field population:

| Field | Populated | % |
|---|---|---|
| `eligible_countries` | 18 / 352 | 5.1% |
| `minimum_age` | 55 / 352 | 15.6% |
| `maximum_age` | 45 / 352 | 12.8% |
| `eligible_grades` | 69 / 352 | 19.6% |
| `citizenship_restrictions` | 30 / 352 | 8.5% |
| `residency_restrictions` | 31 / 352 | 8.8% |
| `application_requirements` | 98 / 352 | 27.8% |
| `current_cycle_label` | 115 / 352 | 32.7% |

Category mix: summer_program 235 (66.8%), competition 72 (20.5%), research 13,
scholarship 9, internship 8, online_program 6, entrepreneurship 3, academic_program 3,
fellowship 2, volunteering 1. **This is the same gap first flagged at the R2.1
checkpoint** (14/334 `eligible_countries` then, per `docs/ORYN_WORKSTREAMS.md`) — the
table has grown by 18 rows since, and `eligible_countries` coverage has moved only from
~4.2% to ~5.1%. The gap has not materially closed; re-measure before citing further.

## Cross-cutting pattern: category shapes the extraction problem

| Category | Prerequisite shape | Deadline shape | Citizenship shape |
|---|---|---|---|
| summer_program | Portfolio/audition or soft qualitative GPA language | Priority + regular/rolling tier | Even split open-worldwide vs. citizens-only among elite US programs sampled |
| competition | School sponsorship (team) or explicit individual-only rule | Registration/entry deadline split from event date | Open-worldwide common (Diamond Challenge, John Locke); nomination-mediated for EU/international contests (EUCYS) |
| research | Prior experience explicitly disclaimed as unnecessary | Single annual deadline, ~4-6 months before program start | Frequently citizens/PR-only (Simons, RSI, NASA) |
| scholarship | GPA (~3.0-3.3 typical) or need-based income ceiling | Single deadline tied to graduating class/academic year | Frequently citizens/PR-only for US-federal-adjacent programs; QuestBridge's dual path is the clean counter-example |
| internship | GPA or leadership/activity history, rarely named coursework | Rolling, multi-session windows per year | Work-authorization language often stands in for an explicit citizenship statement |

The single biggest cross-cutting risk: **no category is uniform enough to justify a
category-level default for any of the three axes** (grade/age, citizenship/residency,
timing). Every rule below is stated at the level of "how to correctly extract and store a
fact," not "what the typical value is for category X."

## RULE-ELIGIBILITY ruleset (evidence-based, for PROD-B/DATA-A implementation)

**RULE-ELIGIBILITY-001 — Never compare raw grade-number strings across countries.**
Verified: UK Year *N* ≠ US Grade *N* (Year *N* = Grade *N-1*, confirmed via an official
UK government birth-date-to-year-group table). A same-number match across US/UK data would
silently misclassify every UK-year-labeled student by one year.

**RULE-ELIGIBILITY-002 — US↔Türkiye same-number grade correspondence is the one verified
safe pair, not the general case.** Treat it as an explicit, narrow exception encoded per
country-pair — never as evidence that numeric grade matching is safe more broadly.

**RULE-ELIGIBILITY-003 — Germany's Klasse-N label requires a G8/G9 track flag to
interpret.** The same "Klasse 12" is a final year in G8 states and a non-final year in G9
states (confirmed via Bavaria's and Hesse's own state ministry pages, which document both
tracks side by side). Country alone is insufficient context.

**RULE-ELIGIBILITY-004 — France's Seconde/Première/Terminale/Troisième cannot be parsed as
numbers, and Troisième is institutionally outside *lycée*.** Any matching logic assuming a
continuous 4-year "high school" concept will misrepresent the French case structurally, not
just by an offset.

**RULE-ELIGIBILITY-005 — IB DP has no native grade-number system.** IBO's own eligibility
criterion is age-based (16-19); "DP1/DP2" is descriptive shorthand riding on whatever
host-country numbering the school already uses. Treat IB DP as a curriculum tag on top of
a student's host-country grade, not an independent grade system.

**RULE-ELIGIBILITY-006 — When a program states both grade and age criteria, store and
evaluate both as independent, jointly-required (AND) gates.** Never derive one from the
other. When only one is stated, leave the other null — absence is itself meaningful
information, not a gap to fill via a generic age-per-grade chart.

**RULE-ELIGIBILITY-007 — Citizenship, residency/domicile, and current school-enrollment
location are three independent eligibility axes.** A single real student (Turkish citizen
enrolled at a US high school) can be simultaneously eligible for one program, ineligible for
another, and ineligible for a third — purely by which axis each program gates on. ORYN's
current 2-field model has no slot for school-enrollment-location distinct from domicile.

**RULE-ELIGIBILITY-008 — Visa/immigration-documentation notes are not eligibility
restrictions and must never be recorded in `citizenship_restrictions` /
`residency_restrictions` as if they were.** A program mentioning "F-1 visa" is very often
still open to international applicants; conflating the two would incorrectly turn away
eligible students.

**RULE-ELIGIBILITY-009 — National-quota/nomination-mediated programs cannot be represented
as a flat `eligible_countries` list.** Eligibility depends on whether an active national
organiser/affiliate exists for the student's country *in the current cycle* (EUCYS, UWC,
ISEF) — a fact requiring its own sourcing and refresh cadence, not a static array entry.

**RULE-ELIGIBILITY-010 — Absence of a stated citizenship/residency restriction is not
evidence of openness, and organizer type/country is not a reliable predictor in either
direction.** Only an explicit affirmative statement ("open to any country") justifies
"appears open." Directly disproven heuristic: same US-university-hosted profile, evenly
split between open-worldwide and citizens-only in the sample researched.

**RULE-ELIGIBILITY-011 — Deadline architecture is category-dependent.** Summer programs:
priority + regular/rolling tiers. Team competitions: registration deadline separate from
event date(s). Scholarships/research: one annual deadline tied to the academic year.
Internships: rolling, multi-session windows. A single scalar `deadline` field under-
represents at least the competition and internship cases.

**RULE-ELIGIBILITY-012 — `current_cycle_label` freshness cannot be parsed with one fixed
year-regex.** Cycle-year numbering conventions vary by program (cohort year vs.
academic-year span vs. literal program dates). The strongest positive freshness signal is
a page naming *both* a just-closed cycle and a forward-pointing next cycle — stronger than
a bare future date, and far stronger than a page showing only a past year with no forward
pointer (the most dangerous, silently-stale case).

**RULE-ELIGIBILITY-013 — No named-course prerequisite pattern was found in this sample.**
Every coursework-adjacent requirement researched (SIMR, HIP-SAT, MITES, PRIMES, RSI) uses
qualitative language ("strong preparation," "rigorous coursework") rather than naming a
specific required course. Do not infer a numeric GPA or a specific course requirement from
vague language — that would violate the same no-false-precision principle that governs
admissions percentages.

**RULE-ELIGIBILITY-014 — Do not fabricate a missing eligibility dimension.** Missing age,
grade, country list, or prerequisite is a genuine "unknown," never silently inferred from a
category default, an organizer's home country, or a related field.

## Consolidated schema-gap summary (not a schema proposal — PROD-B decides implementation)

- No field for **current school-enrollment location**, distinct from citizenship and
  domicile/residency.
- No structured **`restriction_basis` enum** (citizenship | permanent_residency |
  domicile_residency | school_enrollment_location | national_quota_nomination |
  none_stated) to make the two free-text restriction fields machine-queryable.
- No field for **visa/documentation logistics notes**, separate from eligibility text.
- No way to flag an **organizer-determined, non-public, annually-variable** country list
  (vs. a fixed, citable one).
- `eligible_countries` is **country-granularity only** — cannot express sub-national
  (state/region) restrictions or nomination-mediated eligibility.
- No canonical **age-anchored `secondary_stage` enum** to normalize grade/year labels
  across countries before matching — today nothing prevents a same-number comparison
  across incompatible systems.
- `deadline` is a single scalar — under-represents competitions' registration/event split
  and internships' multi-session rolling windows.

## What this package does not cover

Volunteering (1 live row) and fellowship (2 live rows) categories were explicitly out of
scope. This is a methodology and applied-audit package, not a database write — no
`opportunities` row was modified by this research lane.
