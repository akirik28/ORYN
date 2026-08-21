# Ireland — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**CAO is not a registration layer like Studielink, and not a pure routing layer like
UCAS — it is a shared computational ranking engine.** The Central Applications Office
(CAO), a private company jointly owned by the participating Higher Education
Institutions (HEIs), is the near-universal platform for EU/EFTA/UK-fee-status
applicants applying to full-time undergraduate courses. For the large majority of
"points" (non-restricted) courses, no individual human at the university reviews each
application: the HEI sets the entry requirements, subject prerequisites, and place
count per course code and instructs CAO how to process it; CAO's own system then
computes a ranked list of all eligible applicants by points and automatically issues
offers to the highest-ranked applicants up to the specified number of places. Admission
decisions remain formally the HEIs' (Citizens Information, a statutory information
body: *"The HEIs decide who gets places on their courses and they tell the CAO to make
offers to successful candidates... all decisions on admissions are made by the
individual institutions and not by the CAO"*) — but the moment-to-moment ranking
execution is centrally, mechanically computed, not individually reviewed. Non-EU/
international-fee-status applicants generally sit **outside** this architecture
entirely and apply **direct to each HEI's own international office** — confirmed by
UCD ("non-EU applicants apply direct to UCD, rather than through... CAO") and Trinity
(a course-specific "Non-EU Application" link, separate per-course fee). Some non-EU
applicant categories may still be instructed by a specific HEI to apply through CAO
(e.g., for visa-timing reasons), but this is HEI-specific, not the non-EU default.

## B. Qualification eligibility

Two layers, structurally parallel to the Netherlands' Nuffic/university split but with
a genuinely more fragmented non-EU tier. **QQI** (Quality and Qualifications Ireland)
hosts NARIC Ireland and publishes advisory comparability statements against the Irish
National Framework of Qualifications (NFQ) — explicitly non-binding: *"a comparability
statement only provides advice and is not a legal document... decisions... will be
made by the individual employer, competent authority or education and training
admissions staff."* For the CAO/EU-EFTA-UK route, the participating HEIs **jointly
author** (not CAO itself) an "Agreed Entry Requirements for EU/EFTA/UK Applicants"
document covering ~30 European countries plus IB/European Baccalaureate/Ukraine, with
country-specific matriculation and Indicative Points Score (IPS) tables.

**Matriculation is an eligibility floor, separate from and prior to competitive points
ranking — and, unlike the Netherlands' open programmes, meeting it does not equal
admission for the large majority of Irish courses.** General Level 8 matriculation: 6
subjects at Ordinary-level O6+ including either 2 or 3 at Higher-level H5+ (English
normally required); Level 7/6: 5 subjects at O5+. CAO's own jointly-authored guidance
states this explicitly: *"entry to undergraduate courses in Ireland, and especially
Level 8, is competitive and attainment of the minimum eligibility criteria does not
guarantee a place. A points scoring system is in operation."* For non-EU/EFTA/UK
applicants (including Turkish nationals), neither QQI's statements nor the joint
EU/EFTA/UK document applies — each HEI sets and publishes its own criteria
independently.

## Applicant educated in Türkiye

**The sharpest, most university-specific split found across the countries researched
so far.** Turkish nationals fall entirely outside the CAO/EU-EFTA-UK points system
(Turkey is absent from that ~30-country document's scope) and apply **direct to each
HEI**, which independently decides whether a plain Lise Diploması suffices. **UCD**
(official 2026-entry Turkey table) publishes direct per-programme percentage
thresholds from **67% Lise** (e.g., BA Arts, History, English Literature) up to **100%
Lise** (Commerce, BSc Business, Computer Science, Engineering Omnibus, Architecture) —
or alternates combining a lower percentage with a partial Turkish university degree GPA
(e.g., "71% Lise & 3.0/4.0 in degree") or a qualifying SAT score (e.g., "83% Lise &
1220 SAT"). **UCC** similarly publishes a tiered direct-entry system (67%/85%/90% Lise
by programme band) but *additionally* requires a passing result in Turkey's national
university entrance exam — UCC's own page names it "Lisans Yerleştirme Sınavı (LYS)," a
name superseded by YKS in Turkey's 2018 exam reform, a genuine data-quality caution
about that page's currency. **Trinity College Dublin**, by contrast, does **not**
accept the plain Lise Diploması for direct entry **at all**: its official Turkey page
states accepted qualifications for direct application are "GCE A Levels, International
Baccalaureate, US High School Diploma with SAT or ACT" only, routing anyone without one
of these to its International Foundation Programme. **A Turkish applicant's acceptance
at one Irish university carries no implication for another.** AP/IB/A-Level layered on
top materially simplifies the picture everywhere (the primary accepted route at
Trinity; a separate, more standardised page at UCD). YKS/LYS relevance is a genuine,
unresolved, live disagreement between UCC's page (implies a requirement, under
apparently outdated terminology) and UCD's detailed table (no mention at all) — record
as an open split, not a resolved system-wide answer. Foundation/pathway years are the
explicit, named fallback at Trinity, UCD, and numerous other HEIs (TU Dublin, DCU, UCC,
University of Limerick, TUS, private partners), typically one year, IELTS ~4.5-5.5
entry, some with guaranteed progression on completion.

## Academic evidence used

Within the CAO/points route, no separate transcript review occurs for standard
courses — the points score is computed directly and mechanically from the applicant's
official Leaving Certificate (or equivalent) results record, which CAO itself receives
from the State Examinations Commission (or, for IB, directly from the IB organisation
once access is granted). Within the non-EU/direct route, a full transcript is a
required, individually-reviewed document alongside references, an SOP, and English
proficiency evidence. Native grades are read on each qualification's own scale via a
jointly-agreed conversion to a common Indicative Points Score — never blended ("Two
different examination types cannot be combined for scoring purposes"). The Leaving
Certificate itself, for CAO points purposes, is **entirely externally/nationally set
and marked** by the State Examinations Commission — unlike VWO's mixed school-set plus
national-exam composite, there is no school-set continuous-assessment component feeding
the CAO points score for the mainstream Leaving Certificate (the separate Leaving
Certificate Applied track is a distinct, non-points-scored qualification, not to be
conflated with the mainstream one).

## Predicted grades

**Not used at all within the CAO/points route, for any applicant category, in any
curriculum — the sharpest "no predicted grades" finding of any country in this
package so far.** Ireland's system is explicitly "post-qualification admissions":
offers for standard courses are computed and issued only after actual final results are
known. This holds even for IB applicants specifically: the CAO Guidelines instruct
May-sitting IB candidates to grant CAO direct electronic access to their **actual**
final IB results once released, and CAO uses only that real result — the IB's own
native predicted-grade artifact (which UK/UCAS and, per this package's Netherlands
findings, Dutch universities both read operationally) plays **no role** in the CAO
points process at all. Predicted grades **do** appear to be used within the separate,
HEI-run **non-EU/direct-to-university** route: Trinity's general international
undergraduate page lists acceptable documentation as "Final high school exam results,
**OR Predicted Scores provided by your school**" — a genuine two-track bifurcation:
actual-results-only inside CAO, predicted-grades-accepted outside it.

## Conditional vs. unconditional admission

Exists, but in a narrower, differently-structured sense within the CAO/points route
than in the UK or Netherlands, plus a separate, more UK-like sense that appears
confined to the non-EU/direct route. **Within CAO**: no predicted-grade-conditional
offer exists at all (see above). What resembles "conditionality" is purely sequencing —
restricted-course early assessment (portfolio, interview, HPAT) can occur months before
Leaving Certificate results, but the resulting points-based offer still only issues
once actual results are known and combined with that earlier score; Round A/Round Zero
applicants (mature, deferred, graduate-entry medicine, QQI/FET, some non-EU/visa-timing
cases) can receive offers before the main results date specifically because they
typically already hold final, already-known results from an earlier period, not because
a prediction is being acted on. **Within the non-EU/direct route**: Trinity's
acceptance of "Predicted Scores" implies a genuine, UK-like conditional-offer mechanism
operates, though this research pass did not locate an actual Irish offer letter using
that terminology — a reasonable inference, not a directly sourced confirmation.

## Subject prerequisites

Real and programme-specific, but structurally different from the Netherlands' VWO
"profielen": the Leaving Certificate has **no fixed, small set of named national
subject-combination tracks** — students choose roughly 7-8 subjects individually, and
programmes then publish their own specific requirements on top, most commonly a named
minimum Higher Level Mathematics grade and, for some fields, a lab science. UCD's
non-EU table shows this varies by programme, not uniformly: "C2 3rd level / 4.5 Lise"
for Business/Computer Science, "B3 3rd level" for Engineering, "D1 3rd level / 2 Lise"
for Economics/Social Science. Higher Level Mathematics carries a national **+25
CAO-points bonus** (grade H6 or above) — an incentive layer distinct from, and
additional to, any hard subject requirement a specific course sets, and it only lifts
an applicant's total if HL Maths lands among their best 6 subjects.

## Standardized tests

**No SAT/ACT-style general admissions test exists within the domestic CAO/points
route.** HPAT-Ireland (Health Professions Admission Test) is mandatory nationally for
**every** undergraduate Medicine applicant at all 6 Irish medical schools (University of
Galway, University of Limerick, TCD, UCC, UCD, RCSI) — an aptitude test (logical
reasoning, interpersonal understanding, non-verbal reasoning), not subject knowledge,
sat around February/March, before Leaving Certificate results. **Currently (through
2026 entry)**: minimum 480 LC points required; points above 550 moderated up to a 565
maximum; HPAT scored to a 300 maximum; combined maximum 865. **Changing for 2027
entry**: no moderation above 550 (full points to the 625 maximum apply), HPAT capped at
150 — new combined maximum 775, a substantial rebalancing toward LC results and away
from HPAT. **Flag any cited HPAT/points weighting as cycle-specific.** SAT/ACT appear
**only** within the non-EU/international direct-application pipeline (UCD's and UCC's
Turkey tables; Trinity's "US High School Diploma with SAT or ACT" route) — confirming
these play no domestic/CAO-route role at all.

## Language requirements

For CAO/EU-EFTA-UK-route applicants, English proficiency is normally satisfied
automatically through the qualification itself: Leaving Certificate English H7/O6+, or
A-level GCSE English grade 4/C+. Otherwise, an approved test is required: **IELTS
Academic** (6.5 average, no band below 6.0), Duolingo DET (120, 110+ per subscore),
ETAPP (C1+), IELCA Academic (35, 33+ per band), or LanguageCert B2 Communicator (High
Pass). These are explicitly stated **minimums** — "there may be higher levels required
for matriculation and/or particular programmes in individual institutions." Variation
begins at the HEI/programme level for the exact score, and structurally at the route
level: the CAO figures are a **jointly agreed** baseline across participating HEIs
(not CAO's own unilateral rule), while the non-EU/direct route is more fragmented —
each HEI's international office sets its own policy (Trinity requires "a recognised
certificate of English Language Competency" from its own list; UCD's Foundation
Programme cites roughly IELTS 4.5-5.5 as an entry-to-foundation bar, distinct from any
direct-degree threshold). Ireland's status as an English-speaking country does **not**
remove this requirement for non-native-English applicants, Turkish applicants included.

## Application timing

CAO opens 5 November (preceding year). Early/discounted online rate to a
mid-to-late-January closing point (commonly cited ~20 January). **Normal closing: 1
February 17:00.** **Late closing: 1 May 17:00** (higher fee; late applicants forfeit
HEAR/DARE and mature-applicant assessment). **Change of Mind facility**: free to 1
February; a small fee in a 5 February-1 March window; free again 5 May through the
**final deadline of 1 July 17:00** — letting applicants revise their genuine order of
preference even after sitting exams but before results are known, a strategic window
with no direct UK/UCAS equivalent. **Leaving Certificate results (2026 cycle): 21
August.** Offer rounds (2026 cycle): Round A (non-standard applicants not awaiting
current-year results) 6 July; Round Zero (graduate-entry medicine, other early
categories) 6 August; **Round One (main body of offers, shortly after results) 26
August**; Rounds Two through Five through September as declines cascade to the next
eligible applicant. Restricted-application courses can require a separate early
assessment step (e.g., an NCAD portfolio) as early as February, layered on top of, not
instead of, the main timeline.

## Application strategy constraints

Up to **10 Level 8** preferences and up to **10 Level 6/7** preferences may be ranked
simultaneously via CAO (two separate lists) — sourced to Citizens Information's
official walkthrough; the precise "10 per list" reading (vs. 10 total) is inferred from
the form's two separate entry points, consistent with long-standing CAO practice but
not confirmed against a directly quoted CAO Handbook sentence this pass. **No
numerus-fixus-style cap on "selective" choices was found** — structurally unnecessary,
since virtually all Level 8 courses (not a separate capped subset) already run through
the same unified points mechanism. Restricted courses need early action for their own
assessment timeline. HEAR/DARE (equity-access schemes) carry their own earlier internal
deadlines (2026 cycle: form by 1 March, documents by 10 March), unavailable to late
applicants. Non-EU/direct applicants face a fundamentally separate calculus: no shared
ranked list, no Change-of-Mind mechanism, per-HEI (sometimes per-course) fees and
deadlines.

## Personal statement / essays

**Not a feature of the CAO/points route at all for standard courses** — the complete
official application walkthrough (account, qualification details, course preferences,
HEAR/DARE, Statement of Application Record) contains no essay or personal-statement
step anywhere. **Is** a required, individually-reviewed document within the separate
non-EU/direct-to-university route: Trinity's general international undergraduate
requirements explicitly list "A 500-word statement of purpose." A route-level
distinction, not a universal Irish feature or a universal absence.

## Recommendation letters

Same route-level pattern as personal statements: absent entirely from the CAO/points
route for standard courses; required within the non-EU/direct route (Trinity: "Two
academic references," also required for its Foundation Programme). Confirms a genuine
structural split — the domestic points-ranked mechanism has no channel for a
recommendation letter to matter, while the separate non-EU pipeline treats references
as standard, much closer to the US/UK pattern than to the CAO pattern.

## Extracurricular activities

**Essentially no role at all within the CAO/points route for standard courses — a
stronger, more absolute "not a factor" finding than in any other country in this
package so far.** The CAO points score is computed purely and mechanically from the
best 6 Leaving Certificate subject grades plus any Maths bonus; there is no
motivation-letter-style channel (unlike the Netherlands' numerus fixus programmes)
through which activity evidence could enter the standard calculation at all. The one
genuine non-exam-grade lever domestically is **HEAR/DARE**, which awards reduced-points
access-route places for documented socioeconomic disadvantage (HEAR) or
disability-related educational disadvantage (DARE) — a context/equity mechanism, not an
achievement-breadth credit. Within the non-EU/direct route, some HEIs request a CV
alongside the transcript/references/SOP, implying some soft consideration exists there.
One narrow, programme-specific exception: UCD's non-EU Veterinary Medicine entry
requires documented practical animal-handling experience (minimum 60 hours across ≥2 of
4 named categories, within the prior 3 years) as a hard entry requirement — genuine, but
scoped to this one restricted programme only.

## Interviews / tests / portfolios

Concentrated in named restricted/professional categories, not spread broadly. HPAT for
all domestic-route Medicine applicants nationally. Portfolio submission (CAO's own
"Restricted" flag) for Art & Design-type courses (e.g., NCAD), sometimes assessed from
February. Within the non-EU/direct route, UCD layers an **interview** requirement onto
its non-EU Medicine entry criteria specifically ("89% Lise & 3.2/4.0 in degree or 99%
Lise & 1340 SAT + Interview") — distinct from, and apparently not routed through, the
domestic HPAT mechanism at all, since UCD's non-EU Medicine table makes no mention of
HPAT or Leaving Certificate points. Not applicable to standard points-based courses.

## Restricted / selective programmes

Ireland uses CAO's own term "restricted-application course" for early-assessment
programmes, and treats Medicine as its own heavily documented case via HPAT — a
**narrower, more consistently-named category than the Netherlands' numerus fixus**:
no evidence was found this pass of a broad, legally-defined, shifting national list of
capacity-capped fields comparable to the Netherlands' 2023 legal framework (which covers
Psychology, several CS/Engineering programmes, and more). Capacity limits plausibly
apply to other health-professional programmes (Nursing, Dentistry, Physiotherapy) given
clinical-placement capacity, but specific quota figures or a formal "Restricted"
designation for these beyond Medicine were **not independently sourced this pass — a
genuine gap, not a confirmed absence.** For Medicine: a dual points-plus-aptitude-test
mechanism (not lottery, not qualitative panel review) — see Standardized tests for
exact current and 2027 figures. For Art & Design: an early HEI-run portfolio (and
sometimes interview) assessment, combined with, not replacing, the points mechanism.
Non-EU-route restricted courses (UCD's non-EU Medicine) can run an entirely separate,
interview-based, HPAT-free mechanism for the identical named degree.

## Admissions decision model

**A genuinely distinct third architecture from every country covered so far in this
package** — neither the Netherlands' bifurcated threshold-vs-selection model, nor the
UK's shared-platform-but-individually-reviewed model, nor the US's per-institution
holistic review. For the large majority of Level 8/7/6 courses via CAO: admission is
**competitive-by-points, essentially universally** — not confined to a capped
"restricted" subset the way the Netherlands confines competitiveness to numerus fixus.
Matriculation is necessary but not sufficient; each course code has an **emergent,
cycle-specific points cutoff** determined only once that year's actual applicant pool
and results are known ("it is not possible to forecast how many points will be required
... until the current year's examination results are known"). This ranking is executed
by **CAO's own shared computational system** on the HEI's instructions, not reviewed
applicant-by-applicant by university staff for standard courses — a different division
of labour from the UK (UCAS routes, university staff individually decide) and the
Netherlands (Studielink performs no ranking function at all). Restricted programmes
layer one further qualitative/aptitude dimension onto this same points-based core. The
**non-EU/direct-to-university route operates as a genuinely separate model again** —
individualised, HEI-reviewed, evidence-based (transcript, references, SOP, sometimes
predicted grades and interview), within an explicitly capacity-limited quota at some
HEIs (UCD: non-EU applicants compete for "a limited number of places" in most courses) —
closer in kind to the US/UK model than to the domestic CAO mechanism.

## Safe inferences

Within the CAO/points route, no offer for a standard course issues before actual final
results are known, regardless of curriculum. Meeting matriculation does NOT equal
admission for Level 8 courses in general — competitiveness-by-points is the norm across
virtually all Level 8 courses, not an exception confined to a capped subset. A specific
points figure for any course in a given year is not a stable target — cutoffs are
cycle-specific and emergent. Essays/personal statements/recommendation letters play no
role in the standard CAO/points route but ARE genuine, individually-assessed
requirements within the non-EU/direct-to-university route. A Turkish applicant's
acceptance of a plain Lise Diploması by one Irish university does not imply acceptance
by another — UCD, UCC, and Trinity apply materially different, independently-set
policies to the identical qualification. HPAT is required for every domestic-route
undergraduate Medicine applicant nationally with no university exception, though the
exact HPAT/points weighting is cycle-specific (materially different from 2027 entry).

## Unsafe inferences

Do not assume Ireland's timing/mechanics mirror the UK's simply because both are
English-speaking and geographically close — CAO's post-qualification, actual-results-
only model is a sharp structural departure from UCAS's predicted-grade-driven
conditional-offer system. Do not assume CAO is a pure registration/routing platform
like Studielink or (for most of its function) UCAS — for standard courses, CAO's own
system computationally executes the ranking/allocation decision on the HEIs'
instructions, a materially more active role. Do not assume all non-EU/international
applicants go through CAO — the default is direct application to each HEI, though a
specific HEI may still instruct particular non-EU categories to use CAO. Do not assume
a Turkish applicant's plain Lise Diploması is either uniformly accepted or uniformly
rejected across Irish universities — UCD/UCC publish direct-entry percentage tables
accepting it; Trinity does not accept it for direct entry at all. Do not assume Turkey's
national entrance exam (YKS/LYS) is either required or irrelevant at a system level —
UCC's page implies a requirement (under outdated terminology) while UCD's does not
mention it; a genuine, unresolved, university-specific split. Do not assume
extracurriculars are irrelevant everywhere in the Irish system just because they play
no role in the CAO/points route — the non-EU/direct route weighs CV/experience to some
degree, and specific restricted programmes (UCD's non-EU Veterinary Medicine) impose
their own concrete experience requirements. Do not assume the current HPAT/Leaving-
Certificate weighting (480 minimum, 865 combined maximum) remains valid past the 2026
entry cycle — a confirmed, named change takes effect for 2027 entry.

## Eligibility, competitiveness, fit

**Eligibility**: an objective, checkable matriculation floor (subject count and grade
thresholds) plus any programme-specific subject prerequisites — binary, and explicitly
NOT itself the basis for the actual admission decision. **Competitiveness**: the
dominant, near-universal factor for CAO/points-route admission — a sharp contrast with
the Netherlands, where competitiveness is confined to numerus fixus programmes
specifically. In Ireland, essentially every points-based course has an emergent,
cycle-specific cutoff, making "eligible" and "admitted" distinct outcomes for the great
majority of popular courses, not just a capped minority — but this competitiveness is
measured through a **single variable** (total points) for standard courses, a
meaningfully narrower, more mechanical form of "competitive" than the US's multi-factor
holistic review or the Netherlands' numerus fixus qualitative/lottery/hybrid selection.
**Fit**: essentially absent as an independently assessed concept within the CAO/points
route for standard courses — no essay, interview, or holistic mechanism exists for most
programmes; whatever fit-like signal exists is folded into the points-plus-subject-
prerequisite mechanism itself. Fit becomes explicit and separately assessed only within
restricted/portfolio courses and the non-EU/direct-to-university route.

## Counselor actions

Explain the two-layer eligibility/competitiveness structure clearly: matriculation is
only a floor, and the actual points cutoff for any specific course is unknowable in
advance — avoid promising a specific points target as a safe outcome. For students also
targeting UK universities via UCAS, flag the timing mismatch explicitly: UCAS relies on
predicted grades for conditional offers made well before results, while CAO makes no
offer at all for standard courses until actual results are published in August. For a
Turkish (or other non-EU) applicant, do not generalise one Irish university's Lise
Diploması policy to another — check each target university's own published table
directly, and verify separately whether YKS/national-exam results are required, since
this is unresolved and inconsistently documented. For Medicine-track students, confirm
HPAT registration timing and communicate that the domestic HPAT/points combination is
changing for 2027 entry — do not rely on this cycle's weighting for a 2027-entry
student. Encourage genuine-preference use of the free Change of Mind window (through 1
February, and again 5 May-1 July), especially after sitting but before receiving
results — CAO cannot move an applicant down their own list. Flag restricted-application
courses early (some require portfolio/assessment steps from February). For non-EU
applicants generally, set expectations that they are very likely applying OUTSIDE the
CAO points system, direct to each HEI, with its own document package, fee, deadline,
and (at some HEIs) an explicitly capped non-EU quota. Where a target university does
not accept a student's qualification for direct entry, plan an International Foundation
Programme route well in advance.

## Data model implications

Ireland requires ORYN's data model to represent admission facts across at least **five**
distinct dimensions, one more than the Netherlands' four-layer model: **(1) route**
(CAO/EU-EFTA-UK vs. non-EU/direct-to-HEI — not just different platforms but different
EVIDENCE models: actual-results-only vs. predicted-grades-accepted; no-essay vs.
essay-required; shared-ranked-list vs. per-HEI-independent), **(2) national/platform**
(CAO's shared points-ranking mechanics and the H1-H8/O1-O8 scale, uniform for all
CAO-route applicants), **(3) recognition-baseline** (QQI/NARIC's advisory statements,
and separately CAO's jointly-HEI-authored EU/EFTA/UK tables — both non-binding on any
individual decision), **(4) university** (non-EU/Turkey-specific tables that differ
sharply between UCD, UCC, and Trinity for the identical input qualification), and
**(5) course-code/cycle** (the actual points cutoff for a specific course in a specific
year, emergent and unknowable in advance, and the HPAT/points weighting formula itself,
scheduled to change between the current and 2027 entry cycles). A model storing one
"Ireland requirement" record per qualification type — or even one per university —
would still miss the course-code-and-cycle-level variation that determines actual
admission for the large majority of Irish courses.

## System / university / programme override model

**Layer 1 (route)**: whether an applicant uses CAO or applies direct to an HEI is
determined by fee status (EU/EFTA/UK vs. non-EU), and this single fact changes almost
every subsequent layer described in this document — the most consequential single
branching point in the Irish system, and it should be a first-class routing decision in
ORYN's model, not minor metadata. **Layer 2 (national/platform, CAO route only)**: the
H1-H8/O1-O8 points scale, the HL Maths bonus, matriculation floors, and the shared
Round A/Zero/One-Five mechanics are uniform across all CAO-route applicants and
HEIs — no individual university can waive or alter these. **Layer 3 (national
credential-recognition baseline)**: QQI/NARIC's advisory statements, and, for the
CAO/EU-EFTA-UK route, the jointly-HEI-authored (not CAO-authored) Guidelines document's
country tables — both establish a reference point that draws on but does not bind any
individual decision. **Layer 4 (university)**: each HEI sets its own subject
prerequisites, its own place count per course code (driving that course's emergent
cutoff), and — for non-EU/direct applicants — its own entirely independent entry-policy,
most sharply illustrated by the Turkish Lise Diploması split between UCD/UCC (direct
entry via a published percentage table) and Trinity (not accepted for direct entry at
all). **Layer 5 (course code and cycle)**: the actual points cutoff for a specific
course in a specific year is not set in advance by any layer above — it emerges from
that cycle's balance of place count against demand, and for Medicine specifically, the
HPAT/points formula itself is scheduled to change between the current and 2027 entry
cycles. ORYN should never present a Layer 4 or 5 fact as a Layer 1-3 national fact, and
should never treat a past year's points requirement as a reliable predictor of a future
cycle's cutoff.

## Unresolved questions

Whether Turkey's national entrance exam (YKS, or the pre-2018 "LYS" name still used on
at least one Irish university page) is genuinely required for Turkish-applicant direct
entry — UCC's page implies a requirement under apparently outdated terminology; UCD's
detailed table does not mention it at all. Exact, primary-verified current CAO
application fee figures — direct attempts to fetch CAO's own fee page did not succeed
this pass; cited figures rest on secondary aggregator sources. The precise CAO
course-choice limit wording (10 Level 8 + 10 Level 6/7 as two separate lists, versus
some other precise structure) — inferred from Citizens Information's description of the
application form rather than a directly quoted CAO Handbook sentence. Whether
non-Medicine health-professional programmes (Nursing, Dentistry, Physiotherapy) carry
HSE-linked national quota figures or a formal "Restricted" designation, and on what
mechanism — not independently sourced this pass. The complete, current national list of
CAO-flagged "Restricted" courses beyond the confirmed examples (Medicine, Art & Design)
— CAO's own Restrictions page content did not fully render in this research pass.
Whether an actual Irish HEI offer letter to a non-EU applicant uses explicit UCAS-style
"conditional offer" terminology when predicted grades are presented — inferred from
Trinity's accepted-documentation list, not directly observed. Whether financial proof of
means plays any role in the admission DECISION itself (as distinct from post-offer
visa/immigration requirements) at any Irish HEI — no source reviewed identified it as an
admissions-decision factor; treated as a confirmed non-factor for the admissions
architecture specifically, separate from immigration mechanics which are out of scope.
