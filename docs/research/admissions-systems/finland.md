# Finland — undergraduate admissions system (research only, no registry entry)

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset), and part of the same expansion line
as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md), [`portugal.md`](./portugal.md),
[`greece.md`](./greece.md), [`poland.md`](./poland.md), [`denmark.md`](./denmark.md),
[`hungary.md`](./hungary.md), [`austria.md`](./austria.md), [`czechia.md`](./czechia.md) and
[`belgium.md`](./belgium.md) — same source standard, **but this one deliberately does not ship a
registry entry.** Two research passes (2026-09-03), the second with the accumulated precedent
from the ten countries above, both concluded the same way: Finland's real mechanism divides along
a line ORYN's `system-shape.ts` registry has no key for, and forcing it into the existing
`(country, pathway, institution, field)` key would misrepresent it. See
[`subdivision-key-proposal.md`](./subdivision-key-proposal.md) for the architecture gap this
finding shares with Belgium's.

**Trigger:** continuation of the founder-requested corridor expansion. Finland has 9 institutions
in ORYN's database with zero admissions depth, same as every other country in this line — the
reason it's still worth documenting even without a registry entry.

## A. Why this doesn't resolve to the registry's existing shape — a genuine sector split

Finland has two parallel higher-education sectors with their own governance and, confirmed this
pass, their own different treatment of foreign qualification holders: **yliopistot**
(universities) and **ammattikorkeakoulut** (universities of applied sciences, UAS/AMK).
`AdmissionSystemQuery` has no field for "which sector," and `targetUniversityName` alone doesn't
reliably signal it without a name-classification list this registry doesn't maintain. This is the
same *kind* of gap already found for Belgium (a sub-country division with its own admissions
rules) but along a different axis — institution type, not geography/language community.

**Checked live (`oryn-qa-scratch`) whether an existing column already distinguishes this:**
`universities.institution_type` does not — its populated values for Finland and Belgium alike
are ownership/legal-status labels ("Public," "Private not for Profit," generic "university"), not
sector or community. `universities.application_system` is `null` for every Finnish and Belgian
row. Neither column solves this today; a subdivision key would need new classification data, not
just new code — see [`subdivision-key-proposal.md`](./subdivision-key-proposal.md) for the cost
this implies.

**One practical note for right now, independent of the architecture question:** all 9 of ORYN's
current Finnish institutions (Aalto, Åbo Akademi, LUT, Tampere, University of Eastern Finland,
Helsinki, Jyväskylä, Oulu, Turku) are, by name, university-sector — none are UAS institutions
(which would carry names like Metropolia, Haaga-Helia, or JAMK, none present in the current
database). This is a name-recognition observation, not a DB-column fact — `institution_type`
does not confirm it. It means the UAS-sector finding in section B, while real and worth keeping,
does not block *today's* 9 institutions specifically; the still-unresolved university-sector
SAT/ACT-track shape (section C) does.

## B. The confirmed divergence: a Turkish applicant is treated differently by sector

This is the concrete, sourced finding worth keeping even without a registry entry — it is
specific, favorable in one direction, and would otherwise exist only as scratch research.

**UAS sector — confirmed via uasinfo.fi (the UAS sector's own official information site):**
certificate-based selection ("**Certificate-based selection**") explicitly names Turkey among the
countries whose qualification-holders are eligible: "applicants who have a qualification that
provides eligibility for higher education studies from the EU/EEA-area, Morocco, Tunisia, Algeria,
Egypt, **Turkey**, Nepal, India, Vietnam, Indonesia and the Philippines and have acceptable grades
can apply in the certificate-based selection." A Turkish MEB Lise Diploması holder targeting a
Finnish UAS gets **grades-only evaluation, no exam**. A parallel entrance exam ("International UAS
Exam," a joint digital exam across Finnish UAS institutions) exists as an alternative/fallback for
applicants who don't clear certificate-based selection or whose qualification isn't listed.

**University sector — confirmed via the University of Helsinki's own bachelor's admissions
page:** the certificate-based group there is explicitly narrower — restricted to "the Finnish
matriculation examination, or IB- or EB-diploma." A Turkish MEB diploma holder does not qualify
for that group and instead falls into the university's "**Others**" group, admitted "based on
SATs or ACTs."

**Same country, same realistic applicant, two structurally different mechanisms** depending on
which of Finland's two institution types they target — and, for this product's stated home
market specifically, the UAS route is unusually favorable (no exam at all) while the university
route requires a US-style standardized test most Turkish MEB-only students wouldn't otherwise
be preparing for.

## C. What is still unresolved even within each sector

Neither sector's picture is complete enough to commit a shape on its own:

- **University sector:** the "Others: SATs or ACTs" group's actual selection mechanism — a
  fixed score threshold, or a competitive rank against other SAT/ACT-track applicants for a
  shared quota — was not confirmed this pass. No essay, interview, or portfolio was found in
  either group's description, but this was not exhaustively checked across enough individual
  programmes to assert as a general finding.
- **UAS sector:** whether certificate-based selection there is threshold (any acceptable grade
  admits) or rank-competitive (best grades among the certificate-based pool, against a fixed
  quota) was not confirmed. Whether the International UAS Exam is threshold or rank-competitive
  was also not confirmed.
- **Both sectors, both research passes:** whether the certificate-based/entrance-exam split is
  something the *applicant chooses* (the way Denmark's Kvote 1/Kvote 2 explicitly is) or is
  determined by which quota a *programme* allocates its seats to (every applicant automatically
  considered for both simultaneously) was never resolved. The first pass's original todistusvalinta
  research described "at least half of new students... selected through the diploma-based
  selection quota, with the rest selected through entrance exams" — quota language, which reads
  more like a programme-level seat split than a Denmark-style applicant choice, but this was not
  independently confirmed against a primary source either time.

## Safe inferences

Finland's two higher-education sectors (universities, UAS) are governed differently enough that a
single country-level admissions mechanism cannot honestly describe both. For the realistic ORYN
population (a Turkish MEB diploma holder with no IB/matriculation-equivalent), the UAS sector
offers a confirmed, no-exam, grades-only pathway; the university sector routes the same applicant
to a SAT/ACT-based group instead. Both facts are sourced from official, sector-specific pages, not
inferred from one generalized to the other.

## Unsafe inferences

Do not assume Finland resolves to `academic_threshold` or `academic_rank_competitive` at the
country level — the confirmed sector divergence makes either claim wrong for roughly half of
Finland's institutions, in one direction or the other, depending on which sector the guess
happens to match. Do not assume the university sector's "Others: SATs or ACTs" group lacks
competition just because no ranking language was found this pass — absence of a finding is not
confirmation of a threshold mechanism. Do not assume the UAS sector's certificate-based selection
is definitely threshold-only; "acceptable grades" was the only qualifier found, and whether that
means a fixed bar or a moving, capacity-driven one (the pattern already confirmed for several
other countries in this line) was not checked.

## Counselor actions

For a Turkish MEB-diploma applicant with no IB, actively distinguish UAS from university targets
before advising further — this is not a minor detail, it changes whether an entrance exam
(SAT/ACT) is required at all. Point specifically to the UAS sector's named-eligible-country
certificate-based route as a real, sourced, favorable option worth knowing about, while being
honest that Oryn hasn't yet confirmed whether that route is competitive or a simple pass bar. Do
not promise a shape or a competitiveness read for either sector without checking the specific
target institution and programme.

## Sources

- uasinfo.fi (the Finnish UAS sector's own official information site), "Certificate-based
  selection" — retrieved via search excerpt 2026-09-03; the exact page URL was not independently
  re-fetched to confirm beyond the search snippet — flagged as medium- rather than
  primary-fetch-confidence, unlike this line's other primary-sourced findings.
- University of Helsinki, bachelor's admissions overview page — `https://www.helsinki.fi/en/admissions-and-education/apply-bachelors-and-masters-programmes`
  — retrieved 2026-09-03 (fetched directly, primary confidence for the Admission Group
  2/matriculation-IB-EB-vs-SATs-ACTs split specifically cited above).
- Opintopolku/Studyinfo (Finland's national education portal, Finnish National Agency for
  Education) and general web search summarizing todistusvalinta mechanics (the quota-language
  "at least half... diploma-based... the rest... entrance exams" finding) — first research pass;
  not independently re-verified against a primary Opintopolku page on the second pass.

## Unresolved questions

Whether the university sector's SAT/ACT-based "Others" group is threshold or rank-competitive.
Whether the UAS sector's certificate-based selection and International UAS Exam are threshold or
rank-competitive. Whether the todistusvalinta/entrance-exam split (in either sector) is
applicant-choice or programme-determined. Whether any essay, interview, or portfolio applies at
specific programmes in either sector — not found generally, not exhaustively ruled out. Numeric
language-proficiency thresholds. Current-cycle deadlines. **The architecture question this
document exists to surface**: whether ORYN's admissions registry should grow a sector/subdivision
key general enough to represent this finding and Belgium's Community finding — see
[`subdivision-key-proposal.md`](./subdivision-key-proposal.md).
