# Belgium — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, tenth entry in
the same single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md),
[`portugal.md`](./portugal.md), [`greece.md`](./greece.md), [`poland.md`](./poland.md),
[`denmark.md`](./denmark.md), [`hungary.md`](./hungary.md), [`austria.md`](./austria.md) and
[`czechia.md`](./czechia.md) — same scope discipline: one research session, official/
institutional sources, unresolved questions listed rather than guessed, not folded into the
README's 15-country cross-country matrix.

**Trigger:** continuation of the founder-requested corridor expansion, flagged in advance as the
likely-hardest remaining candidate: Belgium's federal structure splits education law between its
Flemish and French-speaking Communities, which — unlike a merely decentralized system — have
genuinely separate legislation, not just separate institutions applying similar rules.

## A. Two Communities, two legal systems — but a real, confirmed convergence underneath

**Belgium is not one country's admissions system; it is two.** Confirmed via multiple sources:
"Belgium's higher education system is not unified across the independent communities (Flemish,
French and German-speaking communities) that have their own competencies, including their own
legislation on education." There is no country-level admissions body of any kind, and no shared
application platform. This registry has no sub-national "region" dimension — a Belgian
university's Community affiliation is a fact of the institution itself (a Dutch-medium university
like KU Leuven or Ghent University is Flemish-Community; a French-medium university like
UCLouvain or ULiège is French-Community), the same kind of fact this registry already uses
`institutionOverrides` for.

**What makes this pass different from Finland's (set aside) or Czechia's (recorded unknown):
both Communities were independently checked and confirmed to converge on the same general
shape.** This is not an assumption carried over from one Community to the other — each was
verified from its own separate source.

## B. Flemish Community — credential-based threshold, with named exam exceptions

Confirmed via Study in Flanders (the Flemish government's own international-student information
service): "for bachelor's studies in Flemish higher education institutions, admission is granted
on the basis of a secondary education diploma that gives access to university studies in the
country where the diploma was awarded," plus an accompanying access declaration. **No essay,
interview, or reference letter** appears anywhere in the general mechanism — this is
`academic_threshold`. Named restricted fields requiring a mandatory entrance exam: medicine,
dentistry, veterinary sciences (Dutch-taught only), and schools of arts. This pass did not
independently confirm whether the exam itself is pass/fail or competitively ranked against a
fixed quota — see "Unresolved questions." Separately, some (non-restricted) programmes offer an
optional, explicitly **non-binding** "positioning test" — "even if you do not pass, you can start
the programme" — a genuinely different, informational-only mechanism, not a gate.

## C. French Community (Wallonia-Brussels Federation) — the same threshold shape, confirmed independently

Confirmed via the University of Liège's own official admissions page (ULiège, a public
French-Community university): a foreign secondary-diploma holder must either obtain a formal
equivalence recognition from the Wallonia-Brussels Federation's equivalence service (before 15
July) **or** pass a general entrance examination if equivalence isn't obtained — "no competitive
ranking or selection process described for non-restricted programmes," and no essay, interview,
or reference letter found anywhere in this mechanism either. This **independently confirms the
same `academic_threshold` shape already found for Flanders** — the two Communities converge on
the same general mechanism type, even though the two Communities' legal texts and procedures are
entirely separate.

Restricted fields differ by name from Flanders': medicine, dentistry, civil engineering
(polytechnique), physiotherapy, and speech therapy require passing an entrance exam or
competition. Medicine and dentistry specifically are governed by a named decree (29 March 2017)
and run as a single, **centralized** competition — "organized for all universities on the same
day and in the same place in Brussels" by ARES (Académie de Recherche et d'Enseignement
Supérieur, the French Community's higher-education umbrella body) — genuinely competitive
("concours"), not a pass/fail threshold. A specific, quantified quota applies to non-resident
candidates in medicine/dentistry: capped at **15%** of admitted candidates per programme, per a
Wallonia-Brussels Federation decree protecting places for resident students.

## D. What this registry entry does and does not claim

Recorded as `academic_threshold` for both domestic and international pathways at the country
level — the confirmed, symmetric general shape found independently in both Communities — with a
`fieldOverride` for medicine recording the exam-based exception, since medicine is confirmed
restricted in both Communities (though the exact exam mechanism and non-resident treatment
differ between them; the override's mechanism text says so rather than picking one Community's
specifics and presenting them as universal). This entry does **not** attempt to represent the
other restricted fields (dentistry, veterinary sciences, arts, civil engineering, physiotherapy,
speech therapy) as separate overrides — several of those field names may not even exist in
ORYN's `ProgramSubjectTaxonomy`, and representing Flanders' and the French Community's genuinely
different restricted-fields lists honestly would need a Community-aware key this registry
doesn't have. Noted explicitly in "Unresolved questions" rather than forced.

## Standardized tests

No general-track role in either Community. Both Communities' entrance exams (where required) are
subject-specific to the restricted field, not a general aptitude test.

## Language requirements

Not independently verified to a specific numeric threshold this pass for either Community.

## Essays / recommendations / extracurriculars

Confirmed absent from the general threshold mechanism in both Communities. Not confirmed absent
from restricted-field exams (medicine/dentistry's exam content specifically was not verified to
rule out an interview component this pass).

## Safe inferences

Belgium has no country-level admissions body, but its two main Communities were independently
confirmed to run the same general shape: credential/diploma-equivalence-based admission with no
ranking, no essay, no interview for non-restricted programmes. Medicine is a confirmed restricted
exception in both, with the French Community's version confirmed as a centralized, genuinely
competitive exam carrying a specific 15% non-resident quota.

## Unsafe inferences

Do not assume Flanders' and the French Community's restricted-fields lists are the same — they
are confirmed to differ (veterinary sciences and arts schools in Flanders; civil engineering,
physiotherapy and speech therapy in the French Community, alongside medicine/dentistry in both).
Do not assume Flanders' medicine/dentistry/veterinary/arts entrance exams share the French
Community's confirmed centralized, rank-competitive structure — this pass did not independently
verify the Flemish exam's rank-vs-threshold mechanism. Do not assume the 15% non-resident quota
applies anywhere outside French-Community medicine/dentistry specifically.

## Counselor actions

For most programmes in either Community, explain that Belgian admission is about diploma
equivalence, not competition — there is no essay or activities component to prepare for the
general track. For a Turkish applicant targeting a French-Community university, flag the 15%
non-resident quota specifically if the target field is medicine or dentistry — a real,
quantified competitiveness factor distinct from the general threshold posture. Always confirm
which Community a specific target university belongs to before advising further, since the two
run genuinely separate legal systems even where this research found their general shape to
converge.

## Sources

- Study in Flanders (Flemish Government international-student service), "Admission
  requirements" — `https://www.studyinflanders.be/practical-information/admission-requirements`
  — retrieved 2026-09-03. Primary source for the Flemish general mechanism and restricted-fields
  list in section B.
- University of Liège (ULiège), "Conditions d'accès au Bachelier — UE (hors Belgique)" —
  `https://www.enseignement.uliege.be/cms/c_9118748/fr/conditions-d-acces-au-bachelier-ue-hors-belgique`
  — retrieved 2026-09-03. Primary source for the French Community general mechanism in section C.
- ARES-related sourcing (the medicine/dentistry centralized competition, the 29 March 2017
  decree, and the 15% non-resident quota) via general web search summarizing decree and
  university-published content — not independently primary-fetched from ARES's own site this
  pass, flagged as medium- rather than primary-confidence.

## Unresolved questions

Whether Flanders' medicine/dentistry/veterinary/arts entrance exams are rank-competitive against
a fixed quota or pass/fail threshold-based — genuinely unresolved. Whether a non-resident quota
comparable to the French Community's 15% cap exists in Flanders. Numeric language-proficiency
thresholds for either Community. Whether the German-speaking Community (Belgium's third, much
smaller Community) runs its own distinct system — not researched this pass at all. Whether any
Belgian restricted field beyond medicine should eventually get its own registry representation,
and how a Community-aware key might need to be added to this module to do that honestly, since
country + field alone cannot distinguish "restricted in Flanders" from "restricted in the French
Community" for the fields that differ between them.
