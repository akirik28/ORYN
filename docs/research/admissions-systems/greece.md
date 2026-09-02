# Greece — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, fourth entry in
the same single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md)
and [`portugal.md`](./portugal.md) — same scope discipline: one research session, official
sources plus corroborating institutional pages, unresolved questions listed rather than guessed,
not folded into the README's 15-country cross-country matrix.

**Trigger:** continuation of the founder-requested corridor expansion. Like the previous three,
Greece was picked because ORYN's database already holds institutions there with zero admissions
depth (`shape: "unknown"` in every outlook computation until this entry lands).

## A. Admissions architecture

**Fully centralized for both tracks, run by the Greek Ministry of Education through the National
Exams Organization (an independent authority) — but the domestic and foreign-national tracks use
genuinely different inputs, not the same formula.** There is no per-university admissions
decision in the US/UK sense anywhere in this system: the Ministry sets the mechanism, the
national exam or grade criterion produces a score, and a **computerized preference-form**
("μηχανογραφικό") matches candidates to faculties centrally.

## B. Domestic/resident track — the Panhellenic exams (Πανελλαδικές εξετάσεις)

**Primary-sourced directly from the National Exams Organization's own official English summary
PDF** (`eoe.minedu.gov.gr`, an independent authority under the Hellenic Republic Ministry of
Education). The mechanism is precisely quantified, not approximated:

1. Students sit exams in **four subjects** determined by their chosen orientation group
   (Humanities; Natural Sciences and Health; Business and Information Technology) — set by
   Ministerial Decision Φ.251/25089/Α5/20.02.2020. Some faculties (e.g. Architecture, Music,
   Foreign Languages/Translation, Communication and Media, Tourism Studies) additionally require
   one or two "particular subjects."
2. Each faculty publishes its own **weighting factor** per subject. The general score formula is:
   (grade per subject, 0–20 scale, × that faculty's weighting factor), summed across the four
   orientation-group subjects (plus any particular subjects), **× 1000** — producing a final
   score on a 0–20,000 scale (0–26,000 for faculties with particular subjects).
3. Each faculty separately publishes a **minimum admission grade** each year (not fixed, not
   simply 10/20 — it floats with that cycle's candidate pool and each faculty's own coefficient).
   Clearing it is a *first-stage eligibility gate* only — "it just allows the candidate to select
   the faculty; it does not secure access to the respective faculty."
4. Final placement: candidates who cleared the relevant threshold(s) list faculties in
   preference order on the computerized form; **"the final selection of candidates is based on
   the prioritization of their preferences by descending order of score."**

No essay, interview, reference letter, or activities record plays any role. The exam itself
includes written-response components in some subjects, but these are graded as part of the
academic exam score, not a separate application essay in the Parcoursup/UCAS sense — a
distinction this package's other docs are careful to keep (see, e.g., the France entry already
in this registry).

## C. Foreign-national / "allogeneis" track — same infrastructure, a different input, no exam

Confirmed via an official Greek public-university page (Technical University of Crete): non-EU
and other foreign-national candidates are admitted **without sitting the Panhellenic exams at
all** — "the selection process is conducted without entrance examinations; the criterion is the
general access grade for graduates of Cypriot secondary schools, or the graduation grade for
candidates from other foreign educational systems." Placement into a specific department still
runs through the same **computerized preference-form** infrastructure used domestically. A
reserved-seat quota for this population was referenced in secondary sources (commonly cited
around 5% of a faculty's places, "over and above" the ordinary intake) but the exact current
percentage was not independently confirmed against a primary Ministry source this pass — treated
as directionally correct, not asserted as a precise current figure.

Recorded in the registry as the same shape as the domestic track (`academic_rank_competitive`),
by analogy to the confirmed domestic architecture (a quota of finite seats plus the same
computerized-placement mechanism strongly implies rank order within the quota once it is
oversubscribed) — **not** independently confirmed to the same "descending order of score"
explicitness the domestic PDF states outright. See "Unresolved questions."

A separate, real requirement layered on top of admission itself: successful foreign-national
candidates must demonstrate **Greek language proficiency at CEFR B2** to actually enroll — a
candidate admitted without it "may obtain it and enroll in the following academic year;
otherwise, they permanently lose their right to enroll." This is an enrollment-conditionality
fact, not an admissions-selection fact — kept separate in the mechanism text below the same way
this package's other docs separate language proof from academic-qualification eligibility
(RULE-ADMISSIONS-009).

## Standardized tests

The Panhellenic exams *are* the domestic mechanism, not a supplementary test layered on top of
something else. No SAT/ACT-style role was found for either track in sources reviewed this pass.

## Language requirements

Greek B2 proficiency is required for foreign-national candidates to enroll (not to be admitted —
see section C). No language requirement applies to the domestic Panhellenic track beyond
ordinary Greek secondary schooling.

## Essays / recommendations / extracurriculars

No confirmed requirement in either track. The domestic mechanism is exam-formula-and-preference-
list only; the foreign-national track is grade-and-preference-list only. Neither source reviewed
this pass describes an essay, reference, or activities-record step anywhere in Greek
undergraduate admission.

## Safe inferences

Greek undergraduate admission is centrally run by the Ministry of Education/National Exams
Organization for both populations, with no per-university holistic decision layer anywhere —
structurally closer to Turkey's ÖSYM/YKS model (already in this registry) than to any
holistic-review system in this package. The domestic mechanism is precisely quantified from a
primary Ministry source: a weighted four-subject exam score, a per-faculty floating minimum
threshold, and descending-score preference matching. The foreign-national track shares the same
computerized-placement infrastructure but a materially simpler input (a secondary-school grade,
no exam at all) and a separate enrollment-stage Greek-language requirement.

## Unsafe inferences

Do not assume the foreign-national track's selection-within-quota mechanism is confirmed to be
strict descending-score rank order the way the domestic mechanism explicitly is — this pass
inferred it by analogy to the shared computerized-placement infrastructure and the existence of a
finite quota, not from an explicit Ministry statement equivalent to the domestic PDF's own
wording. Do not assert a specific current quota percentage as confirmed — the commonly-cited ~5%
figure was not independently verified against a primary source this pass. Do not confuse the
in-exam essay-format questions within specific Panhellenic subjects with a US/UK-style
application essay — they are graded as academic exam content feeding the weighted score, not a
separate qualitative-review input.

## Counselor actions

For a Greece-resident/Greek-curriculum student, explain the weighted four-subject formula and
the floating per-faculty minimum grade plainly — there is no essay or activities component to
advise on, only exam subject choice and faculty preference-ranking strategy. For a Turkish or
other foreign-educated applicant, explain that they bypass the Panhellenic exams entirely and
are evaluated on their existing secondary-school graduation grade instead, but must separately
plan for the Greek B2 language requirement before enrollment can be finalized — a real deadline
risk distinct from the admission decision itself. Do not promise a specific quota percentage or a
precise selection mechanism within that quota without checking the current Ministry/EOE
publication for the applicant's specific cycle.

## Sources

- National Exams Organization (Εθνικός Οργανισμός Εξετάσεων), Hellenic Republic Ministry of
  Education — official English-language summary PDF, "Admission to Higher Education Institutions
  in Greece" (stand February 2023): `https://eoe.minedu.gov.gr/images/ADMISSION_TO_HIGHER_EDUCATION_IN_GREECE_SUMMARY_2.pdf`
  — retrieved 2026-09-03. Primary source for the entire domestic-track mechanism and formula in
  section B.
- Technical University of Crete, "Admission of international students to Greek Universities" —
  `https://www.tuc.gr/en/studies/admission-of-international-students-to-greek-universities` —
  retrieved 2026-09-03. Official public-university source for the foreign-national/allogeneis
  track in section C.
- Secondary corroboration only (quota percentage, general orientation): general web search
  summarizing Ministry guidance — not independently primary-verified this pass, flagged as
  directional rather than confirmed.

## Unresolved questions

The exact current foreign-national/allogeneis quota percentage, confirmed against a primary
Ministry source rather than secondary summaries. Whether the foreign-national quota is filled by
strict descending-grade rank order or some other allocation rule once oversubscribed — inferred
by analogy to the domestic mechanism's confirmed rank order, not independently confirmed for this
specific track. Whether any restricted/high-demand faculty (Medicine, for instance) layers
additional criteria — an interview, a portfolio — on top of either track; no source reviewed this
pass mentioned one, which is not the same as confirming none exists. Current-cycle application
deadlines and the exact document list required from a Turkish MEB diploma holder specifically.
