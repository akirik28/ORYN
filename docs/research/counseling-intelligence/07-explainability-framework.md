# 07 — Explainability Framework

**Answers:** How should a recommendation's "why" be constructed so it is honest, specific, and
never a fake probability?

**Ground truth this document extends:** `lib/counselor/evidence.ts`'s `buildRecommendation` and the
`CounselorRecommendation` contract it fills (`docs/counselor-core-plan.md` §9). That code already
implements the single most important structural decision this document would otherwise have to
argue for from scratch: **`why[]` is built from fixed templates parameterized by real fields
(`SEVERITY_LABEL`, matched-gap dimension/score, the requirement evaluator's own sourced `reasoning`
string) — never free LLM text.** This document does not propose changing that architecture. It does
three things the architecture needs but doesn't yet fully have: (1) explicit principles for
*judging* whether a given template string is honest and well-calibrated, (2) concrete language
recommendations for the hardest cases (`deprioritize`/`avoid_for_now`, low confidence, uncertain
eligibility), and (3) how this research package's own content (stage timing, redundancy, major-
family evidence) should feed future template text without becoming free-form generation.

## 1. The four things an explanation must never do

**RULE-COUNSEL-216 — never state a probability without a validated statistical basis.** This is
the founder spec's own non-negotiable (#5, "university admission percentages must never be
presented with false precision"), restated here as it applies specifically to Counselor Core's
`why[]`/`warnings[]` text: a recommendation's reasoning must never imply a percentage chance of
success, admission, or outcome unless a specifically validated model backs it (per spec Phase 16's
own careful hedging — "Oryn estimate... not a guarantee"). Today's `evidence.ts` templates already
comply (they state scores, severities, and sourced requirement reasoning — never a probability);
this rule exists to bind *future* template additions, especially anything touching
`RequirementEvaluationSummary` or an eventual admission-outlook integration.

**RULE-COUNSEL-217 — never let a `ProfileGap` imply a university "requires" anything.**
Already established in `docs/counselor-core-plan.md` §5's "Requirement/admissions boundary" and
worth restating here as an explainability rule specifically: gap-derived `why` text
(`whyForOpportunity`'s `"Addresses {dimension}, {severity} ({score}/100)"` pattern) describes
*Oryn's own development framing*, never an admissions requirement — only
`whyForRequirement`'s pass-through of the requirement evaluator's own sourced `reasoning` string is
allowed to make a requirement-style claim, and only because that string is independently sourced
per-university (`university_requirements`), not derived from the student's profile score.

**RULE-COUNSEL-218 — never hide low confidence behind confident-sounding language.** A
`confidence: "low"` recommendation (or a gap with `severity: "insufficient_data"`, rendered today
as `"an area Oryn doesn't have enough data on yet"` — already good, honest language) must never be
paired with `why` text that reads as more certain than the confidence level warrants. Concretely:
if `confidence` is `"low"`, the recommendation's framing should lead with the data gap itself
("Oryn doesn't have enough information about X yet") before any suggested action, not bury it in a
`warnings[]` entry a student might not read as carefully as the main `why`.

**RULE-COUNSEL-219 — distinguish "verified information" from "Oryn analysis," per spec Phase 28,
in the actual rendered text, not just internally.** A `why` string built from a sourced
`university_requirements.reasoning` field and a `why` string built from `ProfileGap` severity are
epistemically different kinds of claims (one is externally verified, one is Oryn's own
developmental judgment) — this document recommends they should be visually/textually distinguishable
to the student (e.g., a source-badge-style treatment per spec Phase 36 for the former), not
concatenated into one undifferentiated list. This is a UI/presentation recommendation, not a data-
model change — `CounselorRecommendation.evidence[]` already carries `sourceType`/`sourceUrl`/
`verificationState` per entry, which is exactly the data a future UI treatment would need; this
research does not propose adding anything to that type.

## 2. Concrete language guidance for the hardest recommendation classes

**`deprioritize`/`avoid_for_now`** (the founder spec's own differentiating "don't do this" feature,
Phase 39): this is the highest-risk case for an explanation that reads as dismissive or
discouraging rather than genuinely useful. The founder spec's own worked example is the right
model: *"I would not prioritize another club. Leadership and entrepreneurship are already among
your strongest profile areas... the same time would likely generate more value if invested in
completing a substantive research project."* Structurally, this example does three things a
`deprioritize`/`avoid_for_now` `why` should always do: (a) names the specific strength that makes
the candidate lower-priority (not just "you don't need this"), (b) names what *would* be higher
value instead (never leaves the student with only a "no"), and (c) frames it as a *time/opportunity-
cost* observation, not a judgment about the activity's inherent worth. **RULE-COUNSEL-220:** a
`deprioritize`/`avoid_for_now` recommendation's `why` must always include a redirect — either a
reference to the specific higher-value gap it's implicitly weighed against, or (if none is
computable) an honest statement that it's simply not currently a priority given time constraints —
never a bare "this is low value" with no comparison point. See `05-redundancy-saturation.md`
(peer-authored) for the underlying scoring logic this explains.

**Low eligibility confidence** (`eligibility.verdict === "unknown"`): the existing
`warnings[]` mechanism is the right structural home (already implemented), but the *language*
matters — `docs/counselor-core-plan.md`'s Assumption A2 rationale ("unknown isn't excluded because
`eligible_countries` is populated on 0/290 live opportunities today") is itself good explanatory
material a student would want, adapted: *"Oryn couldn't confirm country eligibility for this
one — most opportunities in our database don't have this filled in yet, so this isn't a sign
something's wrong with your profile."* This reassures the student the gap is in Oryn's data, not a
judgment about them — a distinction worth making explicit in template language, not left implicit.

**Stage/timing context** (per `03-recommendation-timing.md`): `docs/counselor-core-plan.md` §5
already commits to surfacing "with N years before graduation, this is worth addressing early" /
"with limited time before applications, prioritize breadth over starting something new" as
*context alongside* severity, never folded into the severity number itself. This document's
concrete contribution: the exact phase-appropriate language lives in
`03-recommendation-timing.md` §3's table — a future template addition should pull from that
table's own framing rather than inventing new stage-language ad hoc.

## 3. How this research package's content should feed future templates (without becoming free text)

**RULE-COUNSEL-221:** every piece of reasoning this research package contributes (stage timing,
redundancy/saturation, major-family evidence-type distinctions, evidence-state ladders) must enter
`why[]`/`warnings[]` the same way today's templates already work — as a **parameterized template
string keyed to a real, structured fact** (a computed `yearsUntilGraduation`, a `REDUNDANCY_DECAY`-
adjusted rank, an `evidenceRung`-style achievement-tier fact of the kind
`02-opportunity-development-mapping.md` proposes) —
never as a place where an LLM is asked to "explain this recommendation in your own words" for the
deterministic pipeline. The existing, correct boundary (`lib/ai/counselor-explain.ts` is the *only*
place an LLM touches this contract, strictly additive/optional, per
`docs/counselor-core-plan.md` §10) is the right one and this research does not propose loosening it
anywhere. Where this research's content is nuanced enough that a fixed template genuinely can't
capture it well (e.g., the major-family evidence-type distinctions in `06-major-family-evidence/`
are richer than a single short template string could convey), the right home is the *optional*
narration layer's input context (additional structured fields passed to
`buildCounselorExplanationPrompt`, still wrapped in the existing `<data>` untrusted-content
boundary per spec §34) — never a relaxation of the deterministic pipeline's own no-free-text rule.

## 4. A explanation-quality checklist (for a future reviewer of any new template string)

Restated as a checklist so it's directly usable, not just prose:

1. Does it cite a specific number/fact (score, severity, date, source) rather than a vague
   adjective ("weak," "great") with nothing behind it?
2. If it references a gap, does it avoid implying a university "requires" addressing it (RULE-
   COUNSEL-217)?
3. If it's a `deprioritize`/`avoid_for_now`, does it name what's strong *and* what would be higher
   value instead (RULE-COUNSEL-220)?
4. Does it avoid any percentage/probability language not backed by a validated model (RULE-
   COUNSEL-216)?
5. If confidence is low, does the *leading* sentence say so, not just a trailing warning (RULE-
   COUNSEL-218)?
6. Is externally-sourced content (a requirement's own reasoning) kept visually/textually distinct
   from Oryn's own developmental judgment (RULE-COUNSEL-219)?
7. Would a demanding-but-fair human counselor plausibly have said this, in this tone (per the
   founder spec's own §57 "AI Copy Style" — specific, concise, analytical, calm, never "Amazing!
   You're doing incredibly well!")?

## Sources referenced in this document

This document is primarily a structural/normative analysis of ORYN's own shipped contract
(`lib/counselor/evidence.ts`, `lib/counselor/types.ts`, `docs/counselor-core-plan.md` §§9-10) and
the founder's own product spec (non-negotiables, Phase 16, Phase 28, Phase 39, Phase 57), cited by
file/section throughout. No new external sources were fetched for this document; it draws on
general, well-established explainable-AI practice (ground every claim in a checkable fact; state
uncertainty where it exists; never let a system imply more confidence than its inputs support) as
uncontroversial, common-knowledge principles rather than a claim requiring a specific citation.
