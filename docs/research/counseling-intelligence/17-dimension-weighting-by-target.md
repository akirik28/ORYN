# Dimension Weighting by Target — Operationalizing the Geography-Conditional Layer

**Status: research proposal only. No scoring code, no numeric weights, no schema changes.** This
document exists because `10-open-questions.md` §1 named this package's own biggest gap explicitly:
`11-geography-admissions-systems.md`'s "What this means" section establishes *tier-level framing
language* ("strengthens your application" vs. "supports your development") but does not say
*which of the 9 profile dimensions* should be emphasized within that framing —
`RULE-COUNSEL-059`'s own text says so directly: "no document in this package explicitly
operationalizes ... which the UK sourcing above suggests should be the actual behavior." This
document is a first attempt at that operationalization, at the same register as the rest of this
package: qualitative (high/medium/low/zero), reasoned from already-sourced findings, never a
numeric weight invented from intuition. `AGENTS.md` Phase 6.1 is explicit that scoring parameters
must come from a deterministic-features-then-rules architecture, not LLM intuition — this document
respects that boundary by staying at the ordinal, qualitative level and stopping there.

## Method

Every claim below is a restatement or direct combination of already-established, already-sourced
rules from `01` and `11` (cited by ID) plus this session's family docs — this document derives no
new empirical facts of its own except where explicitly marked "new finding" and sourced. Where the
underlying evidence is too thin to support even a qualitative call, this document says "unresolved"
rather than guessing — consistent with this package's standing discipline
(`10-open-questions.md` §5, `AGENTS.md`'s "never invent" principle applied to weighting the same
way it's applied to facts).

## Per-system dimension guidance

### Tier 1 (USA) — baseline, no conditioning needed

The 9-dimension taxonomy *is* the US model already — it was built from Common Data Set, NACAC,
MIT, and Harvard GSE sourcing (`01`, `RULE-COUNSEL-001-009`). No dimension should be down-weighted
relative to the others for a Tier-1 target; this is the "default" case every other row in this
document is a departure from.

### Tier 2a (UK, UCAS) — subject-relevance is the dominant axis, not a dimension itself

Per `RULE-COUNSEL-058`, the operative UK distinction is **subject-relevant vs. generic**, which
cuts *across* ORYN's 9 dimensions rather than mapping to one of them — this is the central
complication this document exists to name. A `leadership` credential earned running a subject-club
directly tied to the applied course reads completely differently from a `leadership` credential
running an unrelated club, even though both currently score identically against the shipped
`leadership.ts` dimension.

| Dimension | UK weight, if subject-relevant | UK weight, if not subject-relevant |
|---|---|---|
| `academics` | Always high (predicted grades are separately, independently weighted) | Always high |
| `intellectual_curiosity` | High — this is what "super-curricular" most directly is | Low |
| `research` | High if in/adjacent to the applied subject | Low |
| `execution_project_depth` | High if subject-relevant (e.g. a CS applicant's shipped project) | Low |
| `awards_distinction` | High if subject-specific (e.g. a national Olympiad in the applied subject) | Low |
| `leadership` | Low-medium, even if subject-adjacent — UK guidance does not name leadership as a super-curricular category the way US guidance does | Low |
| `community_impact` | Low generally — **except medicine (see cross-cutting note below)** | Low |
| `entrepreneurship` | Medium if subject-relevant (e.g. a business/econ applicant's venture) | Low |
| `career_exploration` | Medium — work experience/shadowing relevant to the subject | Low |

Confidence: medium — directionally well-supported by `RULE-COUNSEL-058`'s official UCAS sourcing
and the existing "medicine is a partial exception" finding, but the specific per-dimension ordinal
calls above are this document's own reasoned extension, not independently verified against UCAS
guidance dimension-by-dimension. [[RULE-COUNSEL-113]]

### Tier 2b (France, Parcoursup) — academic engagement and motivation, breadth not clearly rewarded

`RULE-COUNSEL-061`'s sourcing (Campus France, education.gouv.fr) confirms the dossier's mechanism
(grades, Fiche Avenir teacher evaluation of academic engagement/method, a program-dependent
motivation element) but — honestly, per this document's own method — **does not give this package
enough detail to responsibly assign per-dimension ordinals the way the UK table above does.** What
is reasonably supported: `academics` and `intellectual_curiosity`-as-subject-engagement (the Fiche
Avenir's own focus) are high; general-breadth dimensions (`leadership`/`community_impact` unrelated
to the applied field) are not established as rewarded or unrewarded by this package's current
sourcing. **Marked unresolved rather than guessed** — a genuine gap for a future pass, not
something this document should paper over with an invented table to match the UK's format.
[[RULE-COUNSEL-114]]

### Tier 3, general case (Germany-NC/Netherlands/Italy-public/Switzerland/Turkey/Spain) — every dimension except `academics` is zero-weighted for the primary admission lever

Per `RULE-COUNSEL-062-065`, `074`, `057`/`109`: the primary admission lever in all of these systems
is a computed formula (grade average, NC, EBAU 60/40, exam score) with **no general activity-review
step at all**. This is the simplest row in this table precisely because it's the most restrictive:

| Dimension | Weight for the primary admission lever |
|---|---|
| `academics` | The entire lever (100% of it, formula-dependent) |
| All other 8 dimensions | Zero, for *this specific admission decision* — but see `11`'s point 1: still real *development* guidance, just not an admissions lever for this target |

Confidence: high — this is the most consistently and officially sourced finding in the whole
package (DAAD, government.nl/Studielink, MUR, ETH, La Moncloa/Ministry of Education, ÖSYM all
converge on formula/exam-only mechanisms with no general activity step).

### Tier 3-with-named-carve-out — cannot be given one table; the carve-out mechanism must be checked per named program

This is the most important correction this document makes to how the rest of the package might be
read. It would be natural to assume "Tier 3 with a carve-out" behaves like a smaller-scale version
of Tier 1/2 holistic review for the carved-out programs. **A primary-source check of Canada's four
specifically-named carve-out programs, done for `11` on this same pass, found that assumption is
false — the carve-out mechanism itself varies by program** (`RULE-COUNSEL-110`):

| Named carve-out | What it actually rewards | Nearest analogue |
|---|---|---|
| Waterloo Engineering (AIF) | Explicit activity/accomplishment description — "share what you were involved with," reviewers look for leadership/time-management/breadth of interests | Closest to a mini US-style holistic read, scoped to one form |
| Queen's Commerce | Written + video response scored on initiative/problem-solving/self-reflection *as demonstrated in the response itself* — **no activities-list criterion at all** | Structurally closer to a scored personal essay / structured interview than to a resume review |
| McMaster HHSP | Same pattern as Queen's — critical thinking/self-examination in the response, not an activities list | Same as Queen's |
| Turkish state conservatory (`RULE-COUNSEL-101`) | Audition/portfolio performance in the specific discipline | A skills-demonstration gate, not an activity-breadth review at all |
| Switzerland medicine (EMS) | A standardized aptitude test | Not activity-based in any form — closer in kind to Turkey's YKS than to UK/US medicine |

**Direct product implication**: ORYN's counselor cannot say "this program does holistic review, so
build a broader activity profile" for a Tier-3-carve-out target the way it reasonably could for a
Tier-1/UK target — it must know *which* named program and *what that program's own rubric actually
scores* before recommending anything, or it risks the exact `RULE-COUNSEL-111` failure mode (telling
a Queen's-Commerce-track student to add activities when the actual lever is reflective-response
quality). This is a materially higher data/specificity bar than the tier-level conditioning `11`
already proposes — tier alone is not enough for these carve-out cases; the specific named program
is the smallest unit this package can responsibly generalize about. [[RULE-COUNSEL-115]]

## Cross-cutting: medicine is not uniformly holistic, and this package's own family doc materials already show why

Pulling together findings that were previously scattered across `10-medicine-clinical-pathways.md`
and `11`'s per-country notes, without this document neither restates them as new claims: medicine
is a field where **the direction of the "exception" flips by country**, which makes it a useful
stress-test of this whole document's premise that tier-level reasoning needs field-level
correction:

- **USA (Tier 1)**: medicine draws on `career_exploration` (shadowing/volunteering),
  `community_impact` (clinical-adjacent service), and `research` roughly equally
  (`RULE-COUNSEL-032/033`) — consistent with the Tier-1 baseline, no special conditioning needed.
- **UK (Tier 2a)**: medicine is a **named partial exception in the activity-rewarding
  direction** — clinical work experience/volunteering specifically expected, closer to the Tier-1
  pattern than the rest of UK admissions is (per `RULE-COUNSEL-058`'s own text).
- **Switzerland (Tier 3-with-carveout)**: medicine is a **named exception in the opposite
  direction** — gated by the EMS aptitude test specifically, `RULE-COUNSEL-065` is explicit this is
  "not an activity portfolio." A counselor that generalized "medicine tends to be holistic" from
  the US/UK pattern and applied it to a Switzerland-medicine-track student would give actively
  wrong guidance.
- **Turkey (Tier 3)**: medicine is explicitly named as *more* exam-dominated than the Turkish
  system generally, not less (`RULE-COUNSEL-057`: "especially pronounced for medicine, engineering,
  law").
- **Germany**: this package's existing sourcing (`RULE-COUNSEL-103`) covers the
  Medizinstudium/Staatsexamen/Approbation pathway structure but was not checked this pass for
  whether Germany layers any separate medicine-specific aptitude test (analogous to Switzerland's
  EMS) on top of the general NC mechanism — **left explicitly unresolved rather than assumed
  either way.**

**The general lesson, not specific to medicine**: this package's own per-country/per-tier findings
already contain enough cross-cutting, field-specific exceptions that a counselor relying on
country/tier alone — even with this document's added per-dimension detail — will still be wrong for
specific fields inside specific systems often enough to matter. Field-level checks (this package's
`06-major-family-evidence/*` docs) and country-level checks (`11`) must compose together, and
neither alone is sufficient. [[RULE-COUNSEL-116]]

## What this document deliberately does not attempt

- **No numeric weights.** Every table above uses high/medium/low/zero, not point values or
  multipliers — assigning actual numbers is scoring-architecture work requiring the
  deterministic-features-then-rules discipline `AGENTS.md` Phase 6.1 requires, not a call this
  research package should make unilaterally.
- **No claim that this table is complete.** Only the country/program cases this package has already
  researched are covered; the Netherlands/Italy/generic-Europe-fallback cases inherit the Tier-3
  "academics only" row by construction (per `11`'s own tier assignment), but were not individually
  re-verified for field-specific exceptions the way medicine was above — a real, named limitation
  of this document, not an oversight to be silently assumed away.
- **No resolution of `10-open-questions.md` §3's mixed-target UI question** (whether to show a
  full per-target breakdown or default to one "most specific" target) — if anything, this document
  sharpens why that's a real product decision: a mixed UK/Canada-Queen's-Commerce-track student
  needs genuinely different per-dimension guidance for each target, not just different framing
  language, which raises the stakes of that unresolved UI question rather than lowering them.

## Rules established in this document

- `RULE-COUNSEL-113` — For a UK-track target, weight subject-relevant `intellectual_curiosity`/
  `research`/`execution_project_depth`/`awards_distinction` high and their non-subject-relevant
  counterparts low; weight `leadership` low-medium regardless of subject-relevance (UK guidance does
  not name it as a super-curricular category); weight `community_impact` low except for medicine.
  Confidence: medium (directionally sourced via `RULE-COUNSEL-058`, per-dimension ordinals are this
  document's own reasoned extension).
- `RULE-COUNSEL-114` — For a France/Parcoursup-track target, `academics` and subject-engagement
  (`intellectual_curiosity`) are supportably high-weighted; this package's current sourcing is not
  sufficient to responsibly assign ordinals to the other 7 dimensions — left explicitly unresolved.
  Confidence: high that this is genuinely unresolved (i.e., high confidence in the absence of
  sufficient evidence, not a claim about the true weighting).
- `RULE-COUNSEL-115` — Tier alone is insufficient for Tier-3-with-named-carve-out targets; ORYN's
  counselor must know the specific named program and what that program's own rubric scores before
  recommending anything, since carve-out mechanisms range from activity-description (Waterloo) to
  pure reflective-response scoring with zero activity criterion (Queen's/McMaster) to skills
  auditions (conservatory) to standardized aptitude tests (Swiss medicine) — genuinely different
  evidence types, not variations on one holistic-review theme. Confidence: high (direct consequence
  of `RULE-COUNSEL-110`'s primary-source finding).
- `RULE-COUNSEL-116` — Country/tier-level conditioning and field-level (major-family) conditioning
  must compose together; medicine alone demonstrates the "exception direction" flips by country
  (activity-rewarding in US/UK, aptitude-test-gated in Switzerland, more-exam-dominated-than-usual
  in Turkey), so neither level of conditioning is sufficient alone. Confidence: high for the
  medicine cases specifically (each individually sourced elsewhere in this package); medium for how
  broadly this generalizes to other fields, which this document did not check beyond medicine.
