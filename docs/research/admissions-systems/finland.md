# Finland — undergraduate admissions system (shipped, via subdivision)

Part of ORYN's R3.1 country-level admissions research package (see [`README.md`](./README.md)
for the cross-country matrix, source standard, and ruleset), and part of the same expansion line
as [`sweden.md`](./sweden.md), [`norway.md`](./norway.md), [`portugal.md`](./portugal.md),
[`greece.md`](./greece.md), [`poland.md`](./poland.md), [`denmark.md`](./denmark.md),
[`hungary.md`](./hungary.md), [`austria.md`](./austria.md), [`czechia.md`](./czechia.md) and
[`belgium.md`](./belgium.md) — same source standard.

**Status update (2026-09-03, third pass):** the first two passes deliberately shipped no
registry entry — Finland's real mechanism divides along a line `system-shape.ts`'s
`(country, pathway, institution, field)` key had no way to represent, and forcing it in would
have misrepresented the country. That gap is now closed: `system-shape.ts` gained a
`subdivisions` mechanism (see [`subdivision-key-proposal.md`](./subdivision-key-proposal.md),
Option B), and this pass both resolved the two shape questions the second pass left open and
used the real 22-institution AMK name list 6e's own research
([`docs/finland-amk-sector-2026-09-03.md`](../../../finland-amk-sector-2026-09-03.md)) verified
live, per-row, against each institution's own site. Finland is the subdivisions mechanism's
first real application — a live registry entry now exists in `system-shape.ts`, with the
university sector as the country-level default and the AMK sector as a named `subdivision`.

## A. Why this doesn't resolve to the registry's plain country shape — a genuine sector split

Finland has two parallel higher-education sectors with their own governance and, confirmed
across all three passes, their own different treatment of foreign qualification holders:
**yliopistot** (universities) and **ammattikorkeakoulut** (universities of applied sciences,
UAS/AMK). This is the same *kind* of gap already found for Belgium (a sub-country division with
its own admissions rules) but along a different axis — institution type, not
geography/language community — which is why it needed the subdivisions mechanism rather than
Belgium's flatter `fieldOverrides` treatment.

**Checked live (`oryn-qa-scratch`), first and second pass, whether an existing column already
distinguishes this:** `universities.institution_type` does not — its populated values for
Finland and Belgium alike are ownership/legal-status labels ("Public," "Private not for Profit,"
generic "university"), not sector or community. `universities.application_system` is `null` for
every Finnish and Belgian row. Neither column solved this — hence a name-based `subdivisions` key
rather than a queryable column, the same tradeoff `subdivision-key-proposal.md` weighed
explicitly before recommending it.

**All 9 of ORYN's original Finnish institutions** (Aalto, Åbo Akademi, LUT, Tampere, University
of Eastern Finland, Helsinki, Jyväskylä, Oulu, Turku) are, by name, university-sector — this is
why the first two passes' research (a Turkish MEB-diploma holder's experience) never touched an
AMK institution directly. 6e's own institution-ingestion pass (2026-09-03) has since staged 22
real AMK institutions (`data/research/sql-dry-runs/universities/finland-amk-2026-09-03.sql`, not
yet applied to the live database as of this writing) — the `matchNames` list in the shipped
`subdivisions` entry uses that real list, not a guessed or partial one. Two AMK-type
institutions 6e's research separately identified — Högskolan på Åland and the Police University
College — are named but deliberately excluded from `matchNames`: both sit outside OKM's own AMK
statistics (per Vipunen, the joint OKM/Opetushallitus statistics portal) and were not
independently re-verified this pass.

## B. The confirmed divergence: a Turkish applicant is treated differently by sector

**University sector, international pathway — confirmed rank-competitive, third pass:** Aalto
University's own admissions page (fetched directly, primary confidence, 2026-09-03) describes
the group applicants without Finnish matriculation/IB/EB fall into (SAT/ACT-evaluated) in
explicit ranking language: "applicants are ranked based on their SAT total scores or converted
ACT scores." Published minimum thresholds exist (e.g. SAT 1350 total / 700 Mathematics for one
Science and Technology study option) but clearing them does not guarantee a place — a genuine,
if unobservable-in-advance, competitive bar, not a pass/fail gate. University of Helsinki's own
admissions page (fetched directly, primary confidence, second pass) independently confirmed the
same separate-group structure exists there too (its "Others" group, evaluated on SATs/ACTs). Two
research universities, independently and directly sourced, agreeing on the same shape — treated
as confirmed for the university sector's international pathway generally, not just for these two
named institutions.

**AMK sector, both pathways — the joint mechanism is confirmed rank-competitive, third pass:**
uasinfo.fi (the AMK sector's own joint admissions site — fetched directly, primary confidence,
2026-09-03, upgrading the first pass's medium-confidence search-excerpt citation) describes
certificate-based selection (todistusvalinta) as a points-scored (up to 198 points), quota-bound
ranking: "a specific study place quota which varies between study programmes," with universities
free to also set their own minimum floor on top. This is confirmed competitive, not threshold —
closing one of the two questions the second pass left open.

**AMK sector, foreign-qualification eligibility — a real, important correction from the second
pass, not a confirmation of it.** The second pass's finding (relayed via search excerpt, flagged
medium-confidence at the time) claimed a Turkish MEB diploma holder is named eligible for
certificate-based selection sector-wide. This pass fetched uasinfo.fi's own certificate-based-
selection and selection-methods pages directly and found **neither names Turkey or any non-EU
country** — the eligible list there is Finnish matriculation, IB/EB/RP/DIA, and Finnish
post-2015 vocational qualifications only. Separately, one specific institution's own page —
Centria University of Applied Sciences, one English-taught bachelor's programme checked — **does**
list a long set of eligible non-EU qualifications including Turkey by name, framed as that
programme's own eligibility rule rather than a citation of a joint sector policy. **This
resolves to an honest `unknown` for the subdivision's international pathway**, not a favorable
claim: the joint system's own pages don't support sector-wide Turkish eligibility, one
institution's own page does support it for at least one programme, and this pass did not check
the other 21 institutions to know which pattern is more common. Recorded as a real, sourced,
narrower finding rather than generalized in either direction — the second pass's broader claim
was a genuine overclaim (single search-excerpt evidence generalized past what it supported), not
a defect in the underlying facts, and this pass's own primary fetches are what caught it.

## C. What is still unresolved

- **University sector, domestic pathway:** neither the first, second, nor third pass researched
  the mechanism for Finnish-matriculation/IB/EB-holding applicants specifically — every pass
  focused on the non-Finnish-qualification applicant, the realistic ORYN population. Recorded
  `unknown` at the country level, honestly, not defaulted to either resolved shape.
- **AMK sector, international pathway, beyond Centria:** whether the other 21 AMKs' own
  eligibility rules more closely resemble uasinfo.fi's narrower joint baseline or Centria's
  broader one was not checked. A future pass could check each institution's own page the same
  way `docs/finland-amk-sector-2026-09-03.md` already did for the institution *identity* data.
- **International UAS Exam** (the fallback for applicants outside certificate-based-selection
  eligibility): whether it is itself rank-competitive or threshold was not established across
  any of the three passes.
- Numeric language-proficiency thresholds. Current-cycle deadlines. Whether any essay,
  interview, or portfolio applies at specific AMK or university programmes — not found
  generally, not exhaustively ruled out.

## Counselor actions

For a Turkish MEB-diploma applicant with no IB, distinguish AMK from university targets before
advising further — the university sector's SAT/ACT track and the AMK sector's certificate-based
track are both now confirmed competitive rather than simple pass bars, but eligibility for the
AMK sector's more favorable no-exam route is institution-dependent, not a safe sector-wide
assumption. Point to a specific target institution's own admissions page before promising a
Turkish qualification qualifies for certificate-based selection there.

## Sources

- Aalto University, bachelor's admissions page (Science and Technology study option) —
  `https://www.aalto.fi/en/study-at-aalto/admission-to-aalto-bachelors-programme-in-science-and-technology-bachelor-and-master-of-science-in`
  — fetched directly 2026-09-03, primary confidence.
- University of Helsinki, bachelor's admissions overview page —
  `https://www.helsinki.fi/en/admissions-and-education/apply-bachelors-and-masters-programmes`
  — fetched directly, second pass (2026-09-03), primary confidence.
- uasinfo.fi, "Certificate-based selection" — `https://www.uasinfo.fi/certificate-based-selection/`
  — fetched directly 2026-09-03, primary confidence (upgraded from the first pass's
  search-excerpt-only citation).
- uasinfo.fi, "Selection methods & study programmes available for application" —
  `https://www.uasinfo.fi/selection-methods-study-programmes-available-for-application/` —
  fetched directly 2026-09-03, primary confidence.
- Centria University of Applied Sciences, BBA International Business programme page —
  `https://net.centria.fi/en/koulutukset/bachelor-of-business-administration-international-business/`
  — fetched directly 2026-09-03, primary confidence for this one programme specifically; not
  confirmed representative of Centria's other programmes or of any other AMK.
- Vipunen (OKM/Opetushallitus joint statistics portal) and 6e's own institution research,
  [`docs/finland-amk-sector-2026-09-03.md`](../../../finland-amk-sector-2026-09-03.md) — source
  of the 22-institution AMK identity list used in the shipped `matchNames`.
- Opintopolku/Studyinfo and general web search summarizing todistusvalinta mechanics — first
  pass; superseded where it overlaps with this pass's direct uasinfo.fi fetches, kept for the
  points-scale figures not re-verified this pass.

## Registry entry

Shipped in `lib/admissions/system-shape.ts`'s `REGISTRY`, keyed `countryNames: ["Finland",
"Suomi"]`, with a `subdivisions: [{ key: "uas", ... }]` entry covering the 22 real AMK names.
See [`subdivision-key-proposal.md`](./subdivision-key-proposal.md) for the architecture this
entry is the first real user of, and `__tests__/admissions/system-shape.test.ts`'s Finland
describe block for the test coverage proving precedence, subdivision-level pathway resolution,
and safe fallthrough for an unclassified institution.
