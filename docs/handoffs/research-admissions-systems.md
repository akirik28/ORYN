# Handoff: Country-level university admissions system intelligence (R3.1)

STATUS:
COMPLETE — 6 of 6 destination systems.

COUNTRIES COMPLETED:
United States, United Kingdom, Netherlands, Italy, Germany, Canada. Full writeups:
`docs/research/admissions-systems/*.md`. Cross-country matrix and evidence-based
ruleset: that directory's `README.md`. Machine-readable:
`data/research/admissions-systems/admissions-systems-v1.json`. Builds directly on R2.1
(`docs/research/secondary-education-systems/`) — every country's qualification-
eligibility section maps back to the MEB/IB/AP/Cambridge/French Bac/German Abitur/US
diploma findings researched there.

PRIMARY SOURCE COVERAGE:
Strongest: **Italy** (a primary MUR decree, DM 941/2026, directly sourced for the
current-cycle Medicine/Dentistry/Vet Med reform) and **Germany's Bundesverfassungsgericht
ruling** (directly fetched for the 2017 constitutional basis of the current NC quota
structure), plus several directly-fetched College Board/AP pages for the US. Good but
partially secondary-corroborated: **UK** (ucas.com blocked automated fetch throughout —
every UCAS-specific fact here traces to multiple independent secondary sources quoting
the same official pages, not a verbatim primary fetch) and **Canada** (ouac.on.ca
returned HTTP 403 throughout). **Netherlands** and **Germany's Anabin** pages were
partially blocked (anabin.kmk.org 404'd on live classification pages; the strongest
direct German-Turkey evidence came from an anabin2.kmk.org news article that itself
predates Turkey's 2018 exam reform — flagged explicitly, not presented as current).

MOST IMPORTANT SYSTEM DIFFERENCES:
- **Predicted grades are not universal.** UK: the defining, load-bearing mechanic.
  Canada: real, but only for IB/A-Level-track applicants specifically. Netherlands: no
  native concept, but foreign predictions are read operationally. US, Germany, Italy: not
  used for admission decisions at all.
- **"National platform" does not imply "national decision-maker."** Studielink,
  Universitaly, and UCAS (beyond its Tariff/deadline mechanics) are registration/logistics
  layers — actual decisions sit with the university/programme. hochschulstart's NC
  allocation, the UK's government-set Medicine capacity limits, and Italy's semestre
  filtro/IMAT are the genuine exceptions where a national body *does* decide.
- **Eligibility can functionally equal admission.** For Netherlands and Italy
  non-selective programmes, meeting the threshold *is* admission — a materially
  different model from the US/UK, where eligibility only opens a separately competitive
  process.
- **Restricted-programme mechanisms are genuinely different from each other, not one
  "numerus clausus" concept**: UK's government-funded capacity cap (Medicine/Dentistry/
  Vet Med) vs. the Netherlands' 2023-law-created three-way choice (qualitative selection/
  lottery/hybrid, chosen per programme) vs. Italy's national-vs-local numero chiuso split
  (and the Italian-taught-Medicine mechanism just changed entirely in 2025/26, replacing
  an up-front test with the "semestre filtro") vs. Germany's national-4-subjects-only vs.
  uncoordinated-local-NC split vs. the US/Canada's patchwork of university-level
  direct-admit majors with no government cap at all.

TÜRKİYE APPLICANT FINDINGS:
- **US**: genuine research gap — no authoritative Turkey-to-US source found. Reasoned
  (not sourced) inference: likely eligible in principle (no national body, case-by-case
  review), competitiveness genuinely uncertain.
- **UK**: university-specific, commonly gated on an approved-school list (MEB e-Okul
  verified) plus a scaling grade-percentage threshold (Sheffield example: ~72–88%
  depending on target grade band); foundation year is the common fallback; AP/IB/A-Level
  materially simplifies the pathway by moving the student onto the standard route.
- **Netherlands**: Nuffic rates a plain diploma only "at least HAVO" (below the VWO bar);
  direct entry varies sharply by university — Tilburg requires an 85% Diploma Puanı,
  VU Amsterdam instead requires 80% GPA + 4 qualifying AP exams or a completed year of
  Turkish Lisans credits. Same input diploma, different outcome by university.
  YKS's specific role in the equivalence determination was not confirmed or ruled out.
- **Italy**: a post-2009 (12-year) diploma meets the schooling-years threshold directly,
  but a passing YKS (nationals) or YÖS (non-nationals) result is a *separately required*
  completeness proof, distinct from whatever Italian test the target programme needs.
- **Germany**: standard diploma alone generally insufficient for unrestricted access —
  typically needs Studienkolleg + Feststellungsprüfung, unless the applicant holds a
  qualifying YKS result + confirmed Turkish university place (restricted Fachhochschule
  access only), an IB Diploma (DAAD-confirmed Studienkolleg exemption), A-Levels, or a
  German-curriculum-school Abitur-equivalent (Deutsche Schule Istanbul's DIA track, or
  the GIB bilingual pathway at ALKEV/İELEV). **DSD (any level) resolves language
  readiness only and never this academic-recognition question** — the single highest-
  stakes distinction in this whole handoff.
- **Canada**: likely feasible for many programmes, but genuinely unconfirmed with
  numeric thresholds this pass (site pagination blocked retrieval of Turkey-specific
  rows) — recorded honestly as an open item, not filled with inference.

HIGH-RISK COUNSELOR ERRORS (ranked by how easily an LLM defaults to the wrong pattern):
1. **Conflating a language credential with academic qualification recognition** —
   Germany's DSD-vs-Abitur case specifically, but the same shape recurs (Italy's language
   track vs. its 12-year threshold; Netherlands' IELTS/TOEFL vs. VWO-equivalence).
2. **Applying one country's admissions mental model to another** — assuming UK-style
   conditional offers apply to the US or Germany; assuming US-style holistic/
   extracurricular-heavy review applies to the Netherlands or Italy; assuming Canada's
   OUAC works like UCAS nationally when only Ontario has anything comparable.
3. **Treating a university- or programme-specific fact as national** — a grade threshold,
   a testing requirement, or a subject prerequisite found at one institution must never be
   generalized to "this country requires X."
4. **Presenting stale reformed information as current** — Italy's Medicine admission
   mechanism changed entirely for a.y. 2025/26; the Netherlands' numerus fixus lottery
   was reintroduced by a 2023 law after being abolished in 2016/17; Germany's Medicine
   quotas were restructured after a 2017 constitutional ruling. Every timing/testing/
   restriction claim needs its `academic_cycle` checked, not assumed evergreen.
5. **Inventing a probability or percentage weighting where none is published** — no
   country in this research discloses a numeric admissions formula.

ELIGIBILITY VS COMPETITIVENESS VS FIT:
The three-way distinction holds across all 6 countries, but the **relationship** between
eligibility and competitiveness is not uniform — this is itself a key finding, not just a
definitional exercise. Netherlands/Italy (non-selective programmes): eligible ≈ admitted,
competitiveness is largely not a meaningful separate concept. US/UK/Canada (most
programmes) and every country's restricted/selective programmes: eligibility is
necessary but clearly not sufficient — a genuinely competitive process follows. Full
per-country detail in each doc's own "Eligibility, competitiveness, fit" section.

PROPOSED COUNSELOR SEMANTICS:
See each country doc's own "Counselor actions" section for the full, country-specific
list. Cross-cutting pattern: for every destination-country recommendation, ORYN's
counselor logic should resolve, in order — (1) which layer a given rule belongs to
(national/platform/university/programme, per RULE-ADMISSIONS-002), (2) whether the
programme is restricted/selective and what mechanism applies (per RULE-ADMISSIONS-010),
(3) whether predicted grades apply in this system and what state the student's evidence
is in (per RULE-ADMISSIONS-006), and (4) whether the student's specific qualification
(from R2.1) has a documented recognition pathway for this destination, distinguishing
"not found" from "found and insufficient."

PROPOSED DATA SEMANTICS:
RULE-ADMISSIONS-001 through 012, fully stated with sourced grounding in
`docs/research/admissions-systems/README.md`. Conceptual entities recurring across
multiple countries' own data-model-implications sections (not a schema proposal —
Claude B decides implementation): **ApplicationPlatform** (distinct from University, since
one platform can span many universities and one university can require several
platforms); **ApplicationRoute** per university; **AdmissionPlan**/**OfferCondition**
distinguishing binding-commitment mechanisms (US ED) from grade-contingent mechanisms (UK
conditional offers) from procedural-completion mechanisms (Italy); **PredictedGradePolicy**
that records "not structurally used" as a first-class value per country rather than
defaulting to null; **RestrictedProgramme** scoped national/local since this distinction
recurred in every single country; **QualificationRecognitionStatus** as a field
independent of the underlying qualification type (Germany's Anabin case: the same MEB
diploma resolves differently depending on companion evidence); **LanguageProficiencyEvidence**
modeled as fully independent from academic-qualification-recognition evidence.

UNRESOLVED QUESTIONS:
Each country doc has its own full list. Highest-priority follow-ups if this becomes
product-critical: (1) direct, current-page verification of UK ENIC's Turkey comparability
statement and Anabin's live Turkey classification page (both blocked this session, only
secondary-corroborated); (2) Turkey-specific numeric thresholds at major Canadian and US
universities (genuine gaps, not filled with inference); (3) whether Italy's semestre
filtro produces one national ranking or per-university rankings; (4) the current national
distribution of Dutch numerus fixus programmes across the three legally available
selection methods post-2023; (5) authoritative (not aggregator-sourced) current-cycle
SAT/ACT policy data for the US, and OUAC's own official 2026-27 deadline/fee data for
Canada — both blocked by automated-fetch restrictions this session.

INTENDED CONSUMER:
Primary: **Claude B** (counselor/eligibility/application-strategy logic) — the
high-risk-counselor-errors and eligibility/competitiveness/fit findings are written
directly for that role. Secondary: **Claude A** (admissions data normalization/
provenance) — relevant when acquiring or verifying per-university admissions facts, since
this research establishes which facts are genuinely national vs. which must be sourced
per-institution.

NEXT ACTION:
1. Claude B reviews the high-risk-counselor-errors list and the eligibility/
   competitiveness/fit country-by-country variation, and decides whether/how to encode
   RULE-ADMISSIONS-001 (the eligibility≈admission finding for NL/Italy non-selective
   programmes) and RULE-ADMISSIONS-009 (the DSD-vs-academic-recognition separation) into
   counselor logic — these are the two findings most likely to produce a materially wrong
   recommendation if left unaddressed.
2. Re-read `docs/current-state.md` and `docs/ORYN_WORKSTREAMS.md` for what's changed
   since this package started, then propose the next highest-leverage research package
   (per this research lane's own operating instructions) rather than automatically
   expanding to more countries.
