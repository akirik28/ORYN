# Profile-Gap Framework

Answers: *how does ORYN tell a real developmental gap from a harmless, context-explained
absence?*

## Why this matters more than it looks

`lib/counselor/gaps.ts` already ranks dimensions by severity and already treats
`confidence = "low"` as `insufficient_data` rather than a weakness (`docs/counselor-core-plan.md`
§4's fact/inference/unknown discipline). That handles one failure mode: **not enough data to say
anything**. It does not handle a second, different failure mode this document is about: **enough
data to compute a low score, where the low score itself is explained by something other than the
student's development** — a school that doesn't offer AP, a family that can't afford a paid summer
program, a rural area with no research institution nearby, a major (e.g. pure mathematics) that
genuinely doesn't have a "leadership" analogue the way student government does. A gap-detection
system that can't tell these apart will recommend against the student's actual constraints, not
their actual development — precisely the harm the mission brief's worked examples warn about.

## 1. The core distinction

| | Low score, low confidence | Low score, high confidence, **access-explained** | Low score, high confidence, **development gap** |
|---|---|---|---|
| What it means | Not enough is known yet | The activity happened (or didn't) for reasons outside the student's control | The student had real opportunity to develop this and it remains comparatively weak |
| Already handled by shipped code? | Yes — `gaps.ts`'s `confidence = "low"` → `insufficient_data` | **No** — this is the gap this document fills | Yes, implicitly — this is what `gaps.ts`'s severity tiers already assume every non-`insufficient_data` gap is |
| Correct counselor response | "Oryn doesn't know enough about X yet" + a profile-completion nudge | Acknowledge context explicitly, do not phrase as a weakness, do not recommend "try harder" | A legitimate, actionable "this is currently your biggest opportunity" |

The middle column is the one no part of the shipped pipeline currently distinguishes from the
right column. A student who scores low on `research` because their school has no research
institution within reach and no online-research program was ever surfaced to them, and a student
who scores low on `research` because they had access to programs and chose not to pursue any, are
currently indistinguishable to `rankDimensionGaps()` — both are just "a low score with medium/high
confidence." **This document's central claim is that this distinction, while it cannot always be
resolved with certainty, can often be *narrowed* using data ORYN already collects, and should
always be treated as unresolved (not silently assumed either way) when it can't be narrowed.**

## 2. Official precedent for exactly this problem: the School Profile

US selective admissions has a standing, official mechanism for precisely the "no AP ≠ no rigor"
case: nearly every US high school submits a **School Profile** alongside a student's transcript —
a one-to-two-page document, prepared by the school's own counseling office, listing the curriculum
actually offered (how many AP/IB courses, grading scale, weighting policy) specifically so an
admissions reader can interpret a transcript *relative to what was available*, not in the
abstract. The standard framing used by college-counseling professionals describing this mechanism:
a student taking two of four available AP courses is evaluated differently from a student taking
two of twenty. (Source: multiple independent college-counseling-practice descriptions of a
standard, widely-used admissions-office artifact — medium-high confidence as a description of
common practice; this package did not find an official NACAC/Common App normative statement
mandating the School Profile specifically, but its near-universal use is corroborated across many
independent counseling-practice sources describing the same mechanism consistently.)
[[RULE-COUNSEL-015]]

**This is direct validation that "evaluate relative to availability" is not a hypothetical
fairness nicety — it is how the real evaluation process this product exists to help students
navigate already works.** ORYN should apply the same logic internally that the schools/counselors
on the other side of the table already apply.

**Concrete, present-tense gap this creates for ORYN:** `EducationRecord` (`types/database.ts:329`)
stores `school_name`, `school_entity_id`, `country`, `stage`, `curriculum` (the student's *own*
curriculum type — AP/IB/A-Level/national/etc.) — but **nothing about what that school actually
offers beyond what the student personally took**. There is no `school`-level "available curricula"
or "AP courses offered" fact anywhere in the schema today. This means ORYN **cannot currently
execute the School-Profile pattern with real data** — it can know a student took 2 AP courses, but
not whether their school offered 2 or 20. Flagged plainly in `10-open-questions.md` as a genuine
data-model gap, not solved here (no schema changes in scope for this research package).
[[RULE-COUNSEL-016]]

## 3. Empirical grounding: access inequality in extracurriculars is real and measured, not a hypothetical fairness concern

A large-scale peer-reviewed study (Park, Kim, Wong, Zheng, Breen, Lo, Baker, Rosinger, Nguyen, and
Poon, published in a AERA-affiliated journal via SAGE, working-paper version hosted by the
Annenberg Institute at Brown University, analyzing **over 6 million Common Application
submissions** using NLP methods) found that white, Asian American, wealthier, and private-school
students report more activities, more top-level leadership roles, and more distinctive
accomplishments (honors/awards) than their peers — disparities that shrink but do not disappear
after controlling for other observable variables. Notably, the same study found **little to no
difference by race/ethnicity in the *percentage* of activities that carry a top-level leadership
role** — i.e., among the activities a student *does* have, leadership representation is roughly
even; the disparity is concentrated in raw *access/quantity*, not in whether a student takes
initiative within what they do have access to. (Source: "Inequality Beyond Standardized Tests"
— EdWorkingPaper 23-749 / SAGE-published peer-reviewed version, DOI 10.3102/00028312241292309 —
high confidence, large sample, peer-reviewed.) [[RULE-COUNSEL-017]]

**Product implication, precisely stated:** a thin activity list is measurably more likely, in the
aggregate, to reflect unequal access than unequal initiative. This does not mean ORYN should assume
every thin profile is access-limited (that would be its own unsafe inference in the other
direction — some students genuinely have access and choose not to engage). It means **the prior
should not default to "thin profile = needs to try harder"** — the framework in §4 below should be
the actual gate before any gap becomes a "you should do more" recommendation.

## 4. Decision framework: is this a real, actionable developmental gap?

Before `gaps.ts`'s severity ranking is allowed to become a *recommendation* (as opposed to an
internal signal), a future refinement should be able to answer these, in order — this is a
proposed reasoning sequence for a future engineering pass, not a claim that all of it is
computable with data ORYN has today (each step notes its actual data-availability status):

1. **Is confidence actually low?** (Already handled — `gaps.ts`.) If yes, stop here; this is
   `insufficient_data`, not a gap.
2. **Does this dimension matter for this student's stated goals?** A weak `research` score for a
   student with no stated interest in research-heavy fields and a goal like "study business in the
   UK" is a much lower-priority gap than the identical score for a student who states a
   biomedical-engineering goal. **Data availability: partial** — `career_goals`/`interests` exist,
   but the mapping from goal text to "how much does `research` matter for this goal" needs the
   major-family evidence work (`06-major-family-evidence/`, owned by a peer session on this
   mission) as its authority, not an invented weight here.
3. **Was there reasonable access?** The hardest step, and the one with the least data support
   today (§2's flagged gap). Where curriculum-availability data doesn't exist, this step cannot be
   answered — which per `08-unsafe-inference-rules.md` (peer-owned consolidation doc) means the
   system should **hedge language rather than assert a deficiency**, not skip the question
   silently. A concrete, already-answerable partial version: `country`/`curriculum` on the
   student's own `EducationRecord` at least lets a future refinement avoid comparing a student's
   test-score presence against a curriculum where that specific test isn't the normal pathway
   (this is a weaker but real, already-available signal, distinct from the unavailable
   school-level course-catalog signal).
4. **Is this a genuinely low-cost, high-value next step, or would closing it cost more than it's
   worth relative to the student's stronger dimensions and time budget?** This is where
   `05-redundancy-saturation.md` and the timing framework (`03-recommendation-timing.md`, peer-owned)
   take over — a real, access-available, goal-relevant gap can *still* be a low-priority
   recommendation this particular week if the student is in exam season or has no time budget for
   it (`AGENTS.md` Phase 65).

**Only a gap that survives all four checks should ever be phrased to the student as "this is your
biggest opportunity."** A gap that fails check 3 (access uncertain) should be phrased, if
surfaced at all, as an honest observation with the uncertainty stated ("Oryn doesn't know whether
research opportunities have been accessible to you — if they have and this hasn't come up yet, it's
worth exploring; if they haven't, this isn't a mark against your profile"), never as a flat
deficiency claim. [[RULE-COUNSEL-018]]

## 5. Worked examples from the mission brief

**"A student interested in engineering with no technical/project evidence may have a meaningful
exploration gap."** Walk it through §4: (1) confidence likely medium/high if the student has *any*
profile data at all — this isn't an insufficient-data case; (2) goal relevance is high — engineering
interest directly implicates `execution_project_depth` per the major-family evidence this mission's
peer session is producing; (3) access is the interesting case — unlike a paid summer program,
`execution_project_depth` evidence can come from free/low-cost self-directed projects (a personal
coding project, a simple built device, an open-source contribution), so the access bar is
meaningfully lower than for e.g. a paid research program, though not zero (device/internet access,
free time). This is genuinely one of the framework's clearest "real gap" cases — but the honest
recommendation is "start something small and self-directed," not "you're behind," and never phrased
as if the student lacks ability rather than evidence. [[RULE-COUNSEL-019]]

**"A student without student-government leadership does NOT automatically have a leadership
deficiency."** Already correctly modeled by the shipped `leadership.ts` — it scores *any*
`is_leadership_role`-flagged activity, not specifically student government, and a title contributes
only a small flat bonus regardless of which organization granted it. The unsafe inference this
guards against is specifically at the *counselor language* layer, not the *scoring* layer: even
with a genuinely low `leadership` score, the explanation must never imply "you should have run for
student government" as the *specific* fix — leadership evidence is legitimately obtainable through
organizing anything with real scope (a study group, a family/community initiative, a team project),
and prescribing the single most visible/competitive pathway (elected school office) as if it were
the only route would itself be an access-blind recommendation (elected positions are inherently
scarce/competitive in a way "organize something" is not). [[RULE-COUNSEL-020]]

**"A student without AP courses does NOT automatically lack rigor if AP was unavailable."** Covered
in full in §2 — this is the case with the *least* current data support (no school-level course
catalog exists in ORYN's schema) and should be treated as the framework's clearest example of "flag
the uncertainty, don't resolve it silently." Until/unless a future schema addition captures
school-level curriculum availability, **`academics` gap language should never say "take more
advanced courses" without a hedge for availability** — safer phrasing establishes what's true
(rigor relative to *the courses the student has logged*) without asserting what isn't known
(whether more rigorous options existed). [[RULE-COUNSEL-021]]

**"A student without research is NOT automatically weak."** Directly tied to timing
(`03-recommendation-timing.md`, peer-owned) — research is one of the later-typical dimensions to
develop (§01's finding that `research.ts`'s own `OUTPUT_BONUS` treats publication as a rare top
rung applies here too: the whole dimension is structured around *process over output*, and process
itself usually requires either a structured program — access-gated — or enough self-directed
maturity to scope an independent question, which is itself age/stage-dependent). A grade-9 student
with a zero `research` score is close to the modal case, not an outlier requiring intervention;
the same score for a grade-12 student applying to research-heavy programs is a different
situation. Gap severity should be read differently by grade even though this package does not
recommend baking grade into the *severity score itself* (`docs/counselor-core-plan.md` §5 already
made this exact call for a different context — "context is surfaced *alongside* severity, not
baked into it" — and this package agrees with, rather than revisits, that design decision).
[[RULE-COUNSEL-022]]

## 6. What this means for `gaps.ts`'s severity model, without proposing to change it

This package is not proposing new severity tiers or a new confidence level — `critical` /
`moderate` / `minor` / `insufficient_data` remains sound as a *ranking* mechanism. What this
document adds is a **presentation-layer gate that should sit between ranking and recommendation
text**: a `critical` gap should still rank first, but whether it gets phrased as a plain deficiency,
a hedged observation, or an access-aware reframing depends on the §4 checks, which currently exist
nowhere in the pipeline. This is additive to, not a replacement for, the existing severity model —
consistent with this whole package's binding constraint of proposing sub-facets and presentation
logic rather than schema or architecture changes.

## 7. A second, distinct access category this document initially missed: health/disability context

Added on a later pass, deliberately appended here rather than inserted into §3's numbering (which
`09`/`10`/`13` already cite by number) to avoid disturbing those cross-references. §3's access-
inequality finding (Park et al.) covers *economic/geographic* access. A **separate, equally real
category this document did not originally address: health conditions and disabilities as a reason
a profile may show fewer or less continuous activities**, unrelated to either effort or economic
access.

**This has direct, official precedent in the actual admissions systems ORYN's students will use** —
not a hypothetical fairness concern this package is inventing. The Common Application (used by
hundreds of US institutions) has **two dedicated, official disclosure mechanisms** for exactly this:
the long-standing "Additional Information" section (up to 650 words, optional, never required), and
a newer, narrower **"Challenges and Circumstances" section** (introduced for the 2025 application
cycle specifically) — an optional 250-word space whose stated purpose is "context for any situation
or circumstance that negatively impacted grades, test scores, or activities." Students with a
disability that affected their ability to participate in activities are specifically, officially
encouraged to use this space. (Source: Common App-focused admissions-guidance sources describing
this official application feature — medium-high confidence for the mechanism's existence and
purpose, not independently verified against Common App's own raw application-platform
documentation this pass.) [[RULE-COUNSEL-079]] Separately, chronic health conditions are common
enough in this population to not be an edge case: cited guidance describing this population puts
the share of US young people with a chronic medical condition at roughly 15-20%. (Source:
college-counselor-research sources — medium confidence, a population estimate cited by secondary
sources rather than independently traced to a primary epidemiological study this pass.)
[[RULE-COUNSEL-080]]

**A closely related third category, surfaced incidentally by this session's own UK-admissions
research for `11-geography-admissions-systems.md` rather than a separate search: caregiving
responsibilities.** The UK UCAS-practice sourcing already cited in `11` names "work experience,
volunteering, and caring responsibilities" together as legitimate context a personal statement can
draw on — i.e., the UK's own admissions guidance already treats a student's unpaid care of a family
member as belonging in the same category as a job or volunteering, not as an absence needing no
explanation. This document extends the same posture: a student who cares for a sibling or family
member is not exhibiting a motivation or access gap in the dimensions that time went to instead —
the same "read voluntarily-disclosed context, never require or infer it" handling as the
health/disability category above applies identically here, and for the same privacy reasons no new
data collection is proposed.

**What this means for ORYN, held against the product's own minor-safe privacy principles
(`AGENTS.md` Phase 12 — minimize data collection, avoid requesting unnecessary identification/
medical information):** this document does **not** recommend ORYN collect, prompt for, or store
health/disability information — doing so would directly contradict the product's own binding
privacy commitments and would be exactly the kind of scope creep this research package should
flag against, not propose. What it *does* recommend, consistent with §3's economic-access finding
and requiring no new data collection at all: **the same default posture** — a thin or gapped
profile should never default to a "low effort" reading, and the counselor's uncertainty about
*why* a gap exists should be held honestly (per §4's existing framework) rather than resolved by
assuming either explanation (economic access, health, or genuine low engagement) without evidence
either way. If a student *voluntarily* writes health/circumstantial context into an existing
free-text field (e.g., `EducationRecord.notes`, already a schema-present, optional field — no new
column needed), the counselor should treat that disclosure with the same care the mission's own
"fact / inference / unknown" discipline already demands elsewhere: read and respected, never
demanded, never inferred from its absence. [[RULE-COUNSEL-081]]

## 8. A fourth access category, unlike the first three: curriculum-mandated structured commitment (IB's CAS)

Added on a later pass, surfaced while stress-testing this package's frameworks together against a
maximally realistic combined persona (`09-persona-testing.md` Persona I). Distinct from §3
(economic/geographic access), §7's health/disability, and §7's caregiving: **some curricula
themselves formally mandate structured extracurricular-style engagement**, which changes what a
"thin" activity profile even means for a student in that curriculum.

The **IB Diploma Programme's CAS (Creativity, Activity, Service) core component** is the clearest
case: IB's own current official framework (the fixed 150-hour requirement was deliberately removed
around 2017, partly to discourage exactly the kind of hour-padding this package's redundancy
framework warns against) describes the expected commitment as roughly **3-4 hours per week,
sustained across the 18 months of the Diploma Programme**, spanning three strands (Creativity,
Activity, Service) with reflection against seven learning outcomes — not formally graded, but a
genuine diploma requirement. (Source: `ibo.org/programmes/diploma-programme/curriculum/dp-core/
creativity-activity-and-service/`, official IBO page — high confidence.) [[RULE-COUNSEL-091]]

**What this means for ORYN, precisely**: an IB student's CAS-fulfilling activities are already a
real, structured, curriculum-mandated engagement record — not equivalent to a US-curriculum
student's voluntary activity list, but not nothing either. A counselor reading an IB student's
thin-looking non-CAS activity list should first check whether CAS-related engagement is what's
actually filling that time (per school-set CAS targets, which vary by school — IB itself sets no
single number) before treating the profile as thin at all. **This generalizes beyond IB
specifically**: A-Level's own demanding subject depth, a heavy AP course load, or any curriculum
with its own significant structured/co-curricular expectation could plausibly play the same role —
IB is simply the clearest, most explicitly documented case this package found, not a claim that
only IB has this property. [[RULE-COUNSEL-092]] Consistent with §7's privacy posture: this does
**not** mean ORYN should collect CAS-hour data specifically — it means a "thin activity profile"
read for a known-IB student (curriculum is already collected, `EducationRecord.curriculum`)
should be hedged for this reason specifically, the same hedge discipline already established for
the other three access categories.

## Rules established in this document

- `RULE-COUNSEL-015` — Evaluate course rigor relative to what was actually offered to the student,
  not in the abstract, mirroring the School Profile mechanism real admissions offices already use.
  Confidence: medium-high (well-corroborated common practice, not a single official normative
  citation).
- `RULE-COUNSEL-016` — ORYN's schema currently has no way to know what curriculum a student's
  school offers beyond what the student personally took — treat any "rigor relative to
  availability" claim as unresolvable with current data, not as a reason to skip the caveat.
  Confidence: high (verified directly against `types/database.ts`).
- `RULE-COUNSEL-017` — Default assumption for a thin activity profile should not be "low effort" —
  large-sample research shows access/quantity disparities by race and class are real and
  measurable, while initiative *within* available activities (leadership-role percentage) shows
  little such disparity. Confidence: high (large peer-reviewed study), directional for any
  individual student (a population-level finding, not a diagnostic tool for one profile).
- `RULE-COUNSEL-018` — A gap that cannot be confirmed as access-available should be presented as a
  hedged observation, never a flat deficiency claim. Confidence: high (direct extension of already
  -shipped fact/inference/unknown discipline).
- `RULE-COUNSEL-019` — Low `execution_project_depth` evidence for a stated engineering/technical
  interest is one of the framework's clearer "real, actionable gap" cases, since the lowest-cost
  version of this evidence (a self-directed project) has a meaningfully lower access bar than paid
  or institution-gated opportunities — but must be recommended as "start something small," never
  framed as a capability deficit. Confidence: medium-high.
- `RULE-COUNSEL-020` — Never recommend a specific scarce/competitive pathway (e.g. "run for student
  government") as *the* fix for a leadership gap; recommend the underlying construct (organize
  something with real scope) so the recommendation doesn't itself assume access to a limited
  number of elected positions. Confidence: high (logical extension of the access-inequality
  finding).
- `RULE-COUNSEL-021` — Never recommend "take more advanced courses" without a hedge acknowledging
  ORYN cannot currently verify whether more advanced courses were available. Confidence: high.
- `RULE-COUNSEL-022` — Read gap severity in light of grade/stage context without altering the
  computed severity score itself — surface context in the explanation layer, consistent with the
  existing `docs/counselor-core-plan.md` §5 design decision for the same problem in a different
  dimension. Confidence: high (consistency with an existing, deliberate architectural choice).
- `RULE-COUNSEL-079` — Real admissions systems (Common App's "Additional Information" and
  "Challenges and Circumstances" sections) officially expect and accommodate health/disability
  context for exactly the kind of gap this framework addresses — treat this as direct precedent,
  not an invented consideration. Confidence: medium-high (mechanism well-described, not
  independently verified against Common App's own platform documentation).
- `RULE-COUNSEL-080` — Chronic health conditions are common enough in this population (~15-20% by
  cited estimate) to treat as a standing, not edge-case, possible explanation for a thin profile.
  Confidence: medium (secondary-sourced population estimate).
- `RULE-COUNSEL-081` — Never collect, prompt for, or store health/disability or caregiving-
  responsibility information — this would contradict ORYN's own minor-safe privacy commitments.
  Only ever read and respect voluntarily-disclosed context in existing free-text fields; never
  infer health or caregiving circumstances from their absence, and never demand disclosure as a
  condition of fair treatment. Confidence:
  high (direct, binding consequence of `AGENTS.md` Phase 12's existing privacy commitments).
- `RULE-COUNSEL-091` — IB's CAS core component is a real, officially-documented, curriculum-
  mandated structured-engagement requirement (~3-4 hrs/week over 18 months); check for it before
  treating an IB student's non-CAS activity list as thin. Confidence: high (official IBO source).
- `RULE-COUNSEL-092` — Generalize the curriculum-mandated-structure caution beyond IB to any
  curriculum with significant known structured/co-curricular expectations (heavy A-Level/AP
  loads, etc.) — IB is the clearest documented case, not the only plausible one. Confidence:
  medium (reasoned generalization from one well-documented case, not independently verified for
  other curricula).
