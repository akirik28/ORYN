# 06.00 — Major-Family Taxonomy

**Answers:** For each of the mission brief's requested fields, what experiences genuinely
demonstrate interest/ability — organized under a coherent family structure, so 17 detailed
documents share one consistent taxonomy instead of each inventing its own.

**Status note (concurrent-session coordination):** this document — and the family-list/filename
assignment below — is being shared live with a second session also working this branch (see
`docs/handoffs/research-counseling-intelligence.md`'s concurrent-session note). Families 01–09 are
authored by this session; 10–17 by the other. Do not renumber or rename a family after both
sessions have started writing against this list — if a genuine problem is found with the grouping,
add a note in `10-open-questions.md` rather than silently reshaping this file.

## 1. Why a family layer at all, and why it does not become a 10th `ProfileDimension`

The mission brief lists ~36 raw fields (computer science, software engineering, data science, AI,
electrical/mechanical/civil/aerospace/biomedical engineering, mathematics, statistics, physics,
chemistry, biology, medicine, neuroscience, psychology, economics, finance, business,
entrepreneurship, political science, international relations, law, sociology, history, philosophy,
literature, journalism/communications, architecture, product/industrial design, visual arts,
film/media, environmental science, sustainability, and more via "expand where useful"). Treating
each as a fully independent research document would (a) massively duplicate content between
closely related fields that share most of their skills/exploration pathways (mechanical and civil
engineering; sociology and history; visual arts and film), and (b) obscure the genuinely
interdisciplinary connections the mission explicitly asks for (§"Interdisciplinary paths"). A
**family** here means: a cluster of raw fields that share enough of their skill base, exploration
pathways, and career-family structure that one document can respect their real differences while
still being useful as a single unit for a counselor engine to reason with. **This is a research
organization device only — it is not a new database concept.** ORYN's schema has no "major family"
table or column, and this package does not propose one. A family groups *this research's own
documents*; the actual field-level and career-level detail inside each family doc is where the
real many-to-many mapping lives.

## 2. Mapping onto the shipped onboarding interest vocabulary

`lib/validation/onboarding.ts`'s `INTEREST_SUGGESTIONS` (16 values, free-text "suggest," never a
closed enum — a student can always type something else) is the actual, shipped anchor for
"student interest" in ORYN today. Every family below states which onboarding suggestion(s) it
primarily answers to, and which of the mission's raw fields (well beyond the 16 onboarding
suggestions) it covers. **A custom/free-text interest a student types that isn't one of the 16
suggestions still needs a family to map to** — the "Nearest family" column exists for exactly that
matching problem, to be read heuristically by a future feature, never as a hardcoded exact-match
requirement.

## 3. The 18 families (grown from 17 once research surfaced one more genuine gap)

| # | Family | Onboarding suggestion(s) it answers to | Mission raw fields covered | Owner |
|---|---|---|---|---|
| 01 | Computing & Information Sciences | Computer Science | computer science, software engineering, data science, artificial intelligence (+ cybersecurity, HCI as sub-areas — not separately named in the mission brief but standard subfields) | This session |
| 02 | Mathematics & Statistics | Mathematics | mathematics, statistics (+ actuarial science as a career-family, not a separate major) | This session |
| 03 | Physical Sciences | Physics (no onboarding suggestion for chemistry specifically — nearest is Physics or a custom interest) | physics, chemistry | This session |
| 04 | Life Sciences | Biology | biology, neuroscience (the non-clinical, research-science reading of neuroscience — see family 11 for the behavioral/clinical reading) | This session |
| 05 | Engineering — Mechanical, Civil, Aerospace, Electrical | Engineering | mechanical engineering, civil engineering, aerospace engineering, electrical engineering | This session |
| 06 | Biomedical Engineering | Engineering (secondary: Medicine) | biomedical engineering | This session |
| 07 | Economics & Finance | Economics | economics, finance | This session |
| 08 | Business, Management & Entrepreneurship | Business, Entrepreneurship | business, entrepreneurship | This session |
| 09 | Environmental Science & Sustainability | Environmental Science | environmental science, sustainability | This session |
| 10 | Medicine & Clinical Health Pathways | Medicine | medicine (+ brief allied-health/nursing mention per mission's caution to not over-focus on one path) | Peer session |
| 11 | Psychology & Behavioral/Cognitive Science | Psychology | psychology (+ the behavioral/clinical reading of neuroscience) | Peer session |
| 12 | Political Science, IR & Public Policy | Politics | political science, international relations | Peer session |
| 13 | Law-Oriented Pathways | Law | law-oriented pathways (deliberately "pathways," plural — see family 13's own framing of jurisdictional variance) | Peer session |
| 14 | Sociology, History & Philosophy | History | sociology, history, philosophy | Peer session |
| 15 | Literature, Journalism & Communication | Literature | literature, journalism/communications | Peer session |
| 16 | Architecture & Design | Design | architecture, product/industrial design | Peer session |
| 17 | Visual & Media Arts | (no direct onboarding suggestion — nearest is Design or a custom interest) | visual arts, film/media | Peer session |
| 18 | Education & Teaching | (no direct onboarding suggestion — a real, separate gap, see §4) | *(not in the mission's original raw-field list at all — added because teaching/education as a career path was found completely absent across all 17 original families during a post-completion coverage check, not because the mission named it explicitly)* | This session |

**Filenames** (both sessions use this exact list — do not deviate): `01-computing-information-
sciences.md`, `02-mathematics-statistics.md`, `03-physical-sciences.md`, `04-life-sciences.md`,
`05-engineering-me-ce-ae-ee.md`, `06-biomedical-engineering.md`, `07-economics-finance.md`,
`08-business-management-entrepreneurship.md`, `09-environmental-science-sustainability.md`,
`10-medicine-clinical-pathways.md`, `11-psychology-behavioral-science.md`,
`12-political-science-ir-public-policy.md`, `13-law-oriented-pathways.md`,
`14-sociology-history-philosophy.md`, `15-literature-journalism-communication.md`,
`16-architecture-design.md`, `17-visual-media-arts.md`, `18-education-teaching.md`.

## 4. Gaps in the onboarding vocabulary this mapping surfaces

Two onboarding suggestions given no dedicated family above because they are **methods/approaches
that cut across many families, not fields themselves**: none of the 16 are actually like this, but
worth naming the near-miss — "Design" maps most naturally to family 16 (architecture & product/
industrial design specifically) even though design thinking/visual design also matters in
family 17 and, as a skill, in almost every family's project work. Treated as belonging to family
16 primarily, with a cross-reference from family 17, rather than duplicated.

Two mission raw fields have **no onboarding suggestion at all** and would currently only be
reachable via free-text: chemistry (nearest suggestion: Physics, imperfect) and journalism/
communications, film/media, sociology, philosophy, international relations, product/industrial
design, environmental science-adjacent "sustainability" specifically (all reachable only via
History/Design/Environmental Science as approximate neighbors, or free text). **This is a real,
scoped gap worth flagging for a future onboarding refinement** (not this package's to fix) —
carried to `10-open-questions.md`.

## 5. Cross-cutting principles every family document must follow

Restated here once so no family document has to repeat it (per `01-development-taxonomy.md`'s own
"cross-cutting concepts belong once" convention):

1. **Major ≠ career, stated explicitly per family, not just once here.** Every family document
   must show at least 3-4 genuinely different career-family destinations and, where a real,
   sourced example exists, at least one *counter-stereotypical* one (a mathematics graduate in
   quantitative finance, not just "becomes a mathematician").
2. **No career-fit percentages, ever** — matches `RULE-CAREER-*`-equivalent framing already
   established in `08-unsafe-inference-rules.md`'s scope (see that document once it exists;
   forward-referenced here because this principle must be live from family doc 01 onward, not
   retrofitted).
3. **Professional/licensure caution is explicit and country-scoped**, never a single global claim —
   required especially for families 06, 10, 11 (clinical track), 13, 16.
4. **Exploration pathways are graded by stage** (middle school / early high school / late high
   school), cross-referencing `03-recommendation-timing.md`'s grade-banding rather than restating
   its reasoning.
5. **Every non-obvious factual claim about career outcomes, licensure, or field structure needs a
   real source** at the tier discipline established in `00-overview.md` — government/professional-
   body/official-university sources preferred; career blogs are discovery-only.
6. **Interdisciplinary cross-references go both ways.** If family 01 (Computing) mentions a
   CS+biology combination, family 04 (Life Sciences) should mention the same combination from its
   own side, consistently (not contradicting which skills/experiences are named).

## 6. Interdisciplinary combinations this taxonomy must not lose (mission §"Interdisciplinary paths")

Named up front so neither session accidentally treats families as silos:

| Combination | Primary families | Where the connective tissue lives |
|---|---|---|
| CS + biology (computational biology, bioinformatics) | 01, 04 | Both family docs |
| CS + economics (algorithmic markets, computational social science) | 01, 07 | Both family docs |
| AI + medicine (clinical ML, diagnostic tools) | 01, 10 | Both family docs |
| Math + economics (quantitative finance, econometrics) | 02, 07 | Both family docs |
| Design + engineering (industrial design, human factors) | 05/06, 16 | Both family docs |
| Politics + economics (political economy, public policy analysis) | 07, 12 | Both family docs |
| Psychology + neuroscience (cognitive science) | 04, 11 | Both family docs |
| Environment + engineering (sustainable/environmental engineering) | 05, 09 | Both family docs |
| Business + technology (product management, tech entrepreneurship) | 01, 08 | Both family docs |
| Law + technology (tech policy, IP law) | 01, 13 | Both family docs |

**Family 18 (Education & Teaching) is a structural exception to this table's one-pair-per-row
shape**, not an omission — it connects to *every* other family at once (a student's "what to teach"
question routes to whichever subject-matter family matches their interest), so it is documented
in its own §5 rather than forcing an arbitrary single-pair row here.

## Sources referenced in this document

This document is a structural/organizational device built directly from the mission brief's own
field list and ORYN's shipped `lib/validation/onboarding.ts`; it makes no external factual claims
requiring citation. Per-family sourcing lives in each family document.
