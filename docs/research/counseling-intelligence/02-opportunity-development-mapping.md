# 02 — Opportunity → Development Mapping

**Answers:** What does participating in a given opportunity type actually demonstrate or develop,
and how does that differ by evidence state (participated vs. finalist vs. award vs. leadership
role)?

**Ground truth this document extends:** `lib/opportunities/matching.ts`'s exported
`CATEGORY_DIMENSIONS` — a flat `Record<OpportunityCategory, ProfileDimension[]>` over the 13 real
`OpportunityCategory` values. That mapping is reused as-is by `lib/counselor/candidates.ts` to set
`addressesDimensions` on every opportunity-sourced `CandidateAction`. This document does not
propose changing that constant's shape (still category → 1-2 dimensions) — it documents the
**evidence-state layer** that sits on top of it, which is real, load-bearing counseling knowledge
that the current flat mapping cannot express, and which a future scorer refinement could consume
without changing `CATEGORY_DIMENSIONS`'s type signature at all (e.g., as a multiplier applied
alongside it, not a replacement for it).

## 1. The two things a flat category→dimension map cannot express

**Problem A — evidence-state blindness.** Today, a student who merely *registered* for a
competition and a student who *won* it at the international level both produce a
`CandidateAction`/match tagged with the same `["awards_distinction", "academics"]` dimensions, at
implied-equal strength, if both are represented as "a competition opportunity the student is
linked to." In practice: `opportunity_matches`/`saved_opportunities` records *interest and
application status* (`SavedOpportunityStatus`: `saved`/`applied`/`not_interested`), while actual
*outcome* (finalist, placed, won) is captured, if at all, as a free-text `awards` entry the student
creates separately with its own `AWARD_LEVEL_SUGGESTIONS` tier. **These two data paths are not
currently joined** — this is a real, concrete gap worth naming plainly for the engineering handoff:
there is no structural link from "applied to Opportunity X" to "the awards.title entry describing
the outcome of Opportunity X," so a future evidence-state model needs either a new relational link
or a matching heuristic, neither of which this research package implements.

**Problem B — sub-type heterogeneity within one category.** `"competition"` alone spans:
mathematical/algorithmic olympiads, business-plan/case competitions, science fairs, debate,
robotics, hackathon-adjacent build competitions, and creative-writing contests. These develop
materially different things — a mathematics olympiad demonstrates quantitative/algorithmic
reasoning under time pressure; a business-plan competition demonstrates applied
strategy/communication; a science fair demonstrates the `research` construct from
`01-development-taxonomy.md` far more than `academics`. The current `["awards_distinction",
"academics"]` mapping for `competition` is a reasonable central tendency but is not equally true of
every real opportunity tagged `competition`. The same heterogeneity exists inside `hackathon`
(a 24-hour build sprint develops `execution_project_depth` very differently depending on whether it
was solo or a 5-person team with a specific individual contribution) and `academic_program`/
`online_program` (a rigorous graded university-extension course vs. a self-paced exploratory MOOC).
This is the same distinction the parallel career-intelligence research package's mission brief names
directly — "this competition provides algorithmic problem-solving evidence rather than
software-development evidence" — and this package independently confirms it is real and worth a
future `fields`/skill-tag refinement on the `opportunities` row itself (currently `fields: string[]`
is free-text and does not carry this distinction). Flagged in `10-open-questions.md`, not solved
here.

## 2. A generic evidence-state ladder (applies across categories)

Ordered weakest → strongest; a given opportunity/student pairing sits at exactly one rung, and a
future model should treat each rung as *raising the confidence/strength* of the same
`CATEGORY_DIMENSIONS` dimensions, not changing which dimensions apply:

| Rung | Description | Typical current data trace |
|---|---|---|
| 0. Interested | Saved, not yet acted on | `saved_opportunities.status = 'saved'` |
| 1. Applied/Enrolled | Applied or accepted into the program | `status = 'applied'` |
| 2. Participated | Attended/completed without special distinction | usually untracked structurally today — would live in free-text `activities`/`summer_programs` description |
| 3. Advanced/Selected further | Made a cut beyond base participation (semifinalist, selected cohort within a program, invited to present) | free-text only today |
| 4. Placed/Awarded | Ranked, medaled, won | `awards` entry, `AWARD_LEVEL_SUGGESTIONS` tier |
| 5. Led/Organized | Took on organizing or mentoring responsibility within the activity itself (team captain, competition organizer, teaching assistant in a program) | free-text `activities`/`leadership_experiences` |
| 6. Produced lasting output | Something exists after the opportunity ends that didn't before — a paper, a shipped repo, a founded follow-on initiative | `projects`, `research_experiences.output_type`, `ResearchOutputType` ladder |

Rungs 4–6 are not strictly ordered relative to each other in every case (a student can place in a
competition without ever taking an organizing role, or vice versa) — treat rung as a profile per
opportunity, not a single scalar, consistent with `07-explainability-framework.md`'s "no fake
single-number certainty" principle.

## 3. Per-category detail

Each entry: **primary current mapping** (from `CATEGORY_DIMENSIONS`, unchanged), **what the ladder
adds**, **sub-type heterogeneity note** where real, **what "strong evidence" looks like for a
counselor reading it themselves** (used to sanity-check any future automated weighting against
human judgment).

### `competition` → `["awards_distinction", "academics"]`

Ladder adds: rung 2 (entered/competed) is real career-exploration/curiosity evidence even with no
placement — the founder spec's own worked example (Phase 39) explicitly treats *entering* a
competition as lower-value than a placement, not valueless. Rung 4 (placement) is where
`awards_distinction` strength should scale steeply by `AWARD_LEVEL_SUGGESTIONS` tier — a
School-level certificate and an International medal should not read as the same strength of
evidence even though both are technically "an award."

Sub-type heterogeneity: high (see §1). A counselor-quality read always asks *which kind* of
competition before judging what it demonstrates, not just that it was "a competition."

### `research` → `["research", "intellectual_curiosity"]`

Ladder adds: this category benefits most directly from `ResearchOutputType`'s existing ladder
(`none` → `presentation`/`poster`/`school_journal` → `preprint` → `peer_reviewed_publication`).
Rung 1-2 (enrolled in/attending a structured summer research program) is a legitimate
**exposure**-stage signal, especially for younger students (see `03-recommendation-timing.md`) —
it should not be scored as equivalent to rung 6 (own independent project with real output), but it
is not nothing either; it is evidence the student sought out research exposure, which is itself
part of `career_exploration`. This is the dimension where conflating rungs is most consequential
(§2.4 of `01-development-taxonomy.md`).

Sub-type heterogeneity: moderate — bench-lab research, computational/data research, and humanities
research produce different skill evidence (`06-major-family-evidence/` covers this per field), but
the core `research`/`intellectual_curiosity` mapping holds reasonably well across all of them.

### `internship` → `["career_exploration", "execution_project_depth"]`

Ladder adds: an internship's `execution_project_depth` credit should hinge on whether the student
did substantive, attributable work (rung 6-adjacent: "built X," "analyzed Y dataset") vs.
observational shadowing (rung 2: valuable `career_exploration` evidence, weak
`execution_project_depth` evidence). Today nothing in `work_experiences` structurally distinguishes
these beyond free-text `description` — a real gap, not solved here.

Sub-type heterogeneity: moderate, mostly along the observation-vs-substantive-work axis above
rather than across fields.

### `summer_program` → `["intellectual_curiosity", "career_exploration"]`

Ladder adds: summer programs are disproportionately an **exposure**-stage opportunity (see
`03-recommendation-timing.md`'s grade-banding) — the current mapping is well-suited to rungs 1–3 and
should not be inflated by a mere selective-admission summer program into implying deep, sustained
capability the way rung 6 in `research`/`entrepreneurship` would. Selectivity of the *program itself*
(a well-known highly selective summer program vs. an open-enrollment one) is a real but
separate-from-dimension-mapping signal — closer to `awards_distinction`-adjacent prestige than to
what the program taught, and should not be silently folded into `intellectual_curiosity` strength.

Sub-type heterogeneity: high — a summer program can be almost anything (STEM research immersion,
pre-college coursework, leadership/civic program, arts intensive) so `fields`/subject tags matter
more here than for any other category to know what it actually develops.

### `fellowship` → `["leadership", "research"]`

Ladder adds: "fellowship" varies enormously by organizer — some are effectively research
apprenticeships (research-heavy), others are youth-leadership/civic cohorts with a
capstone-project structure (leadership-heavy, execution-heavy). The current dual mapping is a
reasonable average but a counselor reading a specific fellowship's actual structure would weight
one or the other dimension much more heavily than the flat mapping implies. Rung 6 (a fellowship
capstone project that ships something real) should credit `execution_project_depth` too, which the
current flat mapping omits entirely.

### `scholarship` → `["academics"]`

Ladder adds: winning is nearly always rung-4-equivalent by definition (a scholarship is an award),
so the evidence-state distinction that matters most here is *selectivity of the scholarship* itself
(need-based vs. merit vs. highly competitive national scholarship), not participation depth — a
different axis than most other categories. A scholarship *application* alone (rung 1, not yet
decided) should not be treated as `academics` evidence at all.

### `volunteering` → `["community_impact"]`

Ladder adds: rung 5 (led/organized volunteers, e.g., founded or ran a recurring service initiative)
should add `leadership` as a secondary dimension — the current flat single-dimension mapping misses
this legitimate overlap (see `01-development-taxonomy.md` §2.6). Hours logged alone (rung 2, no
distinguishing responsibility) is the weakest legitimate signal in this category, consistent with
the over-counting risk already flagged in the taxonomy doc.

### `entrepreneurship` → `["entrepreneurship", "execution_project_depth"]`

Ladder adds: the single category where rung matters most acutely — "idea stage" (rung 1-2
equivalent: has a business plan, joined an entrepreneurship program) is real
`intellectual_curiosity`/`career_exploration` evidence but materially weaker
`entrepreneurship`/`execution_project_depth` evidence than rung 6 (built, launched, tested against
real users/customers) per `01-development-taxonomy.md` §2.5's sub-facet ladder
(idea → built → tested → sustained). The founder spec's Phase 39 worked example ("avoid another
club... unless it creates a unique measurable outcome") is precisely a rung-based judgment already.

### `hackathon` → `["execution_project_depth", "entrepreneurship"]`

Ladder adds: rung 4 (placed/won) matters, but even rung 2 (participated, shipped a working demo in
the time box) is legitimate `execution_project_depth` evidence in a way that mere `hackathon`
*registration* is not — hackathons are unusual among these categories in that meaningful rung-2
attendance almost always implies at least a minimal build, given the format. Team-size/individual
contribution is the biggest open measurement gap here (same as `internship`).

### `academic_program` → `["intellectual_curiosity", "academics"]`

Ladder adds: distinguish credit-bearing/graded programs (closer to `academics`-strength evidence,
comparable in spirit to `CourseLevel`'s `dual_enrollment`) from ungraded/exploratory ones (closer to
pure `intellectual_curiosity`). The current flat mapping already hedges across both via the
two-dimension list, which is reasonable; the ladder mainly helps decide *which* of the two to weight
higher for a specific program.

### `online_program` → `["intellectual_curiosity", "academics"]`

Same reasoning as `academic_program`, with one addition: online/MOOC-style programs have the
**lowest floor** of any category (extremely low- or no-selectivity enrollment is common and
legitimate), so rung 1 ("enrolled") should carry noticeably less weight here than rung 1 in a
selective in-person `summer_program` or `fellowship` — completion (rung 2/3, e.g., an issued
certificate of completion) is the meaningful threshold, not enrollment.

### `conference` → `["intellectual_curiosity", "career_exploration"]`

Ladder adds: attending (rung 2) is a legitimate but shallow signal, appropriate mainly for younger
students per `03-recommendation-timing.md`; presenting/speaking at a conference (rung 5-adjacent) is
meaningfully stronger and should add `awards_distinction`-adjacent or `leadership` credit depending
on context — the current single-mapping-regardless-of-role is the least differentiated of any
category and the one most likely to need this ladder in practice, since "attended" and "presented
research at" are described by the same `conference` category today.

### `student_program` → `["career_exploration"]`

The catch-all category (leadership/civic cohort programs, model UN, youth advisory boards, etc. —
whatever does not fit a more specific category). Given its breadth, the ladder here should be read
per-program rather than generalized; this is the category where relying on the specific program's
own `fields`/description matters most, and the single generic `career_exploration` mapping is
appropriately conservative as a floor.

## 4. Recommended shape for a future refinement (not implemented here)

A `strengthMultiplier` (e.g., `0.3` participated / `0.6` advanced / `1.0` placed-or-shipped-output /
`1.2` led-or-organized) applied to whatever `CATEGORY_DIMENSIONS` already returns, driven by a
small, explicit `evidenceRung` field a future migration could add per relevant achievement record
— additive to the existing schema, not a replacement. This preserves
`lib/opportunities/matching.ts`'s existing exported contract exactly (still category → dimensions)
while letting `lib/counselor/scoring.ts`'s `dataQuality`/`gapRelevance` weighting (already
documented in `docs/counselor-core-plan.md` §8) consume a sharper signal than presence/absence.
Concrete schema shape intentionally left to the engineering handoff, not specified here (research
scope, not implementation scope).

## Sources referenced in this document

Reuses `S-UCAS-PS` and `S-EXTRA-DEV` from `01-development-taxonomy.md` (depth/leadership-substance
framing applies identically here). No new external sources were load-bearing for this document —
its content is primarily a structural analysis of ORYN's own existing code (`lib/opportunities/
matching.ts`, `types/database.ts`), cited by file path throughout rather than by external claim.
