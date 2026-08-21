# Ireland — counselor knowledge

Evidence base: 153 requirements across the CAO system plus 8 institutions (Trinity College Dublin,
University College Dublin, University College Cork, NUI Galway, Maynooth, Limerick, DCU,
Technological University Dublin — no dedicated summary doc exists for this country yet, so all
VERIFIED claims below cite corpus record IDs directly,
`data/research/university-requirements/ie_requirements_*.jsonl`), and
`docs/research/admissions-systems/ireland.md` plus the cross-country matrix's RULE-ADMISSIONS-014
(SYSTEM-LEVEL BACKGROUND tier).

## Ireland runs two fully parallel admissions systems, not one system with an exception layered on top

This is the single most important structural fact, and the cross-country research explicitly names
Ireland as the sharpest example of RULE-ADMISSIONS-014 in the whole 15-country package: **the CAO
route and the non-EU/direct route are two independent architectures from the ground up, with
opposite evidence models**, not one baseline with a university override on top.

- **CAO (domestic/EU/EFTA/UK route)**: a computational points-ranking engine. Leaving Certificate
  results only — no predicted grades, no essays, no references, no interview for standard courses.
  "EU/EFTA/UK applicants must apply through the Central Applications System (CAO)"
  (REQ-2026-08-21-IE-CAO-006, `VERIFIED_CURRENT`); EU-fee-status applicants at UCD specifically
  "will only be admitted... through CAO" — direct application is not an alternative route for this
  population (REQ-2026-08-21-IE-UCD-002, `VERIFIED_CURRENT`).
- **Non-EU/direct route**: university-specific, evidence-rich. Essays and references appear,
  foundation years are common, predicted scores are evaluated operationally. Trinity's own
  non-EU pathway runs entirely outside CAO, with its own competitive admission bands per programme
  (REQ-2026-08-21-IE-TCD-001/002, `VERIFIED_HISTORICAL`) and its own application link on individual
  course pages (REQ-2026-08-21-IE-TCD-007, `NEEDS_REVIEW` — verify current application mechanics
  before advising a specific applicant).

**A Turkish applicant (or any non-EU/EFTA/UK applicant) almost always falls into the second system,
not the first** — most Turkish applicants will never touch the CAO points mechanism at all. Never
default to explaining CAO points to a non-EU family; determine residency/fee status first, since it
determines which of two structurally opposite systems actually applies.

## CAO points are a competitive outcome, never a published minimum — the same caution as Spain's nota de corte

CAO's own language is explicit: "A points scoring system is in operation. It is not possible to
forecast how many points will be required" (REQ-2026-08-21-IE-CAO-008, `VERIFIED_CURRENT`). Every
specific points figure in this corpus is a **historical outcome** — the score of the last student
actually offered a place that round, not a published bar a future applicant can be told they need.
This is stated explicitly and repeatedly across records: UCD's DN600 Law 2025 Round 1 figure of 567
"is the score of the last student offered a place in Round 1, **NOT** a published minimum entry
requirement" (REQ-2026-08-21-IE-UCD-011); Trinity's TR004 Law figure of 577 similarly documents an
outcome, not a threshold (REQ-2026-08-21-IE-TCD-010). **Never tell a student "you need X CAO points
to get into this course"** — the honest framing is "last year's last-place offer was X; this year's
will depend on that year's applicant pool," exactly the same caution that applies to Spain's nota de
corte in this package. A useful concrete number from this corpus for illustrating volatility:
UCD's General Nursing (DN450) points rose 34 points in a single year (410 → 444,
REQ-2026-08-21-IE-UCD-015) — the largest single-course year-over-year increase recorded, evidence
that even a recent historical figure can be a poor predictor of the next cycle.

## Higher Level Mathematics carries a national +25-point bonus — an incentive, not a universal requirement

"25 bonus points are awarded to students attaining a minimum of grade 6 in Higher Level Mathematics
(H6)" (REQ-2026-08-21-IE-CAO-003, `VERIFIED_CURRENT`, for EU/EFTA/UK applicants presenting Leaving
Certificate results). This functions as an incentive layered onto an à-la-carte Leaving Certificate
with no Dutch-style fixed "profiel" subject-combination structure — a student is not required to
take Higher Level Maths, but doing well in it materially raises their computed points total.
**Never present this as a subject requirement** — it's a scoring bonus available to any student who
chooses and clears the bar, structurally different from Germany's or the Netherlands' hard
subject-prerequisite gates.

## The Leaving Cert points formula: best six subjects, one qualifying exam sitting, plus a matriculation floor

"The six best results, in recognised subjects, in one Leaving Certificate Examination will be
counted for points computation" (REQ-2026-08-21-IE-CAO-002, `VERIFIED_UNDATED`) — using the Common
Points Scale (H1=100 down to H8=0 at Higher Level; REQ-2026-08-21-IE-CAO-001). Separately, the
general Level 8 (Honours Degree) matriculation requirement is a distinct floor from the
competitive points total: "2 H5 required, i.e. 6 subjects at [stated grade combination]"
(REQ-2026-08-21-IE-CAO-004, `VERIFIED_CURRENT`) — a student can clear the matriculation floor and
still not clear a specific competitive course's points requirement; these are two different gates,
not one.

## Medicine runs on a moderated formula combining Leaving Cert points with HPAT-Ireland — uniform across all 6 medical schools

Trinity's TR051 Medicine 2025 End-of-Season figure of 739 points is explicitly noted as "assessed
via HPAT Ireland test plus Leaving Certificate" (REQ-2026-08-21-IE-TCD-009, `VERIFIED_HISTORICAL`)
— confirmed independently at UCD, whose DN400 Medicine figure of 738 is likewise "based on a
combination of the Leaving Cert Examination and HPAT-Ireland" (REQ-2026-08-21-IE-UCD-008). HPAT
(Health Professions Admission Test) is mandatory nationally for all undergraduate Medicine
applicants at all 6 Irish medical schools, moderated together with Leaving Certificate points into
one combined total — never advise a Medicine applicant that Leaving Cert points alone determine
their standing.

## Age and English-proficiency requirements apply even to the CAO route, and are worth checking early

UCD's age requirement: "Students must normally be seventeen years of age by 15 January following
entry" (REQ-2026-08-21-IE-UCD-006, `VERIFIED_UNDATED`) — a real, checkable gate worth surfacing
early for a younger applicant. Trinity's non-EU English Language Requirement accepts a qualifying
Irish Leaving Certificate grade (6 or better ordinary level, per REQ-2026-08-21-IE-TCD-003,
`VERIFIED_HISTORICAL`) as one route among several — worth checking against a specific student's
actual qualification rather than assuming an external English test (IELTS/TOEFL) is always
required.

## SYSTEM-LEVEL BACKGROUND: how the system works generally

- CAO is described in ORYN's admissions-systems research as a genuinely third model, distinct from
  both UCAS (human-reviewed routing) and Studielink (registration-only) — CAO's own system
  computationally *executes* the points-ranking allocation on behalf of HEIs for standard courses;
  HEIs formally retain the admissions decision and set course-level criteria/place counts, but
  CAO's own algorithm performs the ranking execution.
- No essay, reference, or predicted-grade mechanism exists anywhere in the CAO/points route for any
  applicant category or curriculum — a strict post-qualification-admissions system that waits for
  actual final results, confirmed even for IB applicants (whose native predicted grades are
  bypassed in favour of CAO accessing actual final results directly). These features **do** appear
  within the separate non-EU/direct route (Trinity requires a 500-word statement of purpose and two
  academic references for non-EU undergraduate applications) — a genuine two-track split not seen
  at this sharpness in any other country in this package.
- No broad extracurricular factor in the CAO/points route — points are computed purely from best-6
  Leaving Certificate subject grades plus the Mathematics bonus. The one genuine non-exam lever
  domestically is the HEAR/DARE equity-access scheme (a reduced-points route for documented
  socioeconomic disadvantage/disability), which addresses context, not general achievement breadth.
- **Dominant counselor risk (per the cross-country matrix)**: assuming Ireland's admissions system
  works like the UK's next door — either assuming UCAS-style predicted-grade-driven conditional
  offers exist within the domestic CAO route (they do not — CAO is strictly post-qualification/
  actual-results-based) or assuming CAO is a pure registration/routing layer like Studielink/UCAS
  rather than the shared computational ranking engine it actually operates. Specific to Turkish
  applicants: assuming one Irish university's Lise Diploması percentage table or foundation-year
  requirement generalises to another — different Irish universities set genuinely, independently
  different policies for the identical credential.
