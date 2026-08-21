# Architecture — cross-country program-level requirements

Part of ORYN's R3.1 program-family research layer, built on top of
[`docs/research/admissions-systems/README.md`](../README.md) (ruleset RULE-ADMISSIONS-001
through 017) and the 15 country-level admissions docs in that same directory. This
document does NOT re-research each country's admissions *system* — it asks a narrower
question on top of that existing layer: for the specific program family **Architecture**,
what is actually required, and where does the answer become **structurally different**
between countries (a genuinely different kind of mechanism — a portfolio that is a hard
gate vs. a light supplement, a bespoke drawing/spatial-reasoning test that exists in one
country and not another, a professional qualification deferred to graduate level) rather
than merely **numerically stricter** (the same mechanism the country already uses for
other competitive fields, just with a higher bar)? Machine-readable companion:
[`data/research/admissions-systems/program-requirements/architecture.json`](../../../../data/research/admissions-systems/program-requirements/architecture.json).

## Overview

Architecture turns out to be one of the most structurally fragmented program families a
counselor can advise on — more fragmented, country-to-country and even
institution-to-institution, than the underlying national admissions systems it sits on
top of. Two forces collide in almost every country researched: (1) architecture is
resource-constrained (studio space, one-to-one critique capacity, faculty ratios) in the
same way Medicine is clinically constrained, so it is very often a capacity-capped
("restricted") field; and (2) architecture is simultaneously an academic discipline and a
creative-evaluation discipline, so a meaningful number of countries and institutions layer
a genuinely different kind of evidence — a portfolio, a drawing test, a mandatory
interview — on top of whatever the country's ordinary admissions mechanism already is.
Crucially, these two forces are independent, not linked: a program can be capacity-capped
without any creative gate (Italy, Germany, the Netherlands — capped via grades or a
generic reasoning test, same instrument type the country already uses for other capped
fields), or it can carry a real creative gate without being meaningfully capacity-capped
in the numerus-fixus sense (France's ENSA interview, Ireland's TU Dublin portfolio). The
single most consistent finding across all 15 countries is that **global reputation
predicts nothing about which model a given architecture program uses**: ETH Zürich, one of
the most globally reputed architecture schools in existence, requires zero
architecture-specific admission evidence at Bachelor's level, while Cornell, UCL, Cambridge
and the University of Hong Kong — peers in reputation, not in mechanism — all run genuine,
load-bearing creative-evaluation gates. Nine of the 15 countries show at least one
institution using a mechanism that is genuinely different in kind from that country's
general admissions model (`structurally_different`); four use the same kind of instrument
the country already applies to its other capped fields, just calibrated to a very high bar
(`numerically_stricter_only`); two show architecture riding the country's completely
general mechanism with no differentiation at all (`same_as_general_admission`). Within
several of the "structurally different" countries, the mechanism is not even uniform
country-wide — Ireland's TU Dublin and UCD, a few kilometers apart and both flagged
"Restricted" under the same CAO platform, run opposite mechanisms for what a student would
reasonably assume is "the same thing."

## Country-by-country findings

**United States.** No national numerus-fixus and no national architecture requirement —
whether a portfolio applies at all is gated by an institutional admissions-architecture
fact most counselors would not think to check. At schools running a direct-entry,
five-year professional B.Arch admitted straight from high school (Cornell AAP, Syracuse),
a creative portfolio is a genuine, faculty-reviewed admission input, submitted via
SlideRoom, alongside transcript rigor. Cooper Union substitutes a "Home Test" plus an
in-person "Studio Test" for a traditional portfolio — assessing creative
problem-solving/time-management directly rather than banked prior work. MIT is the sharp
counter-example: MIT admits to the Institute as a whole with no declared major at
application time (Course 4/Architecture is chosen after enrollment), so no
architecture-specific portfolio exists or applies — MIT's general, optional "creative
portfolio" upload is a separate, non-major-specific admissions option unconnected to
Course 4 placement. A US applicant's real question is therefore "does my target school
admit directly into a named professional architecture major, or into the university at
large?", not "does the US require an architecture portfolio?"

**United Kingdom.** A genuine, front-loaded, load-bearing creative gate at the
undergraduate (RIBA Part 1 / first-degree) stage — this directly resolves, and overturns,
the hypothesis that portfolios might matter less at first-degree entry than later in the
Part 1/2/3 professional pathway. UCL's Bartlett states explicitly that academic
qualifications are "fully assessed following receipt of your Portfolio," and an interview
is offered only once the portfolio has succeeded — the portfolio is not banked as
supplementary color, it is the gate the rest of the file waits behind. Cambridge goes
further: portfolio and sketchbooks of original work, PLUS a 30-minute in-person drawing/
observation test (technical drawing and essay-writing skill, not content knowledge) ahead
of the admissions interview. The same "mandatory portfolio, run by the individual
institution" pattern recurs across the sampled range of RIBA-accredited providers (London
Metropolitan, Huddersfield, University of East London, Ravensbourne) — selective and
post-92 alike — suggesting this is close to a universal feature of RIBA Part 1 entry in
the UK, layered on top of, not replacing, the UK's ordinary predicted-grades/UCAS-
conditional-offer mechanic.

**Netherlands.** TU Delft's Bouwkunde is one of the Netherlands' numerus fixus programmes
(450 places, 2025-26 cycle), ranked by a formula of 25% final VWO grades plus 75% a
mandatory "online assignment" completed after the 15 January Studielink deadline. The
precise nature of that heavily-weighted assignment could not be confirmed this pass
despite two direct attempts against TU Delft's own selection pages — a genuine, flagged
gap, not a confirmed creative-portfolio finding. Because TU Delft's own Computer Science &
Engineering numerus fixus programme (documented in `netherlands.md`) uses a comparable
mandatory Mathematics + Systematic Reasoning test rather than a portfolio, Bouwkunde's
assignment is provisionally treated as consistent with that established Dutch
numerus-fixus pattern (a generic aptitude/reasoning instrument) — an inference from a
sibling program, not a directly confirmed fact about Bouwkunde specifically, and it should
be re-verified before being treated as settled. Either way, the *type* of mechanism —
numerus fixus, ranked by grades plus a bespoke test — is the Netherlands' own pre-existing
apparatus, not a novel one invented for architecture.

**Italy.** Confirmed via Politecnico di Milano: Architecture (Architectural Design, and
the single-cycle Building Engineering-Architecture programme) is capped at the
**local/university** level, not one of the three MUR-nationally-restricted fields
(Medicine, Dentistry, Veterinary Medicine, which run the fundamentally different national
semestre-filtro/IMAT mechanism). Local capping is enforced via a bespoke entrance test
("ARCHED": 40 questions, 70 minutes, five sections, separate Italian- and English-language
sittings), the same TOLC-family knowledge/reasoning-test *approach* Italy already applies
to its other local numero chiuso fields such as Engineering and Economics — not a
creative-work submission. No portfolio, prior design-work submission, or interview was
found gating admission at any ordinary Italian university's Architecture program.

**Germany.** Confirmed via RWTH Aachen: Architektur (B.Sc.) is a **local**
Numerus Clausus (örtlicher NC) subject — admission by Abitur-grade ranking against that
cycle's applicant pool, recalculated every semester, the identical mechanism already
documented for Germany's other local-NC fields (Psychology, Business Administration/BWL)
— not one of the four nationally hochschulstart-coordinated NC subjects (Medicine,
Dentistry, Veterinary Medicine, Pharmacy). The only additional element found is a
mandatory "Self-Assessment," explicitly framed as an advising tool required for
*enrollment* once admission is already granted, not an admissions filter. No portfolio,
design sample, or bespoke aptitude test gates admission at this TU-style Architektur
program; a genuinely different picture may hold at art-academy-style Kunsthochschule
architecture tracks, which fell outside this pass's scope — flagged, not ruled out.

**Canada.** Every direct-entry professional-track program sampled in depth confirms a
genuine, non-academic creative-evaluation gate — but the gate's very existence depends on
whether a direct-entry professional track exists at that institution at all, a second,
independent structural axis. University of Waterloo's Bachelor of Architectural Studies
(Canada's most-cited program) runs an explicit two-stage process: Stage 1 is an OUAC
application screened on grades alone (an overall average in the "low-mid 80s," per
Waterloo's own admissions page); only applicants who clear Stage 1 proceed to a mandatory
Portfolio (described as "essential") plus an in-person or virtual Interview. UBC's
Bachelor of Design in Architecture uses a portfolio that can substitute for the
university's own general Personal Profile essay. University of Toronto's Daniels Faculty
requires a supplementary "One Idea" creative submission for Architectural Studies.
Separately, and this is the structurally distinct second fact: several Canadian
universities do not offer a direct-entry undergraduate *professional* architecture degree
at all, conferring a pre-professional/general degree first and gating the professional
Master of Architecture behind a separate, later, competitive application — meaning "no
undergraduate portfolio requirement" at such a school reflects an absent gate, not a
lighter one.

**Switzerland.** The sharpest counter-intuitive finding in this entire pass. ETH Zürich's
Bachelor's in Architecture — one of the most globally reputed architecture programs in
existence — requires **no architecture-specific admission component whatsoever**: no
portfolio, no design test, no creative submission of any kind. Admission runs through the
identical general ETH mechanism used for every other Bachelor's program: Swiss Matura, or
for foreign qualifications, direct admission if the diploma clears ETH's published
threshold, otherwise a Reduced or Comprehensive entrance examination testing mathematics,
physics, chemistry and biology — an academic-subject exam, not an architecture-specific
one. ETH's own Department of Architecture confirms, via its separate published portfolio
pages, that a portfolio requirement exists **only** for Master's-level Architecture and
Landscape Architecture admission, never Bachelor's. A student or counselor who assumes ETH
Architecture requires the same creative-evidence preparation as UCL, Cambridge, HKU, or
Cornell would be flatly wrong at the Bachelor's stage — and right, for the first time, only
once that same student reapplies for the Master's.

**France.** The 20 ENSA (École nationale supérieure d'architecture) schools, accessed via
Parcoursup, run a genuinely different two-stage mechanism from both France's ordinary
non-selective Licence model and from the portfolio-centric UK/US/Hong Kong model. Stage 1
is a pure grades/file review restricted to a defined core-subject set (French, mathematics,
history-geography, philosophy, first foreign language) with explicitly "no coefficients,
bonuses or penalties" applied. Stage 2, for candidates who clear Stage 1, is a mandatory
15-minute interview with a two-teacher jury assessing motivation and interest in
architecture. No creative portfolio or prior design-work submission is required anywhere
in the confirmed sources — the Parcoursup "lettre de motivation" applicants submit is
explicitly held back and consulted only at the interview itself, not scored as part of
file selection. This substitutes a grades-then-interview gate for the grades-then-portfolio
gate found in most other countries researched — a genuine structural surprise relative to
the popular assumption that architecture admission everywhere centers on a creative
portfolio. (Medium confidence: corroborated consistently across several French education-
press/aggregator sources, not independently verified against a single Ministry-of-Culture
primary page this pass.)

**Spain.** Confirmed via the Universidad de Alicante's official Grado en Fundamentos de la
Arquitectura admissions page: no separate aptitude test, portfolio, or interview exists —
admission runs through the ordinary EBAU nota de admisión mechanism (Bachillerato + PAU,
improvable through the voluntary phase's weighted-subject bonuses) identical in kind to
every other Spanish Grado. What differs is magnitude only: architecture is one of Spain's
most numerically selective fields — UPM's combined Grado en Fundamentos de la
Arquitectura + integrated Máster en Arquitectura reported a 2025-2026 nota de corte of
13.089 (on the roughly-14-point extended scale), among the highest cutoffs in the country.
This directly rules out a plausible legacy assumption: pre-Bologna Spanish architecture
admission ran through a bespoke "Prueba de Aptitud"; that mechanism is confirmed gone, at
least at the public university sampled — do not describe current Spanish architecture
admission as aptitude-test-gated.

**Ireland.** The sharpest within-country split found anywhere in this pass, at two Dublin
institutions offering nominally similar CAO-"Restricted"-flagged Architecture programs.
TU Dublin's TU832 Bachelor of Architecture combines Leaving Certificate CAO points (625
max, including the 25-point Higher Level Maths bonus) **additively** with a mandatory
Portfolio-plus-Interview (200 points max) into one combined 825-point ranking — the
portfolio/interview is baked into the *initial* CAO entry mechanism itself, assessed
online each May for every TU832 CAO applicant. UCD's BSc Architectural Science/Architecture
program, by contrast, admits on CAO points **alone** at initial entry (2025 Round 1: 556
points, 57 places, standard O6/H7 subject minimums, no portfolio) — a portfolio/interview
resurfaces only later, and only for the subset of students who fail to clear a 2.8 GPA
threshold at the internal BSc-to-MArch progression stage. A counselor cannot generalize
"Irish Architecture requires a portfolio" (true at TU Dublin) or "Irish Architecture is
points-only" (true at UCD's initial entry) — both are simultaneously true, at different
Dublin institutions, under the identical CAO "Restricted" flag, in the identical cycle.

**Australia.** Two distinct, non-overlapping mechanisms, neither reducible to "a higher
ATAR." First, the "Melbourne Model" (University of Melbourne, and structurally similar at
several other institutions) defers the professional qualification entirely to graduate
level: undergraduate entry is via the generalist Bachelor of Design (with an Architecture
major), admitted on ATAR alone with **no** portfolio — the creative-evaluation gate
appears only at the subsequent, separate Master of Architecture application, where a
digital portfolio (max 15 pages) is required and a completed Bachelor of Design with a 65%
Weighted Average Mark waives it in one specific guaranteed-pathway case. Second, and
structurally distinct again: UNSW and the University of Sydney each run an optional
"Portfolio Entry"/"Portfolio Pathway" specifically for Built Environment/Architecture-
adjacent undergraduate degrees — not a universal mandatory gate but an **alternate**
admissions lever a student can use to help offset an ATAR that falls just short of the
standard cutoff, assessed alongside a cover letter and sometimes an interview, yielding an
adjusted-ATAR conditional offer. Neither mechanism is "the same test, just a higher score."

**New Zealand.** University of Auckland's Bachelor of Architectural Studies (BAS) — the
country's flagship program — selects on "the combined strength of your academic
achievement, portfolio and written statement": a creative portfolio and a one-page written
statement, both submitted via SlideRoom, sit alongside the standard Rank Score academic
threshold as co-equal inputs, not a light supplement. This is a genuine additional
evaluative axis layered onto New Zealand's general Rank Score mechanism, and it sits in
sharp, direct contrast to Australia's Melbourne Model, which defers the identical kind of
evaluation to graduate entry — a concrete instance of `new-zealand.md`'s own existing
warning against assuming New Zealand's admissions architecture mirrors Australia's merely
because the two are commonly grouped together.

**Hong Kong.** Closes a gap `hong-kong.md` explicitly flagged as unresolved ("No confirmed
portfolio requirement for Art/Design/Architecture-type programmes was found this pass").
HKU's Bachelor of Arts in Architectural Studies (BA(AS)) confirms a mandatory, multi-stage,
non-academic gate applying to **both** JUPAS (local) and non-JUPAS (international,
including the Turkish-applicant population) tracks: a required Portfolio (PDF, maximum
five A4 pages, demonstrating "architectural thinking, drawing and making"), a separate
"Online Aptitude Exercise," and an Interview for shortlisted candidates — with one narrow,
named exemption: Gaokao (Mainland Chinese national-exam) applicants are exempt from the
portfolio specifically. This is one of the heaviest, most front-loaded creative/aptitude
gates identified anywhere in this 15-country pass, genuinely different in kind from Hong
Kong's general HKDSE-threshold or non-JUPAS holistic-review model.

**Singapore.** Two Autonomous Universities show materially different intensities within
the same broad "structurally different" category. At NUS, a portfolio is explicitly **not**
required at the point of application — it only becomes relevant if a candidate is
shortlisted for interview, where it is "strongly encouraged" for GCE A-Level entrants but
**mandatory** for local-polytechnic-diploma entrants specifically; shortlisted candidates
separately sit a formal Admission Aptitude Test (AAT). At SUTD, by contrast,
`singapore.md` already confirms Architecture and Sustainable Design as the university's
most clearly, centrally portfolio-driven program, with the portfolio integral to a
holistic review from the outset, not a conditional interview-stage add-on. A student
cannot assume "Singapore architecture requires a portfolio" applies uniformly across
Autonomous Universities — NUS's mechanism is materially lighter-touch and more
conditional than SUTD's.

**Turkey.** The domestic YKS pathway places Mimarlık (Architecture) in the SAY
(Sayısal/Quantitative) score-type cluster alongside Engineering, Medicine, Dentistry and
Pharmacy — the identical national algorithmic placement mechanism (pure descending-score-
rank, ÖSYM-run, zero human or university review at any stage) that governs every SAY-track
program. This was re-verified directly against the one institution where a fine-arts-
heritage exception might plausibly exist: Mimar Sinan Fine Arts University (MSGSÜ),
Turkey's own historic Academy of Fine Arts — its Mimarlık Bölümü is confirmed to admit on
ordinary SAY-type YKS placement (2025 taban puanı 425.6; 2026 381.98) exactly like every
other Turkish architecture program, in contrast to that same university's own Güzel
Sanatlar Fakültesi (Fine Arts Faculty) departments (painting, sculpture, and related
programs), which do run the "özel yetenek sınavı" talent/aptitude-exam route. The only
named non-exam-score elements anywhere in Turkey's domestic system remain conservatory,
fine arts proper, sports sciences, and some education-faculty performance programs —
Architecture is confirmed excluded from all of them, even at the one university where the
opposite might reasonably have been assumed.

## What determines eligibility

Across all 15 countries, the baseline eligibility question for Architecture is the same
one every other program family in this package already answers: does the applicant hold a
qualification the destination country recognizes as equivalent to its own upper-secondary
leaving credential (Abitur, VWO/HAVO, Matura, Leaving Certificate, HKDSE, A-Level, MEB Lise
Diploması, etc.), per each country's own already-documented recognition baseline
(RULE-ADMISSIONS-004). Architecture rarely narrows this baseline with a hard subject-
prerequisite gate in the way some STEM-adjacent fields do (a named Mathematics or Physics
minimum appears as a *recommended profile* in several countries — Spain's "science-
technology Bachillerato modality," the Netherlands' N&T/N&G profielen — but was not found
functioning as an absolute, disqualifying gate anywhere sampled this pass). What actually
determines eligibility, once the baseline academic credential is satisfied, is
overwhelmingly a *second, independent* gate layered on top, and which kind of gate applies
is the single most consequential fact a counselor must establish per institution:
(a) a pure numeric threshold/ranking (grades alone, or grades plus a generic
knowledge/reasoning test of the type the country already uses for its other capped fields
— Italy, Germany, Spain, provisionally the Netherlands); (b) a creative-evidence gate
(portfolio, sometimes plus a bespoke drawing/design test — UK, US at direct-entry schools,
Canada, Hong Kong, New Zealand, and Ireland at TU Dublin specifically); (c) a
motivation/interview gate with no creative-work component (France); or (d) no
architecture-specific gate at all, full parity with the country's general admissions
mechanism (Switzerland's ETH at Bachelor's level, Turkey, Ireland at UCD's initial entry
specifically, Australia's Melbourne-Model undergraduate stage). Eligibility, in other
words, is never established by the academic credential alone for a capped or
creative-gated program — it is a necessary but rarely sufficient condition, and *what else*
is necessary is not predictable from the country's general admissions description without
checking the specific institution.

## What genuinely strengthens an application

Where a genuine creative-evaluation gate exists (roughly two-thirds of the countries
researched, in at least one major institution), the evidence that actually moves a
decision is real prior design/creative work showing process, not just polished final
output — UK sources (UCL, Cambridge) explicitly state institutions want to see "the
creative and planning processes that have contributed to your work, not just the final
pieces," and Cambridge specifically discourages a portfolio filled entirely with
architectural floorplans/scale models in favor of broader observational drawing and visual
curiosity. Sustained, demonstrable design-adjacent activity — sketchbooks, a personal
design/making practice, participation in design-adjacent competitions — genuinely
strengthens a portfolio-gated application in a way that a single polished project does not,
consistent with this package's general finding (RULE-ADMISSIONS-008 lineage) that depth
outperforms breadth wherever holistic evaluation exists at all. Where the gate is
interview-based rather than portfolio-based (France), demonstrable, articulable motivation
and subject-specific engagement is what strengthens the file — the interview exists
precisely to test this, since the file-selection stage deliberately excludes any narrative
input. Where the gate is a generic reasoning/aptitude test (Italy's ARCHED, RWTH's local
NC, TU Delft's provisionally-generic-reasoning "online assignment"), what strengthens the
application is indistinguishable from what strengthens *any* competitive STEM-adjacent
application in that country: rigorous quantitative/spatial preparation and a high, stable
grade average — not creative portfolio work, which is not evaluated at all in that
sub-mechanism. Everywhere a portfolio, drawing test, or interview exists specifically for
architecture, extracurricular breadth outside that specific evidentiary channel was not
found to independently move a decision — the gate itself narrowly channels what counts as
"strong" evidence into whichever axis that country/institution actually evaluates.

## What is largely irrelevant

A general, non-design-related extracurricular activities list carries essentially no
independent weight anywhere sampled in this pass, beyond whatever generic role
extracurriculars already play (or do not play) in that country's *general* admissions
model per each country's own doc — Architecture does not appear to elevate broad
leadership/clubs/sports evidence the way, for instance, a US holistic-review file might
weigh it generally. Recommendation letters, where the general country doc already
describes them as absent or non-standard (Netherlands, Germany, Italy, Spain, France's
Licence route, Ireland's CAO route, most of the Asia-Pacific/East-Asia systems sampled),
remain absent specifically for Architecture too — no country or institution researched
this pass introduced a reference-letter requirement uniquely for architecture where the
general system does not otherwise use one. Standardized general-aptitude tests (SAT/ACT)
are irrelevant to Architecture admission specifically almost everywhere they are not
already a general feature of that country's admissions model — they surface only in the
already-documented general supplementary roles (US institution-optional; Singapore's NUS
foreign-qualification eligibility bridge; UCD/UCC's Turkish-applicant direct-entry tables)
rather than as an architecture-specific instrument. A prior qualification or credential in
visual art (a national art exam, an art-focused secondary track) was not found to be
treated as a formal admissions credit or substitute requirement anywhere sampled — it may
plausibly strengthen a portfolio's content but does not appear to function as a distinct,
separately-weighted eligibility signal.

## What ORYN must never infer

Never infer that a country's *general* portfolio/interview/extracurricular findings
(already documented in that country's own admissions-system doc) apply uniformly to
Architecture without checking the specific institution — this family shows the sharpest,
most-repeated violations of that assumption found in this whole research package (MIT vs.
Cornell within the US; ETH Zürich vs. every UK/US/HK peer institution; TU Dublin vs. UCD
within the same city and platform; NUS vs. SUTD within the same national system). Never
infer that a program's global reputation predicts its mechanism type — ETH Zürich requires
strictly less architecture-specific evidence at Bachelor's level than a far less globally
ranked post-92 UK university, because RIBA accreditation carries a portfolio expectation
that ETH's Swiss/European accreditation model does not. Never infer that "Architecture" is
a single, stable admissions category within one country's numerus-fixus/numero-chiuso/
restricted-programme list — it can be local rather than national (Italy, Germany), can sit
on the *same* mechanism as unrelated capped fields (a generic reasoning test, not a
creative one), or can be capacity-capped by one specific institution while structurally
uncapped, in the portfolio-plus-ATAR-adjustment sense, at another in the same country
(Australia). Never infer that "no undergraduate portfolio requirement" at a given
institution means architecture there is easy to enter or uncompetitive — it commonly means
the reverse: the entire professional qualification, and its associated creative-evaluation
gate, has simply been deferred to a separate, later, often more competitive graduate
application (Canada, Australia's Melbourne Model). Never infer, from Turkey's Fine Arts
University heritage, that its Architecture program uses the same "özel yetenek sınavı"
route its Fine Arts Faculty does — directly checked and confirmed false. Never present any
of these program-specific portfolio/test/interview facts as if they were established by
this document as **admissions probability** signals — per RULE-ADMISSIONS-003, none of
this research supports converting "strong portfolio" or "cleared the drawing test" into a
percentage-weighted or probability estimate; these remain qualitative eligibility/
competitiveness facts only.

## Institution-specific vs. programme-specific vs. country-wide patterns

**Country-wide layer** (genuinely uniform within the country, confirmed for Architecture
specifically): Turkey's SAY-track algorithmic placement with zero non-exam-score channel;
Spain's nota-de-admisión-only model with no aptitude test, confirmed at the one public
university sampled and consistent with the country doc's general finding of no such
channel existing in Real Decreto 534/2024. **Platform/national-mechanism layer, but with
programme-level choice of instrument**: Italy's local-numero-chiuso *category* is a
national legal concept, but each university independently chooses/designs its own test
(PoliMi's ARCHED is PoliMi-specific, not shared with other Italian architecture schools);
Germany's local-NC category is likewise nationally recognized as a concept while each
university sets its own threshold and process independently, with no shared instrument.
**Institution-specific layer, and the layer where this family diverges most sharply from
the country's general pattern**: whether a portfolio/drawing-test/interview gate exists AT
ALL is decided institution-by-institution in the US (MIT vs. Cornell/Syracuse/Cooper
Union — three different mechanisms among direct-entry-adjacent programs alone), in Ireland
(TU Dublin vs. UCD, opposite mechanisms under the identical CAO "Restricted" flag), and in
Singapore (NUS's conditional, interview-stage-only portfolio vs. SUTD's holistic,
from-the-outset portfolio). **Programme-structure layer, distinct from admissions-criteria
layer**: whether the professional architecture qualification is even offered as a direct
undergraduate degree, versus deferred to a separate graduate application after a
generalist first degree, is itself institution-specific within Canada and Australia — this
is a pathway-architecture fact, not an admissions-criteria fact, and the two should never
be conflated (a school with "no undergraduate portfolio requirement" because it has no
undergraduate professional degree at all is not more lenient than one that has both).

## Unresolved questions

The exact content of TU Delft Bouwkunde's 75%-weighted "online assignment" — generic
reasoning/aptitude test (by analogy to TU Delft's own Computer Science & Engineering
numerus fixus programme) versus something closer to a creative/spatial-design task — was
not confirmed against TU Delft's own primary pages this pass; the official Dutch-language
"Regeling Selectiecriteria en Procedure 2026-2027" PDF exists and is the correct primary
source to resolve this but was not deep-fetched. Whether the mandatory portfolio pattern
found at UCL, Cambridge, and four additional sampled RIBA Part 1 providers genuinely holds
universally across all ~50+ RIBA-accredited UK undergraduate providers, or whether a
minority (particularly some newer or more STEM-flavored "Architecture BSc"-branded, non-
RIBA-track programmes) admit without one, was not exhaustively checked. Whether France's
ENSA grades-then-interview mechanism (no portfolio) also describes Sciences Po's or École
Polytechnique's separate direct-application tracks for any architecture-adjacent offering,
or any private French architecture school outside the public ENSA network, is unaddressed
in sources reviewed. The exact weighting/pass-threshold structure of NUS's Admission
Aptitude Test (AAT) for Architecture applicants, and whether it is scored/reported to
applicants or used purely as an internal ranking input, was not confirmed. Whether any
Canadian university beyond UBC, Waterloo, and University of Toronto's Daniels Faculty
offers a direct-entry undergraduate professional B.Arch-equivalent *without* a portfolio
requirement was not exhaustively surveyed — the three sampled in depth were consistent,
but this is not confirmed as a comprehensive Canada-wide finding. Whether Germany's
art-academy-style Kunsthochschule architecture tracks (distinct from TU-style Architektur
faculties) run a portfolio-based Eignungsprüfung for architecture specifically, by analogy
to the confirmed pattern for Art/Design and Music at Kunsthochschulen/Musikhochschulen
generally, was flagged as plausible by structural analogy but not independently verified
this pass. Whether any Hong Kong university beyond HKU (i.e., CUHK's or HKUST's own
architecture-adjacent programmes, if any) shares HKU's portfolio-plus-aptitude-exercise
model or diverges from it was not checked.
