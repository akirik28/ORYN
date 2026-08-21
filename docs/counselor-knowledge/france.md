# France — counselor knowledge

Evidence base: 19 requirements + 11 deadlines across 5 French institutions (Sciences Po, Sorbonne
Université, Université PSL, Université Paris Cité, Université Paris-Saclay — part of the shared
61-record FR/IT corpus, `data/research/university-requirements/fr_it_{requirements,deadlines}_*.
jsonl`), plus `docs/research/university-requirements/fr-it-requirements-deadlines-summary.md`
(VERIFIED tier), and `docs/research/admissions-systems/france.md` (SYSTEM-LEVEL BACKGROUND tier).

## There is no single French application platform — which one applies depends on the applicant's diploma track and residence

This is the structural fact that must never be assumed away. **Parcoursup** is mandatory for
anyone preparing or holding a French or European Baccalauréat — French nationals, foreign
nationals enrolled in a French lycée anywhere (including AEFE-network schools abroad), and
EU/EEA/Swiss/Monaco/Andorra citizens generally. **Foreign-diploma holders with no French/European
Bac generally do not use Parcoursup for ordinary Licence entry at all** — they file a **DAP
(Demande d'Admission Préalable)** dossier instead, capped at **3 university choices** (a materially
lower ceiling than Parcoursup's 10), through a different route depending on residence: candidates
in one of 72 "Espace Campus France à procédure Études en France" countries file electronically
through that country's Campus France portal; everyone else files a paper DAP directly with the
French embassy/consulate. A small number of elite institutions (Sciences Po's "voie
internationale," École Polytechnique's Bachelor of Science) bypass both Parcoursup and DAP entirely
with their own direct-application portal.

## Applicant educated in Türkiye: the platform itself changes, not just the threshold

**Türkiye is primary-source-confirmed** on the official DAP CERFA form as one of the 72 "Études en
France" countries (Campus France offices in Ankara, Istanbul, İzmir). A Turkish student holding
only a standard MEB Lise Diploması, with no French or European Baccalauréat, resident in Türkiye,
is very likely **not on the Parcoursup track at all** for ordinary Licence entry — the applicable
pathway is the DAP dossier filed via `turquie.campusfrance.org`, capped at 3 choices, each chosen
université's admissions commission deciding independently. This is a structurally different shape
from the Netherlands (one Nuffic baseline, per-university threshold) or the UK (one UCAS platform
for nearly everyone) — for a Turkish applicant to France, **the platform itself changes**, not just
the acceptance bar. A Turkish DAP applicant must also generally pass the **TCF (Test de
Connaissance du Français)**, "tout public" version with a mandatory written-expression component —
Turkey is not on the DAP form's exclusively-French-official-language exemption list, so exemption
requires independent evidence (DELF/DALF B2+, or substantially French-medium prior schooling).

**Two genuine open gaps, not settled facts — flag them as such rather than guessing:** (1) whether
a plain MEB Lise Diploması falls under DAP's "Situation A" (direct access to home-country higher
education, requiring only transcripts) or "Situation B" (requiring a supplementary access
attestation) was not confirmed by a source naming Turkey specifically — reasoning from R2.1's
established finding that Turkish higher-education placement requires the separate YKS exam
suggests Situation B is plausible, but this is inference, not primary-confirmed fact, and should
never be presented to a student as settled. (2) Whether an AP/IB/A-Level qualification layered on
top of a Turkish MEB record materially eases DAP admission the way it clearly does at Dutch
universities was not confirmed either way for France. If a Türkiye-resident student instead
prepares an actual French Baccalauréat or IB Diploma at a French/AEFE-network or IB school in
Türkiye, they follow the ordinary Parcoursup track like any other French/European Bac holder.

## Sciences Po's pass mark is set annually after the fact — there is no number to tell a student they need

Sciences Po's own admissions page states its 4-evaluation score (graded out of 50, one component
worth 2/20 and another 1/10 — REQ-2026-08-21-SPO0003, `VERIFIED_UNDATED`) is assessed against "a
minimum mark defined by Sciences Po each year... after examination of the results and in view of
the quality of applications." This is the same structural shape as a *concours* (rank against that
specific year's applicant field) even though Sciences Po's own process isn't formally labeled one.
**No number exists to record in advance — recording a target score would be inventing one that
doesn't exist.** Two related facts worth knowing: Sciences Po requires **no submitted language-test
score at all** (REQ-2026-08-21-SPO0004, `VERIFIED_CURRENT`) — proficiency is assessed through the
interview and submitted texts instead, so never tell a Sciences Po applicant to submit
TOEFL/IELTS; and candidates who clear the internal mark are invited to an interview as the fourth
and final evaluation (REQ-2026-08-21-SPO0006, `VERIFIED_CURRENT`) — this is a required gate, not
an optional add-on.

Sciences Po's deadlines are almost entirely historical as of this corpus's retrieval date — the
2026-27 cycle had already closed (DL-2026-08-21-SPO0001 through 0005, `VERIFIED_HISTORICAL`), and
the university's own page states the 2027 cycle "will open mid-September 2026"
(DL-2026-08-21-SPO0006, `CURRENT_CYCLE_NOT_PUBLISHED` — a correct, checked answer, not a research
gap). **Do not quote Sciences Po's specific historical dates to a student planning the next
cycle** — point them to the mid-September 2026 opening instead.

## Qualification eligibility for foreign-diploma holders: no Nuffic/Anabin-style national baseline exists

France has no centralized country-level comparability ruling that every university consults, in
contrast to the Netherlands (Nuffic) and Germany (Anabin). Instead, the **DAP form's own
"Situation A/B/C" framework** governs: does the applicant's diploma give *direct* access to higher
education in their own country? If yes (Situation A), only transcripts and the diploma are
required; if no (Situation B), the applicant must additionally supply an "attestation d'accès à
l'enseignement supérieur" from home-country authorities. The admitting université's own admissions
commission then evaluates the dossier against its own published "capacités d'accueil" — a
case-by-case, university-level judgment, not a centralized ruling. **ENIC-NARIC France** does issue
individualized diploma-comparability opinions, but the official DAP CERFA form's own document
checklist does **not** list an ENIC-NARIC attestation as required for first-year Licence admission
— a genuine structural difference from how the Dutch/German equivalents function; do not assume
ENIC-NARIC plays the same gatekeeping role in France.

## SYSTEM-LEVEL BACKGROUND: how the system works generally

- **Parcoursup itself makes no admission decisions for "formations sélectives"** (CPGE, BTS, BUT,
  most Grande École and business/engineering-school "vœux," IFSI, PASS/LAS) — each formation ranks
  candidates using its own confidential "algorithme local" or a selection commission; Parcoursup is
  submission/routing/response only. For ordinary ("non sélective") university Licences, admission
  is closer to a right once eligibility is met — but the 2018 "loi ORE" lets a université rank
  candidates against a Licence mention's published "attendus" whenever demand exceeds capacity
  ("licence en tension"), even though the Licence isn't formally classified sélective.
- No formal numeric predicted-grade concept nationally. The closest structural analogue for
  French-Bac-track applicants is the **livret scolaire** (actual in-progress première/terminale
  grades) plus the qualitative **Fiche Avenir** (professeur-principal appraisal plus the head of
  establishment's opinion on "capacité à réussir") — real evidence read by admissions commissions
  before final Bac results are known, not a forward-looking prediction in the UK sense. No
  equivalent mechanism was identified for DAP-track (foreign-diploma) applicants at all.
- Parcoursup's "oui, si" response is a named, distinct mechanism — admission conditional on
  accepting a mandatory remediation/support pathway, not on final-grade attainment. This is not the
  same concept as a UK conditional offer.
- Essays: Parcoursup's "projet de formation motivé" (a 1,500-character free-text field per vœu) is
  required when the specific formation requests it — described as very frequent for selective
  formations, not confirmed as universally mandatory for every non-selective Licence vœu. The DAP
  dossier has no essay or motivation-letter field in the official CERFA form.
- Recommendations are not a Parcoursup platform mechanism (no submission field exists) and are not
  listed among required DAP documents — broadly absent at the structural Licence level.
- **Dominant counselor risk (per the cross-country matrix)**: assuming Parcoursup is "the" French
  application platform for any student headed to French higher education, when it is specifically
  the French/European-Baccalauréat-track platform. A Turkish MEB-only applicant is generally routed
  through an entirely different mechanism (DAP, capped at 3 choices vs. Parcoursup's 10, with its
  own TCF language gate) that a counselor defaulting to "just register on Parcoursup" would miss
  entirely.
