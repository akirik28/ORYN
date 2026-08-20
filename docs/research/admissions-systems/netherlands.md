# Netherlands — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**Studielink is enrolment/registration, not a UCAS-style decision platform.** It's the
mandatory national portal for (almost) every Bachelor's applicant, Dutch and
international — but it makes **no admission decisions**: it collects the enrolment
request and routes basic data to the chosen institution(s); the actual decision (does
this applicant qualify, and for capped programmes, do they get a place) happens
separately, at each university/programme, outside Studielink. Pattern: **Studielink
registration (platform layer) + university-specific supplementary application
(university layer)**, not a bypass of Studielink — everyone registers, then also
completes each university's own document/portal process.

## B. Qualification eligibility

Two layers. **Nuffic** (Dutch NARIC) publishes country-by-country comparisons against
Dutch reference levels (HAVO, VWO, HBO/WO bachelor) — a general comparative guide, not an
individualized recognition certificate. The **admitting university** makes the final,
binding decision, consulting Nuffic's data but not legally bound to it — each applies its
own admission regulations (OER) on top.

**"VWO-equivalent" is the confirmed baseline framing**: WO (research university)
Bachelor's entry requires recognition as at least equivalent to VWO (the 6-year
pre-university track), or a completed HBO propedeuse. **HAVO-level alone is NOT
sufficient** — HAVO is the HBO (applied sciences) entry qualification, one tier below.

## Applicant educated in Türkiye

**Generally NOT sufficient on its own at most universities.** Nuffic's system-level
comparison places a standard Turkish Lise Diploması at only **"at least HAVO"** — one
tier below the VWO baseline. In practice this plays out very differently **by
university** (real, sourced, non-uniform pattern): Tilburg accepts a Genel Lise
Diploması for direct entry only if the **Diploma Puanı clears 85%** (explicitly excluding
Imam-Hatip/Meslek/Teknik Lisesi diplomas from this route); VU Amsterdam instead requires
either **80% GPA + 4 qualifying AP exams (scored 3–5)**, or **at least one completed year
of Turkish Lisans credits**. **A Turkish applicant cannot assume one university's
acceptance implies another's.** AP/IB/A-Level layered on top materially changes the
picture — generally evaluated under the far-more-standard IB/A-Level/AP criteria instead
of the plain-Lise criteria, typically eligible without the bridge year. YKS's role in
Dutch VWO-equivalence wasn't confirmed or ruled out in sources reviewed — a genuine gap,
not a confirmed "irrelevant" finding. "One year of completed Turkish Lisans credits" is a
real, multiply-documented bridge route distinct from a generic foundation programme.

## Academic evidence used

Full transcript required as supporting evidence and, for numerus fixus programmes, as one
qualitative selection input. Native grades are read on their original scale with Nuffic
guidance context, not force-converted to a universal GPA — universities state
country-specific minimum thresholds instead (Tilburg's 85% Diploma Puanı; Groningen citing
a 7.0/10 Dutch-scale-equivalent in some contexts). VWO itself has **no native
predicted-grade concept** — see below. For VWO students, the diploma combines a
school-set *schoolexamen* component plus a nationally standardized *centraal examen*.

## Predicted grades

**No native Dutch VWO concept.** VWO students apply with actual in-progress grades
(cijferlijst), not teacher-issued forward-looking predictions — the Dutch functional
equivalent of "not-yet-final" is the **conditional-admission** mechanism, not a predicted-
grade artifact. Where predicted grades DO appear — because a foreign curriculum (IB,
A-Level) natively produces them — Dutch universities **read and rely on them
operationally** for early eligibility assessment, exactly as those source systems intend,
since Studielink's 15 January/1 May deadlines both fall well before VWO/IB/A-Level final
results (May/June/July). Directly linked to conditional admission: a student admitted on
predicted/in-progress grades gets *voorwaardelijke toelating* (conditional), converted to
*onvoorwaardelijke* (unconditional) only once final results meeting stated conditions are
submitted (Tilburg explicitly names both stages).

## Conditional vs. unconditional admission

Operates at **two nested levels**. **(1) Diploma-conditional**: essentially every
applicant (Dutch VWO included, since Studielink deadlines precede final exams) gets a
conditional offer pending the final diploma/grades, converted once produced. **(2)
Selection-conditional** (numerus fixus only): meeting the VWO-equivalent + subject-
prerequisite bar only earns entry into the selection process — "eligible" and "admitted"
are explicitly decoupled for capped programmes.

## Subject prerequisites

**Real and programme-specific, not decorative.** VWO's national curriculum requires
every student to choose one of **four fixed "profielen"**: Cultuur & Maatschappij (C&M —
humanities/social/creative), Economie & Maatschappij (E&M — economics/social-science),
Natuur & Gezondheid (N&G — biology/health/medical), Natuur & Techniek (N&T — most
quantitative: tech, advanced maths, physics). Many Bachelor's programmes publish a
required profiel (or, for foreign-curriculum applicants, an equivalent named subject/level
requirement, e.g. "Mathematics B-level, Physics, Chemistry") as a hard admission gate,
separate from the general VWO-equivalence baseline. For non-VWO applicants, universities
don't literally assign a "profiel" label — they publish the functional-equivalent subject
requirement instead.

## Standardized tests

**Not mandatory nationally.** SAT/ACT surface only as supplementary evidence some
universities accept to help establish VWO-equivalence for US-diploma or (per the Turkey
finding above) Turkish-diploma holders — not a universal admissions test. Individual
numerus fixus programmes run their own bespoke tests as part of decentralized selection
— e.g. TU Delft's CSE Bachelor uses a mandatory Mathematics + Systematic Reasoning test to
stratify applicants into ranked bands (2026-27 cycle: applications close 15 Jan, results
15 Apr).

## Language requirements

For English-taught programmes: IELTS Academic, TOEFL iBT, Cambridge English (C1/C2), PTE
Academic or similar — commonly cited general baseline ~IELTS 6.0 (no sub-band below 5.5)
or TOEFL iBT ~80, valid within 2 years. Exemptions for English-medium prior education or
English-primary-language nationality, set at university/programme level. Variation begins
at the university level — UvA/TU Delft/Leiden commonly set higher bars (IELTS 6.5–7.0).
Dutch-taught programmes require a **separate** Dutch NT2/CNaVT/ITNA requirement (generally
B2), independent of the English framework.

## Application timing

Studielink opens 1 October (preceding year). **Open (non-numerus-fixus) programmes: 1 May
23:59 CET.** **Numerus fixus programmes: materially earlier, 15 January 23:59 CET**
(selection runs roughly mid-Jan through mid-April; results commonly after 15 April —
government guidance cites the window as 16 Jan–14 Apr).

## Application strategy constraints

**Maximum 2 numerus fixus programme registrations per year** (national rule); **just 1**
for Medicine, Dentistry, Dental Hygiene, Physiotherapy, Midwifery specifically — cannot,
e.g., register for Medicine at two universities in the same cycle. No confirmed official
cap on open (non-numerus-fixus) registrations was found — a circulating "max 4 total"
figure is unverified against Studielink/rijksoverheid.nl directly, treat as unconfirmed.

## Personal statement / essays

**Not required for standard (open) programmes.** For numerus fixus/decentralized-
selection programmes, a motivation letter (often + CV) is commonly one of the required
qualitative selection criteria — Dutch law requires **at least two qualitative criteria**
(or a lottery, or a combination) for capped programmes, and motivation/CV is one of the
most common choices. A **programme-scoped** requirement, not a universal Dutch feature.

## Recommendation letters

**Not a standard requirement** — a genuine, real structural difference from US/UK.
Not identified as baseline anywhere reviewed, even at the numerus fixus Bachelor's level
(more common at Dutch Master's level, per sources found) — read as "largely absent," not
"occasionally present but unverified."

## Extracurricular activities

**Not a primary factor** for open programmes — eligibility is VWO-equivalence + subject
prerequisites, not holistic review. For numerus fixus programmes, activity evidence can
enter indirectly through the motivation letter/CV, as supporting context within that
qualitative assessment, not as an independently weighted category.

## Interviews / tests / portfolios

For numerus fixus/decentralized-selection programmes (Medicine, Psychology, other
high-demand capped fields): interviews, programme-designed cognitive/aptitude tests,
and/or online situational-judgement assessments are common, alongside grades and
motivation letters. Art/Design/Conservatory programmes commonly require a portfolio (and
often audition/interview) as their **primary** selection mechanism, distinct from the
numerus fixus test-and-grades model. Not applicable to standard open-admission Bachelor's
programmes.

## Restricted / selective programmes — numerus fixus

**A government/institution-approved fixed maximum place count**, set by limited teaching
capacity (clinical placements, lab space, staff-student ratios), not prestige-driven
scarcity — the single mechanism that breaks the otherwise threshold-based Dutch model.

**Current mechanism (2026-27) — genuinely changed more than once, and the reality is
mixed, not one method:** (1) historically (mid-1970s+) a nationally-run weighted
lottery; (2) legally **abolished 2016/17** in favor of pure decentralized qualitative
selection (≥2 criteria, no lottery); (3) a **new law effective 1 September 2023**
**reintroduced lottery as a legally available option** — institutions now choose among
(a) pure qualitative selection, (b) decentralized lottery (weighted or not), or (c) a
hybrid. **As of 2026-27, which method a given programme uses is a genuinely
programme-level choice**: TU Delft CSE uses a hybrid (tests stratify applicants into
ranked bands, then final placement *within* each band is a random draw), while many
Medicine programmes lean more heavily on pure multi-round qualitative selection. **Do not
describe the current mechanism as either "pure selection" or "weighted lottery" at the
system level** — check per programme. Example fields: Medicine (~2,850 first-year places
nationally across 7 universities in the cycle referenced), Dentistry, Physiotherapy,
Midwifery, Dental Hygiene, Psychology at several universities, some CS/Engineering — the
exact list changes year to year, not fixed nationally.

## Admissions decision model

**Genuinely mixed/bifurcated — the single most important structural fact for ORYN to
encode correctly.** For the large majority of programmes (non-numerus-fixus):
**qualification-threshold-based** — VWO-equivalent + subject prerequisites met = legal
right to admission, no competitive ranking. For numerus fixus programmes: genuinely
**selection-based/competitive** — meeting the baseline only establishes eligibility to
enter selection (qualitative, lottery, or hybrid per the 2023 framework), which then
determines actual admission.

## Safe inferences

For the large majority of programmes, VWO-equivalent + subject prerequisites met =
admitted — "eligible" effectively equals "admitted." Studielink registration is necessary
but never sufficient anywhere. A plain Turkish Lise Diploması alone, with no supplementary
qualification and no completed Turkish higher-education credits, is at meaningful risk of
being judged only HAVO-equivalent — check the specific target university's threshold
proactively. Numerus fixus targets must plan around the earlier 15 January deadline.
Recommendation letters and broad extracurricular review are not primary levers for
standard applications. Foreign predicted grades (IB/A-Level) will be read and relied upon
operationally for conditional admission even though Dutch VWO itself has no native
predicted-grade artifact.

## Unsafe inferences

Do not assume the numerus fixus mechanism is uniformly "pure decentralized selection" —
the 2023 law means some programmes now use lottery or a hybrid, check per programme. Do
not assume a specific grade threshold (Tilburg's 85%, VU's 80%+4 APs) applies at any
*other* Dutch university — these are university-specific examples. Do not treat Nuffic's
general comparison as itself an admission decision. Do not assume SAT/ACT is irrelevant
across the board — it can matter as supplementary VWO-equivalence evidence for specific
diploma types. Do not assume a fixed "max 4 total" open-programme cap without further
confirmation. Do not assume the numerus fixus programme list or selection method is
stable year to year.

## Eligibility, competitiveness, fit

**Eligibility**: an objective, checkable threshold check — VWO-equivalence (Nuffic
baseline + university interpretation), subject prerequisites (vakkeneisen mapped from
profielen), language requirement — binary, not graded. **Competitiveness**: for the
majority of (non-numerus-fixus) programmes, this **essentially does not exist as a
separate concept** — eligible functionally equals admitted, a genuinely different
relationship from the US/UK that should be represented as such, not defaulted to a
US-style competitive framing. It re-emerges sharply, and dominates, for numerus fixus
programmes. **Fit**: best expressed through the profiel-mapped subject-prerequisite match
(does coursework academically prepare the student for this programme's content) rather
than a holistic personality narrative; motivation-letter-based numerus fixus programmes
do introduce some qualitative fit assessment, but as one input into a structured
procedure, not a freestanding narrative judgment.

## Counselor actions

Verify the target programme's own published VWO-equivalency policy for the student's
specific qualification — never rely on Nuffic's general comparison alone. For a Turkish
MEB-only student: proactively check whether the target university needs a specific
Diploma Puanı threshold, a supplementary qualification (AP exams), or a completed year of
Turkish Lisans credits — plan 12+ months ahead if a bridge year is needed. Check the
target programme's subject-prerequisite (vakkeneisen) requirement and confirm the
student's own coursework satisfies it. Determine early whether any target programme is
numerus fixus; if so, register well before 15 January and confirm the *current* selection
method for that specific programme/cycle. Remember the registration cap: 2 numerus fixus
generally, 1 for Medicine/Dentistry/Dental Hygiene/Physiotherapy/Midwifery. For
English-taught programmes, confirm the specific IELTS/TOEFL threshold per programme. Help
prepare a substantive motivation letter/CV for numerus fixus programmes without
overweighting generic extracurricular breadth. Explicitly communicate to non-selective-
programme applicants that meeting eligibility functionally equals admission, reducing
US/UK-style competitiveness anxiety that's misleading here.

## Data model implications

The Netherlands requires representing admission facts at (at least) **four distinct scope
levels for the same qualification**: national/legal (numerus fixus caps, the 2023
selection-method law, the 15 Jan/1 May split), platform (Studielink mechanics, uniform
regardless of programme type), university (VWO-equivalence thresholds per diploma type —
Tilburg's 85% vs VU's 80%+AP for the *same* Turkish diploma), and programme (subject-
prerequisite requirements, and which of the three legally available selection methods a
specific numerus fixus programme currently uses). A single "country requirement" record
per qualification type would be actively misleading — the model needs "same input
qualification, different outcome by university, further different by programme, further
different mechanism by cycle" as first-class variation.

## System / university / programme override model

**Layer 1 (national/platform)**: Studielink registration mandatory for essentially all
Bachelor's programmes; the 1 May/15 January split and the 2-numerus-fixus cap are set in
national law/policy, uniform regardless of university — no university can waive these.
**Layer 2 (national credential baseline)**: Nuffic's country comparison establishes the
starting "roughly VWO-equivalent" point every university draws on but that doesn't itself
bind any decision. **Layer 3 (university)**: each institution sets its own binding
acceptance threshold for a given diploma type — where the same input qualification
produces different outcomes at different universities (the Tilburg-vs-VU Turkish-diploma
contrast is the clearest evidence). **Layer 4 (programme)**: individual programmes layer
on subject prerequisites and, for numerus fixus programmes specifically, their own
selection-method choice plus hard capacity ceiling — the mechanism that converts the
otherwise-threshold-based Dutch model into a genuinely competitive one.

## Unresolved questions

No official Studielink/rijksoverheid.nl confirmation of a hard cap on total non-numerus-
fixus registrations — only an unverified "4 total" aggregator claim. What role (if any)
YKS plays in VWO-equivalence determination for Lise Diploması holders. The current
national distribution of numerus fixus programmes across the three legally available
selection methods post-2023 (Studiekeuze123.nl identified as the likely authoritative
source, not deep-fetched this pass). Full current-cycle Turkey-specific criteria beyond
the three universities sampled (Tilburg, VU Amsterdam, UvA/PPLE). Precise minimum
IELTS/TOEFL thresholds at a representative sample of individual programmes.
