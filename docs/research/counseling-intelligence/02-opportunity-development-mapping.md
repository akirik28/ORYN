# Opportunity → Development Mapping & Evidence-State Model

Answers: *what does participating in a given opportunity actually demonstrate or develop, and how
does that differ between merely participating and placing, winning, publishing, or leading it?*

## Why this needs to be deeper than the shipped mapping

`lib/opportunities/matching.ts` already exports `CATEGORY_DIMENSIONS`, a static lookup from each of
the 13 `OpportunityCategory` values to 1-2 `ProfileDimension`s (e.g. `competition` →
`["awards_distinction", "academics"]`). This is a reasonable coarse default and this package does
not propose removing it. But it has one structural limitation the mission brief specifically asks
this research to address: **it does not vary by outcome.** A student who submitted an entry that
was not selected and a student who won first place both map to the identical dimensions at the
identical implied strength under the current model — the actual weighting-by-outcome happens
implicitly later, if at all (a win becomes a separate `Award` row scored by `awards.ts`; mere
entry may not be logged as anything at all if the student doesn't think to add it). This document
defines the missing middle layer: an **evidence-state model** that sits between "which category"
and "how strong is this evidence," usable regardless of which specific opportunity or category
produced it.

## Part A — Two orthogonal axes: achievement tier and verification status

A single piece of student evidence has **two independent properties**, and conflating them is a
concrete unsafe-inference risk (cross-referenced in `08-unsafe-inference-rules.md`, owned by a
peer session on this same mission — see this package's handoff for the coordination note):

1. **Achievement tier** — *what actually happened* (did the student merely register, actually
   participate, place, win, publish, present, ship, lead, or found). This is what the mission
   brief's "participated / finalist / award / winner / publication / presentation / completed
   project / leadership role / founder role" list describes.
2. **Verification status** — *how well-substantiated the claim is*. ORYN already has a first-class
   type for exactly this: `EvidenceStatus` (`types/database.ts:32`) = `self_reported` |
   `evidence_added` | `verified` | `verification_rejected`, applied uniformly to activities,
   awards, certifications, research experiences, and volunteering. This is a separate, orthogonal
   pipeline from research/output tracking, and this document deliberately reuses that exact
   vocabulary rather than inventing a second, competing "verification" concept.

**These compose as a matrix, not a single scalar.** A self-reported "winner" claim and a verified
"participant" claim are both real evidence, but they are strong in different ways: the first has a
high achievement tier and low certainty, the second has a low achievement tier and high certainty.
[[RULE-COUNSEL-010]] **Treating "self-reported winner" as more reliable evidence than "verified
participant" would be an unsafe inference** — tier should never silently override verification
status when the two disagree; a counselor recommendation's confidence should reflect the weaker of
the two, while its *substance* (what the recommendation is about) can still reflect the claimed
tier, worded appropriately hedged ("you reported winning X — Oryn hasn't verified this, but based
on what you've shared..."). This is the same "fact / inference / unknown" discipline
`docs/counselor-core-plan.md` §4 already applies to dimension-score confidence — this document
extends the identical discipline to achievement-tier claims specifically.

### The achievement-tier ladder

Ordered roughly by evidentiary strength *within a single opportunity*, not comparable across
opportunities of different selectivity (a "winner" of an unselective local contest is not
automatically stronger evidence than a "finalist" in a highly selective national one — selectivity
of the opportunity itself is a separate, opportunity-level property, covered in Part B):

| Tier | Description | Which dimensions it typically strengthens beyond mere participation |
|---|---|---|
| `registered` | Signed up / accepted into a program, hasn't started or evidence doesn't yet exist | None yet — not real evidence of development, only of intent. Should not be scoreable. |
| `participated` | Attended/completed without special distinction | The category's base `CATEGORY_DIMENSIONS` at full weight — this is real evidence of exposure and commitment (duration/hours still count) even with no external validation |
| `completed_project` | Produced a concrete artifact/output as part of the experience (a working prototype, a written report, a dataset) without external competitive recognition | `execution_project_depth` in addition to the category's base dimensions — completion is itself an evidence-state upgrade from mere attendance, per `execution.ts`'s "reward execution more than idea creation" |
| `finalist` / `semifinalist` | Advanced through a selection round but did not win | `awards_distinction` at a **moderate** bump, not the full winner bump — this tier is exactly what the mission brief warns must not be conflated with winning, and it currently has **no clean home in the schema** (see Part C's worked example) |
| `award` / `honorable_mention` | Received formal recognition below the top tier | `awards_distinction` moderate-to-strong, scaled by the award's `level` (international/national/state/school — reusing `awards.ts`'s existing tiering, §01) |
| `winner` | Top placement | `awards_distinction` at full strength, plus reinforcement of whichever dimension the competition's *subject* maps to (a mathematics-olympiad win reinforces `academics`/`intellectual_curiosity`, not only `awards_distinction` — see Part C) |
| `publication` / `presentation` | Formal dissemination of work (peer-reviewed paper, preprint, school journal, conference talk, poster session) | `research` (already modeled exactly this way in `research.ts`'s `OUTPUT_BONUS`) and, for non-research contexts (e.g. a hackathon demo, a design showcase), `execution_project_depth` |
| `leadership_role` | Held a role with real scope/duration/people-led within the opportunity (team captain, lab sub-team lead, program student-ambassador) | `leadership`, in addition to the category's base dimensions — already exactly how `leadership.ts` scores this when the activity's `is_leadership_role` flag is set |
| `founder_role` | Originated the effort rather than joining an existing one | `entrepreneurship` in addition to `execution_project_depth`, exactly as `entrepreneurship.ts`'s `isEntrepreneurial()` already implements — a founder role can arise inside *any* category (a "student_program" a student started themselves, not only formal "entrepreneurship"-category ventures) |

**A student can and usually does occupy more than one tier from one opportunity** (e.g. `finalist`
+ `leadership_role` if they captained the team that made finals) — tiers are tags on an evidence
item, not a single-select state. This is consistent with §01's finding that one activity should
legitimately feed multiple dimensions.

### Empirical calibration: publication/winning is the minority outcome, not the expected one

The mission brief explicitly warns: *"do NOT claim that every research program creates
publication-quality evidence"* and *"do NOT assume merely entering a competition is equivalent to
winning."* This is not just a caution to state rhetorically — there is real data behind it. A
peer-reviewed study of mentored medical-student research programs (Kruse et al., cited via PMC)
found that **only about one-quarter of mentor-mentee research pairings resulted in publication**
(26% for a summer internship cohort, 25% for a fourth-year elective cohort), even in a
well-resourced, individually-mentored research context. (Source: PMC8530554, peer-reviewed —
**high confidence for the specific population studied, medium confidence as a directional analogue
for high-school research programs**, since the population is medical students, not high
schoolers, and this package found no equivalent published study specifically on high-school
mentored-research publication rates. Flagged as a real limitation, not smoothed over.)
[[RULE-COUNSEL-011]] Similarly, by construction, competition winner/finalist counts are small
relative to entrants at any genuinely selective competition (e.g. Regeneron ISEF: ~1,600
qualifying finalists reach the international stage from a much larger pool of local/regional/state
qualifiers; roughly 600 of those finalists receive an award of some kind — meaning most ISEF
*finalists themselves*, already a highly selected group, do not win a category award). (Source:
Society for Science, official ISEF fact sheet and awards pages — high confidence for these
specific figures.) [[RULE-COUNSEL-012]]

**Product implication:** a recommendation engine should never phrase a research-program or
competition recommendation as if publication or winning is the expected outcome. The honest framing
is "this gives you [mentored process / competitive experience] — a strong minority of participants
also achieve [output], but the process itself is real, complete evidence on its own" — directly
informs `07-explainability-framework.md`'s templates (owned by a peer session on this mission —
see the handoff for the coordination split).

## Part B — Opportunity-level properties independent of the student's outcome

Two properties belong to the *opportunity*, not the student's result within it, and should not be
conflated with achievement tier:

- **Selectivity / entry bar** (how hard it was to get in at all) — already informally present via
  `opportunities.cost`/eligibility fields but not a first-class "selectivity" field in the schema
  today (flagged in `10-open-questions.md`). A highly selective program's mere `participated` tier
  can be worth more, developmentally, than an unselective program's `winner` tier — this is why
  achievement tier (Part A) and selectivity must stay separate axes, never collapsed into one
  prestige number (directly consistent with the mission's explicit ban on "invented prestige
  scores").
- **Verification/recency of the opportunity record itself** — `opportunities.verification_state`
  (`verified_current` / `verified_historical` / `discontinued` / `unverified` / `conflicting`,
  already shipped) is about whether *the opportunity listing* is currently real and open, which is
  a completely different question from whether *the student's claimed evidence* about it is
  verified (`EvidenceStatus`, Part A). A student can have `verified` (evidence-status) proof of
  participation in an opportunity whose own listing is now `discontinued` — the evidence remains
  valid; only future recommendations of that same opportunity to other students should stop.

## Part C — Deepened category → dimension mapping, with a worked example

Extending `CATEGORY_DIMENSIONS` conceptually (not editing the code — this is a research
recommendation for a future engineering pass) by adding **subject-reinforcement**: a competition,
award, or publication should reinforce not only `awards_distinction`/`research` generically but
also whichever dimension its *subject matter* maps to, using the same field-matching approach
`lib/opportunities/matching.ts`'s `computeRelevanceScore` already uses for interest overlap:

| Category | Base dimensions (current, unchanged) | Subject-reinforcement when the achievement tier is `award`/`winner`/`publication` |
|---|---|---|
| `competition` | `awards_distinction`, `academics` | + `research` if the competition is research-based (e.g. a science fair); + `entrepreneurship` if it's a pitch/business competition; + `execution_project_depth` if it's a build/hackathon-style competition scored separately from `hackathon` category |
| `research` | `research`, `intellectual_curiosity` | + `awards_distinction` only if the output itself won a distinct award/competition (e.g. a science-fair prize for the same project) — publication alone stays inside `research`, per `research.ts`'s existing design |
| `internship` | `career_exploration`, `execution_project_depth` | + `leadership` if the role description indicates real scope beyond task execution |
| `entrepreneurship` | `entrepreneurship`, `execution_project_depth` | + `leadership` if the venture involved leading a team |
| `hackathon` | `execution_project_depth`, `entrepreneurship` | + `awards_distinction` on a placement |

**Worked example — where "finalist" goes today, concretely:** a student who is a national
science-fair *finalist* but not a category winner has, in the current schema, exactly two homes for
that fact: log it as an `Activity` (category `competition`, no distinction captured beyond
whatever free text goes in the description) or log it as an `Award` with `level` set to free text
like `"National Finalist"`. If logged as an `Award`, `awards.ts`'s `levelPoints()` regex-matches
`/national/` in the level text and assigns 11 points — **the same 11 points a student would get for
writing `level: "National"` after actually winning a national award**, because the regex has no
concept of "finalist" vs. "winner" at all, only geographic/institutional scope (international/
national/state/school). **This is a real, concrete gap this research surfaces, not a hypothetical
one** — a `finalist` result and a `winner` result at the same geographic level currently score
identically if a student (reasonably) writes "National Finalist" as their award level. Flagged in
`10-open-questions.md` as a candidate future scorer refinement (parse a placement/outcome word
separately from geographic scope), explicitly out of scope for this session to fix (no code
changes). [[RULE-COUNSEL-013]]

## Part D — Cross-cutting role attributes are not category-bound

`leadership_role` and `founder_role` (Part A) can arise inside *any* category, not just
`fellowship`(current base dimension for leadership) or `entrepreneurship`. A student who starts
their own tutoring initiative would categorize it as `student_program` or `community_impact`-type
volunteering, but the *founding* of it should still trigger `entrepreneurship`/
`execution_project_depth` reinforcement regardless of category — exactly the pattern
`entrepreneurship.ts` already implements by filtering on role-text/revenue rather than on a
`category` field at all. **Generalization for future work:** any evidence item should be
evaluable for founder/leadership role attributes independent of its category, the same way it
already is for entrepreneurship. [[RULE-COUNSEL-014]]

## Rules established in this document

- `RULE-COUNSEL-010` — Achievement tier and verification status are independent axes; a
  recommendation's stated confidence should reflect the weaker of the two, never let a high tier
  claim substitute for low verification. Confidence: high (logical/structural, directly extends
  shipped `EvidenceStatus` design).
- `RULE-COUNSEL-011` — Do not phrase research-program recommendations as if publication is the
  expected outcome; frame the mentored process itself as complete, valid evidence, with output as
  a minority bonus outcome. Confidence: medium (population mismatch caveat noted above).
- `RULE-COUNSEL-012` — Do not phrase competition recommendations as if placing/winning is the
  expected outcome, even for students who make it to a selective final round. Confidence: high
  (official organizer data).
- `RULE-COUNSEL-013` — Do not equate "finalist"/"semifinalist" achievement-tier language with
  "winner" language when both happen to share a geographic/institutional scope word — these are
  different tiers and should not silently score identically. Confidence: high (identified as a
  concrete, present-tense scoring gap, not a hypothetical).
- `RULE-COUNSEL-014` — Evaluate founder/leadership-role attributes on any evidence item regardless
  of its opportunity category, not only within categories nominally "about" leadership or
  entrepreneurship. Confidence: high (already the shipped pattern for entrepreneurship
  specifically; this generalizes it).
