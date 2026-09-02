# Poland — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset). Added 2026-09-03, fifth entry in
the same single-country expansion line as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md),
[`portugal.md`](./portugal.md) and [`greece.md`](./greece.md) — same scope discipline: one
research session, official/institutional sources, unresolved questions listed rather than
guessed, not folded into the README's 15-country cross-country matrix.

**Trigger:** continuation of the founder-requested corridor expansion. Like the previous four,
Poland was picked because ORYN's database already holds institutions there with zero admissions
depth (`shape: "unknown"` in every outlook computation until this entry lands).

## A. Admissions architecture — decentralized by law, convergent by convention

**Different in kind from the previous four entries.** Poland has no central government body
running admission the way Sweden's UHR, Norway's Samordna Opptak, Portugal's DGES or Greece's
National Exams Organization do — "admission is decided by the specific university, and the
university sets the admission requirements, list of documents, deadlines, fees, and any entrance
exams or interviews" (study.gov.pl, run by NAWA, the Polish National Agency for Academic
Exchange — a government agency, though this specific statement describes a decentralized system
rather than itself deciding anything). Each public university runs its own recruitment through
its own online portal (commonly branded IRK — Internetowa Rejestracja Kandydatów, Internet
Recruitment of Candidates — at multiple universities, though not a single shared national
instance).

Despite the lack of a central body, this pass independently checked two major public
universities — University of Silesia and University of Warsaw — and found the **same
underlying mechanism type** at both, not divergent ones. This registry entry is built on that
convergence, the same way this package's New Zealand entry already commits to a shape for a
decentralized system where the *pattern* (a points-based Rank Score) is consistently confirmed
across independent institutions, distinct from Canada's entry, where two named institutions were
found to genuinely diverge in *shape*, not just wording.

## B. The qualification-points / ranking-list mechanism

Confirmed independently at both universities checked: admission committees convert exam results
into **qualification points**, build a **ranking list** per programme, and admit candidates in
descending order until that programme's fixed place limit is reached. University of Warsaw's own
published criteria state this explicitly: "Admission Committees prepare ranking lists on the
basis of results obtained by candidates, with candidates with the best results being qualified
within the limit of places," and a **minimum-points threshold** exists per programme below which
"candidates... are not taken into account in the qualification procedure" — a first-stage
eligibility gate, structurally similar to Greece's and Portugal's floating per-faculty minimum
grades, layered underneath the same rank-order final placement.

For the domestic (Polish matura) mechanism specifically, University of Silesia's own published
rules give the exact point-conversion formula: 1% on the matura's basic level = 1 qualification
point, 1% on extended level = 1.5 points, 1% on bilingual-level = 2 points — then weighted by
each field of study's own published subject weights. **No essay, interview, or reference letter**
appears in either university's published criteria.

## C. Foreign qualifications — converted onto the same ranking list, plus one narrower gate

**Confirmed as the same mechanism type as domestic, with a genuine additional gate for a specific
population.** University of Silesia's own page states foreign-qualification holders are ranked
on the **same lists** as domestic candidates, via a direct percentage conversion: "the highest
(best) grade of a foreign document is an equivalent of 100% of the Polish Matura and the lowest
positive grade is an equivalent of 30%," then multiplied by the same extended-level subject
weights used for the chosen field of study. This is not a separate holistic or threshold-only
track — it feeds the identical rank-order competition.

A real, separately-sourced additional requirement layers on top for a **narrower population**:
per a general study.gov.pl-corroborated summary, foreign applicants holding a qualification from
a country outside the EU, EFTA, **and OECD** must additionally pass a university-set entrance
exam assessing readiness for the chosen level of study. Since Türkiye is an OECD member, this
narrower gate would **not** apply to a Turkish MEB-diploma applicant on the reading of "EU,
EFTA, or OECD" taken at face value — but this specific interpretation was not independently
confirmed against a primary university or NAWA source this pass, and is flagged as inferred, not
verified, in "Unresolved questions" below.

## Standardized tests

No SAT/ACT/national-aptitude-test role was found in the qualification-points mechanism at either
university checked. The entrance exam referenced in section C for non-EU/EFTA/OECD foreign
qualifications is university-set and assesses subject readiness, not a standardized aptitude
test in the SAT/ACT sense — its content and pass/rank role were not independently confirmed this
pass.

## Language requirements

For English-taught programmes: commonly cited thresholds are IELTS 6.0 or TOEFL iBT 79 (general
web guidance, not independently verified against a specific university's own published page this
pass). Polish-taught programmes require Polish-language proficiency, gated separately per
institution.

## Essays / recommendations / extracurriculars

No confirmed requirement at either university checked, for either domestic or foreign-qualified
candidates — the mechanism is points-and-ranking-list only in every source reviewed this pass.

## Safe inferences

Poland has no central government admissions body, but the qualification-points-and-ranking-list
mechanism is consistently confirmed across the two major public universities independently
checked this pass — a real, convergent pattern, not a guess extrapolated from one institution.
Foreign qualifications compete on the same ranking lists as domestic ones via a direct percentage
conversion, at least at University of Silesia. No essay, interview, or reference letter appears
anywhere in either university's published criteria.

## Unsafe inferences

Do not assume every Polish university follows an identical points-conversion formula or subject
weighting — only two were independently checked this pass, and each university/field of study
sets its own weights within the shared points-and-ranking-list pattern. Do not assume a Turkish
applicant is definitely exempt from the non-EU/EFTA/OECD entrance-exam requirement — the
"Türkiye is OECD, therefore exempt" reading is this document's own inference from a general
summary, not independently confirmed against a primary university or NAWA source. Do not assume
private Polish universities follow the same public-university convention documented here — none
were checked this pass.

## Counselor actions

Explain the qualification-points-and-ranking-list mechanism plainly, and that admission is a
matter of clearing each specific programme's own minimum threshold and then ranking within the
limit of places — there is no essay or activities component to advise on. For a Turkish
MEB-diploma applicant, explain that their diploma converts onto the Polish matura percentage
scale for ranking purposes, but confirm directly with the specific target university/programme
whether an additional entrance exam applies — do not assume OECD membership resolves this without
checking, since that reading was not independently verified this pass.

## Sources

- University of Silesia (Katowice), "What are the point thresholds for particular programmes?" —
  `https://us.edu.pl/kandydat/en/rekrutacja-na-studia-krok-po-kroku/progi-punktowe-liczba-kandydatow-na-1-miejsce/`
  — retrieved 2026-09-03. Primary source for the qualification-points conversion formula and the
  foreign-qualification ranking mechanism in sections B–C.
- University of Warsaw, admission/qualification criteria pages (`rekrutacja.uw.edu.pl`,
  `en.uw.edu.pl`) — retrieved 2026-09-03. Corroborates the ranking-list/threshold mechanism
  independently of University of Silesia.
- study.gov.pl (run by NAWA, the Polish National Agency for Academic Exchange) — "Admission
  requirements" — retrieved 2026-09-03. Source for the decentralized-by-design framing and the
  non-EU/EFTA/OECD entrance-exam requirement in section C.

## Unresolved questions

Whether the "non-EU, non-EFTA, non-OECD" entrance-exam requirement is precisely stated (this
document's OECD-membership reading for Türkiye is an inference, not independently confirmed).
The exact subject-weighting tables at either university checked, beyond the general conversion
formula. Whether private Polish universities follow the same convention as the two public
universities checked. Current-cycle deadlines and numeric language-proficiency thresholds.
Whether any restricted/high-demand field (Medicine, for instance) layers an additional mechanism
— an interview, a separate national exam — on top of the standard points-and-ranking-list model;
no source reviewed this pass mentioned one, which is not confirmation none exists.
