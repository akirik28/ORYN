# United Kingdom — counselor knowledge

Evidence base: UK-country records within `uk_tr_requirements_batch1-6`/`uk_tr_deadlines_batch1-3`
and the earlier `requirements_batch1-9`/`deadlines_batch1-3` wave (Oxford, Cambridge, Glasgow,
Edinburgh, Manchester, Bath, LSE, Queen Mary, Nottingham, Exeter, Liverpool, Southampton,
Imperial), `docs/research/university-requirements-uk-tr/blocked-and-partial-sources.md`,
`docs/research/university-requirements/{scalar-thresholds-are-not-enough,source-authority-gap}.md`
(VERIFIED tier), and `docs/research/admissions-systems/united-kingdom.md` (SYSTEM-LEVEL
BACKGROUND tier — flagged there as partly secondary-corroborated since ucas.com 403s automated
fetch; treat single-number UCAS claims from that doc as needing a direct-fetch check before
quoting as final). A second research lane is currently gap-filling Oxford/Cambridge/Imperial/UCL/
LSE/Warwick/KCL/Bristol/St Andrews/Bath specifically, including contextual/widening-participation
offers — not yet in this corpus as of this writing; check `uk2_requirements_*.jsonl` before
telling a student no contextual-offer information exists.

## UCAS is a shared pipe, not a shared decision-maker

UCAS Undergraduate is the near-universal single platform (380+ providers, virtually every
Russell Group member including Oxbridge) handling submission, the personal statement, the school
reference, and results-day processing — but it does not decide admission. Final decisions, offer
terms, and interview/test processes stay fully devolved to each university/programme
(SYSTEM-LEVEL BACKGROUND, RULE-ADMISSIONS-012: platform existence ≠ centralized decision-making).
A small minority of providers sit outside UCAS entirely (Open University, University of
Buckingham, some conservatoires) — never assume a UK application must go through UCAS.

## Oxford and Cambridge: earlier deadline, admissions tests, interviews — a structurally different track

- **Earlier UCAS deadline**: 15 October 2026, 18:00 (2027 entry) for Oxford, Cambridge, and most
  Medicine/Dentistry/Vet Med/Vet Science — everyone else gets the 13 January 2027 "equal
  consideration" deadline. Cambridge's own confirmed deadline structure (VERIFIED_CURRENT):
  UCAS submission (DL-2026-08-21-0001), My Cambridge Application (DL-0002/0004), a Foundation
  Year deadline (DL-0003), and separate registration deadlines for the **ESAT/TMUA**
  (DL-2026-08-21-0005), **LNAT** (DL-0006), and **UCAT** (DL-0007) admissions tests — each test has
  its own registration window, not one shared date. Oxford's own confirmed dates
  (DL-2026-08-21-2004 through 2007): 15 October final deadline, 10 November written-work
  submission, 12 January offer notification, applications open from early September
  (`VERIFIED_RECURRING_UNDATED` — no year stated for the opening date itself).
- **Cannot apply to both Oxford and Cambridge in the same cycle** — UCAS voids the duplicate and
  forfeits the fee (organ-scholarship is the named exception). Because the whole UCAS application
  is one package, mixing an Oxbridge or Medicine choice with ordinary choices binds the **entire**
  application to the earlier October deadline, even for the non-Oxbridge choices.
- **Admissions tests are real, named, and vary by subject/university, not one universal exam**:
  UCAT for Medicine/most Dentistry (BMAT was discontinued after 2023; Oxbridge switched to UCAT);
  LNAT for Law at a defined list including Oxford/Cambridge/Bristol/Durham/Glasgow/KCL/LSE/UCL/
  SOAS/Nottingham (not all law schools); TMUA/ESAT for Maths/CS/Economics/Statistics/Engineering,
  varying by university (e.g. Cambridge requires ESAT/TMUA registration by a specific deadline,
  optional for Economics at Warwick, mandatory at LSE — REQ-2026-08-21-2001, "Take your UAT-UK
  test October," confirms Oxford runs its own admissions-test requirement too). **Verify which
  named test a specific target course requires before assuming "UCAT" covers everything** —
  BMAT no longer exists as a live test, so any advice citing it is stale.
- **Interviews are structural at Oxbridge, not exceptional**: Cambridge invites ~80% of applicants
  to interview (~25% of those get an offer); Oxford invites ~45% (over 35% of those get an offer).
  Medicine schools generally use a Multiple Mini Interview (MMI) format instead. Neither is a
  courtesy formality — treat interview preparation as a required workstream for these applicants,
  not optional polish.

## Predicted grades and the conditional/unconditional mechanic — the defining UK structure, with no US analogue

Predicted grades, submitted by the student's **school** (not the student), are central and
load-bearing — essentially every school-leaver applies before final results exist, and predicted
grades are the primary evidence a UK university uses to decide whether to offer and at what grade
level. This is **not** the same mechanism as US Early Decision (a binding-commitment structure);
it is a grades-*contingent* structure. A **conditional** offer requires stated final grades by a
date; an **unconditional** offer has no further academic condition (comparatively rare — typically
gap-year reapplicants with results already in hand, or, per UK press criticism, occasionally used
as a recruitment incentive worth flagging to a student as not necessarily reflecting fit or
quality). On Results Day, actual grades are compared against the offer via UCAS Track: met →
automatically confirmed; narrowly missed → university discretion or Clearing. **Never present a
conditional offer as a guaranteed place before results are confirmed.**

## English test scale rescale: the same 21 January 2026 cutover, handled well and badly at neighboring universities

Effective 21 January 2026 TOEFL iBT moved to a 1–6 band scale; ETS also prints a comparable 0–120
overall for two years but does **not** restate section scores on the old 0–30 subscales. This
corpus shows the failure mode live, at real UK universities:

- **Edinburgh is correct and current**: "total 4.5 with at least 4.0 in each component"
  (REQ-2026-08-21-3021/4004, VERIFIED_CURRENT) — the new scale applied exactly as ETS defines it.
- **Glasgow's requirement is half-satisfiable, which is worse than being wrong**: "92 Overall, no
  subtest lower than Reading 22; Listening 20; Speaking 23; Writing 21" (REQ-2026-08-21-3007/4005,
  recorded `CONFLICTING_EVIDENCE`/`NEEDS_REVIEW`). The 92-overall half is meetable via ETS's
  two-year comparable score; the per-subtest half is **not satisfiable by any report issued after
  the cutover**, because ETS does not restate section scores on the old scale. A naive numeric
  check would tell a student they *failed* a requirement that literally cannot be measured — this
  requirement should evaluate to `needs_manual_review`, never a clean pass/fail, per
  `scalar-thresholds-are-not-enough.md`'s own resolution of this exact case.
- **Bath handles the same cutover correctly with two dated variants**, pre- and post-21 January
  2026 (REQ-2026-08-21-9019/9020, `VERIFIED_HISTORICAL`) — proof the defect is per-page, not
  per-university; the same institution can get it right elsewhere while another gets it wrong.
- **Boğaziçi (Turkey, included in this UK/TR corpus wave) shows the same defect with no cutover
  date stated at all**: "TOEFL iBT (minimum 79 total, 22 writing)" (REQ-2026-08-21-0020/4006,
  `NEEDS_REVIEW`) — unambiguously the old scale, with the same unmeetable-subscore problem as
  Glasgow once a post-cutover report is the only kind available.
- **Any UK TOEFL threshold quoted to a student must carry its scale/cutover date** — an unqualified
  number is not safe to evaluate, and will get worse (not better) after January 2028 when ETS's
  dual reporting ends.

## IELTS One Skill Retake: accepted at one university, explicitly refused at its neighbor — never generalize a test-acceptance rule

**Southampton accepts it**: "(IELTS) Academic UKVI SELT (**including One Skill Retake**)"
(REQ-2026-08-21-9211, VERIFIED_UNDATED, band-system detail — Southampton runs a per-course A–I band
structure, REQ-2026-08-21-9210, with the actual per-band numbers living in a separate per-entry-year
PDF this lane did not capture; do not invent Southampton's specific band cutoffs). **Edinburgh
explicitly refuses it**: "We do not accept IELTS One Skill Retake to meet our English language
requirements" (REQ-2026-08-21-3020, VERIFIED_UNDATED) — and separately refuses TOEFL MyBest Score
by the same sentence structure. This is the sharpest evidence in the whole corpus that test-score
*provenance* acceptance is a per-institution fact, never a general "IELTS is IELTS" assumption.
Queen Mary also explicitly excludes MyBest scores (REQ-2026-08-21-9203) and any Trinity test taken
online (REQ-2026-08-21-9205). Nottingham separately excludes LanguageCert entirely
(REQ-2026-08-21-9401), and Bath excludes PTE Academic online (REQ-2026-08-21-9024) — three more
named exclusions, three more universities, none generalizable to each other.

## Score/qualification recency rules — a numerically qualifying score can still be too old

Recurring pattern across UK universities in this corpus, all VERIFIED, all independently stated
per institution (never assume one recency window applies everywhere):

- Edinburgh: Mathematics qualifications "no more than two academic years prior to entry"
  (REQ-2026-08-21-3018); English test scores "no more than two years old from the start date of
  this programme" (REQ-2026-08-21-3025) — a *different* anchor point (entry vs. programme start)
  than the Maths rule, worth reading precisely rather than treating both as "two years, same
  thing."
- Bath: "no more than 24 months before starting your course" (REQ-2026-08-21-9025).
- Exeter: "Tests valid for 2 years" (REQ-2026-08-21-9032).
- Liverpool, Nottingham, Technological University Dublin (Ireland, same corpus wave): all state a
  two-year English-test validity window independently.

Any of these evaluating as a bare score-vs-threshold check is confidently wrong for a student whose
qualification is real but stale — this should route to `needs_manual_review`, not a pass, exactly
as `scalar-thresholds-are-not-enough.md` argues generally.

## A-Level/qualification exclusions worth knowing before advising a student on subject choice

- Manchester: "Use of Mathematics or Core Mathematics do not satisfy this requirement"
  (REQ-2026-08-21-9003) for its Mathematics prerequisite — a named exclusion of a real, valid
  A-Level subject that superficially looks like it should count.
- Manchester: T Levels are not accepted (REQ-2026-08-21-9013); BTEC National Certificate is not
  considered for entry (REQ-2026-08-21-9014).
- Exeter: Botswana General Certificate of Secondary Education and Kenya Certificate of Secondary
  Education both explicitly "not accepted" (REQ-2026-08-21-9030/9031) — worth knowing for
  internationally mobile students, not just Turkish applicants.

## Applicant educated in Türkiye: university-specific, never a national MEB table

There is no single "MEB = X A-Level grades" conversion. Multiple universities (Sheffield, Bristol)
will consider direct entry for a Lise/Devlet Lise/Anadolu/Fen Lisesi diploma **only** if the school
is on that specific university's own approved list (commonly tied to MEB e-Okul verification) and
the final-year percentage clears a threshold that scales with the target offer (Sheffield example:
~72% for a BBB-equivalent offer, up to ~88% for A*AA-equivalent) — a threshold reported at
secondary-source confidence, not independently primary-verified this pass. Students outside an
approved school, or below threshold, are commonly redirected to an International Foundation Year.
**The single highest-leverage fact**: a student who also holds AP, IB, or A-Levels is evaluated
under that qualification's own, more standard pathway instead of the bespoke Turkey-country page —
this changes the picture materially, so always ask whether the student holds a second, more
widely-recognized qualification before defaulting to the MEB-only pathway's more restrictive
treatment.

## A resolved conflict already worth knowing: Glasgow's UCAS date vs. UCAS's own date

Not open — resolved, and worth citing because it demonstrates the standing authority rule. Glasgow's
own page listed the UCAS "equal consideration" date, undated, as "14 January" (the 2026-entry
date). UCAS's own page, explicitly dated to the 2027 cycle, gives 13 January 2027. Coordination
DECISION 1 resolved this in favor of UCAS's own publication: **an official application system
(UCAS, and equivalently CAO/Studielink/hochschulstart elsewhere) is the primary authority for the
facts it operates — platform-wide deadlines, equal-consideration dates, eligibility rules — even
when a university's own page states a number too**, because the university's copy is a restatement
that can go stale, and here it did. Glasgow's row is kept in the corpus unchanged as the record of
what Glasgow published, not silently corrected.

## SYSTEM-LEVEL BACKGROUND: how the UK system works generally

- Two-layer eligibility: the UCAS Tariff (a points-conversion table) exists, but competitive/
  Russell-Group/Oxbridge offers are more commonly stated in **native grades** ("A*AA", "38 points
  IB") than converted Tariff points — Tariff points cannot substitute for a missing required
  subject grade. UK ENIC (formerly NARIC) issues comparability statements for non-Tariff
  qualifications including MEB, which universities *may* reference but are not obliged to follow.
- **5-choice maximum** per UCAS application; a **4-choice sub-cap** applies combined across
  Medicine/Dentistry/Vet Med/Vet Science within the 5.
- Personal statement: **one single UCAS statement sent identically to every choice** — a sharp
  contrast to the US per-college-supplement model. For 2026 entry onward, restructured into a
  3-question format (why this subject / how prepared academically / what else done to prepare).
  Since one statement serves every choice, a student mixing dissimilar subjects across their 5
  choices faces a real structural tension worth flagging early.
- Recommendations: **one shared school/college reference**, not multiple personal letters —
  genuinely lighter than the US pattern.
- Extracurriculars weighted far less than US holistic admissions; where activity evidence matters
  it is specifically **"super-curricular"** (subject-adjacent — academic journals, public
  lectures, subject Olympiads) rather than general leadership/clubs/sports breadth.
- Medicine/Dentistry/Vet Med/Vet Science face a **government-set national capacity cap** (Maximum
  Fundable Limits, tied to public training funding, currently ~£250-270k per medical student over
  5 years) — a real structural ceiling distinct from an ordinarily competitive-but-uncapped course.
  The cap level changes cycle to cycle; treat any specific number as checkable, not fixed.
- UCAS Adjustment was **discontinued after the 2021 cycle**, folded into Clearing via a
  "self-release" option — using Adjustment terminology with a student risks real confusion at
  results time.
- **Dominant counselor risk (per the cross-country matrix)**: treating a conditional offer as
  finished admission, or generalizing one university's Turkish-diploma treatment across UK
  universities generally. Both risks recur throughout this document's specific findings above.
