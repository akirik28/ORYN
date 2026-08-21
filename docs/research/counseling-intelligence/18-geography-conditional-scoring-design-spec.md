# Geography-Conditional Scoring — Design Specification

**Assignment**: build out this package's own #1 finding (`RULE-COUNSEL-059`/`060`) into an
implementation-ready design specification, not just a research narrative. `17-dimension-weighting-
by-target.md` (this session, prior branch) was the first qualitative pass; this document is sharper
and implementation-facing — what the engine needs to **know**, and what it does **differently**
per target system — cross-validated against a second, independently-researched data source that
did not exist when `17` was written. **Research/design only: no schema changes, no migrations, no
`lib/` edits.** Branch `oryn/geography-conditional-weighting`, forked from
`oryn/counseling-intelligence-research-013956` at `cebe8b9`.

## 0. Cross-lane validation — read this before trusting anything below

This spec draws on two independently-produced sources: this session's own `11-geography-
admissions-systems.md`/`17-dimension-weighting-by-target.md` (built from Common Data Set, NACAC,
MIT, UCAS, DGESIP, and direct ÖSYM/DAAD/Bundesärztekammer-style fetches), and
`docs/research/admissions-systems/**` on `oryn/admissions-intelligence-research` (commit `931bcc0`,
verified to exist via `git cat-file`/`git ls-tree` before use — 14 country files: US, UK, France,
Germany, Netherlands, Italy, Switzerland, Canada, Ireland, Australia, New Zealand, Singapore, Hong
Kong, Spain). **Germany and the US were checked in full for this document** and independently
confirm this package's core claims, with the admissions-intelligence lane adding real precision
this package didn't have (documented per-country below). **Turkey is not in that lane's 14
countries** — for Turkey/YKS this document relies entirely on this session's own prior sourcing
(`RULE-COUNSEL-057`/`109`, direct ÖSYM-domain verification), flagged explicitly rather than silently
assumed covered. [[RULE-COUNSEL-124]]

## 1. What the scoring engine needs to know (inputs)

Checked against the actual shipped schema (`types/database.ts`), not assumed:

| Signal | Field | Notes |
|---|---|---|
| Target country (specific) | `target_universities` → `university_id` → `universities.country` (`string`, not nullable) | **Highest-precedence signal** — a student with an active target university has a concrete, specific target system |
| Target region (general) | `profiles.target_geographies` (`TargetGeography[]` = `"usa"\|"uk"\|"europe"\|"canada"\|"turkey"\|"not_sure"`) | Collected at onboarding (`AGENTS.md` Screen 4); coarser fallback when no specific university is set |
| Curriculum | `profiles.curriculum` (`CurriculumType` = `"ap"\|"ib"\|"a_level"\|"turkish_curriculum"\|"national_curriculum"\|"other"`) | Not itself sufficient to infer target system (an IB student can target any of the four systems below) but relevant to which evidence is already curriculum-mandated (`RULE-COUNSEL-091`, IB/CAS) |
| Grade/stage | `profiles.graduation_year` (derived `yearsUntilGraduation`, per peer's `03`) | Governs whether timing-phase logic (peer's `03`) should compose with this layer — see §5 |
| Target field | Whatever field-selection mechanism `target_universities`/`career_goals` already carries | Required for the medicine cross-cutting exception (§4) and any other field-specific carve-out — **tier alone is insufficient**, per `RULE-COUNSEL-115` |

**Precedence, most to least specific** (already proposed in `13-implementation-readiness.md` item 1,
restated here because it's load-bearing for this spec): (1) a specific `target_universities` entry's
own country → (2) `target_geographies` coarse region → (3) `"not_sure"`/empty → no geography-
specific framing at all. This precedence is itself part of the spec, not an implementation detail
to be re-derived later.

## 2. The core mechanism: two gates, not one score

Every prior document in this package (`11`, `17`) implicitly used a two-stage structure without
naming it that way explicitly. Naming it now because it's the actual shape an implementation needs:

**Gate 1 — Does non-academic evidence get reviewed at all for this target?**
Binary-ish, per target system: USA/UK/France = yes (with caveats below); Germany/Turkey/most of
continental Europe = no, for the general admission decision. This gate should suppress the entire
downstream dimension-weighting question when the answer is no — there is no "UK-style subject-
relevance weighting" to compute for a Turkey-YKS target, because the input to that computation
(an activity/evidence review step) does not exist for that target.

**Gate 2 — If yes, which of the 9 dimensions matter, and how much?**
This is where `17`'s qualitative tables apply. **Gate 2 is meaningless to evaluate before Gate 1
returns yes** — an implementation that runs dimension-weighting logic unconditionally and only
*afterward* checks whether the target even reviews activities would produce a well-formed but
semantically-empty answer for Tier-3 targets, which is a subtler bug than an outright wrong
answer because it *looks* like a real result. [[RULE-COUNSEL-125]]

## 3. Per-system specification

### 3.1 USA — Gate 1: yes, unconditional baseline

No conditioning needed — this is the system the shipped 9-dimension taxonomy was built from
(`01`, `RULE-COUNSEL-001-009`). Every dimension is a live, independently-weighted input.
**Cross-validated**: the admissions-intelligence lane's `united-states.md` independently confirms
"grades/rigor > tests > extracurriculars" as the ordinal ranking, sourced to College Board's own
"Understanding Holistic Review" material — a second, independent confirmation of what this
package's `01` already established from Common Data Set/NACAC/MIT.

### 3.2 UK/UCAS — Gate 1: yes, narrowly. Gate 2: subject-relevance is the dominant axis

Per `RULE-COUNSEL-058` (official UCAS pages, directly fetched) and `17`'s table: `intellectual_
curiosity`/`research`/`execution_project_depth`/`awards_distinction` high if subject-relevant, low
otherwise; `leadership` low-medium regardless; `community_impact` low except medicine.
**Medicine is a compound exception**: clinical-exposure evidence *plus* a required standardized
aptitude test (UCAT, 57 universities, includes a Situational Judgement Test subtest —
`RULE-COUNSEL-121`) layered on top, not instead of, the general pattern. **Not independently
re-checked against the admissions-intelligence lane's UK file this pass** (that file focuses more
on qualification-eligibility/predicted-grades mechanics than the super-curricular-weighting
question specifically) — flagged as a real gap in this spec's own cross-validation, not silently
assumed confirmed. [[RULE-COUNSEL-126]]

### 3.3 Turkey/YKS — Gate 1: no. Gate 2: not applicable

Per `RULE-COUNSEL-057`/`109` (direct ÖSYM-domain fetch, convergent independent YKS-calculator
cross-check): placement score = (TYT × 0.40) + (AYT × 0.60) + (OBP × 0.12, itself grades-only,
halved for a previously-placed candidate). **Zero channel for `leadership`/`community_impact`/
`entrepreneurship`/`research`/`awards_distinction` — not a weighting question, an eligibility
question**: there is no application file for a human evaluator to read at all. This is the sharpest,
simplest case in this spec precisely because Gate 1 resolves it completely — nothing in Gate 2
applies. **Only Turkish state conservatory admission (`RULE-COUNSEL-101`) is a named field-level
exception**, and even there the mechanism is audition/aptitude, not activity-portfolio review — a
different Gate 1 answer for that one field, not a Gate-2 weighting variant of the general case.

### 3.4 Germany — Gate 1: no (with one narrow, field-specific exception). Cross-validated in depth.

**This is the strongest cross-validation case in this document.** This session's own `RULE-COUNSEL-
062` (Abitur-grade/NC-driven, no general extracurricular factor) is independently confirmed, in
much greater mechanistic depth, by the admissions-intelligence lane's `germany.md`:

- **Two parallel routes**: 4 nationally-coordinated NC subjects (Humanmedizin, Zahnmedizin,
  Tiermedizin, Pharmazie) via `hochschulstart.de`/DoSV; everything else decentralized but still
  fundamentally **credential-gate-based** ("does this applicant hold a recognized qualification
  meeting the threshold" — not a holistic read).
- **Extracurricular activities: explicitly "not a primary factor" for the great majority of
  programmes**, per that document's own dedicated "Extracurricular activities" section — direct,
  independent confirmation of this package's Gate-1-is-no conclusion for Germany, from a completely
  separate research pass.
- **New precision this session did not have**: the one real exception is narrower and more specific
  than "medicine generally" — it's **NC Medicine's AdH quota specifically**, and *within* that,
  only some universities (reportedly Hannover) weight **health-related professional/vocational
  experience** (nursing training, paramedic work, relevant internships) — not general leadership/
  clubs/sports "in the US-holistic sense," and not a national policy, a per-university AdH-quota
  choice. **Personal statements and recommendation letters are also explicitly "not standard"** per
  that document, for the same reason (credential-gate model has no structural slot for them).
  [[RULE-COUNSEL-127]]

**Product implication**: Germany is Gate-1-no for essentially the entire system, with a single,
narrow, field-and-university-specific carve-out (AdH health-experience weighting for NC Medicine at
specific institutions) — the correct default should be "no activity review" with this one named
exception surfaced only when the target is specifically NC Medicine, not as a general Germany
caveat.

## 4. Medicine as a cross-cutting stress test — sharper with the new source

`17`'s existing cross-cutting section already showed medicine's "exception direction" flips by
country (US/UK activity-rewarding, Switzerland aptitude-test-gated, Turkey more-exam-dominated).
**The admissions-intelligence lane's Germany finding adds a fourth, previously-unseen shape**:
Germany's medicine exception is neither pure activity-review (US/UK) nor pure standardized-test
(Switzerland/UCAT/HPAT) — it's **narrow, health-specific professional/vocational experience,
weighted only within one quota, at some universities, not nationally mandated**. This means the
"does medicine get special treatment" question now has **four distinct answers across the four
systems checked**, not two or three — reinforcing `RULE-COUNSEL-116`'s point (country-level and
field-level conditioning must compose) even more strongly than `17` originally stated it, and
suggesting an implementation should not try to build one shared "medicine exception" rule reused
across countries — each country's medicine exception needs its own specific check.
[[RULE-COUNSEL-128]]

## 5. Composition with existing timing/redundancy logic

This spec sits **above** peer's `03` (timing) and this package's own `05` (redundancy), per
`11`'s existing "what this means" framing — a Gate-1-no result for a student's active target
should suppress geography-conditioned admissions-strategy framing entirely, while `05`'s and `03`'s
*development*-oriented guidance still applies unchanged (per `11`'s point 1: the 9-dimension
taxonomy remains valid development guidance regardless of tier). This spec does not re-derive that
composition rule — it already exists — but names it here because an implementation built from this
document alone (without also reading `11`) could otherwise miss it.

## 6. Unsafe inferences specific to this axis

Extending this package's existing unsafe-inference discipline (`04`, `08`) to geography-conditional
weighting specifically, since this axis creates new, specific ways to get it wrong that don't exist
elsewhere in the package:

- **Never key this conditional off nationality, residence, or curriculum alone** — already
  established (`RULE-COUNSEL-068`), restated because it's the single most consequential unsafe
  inference on this entire axis: a Turkish-national, Turkish-curriculum student targeting UK
  universities needs UK-conditioned guidance despite every demographic signal pointing at Turkey.
- **Never apply a country's general Gate-1 answer to a field with its own named exception without
  checking the field specifically** (`RULE-COUNSEL-101`, `115`) — true for Turkey's conservatories,
  Germany's NC Medicine AdH quota, Switzerland's EMS, and UK's UCAT — four countries, four
  different exception shapes, same underlying discipline required.
- **Never assume a Gate-1-yes country's Gate-2 weighting is uniform across all its "holistic"
  programs** (`RULE-COUNSEL-110`) — Waterloo's AIF rewards activity description; Queen's Commerce
  and McMaster HHSP score reflective response with zero activity criterion. Same country, same
  general Gate-1 answer, genuinely different Gate-2 mechanisms.
- **Never treat a second research lane's silence on a topic as evidence of absence** — the
  admissions-intelligence lane's Germany file not mentioning something is not the same as that
  thing not existing (its own explicit scope is qualification-eligibility mechanics, not exhaustively
  every possible admissions factor) — cross-check against this package's own sourcing before treating
  a gap in one lane as a confirmed negative. Applied directly in §3.2 above (UK not fully
  cross-validated, said so rather than assumed).
- **Never let two independently-sourced lanes agreeing on a *conclusion* substitute for checking
  whether they agree on the *mechanism*** — this document's Germany section checked both
  (conclusion: no general activity weight; mechanism: credential-gate model, confirmed in both) —
  two sources reaching the same answer via different, unexamined reasoning is weaker evidence than
  two sources reaching the same answer via the same, checked mechanism. [[RULE-COUNSEL-129]]

## 7. Implications for existing scoring code (named, not implemented)

Per the assignment's own scope boundary, this section states what an engineering lane would need to
build, without writing it:

1. **A Gate-1 lookup**, keyed by the precedence in §1 — output: `holistic_review: boolean` (or a
   richer enum if a "narrow exception" state like Germany's NC Medicine needs its own value) per
   active target. This is `13-implementation-readiness.md`'s existing item 1, unchanged in scope,
   sharpened here into a specific boolean/enum contract rather than prose.
2. **A Gate-2 lookup**, only evaluated when Gate 1 is true, returning a qualitative (high/medium/
   low/zero) multiplier-equivalent per dimension per target-system — `17`'s tables are the content
   for this; this spec does not propose the numeric encoding (per `AGENTS.md` Phase 6.1's
   prohibition on LLM-invented scoring parameters, restated in `17` and still binding here).
3. **A field-specific override layer**, consulted after Gate 1/2, for the four confirmed named
   exceptions (Turkish conservatories, German NC-Medicine AdH, Swiss EMS, UK UCAT) — this is
   structurally a lookup table keyed on (target country, target field), not a general rule, since
   §4 found each country's exception has a genuinely different shape.
4. **Explanation-generation must consume the mechanism, not just the Gate-1/2 output** — per `09`'s
   Persona J (`RULE-COUNSEL-119`), the same recommended action can relate to two different targets
   through different mechanisms (direct evidence vs. indirect raw material for a differently-scored
   response), and an explanation template needs that mechanism as an input, not just a weight.
5. **None of this is a numeric scoring change to `lib/scoring/dimensions/*.ts` directly** — it's a
   pre-filter/re-framing layer that runs before or alongside the existing per-dimension scorers,
   consistent with `13`'s original framing of this whole effort as additive, not a rewrite.

## Rules established in this document

- `RULE-COUNSEL-124` — This spec's cross-validation is uneven by country: Germany and the US were
  checked against the independently-researched admissions-intelligence lane in full; Turkey has no
  coverage in that lane at all (relies entirely on this session's own prior sourcing); UK was only
  partially cross-checked (§3.2). Confidence: high that this uneven coverage is accurately
  represented; the underlying per-country claims retain their own individual confidence ratings.
- `RULE-COUNSEL-125` — Gate 2 (which dimensions matter, how much) is meaningless to evaluate before
  Gate 1 (does non-academic evidence get reviewed at all) resolves — an implementation that
  evaluates them independently risks a well-formed but semantically-empty result for Gate-1-no
  targets. Confidence: high (structural, direct consequence of how every per-country finding in
  this package's own `11`/`17` is actually shaped).
- `RULE-COUNSEL-126` — This spec's UK section was not independently cross-checked against the
  admissions-intelligence lane's UK file for the specific super-curricular-weighting claim (that
  file's own focus is qualification-eligibility mechanics) — flagged as a real, named gap in this
  spec's own cross-validation rather than assumed complete. Confidence: high that this is genuinely
  an open gap, not a claim about what the UK file would show if checked.
- `RULE-COUNSEL-127` — Germany's medicine exception is narrower than a general "medicine is
  holistic" pattern: NC Medicine's AdH quota specifically, health-related professional/vocational
  experience specifically, some universities only (reportedly Hannover), not a national policy —
  independently sourced from the admissions-intelligence lane's `germany.md`, corroborating and
  sharpening this package's own `RULE-COUNSEL-062`. Confidence: high (that document's own stated
  sourcing; not independently re-verified against a primary hochschulstart/university page by this
  session).
- `RULE-COUNSEL-128` — Medicine's admissions exception now has four structurally distinct shapes
  across the four countries checked in depth (US/UK activity-review, Switzerland/UCAT/HPAT
  standardized-test, Germany narrow-health-experience-within-one-quota, Turkey more-exam-dominated-
  than-usual) — reinforcing that country-level and field-level conditioning must compose
  (`RULE-COUNSEL-116`) even more strongly than previously stated; an implementation should not
  build one shared "medicine exception" rule reused across countries. Confidence: high for the four
  cases checked; the pattern's generality beyond these four was not tested further.
- `RULE-COUNSEL-129` — Two independently-sourced research lanes agreeing on a conclusion is weaker
  evidence than two lanes agreeing on conclusion *and* mechanism — this document's Germany section
  checked both and found genuine mechanism-level agreement, which should be the standard for any
  future cross-lane validation in this package, not conclusion-matching alone. Confidence: high
  (methodological principle, directly demonstrated in this document's own §3.4).
