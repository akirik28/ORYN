# 14 — Field ↔ Opportunity-Category Mapping

**Answers the mission brief's own deliverable #5 ("field ↔ opportunity mapping") directly**,
using its own worked examples as the target shape: *"This research program is particularly
relevant to: biology, biomedical engineering, medicine exploration"* and *"This competition
provides algorithmic problem-solving evidence rather than software-development evidence."*
Neither this package's `02-opportunity-development-mapping.md` (category → `ProfileDimension`,
with an evidence-state ladder) nor the `06-major-family-evidence/` family docs (which discuss
relevant opportunity types narratively, per field) index the relationship the other way: **given
an opportunity category, which fields is it most distinctively relevant to, and why.** This
document builds that index directly, organized by category (not a 13×17 matrix — most cells would
be near-zero-information "technically possible," which is exactly the kind of low-value exhaustive
scoring the mission warns against; a focused shortlist per category is more useful and more honest).

**Extends, does not replace**: `lib/opportunities/matching.ts`'s `CATEGORY_DIMENSIONS` (category →
`ProfileDimension`) and this package's own evidence-state work. This document adds a third axis —
category → **field** — which `CATEGORY_DIMENSIONS` cannot express at all (it has no concept of
field/subject, only developmental dimension). A future implementation could plausibly use this
document's content to inform a per-opportunity `fields`-tag refinement (opportunities already have
a free-text `fields: string[]` column per `types/database.ts` — this document's family names are one
reasonable, non-exhaustive controlled vocabulary such a refinement could draw from), but that is an
implementation decision out of this research package's scope.

**Family numbering** follows `06-major-family-evidence/00-family-taxonomy.md` exactly: `01`
Computing, `02` Math/Stats, `03` Physical Sciences, `04` Life Sciences, `05` Engineering (ME/CE/AE/
EE), `06` Biomedical Engineering, `07` Economics/Finance, `08` Business/Entrepreneurship, `09`
Environmental Science/Sustainability (all authored on this branch); `10` Medicine, `11` Psychology,
`12` Political Science/IR/Policy, `13` Law, `14` Sociology/History/Philosophy, `15` Literature/
Journalism/Communication, `16` Architecture/Design, `17` Visual/Media Arts (authored on the peer
branch — referenced here by number/name only, their content not independently re-verified by this
document beyond what this package's own family-taxonomy doc already establishes); `18` Education &
Teaching (added later, this branch — see the dedicated section below on the opportunity-category
gap it surfaced).

## `competition`

The single most sub-type-heterogeneous category (`02-opportunity-development-mapping.md` §1)  —
never map "competition" as one relevance signal without naming which kind:

- **Mathematical/algorithmic olympiad** (proof-based or algorithmic problem-solving under contest
  conditions): families `01` (algorithmic-competition sub-type, distinct from software-dev
  evidence — `01`'s own §4/RULE-COUNSEL-204) and `02` (pure-math-track fit specifically, `02` §4).
- **Science fair / research-competition** (a project + judged presentation, closer to `research`
  category evidence than pure `competition` evidence): families `03` (chemistry olympiad
  specifically, `03` §4), `04` (biology olympiad, `04` §4), `06` (biomedical/bioengineering
  project fairs).
- **Business-case/simulation competition** (DECA/FBLA-style): family `08` — explicitly *not*
  entrepreneurship evidence, only business/management-reasoning evidence (`08` §4, RULE-COUNSEL-
  214).
- **Economics research-and-writing competition** (Fed Challenge-style — a hybrid of `competition`
  and `research`): family `07` (`07` §4).
- **Debate/moot court/model UN**: relevant to peer families `12` (political science/IR) and `13`
  (law) — not independently re-verified by this document, named here for completeness of the
  category-level index.
- **Design/architecture competition**: peer family `16`.

## `research`

Per `01-development-taxonomy.md`'s research sub-facet ladder (exposure → execution → independence
→ output) — most directly relevant to families `03`, `04`, `06` (all have a strong pre-university
research-program tradition — ACS's Project SEED, IBO's practical exam explicitly covering
bioinformatics, biomedical/bioengineering research programs specifically), `01` (research-track CS/
AI, distinct from a pure software-build project), `02` (applied/statistics research specifically,
distinct from pure-math competition evidence), `07` (economics research projects using real data,
`07` §4), and `09` (field/conservation research placements, distinct in profile from lab-based
research — `09` §4). Peer families `10` (pre-clinical/biomedical research) and `11` (psychology
research) are also natural fits, per the general pattern.

## `internship`

Most differentiating by **substantive-work vs. shadowing** (`02-opportunity-development-mapping.md`'s
`internship` entry) rather than by field — relevant across nearly every family in principle, but
particularly worth naming for families where the mission itself cautions against unsafe internship
placement: peer family `10` (medicine) explicitly, per the mission's "never advise unsafe or
inappropriate clinical activity" instruction. For this session's families, most directly relevant
to `01` (software internships — a common, accessible pre-university option relative to other
fields), `07` (finance/business internships), and `08`.

## `summer_program`

The most **stage-dependent** category (`03-recommendation-timing.md` §3) — disproportionately a
Phase-1/exploration-stage opportunity across every field, per that document's own timing table.
Distinctively relevant to fields with well-known, structured pre-college summer offerings: `03`
(physics/chemistry immersion programs), `04` (biology/life-science research-immersion programs,
per the "rising junior/senior" eligibility pattern documented in `03-recommendation-timing.md` §1),
`09` (environmental/conservation field placements, `09` §4), and — per peer's presumed coverage —
medicine-adjacent pre-health programs (family `10`) and pre-law programs (family `13`). Selectivity
of the *program* is a prestige-adjacent signal separate from what it teaches (`09` §4's own
caution).

## `fellowship`

Structurally variable (research-apprenticeship-shaped vs. leadership-cohort-shaped,
`02-opportunity-development-mapping.md`'s `fellowship` entry) — the research-shaped variant maps
onto families `03`/`04`/`06`/`07`/`09` the same way `research` above does; the leadership-cohort
variant is less field-specific and maps more onto the `leadership`/`execution_project_depth`
dimensions generally than onto any one family.

## `scholarship`

The **least field-differentiated** category — a scholarship's relevance is almost entirely about
its own eligibility criteria (merit/need/field-restricted) rather than about what it develops
(`06-major-family-evidence/02-mathematics-statistics.md` §3's own note that a scholarship
*application* alone isn't `academics` evidence). Field-restricted scholarships exist across every
family; no single family is distinctively over-represented in this category based on this
research.

## `volunteering`

Distinctively relevant to family `09` (conservation-volunteering, e.g. Student Conservation
Association-style placements, `09` §4) and structurally to peer family `10` (health-related
volunteering, with the mission's own safety caution) — otherwise, volunteering's relevance is
primarily to the `community_impact` dimension generally rather than to any one field specifically,
per `01-development-taxonomy.md` §2.6's framing (cause-area breadth, not field-depth).

## `entrepreneurship`

Distinctively relevant to family `08` (definitionally) and, per this package's own interdisciplinary
notes, to `01` (tech entrepreneurship) and `05`/`06` (hardware/deep-tech, medtech ventures). The
UK's Young Enterprise Company Programme (`08` §7) is this category's single strongest non-US
evidence-quality example found in this research — a genuinely real venture, not a simulation.
**RULE-COUNSEL-214 applies across every family**: a business-case-competition placement is never
substitutable for entrepreneurship evidence, regardless of which field the venture idea touches.

## `hackathon`

Distinctively relevant to family `01` (its natural home — rapid software build under time
pressure) and, per this package's interdisciplinary notes, to `05`/`06` (hardware-hackathon
variants exist, though less common than software-only ones) and `08` (business-model/pitch
hackathons, closer to the `competition`/business-case sub-type than to a build-focused hackathon).
Team-size/individual-contribution is this category's biggest open measurement gap
(`02-opportunity-development-mapping.md`'s own note), true regardless of field.

## `academic_program` / `online_program`

The two most **field-agnostic-by-structure** categories — relevance is determined almost entirely
by the specific program's own subject content (`fields` tag) rather than by the category itself.
Worth naming one distinctive pattern: for families with a well-known "gateway" pre-university
course convention (`02`'s actuarial-exam-adjacent coursework, `07`'s AP/IB economics, `01`'s
introductory CS MOOCs), online-program completion is a meaningfully more common and lower-barrier
entry point than in fields without such a convention (e.g., `06` biomedical engineering has no
equally well-known introductory MOOC pattern this research identified).

## `conference`

Distinctively relevant to families with strong pre-university conference/symposium traditions:
`04` (student research symposia), `07` (the Fed Challenge's published "Journal of Future
Economists" outcome is conference-adjacent, `07` §4), and peer families `12` (Model UN — though
Model UN is arguably closer to a structured `student_program`/`competition` hybrid than a pure
`conference`) and `16`/`17` (design/arts critique and portfolio-review events). The
attended-vs-presented distinction (`02-opportunity-development-mapping.md`'s `conference` entry)
matters more here than for any other category, since both extremes are common.

## `student_program`

The catch-all — by construction, this category's field-relevance is entirely determined by the
specific program, not by the category. No family is distinctively over- or under-represented in
this research's findings; treat per-program `fields` tags as authoritative, consistent with
`02-opportunity-development-mapping.md`'s own conservative floor-mapping for this category.

## A genuine missing category, surfaced by family 18 (Education & Teaching)

Family 18's core exploration pathway — sustained, structured tutoring or teaching of others
(`06-major-family-evidence/18-education-teaching.md` §4) — does not map cleanly onto any of the
13 existing `OpportunityCategory` values. It is not quite `volunteering` (which this package's own
`01-development-taxonomy.md` treats as service-to-others generally, not specifically instructional);
not `internship` (usually unpaid/informal, not an employer relationship); not `student_program`
(too specific a pattern to leave in the catch-all when it recurs across a whole family). **This is
a genuine, concrete missing-opportunity-category finding**, not a stretch: tutoring/mentoring
programs are common, real, structurally distinct activities (a student teaching younger students
math, a peer-tutoring program, a structured mentorship role) that current `saved_opportunities`/
`opportunities` data has no clean home for beyond a generic `volunteering` or `student_program` tag
that would lose the instructional-specificity family 18 needs to reason about it well. **Proposed
name if a future migration adds it: `tutoring_mentorship`** — not implemented here (schema changes
are out of this research package's scope), flagged for `10-open-questions.md` (peer-owned) and
noted here since it was found via this document's own category-by-category review.

## What this implies for a future implementation (not built here)

1. A per-opportunity `fields`-tag refinement could reasonably draw on this document's family
   vocabulary (already the shared taxonomy `06-major-family-evidence/00-family-taxonomy.md`
   establishes) rather than inventing a new one — but implementing that tagging, and deciding
   whether it's free-text, a controlled list, or AI-assisted classification, is out of this
   research package's scope.
2. This document's category-level shortlists are **illustrative, not exhaustive** — per the
   mission's own "no job-title spam" caution generalized to fields: naming every technically-
   possible family per category would be lower-value than naming the genuinely distinctive ones,
   which is what this document does throughout.
3. Cross-reference `08-unsafe-inference-rules.md` §5 (evidence-strength conflation) before using
   any of this document's mappings to imply a category *guarantees* a specific evidence strength —
   this document maps *relevance*, not *strength*, which remains governed by the evidence-state
   ladder in `02-opportunity-development-mapping.md`.

## Sources referenced in this document

Pure synthesis of this package's own prior documents (both branches, cited throughout by file/
section) plus direct re-application of `lib/opportunities/matching.ts`'s `CATEGORY_DIMENSIONS` and
`types/database.ts`'s `OpportunityCategory`/`fields` definitions. No new external sources fetched.
