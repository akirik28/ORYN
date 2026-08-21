# Italy — counselor knowledge

Evidence base: 20 requirements + 11 deadlines across 6 Italian institutions (Politecnico di
Milano, Bocconi, Sapienza, Politecnico di Torino, Bologna, Padua — part of the shared 61-record
FR/IT corpus, `data/research/university-requirements/fr_it_{requirements,deadlines}_*.jsonl`),
plus `docs/research/university-requirements/fr-it-requirements-deadlines-summary.md` (VERIFIED
tier), and `docs/research/admissions-systems/italy.md` (SYSTEM-LEVEL BACKGROUND tier).

## Numerus clausus is a ranking against a quota, not a threshold — a student can meet every stated requirement and still not get a place

Sapienza's own International Student Office page states it plainly: for numerus-clausus
(restricted-access) programmes, "the Universitaly application will only be validated if the
candidate is among the winners in the official ranking" (REQ-2026-08-21-SAP0001,
`VERIFIED_UNDATED`). This is independently confirmed at Politecnico di Torino with the same
three-gate structure: academic admission, visa issuance, and final enrolment are three **separate**
decisions, and none guarantees the next — a granted visa can be actively cancelled if enrolment
ultimately fails (REQ-2026-08-21-PDT0005, REQ-2026-08-21-SAP0002, both `VERIFIED`). **There is no
number in this fact for a threshold check to hold** — a student who clears every published academic
requirement can still be refused simply because the quota filled with higher-ranked candidates that
cycle. Never tell a student that meeting the stated requirements means they will get a place;
distinguish eligibility (meets the bar) from the actual outcome (ranked high enough that cycle).

## OFA: the same CISIA test is a hard admission gate for one programme and a diagnostic for another, at the same university

The obbligo formativo aggiuntivo (OFA, additional educational obligation) mechanism, confirmed
independently at Politecnico di Milano and University of Bologna: "The CISIA tests (TOLC and
CEnT-S) are required to apply to many restricted-access degree programmes and are also used by some
open-access degree programmes to assess basic knowledge and assign any Additional Learning
Requirements" (REQ-2026-08-21-BOL0002, `VERIFIED_UNDATED`). **The same test, same score, means
something structurally different depending on the programme's admission type**: for a
restricted-access programme it is the binding selective ranking criterion — pass or don't get in.
For an open-access programme it is a non-binding diagnostic — a low score doesn't block enrollment,
it triggers a deferred remedial obligation with real downstream consequences ("certain career
limitations" per the source). **Never treat a CISIA score as pass/fail in the abstract — the
verdict depends entirely on which programme type it's attached to**, and the same numeric result
can be a rejection at one programme and a manageable remedial flag at another.

## Whichever language is *not* the programme's medium of instruction can trigger OFA, not block admission

A related, distinct finding: at Politecnico di Milano, English-taught Bachelor's programmes require
proficiency in English before enrollment; Italian-taught programmes require Italian proficiency —
each programme's *non*-instruction language is not itself an admission gate; its absence instead
triggers the OFA remedial path (REQ-2026-08-21-PDM0002/PDM0003, `VERIFIED_CURRENT`). Do not
conflate "doesn't speak the instruction language fluently yet" with "ineligible" — check whether
that specific programme treats it as a hard gate or an OFA trigger.

## The 2025/26 Medicine reform split Italian-taught and English-taught Medicine into two different mechanisms — do not assume both moved together

**Italian-taught Medicine/Dentistry/Vet Med** replaced its old up-front national entrance test with
the **"semestre filtro"** starting academic year 2025/2026: free, open enrollment into the first
semester (secondary diploma is the only requirement, no entrance test), with selection instead
based on three propaedeutic exams (Chemistry & Biochemical Propaedeutics, Physics, Biology; 6 CFU
each) sat *during* that semester. Governing decree for 2026/27: DM 941 of 10 July 2026 (MUR).
**English-taught Medicine and Surgery was not touched by this reform** — it still uses **IMAT**, a
national, mandatory, competitive up-front test (MUR-owned, CINECA-administered since a.y.
2023/24), registered via Universitaly (REQ-2026-08-21-PAD0002, `VERIFIED_UNDATED`, "Candidates must
register for the IMAT on the Universitaly portal, around June/July"). **Never assume a Medicine
admissions-reform headline applies to both language tracks** — check specifically which track a
student is targeting before describing the current mechanism.

A related terminology trap: the old test name **"TOLC-MED" is obsolete for the Italian-taught track
as of a.y. 2025/26**, though some university pages — including Sapienza's own page title — still
reference it, flagged as possibly-stale content. Do not repeat "TOLC-MED" as a current requirement
without checking the specific page's currency.

## Bocconi's own test is not automatically valid for the next selection round

"Even if they have taken a selection test, candidates are not automatically signed up for the
upcoming selection session" (REQ-2026-08-21-BOC0002, `VERIFIED_CURRENT`) — a student must actively
register for each round even after sitting the Bocconi online test/SAT/LSAT/ACT. Separately,
students already enrolled in a Bocconi undergraduate programme may not submit a new application in
a subsequent round unless specific conditions are met (REQ-2026-08-21-BOC0003) — relevant for a
student considering switching programmes internally at Bocconi rather than assuming a fresh
application is the default path.

## Deadline dating: mostly historical at retrieval, and Italy's institutions do not follow one national pattern

77% of the deadlines found in this corpus (17 of 22, spanning both France and Italy) are
`VERIFIED_HISTORICAL` — the visible cycle had already closed by retrieval date. Within Italy
specifically, dating behavior varies by institution rather than following one national convention:
Sapienza and Politecnico di Torino both state 30 June 2026 as their Universitaly deadline (likely
one shared national date, not coincidence), but Torino's own page calls it "indicative" with the
portal "remain[ing] open" past it — a materially softer framing than a hard cutoff. Bocconi's
2027-28 calls were still genuinely open/future at retrieval (Early Session through 29 September
2026, Winter Session through 26 January 2027). Padua publishes a full multi-call calendar with a
real structural asymmetry between programme types: unlimited-places calls exclude non-EU-abroad
applicants from the *last* round, while limited-places calls reserve the *first* round for them
exclusively — not a copy-paste error, a genuinely different admission shape per programme type.
University of Bologna's own FAQ states it "has not set a general deadline for pre-enrolment" at the
Universitaly-platform level at all — a real, disclosed absence, not a gap in the research (this
specific claim was found only in an unfetchable PDF and was deliberately **not** recorded as a
formal corpus record, consistent with this research programme's "search discovers, fetch verifies"
standard — do not treat it as equally solid as a `VERIFIED` record, even though it is likely true).

## SYSTEM-LEVEL BACKGROUND: how the system works generally

- **Universitaly** is pre-enrolment/visa processing only — not the admission decision itself, and
  not the university's own application system. A validated Universitaly pre-enrolment does not
  guarantee a visa; a granted visa does not guarantee enrolment (both are Sapienza's and Torino's
  own explicit statements, above). Never conflate "pre-enrolment validated" with "admitted."
- Standardized tests depend entirely on programme type, not one national policy: non-binding
  orientation/placement check at open-access programmes (a low score triggers OFA, doesn't block
  enrollment); the binding selective ranking criterion at locally-capped ("numero programmato
  locale") programmes; semestre filtro (no up-front test) for Italian-taught
  Medicine/Dentistry/Vet Med from 2025/26; IMAT (unaffected by that reform) for English-taught
  Medicine.
- CISIA (a university consortium, not a MUR/government body) develops the TOLC test family; it
  discontinued its English-language TOLC variants in November 2025, replaced by a unified CEnT-S.
  Do not treat CISIA as a government testing authority — it is university-consortium-run.
- Applicant educated in Türkiye: reasoning by analogy to other countries in this package that
  require a national entrance-exam certificate — Politecnico di Torino's own requirement
  (REQ-2026-08-21-PDT0003, "For Countries where a national entrance examination for higher
  education admission is compulsory, applicants must upload a certificate") plausibly requires a
  Turkish applicant to separately hold a passing YKS/YÖS result as completeness-proof of the origin
  qualification, alongside whatever Italian test (TOLC/CEnT-S/IMAT/semestre filtro) the target
  programme itself requires — these measure genuinely different things for different purposes
  (RULE-ADMISSIONS-011) and neither substitutes for the other.
- No formal numeric predicted-grade concept nationally — EBAU-equivalent final results are what
  matters, not a forecast.
- **Dominant counselor risk (per the cross-country matrix)**: conflating Universitaly's
  pre-enrolment/visa function with actual admission, or assuming the still-current English-taught
  IMAT mechanism was replaced by the semestre filtro reform that only touched the Italian-taught
  track.
