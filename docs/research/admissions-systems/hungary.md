# Hungary — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, seventh entry in
the same single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md),
[`portugal.md`](./portugal.md), [`greece.md`](./greece.md), [`poland.md`](./poland.md) and
[`denmark.md`](./denmark.md) — same scope discipline: one research session, official/
institutional sources, unresolved questions listed rather than guessed, not folded into the
README's 15-country cross-country matrix.

**Trigger:** continuation of the founder-requested corridor expansion. Like the previous six,
Hungary was picked because ORYN's database already holds institutions there with zero admissions
depth (`shape: "unknown"` in every outlook computation until this entry lands).

## A. Admissions architecture — a real funding-status split, not a residence-only one

Hungary bifurcates by **funding/eligibility status**, which maps onto ORYN's residence-based
pathway model imperfectly but usably: a **state-financed route**, open to Hungarian citizens and
to other-nationality applicants who hold an officially registered Hungarian residence, runs
through **Felvi.hu** (E-admission), a single centralized national point-based system. Everyone
else — the realistic case for a non-resident international applicant — competes only for
**self-funded** places, evaluated **directly by each institution**, outside Felvi.hu's
centralized mechanism. This registry entry maps the Felvi.hu/state-financed route onto the
domestic pathway and the self-funded/direct-to-institution route onto the international pathway,
consistent with how residence (not citizenship) already drives every pathway split in this
package.

## B. Felvi.hu (domestic/state-financed track) — a quantified, floating-cutoff rank system

Confirmed via multiple sources, with the floating-cutoff mechanism independently verified: total
score is out of 500 points — up to 400 from secondary-school grades and school-leaving exam
results (the two exam subjects the target programme designates), plus up to 100
**institution-set** points. Candidates rank their institution/programme choices in order and are
"admitted to the first one for which their score is sufficient." Crucially, the minimum score
requirement is **not a fixed bar set in advance** — one source describing the mechanism directly
states point boundaries are computed by "an informatics algorithm" weighing "the free places...
the number of people who applied... and their points," concluding "the more applicants with good
points, the higher the boundary" — the same floating, capacity-driven-cutoff pattern already
confirmed for Portugal, Greece and Poland in this expansion line, not a simple threshold-clear.
No essay, interview, or reference letter appears anywhere in this specific mechanism.

## C. Self-funded / international track — decentralized, but consistently holistic

**Confirmed from an official Hungarian government source, not only study-abroad guides.**
`studyinhungary.hu` is run by the Tempus Public Foundation, Hungary's national agency for
international education cooperation. Its own admission-requirements page states plainly that
"the entry requirements may differ at certain higher education institutions" — genuinely
decentralized, similar in kind to Norway's and Portugal's international tracks already in this
registry. Unlike those two, however, this pass found a **consistently confirmed holistic
pattern** across the general population, not an unresolved mechanism: the same official page
lists, as generally required documents, a CV, **a letter of motivation**, and **two academic
reference letters**, alongside GPA/transcript evaluation — "applicants' previous studies and the
[GPA], also experience in work and research might be required by some institutions." Some
courses additionally require an entrance exam on top of these documents. This registry entry
therefore records the international pathway as `holistic_review`, on the same basis New Zealand
and Poland's entries already use for a decentralized-but-convergent pattern — the *presence* of
non-academic review is confirmed generally, even though exact requirements vary by institution
and programme.

## Standardized tests

No role for the Felvi.hu domestic mechanism beyond the school-leaving exam results already
folded into the 400/500-point formula. For the international track, entrance exams are
programme-specific rather than a general national requirement — confirmed to exist for Medicine/
Dentistry/Pharmacy programmes specifically (typically biology and chemistry, described as highly
competitive) via secondary sources, not independently primary-verified against a specific
university's own page this pass.

## Language requirements

For English-taught programmes, secondary sources commonly cite TOEFL 60 / IELTS 5.0 as minimum
thresholds — not independently verified against studyinhungary.hu or a specific institution's own
page this pass, so treated as directional rather than confirmed.

## Essays / recommendations / extracurriculars

Absent from the domestic Felvi.hu mechanism — points-formula-and-ranked-preference only, per
every source reviewed. Present and confirmed (motivation letter, two reference letters) for the
international track via the official Tempus Public Foundation source in section C — the clearest
official-source confirmation of an essay/reference requirement found for any single country in
this expansion line.

## Safe inferences

Hungary's admissions architecture splits by funding/residence eligibility more than by a single
national mechanism: the state-financed route (Felvi.hu) is a quantified, floating-cutoff,
points-based rank system with no non-academic evidence channel, closely resembling Portugal's,
Greece's and Poland's domestic tracks already in this expansion line. The self-funded/
international route is decentralized by institution but consistently holistic in its general
requirements (motivation letter, two reference letters, GPA), confirmed from an official Hungarian
government education-promotion source, not merely secondary guides.

## Unsafe inferences

Do not assume every Hungarian institution's international-track requirements are identical —
studyinhungary.hu itself says they differ, and only the general pattern (motivation letter, two
references, GPA) is confirmed as consistent, not the specific numeric thresholds or exact document
list at any named institution. Do not assume the 400/500-point domestic formula's minimum score is
fixed or predictable in advance — it is explicitly algorithmic and capacity-driven, recomputed
each cycle. Do not assume a non-resident applicant can access the state-financed Felvi.hu route —
eligibility there is explicitly restricted to citizens and Hungary-registered residents.

## Counselor actions

For a Hungary-resident or Hungarian-citizen student, explain the 400/500-point Felvi.hu formula
and its floating, capacity-driven cutoff plainly — there is no essay or activities component in
this specific mechanism. For a Turkish or other non-resident international applicant, explain
that they are on the self-funded, direct-to-institution track by default, and that a motivation
letter and two academic reference letters are generally expected — treat these as real,
worth-preparing-for components, not a formality, per the official Tempus Public Foundation
guidance. Confirm the specific target institution's own published requirements directly, since
they are confirmed to vary — do not assume one university's document list or entrance-exam policy
applies at another.

## Sources

- studyinhungary.hu (Tempus Public Foundation, Hungary's national agency for international
  education cooperation), "Entry and Admission Requirements" —
  `https://studyinhungary.hu/study-in-hungary/menu/studying-in-hungary/entry-and-admission-requirements.html`
  — retrieved 2026-09-03. Primary/official source for the international track's holistic
  requirements in section C.
- Daily News Hungary, "This is how many points you need to get admitted to Hungarian
  universities" — `https://dailynewshungary.com/this-is-how-many-points-you-need-to-get-admitted-to-hungarian-universities/`
  — retrieved 2026-09-03. Source for the floating, algorithmic cutoff mechanism in section B.
- Secondary corroboration only (the 400/100/500-point formula breakdown, funding-eligibility
  rules, language thresholds): general web search summarizing institutional/study-abroad
  guidance — not independently primary-verified against felvi.hu itself this pass, since a
  direct fetch of felvi.hu's own English pages was not attempted.

## Unresolved questions

felvi.hu's own official English-language description of the points formula and eligibility rules
was not independently primary-fetched this pass — the formula and floating-cutoff mechanism rest
on secondary sources plus one general-news source, not the Hungarian government platform itself.
Numeric language-proficiency thresholds, confirmed against an official source. Whether Medicine/
Dentistry/Pharmacy's entrance-exam requirement is uniform across all programmes offering them or
varies by institution. Current-cycle deadlines. Whether any restricted programme outside
Medicine/Dentistry/Pharmacy layers additional criteria on the domestic Felvi.hu track specifically.
