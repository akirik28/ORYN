# Prerequisites and timing patterns by opportunity category

Part of R4 (opportunity eligibility intelligence). Full sourcing and quoted evidence:
`data/research/opportunity-eligibility/opportunity-eligibility-v1.json` →
`prerequisites_and_timing`. Scope: the 5 categories that dominate ORYN's live data
(summer_program, competition, research, scholarship, internship — 337 of 352 live rows,
97%). Volunteering (1 row) and fellowship (2 rows) were explicitly out of scope this pass.

## Prerequisites by category

| Category | Common patterns | Notable finding |
|---|---|---|
| `summer_program` | Portfolio/audition, coursework prerequisite, GPA/academic standing, school sponsorship | Elite programs (PROMYS) explicitly *disclaim* prerequisites applicants commonly assume exist ("does not require prior calculus") |
| `competition` | School sponsorship, team-vs-individual structure, prior experience (rare) | Team structure rules vary sharply: Science Olympiad requires single-school teams; Regeneron STS is explicitly individual-only; Diamond Challenge allows any adult advisor |
| `research` | Coursework prerequisite (mostly soft/absent), GPA/academic standing, prior experience explicitly *not* required | Recurring pattern: elite programs (Simons, RSI, PRIMES) state "prior research experience is not a prerequisite" defensively, while still favoring strong academic records |
| `scholarship` | GPA/academic standing, need-based criteria, portfolio/project (merit scholarships) | GPA numbers, when stated, cluster at ~3.0 (baseline floor) or ~3.3 (strong-standing floor); need-based programs split between explicit hard income ceilings (Horatio Alger: $55k) and deliberately holistic no-cutoff review (QuestBridge) |
| `internship` | GPA/academic standing, prior leadership/activity experience, coursework (rare/soft) | No study found any program with a literal named-course prerequisite ("must have completed AP Chemistry") — every coursework-adjacent requirement found was qualitative ("strong preparation") |

**Cross-category finding**: no researched program in any category names a specific required
course as a hard gate. Where coursework matters, programs gate on demonstrated ability
(test scores, GPA, portfolio, recommendation) rather than a transcript line item. This may
not generalize to categories/regions outside this sample (European program-specific subject
prerequisites, medical-track programs) — flagged as unresolved, not confirmed absent.

## Timing/deadline architecture by category

| Category | Deadline architecture | Example |
|---|---|---|
| `summer_program` | Priority tier + regular/rolling tier | Interlochen: priority deadline Jan 15, "continue to accept applications following the deadline until program enrollment is full" |
| `competition` | Registration/entry deadline split from event date(s), often with an intermediate "kickoff" | FIRST Robotics: team registration closes Nov 17; kickoff Jan 9; season runs into spring. Individual-research competitions (Regeneron STS) instead use one fixed submission deadline with no separate "event." |
| `scholarship` | Single annual cycle tied to the applicant's academic/graduating year | Coca-Cola Scholars: opens Aug 3, closes Sept 30, tied to "2026-2027 academic year" cohort. A minority (Horatio Alger) run multiple windows per year for different applicant tracks. |
| `research` | Single annual window (roughly Nov-March) for a fixed summer cohort | RSI: deadline Dec 10 for a summer program — one hard deadline, not a priority/regular tier, likely because cohorts are small and highly selective |
| `internship` | Rolling, often multiple session-based windows per year | NASA OSTEM: separate Spring/Summer/Fall deadlines (Sept/Feb/May) — near-continuous applicability across the year |

**Implication for ORYN's `deadline` field**: a single scalar deadline field fits
scholarships and research programs reasonably well, but under-represents competitions
(registration vs. event date are genuinely different dates with different implications)
and internships (multiple session windows per year, not one).

## `current_cycle_label` freshness signals

The clearest lexical marker of a **stale** page is "applications are now closed" language
with no forward pointer. The clearest marker of a **current, well-maintained** page is one
that names *both* the just-closed cycle and a forward-pointing next cycle together (e.g.
"Applications for 2026 have closed. Please check back in October for 2027 program
details.") — that combination is a stronger positive signal than a bare future deadline
alone, and safer to parse than a page showing only a past year with no forward pointer
(which is the most dangerous case: several secondary/aggregator sources found during this
research were themselves stale in exactly this silent way).

Cycle-year numbering itself is **not standardized** across programs — some label by cohort
year (Regeneron "STS 2027" for a deadline that falls in Nov *2026*), others by academic-year
span ("2026-2027 academic year"), others by literal program dates ("June 1 - August 7,
2026"). A single fixed `YYYY` regex cannot safely extract "the current cycle year"; it must
be parsed per-program.

Rolling-deadline programs (NASA OSTEM, some CTY tracks) have no single open/closed binary
at all — staleness for these requires checking whether the *most recent* of several session
dates has passed, not just whether any deadline text exists.

## Unsafe inferences

- Assuming every program in a category shares the same prerequisite pattern — within
  `research` alone, Simons explicitly disclaims a prior-research requirement while PRIMES
  explicitly expects "a very advanced background."
- Inferring a numeric GPA threshold from qualitative language ("strong academic record") —
  most programs researched deliberately avoid a hard number even when GPA clearly matters;
  inventing one violates the same no-false-precision principle as inventing an admissions
  probability.
- Treating "school sponsorship required" as universal for competitions — Regeneron STS is
  explicitly individual, Diamond Challenge only requires a generic adult advisor.
- Using one fixed year-regex to extract a "current cycle" — the same literal year can mean
  different things across programs.
- Treating "applications closed" as automatically stale/deprioritizable without checking
  for a forward-pointing next-cycle statement — some closed pages are more trustworthy
  freshness signals than a stale unlabeled deadline from a prior year.
- Using secondary/aggregator "guide" sites as the sole source for any single fact — several
  indexed aggregator pages found during this research themselves referenced stale
  (2024/2025) cycles while purporting to describe "current" programs.
- Assuming rolling-admission programs carry no staleness risk — they still have real
  per-session close dates that pass.

## Safe inferences

- A page with both a past-tense closure statement and a named next-cycle pointer is a
  strong current/well-maintained signal, distinct from a stale-and-abandoned page.
- Team/multi-round competitions reliably separate registration from event date(s) —
  justifies modeling `deadline` as potentially plural/staged for this category.
- Scholarships reliably run one deadline per applicant-track per year tied to graduating
  class/academic year — supports a simpler single-deadline model for this category
  specifically.
- Research programs reliably show one winter/spring deadline ~4-6 months before a summer
  program start — a reasonable prior, still requiring per-program verification.
- An explicit prerequisite disclaimer ("prior research experience is not required") is
  itself useful structured data for the advisor — it corrects a commonly assumed barrier,
  which is exactly the fact-vs-assumption distinction the advisor should surface.

## Unresolved questions

Several official pages blocked automated fetch (cee.org/RSI, stonybrook.edu/Simons,
cty.jhu.edu, horatioalger.org, med.stanford.edu) — quotes for these are search-engine
excerpts, not verbatim live fetches, and should be re-verified before being treated as
fully authoritative. Whether the patterns found here (soft qualitative prerequisites,
priority/regular tiering, explicit stale/current language) hold for the smaller,
less-resourced programs that dominate ORYN's actual 352-row dataset — this pass sampled
well-known, elite/selective US programs because they dominate search results and have
well-maintained pages; smaller programs were not sampled and may use less standardized
language. Volunteering and fellowship categories were out of scope entirely.
