# Singapore — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**No centralized application platform of any kind.** Singapore has six government-funded
"Autonomous Universities" (AUs) — National University of Singapore (NUS), Nanyang
Technological University (NTU), Singapore Management University (SMU), Singapore
University of Technology and Design (SUTD), Singapore Institute of Technology (SIT), and
Singapore University of Social Sciences (SUSS) — each a separately governed statutory
body running its own fully independent application process, portal, deadlines, and
decision. NTU's own admissions pages state explicitly that its Office of Admissions "does
not engage any 3rd party agent/organization/company" and that all correspondence comes
only from NTU itself. A student targeting NUS, NTU, and SMU in one cycle submits three
separate applications, pays three separate fees, to three separately-deciding offices —
there is no UCAS/Common-App/Studielink-style front door. The **Joint Admissions Exercise
(JAE)** does exist, but governs a materially *earlier* transition — O-Level holders into
Junior Colleges, Millennia Institute, polytechnics, and ITE — and has no role in
university admission; conflating the two is a genuine risk.

Two thin layers do sit above the otherwise fully decentralized picture. First, a **shared
acceptance-stage platform** — the Joint Acceptance Portal (JAP) — where applicants
holding simultaneous offers from more than one AU choose which to accept, during an
annual coordinated window (observed instance: 1–16 June 2026). This is confirmed in use
by NUS (whose own Important Dates and Application Overview pages link directly to
jointacceptance.edu.sg) and NTU (whose admissions FAQ references making a "final
decision between the reserved placing and the new offer in the Joint Acceptance
Portal"); SMU's participation is corroborated only by secondary student-forum sources.
JAP is never an application platform — every decision it coordinates has already been
made independently by each AU. Second, a **shared scoring methodology** for local
Singapore-Cambridge A-Level applicants: the University Admission Score (UAS, colloquially
"rank points"), whose own FAQ document refers generically to "AU admissions," suggesting
a jointly-used formula that each AU then benchmarks against its own Indicative Grade
Profile (IGP) cut-off band and layers its own bonus schemes on top. Neither shared layer
implies shared decision-making. Admission is direct-to-programme from the outset —
applicants rank specific degree choices at the point of application, with no
deferred-declaration/"undeclared" pathway found.

## B. Qualification eligibility

**No Singapore equivalent of Nuffic/Anabin was found** — no national body publishing a
general comparative table of foreign qualifications against a Singapore reference level.
MOE oversees the 6-AU sector (funding, the Tuition Grant framework, the
international-enrolment ceiling — see below) and, through the Singapore Examinations and
Assessment Board (SEAB), administers the local national exams; nothing suggests SEAB
evaluates foreign credentials or decides admission. In this baseline's absence, **each AU
independently maintains and publishes its own qualification-specific minimum table** —
for named groups (Singapore-Cambridge A-Level, Polytechnic Diploma, IB Diploma, NUS High
School Diploma) and for dozens of named foreign national qualifications under an
"International Qualifications" category.

At least six structurally distinct entry pathways exist, each evaluated under a
**different logic**, not one common scale: (1) Singapore-Cambridge A-Level, scored via
UAS/rank points; (2) **Polytechnic Diploma**, scored on the polytechnic's own cumulative
GPA (0–4.0 scale) plus diploma-programme relevance — a genuinely different evaluative
mechanism, not a rank-points conversion of it, confirming a real "two native pathways,
different evaluation logic" finding parallel to the Netherlands' VWO-vs-HBO-propedeuse
split; (3) NUS High School Diploma (one named school); (4) IB Diploma, its own
actual-or-predicted-grade track; (5) International Qualifications for Singapore
Citizens/PRs; (6) International Qualifications for Foreigners — dozens of named
qualifications (non-Singapore A-Level, US diploma+AP, French/European/Swiss
Baccalaureate, German Abitur, Indian Standard 12, HKDSE, Gaokao, and, among many others,
Turkish High School Certificate), each carrying its own AU-published minimum and, often,
a mandatory supplementary qualification. University discretion here is **substantial and
sharper than any single-country case documented elsewhere in this package**, precisely
because no shared national baseline sits underneath it — see the Türkiye section below
for the clearest evidence.

## Applicant educated in Türkiye

**Genuinely varies by AU, more sharply than any comparable finding elsewhere in this
package.** NUS's own "Turkish High School" admission-requirements page states a completed
Turkish High School Graduation Certificate/Diploma with an overall GPA of **4.3** is
sufficient for a competitive application to **all** programmes, with **no supplementary
standardized test required** once the diploma is complete (a test is required only for
applicants still finishing their final exam at application time). NTU's "Other
International Qualifications" table instead states, for "Turkish High School
Certificate": "GPA of at least 90 or 4 in final high school exam" **AND** explicitly "No,
required additional qualification (see below)" — meaning at NTU a Turkish diploma,
**however high the GPA, is never sufficient alone**; a supplementary AP (3+ exams scored
4–5, AP Calculus BC compulsory for Engineering/most Science) or A-Level (3 subjects, ≤2
sittings, named exam board) is always required. SMU's general rule — applying to its full
list of ~25 named international qualifications, which explicitly includes "Turkish High
School" as its own category — requires a standardised test score (SAT/ACT/IELTS/TOEFL/C1
Advanced/PTE/SMU's own Aptitude Scholastic Test) for every applicant **except** IB Diploma
holders and specific named local arts-school diploma holders. **Three AUs, three
qualitatively different treatments of the identical input credential** — sharper than
even the Netherlands' Tilburg-vs-VU contrast, because here it isn't just a different
threshold but a different *kind* of requirement (none vs. mandatory-AP/A-Level vs.
mandatory-test).

AP/IB/A-Level materially changes the picture, and at NTU is not merely helpful but
**mandatory** regardless of the underlying Turkish GPA. A Turkish-educated student who
holds a full IB Diploma instead would apply to NUS via its wholly separate IB Diploma
track — with its own actual/predicted-grade mechanism — sidestepping the "Turkish High
School" criteria entirely. No source reviewed describes any role, positive or negative,
for Türkiye's YKS/TYT/AYT national entrance exam in any AU's evaluation of a Turkish
diploma holder — a genuine, unresolved gap, mirroring the identical open question already
flagged in this package's Netherlands research. No dedicated foundation-year/bridge
pathway comparable to the Netherlands' "one year of completed Turkish Lisans credits"
route was found at NUS, NTU, or SMU; where a plain diploma is insufficient, the stated
remedy is always *adding* a supplementary qualification, never completing a bridging year
of higher education first — a genuine absence in sources reviewed, not confirmation no
such route exists anywhere. Recognition here is sharply university-specific, and more
fragmented than the Netherlands/Germany/Italy cases in this package, because Singapore has
no shared national recognition baseline underneath the three AUs' independent thresholds.

## Academic evidence used

For local A-Level applicants, the operative evidence is the official SEAB result slip
feeding UAS computation, not a US-style multi-year transcript. Local grades convert to
UAS (General Paper + best three H2 content subjects, plus an optional fourth
subject/Mother-Tongue-Language bonus if it improves the score), benchmarked against each
AU's own Indicative Grade Profile — a **prior-cycle** percentile band explicitly framed
(including by independent calculators built on the official data) as indicative, not
predictive. Polytechnic grades are read on their own native cumulative-GPA scale against
a **separate**, poly-specific IGP band — not converted into UAS at all, reinforcing the
two-pathway finding above. Foreign qualifications are read on their own native scale
against each AU's own published per-qualification minimum.

A distinctively Singapore-specific evidentiary layer: local A-Level applicants must also
satisfy a **Mother Tongue Language (MTL)** requirement (minimum grades in Chinese/
Malay/Tamil or an approved substitute/exemption), stated as applicable "regardless of
nationality" on NUS's A-Level page. For the separate IB Diploma track, by contrast, MTL
applies only to Singapore Citizens/PRs (any school) and to any-nationality students at a
short named list of Singapore independent schools — other IB World School applicants
(e.g., a Turkish student at a Turkish IB school) are explicitly exempt. MTL is a
civic/bilingual-education requirement, never an English-proficiency measure — keep it
conceptually separate from the language_requirements section below.

## Predicted grades

**Genuinely mixed, dependent on qualification group and calendar timing, not a uniform
Singapore feature.** For the dominant local pathway, predicted grades are structurally
unnecessary: SEAB releases official A-Level results (e.g., 27 February 2026 for the
November 2025 sitting) **before** the local application window opens (NTU's confirmed
AY2026/27 window: 27 Feb–19 Mar 2026) — applicants apply with final results already in
hand. This produces the same practical outcome as the Netherlands' "no native
predicted-grade artifact" finding, but for a different reason: calendar sequencing, not
curriculum design.

Predicted grades ARE used operationally for IB Diploma May-session sitters at NUS —
required to "apply with the predicted IB Diploma Programme results, as attested by their
high schools" — since May IB results aren't out until July. More broadly, at **SMU**, any
international qualification without final results by the deadline requires "predicted
high school scores as attested by your school teacher/counsellor," with SMU explicitly
stating "self-declared predicted scores will not be accepted." This is a **wider** use of
the predicted-grade concept than NUS's own non-IB "still completing" case (e.g., Turkish
High School in progress), which asks only for the "most recent High School exam results
prior to graduation" — an in-progress actual transcript, not a forward-looking teacher
prediction. A genuine, sourced mechanism difference between two AUs handling the
identical underlying situation. NUS's IB mechanism also differs structurally from the
UK/Netherlands conditional-offer pattern: rather than issuing an early offer that
converts once grades confirm, NUS appears to withhold the **decision itself** for IB
May-sitters until actual results are known ("outcomes by the third week of July 2026").

## Conditional vs. unconditional admission

Exists, through **at least three structurally different mechanisms**, not one uniform
pattern. (1) Results-pending: either the decision itself is deferred until results are
known (NUS's IB-May-sitter mechanism, above) or a conventional contingent offer is issued
now and confirmed later (NUS's Polytechnic-Diploma-still-completing applicants receive an
offer explicitly "contingent upon the submission of your final semester's results as
proof of your diploma completion"). These are genuinely different mechanisms for the same
underlying problem and should not be collapsed into one description. (2) **Mother Tongue
Language provisional admission**: an applicant meeting every other requirement except MTL
"will be admitted to the University on a provisional basis" and required "to fulfil the
MTL requirement before they graduate" — a conditionality tied to a *graduation*
requirement, not an entry-grade one, and a genuinely distinct category. (3) The Joint
Acceptance Portal is **not** itself a conditionality mechanism — it sequences a choice
among already-independently-decided offers; NUS's own guidance ("accept the offer while
waiting for an appeal outcome or outcome from another university") suggests some
flexibility in that choice, but this is a separate concept from grade- or
language-conditionality.

## Subject prerequisites

Real, and set at **programme/faculty level** within each AU, layered on top of the
qualification-group requirement. Confirmed examples: NUS Law-related programmes require
at least Grade B in General Paper (2025+ cohort), with a stated bypass (Grade E in
GP/KI plus SAT Reading & Writing ≥700) for applicants who fall short; NTU requires A-Level
Mathematics/Further Mathematics or AP Calculus BC specifically for Engineering and most
Science, as a condition of its foreign-diploma "additional qualification" bridge; SMU
states "a good pass in Mathematics" generally, with a further specific requirement for
Economics and Computer Science.

Independent of any programme, Singapore's national A-Level curriculum imposes two
structural rules that shape available evidence rather than gating admission directly: a
compulsory **"contrasting subject"** rule (every student must take at least one subject
outside their specialization stream — a Mathematics & Science subject for Arts-stream
students, a Humanities & Arts subject for Science-stream students), and a compulsory
General Paper (or, for the 2024-and-earlier cohort, Knowledge & Inquiry in lieu)
component. Mother Tongue Language functions as its own compulsory-subject-style
requirement for local A-Level applicants — see above for its scope and the caveat against
conflating it with language proficiency.

## Standardized tests

**Not a general/baseline requirement for the dominant local pathway** — A-Level applicants
don't sit SAT/ACT as part of standard admission. But standardized tests (chiefly SAT,
also ACT and SMU's own Aptitude Scholastic Test) surface in **at least five genuinely
different supplementary roles** across the three AUs — the clearest cross-cutting pattern
found in this research, and one that should never be flattened into a single "Singapore
requires the SAT" rule:

1. **Foreign-qualification eligibility bridge** (NUS): SAT/ACT-w-Writing/AP required only
   for international-qualification applicants (e.g., Turkish High School) who haven't yet
   completed their final exam — evidence establishing a competitive application before
   final results confirm. Directly parallel to this package's Netherlands finding of
   SAT/AP used to help establish VWO-equivalence for specific diploma types.
2. **Local subject-requirement bypass** (NUS): a minimum SAT Reading & Writing score of
   700, combined with a lower General Paper grade, is an explicit alternate route into
   Law-related programmes for **local** A-Level applicants who miss the standard GP bar —
   unrelated to foreign-credential evaluation.
3. **Restricted-programme supplement** (NUS Medicine/Dentistry): predicted IB results plus
   *either* UCAT (UK or ANZ) *or* [SAT/ACT-w-Writing **and** AP Exams], required alongside
   the standard interview/test process.
4. **English-proficiency-proof alternative** (NTU): a minimum SAT score of 1250
   (redesigned scale) is one of several acceptable ways — alongside IELTS/TOEFL/PTE/ACT-
   w-Writing/C1 Advanced — to satisfy English requirements for non-English-medium
   applicants. A proficiency role, not an aptitude role.
5. **Blanket qualification-track requirement** (SMU): a minimum total SAT score of 1,350
   is one of six interchangeable options SMU requires for most non-IB, non-named-local-
   arts-school international-qualification holders — the broadest, most systematic use of
   SAT among the three AUs.

No evidence of any SAT/ACT role for local Polytechnic Diploma applicants. Score validity
is stated as 5 years by both NUS and SMU (SMU: scores from before 19 March 2021 not
considered for the 2026 exercise).

## Language requirements

English is the medium of instruction system-wide, so applicants whose entire prior
education was in English generally face no separate proficiency test. For non-English-
medium international-qualification holders: NTU requires IGCSE/O-Level English (Grade A
or 7/9) or IELTS (Overall 6, no sub-band below 6) or TOEFL iBT (Overall 90; adjusted bands
from January 2026) or SAT (≥1250) or PTE Academic (Overall 55) or ACT-w-Writing (composite
≥30) or C1 Advanced. SMU's rule is **broader**: a standardized test (SAT/ACT/IELTS/TOEFL/
C1 Advanced/PTE/AST) is required as a single combined academic-and-language gate for most
non-IB international-qualification holders, regardless of instruction language, rather
than a narrower language-only trigger. IB Diploma holders and holders of specific named
local arts-school diplomas (LASALLE, NAFA, NIE) are exempted from SMU's requirement; NUS
requires English scores for IB applicants only if at least three IB subjects were taught
in a non-English language.

Must be kept entirely separate from **Mother Tongue Language**: MTL is a bilingual-
education/civic requirement tied mainly to Singapore Citizens/PRs and specific local
schools, evaluated in Chinese/Malay/Tamil — a different fact type from an IELTS/TOEFL-
style proficiency test for non-native English speakers. This is a clean new instance of
the general principle already encoded as RULE-ADMISSIONS-009 in this package's ruleset,
here applied to two *different* local-language requirements rather than the Germany
DSD-vs-Anabin pattern that rule was originally drawn from.

## Application timing

**No single national deadline exists** — deadlines are set independently by qualification
group within each AU, and further vary by AU. For the AY2026-2027 cycle (the most
recently completed at time of writing; a later-cycle NUS page showed dates that appear to
be unconfirmed template placeholders and were not relied upon):

**NUS**: International Qualifications for Foreigners (incl. Turkish High School) closed
23 February 2026; IB Diploma window ran roughly mid-December 2025 to mid-February 2026,
with transcript/code deadlines running into June/July depending on exam session;
Singapore-Cambridge A-Level opened the third week of February and closed 19 March;
Polytechnic-Diploma-still-completing students needed to graduate before 3 August 2026
(AY2026-27 commencement). **NTU**: A-Level 27 Feb–19 Mar 2026; Polytechnic 1–21 Feb 2026
(extended to 1 Mar); IB and International Qualifications 15 Oct 2025–19 Mar 2026; NUS
High School Diploma-equivalent group 1 Dec 2025–20 Jan 2026. NTU states "only one intake
per academic year, typically with the term commencing in late July." **SMU**:
International and Other Qualifications 17 Nov 2025–19 Mar 2026, standardized test scores
(actual or predicted) due 31 Mar 2026, decisions released May–Jul, 2nd-window
offer-holders must respond by 16 Jun 2026. **Joint Acceptance Period** (live portal,
confirmed): 1–16 June 2026, after which acceptances propagate to each AU's own applicant
portal three calendar days later.

## Application strategy constraints

No shared/national cap on how many AUs a student applies to in one cycle — unlike the
Netherlands' Studielink-enforced numerus-fixus cap, each AU application is fully
independent with its own fee. Within NUS specifically: applicants rank programme choices
first-to-last on one form, cascading automatically if a higher choice isn't met. Medicine,
Dentistry, and Law must be ranked within the first one or two choices to be considered for
shortlisting (Law may sit third if Medicine and Dentistry occupy the first two);
Architecture, Industrial Design, Landscape Architecture, and Nursing must sit within the
first three — a **ranking-position gate**, not just a grades gate, distinctive among the
countries in this package. NUS's "First Choice Bonus Points Scheme" adds bonus points to
a programme's UAS-based comparison when it's ranked genuinely first, for A-Level,
Polytechnic-Diploma, NUS-High-School-Diploma, and IB applicants — an incentive-design
feature with no documented NTU/SMU equivalent. Each AU application carries its own
non-refundable fee (NUS: S$10 most applicants / S$20 International Students with
International Qualifications) — applying to multiple AUs multiplies cost and paperwork.

## Personal statement / essays

**NUS**: not a freeform personal statement, but a **mandatory structured component for
every applicant to every programme**, built into the standard application — up to four
listed achievements/co-curricular activities plus character-limited short-response
questions, explicitly described by NUS as holistic assessment that "subsumes the
Aptitude-Based Admission of earlier years." **SMU** is described (secondary-corroborated,
lower confidence) as similarly holistic. No equivalent mandatory mechanism was found on
the **NTU** pages reviewed — a genuine gap, not evidence NTU lacks one. Where present, the
mechanism is structured/short-form and folded into every application by default, closer
to a mandatory activities-and-short-answers module than a single UCAS-style free-form
essay shared across choices.

## Recommendation letters

**No evidence found** of a standard recommendation-letter/reference requirement at NUS,
NTU, or SMU undergraduate admission in any page reviewed. Read as "largely absent" rather
than "occasionally present but unverified" — consistent in direction with several other
countries in this package, though surfacing even less here than in the Dutch case, and a
genuine structural difference from the US.

## Extracurricular activities

**Not weighted uniformly across the AUs** — a genuine, sourced within-Singapore
variation. At **NUS**, extracurricular evidence is explicitly, formally, and universally
incorporated: every applicant to every programme lists up to four achievements/CCAs
(named examples include International Science Olympiad medals, national-level sports/arts
representation, community service, internships, outside-school leadership positions,
entrepreneurship, notable independent technical projects), feeding directly into each
College/Faculty/School's holistic review — structured, weighted, universal, not indirect
or optional. At **SUTD**, activity/CCA evidence enters through an explicit
portfolio-plus-qualities assessment that SUTD's own news page describes as designed to
admit some academically-weaker applicants who show strong non-cognitive signals. **SMU**
is described (secondary-corroborated) as similarly holistic. No equivalent explicit
mechanism was confirmed for **NTU**. Must not generalize NUS's exact mechanism onto NTU
without separate confirmation.

## Interviews / tests / portfolios

Confirmed for specific restricted programmes and specific qualification categories, not
as a general mechanism. **NUS Medicine/Dentistry**: IB-track applicants submit predicted
results plus UCAT or SAT/ACT+AP, alongside NUS's general statement that "programmes
requiring additional interviews/tests" assess performance at them. **NUS Law**:
ranking-position-gated shortlisting for interview/test (see above); the specific test
format was not independently primary-verified this pass. **SUTD**: interviews for
"selected candidates" as an explicit official part of its holistic, portfolio-inclusive
process. **NTU**: an interview is explicitly named as required for at least one specific
foreign-qualification category (Mongolia's Certificate of Complete Secondary Education)
and "may be conducted" for Direct-Admission Olympiad-medalist candidates — evidence NTU
uses interviews selectively, keyed to qualification type or applicant category, not
universally. SUTD is the most clearly confirmed portfolio-driven AU researched in depth
this pass; Architecture/Industrial-Design-style portfolios at NUS are plausible but not
independently primary-verified. Not applicable to the standard local A-Level or
Polytechnic pathway into most non-restricted programmes.

## Restricted / selective programmes

**No Singapore equivalent of a national numerus-clausus law was found** — no government
framework setting and coordinating fixed intake caps for a defined subject list across all
AUs, unlike the Netherlands/Germany/Italy. Capacity restriction instead operates through
two structurally different mechanisms. First, **programme-level ranking gates**: at NUS,
Medicine/Dentistry/Law/Architecture/Industrial-Design/Landscape-Architecture/Nursing are
restricted primarily through the ranking-position rule described above, layered on top of
the ordinary UAS/IGP competitive comparison, rather than through a numeric cap
communicated directly to applicants.

Second, and **genuinely distinctive — not documented for any other country in this
package**: Singapore applies a **system-wide policy ceiling on the proportion of
international undergraduates** across the AUs as a category, independent of any single
programme's capacity. An official MOE parliamentary reply (12 September 2022) states the
proportion of international students at undergraduate level "has remained at around 10%
in recent years," Singapore Permanent Residents comprise "less than 5%," and among
international students roughly 20% are full-fee-paying while the remaining ~80% receive
MOE Tuition Grant funding carrying a 3-year post-graduation work-bond obligation in
Singapore. A non-citizen/non-PR applicant's competitiveness is therefore shaped by an
aggregate, **nationality-linked** policy factor with no documented analogue in the
US/UK/Netherlands/Italy/Germany/Canada systems already researched — restriction "by
nationality quota," not only by programme capacity. This is the lead the task brief asked
to verify, and it is **confirmed**.

NUS's current holistic-assessment mechanism explicitly "subsumes" an earlier, narrower
"Discretionary Admission"/Aptitude-Based-Admission scheme that secondary sources describe
as historically covering up to ~15% of intake for applicants below the standard cut-off
who showed exceptional non-academic traits — since NUS's own live page frames the
*current* mechanism as integrated into standard review for every applicant, the "~15%"
figure should be read as **historical/superseded context, not current policy**. NTU
separately runs a named "Direct Admission" scheme for medallists of nine named
International Science Olympiads, giving more favourable consideration for related
programmes.

## Admissions decision model

**Competitive/ranking-based for the default pathway, not qualification-threshold-based —
a genuinely different default posture from the Netherlands' or Italy's non-selective-
programme model already documented in this package**, and the single most important
structural fact for ORYN to encode correctly here. NUS's own pages state directly, for
default (non-restricted) programmes: "Admission will be considered holistically based on
academic merit, non-academic achievements, and additional interviews/tests (if required)
as well as **open competition among all eligible applicants**." Meeting stated
prerequisites establishes eligibility to compete, not a right to a place — the UAS/rank-
points comparison against a moving, prior-cycle IGP band is inherently a ranking
mechanism even for ordinary programmes, not a narrow numerus-fixus-style carve-out. This
makes Singapore's default posture closer in spirit to the US/UK competitive model than to
the Netherlands/Italy threshold model, achieved through a locally distinctive scored
mechanism (UAS) rather than US-style unscored holistic review or UK-style predicted-grade
conditional offers. The same open-competition-against-a-percentile-band logic applies to
Polytechnic-Diploma applicants, on the GPA scale instead of UAS. No AU publishes a
disclosed numeric admission-probability formula; IGP bands are explicitly framed as
descriptive of the *prior* cycle only, not predictive or guaranteed.

## Safe inferences

There is no centralized undergraduate application platform in Singapore of any kind —
each of the 6 AUs must be applied to separately. The Joint Admissions Exercise has no
role in university admission — it governs the earlier O-Level-to-JC/Polytechnic/ITE
transition only. Local A-Level applicants apply with final results already released, not
predicted grades, because SEAB's release date precedes the local application window. A
foreign secondary diploma's sufficiency for direct entry cannot be generalized across
NUS/NTU/SMU — the identical diploma at the identical grade is independently sufficient at
one AU, categorically insufficient without a supplementary qualification at another, and
gated behind a mandatory test at the third. Meeting an AU's stated minimum establishes
eligibility to compete, not entitlement to a place, for the ordinary pathway — Singapore's
default posture is genuinely competitive/ranking-based, unlike the Netherlands/Italy
threshold model. A non-citizen/non-PR applicant's competitiveness is shaped in part by a
system-wide, officially-confirmed international-enrolment ceiling (~10%) with no
equivalent in the other countries this package has researched. Mother Tongue Language and
English-proficiency requirements are two entirely different fact types and must never be
merged.

## Unsafe inferences

Do not assume SEAB's or JAP's existence implies any centralized admission-DECISION body —
SEAB only administers/issues results, JAP only sequences acceptance among
already-independently-decided offers. Do not assume SAT/ACT plays one consistent role —
this research found at least five qualitatively different roles, varying by AU and
applicant type. Do not assume extracurricular activity carries the same explicit,
structured weight at NTU that it demonstrably does at NUS or SUTD — no equivalent NTU
mechanism was confirmed. Do not assume the historical "~15% Discretionary Admission"
figure describes NUS's current mechanism — NUS's own page states the present approach
subsumes that earlier scheme and now applies to every applicant. Do not assume the UAS
formula is applied identically, with no AU-specific variation, at NTU and SMU — the only
primary-fetched methodology document is NUS-hosted; the identical-application claim for
NTU/SMU rests on third-party calculator sites, not an NTU/SMU-published methodology page.
Do not assume Türkiye's YKS plays any confirmed role in NUS/NTU/SMU's Turkish-diploma
evaluation — a genuine, unaddressed gap. Do not assume SUTD, SIT, and SUSS follow the same
architecture documented for NUS/NTU/SMU — SUTD's own materials confirm a materially
different (portfolio/qualities-first) model, and SIT/SUSS were not independently
researched to comparable depth this pass at all.

## Eligibility, competitiveness, fit

**Eligibility**: meeting the specific qualification-group's stated minimum for the target
AU (UAS component subjects plus MTL for local A-Level; polytechnic GPA plus diploma
relevance for Polytechnic Diploma; actual-or-predicted IB results plus subject
requirements; the AU's own per-country minimum plus, often, a mandatory supplementary
qualification for International-Qualifications-for-Foreigners applicants) — necessary but
explicitly not sufficient, since admission remains competitively decided even once
eligible. **Competitiveness**: explicit and structural for the mainstream pathway, not a
narrow selective-programme carve-out — UAS/GPA benchmarked against a shifting prior-cycle
IGP band, further shaped by programme-choice ranking position (NUS), and, uniquely among
the countries this package has researched, by an aggregate nationality-linked policy
ceiling on the international-undergraduate proportion (~10%) applying regardless of which
programme a non-citizen/non-PR applicant targets. **Fit**: expressed partly through the
mandatory achievements/short-response holistic component (NUS) and programme-specific
subject-prerequisite alignment, and, for Medicine/Dentistry/Law and SUTD generally,
through interview/aptitude-test/portfolio performance — closer to the US's
holistic-but-structured model than to the Netherlands' pure subject-match concept of fit.

## Counselor actions

Never present Singapore as having a UCAS-style shared application or decision system —
prepare each target AU as a fully separate application, portal, fee, deadline, and
decision. For a Turkish (MEB-only) student with no supplementary AP/A-Level/IB: check each
specific target AU's own current threshold individually — do not assume NUS's
"GPA 4.3, no supplementary test" pattern generalizes to NTU (always requires AP/A-Level
regardless of grade) or SMU (requires a qualifying standardized test in addition). Where a
target AU requires a supplementary qualification for a plain foreign diploma, plan for
that qualification's own timeline (AP scores due mid-July; A-Level results needed before
June) well ahead of the AU's own deadline. For IB-track students, identify November- vs.
May-session early: May sitters plan around a predicted-grade application and a decision
that may not arrive until the third week of July. For students targeting NUS
Medicine/Dentistry/Law/Architecture/Industrial-Design/Landscape-Architecture/Nursing:
confirm the required ranking *position* on the form, not just the grade requirement — a
strong applicant ranked too low won't be shortlisted regardless of academic strength. For
non-Singaporean/non-PR applicants, set realistic expectations using the officially-
confirmed ~10% international-enrolment ceiling as context — a structural competitiveness
factor with no equivalent in the US/UK/EU systems the student may simultaneously target.
Confirm whether a target programme is English-gated separately from any Mother Tongue
Language question — unrelated requirements despite both concerning "language." Where
SAT/ACT scores exist, clarify *which* of the several distinct Singapore roles they'd serve
for this student rather than treating "the SAT" as one uniform requirement. Clarify early
whether an offer implies MOE Tuition Grant funding (3-year Singapore work-bond after
graduation) or full-fee-paying status without a bond — a genuine financial/career-planning
decision point, not merely an admissions technicality.

## Data model implications

Singapore requires ORYN's data model to represent admission facts across at least six
distinct scope layers, more than any other country in this package: (1) national/sector
(MOE oversight of the 6-AU category, the international-enrolment ceiling, the Tuition
Grant/bond framework — none of which is a per-qualification recognition baseline the way
Nuffic/Anabin are); (2) exam-board (SEAB's administration of the A-Level, a layer that
exists but explicitly does not decide admission); (3) a thin, genuinely cross-AU platform
layer existing *only* at the acceptance stage (JAP) and, separately, in the UAS scoring
methodology (an input, not a decision); (4) AU/university (each of the 6 AUs sets its own
qualification-specific thresholds, IGP bands, bonus schemes, fees, deadlines — the
NUS/NTU/SMU three-way Turkish-diploma contrast is the sharpest evidence of university-
level override in this entire research package); (5) qualification-group *within* each AU
(A-Level/Polytechnic-Diploma/IB/NUS-High-School-Diploma/International-Qualifications
tracks each sit on a different evaluative scale, deadline, and evidence type, even within
one university); (6) programme/faculty (subject prerequisites, ranking-position gates,
restricted-programme testing). A single "Singapore requirement" record per qualification
would be even more misleading here than in the Netherlands case, because Singapore lacks
even the shared national recognition baseline the Dutch model has underneath its
university-specific thresholds — there is no system-level starting point to attach
overrides to; each AU's page is independently authoritative from the ground up.

## System / university / programme override model

**Layer 1 (national/sector, thin)**: MOE's oversight of the 6-AU category — the
international-enrolment ceiling (~10%), the Tuition Grant/bond framework, general funding
policy — applies uniformly and cannot be waived by any single AU, but is not a
qualification-recognition baseline the way national layers function in the
Netherlands/Germany/Italy. **Layer 2 (exam-board, thin and decision-free)**: SEAB
administers and issues A-Level results feeding UAS computation but does not itself decide
admission — mirrors this package's RULE-ADMISSIONS-012. **Layer 3 (shared-but-thin
platform/methodology layer, a Singapore-specific pattern not seen in the other 6
countries)**: JAP exists only at the acceptance/response stage, after each AU has already
independently decided; the UAS/rank-points formula is a shared scoring *input* that AUs
benchmark independently, not a shared verdict. **Layer 4 (AU/university, the dominant
layer of variation)**: each of the 6 AUs independently sets its own qualification-specific
minimum tables (the NUS/NTU/SMU Turkish-diploma three-way contrast is the sharpest
evidence of university-level override anywhere in this package), IGP bands, bonus
schemes, fees, deadlines, holistic-assessment mechanism, and language/test rules. **Layer
5 (programme/faculty)**: subject prerequisites, ranking-position gating, programme-
specific supplementary testing (UCAT/SAT+AP for Medicine/Dentistry) and interview
requirements. ORYN must never present a Layer 4 or 5 fact as a Layer 1 national fact, and
must never treat Layer 3's thin shared platforms as evidence of shared decision-making —
an even sharper instance of RULE-ADMISSIONS-012 than any of the other 6 countries in this
package, because Singapore's shared layers are thinner (acceptance-stage-only,
methodology-only) than any national platform documented elsewhere.

## Unresolved questions

Whether SUTD, SIT, and SUSS participate in the Joint Acceptance Portal alongside the
confirmed NUS/NTU (SMU only secondarily corroborated). Whether the UAS formula is
genuinely identical across every AU that uses it, or whether each applies its own variant
on a shared base — the only primary-fetched methodology document is NUS-hosted. SMU's
precise Turkish-diploma-specific minimum grade table (the blanket "standardized test
required" rule was primary-confirmed; the per-country numeric anchor table itself wasn't
retrieved in readable form this pass). Any role of Türkiye's YKS in NUS/NTU/SMU's Turkish-
diploma evaluation — genuinely unaddressed in sources reviewed. Whether any dedicated
foundation-year/bridge pathway exists anywhere in the system for a plain MEB-only Turkish
applicant with no AP/A-Level/IB and an insufficient grade at their target AU — not found,
genuinely unresolved rather than confirmed absent. SIT and SUSS admission architecture at
comparable depth to NUS/NTU/SMU — both are named among the 6 AUs but weren't independently
researched to the same depth this pass. The exact current NUS Medicine annual
international-student allowance and the specific test/assessment names used in NUS Law
and Medicine shortlisting (surfaced only via secondary sources this pass). Current-cycle
numeric IGP bands per programme at each AU — out of scope for this architecture-level
study but needed for any future ORYN matching feature, requiring refresh every cycle.
