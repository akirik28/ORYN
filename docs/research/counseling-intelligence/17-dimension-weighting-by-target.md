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

### Tier 2b (France, Parcoursup) — resolved on a follow-up pass, via the official CGEV framework document

This section originally marked France's per-dimension weighting unresolved, since `RULE-COUNSEL-061`'s
sourcing confirmed Parcoursup's dossier *mechanism* but not enough detail to assign per-dimension
ordinals responsibly. **A follow-up pass found and directly read the actual official framework
document that resolves most of this gap**: DGESIP (Direction générale de l'enseignement supérieur
et de l'insertion professionnelle, part of the French Ministry of Higher Education) publishes
*"Les Critères Généraux d'Examen des Vœux (CGEV) — Définitions et modalités de saisie"* — the
official national framework every Parcoursup formation's admissions committee must use. (Source:
`services.dgesip.fr/fichiers/note_de_cadrage_cgev_definitions_et_saisie.pdf`, official government
document — high confidence; PDF extracted via direct download + `pypdf` after WebFetch's built-in
extractor returned only binary noise for this specific file. Document is dated "Session 2023";
the underlying 5-field structure is described as continuous since at least 2019/2022, but this
session did not independently confirm the exact same structure still governs the current 2026
cycle unchanged.)

**The document defines exactly 5 national evaluation fields ("champs d'évaluation"), and requires
every formation to publish its own percentage weight for each (summing to 100%) plus a
four-level importance rating — "essentiel," "très important," "important," "complémentaire" — for
every individual criterion within each field:**

| Official champ (French) | What it covers, per the document's own definition | Nearest ORYN dimension(s) |
|---|---|---|
| Résultats académiques | Purely quantitative: grades, bac exam results, class rank | `academics` |
| Compétences académiques, acquis méthodologiques, savoir-faire | Qualitative academic skill: "méthode de travail," written/oral capability, teacher/class-council assessments, the Fiche Avenir's own "Méthode de travail" field | `academics` (qualitative complement) |
| Savoir-être | Non-academic, transversal: autonomy, investment, "esprit d'équipe," and explicitly **"curiosité intellectuelle"** and **"ouverture au monde"** as named example criteria | Closest overlap is `intellectual_curiosity`; the rest (autonomy, teamwork spirit, organizational capacity) does not map cleanly onto any single ORYN dimension — a genuine mapping gap, not forced into one |
| Motivation, connaissance de la formation, cohérence du projet | Subject/program-specific motivation, knowledge of the field's actual demands, coherence of the student's overall academic project | `career_exploration` (knowing what the field involves) + subject-relevant `intellectual_curiosity` |
| **Engagements, activités et centres d'intérêt, réalisations péri ou extra-scolaires** | Civic engagement (in/outside school — student council, national civic service, community service), associative/sports/artistic activity, personal interests, non-academic certifications | `leadership` (school-council-type engagement named explicitly), `community_impact` (civic engagement named explicitly), general breadth |

**This directly answers this document's own earlier question**: activities/interests are not a
vague, program-dependent afterthought — they are one of exactly 5 formally, nationally-defined
evaluation fields, structurally guaranteed a real (if formation-set) percentage weight, not
optional or discretionary. The document's own worked example gives Résultats académiques = 30%
and Compétences académiques/méthodologiques = 20% (the remaining 50% is split across the other
three fields including Engagements/activités, but the specific split for those three was not
extractable from this document's page 9, which appears to present it as a graphic rather than
text — **left honestly unextracted rather than guessed**). **What remains genuinely unresolved,
narrower than before**: the *exact* percentage any single named formation assigns to
"Engagements, activités" specifically — this document confirms it is real, named, and
percentage-weighted by mandate, but the actual number is formation-specific and would require
checking each program's own published fiche, not something this package can responsibly
generalize to one number. [[RULE-COUNSEL-114]] [[RULE-COUNSEL-117]]

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
| Queen's Commerce | Written + video response, self-paced within a window, scored by the *institution's own* rubric on initiative/problem-solving/self-reflection *as demonstrated in the response itself* — **no activities-list criterion at all** | Structurally closer to a scored personal essay / structured interview than to a resume review |
| McMaster HHSP (Honours Health Sciences Program specifically) | Same pattern as Queen's — critical thinking/self-examination in the response, not an activities list | Same as Queen's |
| McMaster **Nursing** (a *different* McMaster program from HHSP, found on a further check) | **CASPer** — a standardized, timed, third-party-administered situational-judgment test, not the program's own custom rubric | A third, genuinely different mechanism, see below |
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

**A follow-up check, prompted by `09`'s Persona J finding that ORYN's recommendation vocabulary
has no category for "rehearsed structured response" (`RULE-COUNSEL-118`), found this is not a
Queen's/McMaster idiosyncrasy — there is a third, standardized, cross-program version of it.**
**CASPer** (Acuity Insights) is an official, branded, timed situational-judgment test — video and
typed responses to "real-world" hypothetical scenarios, scored by independent human raters,
reported to institutions as a z-score/percentile — explicitly *not* a review of the student's own
past activities or achievements, and structurally different even from Queen's/McMaster's own
custom reflective prompts (which are institution-authored and ask about the *student's own*
experience; CASPer's scenarios are standardized and largely hypothetical). (Source:
`acuityinsights.com/products/admissions/casper/`, official vendor page — high confidence for what
the assessment is and how it's administered.) **This means ORYN's evidence/recommendation model
needs to distinguish (at least) three structurally different assessment types, not two:**

| Assessment type | Example | What preparation actually helps |
|---|---|---|
| Achievement-evidence-based | US/UK holistic review, Waterloo AIF | Accumulate and document genuine activities/achievements — this package's existing achievement-tier model |
| Institution-authored reflective response | Queen's Commerce, McMaster HHSP | Rehearse articulating the student's *own* experience against the *specific* prompts that program uses — `RULE-COUNSEL-118`'s named gap |
| Standardized third-party situational-judgment test | CASPer (medicine, health sciences, PA, nursing, dental hygiene currently; expanding into education, business, engineering per the vendor's own page) | Practice timed, hypothetical-scenario situational judgment generally — closer to standardized-test preparation than to either of the other two, and *not* well served by rehearsing responses about the student's own specific past experiences |

**CASPer's own reach (500+ partner programs globally per the vendor's page, and explicitly
expanding beyond health fields) makes this a materially bigger population than "two named Canadian
programs"** — any ORYN user targeting a CASPer-requiring program anywhere (a real possibility for
this package's own medicine family, `06-major-family-evidence/10-medicine-clinical-pathways.md`,
which did not previously mention it at all) needs this third category recognized, not folded into
either of the other two. [[RULE-COUNSEL-120]]

**Running tracker — confirmed instances of the standardized-third-party-situational-judgment-test
category, both branches, kept in one place since this now spans multiple documents on both sides**:

| Instance | Field | Region | Population relevance | Rule ID (branch) |
|---|---|---|---|---|
| CASPer | Medicine, health sciences, PA, nursing, dental hygiene | US/Canada | High — ~50 US med schools alone | `RULE-COUNSEL-120` (this branch) |
| UCAT (Situational Judgement Test subtest) | Medicine/dentistry | UK | High — 57 UK universities | `RULE-COUNSEL-121` (this branch) |
| CASPer | Teacher education (admission, not post-degree licensure) | Canada/Australia (Vancouver Island University, Monash, Brock) | Medium — confirmed but narrower footprint than medicine | `RULE-COUNSEL-243` (peer branch) |
| CASPer | Undergraduate engineering | Canada (Western University, ~7,500 annual applicants, since Fall 2024) | High — directly relevant to ORYN's population | `RULE-COUNSEL-244` (peer branch) |
| CASPer | Business (MBA) | Only named adopter is Dalhousie's MBA | Low — graduate-level, past ORYN's population | `RULE-COUNSEL-245` (peer branch, honestly scoped as a near-negative finding rather than forced) |
| HPAT (ACER-administered, includes an "Understanding People" interpersonal section) | Medicine/allied health | Ireland | High — the general national admissions pathway for the field | `RULE-COUNSEL-122` (this branch) |

**Seven confirmed instances across three continents and five fields (as of this update) is enough
to treat this as a genuine, recurring structural category ORYN's recommendation model should
recognize generically** — not a peculiarity of any one program, tool, or country. Two of the seven
(UCAT, HPAT) are specifically medicine-admission aptitude tests with an interpersonal/situational-
judgment component layered on top of a grades-driven general system — worth checking for
explicitly as its own recurring sub-pattern whenever a new country's medicine admission is
researched, not just filed as a coincidence between two English-speaking neighbors. Whoever
eventually resolves item 13 in `13-implementation-readiness.md` (the founder-level scoping
question this category raises) should treat this table, not any single instance, as the scope of
what needs to be handled — and should expect more instances to surface as either branch's family
docs get further attention, given the pattern of finding a new one almost every time someone
checked a specific named program's own page rather than assuming the pattern from one example.

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
  pattern than the rest of UK admissions is (per `RULE-COUNSEL-058`'s own text). **Refined on a
  further pass**: this is incomplete on its own — UK medicine is a genuine *compound* case, not
  purely activity-rewarding. 57 UK universities also require the UCAT, which includes a
  standardized, separately-scored Situational Judgement Test — structurally the *same category* as
  Switzerland's aptitude-test gate below, just layered on top of (not instead of) holistic
  clinical-exposure evidence, where Switzerland uses its aptitude test *instead of* any activity
  review (`RULE-COUNSEL-121`).
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
- `RULE-COUNSEL-114` — For a France/Parcoursup-track target, `academics` (both the quantitative
  "Résultats académiques" and qualitative "Compétences académiques" champs) is high-weighted;
  `intellectual_curiosity` is explicitly named within "Savoir-être" (curiosité intellectuelle,
  ouverture au monde) and within subject-specific "Motivation" evidence; `leadership` and
  `community_impact` are explicitly named within the "Engagements, activités" champ (school-council
  engagement, civic service). All five champs are mandatorily percentage-weighted per formation
  (summing to 100%), but the exact percentage any specific formation assigns to any one champ is
  not general knowledge — genuinely formation-specific, not this package's to guess. Confidence:
  high for the mechanism and field definitions (official DGESIP source), medium for the ORYN-
  dimension mapping (this document's own reasoned extension), unresolved (not guessed) for any
  specific numeric weight. Originally marked fully unresolved; substantially resolved on a
  follow-up pass — see `RULE-COUNSEL-117`.
- `RULE-COUNSEL-115` — Tier alone is insufficient for Tier-3-with-named-carve-out targets; ORYN's
  counselor must know the specific named program and what that program's own rubric scores before
  recommending anything, since carve-out mechanisms range from activity-description (Waterloo) to
  pure reflective-response scoring with zero activity criterion (Queen's/McMaster) to skills
  auditions (conservatory) to standardized aptitude tests (Swiss medicine) — genuinely different
  evidence types, not variations on one holistic-review theme. Confidence: high (direct consequence
  of `RULE-COUNSEL-110`'s primary-source finding).
- `RULE-COUNSEL-117` — France's Parcoursup applications are evaluated against exactly 5 nationally-
  defined evaluation fields ("champs d'évaluation": academic results, academic
  competencies/methodology, soft skills, motivation/program-fit, and activities/engagement), each
  mandatorily assigned a formation-specific percentage weight summing to 100%, per DGESIP's own
  official CGEV framework document. Confirms activities/engagement is a real, structurally-
  guaranteed evaluation category, not an optional or vague consideration — but the specific
  percentage any one formation assigns to it remains formation-specific, not a single knowable
  number. Confidence: high (official DGESIP document, directly extracted via `pypdf` after
  WebFetch's own extractor failed on this file).
- `RULE-COUNSEL-116` — Country/tier-level conditioning and field-level (major-family) conditioning
  must compose together; medicine alone demonstrates the "exception direction" flips by country
  (activity-rewarding in US/UK, aptitude-test-gated in Switzerland, more-exam-dominated-than-usual
  in Turkey), so neither level of conditioning is sufficient alone. Confidence: high for the
  medicine cases specifically (each individually sourced elsewhere in this package); medium for how
  broadly this generalizes to other fields, which this document did not check beyond medicine.
- `RULE-COUNSEL-120` — ORYN's evidence/recommendation model needs to distinguish at least three
  structurally different non-academic assessment types, not two: achievement-evidence-based
  (US/UK/Waterloo), institution-authored reflective response (Queen's Commerce/McMaster HHSP,
  `RULE-COUNSEL-118`'s gap), and standardized third-party situational-judgment testing (CASPer —
  used across 500+ programs in medicine, health sciences, PA, nursing, and dental hygiene
  currently, expanding into education/business/engineering per the vendor's own page). The third
  type needs its own preparation guidance (general timed situational-judgment practice), distinct
  from rehearsing responses about the student's own specific experience. Confidence: high for what
  CASPer is and how it's administered (official vendor source); medium for exactly how far its
  program/field reach extends, which changes by admissions cycle per the vendor's own caveat.
