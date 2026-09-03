# Czechia (Czech Republic) — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, ninth entry in
the same single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md),
[`portugal.md`](./portugal.md), [`greece.md`](./greece.md), [`poland.md`](./poland.md),
[`denmark.md`](./denmark.md), [`hungary.md`](./hungary.md) and [`austria.md`](./austria.md) —
same scope discipline: one research session, official/institutional sources, unresolved
questions listed rather than guessed, not folded into the README's 15-country cross-country
matrix.

**Trigger:** continuation of the founder-requested corridor expansion. Like the previous eight,
Czechia was picked because ORYN's database already holds institutions there with zero admissions
depth (`shape: "unknown"` in every outlook computation until this entry lands).

## A. Admissions architecture — no central body, and genuine divergence, not just decentralization

**A different finding from every other decentralized country in this expansion line.** Poland,
Hungary's international track, and Austria all lack (or partly lack) a central admissions body,
but each still resolved to a *confirmed, consistent* mechanism type across the institutions
checked. Czechia does not: "each university [in Czechia] is responsible for its own admission
procedure and the conditions vary from one programme to another" (a general finding corroborated
across multiple sources), and — critically — Charles University's own official admissions page
states the same variation exists **within one institution**: "certain programmes may require an
entrance examination, while others assess applicants based solely on the candidate's profile and
submitted documents." This is genuine divergence, not convergence, and at a finer grain than this
package has found anywhere else — even Canada's confirmed institution-level divergence (UBC vs.
University of Toronto) doesn't also vary *within* one of those two institutions by programme the
way Charles University's own page confirms for itself.

## B. What was found, without forcing it into one shape

Confirmed patterns, none of them universal:

- **Credential-only admission** for some programmes: "in some cases, especially for English-taught
  programmes, admission can be based entirely on your previous qualifications and documents" —
  no exam, no essay, a threshold-style mechanism.
- **Programme-specific entrance exams**, commonly held in May, "written and oral," testing
  subject knowledge relevant to the target programme — some universities run these abroad to
  widen access. This alone would read as `academic_rank_competitive` or `academic_threshold`
  depending on whether a fixed quota exists per programme, which this pass did not resolve
  generally.
- **Genuinely holistic components** at specific programmes: Charles University's Education
  programmes combine a written subject test, a "learning potential test" at some programmes, and
  an interview explicitly assessing "motivation" alongside academic ability — real qualitative
  review, not exam-only.
- **Mixed academic-plus-interview** at other specific programmes: Charles University's Medicine
  track requires Chemistry/Physics/Biology tests, and "some faculties also include a logic test
  and an interview" — an academic gate with an interview layered on for some faculties, not all.
- A general pattern across multiple sources that many universities additionally request "a
  motivation letter, CV, language certificate, and sometimes an entrance exam or interview" —
  but explicitly "sometimes," not universally.

No single shape from `AdmissionSystemShape` describes this honestly. This registry entry
therefore records Czechia as `unknown` for both pathways, deliberately, the same treatment this
package's Canada entry already gives a confirmed-divergent decentralized system — with the
important difference that Czechia's divergence was found to run one level deeper (within, not
only between, institutions).

## Standardized tests

No national instrument. Where entrance exams exist, they are programme-set and programme-specific
in content, per every source reviewed.

## Language requirements

Confirmed to exist for Czech-taught programmes for foreign-schooled applicants (an additional
Czech-language test), separate from any English-proficiency requirement for English-taught
programmes. Not independently verified to specific numeric thresholds this pass.

## Essays / recommendations / extracurriculars

Confirmed present at some programmes (Charles University's Education track's interview
component explicitly weighs motivation; a general "motivation letter... sometimes" pattern was
found across sources), confirmed absent at others (credential-only English-taught programmes).
Genuinely programme-dependent, not resolvable to one general answer this pass.

## Safe inferences

Czechia has no central admissions platform or body. Unlike Poland (which converges on one
mechanism type despite decentralization) or Austria (open access as a genuine default with a
named exception), Czechia's own institutions — confirmed directly from Charles University's own
admissions page — show real divergence even *within* one university by programme: some assessed
on documents alone, others on a written exam plus an interview that explicitly weighs motivation.
No general shape can be honestly claimed without checking the specific target programme.

## Unsafe inferences

Do not assume any single Czech university's policy generalizes to another, or that a policy
found for one programme at Charles University applies to a different programme at the same
university — the confirmed finding is explicitly that it varies at the programme level, not just
the institution level. Do not assume the presence of an entrance exam implies competitive ranking
against a fixed quota (`academic_rank_competitive`) rather than a pass/fail threshold
(`academic_threshold`) — this pass found exams exist but did not resolve which of the two
applies generally or for any specific programme checked. Do not assume Medicine's
science-plus-logic-test-plus-sometimes-interview pattern, confirmed at Charles University,
generalizes to Czechia's other medical faculties.

## Counselor actions

Never present Czechia as having one national admissions mechanism — confirm the specific target
university AND specific target programme's own published requirements directly; this is not
optional caution here, it is the confirmed structure of the system. Where a programme is
credential-only, treat it as a genuine relief (no exam, no essay to prepare). Where a programme
names an entrance exam and/or interview, treat the interview specifically as weighing motivation
where confirmed (Education-track pattern) rather than assuming it is a purely academic oral exam.

## Sources

- StudyIn.cz (Studuj Na VŠ, a Czech higher-education promotion initiative), "What Entrance Exams
  at Czech Universities Are Like" — `https://www.studyin.cz/blog/873-what-entrance-exams-at-czech-universities-are-like-and-why-are-they-less-scary-than-you-think/`
  — retrieved 2026-09-03.
- Charles University, "How to Apply" — `https://cuni.cz/uken-329.html` — retrieved 2026-09-03.
  Primary source for the confirmed within-institution programme-level divergence in section A,
  and the Education/Medicine programme-specific mechanisms in section B.
- Secondary corroboration only (general application timing, motivation-letter/CV/language-
  certificate pattern): general web search summarizing institutional guidance across multiple
  Czech universities — not independently primary-verified for every specific claim this pass.

## Unresolved questions

Whether entrance-exam-based programmes generally compete against a fixed quota
(`academic_rank_competitive`) or a pass/fail threshold (`academic_threshold`) — genuinely
unresolved, not attempted to be forced into one answer without confirmation. Whether any
consistent pattern exists by field (e.g., all Medicine programmes nationally sharing Charles
University's science-plus-interview structure) — only Charles University was checked in depth
this pass. Numeric language-proficiency thresholds. Current-cycle deadlines beyond the general
February–April/May figures found across sources.
