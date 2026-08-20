# Secondary education system intelligence (R2.1)

**Status:** Complete — 8 of 8 systems researched. **Consumer:** primarily Claude B
(product/counselor/academic-profile semantics), secondarily Claude A (data normalization/
canonical academic metadata). Short operational summary:
[`docs/handoffs/research-secondary-education-systems.md`](../../handoffs/research-secondary-education-systems.md).
Machine-readable version of everything below:
[`data/research/academic-systems/secondary-systems-v1.json`](../../../data/research/academic-systems/secondary-systems-v1.json).

## Why this research exists

ORYN's counselor question is *"given this student's actual academic context, what does
their record mean and what should they do next?"* — that requires correctly interpreting
different secondary-education systems, not flattening them into one fake GPA. A `92.5/100`
MEB grade is not inherently a `3.7 GPA`. An `AP course` is not the same thing as an `AP
exam score`. An `IB predicted grade` is not the same thing as a `final IB result`. `IGCSE`,
`A Level`, `IB`, `AP`, `MEB` are not interchangeable fields. This research exists to give
Claude B and the counselor system enough domain intelligence to avoid those errors.

## Systems covered (8, by design — not exhaustive)

| System | Doc | Owner/authority |
|---|---|---|
| Türkiye / MEB | [`turkiye-meb.md`](./turkiye-meb.md) | Millî Eğitim Bakanlığı |
| IB Diploma Programme | [`ib-dp.md`](./ib-dp.md) | International Baccalaureate Organization |
| Advanced Placement | [`ap.md`](./ap.md) | College Board |
| Cambridge IGCSE | [`cambridge-igcse.md`](./cambridge-igcse.md) | Cambridge Assessment International Education |
| Cambridge International AS & A Level | [`cambridge-as-a-level.md`](./cambridge-as-a-level.md) | Cambridge Assessment International Education |
| French Baccalauréat | [`french-baccalaureate.md`](./french-baccalaureate.md) | Ministère de l'Éducation nationale |
| German Abitur / DSD | [`germany-abitur-dsd.md`](./germany-abitur-dsd.md) | 16 Länder Kultusministerien (Abitur) / ZfA-Auswärtiges Amt (DSD) — two different authorities, see the doc |
| US High School Diploma | [`us-high-school.md`](./us-high-school.md) | No single authority — state/district |

Each doc follows the same structure: system identity, native grading model, course/
qualification structure, rigor signals, predicted grades, class rank, external assessment,
unsafe inferences, counselor interpretation, and profile data-model implications — all
checked against ORYN's actual `education_records`/`courses`/`test_scores` schema, not
researched in the abstract.

## Source standard applied throughout

Government/national authority → official curriculum/examination body → reputable
university admissions guidance (application-*use* context only) → secondary sources for
*discovery* only, never as sole evidence for a factual claim. Every important claim in the
underlying JSON carries a `source_url`, `source_type`, and a note on what it supports.
Where a primary source could not be fetched (several — ibo.org, ucas.com,
education.gouv.fr all blocked automated access this session), the finding is flagged as
search-snippet- or secondary-corroborated rather than presented as verbatim-confirmed —
see each doc's own confidence notes and "Unresolved questions" section.

## Cross-system matrix

| Dimension | MEB | IB DP | AP | Cambridge IGCSE | Cambridge AS/A Level | French Bac | German Abitur/DSD | US Diploma |
|---|---|---|---|---|---|---|---|---|
| **Curriculum / qualification / exam** | National curriculum + diploma framework, layered with separate LGS/YKS placement exams | Curriculum → conditional Diploma *or* individual course results | Course-level enrichment only — never a whole-school curriculum or diploma (AP Capstone Diploma is a narrow supplementary exception) | Subject-by-subject qualification, no diploma aggregate | Subject-based; standalone AS, staged AS→A2, or full linear A Level — 3 distinct routes; optional AICE Diploma aggregate exists | National diploma *and* university-entry credential in one | Abitur = diploma + entrance qualification; **DSD = language-proficiency exam only, a different credential entirely** | No single national system — state/district-issued |
| **Native grading scale** | 0-100 at every level, no current 1-5 scale | 1-7/subject; 0-45 diploma total (derived) | Course grade = school's own scale; exam = College Board 1-5 | A*-G (primary, 2025-reaffirmed) with a 9-1 numeric option for some subjects/regions | A Level A*-E, AS a-e (no A*); optional PUM 0-100 per subject | 0-20 | 1-6 ordinary grades; separate 0-15 Notenpunkte for Oberstufe/Abitur; DSD uses its own CEFR levels | No single scale — commonly 0-100 or A-F → GPA, 4.0 unweighted / 5.0-6.0 weighted, varies by district |
| **External exam** | LGS (MEB) + YKS (ÖSYM) — two different bodies, separate from any AP/IB/A-Level | Yes, May/Nov session, mixed internal+external-moderated | Yes — AP Exam only; course grade is not external | Yes, twice yearly | Yes, twice yearly | Yes — the Bac exams are the assessment (60% of grade) | Abiturprüfung (increasingly shared multi-state pool); DSD exam is separate | None inherent — SAT/ACT are separate, optional, not part of the diploma |
| **Predicted grades** | No formal concept; in-progress data submitted for foreign applications | Yes, formal, school-issued, UCAS-integrated | No official concept; informal counselor estimates only | Not a primary IGCSE use case (results usually already final) | Yes, school-generated, central to UCAS; distinct from Cambridge's own internal "forecast grade" QA process | No formal concept; Parcoursup uses actual grades + qualitative Fiche Avenir | No formal domestic concept; informal estimates only for non-German applications | Not applicable domestically — transcripts show actual grades-to-date |
| **Course levels** | No internal tier (selectivity is school-level, e.g. Fen Lisesi vs. standard) | HL / SL (3-4 of 6 subjects at HL) | Single "AP" level; rigor reads relative to school's own AP catalog | Core / Extended tiers per subject | Standalone AS / staged AS+A2 / full A Level — genuinely non-equivalent evidence | 3 spécialités (première) narrowed to 2 (terminale) + tronc commun | Leistungskurs / Grundkurs (state-variable count until 2027 reform) | Regular / Honors (+ AP/IB/Dual-Enrollment, covered elsewhere) |
| **Class rank inherent?** | No — structurally absent except a single per-school `okul birincisi` honor, not even on the diploma | No — not defined/published by IBO; school policy if present | No — not defined by College Board; school/district policy | No — not a Cambridge feature | No — not a Cambridge feature | Not Ministry-mandated; inconsistent, school-software-dependent where it appears | Generally not a feature of German school culture | Historically common, now declining — 50%+ of schools no longer publish it (non-publication ≠ non-computation) |
| **Safe GPA conversion?** | None universal; one named exception (Univ. of Leeds' own admissions table) | None; only a specific receiving institution's own stated policy | None official; "grade equivalent" tables are credit guidance, not GPA conversion | None | None — Cambridge states explicitly no GPA is calculated | None authoritative | None for either German scale | None even within the US itself — always preserve the school's own `gpa_scale` |
| **Important ORYN interpretation** | Read the diploma-notu trend on its own scale, in the school's own admission/offering context; LGS/YKS are separate from course grades | Keep subject/TOK/EE/CAS/predicted/final/total as 6-7 separate fields; never assume Diploma pursuit from subject grades alone | Never assume course-taking implies exam-taking or vice versa; never store `'ap'` as a whole-record curriculum | Preserve native grade symbol exactly; never compute an aggregate | Distinguish AS-only from full A Level evidence; distinguish predicted/forecast from final | Spécialité choice + exam results are the primary rigor/fit signal; mention is a native-scale summary, never a GPA proxy | **DSD level must never be read as proof of Abitur completion or general academic strength** — always check whether a corresponding Abitur/DIA/GIB record exists | Read GPA/rigor strictly relative to the specific school's own policy and school-profile context; class rank and predicted grades are generally not-applicable/unknown |

## Recommended ORYN ruleset (evidence-based, research recommendations only)

Not production logic — a distilled set of rules this research found repeated, in some
form, across most or all 8 systems, each grounded in a specific sourced finding above.

**RULE-ACADEMIC-001 — Preserve native grades.**
Never force a grade into a US-style 4.0 GPA. No system researched has a universal,
authoritative conversion to GPA/4.0 (MEB, IB, AP, IGCSE, A Level, French Bac, German
Abitur all confirmed no such conversion exists). The only legitimate exception is a
*specific, named* receiving institution's own published, purpose-bound policy (e.g.
University of Leeds' Turkey-specific table) — cited by name and purpose, with the native
figure always retained alongside it, never replacing it.

**RULE-ACADEMIC-002 — Never infer class rank.**
Absence of rank means different things in different systems — structurally absent by
design (MEB, Germany), not a system feature at all (IB, AP, Cambridge), inconsistent/
school-dependent (France), or increasingly unpublished-but-still-computed (US, per NACAC's
documented 42%→9% decline in admissions weight, 2006-2023). In every case, absence is
**unknown**, not zero, and must never be computed or estimated from grades.

**RULE-ACADEMIC-003 — Course rigor must be interpreted relative to opportunity
availability, never a generic norm.**
5 AP courses at a school offering 6 is a different signal from 5 at a school offering 25.
A MEB student's elective choices only mean something read against what their specific
school offered. US weighted-GPA gaps are only meaningful relative to that school's own
weighting policy. This requires school-catalog context ORYN's current schema doesn't yet
carry — a genuine external-data need surfaced by this research, not something to fabricate
in its absence.

**RULE-ACADEMIC-004 — External exam results and internally-assigned course grades are
separate evidence, never substitutes for one another.**
Directly confirmed, independently, for AP (course grade is school-controlled; exam score
is College-Board-controlled, and College Board's own documentation states neither implies
the other), for MEB (dönem/yılsonu puanı vs. LGS/YKS, run by different bodies), and for
Cambridge (coursework vs. externally-set/marked exam results, with an optional PUM).

**RULE-ACADEMIC-005 — Predicted and final grades are separate states, and the concept
itself doesn't apply everywhere.**
IB and Cambridge International AS & A Level have a real, formal, sourced predicted-grade
mechanism (school-issued, university-facing). MEB, AP, the French Bac, German Abitur, and
the US diploma system do **not** have an equivalent formal concept domestically — treat
"no predicted grade on file" as expected/not-applicable for those systems, not as missing
data, and never treat a predicted grade (where the concept does apply) as equivalent to a
final result.

**RULE-ACADEMIC-006 — Curriculum ≠ course ≠ qualification ≠ exam. Keep them as separate
concepts, never flattened.**
Concretely confirmed by this research: AP is *never* a whole-school curriculum (always a
course-level enrichment on a real base curriculum — a genuine schema modeling risk found
in ORYN's own `education_records.curriculum` enum, see the AP doc's section J); an IB
student can hold subject grades without ever pursuing the full Diploma; a Cambridge
AS-Level result is not equivalent evidence to a full A-Level result in the same subject;
IGCSE and A Level are related but administratively distinct stages, never one "Cambridge
score."

**RULE-ACADEMIC-007 — A credential proving one thing must never be read as proving
something broader.**
The clearest, highest-stakes case found: **DSD certifies German-language proficiency
only** — issued by a different authority (ZfA/Auswärtiges Amt) than the one that issues
the Abitur — and most DSD holders worldwide never earn a German Abitur at all. A student's
record showing "DSD II" alone means language readiness only; "DSD II + Abitur" or "DSD II
+ DIA" or "GIB Diploma" are materially different, stronger outcomes and must never be
treated as interchangeable with DSD alone.

**RULE-ACADEMIC-008 — Never assume a school offers a program based on reputation; check
the actual per-school record.**
MEB's own 106-page regulation contains zero mentions of AP/IB/A-Level/Cambridge — they
are always privately-arranged, school-specific add-ons. A "Deutsche Schule" name doesn't
mean a student's own credential is a full Abitur (could be DSD-only). Whether a school
offers Cambridge IGCSE, AP, IB, or nothing at all is a fact to retrieve from ORYN's own
school registry, never an inference from a school's name, network, or general reputation.

**RULE-ACADEMIC-009 — Distinguish "genuinely does not apply here" from "unknown/not yet
collected."**
Several systems honestly have no analog for a concept (no predicted grade in MEB/French
Bac/German Abitur/US; no class rank as a system feature in IB/AP/Cambridge/Germany) — this
is a confirmed absence, not a data gap. Conflating the two risks either fabricating a
value that shouldn't exist, or flagging a legitimate non-applicability as an incomplete
profile.

## Full source list

Every claim above traces to a specific `source_url` with a `source_type` and confidence
note — see each system's own document for its complete source list, and
`data/research/academic-systems/secondary-systems-v1.json` for the fully structured
version machine-consumable per claim.
