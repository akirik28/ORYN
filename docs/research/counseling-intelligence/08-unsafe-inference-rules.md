# 08 — Unsafe Inference Rules (Consolidated Registry)

**Answers:** Consolidated registry of every inference pattern ORYN must never make, pulled from
every other document in this package.

**Cross-branch consolidation note (updated after this document's first pass):** this package was
executed by two concurrent sessions after a working-directory collision early in the night (see
`docs/handoffs/research-counseling-intelligence.md`). This document consolidates
`RULE-COUNSEL-001`–`014` and `023`–`031` from the peer session's branch
(`oryn/counseling-intelligence-research-013956`, docs `00`–`02`, `04`–`06`(families 10-17), `09`,
`10` — all now committed on that branch) and (originally minted as `034`–`064`, since renumbered
to `200`–`242` to resolve a cross-branch collision — see the numbering-history section below)
from this session's own branch (docs `03`, `06-major-family-evidence/`, `07`, `08`, `14`, `16`). Both sessions have now completed their originally-assigned
document sets; remaining work is the country-notes pass (this session, in progress — see §9) and the
final unified rules.json/sources.json integration (deferred by mutual agreement, see the "known open
item" section below for one confirmed numbering collision already found). This is a living index —
re-check both branches' rule counts before treating this list as complete.

## How to read this document

Organized thematically (by *kind* of unsafe inference), not by rule number — a counselor engineer
looking for "what must we never do about X" should be able to scan section headers. Each entry:
the pattern, why it's unsafe, which rule(s) instantiate it, and which document has the full
reasoning. This document does **not** restate each rule's full argument — it is an index, per the
mission's own request for a "consolidated registry," not a duplicate of the source documents.

## 1. Fabricating or overstating external facts

| Pattern | Rule(s) | Source |
|---|---|---|
| Presenting a university requirement, deadline, scholarship, or admission statistic without a live, checkable source | Restates founder spec Phase 28/34 directly (no counseling-package-specific rule number minted — this is a pre-existing, binding product non-negotiable, not new research) | `AGENTS.md` non-negotiables #6; `docs/counselor-core-plan.md` §5's requirement/admissions boundary |
| Letting a `ProfileGap` (Oryn's own developmental judgment) imply a university "requires" addressing it | RULE-COUNSEL-217 | `07-explainability-framework.md` §1 |
| Presenting a named opportunity/program surfaced only via secondary/aggregator search as a confirmed, current offering | **RULE-COUNSEL-222** (new, minted here — generalizes a pattern this session hit concretely in `09-environmental-science-sustainability.md` §4) | `06-major-family-evidence/09-environmental-science-sustainability.md` §4 |

## 2. False precision and fake certainty

| Pattern | Rule(s) | Source |
|---|---|---|
| Stating a probability of admission/success without a validated statistical model behind it | RULE-COUNSEL-216 | `07-explainability-framework.md` §1 |
| Hiding low confidence behind confident-sounding phrasing | RULE-COUNSEL-218 | `07-explainability-framework.md` §1 |
| Citing a specific numeric "overscheduling" threshold (e.g. exact weekly-hour cutoffs) not backed by the actual cited research | RULE-COUNSEL-025 (peer) | peer's `05-redundancy-saturation.md` §1 |
| Deriving a precise cross-curriculum grade/rigor comparison (e.g. an exact SAT↔IB-predicted-grade conversion) without a validated concordance | Restates `academics.ts`'s own existing design caution, confirmed by this research, not a new rule — see peer's `01-development-taxonomy.md` §3 `academics` section | peer's `01-development-taxonomy.md` |
| Treating a derived `yearsUntilGraduation` stage estimate as confirmed fact rather than an overridable approximation | RULE-COUNSEL-200 | `03-recommendation-timing.md` §1 |

## 3. Demographic and identity-based inference

| Pattern | Rule(s) | Source |
|---|---|---|
| Inferring aptitude, interest, or fit for a field from demographic attributes (nationality, gender, school type, socioeconomic signal, etc.) | **RULE-COUNSEL-223** (new, minted here) — restates the mission brief's own explicit "What Oryn must not do" item verbatim; neither branch had yet minted this as its own numbered rule despite both branches' documents being consistent with it throughout (no document in either branch's output makes or relies on such an inference) | Mission brief §"WHAT ORYN MUST NOT DO"; consistent with every dimension-scoring discussion in `01-development-taxonomy.md` (both versions) never conditioning a score on a demographic fact |
| Assuming a physically/logistically demanding field is inaccessible to a student with a disability, or the reverse (assuming a disability precludes it) | RULE-COUNSEL-240 (this session, found via its own re-read of family 20 against the peer's health/disability-access framework) | `06-major-family-evidence/20-performing-arts-music.md` §2; peer's `04-profile-gap-framework.md` |
| Assuming a prestigious/high-salary career is "better" independent of the individual student | **RULE-COUNSEL-224** (new, minted here) | Mission brief §"WHAT ORYN MUST NOT DO"; consistent with `01-computing-information-sciences.md` §3 and every other family doc's explicit refusal to rank career families against each other |
| Equating a career's popularity/growth rate with a specific student's fit for it | **RULE-COUNSEL-225** (new, minted here) — every BLS growth statistic cited across `06-major-family-evidence/01-09` is explicitly framed as an aggregate US labor-market data point, never as a claim about a specific student's prospects | Every `06-major-family-evidence/*` document's own sourcing-table caveats |

## 4. Major/career causality overclaims

| Pattern | Rule(s) | Source |
|---|---|---|
| Implying a career interest requires one specific mandatory undergraduate major | **RULE-COUNSEL-208** generalizes directly (originally stated for biology/medicine specifically) | `06-major-family-evidence/04-life-sciences.md` §3 |
| Treating a "not required for medicine" pattern as unique to biology | RULE-COUNSEL-211 extends RULE-COUNSEL-208 to biomedical engineering explicitly | `06-major-family-evidence/06-biomedical-engineering.md` §1 |
| Missing that a major legitimately feeds many career families (not a pipeline) | Demonstrated per-family with a named counter-stereotypical example in every one of `06-major-family-evidence/01-09` (CS→quant finance, math→actuarial via exam not major, physics→quant finance, EE→software, biology→conservation/policy/not-only-medicine, business→entrepreneurship without a business degree) | `06-major-family-evidence/00-family-taxonomy.md` §5 point 1 (binding requirement on every family doc) |
| Pressuring a student toward one field prematurely (before Phase 2 of `03-recommendation-timing.md`) | RULE-COUNSEL-202 | `03-recommendation-timing.md` §5 |
| Forcing an interdisciplinary-interest student into exactly one family/box | Structural — `00-family-taxonomy.md` §6's interdisciplinary-combination table exists specifically to prevent this; no single rule number, enforced by document structure itself | `06-major-family-evidence/00-family-taxonomy.md` §6 |

## 5. Evidence-strength conflation

| Pattern | Rule(s) | Source |
|---|---|---|
| Treating "self-reported, unverified" and "verified" achievement claims as equally reliable | RULE-COUNSEL-010 (peer) | peer's `02-opportunity-development-mapping.md` Part A |
| Treating mere registration/participation as equivalent evidence to a placement/win | RULE-COUNSEL-028 (this session, opportunity-mapping) restates and sharpens peer's RULE-COUNSEL-010/013 from the opportunity-evidence angle specifically | `02-opportunity-development-mapping.md` (this session) §2 |
| Requiring publication for a strong `research` dimension score | RULE-COUNSEL-006 (peer) | peer's `01-development-taxonomy.md` §3 `research` |
| Treating a title (president, founder, captain) as evidence of substance on its own | RULE-COUNSEL-002 (peer, leadership-specific) generalized to every dimension a role touches | peer's `01-development-taxonomy.md` §2 (role taxonomy) |
| Conflating a simulated business competition (DECA/FBLA-style) with real entrepreneurship evidence | RULE-COUNSEL-214 | `06-major-family-evidence/08-business-management-entrepreneurship.md` §4 |
| Conflating algorithmic-competition evidence with software-development evidence, or a summer-program *exposure* with independent-project *output* | RULE-COUNSEL-203, RULE-COUNSEL-204 | `06-major-family-evidence/01-computing-information-sciences.md` §1, §4 |
| Conflating result-tier, output-type, and role into one undifferentiated "recognition" signal | RULE-COUNSEL-027 (this session's original `02` draft, superseded on this branch by the peer's deeper treatment but the underlying principle holds and is restated by peer's own Part A/D split) | this session's original `02-opportunity-development-mapping.md`; peer's Parts A & D |

## 6. Redundancy/opportunity-cost misapplication

| Pattern | Rule(s) | Source |
|---|---|---|
| Assuming most students are over-scheduled by default | RULE-COUNSEL-023 (peer) | peer's `05-redundancy-saturation.md` §1 |
| Asserting activity intensity *causes* worse outcomes (rather than correlating, ambiguously) | RULE-COUNSEL-024 (peer) | peer's `05-redundancy-saturation.md` §1 |
| Explaining an eligibility/deadline/cost/geography exclusion using redundancy/saturation language | RULE-COUNSEL-029 (peer) — these are a different rejection *kind* entirely and must not share `avoid_for_now`'s justification structure | peer's `05-redundancy-saturation.md` §5 |
| A `deprioritize`/`avoid_for_now` explanation naming only what's strong, with no redirect to what would be higher-value | RULE-COUNSEL-220 (this session) | `07-explainability-framework.md` §2 |
| Applying redundancy discount at the activity level instead of the dimension level | RULE-COUNSEL-007 (peer) | peer's `01-development-taxonomy.md` §3 `entrepreneurship` |

## 7. Timing misapplication

| Pattern | Rule(s) | Source |
|---|---|---|
| Treating a younger (Phase 1) student's breadth as a weakness | RULE-COUNSEL-202 | `03-recommendation-timing.md` §5 |
| Treating an older (Phase 2) student's legitimate, recent interest-shift-driven breadth as if it were unexplained | RULE-COUNSEL-202 | `03-recommendation-timing.md` §5 |
| Letting a tight time budget silently substitute a breadth-type recommendation for a depth-type one | RULE-COUNSEL-201 | `03-recommendation-timing.md` §4 |
| Defaulting a student with `curriculum: "other"`/no reliable stage mapping to one specific country's grade system | RULE-COUNSEL-200 (final clause) | `03-recommendation-timing.md` §1, §5 |
| Collapsing a gap year, actual progression to undergraduate, and stale unupdated profile data into one generic "graduated" treatment | RULE-COUNSEL-239 (found on this session's own re-read of its own document) | `03-recommendation-timing.md` §5 |

## 8. Professional/licensure overgeneralization

| Pattern | Rule(s) | Source |
|---|---|---|
| Assuming US professional-licensure structures (PE, actuarial exams) apply unchanged outside the US | Stated explicitly in every relevant family doc's §6 and sources table (`02`, `05`, `06`) rather than as one numbered rule — treated as a standing sourcing-discipline requirement, not a single discrete inference to number | `06-major-family-evidence/02-mathematics-statistics.md` §6, `05-engineering-me-ce-ae-ee.md` §6, `06-biomedical-engineering.md` §6 |
| Treating a field with a genuine licensure gate (medicine, law, architecture, clinical psychology, engineering-PE) as equivalent in structure to one without any (CS, business, most of the humanities) | Cross-cutting requirement stated in `00-family-taxonomy.md` §5 point 3 | `06-major-family-evidence/00-family-taxonomy.md` |
| Assuming one country's engineering-licensure model (practice-gated, competence-based, chamber-registration, or title-only) describes another country's system | RULE-COUNSEL-227, RULE-COUNSEL-241 — a genuine four-way comparison (US/UK/Turkey/Germany), each structurally distinct | `06-major-family-evidence/05-engineering-me-ce-ae-ee.md` §6 |
| Describing a country's teaching-credential requirement as a single static fact, or assuming one country's two-part "degree + separate pedagogical credential" mechanics transfer to another | RULE-COUNSEL-232–235 (this session; Turkey's system specifically is mid-transition and must not be presented as fixed) | `06-major-family-evidence/18-education-teaching.md` §6 |

## 9. Admission-system-type overgeneralization (added post-cross-branch finding — see note below)

| Pattern | Rule(s) | Source |
|---|---|---|
| Applying US-holistic-admissions-derived reasoning (depth-over-breadth, extracurricular signaling, redundancy/saturation) uniformly to a student targeting an exam-score-dominated placement system | RULE-COUNSEL-228 (this session, verifying and extending a finding the peer session's persona-testing pass surfaced first) | `03-recommendation-timing.md` §6; peer's `10-open-questions.md` |
| Framing Oryn's own developmental dimensions as admissions-relevant with equal directness regardless of target geography | RULE-COUNSEL-228 | `03-recommendation-timing.md` §6 |
| Treating UK "super-curricular" (subject-relevant) engagement and general "extracurricular" breadth as interchangeable evidence of the same thing | RULE-COUNSEL-228 | `03-recommendation-timing.md` §6 |
| Having no fallback default for a Turkey-targeting student when it isn't yet known whether they're on the YKS public-placement track specifically (vs. private/foundation-university or abroad) | RULE-COUNSEL-230 (this session, found via persona-stress-testing RULE-COUNSEL-228 against a 14-year-old-in-Turkey hypothetical) | `03-recommendation-timing.md` §6 |
| Including peer's `05-redundancy-saturation.md`'s "signal quality to evaluators" justification in a redundancy/`avoid_for_now` explanation shown to a YKS-track student, when no evaluator reads a holistic file in YKS placement | RULE-COUNSEL-231 (this session, checked RULE-COUNSEL-228's caveat directly against the peer's redundancy document rather than leaving it a general pointer) | `03-recommendation-timing.md` §6; peer's `05-redundancy-saturation.md` §2-§3 |
| Silently picking one target geography's admissions-relevance framing for a student with multiple, materially-different active targets, and presenting it as universally true | RULE-COUNSEL-236 (surfaced by the peer's persona-testing pass, an open design question not fully resolved by either branch) | `07-explainability-framework.md` §2 |
| Applying the blanket YKS caveat (RULE-COUNSEL-228) to a Turkey-target student interested in a field where admission is actually a hybrid academic-threshold-plus-audition mechanism, not pure exam-score placement | RULE-COUNSEL-238 (this session, verified directly against official Turkish conservatory talent-exam guidance) | `06-major-family-evidence/20-performing-arts-music.md` §6 |
| Treating the discovery of a small grades-based component (OBP) inside YKS placement as evidence that the exam-dominance finding (RULE-COUNSEL-228) was overstated, rather than checking what it actually changes | RULE-COUNSEL-242 (this session, direct osym.gov.tr fetch plus convergent secondary sourcing) — the OBP channel is itself grades-only and capped small; there remains zero channel for leadership/community_impact/entrepreneurship/research/awards_distinction | `03-recommendation-timing.md` §6 |
| Assuming a Tier-3-with-named-carve-out program (e.g. a Canadian university's supplementary application) behaves like a smaller-scale version of Tier-1/2 holistic review | RULE-COUNSEL-115 (peer) — a primary-source check of 4 named Canadian carve-out programs found the mechanism itself varies (activity-description, pure reflective-response scoring with zero activity criterion, skills audition, standardized aptitude test) — genuinely different evidence types, not variations on one theme | peer's `17-dimension-weighting-by-target.md` |
| Generalizing "medicine tends to be holistic" (true for US/UK) to every country, or generalizing any single field's country-level exception in one direction | RULE-COUNSEL-116 (peer) — medicine's own "exception direction" flips by country (activity-rewarding in US/UK, aptitude-test-gated in Switzerland, *more* exam-dominated than baseline in Turkey per RULE-COUNSEL-057) — country-level and field-level conditioning must compose, neither is sufficient alone | peer's `17-dimension-weighting-by-target.md`; `06-major-family-evidence/10-medicine-clinical-pathways.md` (peer) |
| Assuming a standardized situational-judgment admissions test (Casper) confirmed in one country/field generalizes to every country/field using that field's name | RULE-COUNSEL-243 (this session, following up a cross-cutting lead from peer's RULE-COUNSEL-120) — Casper is confirmed for teacher-education admissions at 3 Canadian/Australian institutions but no US teacher-education adopter was confirmed, unlike its separately-documented ~50-school US medicine footprint | `06-major-family-evidence/18-education-teaching.md`; peer's `06-major-family-evidence/10-medicine-clinical-pathways.md` |

**This section was added after this document's initial version**, once the peer session's
persona-testing pass (`09-persona-testing.md`) surfaced — and this session independently verified
via ÖSYM/YKS and UCAS official-guidance sourcing — that most of this package's admissions-signaling
reasoning assumes a US-style holistic-review admissions system, which does not describe Turkey's
YKS (a centralized, exam-score-ranked placement system with no application file) or the UK's UCAS
system (which draws an explicit, structurally different super-curricular/extracurricular
distinction) with anything like the same fidelity. **This is assessed as the single highest-
leverage open item this whole research package surfaced** — both sessions' `10-open-questions.md`-
equivalent documents should treat it as the top priority for any future continuation of this work,
above adding further major-family depth.

## Numbering history: a cross-branch collision, since resolved on this side

Earlier tonight, both sessions independently minted **`RULE-COUNSEL-034`** through roughly
**`059`+** for entirely different content — this session's original numbering for everything in
this document and its siblings (`03`, `06-major-family-evidence/`, `07`) collided head-on with the
peer branch's own independent `034`+ sequence (their `04`, `05`, `06` families `10`-`17`, `09`-`13`).
A self-consistency audit on the peer's side confirmed the collision spanned the full `034`-`059`+
range, not just one rule. **Resolved by mutual agreement (direct cross-session messages, not a
unilateral decision)**: this session renumbered its entire `034`-`064` range to **`200`-`230`** — a
block with enough headroom that the peer session (still actively minting new rules past `086` as of
this update) committed not to reach it through normal sequential numbering. The peer branch's own
`034`+ sequence was **not** touched — this was a one-sided renumbering, not a cross-branch merge.
`RULE-COUNSEL-001`-`033` (plus a `901`-`902` reconciliation pair) belong to this branch's own
foundational `rules.json`, written by the peer session before it forked away, and never collided
with anything in the first place. See `docs/handoffs/research-counseling-intelligence.md` for the
full chronology.

## New rules minted in this document

- **RULE-COUNSEL-222** (originally minted as `056`, renumbered per the note above) — Never present
  a specific named opportunity/program sourced only from secondary/aggregator discovery as a
  confirmed, current, verified offering to a student; it must first pass through ORYN's actual
  opportunity-acquisition/verification pipeline (a separate, already-existing workstream — this
  research package documents pathway *types*, not a verified directory).
- **RULE-COUNSEL-223** — Never infer a student's aptitude, interest, or fit for any field from a
  demographic attribute (nationality, gender, school type, socioeconomic signal, or any similar
  proxy).
- **RULE-COUNSEL-224** — Never present one career family as objectively "better" than another
  (e.g., by salary or prestige) independent of the specific student's own stated interests/goals.
- **RULE-COUNSEL-225** — Never equate a career family's aggregate popularity or labor-market growth
  rate with a claim about a specific student's likely fit or success in it.
- **RULE-COUNSEL-228** — Never apply US-holistic-admissions-derived reasoning (depth-over-breadth,
  extracurricular signaling, redundancy/saturation logic) with the same directness to a student
  targeting an admissions system with a fundamentally different structure (e.g., Turkey's
  exam-score-dominated YKS placement, or — to a lesser but real degree — the UK's UCAS
  super-curricular-weighted system); Oryn's developmental framing remains valid, but its
  admissions-relevance framing must be geography-conditional. (Rules 226/227, originally 060/061, were minted in
  `06-major-family-evidence/01-computing-information-sciences.md` §7 and
  `05-engineering-me-ce-ae-ee.md` §6 respectively — country-notes additions, not unsafe-inference
  rules, so not indexed in this document's main tables above; listed here only to keep this
  session's rule sequence externally traceable.)

## Sources referenced in this document

Pure internal consolidation — every citation above is to another document in this same package
(both branches), plus this session's own `03-recommendation-timing.md` §6 (itself grounded in
S-YKS and S-UCAS-SUPERCURRICULAR, see that document's sources table). No new external sources
fetched directly into this document.
