# Hong Kong — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/fragments/hong_kong.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**Two entirely separate application systems, gated by local-vs-non-local status, not by
qualification type.** JUPAS (Joint University Programmes Admissions System, jupas.edu.hk)
is the shared national platform used by 9 JUPAS-participating institutions — but it is
open only to **local** applicants holding HKDSE Examination results who are not already
enrolled full-time in a JUPAS bachelor's programme. **Non-JUPAS is not a shared platform
at all** — it is a label for each institution's own separate direct-application scheme
(HKU's own portal, CUHK's own portal at admission.cuhk.edu.hk, HKUST's own portal at
join.hkust.edu.hk). As of the 2020 JUPAS cycle, per confirmed HKSAR Government policy,
**ALL non-local applicants — regardless of whether they hold HKDSE results — must apply
via non-JUPAS at each university individually, not via JUPAS.** This is where essentially
every Turkish MEB/IB/A-Level-educated applicant sits. Pattern: centralized platform +
merit-order matching for the local track; fully decentralized, direct-to-each-university
applications for the international track — a sharper bifurcation than any of the six
countries already researched, because the split happens at "which system can this
applicant even use," not "does the platform decide."

## B. Qualification eligibility

Two-layer pattern structurally similar to the Netherlands' Nuffic/university split.
**HKCAAVQ** (Hong Kong Council for Accreditation of Academic and Vocational
Qualifications), a statutory body, offers an individual "Qualification Assessment"
service — a professional opinion on whether an individual applicant's qualification meets
a stated Hong Kong Qualifications Framework level, used for multiple purposes beyond
admission (professional registration, the Quality Migrant Admission Scheme). It is not
itself an admission decision. **Each university independently publishes its own
qualification-specific, sometimes country-specific, minimum-grade table** and makes the
binding decision — HKU's own page states an unlisted qualification "will be considered on
an individual basis." For local applicants the baseline is an HKDSE result; for non-local
applicants there is no single baseline credential — HKUST's accepted-qualification list
names 80+ countries/regions, explicitly including Turkey, alongside IB, GCE A-Level,
US diploma+SAT/AP, and French Baccalauréat.

## Applicant educated in Türkiye

**Direct entry is possible, but only through non-JUPAS — and the required minimum differs
by university, the same "not one national fact" pattern confirmed for the Netherlands.**
Two official, university-specific figures were directly confirmed for the same named
diploma types ("Anadolu Lisesi / Devlet Lise Diplomasi / Lise Bitirme Diplomasi," i.e. the
standard Turkish state/Anatolian MEB-administered high-school diploma): **HKU requires an
overall average of 4 on a 5-point scale or 70 on a 100-point scale** (primary source,
verbatim, admissions.hku.hk/node/2326); **CUHK requires an overall average of 80%**
(sourced to CUHK's official cuhk.edu.hk international-qualifications guide; corroborated
via multiple independent references to that exact official PDF but not directly
text-parsed by this research pass, so treated as secondary-corroborated rather than
verbatim-verified). **HKUST's specific Turkish-diploma threshold was not found** in
sources reviewed this pass despite Turkey being confirmed as an HKUST-accepted country — a
genuine gap, not evidence of a stricter or more lenient policy. No Hong Kong-specific
supplementary-qualification or bridge-year pathway (comparable to the Netherlands' AP-exam
or one-year-Lisans-credit routes) was identified for a Turkish applicant whose plain Lise
average falls short of a target threshold — HKU's general "considered on an individual
basis" fallback implies some discretion exists, but no concrete mechanism was confirmed.
Whether holding IB/A-Levels alongside Turkish schooling shifts evaluation to the IB/A-Level
table instead (as it demonstrably does in the Netherlands) was not independently confirmed
for Hong Kong — plausible by structural pattern only. YKS's relevance, if any, to a Hong
Kong university's assessment was not addressed in any source reviewed — the same
unresolved gap documented for the Netherlands.

## Academic evidence used

For non-JUPAS/international applicants, a full transcript is a required upload at every
university reviewed. For JUPAS/local applicants, the operative evidence is the HKDSE
Statement/Certificate of Results itself. **Native grades are not force-converted to one
universal GPA.** HKDSE subject levels convert onto a shared 7-point scale (5\*\*=7 down to
U=0) — internal to the HKDSE scale, not a cross-qualification universal GPA. Non-JUPAS
applicants are read on their qualification's own native scale against each university's
own published minimum (IB points, A-Level grades, Turkish 100-point/5-point average). The
HKDSE itself plays a **dual role with no exact analogue among the Netherlands/Germany/
Italy patterns already documented**: it is simultaneously the local school-leaving
credential AND a centrally, externally graded standardized examination administered by
HKEAA — making a separate universal admissions test unnecessary for the local track.

## Predicted grades

**No native concept for the HKDSE/JUPAS track — its defining mechanic is that the Main
Round runs on ACTUAL, final HKDSE results**, structurally closer to Germany's
final-Abitur-result model than to the UK's predicted-grade-driven UCAS mechanic. (A
narrower School Principal's Nomination (SPN) pathway can involve pre-results
consideration; this was not deeply verified this pass and should not be read as the
general JUPAS mechanism.) For non-JUPAS/international applicants whose own curriculum
natively produces predictions (IB, A-Level), predicted grades **are** used operationally —
explicitly named as a required-if-applicable document at HKU ("Predicted grades/scores for
your upcoming examination issued by your school") — feeding conditional-offer decisions
made before final results are known, exactly the pattern the Netherlands showed for
foreign predicted grades. This is necessary because non-JUPAS deadlines (commonly around
early January) run many months ahead of July IB/A-Level results, independent of HKDSE's
own July timeline.

## Conditional vs. unconditional admission

The concept exists in both tracks but is used structurally differently. For JUPAS/local
applicants, the ordinary Main Round offer is issued **after** HKDSE results are released,
so for most applicants there is no meaningful predicted-grade-conditional stage at the
point of the primary decision — closer to "final results in, offer out" than to a
conditional-then-confirmed model (a narrower pre-results mechanism was referenced for SPN
nominees specifically, not fully verified this pass). For non-JUPAS/international
applicants, conditional offers are the norm for anyone applying before final results are
available — HKU's own guidance confirms it "may extend conditional offers to non-JUPAS
candidates... conditional upon obtaining necessary examination results."

## Subject prerequisites

Programme-specific rather than governed by one codified national subject-profile system —
Hong Kong has no analogue to Dutch VWO's four fixed profielen. HKDSE students themselves
choose 4 compulsory core subjects (Chinese Language, English Language, Mathematics,
Citizenship and Social Development) plus 1-4 electives from roughly 20 options, but this
is a flexible selection structure, not a small set of named profiles universities key
requirements off. STEM/engineering programmes commonly require Mathematics at Advanced
Level (HKUST: Mathematics at Advanced Level required for STEM-track admission; Further
Mathematics counts toward but doesn't replace it); competitive IB-track quantitative
programmes commonly expect 3 Higher Level subjects including a quantitative HL subject.

## Standardized tests

**Not mandatory nationally in the SAT/ACT sense for either track.** For local/JUPAS
applicants, the HKDSE's dual role (school-leaving credential + centrally-graded
standardized exam) makes a separate universal test unnecessary. For non-JUPAS/
international applicants, SAT/AP surface only as supplementary or qualification-specific
evidence for US-diploma-pathway applicants (HKU cites a minimum redesigned SAT of 1350),
not as a requirement imposed on IB, A-Level, or other qualification types. No Hong
Kong-specific bespoke aptitude test (comparable to TU Delft's Mathematics + Systematic
Reasoning test, or the UK's UCAT/LNAT/TMUA) was identified for HKU/CUHK/HKUST undergraduate
Medicine, Law, or Business in sources reviewed — not exhaustively verified, so treat as a
gap rather than a confirmed absence. Separately, TOEFL iBT itself is transitioning to a new
score-reporting scale for tests taken from 21 January 2026 — a real, time-sensitive,
test-specific change independent of Hong Kong admissions policy.

## Language requirements

Two distinct evidentiary paths. For local/JUPAS applicants, HKDSE's own English Language
subject result is commonly treated as sufficient English evidence (all HK undergraduate
programmes outside Chinese-specific tracks are predominantly English-medium); a
HKEAA/British Council benchmarking study maps HKDSE English Level 5 to roughly IELTS 7.0,
Level 5\* to roughly IELTS 7.5, Level 4 to roughly IELTS 6.5 — explicitly described as a
reference correlation, **not an official automatic conversion**. For non-JUPAS/
international applicants, a separate test is required unless exempted (first-language
English, or English-medium prior education). **Variation begins at the university level,
and inconsistently even within one university's own pages**: HKU's general baseline is
IELTS 6.0 (no subtest below 5.5) or TOEFL iBT 80, but HKU's own Turkey-specific
qualification page states a materially higher IELTS 6.5 or TOEFL iBT 93 — a genuine
inconsistency across HKU's own published pages that should be resolved by checking the
specific, currently-live page for the applicant's exact qualification, not by assuming
either figure is universally authoritative. HKUST states an equivalent 80/6.0 baseline;
CUHK separately excludes IELTS One Skill Retake, Indicator, and Online score reports.

## Application timing

JUPAS runs a single, nationally-synchronized cycle: standard application period 9 October
2025 (9:00am) to 3 December 2025 (5:00pm); late period 5 December 2025 (9:00am) to 27 May
2026 (5:00pm) at a higher fee. The Main Round offer follows HKDSE results release — the
exact 2026 results-release date was **not** confirmed from a primary HKEAA source this
pass (hkeaa.edu.hk returned repeated access errors to automated fetch), though the
sequencing itself (results, then offers) is confirmed. Non-JUPAS deadlines are
university-specific and **not synchronized with JUPAS or each other**: CUHK's 2026-entry
cycle runs an advance offer round (13 November 2025), a regular round (8 January 2026),
and an extended/rolling deadline (29 May 2026); HKUST's main round deadline is 8 January
2026; HKU "normally opens in September/October" with a first-round deadline not confirmed
this pass and rolling consideration "subject to programme availability" thereafter. No
numerus-fixus-style earlier deadline exists for capacity-constrained programmes within
JUPAS — Medicine and other capped fields share JUPAS's single timeline; the capacity
constraint operates through the merit-order mechanism at decision time instead.

## Application strategy constraints

JUPAS allows up to **20 programme choices, grouped into 5 preference bands** (Band A =
choices 1-3, Band B = 4-6, and so on). Institutions see only which band an applicant
placed a programme in, **not the applicant's exact rank order**, until after Main Round
results are announced — a deliberate anti-gaming design with no direct analogue among the
six countries already documented. Per JUPAS's own statistics, most offers come from Band A
choices. The Main Round then produces **exactly one offer per applicant** via a computer-
run "iteration process" matching applicant preference order against each programme's own
merit-order list — **neither a UK-style firm/insurance dual-offer mechanic nor a simple
sequential ranked list**, but a simultaneous, blinded matching/clearing algorithm. Non-
JUPAS has no equivalent shared choice-limit concept because there is no shared platform: an
international applicant pays a separate fee (CUHK: HK$500) and submits a wholly separate
application to each university individually. JUPAS's own fee (not paid by non-local
applicants) is HK$460 standard / HK$810 late.

## Personal statement / essays

Not identified as a requirement of JUPAS's core local pathway in sources reviewed (a
narrower SPN mechanism may involve additional material, not deeply verified this pass).
For non-JUPAS/international applicants, a personal statement is commonly required at the
university/programme level — explicitly named among the materials HKU Business School's
admission decisions rely on. Programme-scoped, not a Hong Kong-wide universal feature, the
same pattern documented for the Netherlands' numerus fixus motivation letter.

## Recommendation letters

**Inconsistent treatment even within sources reviewed — itself the finding worth
recording.** HKU Business School's own non-JUPAS document list marks its reference letter
as explicitly "(optional)"; a separate general description of HKUST's non-JUPAS document
set names "recommendation letters" among required documents without the word optional. No
source described recommendation letters as a factor in the standard local JUPAS pathway.
Do not assume one Hong Kong-wide answer — verify the current, specific programme's own
checklist.

## Extracurricular activities

Not documented as a primary factor in JUPAS's core Best-5-score/merit-order mechanism for
the ordinary local applicant. A named School Principal's Nomination (SPN) pathway exists
within JUPAS that appears related to non-purely-academic or principal-endorsed factors, but
its precise mechanism and weight were not deeply verified this pass. For non-JUPAS/
international applicants, a CV/resume is explicitly **optional** at HKU Business School
(capped at two A4 pages) — suggesting supporting-context status rather than an
independently-weighted primary category, directionally similar to but less firmly
evidenced than the Netherlands' finding.

## Interviews / tests / portfolios

Confirmed, programme-specific, concentrated in competitive professional non-JUPAS/
international programmes: **HKU Medicine** (Multiple Mini Interview / MMI format;
interviewers may switch to Chinese to test proficiency), **CUHK Medicine** (panel format),
**HKU Law** (interviews including via Zoom), **HKU Business** (optional, shortlisted-
applicants-only, individual Skype/Zoom). HKUST states interviews are "not a compulsory part
of the Non-JUPAS application process" generally and are "conducted at the discretion of
individual programmes." No confirmed portfolio requirement for Art/Design/Architecture-type
programmes was found this pass — a genuine gap, not evidence none exists.

## Restricted / selective programmes

**Two distinct, stacked capacity constraints that should not be conflated.** (1)
System-wide: government-capped UGC-funded first-year-first-degree places at ~15,000/year,
reserved for local students; ~80% of these funded places fill via JUPAS, the remainder
(~600 places) via non-JUPAS routes serving mainland Gaokao candidates, associate-degree
graduates, and other local-but-non-JUPAS categories. (2) A separate non-local-student
enrolment ceiling, expressed as a percentage of the local student number — raised from 20%
to 40% for 2024/25, and to 50% from 2026-27 — but layered **additionally on top of**, not
carved out of, the protected 15,000 local places; non-local students under this quota are
self-funded. (3) Within both pools, individual programmes additionally set hard ceilings —
Medicine is the clearest example: CUHK offers 300 HKDSE-track places + 25 advanced-standing
places from 2025 entry, and describes non-JUPAS Medicine applicants as evaluated against a
"top 1-2% HKDSE-equivalent" standard rather than a separately published JUPAS/non-JUPAS
sub-quota.

## Admissions decision model

**Genuinely bifurcated by applicant type first, and only secondarily by programme
selectivity** — a sharper, more fundamental split than in any of the six countries already
documented, because it operates at "which system can this applicant even use" rather than
"is this specific programme capped." For LOCAL/JUPAS applicants: a merit-order/rating-and-
matching model — every programme, not only Medicine-type fields, rates eligible applicants
and has a hard place count; the iteration process matches preference order against each
programme's merit-order list, producing one offer at the applicant's highest-priority
cleared choice. Closer to a simultaneous clearing/matching mechanism than either a Dutch-
style binary threshold-equals-admission model or a UK-style firm/insurance system. For
NON-LOCAL/international (non-JUPAS) applicants — where the great majority of Turkish MEB/
IB/A-Level applicants sit — the model is university-specific holistic review: meeting a
published minimum establishes eligibility to be considered, not a guarantee (HKU and HKUST
both state explicitly that meeting the stated minimum does not guarantee admission, since
it is "competitive in nature").

## Safe inferences

JUPAS is categorically unavailable to a Turkish MEB/IB/A-Level-educated applicant (or any
non-local applicant) regardless of HKDSE status — the single most important structural
fact for ORYN to encode. Non-JUPAS is not a shared platform; an applicant targeting
multiple HK universities must plan for fully separate applications, fees, and deadlines.
The same named Turkish diploma type can carry different minimum thresholds at different
universities (HKU 4/5-or-70/100 vs. CUHK 80%) — never assume one university's published
threshold applies at another. Predicted grades matter operationally for non-JUPAS IB/
A-Level applicants even though HKDSE/JUPAS itself has no native predicted-grade concept.
Meeting a published minimum does not guarantee admission at either HKU or HKUST — both say
so explicitly. Financial proof (commonly ~HKD 100,000-150,000) is a visa/immigration
requirement enforced after an offer is made, not an admissions-committee factor. Interviews
for non-JUPAS applicants concentrate in specific competitive professional programmes
(Medicine, Law, and at some institutions Business), not universally.

## Unsafe inferences

Do not assume JUPAS's existence means Hong Kong has a UK/UCAS-style single national system
for all applicants — JUPAS explicitly excludes all non-local applicants. Do not describe
JUPAS's band-and-iteration mechanism as either a simple ranked list or UK-style firm/
insurance — it is a distinct blinded, simultaneous matching mechanism. Do not assume a
university's general published English threshold applies to every applicant type — HKU's
own general baseline and its Turkey-specific page genuinely disagree. Do not treat the
HKDSE-English-to-IELTS correspondence as an automatic guaranteed exemption — it is an
explicitly-labeled reference correlation, not an official conversion. Do not assume
recommendation letters are uniformly required or optional — sources disagree even within
one university's different faculties. Do not assume a bridge-year or supplementary-
qualification pathway exists for a Turkish applicant falling short of a threshold — none
was confirmed, and its absence from sources reviewed is a gap, not proof of non-existence.
Do not treat the rising non-local quota (40%→50%) as reducing local students' funded
places — official sources are explicit the 15,000-place local floor is protected and
unreduced.

## Eligibility, competitiveness, fit

**Eligibility**: two categorically different gates by applicant type — local status plus
an HKDSE result for JUPAS; a qualification type the target university has published a
policy for (or individual consideration) for non-JUPAS, typically a minimum average/
points/grade combination that is university-specific and sometimes qualification-and-
country-specific. **Competitiveness**: genuinely present in both tracks, not merely a
numerus-fixus-style exception layered on an otherwise-threshold system as in the
Netherlands. For JUPAS, every programme — not only Medicine-type fields — runs a merit-
order rating with a hard place count, so meeting a nominal minimum does not equal
admission; closer to the UK/US end of the spectrum for this track. For non-JUPAS, HKU and
HKUST both state explicitly that meeting the published minimum does not guarantee
admission; CUHK's "top 1-2% HKDSE-equivalent" non-JUPAS Medicine standard makes this
concrete. **Fit**: for JUPAS, expressed mainly through the programme's own rating criteria
(grades in relevant subjects) rather than a holistic narrative; for non-JUPAS, fit
assessment varies materially — from largely threshold-plus-transcript at less competitive
programmes to personal-statement/reference/interview-inclusive holistic review at
Medicine, Law, and Business specifically.

## Counselor actions

Confirm immediately whether the student is a "non-local" applicant for Hong Kong purposes
— this determines JUPAS is entirely unavailable and non-JUPAS routes at each target
university are the only path, regardless of any HKDSE result held. Because non-JUPAS is
not a shared platform, build a separate checklist, fee budget, and deadline tracker per
target university rather than assuming one unified process. For a Turkish MEB-diploma-only
student, check the specific target university's own published threshold rather than
assuming one Hong Kong-wide figure (HKU 4/5-or-70/100 vs. CUHK 80% vs. HKUST unconfirmed —
request directly). For IB/A-Level students, request predicted grades early, since non-
JUPAS decisions and conditional offers are built around them. For Medicine/Law/Business
targets, prepare for a likely interview and verify current-cycle format directly with that
school. Never treat meeting a published minimum as equivalent to admission in either track.
Separate financial-proof planning (visa-stage) from admissions planning. Verify the
specific, currently-live English-requirement page for the student's exact qualification
rather than relying on one university-wide figure. Where nothing confirmed exists (HKUST's
Turkish threshold; a bridge-year mechanism; YKS relevance) — tell the family this is
unresolved and needs direct confirmation from the university, not an inferred figure.

## Data model implications

Hong Kong requires representing, as a **first-class distinction preceding any
qualification-level logic**, which of two entirely separate admission systems an applicant
belongs to (local/JUPAS-eligible vs. non-local/non-JUPAS-only) — coarser and more
consequential than the usual national/platform/university/programme layering alone
captures, since it changes platform, timeline, fee structure, and decision mechanism before
any qualification-specific rule is reached. Within the non-JUPAS branch (where essentially
all Turkish/internationally-educated applicants fall), the familiar four layers still
apply: national/government policy (the 2020 all-non-local-use-non-JUPAS rule; the
15,000-place funding floor; the 40%→50% quota ceiling), platform (not applicable to
non-JUPAS at all — no shared platform layer exists there), university (each institution's
own qualification-by-qualification, sometimes country-specific, minimum-grade tables — the
Turkish HKU-vs-CUHK contrast is the clearest evidence), and programme
(Medicine/Law/Business interview requirements, Medicine's own hard ceiling). A single "Hong
Kong requirement" record per qualification type would be actively misleading, and a model
that omits the local/non-local gate would misroute every Turkish/international applicant
into a system (JUPAS) they cannot use.

## System / university / programme override model

**Layer 0 (applicant-type gate, prior to the usual four layers and specific to Hong
Kong)**: whether an applicant is "local" or "non-local" under HKSAR Government policy
determines which entire system is even available; set by government policy, cannot be
chosen or waived by applicant or university. **Layer 1 (national/government)**: the
15,000-place local funding floor and the 40%-rising-to-50% non-local quota ceiling, set in
government/UGC policy, uniform system-wide. **Layer 2 (national credential-recognition
baseline)**: HKCAAVQ's individual qualification-assessment opinion, referencing the Hong
Kong Qualifications Framework, functions similarly to Nuffic in the Netherlands as a
system-level reference that doesn't itself bind any university's decision. **Layer 3
(university)**: each institution — for non-JUPAS applicants, since JUPAS's own rating
criteria are the platform-layer mechanic for local applicants — sets its own binding
minimum-grade table per qualification type and sometimes per country (the HKU-70/100-vs-
CUHK-80%-for-the-same-Turkish-diploma-type contrast is the clearest confirmed evidence).
**Layer 4 (programme)**: individual programmes layer on subject prerequisites, interview
requirements (concentrated in Medicine/Law/Business), and — for capacity-constrained fields
— their own hard place count and competitive standard (CUHK's "top 1-2%" description for
non-JUPAS Medicine). ORYN should never present a Layer 3/4 fact as a Layer 0/1 national
fact — and, uniquely among the countries researched so far, should never assume a Layer
1/2 platform mechanic (JUPAS itself) is even reachable without first confirming the
applicant clears the Layer 0 local/non-local gate.

## Unresolved questions

HKUST's specific minimum-grade threshold for Turkish Lise-type diplomas — not found despite
Turkey being a confirmed accepted country. The exact 2026 HKDSE results-release date and
its precise gap before JUPAS Main Round offers (sequencing confirmed, specific date not
primary-verified; hkeaa.edu.hk blocked automated fetch repeatedly this session). HKU's
specific non-JUPAS first-round deadline date for 2026 entry (confirmed only as "normally
opens September/October," rolling thereafter). The full mechanism and actual weight of
JUPAS's School Principal's Nomination (SPN) pathway, including whether it meaningfully
incorporates extracurricular/non-academic factors. Whether IB/A-Levels alongside Turkish
schooling shifts evaluation to the IB/A-Level table, as in the Netherlands — plausible by
pattern, not confirmed for Hong Kong. Any role of Turkey's YKS exam in a Hong Kong
university's assessment — unaddressed in sources reviewed. Whether any HK-specific
bridge-year or supplementary-qualification pathway exists for shortfall cases — not
identified. Portfolio requirements for Art/Design/Architecture-type programmes via
non-JUPAS. Full current-cycle non-JUPAS seat counts for Medicine at HKU/HKUST specifically,
and for Law/Dentistry at any of the three universities sampled (only CUHK's Medicine
figures were confirmed with specific numbers). Whether recommendation letters are required
or optional at CUHK and HKUST specifically (only HKU Business School's "optional" framing
was directly source-confirmed).
