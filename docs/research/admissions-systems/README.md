# Country-level university admissions system intelligence (R3.1)

**Status:** Complete — 6 of 6 destination systems researched. **Consumer:** primarily
Claude B (counselor / eligibility / application-strategy logic), secondarily Claude A
(admissions data normalization / provenance). Short operational summary:
[`docs/handoffs/research-admissions-systems.md`](../../handoffs/research-admissions-systems.md).
Machine-readable version of everything below:
[`data/research/admissions-systems/admissions-systems-v1.json`](../../../data/research/admissions-systems/admissions-systems-v1.json).

## Why this research exists

R2.1 gave ORYN the ability to interpret what a student's academic evidence *means*
(MEB, IB, AP, Cambridge, French Bac, German Abitur, US diploma). The question this
package answers is the next layer up: *given that evidence, how does the destination
country's admissions system actually evaluate and process it?* This is **counselor
decision intelligence**, not another university database — the goal isn't "what GPA gets
into Oxford," it's "what admissions architecture is this student entering, and what
evidence/decisions/deadlines govern it." The product chain is now: *student academic
evidence → interpret native academic system (R2.1) → understand destination-country
admissions system (R3.1) → understand eligibility → understand competitiveness/
preparation gaps without fabricating probability → determine next actions.*

## Countries covered (6, by design — not exhaustive)

| Country | Doc | Central platform | National admissions body |
|---|---|---|---|
| United States | [`united-states.md`](./united-states.md) | None (Common App dominant, not exclusive) | None |
| United Kingdom | [`united-kingdom.md`](./united-kingdom.md) | UCAS Undergraduate | UCAS (platform only — decisions stay with universities) |
| Netherlands | [`netherlands.md`](./netherlands.md) | Studielink (registration only) | Nuffic (recognition baseline only) |
| Italy | [`italy.md`](./italy.md) | Universitaly (pre-enrolment/visa only) | MUR / CIMEA (recognition); hochschulstart-style national allocation only for Medicine/Dentistry/Vet Med |
| Germany | [`germany.md`](./germany.md) | hochschulstart.de (4 NC subjects only) + uni-assist (pre-check) | KMK/Anabin (recognition); hochschulstart (NC allocation) |
| Canada | [`canada.md`](./canada.md) | None nationally; OUAC/EducationPlannerBC/ApplyAlberta provincially | None |

Each doc follows the same structure: admissions architecture, qualification eligibility
(with a **dedicated Türkiye-applicant section** in every country), academic evidence use,
predicted grades, conditional/unconditional admission, subject prerequisites, standardized
tests, language requirements, timing, strategy constraints, essays, recommendations,
extracurriculars, interviews/tests/portfolios, restricted programmes, decision model,
safe/unsafe inferences, eligibility/competitiveness/fit, counselor actions, and data-model
implications — every claim scope-labeled **national / platform / university / programme**,
checked against ORYN's actual product principles, not researched in the abstract.

## Source standard applied throughout

Government/national authority → official national admissions platform/credential-
recognition body → official university sources → authoritative exam bodies → secondary
sources for *discovery* only. Every claim in the underlying JSON carries a source array
and, where time-sensitive, an `academic_cycle` + `retrieved_at` pair. Automated fetch was
blocked on several primary sources this session (ucas.com, ouac.on.ca, anabin.kmk.org,
education.gouv.fr among them) — those findings are flagged as secondary-corroborated
rather than presented as verbatim-confirmed; see each country's own confidence notes and
"Unresolved questions."

## Cross-country matrix

| Dimension | US | UK | Netherlands | Italy | Germany | Canada |
|---|---|---|---|---|---|---|
| **Main application architecture** | Decentralized, multi-platform (Common App dominant, not exclusive; separate state systems; some direct-only like MIT) | Single centralized platform (UCAS) for nearly all providers; a few direct-application exceptions | Centralized registration (Studielink) + fully decentralized admission decisions per university/programme | Decentralized — direct to each university; Universitaly is pre-enrolment/visa only | Hybrid: national allocation (hochschulstart) for 4 NC subjects; decentralized direct-to-university for everything else | Decentralized nationally; provincial centralization only in ON/BC/AB; Quebec has a distinct CEGEP-linked path |
| **Central platform** | None mandated; Common App largest but not universal | UCAS Undergraduate (+ separate Conservatoires scheme) | Studielink (registration only, not a decision-maker) | Universitaly (pre-enrolment + visa only, not the admission decision) | hochschulstart.de (4 subjects only) + uni-assist (pre-check, not decision) | OUAC (Ontario)/EducationPlannerBC (BC)/ApplyAlberta (AB) — none national |
| **Direct applications possible** | Yes — required at some (MIT), common as a supplement elsewhere | Yes, but only a small minority of providers (Open University, Buckingham, some conservatoires) | Not as an alternative — Studielink is required, universities layer their own process on top | Yes, and the norm — EU/resident applicants use it exclusively | Yes — the default for non-NC/non-uni-assist programmes | Yes — the default outside ON/BC/AB |
| **Application choice limits** | No national limit; Common App caps one account at 20 (platform policy) | 5 choices max; 4-choice sub-cap for Medicine/Dentistry/Vet Med/Vet Science; no Oxford+Cambridge together | Max 2 numerus fixus/year (1 for Medicine/Dentistry/Dental Hygiene/Physiotherapy/Midwifery); no confirmed cap on open programmes | One live Universitaly pre-enrolment at a time (non-EU abroad only); no cap for EU/resident direct applicants | hochschulstart: up to 12 ranked preferences (NC subjects only); no cap for direct/uni-assist route | No national cap anywhere; platform base fees cover a limited choice count before per-choice fees |
| **Predicted grades role** | Minimal/not structurally used for decisions; contingent-on-non-decline instead | Central and load-bearing — the defining UK mechanic, drives conditional offers via UCAS Track | No native VWO concept; foreign predictions (IB/A-Level) read operationally for early eligibility | Not used — closest analogue is procedural (document-completeness conditionality) | Not used — decisions based on final Abitur/Anabin-equivalent result | Used operationally and explicitly for IB (and by pattern A-Level) applicants specifically; not for domestic provincial-curriculum applicants |
| **Subject prerequisites** | University/programme guidance ("most rigorous available"), not a national rule | Programme-set; STEM/professional courses commonly require specific subjects+grades as "essential" | Real, programme-specific, via VWO "profielen" or a mapped-equivalent subject/level requirement | Enforced mainly through admission-test content, not a documented school-subject checklist | Programme-level, via qualification subject profile (Leistungskurs) + explicit university lists | Common and consequential at programme level (Calculus/Physics/Chemistry with stated minimum grades) |
| **Standardized tests** | University-specific, cycle-specific, fragmented and rapidly changing (2026-27) | Not required nationally; programme-specific tests exist (UCAT/LNAT/TMUA) | Not mandatory nationally; some numerus fixus programmes run bespoke tests | Depends on programme type: TOLC/CEnT-S (orientation or local gate), IMAT (national, English-taught Medicine), semestre filtro exams (national, Italian-taught Medicine et al., replacing the old up-front test from 2025/26) | Not required for Abitur-equivalent applicants; TMS/HAM-Nat used by some universities within NC Medicine's AdH quota | Generally not required; occasional supplementary use for some international applicants |
| **Language proof** | University-set (TOEFL/IELTS/Duolingo); exemptions common but not automatic | University-set (IELTS/TOEFL/Cambridge/PTE/Duolingo), CEFR B2+ benchmark | IELTS/TOEFL/Cambridge for English-taught; separate Dutch NT2/CNaVT/ITNA (B2) for Dutch-taught | Two tracks: Italian (CILS/CELI/PLIDA, B1/B2) vs English (IELTS/TOEFL, + CEnT-S for some STEM/Econ/Pharmacy) | German (DSH/TestDaF/DSD II, ~B2-C1) vs English (IELTS/TOEFL, thresholds vary) — DSD II satisfies language only, never academic recognition | IELTS/TOEFL/PTE/Duolingo + Canada-specific CAEL (180+ institutions, also IRCC-recognized) |
| **Essays / motivation** | Central, structurally mandatory (Common App main essay + per-college supplements) | One single UCAS Personal Statement (2026-entry: 3 structured questions) sent identically to all choices | Not required for open programmes; required for numerus fixus (motivation letter/CV, one of ≥2 legally required qualitative criteria) | Not standard for ordinary admission | Not standard for most direct-entry admission | University-specific — from none (U of T general) to heavily weighted (UBC's mandatory Personal Profile) |
| **Recommendations** | Normally required (1 counselor + 1-2 teacher letters) | One shared school/college reference (not multiple personal letters) | Not a standard requirement — genuine structural difference from US/UK | Not standard | Not standard | Generally not required — closer to UK's lighter pattern |
| **Extracurricular role** | Structured component (Activities List) but secondary to grades/rigor per NACAC's own data | Weighted far less than US; "super-curricular" (subject-adjacent) activity valued over general breadth | Not a factor for open programmes; can enter indirectly via motivation letter for numerus fixus | Not a documented factor — qualification/test-threshold model has no structural place for it | Minimal generally; one real exception is health-related experience within NC Medicine's AdH quota | Genuinely institution-dependent (none at U of T general vs heavy at UBC); depth valued over breadth where considered |
| **Conditional offers** | Different mechanism: contingent on final transcript not showing decline, not on hitting a predicted target | Central defining mechanic — offer conditional on stated final grades, confirmed via Track | Two nested senses: diploma-conditional (nearly universal) and selection-conditional (numerus fixus only) | Narrow procedural sense only (document/test/fee completion), not grade-prediction-based | Narrow, different sense: Studienkolleg-conditional-on-FSP, or pending-final-results, or AdH-pending-Abiturnote | Real and commonly used, especially for IB/A-Level applicants; final results due by a stated summer deadline |
| **Restricted programmes** | No national numerus fixus; patchwork of university-level direct-admit majors + capacity-constrained majors | Medicine/Dentistry/Vet Med/Vet Science capped by actual government-funded training-place limits | Numerus fixus: government/institution-capped; selection method (qualitative/lottery/hybrid) chosen per-programme under a 2023 legal framework | "Numero chiuso" at both national (Medicine/Dentistry/Vet Med) and local/university levels, with different mechanisms at each | National NC (exactly 4 subjects, hochschulstart-coordinated) vs local NC (university-set, uncoordinated, fluctuating) | Common "separate faculty/programme application" model (Engineering, Business, Music, Fine Art each with own average/prerequisites) |
| **Türkiye/MEB direct-entry complexity** | Unknown/unverified from an authoritative Turkey-specific source — genuine research gap | High and university-specific: commonly gated on an approved-school list + scaling grade threshold; AP/IB/A-Level materially simplifies | Moderate-to-high: Nuffic rates a plain diploma only "at least HAVO" (below VWO); direct entry varies sharply by university (Tilburg 85% vs VU 80%+4 APs) | Low-to-moderate: post-2009 diploma meets the 12-year threshold directly, but a passing YKS/YÖS result is separately required | High: standard diploma alone generally insufficient for unrestricted access; typically needs Studienkolleg unless qualifying YKS+Turkish-university-place, IB/A-Level, or a German-curriculum-school Abitur-equivalent (DIA/GIB) | Likely feasible for many programmes but not independently confirmed with numeric thresholds — flagged as unverified, not guessed |
| **Dominant counselor risk** | Over-generalizing one university's policy as a US national standard | Treating a conditional offer as finished admission, or Turkish MEB treatment as generalizing across universities | Treating the system as either fully rules-based or fully US-style-competitive — it's genuinely bifurcated by programme type | Conflating Universitaly's pre-enrolment/visa function with actual admission, or the reformed Italian-taught Medicine mechanism with the still-current English-taught IMAT | Conflating DSD language certification with academic qualification recognition, or assuming any 12-year diploma is Abitur-equivalent | Transferring a UK (OUAC=UCAS) or US (essay-centric) mental model wholesale onto a system where provincial/university variation is the operative reality |

## Recommended ORYN ruleset (evidence-based, research recommendations only)

Not production logic — a distilled set of rules found repeated, in some form, across most
or all 6 countries, each grounded in a specific finding above.

**RULE-ADMISSIONS-001 — Eligibility, competitiveness, and fit are separate states, and
the *relationship between them* is itself country-dependent.**
For the Netherlands' and Italy's non-selective programmes, eligible functionally *equals*
admitted — a genuinely different relationship from the US/UK, where meeting eligibility
only opens a separately competitive process. ORYN must never default to a US-style
competitive-admissions framing everywhere; the correct model varies by country and by
programme type within a country.

**RULE-ADMISSIONS-002 — Country-level rules may be overridden by university and
programme requirements, and in several systems the "national" layer is nearly absent.**
Confirmed for all 6: the UK Tariff vs. native-grade offers, the Netherlands' Nuffic
baseline vs. per-university thresholds (Tilburg 85% vs. VU 80%+APs for the *same* Turkish
diploma), Germany's Anabin baseline vs. Studienkolleg/local-NC, Italy's MUR floor vs.
university equivalency tables, and the US/Canada's near-total absence of a national layer
at all. Never present a university- or programme-specific fact as if it were national.

**RULE-ADMISSIONS-003 — Minimum eligibility must never be represented as a predicted
probability of admission.**
No country researched publishes a percentage-weighted admissions formula. US holistic
review is explicitly non-formulaic per College Board's own definition; UK, Netherlands,
Germany, Italy, and Canada all confirmed no disclosed numeric weighting exists anywhere in
their researched architecture. Any admissions-outlook feature must use qualitative ranges
with explicit uncertainty, never false-precision numbers.

**RULE-ADMISSIONS-004 — Native academic evidence must remain native when evaluating
qualification eligibility.**
No country provides a universal GPA/points conversion. The only legitimate exceptions are
narrow, named, purpose-bound ones — Germany's Bavarian formula (for German-admission
purposes only, producing a VPD), a specific receiving university's own published table
(e.g. a Leeds-style example from R2.1) — cited by name and purpose, with the original
evidence always retained alongside.

**RULE-ADMISSIONS-005 — Missing evidence and a failed/negative finding are different
states.**
The Turkey-to-US and Turkey-to-Canada sections of this research are honest examples: no
authoritative source was found, so the finding is recorded as "unknown, genuine gap,"
never silently treated as "therefore ineligible" or backfilled with confident inference.

**RULE-ADMISSIONS-006 — Predicted and final grades must remain distinct, and whether a
country uses predicted grades at all is not universal.**
The UK's entire admissions mechanic runs on them; Canada uses them operationally but only
for IB/A-Level-track applicants specifically; the Netherlands has no native concept but
reads foreign predictions operationally; the US, Germany, and Italy do not use them for
admission decisions at all. Treat "not applicable" and "not yet provided" as different
findings per country.

**RULE-ADMISSIONS-007 — Application deadlines must carry an academic cycle, and a single
country frequently has more than one deadline architecture.**
Confirmed everywhere: the UK's two-tier Oct/Jan split, the Netherlands' 15 Jan (numerus
fixus) vs. 1 May (open) split, Germany's 31 May (NC) vs. 15 July (general) split, Italy's
university-by-university general timing vs. nationally-fixed semestre filtro/IMAT dates,
Canada's Ontario-firm vs. Western/Atlantic-rolling split. Never present one deadline as
if it covers a whole country.

**RULE-ADMISSIONS-008 — Extracurricular importance is admissions-system dependent, and
can vary *within* one country by institution.**
The starkest evidence: within Canada alone, U of T's general Arts & Science admission
does not consider extracurriculars at all, while UBC's mandatory Personal Profile weighs
them heavily — the same finding that NACAC's own US data already complicates ("US cares
about extracurriculars" is directionally true but ranks well below grades/rigor). Never
apply one country-level extracurricular-weight assumption uniformly.

**RULE-ADMISSIONS-009 — Language requirements and academic-qualification eligibility are
separate facts, never merge them.**
Germany's DSD case is the sharpest, highest-stakes example (DSD II satisfies language
readiness for direct enrollment but never resolves whether the underlying diploma is
Anabin-recognized) — but the same separation holds generally: Italy's language track vs.
its 12-year schooling threshold, the Netherlands' IELTS/TOEFL requirement vs. VWO-
equivalence.

**RULE-ADMISSIONS-010 — Programme-specific selection layers override generic country
guidance, and this recurred in every single country researched.**
UK Medicine/Oxbridge, Germany's national-vs-local NC, Italy's national-vs-local numero
chiuso, the Netherlands' numerus fixus, the US's direct-admit majors and capacity-
constrained programmes, Canada's separate-faculty-application model — a country-level
admissions description is never sufficient on its own for a student targeting a
restricted or selective programme.

**RULE-ADMISSIONS-011 — A destination country's own admissions test and an origin
country's national exam are different fact types; never merge or substitute one for the
other.**
Italy's requirement that a Turkish applicant separately hold a passing YKS/YÖS result (as
completeness-proof of the *origin* qualification) alongside whatever Italian test the
target programme requires (TOLC/CEnT-S/IMAT/semestre filtro exams) is the clearest
illustration — these measure genuinely different things for different purposes.

**RULE-ADMISSIONS-012 — The existence of a national platform does not imply a national
body decides admission.**
Studielink, Universitaly, and (for the vast majority of its function) UCAS are all
registration/logistics/pipe layers — the actual decision sits with the university or
programme. Conversely, some national layers genuinely *do* decide (hochschulstart's NC
allocation, the UK's government-set Medicine/Dentistry capacity limits, Italy's semestre
filtro/IMAT). ORYN must check which kind of "national" a given fact actually is before
treating platform existence as evidence of centralized decision-making.

## Full source list

Every claim above traces to a specific `source_url` with a `source_type`, scope label,
and confidence note — see each country's own document for its complete source list, and
`data/research/admissions-systems/admissions-systems-v1.json` for the fully structured,
machine-consumable version per claim.
