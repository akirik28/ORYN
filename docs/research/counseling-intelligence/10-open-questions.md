# High-Risk Unresolved Questions

Answers: *what remains genuinely unresolved, and what data does ORYN not yet have to execute
these rules?* Ordered by how much it should worry a founder reading this once, not by document
order.

## 1. HIGHEST RISK: this package's evidence base is disproportionately US-holistic-admissions-shaped, and ORYN's target geography is not

Checked directly, late in this session, specifically because it should have been checked earlier:
**Turkey and the UK — two of ORYN's five explicit target geographies (`AGENTS.md` §0) — do not run
holistic, activity-weighted admissions the way this package's core sources (Common Data Set, NACAC,
MIT, Harvard GSE) describe.**

- **Turkey (YKS):** university admission is overwhelmingly determined by a centralized exam score
  — TYT (40%) and AYT (60%) compose the admission score directly, and this is described
  consistently as "the dominant component of the admission process, with extracurricular activities
  playing a minimal role," especially pronounced for the most competitive faculties (medicine,
  engineering, law). (Source: multiple Turkey-education-system overview sources — medium-high
  confidence for the general structure; this package did not verify current-year exact weighting
  percentages against a single official ÖSYM page.) [[RULE-COUNSEL-057]]
- **UK (UCAS):** not exam-only like Turkey, but structured very differently from US holistic
  review. The operative concept is **"super-curricular"** (subject-extending activity — wider
  reading, subject olympiads, relevant online coursework, subject-relevant projects) as distinct
  from generic **"extracurricular"** (sports, clubs, leadership unrelated to the applied subject) —
  guidance for competitive courses recommends personal statements be 80-90% subject/academic
  content, with general extracurricular activity earning space "only when you can articulate the
  transferable skill." Predicted grades carry substantial, separate weight. Medicine is named as a
  partial exception where clinical work experience/volunteering is specifically expected. (Source:
  UK admissions-consulting sources describing UCAS practice — medium-high confidence; UCAS's own
  official guidance was not independently re-fetched this pass.) [[RULE-COUNSEL-058]]

**What this means concretely: this package's 9-dimension development taxonomy, its redundancy/
saturation model, and most of its major-family evidence docs are built almost entirely from
sources describing US practice.** They are not *wrong* as a general student-development framework
— academic rigor, genuine engagement, depth over performative breadth are plausibly good advice
for a student's actual development regardless of admissions system — but **presenting them to a
student as admissions-relevant strategy without geography-conditioning them would be actively
misleading for a Turkey-YKS-track or UK-UCAS-track student.** A Turkish student spending
significant time on a 4th extracurricular activity because ORYN's counselor treated it as
valuable "profile development" would be making a real, costly trade-off against exam-prep time
that (per the sourced pattern above) matters far more for their actual admission outcome. A
UK-bound student needs subject-relevant ("super-curricular") activity prioritized over generic
breadth in a way this package's 9-dimension model doesn't currently distinguish cleanly (it has
`intellectual_curiosity` and a separate `fieldAlignment`/relevance axis already, per `01`
§4 — but no document in this package explicitly operationalizes "for a UK-track student, weight
subject-relevant `intellectual_curiosity` evidence far above non-subject-relevant `leadership`/
`community_impact` evidence," which the UK sourcing above suggests should be the actual behavior).
[[RULE-COUNSEL-059]]

**This is not resolved by this package and should not be treated as a minor caveat.** It is the
single highest-leverage next research task for whoever continues this work: a
geography-conditional counseling-behavior layer (does this student's target system reward
holistic breadth, subject-depth-only, or exam-score-only?) sitting *above* the development
taxonomy, determining how much weight non-academic dimensions should even receive in a
recommendation, before any of this package's other frameworks apply. Neither this session nor
(per its own docs, not independently re-verified) the peer session's appears to have built this
layer — both branches' work is real and valuable as *development* guidance, but incomplete as
*admissions-strategy* guidance outside US-style holistic systems. [[RULE-COUNSEL-060]]

## 2. Data ORYN does not currently have, that these rules assume or would benefit from

| Missing data | Blocks | Documented in |
|---|---|---|
| School-level curriculum availability (what a student's *school* offers, not just what they took) | The "rigor relative to availability" School Profile principle | `04-profile-gap-framework.md` §2 |
| Structured achievement-tier field (finalist/semifinalist/winner as distinct from free-text award level) | The evidence-state ladder (`02`) and tier-aware redundancy model (`05` §4) — both real conceptually, only partially executable today | `02-opportunity-development-mapping.md` Part A/C, `05-redundancy-saturation.md` §4, confirmed against real data in `09-persona-testing.md` Persona C |
| Opportunity-level selectivity/entry-bar field | Distinguishing "won an unselective contest" from "was a finalist in a highly selective one" | `02-opportunity-development-mapping.md` Part B |
| A structural link between a `saved_opportunities`/application record and its eventual outcome (`awards` entry) | Automatically detecting achievement tier per opportunity rather than relying on free text | `02-opportunity-development-mapping.md` §1 (Problem A) |
| A student's actual current grade/stage (only `graduation_year` exists; peer's `03` proposes a derived `yearsUntilGraduation` fallback, not implemented) | Any timing-aware recommendation logic | `03-recommendation-timing.md` (peer) §1 |
| First-class evidence types for writing/communication and creative production | Fully representing the literature/journalism/arts family docs' evidence (`15`, `17`) in the scoring engine | `01-development-taxonomy.md` §4 |
| Recognition of paid part-time work as distinct, legitimate `career_exploration` evidence (currently only "internship" is a named bonus) | Fair treatment of Persona F-shaped (access-constrained, work-experience-heavy) profiles | `09-persona-testing.md` Persona F |
| A geography/admissions-system-conditional weighting layer | Everything in §1 above | This document, §1 |

## 3. Composition risk between this package's own documents (partially resolved, implementation still needed)

`09-persona-testing.md` found that `05-redundancy-saturation.md`'s tier-aware discount model and
peer's `03-recommendation-timing.md`'s Phase-1 breadth protection compose incorrectly if applied
naively — resolved *conceptually* (breadth-dimension candidates should be exempt from redundancy
discounting for Phase-1 students, `RULE-COUNSEL-056`) but not implemented anywhere, since this
package makes no code changes. Whoever implements either framework should treat this composition
rule as a required part of the implementation, not an optional refinement — it was found through
adversarial persona-testing specifically because the two documents were written by different
sessions without a shared model of how they'd interact, which is a real risk for *any* two
frameworks in this package, not only this specific pair. A future integration pass should
specifically re-check every pairwise combination of documents for the same kind of silent
composition error, not assume persona-testing caught all of them.

## 4. Cross-branch rule-ID collisions (process risk, not a research risk)

At least one direct `RULE-COUNSEL-###` ID collision is already known (`RULE-COUNSEL-056`, minted
independently by both this session's `09` and the peer session's `08` for two different rules) —
documented, not resolved, in `09-persona-testing.md`'s final section. The final `rules.json`
assembly pass (whichever session does it, per the coordination agreement in
`docs/handoffs/research-counseling-intelligence.md`) must renumber on merge, not assume the two
branches' numbering is compatible as-is.

## 5. Things this package deliberately did not attempt, and why

- **No admission-probability modeling.** Entirely out of scope per the mission's own explicit
  prohibition and `AGENTS.md`'s non-negotiables — noted here only to confirm it was a deliberate
  exclusion, not an oversight.
- **No verification of any specific named opportunity/program's current status.** Every named
  program in this package (RSI, APA HS Internship, National History Day, Scholastic Awards, ISEF,
  etc.) is cited as an *illustrative example of a pattern*, not as a live, verified-current
  recommendation — that verification is a separate, already-existing ORYN workstream
  (`lib/acquisition/`, per `docs/MASTER-EXECUTION-STRATEGY.md` §3) and must not be shortcut by
  treating this research package's citations as pre-verified.
- **No independent re-verification of the peer session's specific claims** (its 9 family docs, its
  exact source citations) — this package cites the peer's *documents* by reference and evaluates
  their *structure/reasoning* (e.g., in `09`'s persona walkthroughs) but did not re-derive their
  underlying research from scratch, consistent with not duplicating already-careful work, but
  worth the founder knowing this package's confidence in peer content is "read and found
  reasonable," not "independently re-verified line by line" the way this session verified its own
  code-level claims against actual `lib/scoring/dimensions/*.ts` files.

## Rules established in this document

- `RULE-COUNSEL-057` — Turkish YKS-track admission is exam-score-dominated; extracurricular/
  development-dimension counseling should not be presented as admissions-strategically important
  for this pathway the way it would be for US holistic review. Confidence: medium-high (consistent
  secondary sourcing, not independently verified against ÖSYM's own official current-year
  publication).
- `RULE-COUNSEL-058` — UK UCAS applications reward subject-relevant ("super-curricular") evidence
  far more heavily than generic extracurricular breadth for competitive courses; this package's
  taxonomy does not yet operationalize that distinction. Confidence: medium-high.
- `RULE-COUNSEL-059` — This package's 9-dimension taxonomy and redundancy/quality-over-quantity
  findings should be treated as general student-development guidance, not assumed to transfer
  directly as admissions-strategy guidance outside US-style holistic-review systems. Confidence:
  high (direct, reasoned consequence of `057`/`058`).
- `RULE-COUNSEL-060` — Building a geography/admissions-system-conditional weighting layer above the
  development taxonomy is the single highest-leverage next research task arising from this
  package. Confidence: high (this is a recommendation, not an empirical claim).
