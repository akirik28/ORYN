# Grade and age eligibility normalization

Part of R4 (opportunity eligibility intelligence). Full sourcing and quoted evidence:
`data/research/opportunity-eligibility/opportunity-eligibility-v1.json` →
`grade_age_normalization`. Builds directly on R2.1's per-system grade/qualification
findings (`docs/research/secondary-education-systems/`).

## The core question

ORYN's `opportunities.eligible_grades` field stores grade-level strings. Students report
their own grade/year using their own country's terminology (US "Grade 11," UK "Year 12,"
Türkiye "11. sınıf," etc.). Can ORYN safely compare these as if they were the same number
across countries? **No — not in general.** Safety is country-pair-specific.

## Per-system grade/age mapping (last 4 pre-tertiary years)

| System | Terms (ascending) | Typical age per term | Numbering anchor |
|---|---|---|---|
| US | Grade 9 / 10 / 11 / 12 | 14-15 / 15-16 / 16-17 / 17-18 | State-set birthdate cutoffs, ~Aug-Oct 1 |
| Türkiye (MEB) | 9. / 10. / 11. / 12. sınıf | 14-15 / 15-16 / 16-17 / 17-18 | e-Okul age-in-months, ~30 Sept, aligns with US |
| UK (England/Wales) | Year 10 / 11 / 12 / 13 | 14-15 / 15-16 / 16-17 / 17-18 | Age on 1 September, anchored one year earlier than US |
| Germany (Gymnasium) | Klasse 9 / 10 / 11 / 12(/13) | 14-15 / 15-16 / 16-17 / 17-18(/18-19) | State- and track-dependent (G8 vs G9) |
| France | Troisième / Seconde / Première / Terminale | 14-15 / 15-16 / 16-17 / 17-18 | Descending non-numeric names; Troisième is in *collège*, not *lycée* |
| IB DP | (pre-DP) / (pre-DP) / DP1 / DP2 | — / — / 16-17 / 17-18/19 | No native grade-number system; IBO's own criterion is age 16-19 |

Sources: US/Türkiye figures cross-checked against Eurydice and NCES comparative notes plus
MEB's own e-Okul age-registration tool; UK figures from Havering Borough Council's official
birth-date-to-year-group table and GOV.UK's school-starting-age page; Germany from Bavaria's
and Hesse's own state ministry Oberstufe pages (directly confirming the G8/G9 split); France
from French Wikipedia's *Lycée en France* article (education.gouv.fr blocked automated
fetch — flagged as secondary-sourced, not primary); IB DP age range from IBO's own
Diploma Programme page via search-indexed snippet (direct fetch blocked, HTTP 403 — also
flagged as not independently read in full).

## Is a naive 1:1 numeric mapping safe? Verdict: partially, and only per specific pair

| Pair | Verdict | Detail |
|---|---|---|
| US ↔ Türkiye | **Safe** | Both ascending 9-12, equivalent school-starting-age convention |
| US ↔ UK | **Unsafe — off by one** | UK Year *N* = US Grade *(N-1)*, e.g. UK Year 12 (first A-Level year) = US Grade 11 (junior), both age 16-17. Verified via Havering Council's official birth-date table. |
| US ↔ Germany | **Ambiguous** | "Klasse 12" is the final (Abitur) year in G8 states, but only the second-to-last year in G9 states (final year is Klasse 13 there). Depends on Bundesland/school track, not just country. |
| US ↔ France | **Breaks down structurally** | Non-numeric, descending names; the age-equivalent-to-US-Grade-9 year (Troisième) is institutionally part of *collège*, not *lycée* — there is no single continuous "French high school." |
| US ↔ IB DP | **Not applicable** | IB DP's own eligibility criterion is age-based; "DP1/DP2" borrows whatever numbering the host school already uses. |

**This is the single highest-value finding in this package**: ORYN's schema and matching
logic must never treat "grade 11" as a portable, country-agnostic value. Today nothing in
the schema prevents a naive same-number comparison.

## Proposed normalization approach

Define a canonical, **age-anchored** `secondary_stage` enum (S1-S4) for the last four
pre-tertiary years, with a per-country lookup translating each country's own label into
the corresponding stage — rather than ever comparing raw grade-number strings across two
countries directly.

| Canonical stage | US | UK | Türkiye | Germany | France | Typical age |
|---|---|---|---|---|---|---|
| S1 | Grade 9 | Year 10 | 9. sınıf | Klasse 9 | Troisième (collège, not lycée) | 14-15 |
| S2 | Grade 10 | Year 11 | 10. sınıf | Klasse 10 | Seconde | 15-16 |
| S3 | Grade 11 | Year 12 | 11. sınıf | Klasse 11 | Première | 16-17 |
| S4 | Grade 12 | Year 13 | 12. sınıf | Klasse 12 (G8 final; **not** final in G9) | Terminale | 17-18 |

Known cases this table does **not** cleanly resolve: German G9 states have a Klasse 13
beyond S4 that is the actual final year (needs a per-Bundesland/school G8-G9 flag, not
just a country flag); French S1 sits in a structurally different institution (collège);
IB DP is a curriculum tag layered on top of a host-country grade, not an independent grade
system; and any student who repeated, skipped, or enrolled off-cycle will not match the
"on-time" modal correspondence at all — a program's or student's own directly-stated age
should always override an age inferred from a grade label.

## Age-as-of-date conventions (real, sourced examples)

Programs measure age using **at least five different conventions**, and ORYN cannot
default to one:

- **As of program start** — Simons Summer Research (Stony Brook): "at least 16 years of
  age by the start of the program."
- **As of a fixed calendar date, unrelated to program start** — RSI: "16 years of age by
  July 1 of the program year."
- **Bounded range (min at start, max at end)** — Telluride/TASS: "at least 15 at the start
  ... no older than 17 by the end."
- **Grade is the actual binding gate; age is descriptive only** — Yale Young Global
  Scholars states its rule in grade terms, while separate program materials describe the
  age range inconsistently (15-17 in one place, 16-18 in another) — descriptive age text
  must never be parsed as a strict filter when the codified rule is grade-based.
- **No age stated at all, grade-only** — National History Day: grades 6-12, no age
  criterion; group projects spanning multiple grades are resolved by the *oldest* member's
  grade (a real, sourced grade-based tie-break rule).

## Grade vs. age interaction patterns

Most selective single-institution programs (Simons, RSI, Telluride, GENIUS Olympiad) that
state both treat them as an **AND gate** — both independently required. But age is not
always a binary eligibility signal: GENIUS Olympiad's age-13 floor is a hard gate, while
its age-18 threshold only changes whether an adult chaperone is required. **No researched
program publishes an explicit tie-break rule for a genuine grade/age conflict** (an
accelerated student who is Grade 11 but 15, or a grade-repeater who is Grade 11 but 18-19)
— this should route to manual/AI-assisted review rather than auto-determined eligibility.

## Unsafe inferences (do not do these)

- Assuming UK "Year N" = US "Grade N" for the same number.
- Inferring an individual student's age from their grade label alone when a program states
  an explicit age criterion — even within a "safe" pair like US/Türkiye, individual
  students diverge from the modal on-time progression.
- Assuming a German "Klasse 12" student is in their final pre-university year without
  knowing the state/school's G8-vs-G9 track.
- Parsing French grade terms numerically, or assuming a US-style 4-year "high school"
  maps onto a single French institution.
- Treating "IB DP1/DP2" as directly convertible to a specific US grade without knowing the
  host school's own numbering.
- Treating a program's descriptive/marketing age text as a binding filter when its codified
  rule is grade-based.
- Applying one universal "age as of X" convention to every opportunity.
- Back-filling a missing grade or age field from the other field via a generic chart when
  the program itself only published one of the two dimensions.

## Safe inferences

- Within the US, and within Türkiye specifically (the one verified safe pair), on-time
  progression of ~1 grade per age-year is usable as a default estimate **only** when a
  program does not itself state an age, clearly labeled as an estimate.
- When a program states both grade and age, store and evaluate both independently.
- When a program states only one, leave the other null rather than back-fill.
- A student's country + grade/year label can be converted to an approximate age range for
  matching **only** for country pairs whose offset/structure has been explicitly verified
  and encoded (Türkiye↔US direct; UK↔US with the verified -1 offset; France/Germany via
  dedicated resolvers) — never one global numeric-offset constant.

## Unresolved questions

No program studied publishes a grade/age conflict tie-break rule. Germany's G8/G9 split is
partially reversed/re-reversed by individual states over the past decade and may need
per-school (not just per-state) tracking. No Eurydice/MEB source gives a directly-quoted
per-individual-grade age breakdown for Türkiye — the per-grade figures here are an
extrapolation from an aggregate "ages 14-18 across 4 years" figure, not a directly quoted
table. France's age figures rest on secondary sources only (education.gouv.fr blocked
fetch). IBO's own DP page was never independently read in full (HTTP 403 throughout).
