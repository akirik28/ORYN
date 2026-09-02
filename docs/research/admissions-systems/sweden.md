# Sweden — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package (see
[`README.md`](./README.md) for the cross-country matrix, source standard, and ruleset). Added
as a single-country expansion pass, 2026-09-03 — narrower in scope than the original 15-country
package: a targeted research session (WebSearch/WebFetch against the official platforms below,
no automated-fetch-blocked sources), not the multi-source primary-fetch depth the original
package's docs reflect. Where a finding below is thinner than its counterpart in, say,
`singapore.md` or `ireland.md`, that reflects the actual research depth of this session, not an
attempt to compress an equivalent effort — see "Unresolved questions" for what this pass did not
establish.

**Trigger:** founder-requested country/institution expansion for the corridor (US/UK/Europe/
Turkey). Sweden was selected as the candidate for this pass because it already has 8 institution
rows in ORYN's database with zero admissions depth behind them (`shape: "unknown"` in
`lib/admissions/system-shape.ts` until this entry lands) — adding registry coverage closes an
existing disclosure gap without adding any new, unverified institution/program/statistics data.

## A. Admissions architecture

**Centralized, but split across two portals by applicant type**, not one shared front door.
Domestic and other EU/EEA-eligible applicants apply through **antagning.se**, the Swedish
Council for Higher Education's (UHR — Universitets- och högskolerådet, a government agency)
national application and matching service, which every Swedish university and university
college participates in. Applicants requiring a visa or otherwise outside that population apply
through the parallel **universityadmissions.se** portal, run by the same agency (UHR), feeding
the same underlying selection mechanism. UHR's own public information site is **studera.nu** —
confirmed as an official government resource, not a third-party aggregator.

There is no per-university independent decision layer comparable to the US/UK/Singapore
model: UHR's national system computes eligibility and the merit-based ranking, and allocates
places directly. This makes Sweden's architecture closer in shape to Turkey's ÖSYM or Spain's
regional Distrito Único than to UCAS (which routes applications but leaves the decision to each
provider) — the ranking computation itself, not just registration, is centralized.

## B. Selection mechanism — meritvärde (merit rating)

**Rank-order, not holistic, and not a pass/fail threshold.** Places are allocated by
**meritvärde** — a numeric merit rating — in strict descending order until each program's fixed
place count is exhausted. Three separate **selection groups**, each scored on its own scale, are
combined into one ranked pool per program:

- **BI** — grade-based, direct entry (secondary-school grades only).
- **BII** — grade-based, "supplemented" (grades plus documented supplementary
  courses/activities that raise the merit rating under published rules — this is a scoring
  input, not a qualitative review; it does not admit an essay, reference, or interview).
- **BF** — grades assessed via **folkhögskola** (Swedish folk high school) study, a distinct
  national adult/bridging-education track with its own assessment path onto the same merit
  scale.

A fourth, test-based group, **HP**, runs in parallel using the **Högskoleprovet**
(the national university aptitude test) instead of grades. UHR's own published guidance states
this group fills **at least one third of all places** on a program — a structurally significant,
not marginal, share of admission, and confirmation that a grade shortfall is not necessarily
disqualifying if a strong Högskoleprovet score is available.

## C. Alternativt Urval (Alternative Selection) — a real, deliberately unresolved exception

UHR's own documentation names a further mechanism, **Alternativt Urval** ("Alternative
Selection"): some programs, at some institutions, use additional or different selection
criteria beyond the standard BI/BII/BF/HP groups. UHR's own page is explicit that this is
**not nationally standardized** — "sometimes selection groups exist only at one institution or
program... you can usually find what applies on the institution's website." This is a genuine,
sourced fact, not a guess, but it does **not** amount to a documented holistic-review channel:
no institution-level detail on which programs use it, or what they weigh, was found or
independently verified this pass. Consistent with how this registry already treats Canada's
confirmed-but-unresolved institutional variation (`system-shape.ts`'s Canada entry): the general
existence of the exception is disclosed in the mechanism text below; no specific institution or
program is asserted to use it, because none was actually verified.

## D. Domestic vs. international — same mechanism, different pool

The merit-rating **mechanism** (BI/BII/BF/HP, meritvärde, rank order) applies to domestic and
international applicants alike — this is not a pathway split in the sense Ireland's CAO/non-EU
or Turkey's YKS/foreign-national splits are, where the *shape* itself flips. What changes for
international (fee-paying, non-EU/EEA/Switzerland) applicants is the **portal**
(universityadmissions.se, not antagning.se) and, at some universities, a **separate selection
pool** reserved specifically for fee-paying/international seats — a capacity-partitioning
choice some institutions make, which changes who a given applicant is ranked against, not how
the ranking itself is computed. No evidence was found of an international-only holistic or
essay-based channel replacing meritvärde. Both `domestic` and `international` are therefore
recorded in this registry as `academic_rank_competitive`, matching the pattern already used for
Australia, Spain, New Zealand and Switzerland (same shape both sides, differently-worded
mechanism text reflecting the different application channel).

## Applicant educated in Türkiye

**Not independently verified this pass — a genuine gap, not a confirmed-simple finding.** No
Sweden-specific, Turkey-specific source (a named GPA conversion, an accepted-qualification
table, or a stated equivalence to the Turkish Lise Diploması) was found or fetched this session.
What can be said with confidence, by mechanism rather than by country-pair lookup: a
Turkey-educated applicant would be evaluated for eligibility and merit rating the same way any
other foreign qualification is — through UHR's general foreign-qualification recognition
process feeding into universityadmissions.se — but the specific conversion table, minimum
grade-equivalence, or any Högskoleprovet substitution rule for a Turkish diploma holder was not
retrieved. Do not infer a specific GPA threshold or eligibility outcome for a Turkish applicant
from this document; treat it as unresolved until independently checked against UHR's own
current published tables.

## Standardized tests

**Two structurally different roles, not one.** The **Högskoleprovet** is not a supplementary
credential-eligibility bridge (contrast Singapore's five SAT roles, or NUS's SAT-as-bypass) —
it is one of the four parallel national selection groups (HP) computing merit rating in its own
right, filling at least a third of all places. No SAT/ACT role was found in the sources reviewed
this pass, domestic or international.

## Language requirements

Not independently verified to the depth of this package's other entries this pass. Swedish
university programs taught in English (the norm for many international-facing programs) are
understood to require IELTS/TOEFL-equivalent proof for non-exempt applicants, consistent with
UHR's general international-applicant guidance, but no specific band/score thresholds were
retrieved and verified this session — flagged as a gap rather than asserted.

## Essays / recommendations / extracurriculars

**No evidence found of any of the three** in the standard BI/BII/BF/HP merit-rating mechanism —
consistent with the "no channel for non-academic evidence" finding already established for
Turkey, Spain, and Australia's standard pathways in this package. Nothing reviewed this pass
describes an essay field, a reference/recommendation-letter requirement, or a
structured-activities component analogous to NUS's mandatory achievements list. This is the
basis for classifying Sweden as `academic_rank_competitive` rather than `holistic_review`.

## Safe inferences

Swedish undergraduate admission is a centralized, government-run (UHR), rank-order merit system
— not a per-university holistic review and not a simple pass/fail threshold. A grade shortfall
does not necessarily end an applicant's chances, because the Högskoleprovet (HP) selection
group runs in parallel on a genuinely different scale and fills a structurally significant share
of places. Essays, references, and extracurricular activities have no confirmed channel into
the standard decision. The underlying ranking mechanism does not change between domestic and
international applicants, even though the portal and, at some institutions, the competitive
pool does.

## Unsafe inferences

Do not assume Alternativt Urval provides a general holistic-review escape valve — it is
confirmed to exist, confirmed to be non-standardized, and confirmed to require checking each
specific institution's own page; no specific instance of it was verified this pass, so it must
never be presented to a student as something their target program definitely has or definitely
lacks. Do not assume a Turkish diploma's treatment, minimum grade equivalence, or any
Högskoleprovet substitution rule — genuinely unresolved this pass, not researched to the
country-pair depth this package's other 15 entries reach for their own "applicant educated in
Türkiye" sections. Do not assume specific application deadlines, intake dates, or language-test
score thresholds — not independently verified this session and deliberately omitted rather than
guessed.

## Counselor actions

Explain meritvärde and the four parallel selection groups (BI/BII/BF/HP) before discussing any
specific program — a student whose grades alone look uncompetitive may still have a real path
via Högskoleprovet, which a grades-only reading of the system would miss entirely. Do not
promise an essay, activities list, or reference letter will matter for a standard Swedish
program — direct that effort elsewhere unless the family has independently confirmed a specific
program uses Alternativt Urval. For a Turkish-educated applicant specifically, say plainly that
Oryn has not yet verified Sweden's Turkish-diploma conversion rules, and point to
universityadmissions.se's own foreign-qualification pages rather than asserting a threshold.

## Sources

- UHR / studera.nu — official Swedish government (Universitets- och högskolerådet) student
  information site; general admissions-process and selection-group explanations.
  `https://studera.nu` — retrieved 2026-09-03.
- antagning.se — the national application and matching platform for domestic/EU-EEA applicants,
  operated by UHR. `https://antagning.se` — retrieved 2026-09-03.
- universityadmissions.se — the parallel national platform for applicants requiring a visa or
  otherwise outside the antagning.se population, operated by UHR.
  `https://www.universityadmissions.se` — retrieved 2026-09-03.
- UHR's published guidance on selection groups (BI/BII/BF/HP) and on Alternativt Urval,
  accessed via the above domains — retrieved 2026-09-03.

## Unresolved questions

This pass confirmed the national architecture, the four-selection-group merit mechanism, and
the existence (but not the specifics) of Alternativt Urval, from official UHR-operated sources
only. It did **not** establish: Sweden-specific Turkish-diploma conversion/equivalence rules;
current-cycle application deadlines or intake dates; specific language-proficiency score
thresholds; which programs or institutions actually use Alternativt Urval, or what it weighs
where it exists; whether any restricted/high-demand programs (Medicine, for instance) layer an
additional mechanism — comparable to Switzerland's EMS or Ireland's HPAT — on top of the
standard BI/BII/BF/HP groups. Each is a genuine gap for a future pass, not a confirmed-absent
finding; none is guessed at in the registry entry this document supports.
