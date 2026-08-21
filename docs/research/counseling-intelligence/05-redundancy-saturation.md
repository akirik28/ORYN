# Redundancy / Saturation Framework

Answers: *when should ORYN recommend against more of an already-strong area, and on what actual
evidence basis — not just an intuition that "more is worse"?*

## What's already shipped, and why it needs a richer model

Two separate, already-implemented mechanisms currently do redundancy-adjacent work, at two
different pipeline stages, and this document is careful not to conflate them:

1. **Per-dimension scoring saturation** (`lib/scoring/math.ts`'s `scoreCommitments`, used by 7 of
   the 9 dimension scorers): each dimension caps how many items count at full weight
   (`diminishingAfter`, e.g. `3` for leadership/awards/community-impact, `2` for research/
   execution/entrepreneurship) and discounts items beyond that by a `diminishingFactor` (`0.4` or
   `0.5` depending on dimension). This operates on **already-logged profile items**, computing the
   dimension *score*.
2. **Candidate redundancy decay** (`lib/counselor/config.ts`'s `REDUNDANCY_DECAY = 0.75`): a flat
   multiplier applied to the Nth *recommendation candidate* that addresses an already-seen
   dimension, in `lib/counselor/scoring.ts`'s ranking pass. This operates on **not-yet-taken
   opportunities being ranked for recommendation**.

Both are reasonable, and this document does not propose removing either. But both are **flat**:
neither varies by *what kind* of additional evidence is being added. A 4th leadership activity
that represents genuine escalation (a student who ran a 10-person club now organizing a
200-person regional event) and a 4th leadership activity that is a lateral repeat (another
club presidency, same scope, same duration) are currently discounted identically. This document's
main contribution is the missing variable: **redundancy should depend on tier progression
(`02-opportunity-development-mapping.md`'s achievement-tier ladder), not just item count.**

## 1. Honest accounting of the evidence — a place this research found real tension, not a clean answer

The intuitive story ("too many activities burns kids out and produces worse outcomes") is **not
as well supported by the primary peer-reviewed literature as the popular framing suggests, and
this package is not going to overclaim it.** Checked carefully rather than taken from the first
convenient secondary source:

- A large, nationally representative study (Educational Longitudinal Study: 2002 cohort, **N =
  13,130** US high schoolers) found that on average, 10th graders participated in only 2-3
  activities for about 5 hours/week, and that a substantial share of students reported **no**
  extracurricular involvement at all — i.e., under-involvement, not over-involvement, is the more
  common pattern at a population level. (Source: "Extracurricular Participation and Academic
  Outcomes: Testing the Over-Scheduling Hypothesis," *Journal of Youth and Adolescence* — peer
  reviewed, large nationally representative sample — high confidence for the descriptive
  statistics.) [[RULE-COUNSEL-023]]
- A longitudinal follow-up (Mahoney & Vest, *Journal of Research on Adolescence*, 2012, **N =
  1,115**, tracking participation intensity from adolescence into young adulthood) found that
  **higher participation intensity predicted *more* positive outcomes** (psychological
  flourishing, civic engagement) into young adulthood — the opposite direction from a simple
  burnout story. (Source: peer-reviewed, PubMed-indexed — medium-high confidence; this is one
  study, and "intensity of participation in activities a student is already engaged in" is a
  different construct from "breadth across many unrelated activities," so it should not be read as
  a blanket "more is always better" finding either.) [[RULE-COUNSEL-024]]
- Lower-tier secondary/practitioner sources (parenting-advice sites, some school-counseling blogs)
  assert a straightforward "overscheduling harms mental health" claim, sometimes citing specific
  hour thresholds (e.g. "10-15 hours/week"). This package could not trace these thresholds to a
  primary peer-reviewed source with that specific number — **treated as unvalidated folk
  numerology, not cited as a rule.** [[RULE-COUNSEL-025]]

**Conclusion for this framework: do not justify a "don't do this" recommendation on a wellbeing/
burnout claim ORYN cannot actually back with solid evidence.** The two justifications that *are*
well-evidenced (§2, §3 below) are sufficient on their own and should carry the entire weight of
this framework's rules.

## 2. Justification 1 (well-evidenced): signal quality to evaluators

Already established in `01-development-taxonomy.md` §2 and directly reusable here: MIT's official
guidance, Turning the Tide, and admissions-counseling consensus all converge on **more activities
without added depth reading as weaker evidence, not neutral evidence** — "checklist-style
extracurriculars pursued briefly with no clear personal investment" are specifically named as a
negative pattern by admissions-practice sources, and duplicate/overlapping activity descriptions
are flagged by counselors as adding no value to an application. This is not a wellbeing claim, it
is a claim about how the evidence is *read* — which is squarely in-scope for a product that exists
to help students build a legible profile. [[RULE-COUNSEL-026]]

**This justification's own scope limit, found by stress-testing it against `11-geography-
admissions-systems.md`'s later findings (cross-branch verification, peer session):** this
justification depends on there being an evaluator who actually reads a holistic activity file at
all. For a Tier-3-track target (Turkey/YKS being the extreme case — per `11`, **no application
file exists** in that pathway), there is no evaluator for "checklist-style activities" to read
poorly, so this justification simply does not apply — only §3's opportunity-cost justification
survives for that target. **This means redundancy/saturation guidance itself needs the same
geography-tier conditioning `11` proposes for the rest of this package**: for a Tier-3-track
student, "don't add another activity here" should be argued on time-cost grounds alone, never on
"it won't read well," since nothing reads it in that pathway. [[RULE-COUNSEL-093]]

## 3. Justification 2 (well-evidenced, logical rather than empirical): opportunity cost under a real time constraint

`AGENTS.md` Phase 64 already commits ORYN to collecting a student's realistic weekly time budget
and never recommending more hours of extracurricular work than a student has available. Given *any*
finite time budget, time spent on a 6th activity in an already-strong dimension is time not spent
on an actual gap — this is a direct, definitional consequence of scarcity, not a claim requiring
external empirical validation. **This is the core, load-bearing justification for redundancy
logic**, and it is one ORYN can compute rather than merely assert, once a time-budget figure is on
file. [[RULE-COUNSEL-027]]

## 4. A tier-aware redundancy model (extends, doesn't replace, the shipped flat decay)

Proposed conceptual refinement for a future engineering pass — every case below is expressed as "a
new candidate/item in a dimension the student already has evidence in," evaluated against the
**achievement-tier ladder** from `02-opportunity-development-mapping.md`:

| Pattern | Tier relationship | Redundancy verdict | Reasoning |
|---|---|---|---|
| **Escalation** | New item's tier (or scope/scale within the same tier) is higher than the student's existing best evidence in that dimension | **Not redundant** — should decay little or not at all | This is exactly what "depth over breadth" (§2) rewards; discounting it would optimize against the very thing admissions readers say they want |
| **Lateral repeat** | New item is the same tier, same rough scope, as existing evidence | **Redundant** — should decay close to the current flat `0.75`, or more | Adds a data point but not a new signal; this is the "duplicate activity, no added value" pattern counselors warn about |
| **Level-mismatch (too easy)** | New item's tier/level is *below* the student's existing best evidence (e.g. an intro-level program for a student who already did an advanced one) | **More redundant than a lateral repeat** — should decay more than `0.75` | This is the mission brief's explicit "too low-level for student's current experience" non-recommendation reason; it isn't just non-additive, it can read as a *regression* to an evaluator |
| **Different sub-skill, same dimension** | New item addresses the same `ProfileDimension` but a genuinely distinct facet (e.g. `research` via a wet-lab program vs. `research` via a computational-methods program for a student who already has wet-lab evidence) | **Not redundant, or only mildly so** | The dimension label is coarse (§01 finding); real breadth-within-a-dimension is legitimate development, not resume padding — a future refinement should not treat "same `ProfileDimension` tag" as sufficient grounds for full redundancy discount |
| **Cross-dimension reinforcement** | New item is in a *different* category but the *same underlying activity thread* (e.g. the research project the student already has now enters a competition) | **Not redundant at all** — this is `02`'s cross-dimension-overlap pattern, a single deepening thread, not portfolio padding | Should not be discounted by dimension-redundancy logic in the first place; this is the "deepen an existing project" case `docs/counselor-core-plan.md` §6 explicitly left to the optional LLM layer rather than a deterministic candidate — this framework agrees that's the right call, and notes it should specifically *not* be penalized as redundant if a future version does attempt it |

[[RULE-COUNSEL-028]] **Data availability note:** executing "escalation vs. lateral repeat"
distinction requires comparing tiers across time, which requires the achievement-tier data `02`
already flags as not structurally captured today (no field distinguishing "finalist" from
"winner," no explicit scope/scale field beyond free text). This is a conceptual model for a future
richer evidence system, not something implementable against today's schema without the same data
additions `02`'s open questions already name.

## 5. The other non-recommendation reasons in the mission brief — none of them are "redundancy" and should not share its logic

The mission brief lists several reasons ORYN should decline to recommend something, and it is worth
being precise that **only "duplicates an existing activity without adding depth" and "too low-level
for current experience" are actually redundancy in this document's sense.** The rest are different
failure modes that happen to produce the same UI outcome (don't show/deprioritize this) for
different reasons, and conflating the *reason* risks giving the student the wrong explanation:

- **Eligibility mismatch, deadline impossible, cost mismatch, geography mismatch** — these are
  **not about the student's profile at all**; they're already correctly modeled as `eligibility.ts`
  concerns (`known_ineligible`/`unknown`), separate from redundancy or ranking. A geography
  mismatch should never be explained to a student as "you don't need this" (implying a profile
  judgment) when the real reason is "you're not eligible" (a fact about the opportunity).
  [[RULE-COUNSEL-029]]
- **Requires prerequisites the student lacks** — this is a *sequencing* problem, closely related to
  the "level-mismatch (too advanced)" mirror image of §4's table, and closely tied to
  `03-recommendation-timing.md` (peer-owned) rather than to redundancy — the honest framing is "not
  yet, do X first," not "not valuable."
- **Prestige-only reasoning** — this is a *quality-of-justification* problem, not a redundancy
  problem: even a student's *first* activity in a dimension can be recommended for the wrong
  reason ("this looks good on an application") — already covered by `01`'s §2/RULE-COUNSEL-003 and
  belongs in `07-explainability-framework.md` (peer-owned) as a rule about what a valid "why" may
  and may not cite, not in this document.
- **Too many parallel commitments (over-commitment)** — this is the time-budget check (§3), applied
  at the level of the student's *total* schedule rather than any single dimension — distinct from
  redundancy because a genuinely non-redundant, well-matched, high-value opportunity can still be
  the wrong call *this week* purely on capacity grounds. The correct student-facing framing is
  temporal ("not now") rather than evaluative ("not useful") — getting this distinction right
  matters for trust: telling a student a good opportunity is "not valuable" when the real reason is
  "you don't have time" is a different, worse message than being honest about the actual
  constraint. [[RULE-COUNSEL-030]]

## 6. What "avoid_for_now" should actually be able to say

`lib/counselor/scoring.ts`'s `avoid_for_now` classification already exists and is deliberately
capped at one recommendation. Given §1-§5, the honest, defensible version of an `avoid_for_now`
explanation should be constructible entirely from **already-strong dimension + lateral/
level-mismatch tier relationship + explicit opportunity-cost framing against the student's stated
time budget** — never from an unevidenced wellbeing/burnout claim, and never silently reusing the
same template for what is actually an eligibility or sequencing issue. The founder-spec's own
worked example (`AGENTS.md` PHASE 39: *"Leadership is already one of your strongest profile areas.
Starting another school club is unlikely to materially improve your profile"*) is exactly this
shape — a dimension-strength claim plus a marginal-value claim, with no appeal to burnout or
wellbeing. This document confirms that example was the right instinct and gives it the evidentiary
basis it didn't originally cite. [[RULE-COUNSEL-031]]

## Rules established in this document

- `RULE-COUNSEL-023` — Do not assume most students are over-scheduled; large-sample data suggests
  under-involvement is at least as common. Confidence: high (large nationally representative
  study), but describes a population average, not any individual student.
- `RULE-COUNSEL-024` — Do not assert that higher activity intensity causes worse outcomes; at
  least one longitudinal study found the opposite direction for participation intensity
  specifically. Confidence: medium (single study, different construct than cross-activity
  breadth) — stated as a reason for caution, not as its own positive claim to build on.
- `RULE-COUNSEL-025` — Do not cite specific weekly-hour "overscheduling" thresholds (e.g.
  "10-15 hours") as research-backed; this package could not trace them to a primary source.
  Confidence: high that the specific numbers are unvalidated folk guidance, not that they're
  necessarily wrong.
- `RULE-COUNSEL-026` — Ground "don't add another activity in an already-strong area" in
  signal-quality-to-evaluators evidence (§2), which is well-supported, rather than in wellbeing
  claims, which are not. Confidence: high.
- `RULE-COUNSEL-093` — The signal-quality-to-evaluators justification (§2) does not apply for
  Tier-3-track targets with no application file (Turkey/YKS being the extreme case) — only the
  opportunity-cost justification (§3) survives there; condition redundancy guidance on target-tier
  the same way `11-geography-admissions-systems.md` conditions the rest of this package.
  Confidence: high (found via cross-branch stress-testing, peer session — logical consequence of
  `11`'s own findings applied to this document specifically).
- `RULE-COUNSEL-027` — Ground the same recommendation in opportunity cost against the student's
  actual stated time budget wherever that data exists; this is the primary, most defensible
  justification available. Confidence: high (logical necessity given a finite time budget, not an
  empirical claim requiring its own external validation).
- `RULE-COUNSEL-028` — Redundancy strength should depend on tier relationship (escalation / lateral
  repeat / level-mismatch / different-sub-skill / cross-dimension-reinforcement), not merely on
  which `ProfileDimension` an item shares with existing evidence. Confidence: high as a conceptual
  model; implementation is gated on achievement-tier data this package has already flagged as not
  yet structurally captured.
- `RULE-COUNSEL-029` — Never explain an eligibility/deadline/cost/geography exclusion using
  redundancy or profile-strength language; these are facts about the opportunity, not judgments
  about the student. Confidence: high (directly protects student trust, consistent with existing
  `eligibility.ts` separation of concerns).
- `RULE-COUNSEL-030` — Distinguish "not valuable" (redundancy/prestige-only reasoning) from "not
  now" (time-budget/sequencing) in student-facing language — conflating them misrepresents a
  genuinely good opportunity as worthless when the real constraint is temporary/logistical.
  Confidence: high.
- `RULE-COUNSEL-031` — An `avoid_for_now` explanation should be fully constructible from
  already-strong-dimension + tier-relationship + time-budget-opportunity-cost, with no appeal to
  unevidenced wellbeing claims. Confidence: high; directly validates and sources
  `AGENTS.md` Phase 39's existing worked example.
