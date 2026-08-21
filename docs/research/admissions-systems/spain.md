# Spain — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**No single national application platform exists — three stacked layers instead.**
(1) **National**: Real Decreto 534/2024 (amended by Real Decreto 482/2025) fixes, by law,
the structure of the university-access test (EBAU) and the exact formula for the **nota de
acceso** (access grade) and **nota de admisión** (admission grade), binding every public
university uniformly. (2) **Regional**: each of Spain's 17 Comunidades Autónomas (CAs)
drafts and administers its own EBAU exam content through its own organizing commission,
and runs its own **"Distrito Único"** preinscripción/allocation portal (Madrid's public
universities function as a single district; Andalusia runs the **Distrito Único
Andaluz**/DUA; Catalonia runs its own equivalent) — a student applies through whichever
region(s) they're targeting, not through one national portal. (3) **University**: each
institution chooses which specific Bachillerato subjects to weight for its own degrees and
sets its own per-degree capacity. Structurally distinctive: unlike Studielink (Netherlands)
or UCAS (UK), which register but never decide, Spain's regional Distrito Único platforms
are genuine decision-making engines — they mechanically execute the ranked allocation
themselves, using nationally-defined formula inputs.

## B. Qualification eligibility

Two different bodies handle two different populations. For students holding a Spanish
Bachillerato, an EU/reciprocal-agreement qualification, or an **IB Diploma/European
Baccalaureate**: eligibility flows directly from Real Decreto 534/2024 — Article 6 names
IB and the European Baccalaureate as explicitly **exempt from sitting EBAU**, routing
straight to UNEDasiss accreditation instead. For non-EU/non-agreement foreign
qualifications (a standard Turkish MEB Lise Diploması falls here): **two sequential steps**
are required — first **"homologación"** (official equivalence to the Título de Bachiller),
issued by the Ministerio de Educación, Formación Profesional y Deportes for most of Spain
(Catalonia, Galicia and the Basque Country handle it regionally instead), processed via the
Spanish Embassy's Consejería de Educación for applicants abroad; then, only once
homologación is **"definitiva"** (final), **"acreditación UNEDasiss,"** which computes an
actual numeric admission grade. UNEDasiss's own FAQ states explicitly it "does not
homologate or validate titles" — the two processes are run by different bodies and are not
interchangeable. University discretion is narrower here than in the Netherlands or Germany
at the eligibility-gate level (the baseline threshold and formula structure are nationally
fixed); it re-enters at the ranking-parameter level instead — which subjects a university
weights, and a degree's admitted capacity that cycle.

## Applicant educated in Türkiye

**Not sufficient on its own.** A standard MEB Lise Diploması requires homologación
(Spanish Ministry of Education, processed for Türkiye-based applicants through the
Consejería de Educación at the Spanish Embassy) **before** UNEDasiss will compute any
admission grade. Spain and Türkiye do have a bilateral educational cooperation agreement
(BOE-A-2014-6393, signed Istanbul 3 October 2013) — but its own Article 6 commits both
countries only to "facilitate" future mutual recognition through information exchange; it
does **not** establish automatic diploma equivalence. This is a genuine, sourced negative
finding: the existence of a cooperation agreement should not be read as easing the
homologación requirement.

Once homologación is granted, UNEDasiss's **"acreditación"** pathway computes a full
numeric admission grade — **not** a binary eligibility determination, and this is the most
important, non-obvious finding for Türkiye specifically. Confirmed formula (UNEDasiss's own
FAQ, corroborated by multiple independent calculators): nota de acceso = (0.2 × NMB + 4) +
0.1×M1 + 0.1×M2 + 0.1×M3 + 0.1×M4, where NMB is the homologated Bachillerato-equivalent
average and M1–M4 are the best scores (minimum 5/10 each, same calendar year) from up to
four optional **"Pruebas de Competencias Específicas"** (PCE) — UNEDasiss's own
subject-specific exams, functionally parallel to EBAU's voluntary-phase subject exams.
Result: a grade between 5 and 10 without PCE, extendable toward 14 with weighted PCE for
competitive programmes — exactly mirroring the domestic nota de admisión ceiling. At the
University of Zaragoza, UNEDasiss-accredited students are explicitly folded into the
**same** general admission quota as domestic EBAU-takers, ranked purely by admission grade
— not a segregated or lesser "international" track.

A full **IB Diploma materially simplifies** the pathway: per UAM's own admissions page, IB
holders (including those educated in Türkiye) go straight to UNEDasiss acreditación,
skipping homologación entirely — the same "IB simplifies access" pattern already confirmed
in the Netherlands and Germany research, not something unique to Spain. Whether Türkiye's
**YKS** national entrance-exam score plays any role in homologación or acreditación was not
addressed, pro or con, in any official source reviewed — a genuine gap, identical in kind
to the same unresolved question already flagged in the Netherlands research. No
Spain-specific bridge/foundation-year mechanism (comparable to the Netherlands' "one year of
Turkish Lisans credits" or Germany's Studienkolleg) was identified this pass — treat as a
gap, not as confirmation no such route exists. Recognition here is notably **more
centralized** than in the Netherlands or Germany at the eligibility-determination step:
homologación and acreditación are single national (or designated-regional) processes, not a
university-by-university judgment call — a Turkish applicant does not face a
Tilburg-vs-VU-style problem of different universities setting different acceptance bars for
the *same* diploma. University-specific variation re-enters only downstream, in how
*competitive* a given programme is, not in whether the qualification is recognized at all.

## Academic evidence used

The Bachillerato average (**Nota Media de Bachillerato**, NMB) is a direct, load-bearing
numeric input into both the domestic nota de acceso (60% weight) and the UNEDasiss
foreign-student formula (the "0.2×NMB+4" component) — not merely supporting context.
Domestic grades are already on the same 0–10 national scale the formula uses, so no
conversion is needed; for foreign students, homologación is what translates a foreign
secondary record into an accepted Bachillerato-equivalent standing before UNEDasiss folds
NMB into the formula — the exact methodology for deriving that numeric NMB-equivalent
figure from a foreign transcript's original scale was not confirmed this pass (a gap, in
contrast to Germany's explicitly named "Bavarian formula"). Final results are required
throughout: domestic EBAU is sat only after Bachillerato is fully complete, and Catalonia's
own guidance states homologación must be **"definitiva"** before a foreign applicant can
enter the June preinscripción cycle. EBAU itself is Spain's external, standardized exam
layer for domestic students (obligatory phase: 4–5 subjects; voluntary phase: up to 4 more,
for the admission-grade bonus); PCE plays the structurally equivalent role for
UNEDasiss-track students. Course rigor is read entirely through the ponderación
(subject-weighting) mechanism — see Subject prerequisites — a scoring bonus, not a separate
narrative "rigor" judgment.

## Predicted grades

**Not found anywhere in the Spanish system, for domestic or international applicants** — a
genuine, confirmed structural difference from the Netherlands, UK and Canada (which all use
predicted grades operationally to some degree), and consistent instead with the
Germany/Italy "not used" pattern. Spain's timing structure removes the need entirely:
domestic students sit EBAU only after Bachillerato is complete (final results already
exist), and the international UNEDasiss pathway explicitly requires a "definitiva," not
provisional, homologación before an admission grade can be computed at all — an in-progress
or forecast foreign record cannot enter the formula. Final results are required
unconditionally on both tracks.

## Conditional vs. unconditional admission

**Not present in the UK/Netherlands grade-prediction sense.** A narrower, procedural
analogue may exist: Catalonia's guidance distinguishes a "homologación definitiva" (final)
requirement from an implied provisional processing state, but this reads as
document-completeness conditionality (has the paperwork been fully resolved) rather than
academic-conditionality (admitted now, pending a specific future grade) — structurally
closer to the narrow procedural sense found in Italy than to the UK's
predicted-grade-conditional-offer model. Because EBAU is sat post-Bachillerato-completion
and UNEDasiss requires final (not provisional) homologación before scoring, the whole
system appears built around already-final academic results at the point any admission grade
is generated. This was not exhaustively tested against every university's own procedural
language this pass — a well-supported but not fully exhaustive finding.

## Subject prerequisites

**Real, but structurally different from every other system in this package.** Spanish
universities do not gate eligibility on having studied a specific Bachillerato subject.
Instead, each university publishes, per degree, which subjects it will **weight**
("ponderar") in the nota de admisión formula — Real Decreto 534/2024 Article 22.3 requires
each university to select at least two such subjects per degree, weighted at 0.1 or 0.2
each, with the student's own best-scoring eligible subjects applied automatically. This is
a scoring **bonus** mechanism (raises competitive ranking), not a hard **gate** — a student
who never took the "ideal" subject can still apply and, if the programme is undersubscribed
that cycle, still be admitted. A quantitative/STEM degree might weight Mathematics II and
Physics at 0.2 each; a Biology-heavy degree (Medicine, Biology, Veterinary) might weight
Biology and Chemistry. Spain's LOMLOE Bachillerato has no Dutch-VWO-style small set of
fixed named "profiles" — students choose a broader Bachillerato modality (Ciencias,
Humanidades y Ciencias Sociales, Artes) and then individual subjects within it, and it's
those individual subjects, not the modality, that get weighted per degree. Whether any
Spanish public degree also imposes a genuine hard subject-gate (not just a scoring bonus)
was not confirmed or ruled out this pass — flagged as a gap.

## Standardized tests

EBAU (domestic/EU-agreement track) and UNEDasiss's PCE (international track) are Spain's
own national standardized instruments — not SAT/ACT-style tests, and not skippable if a
student wants their nota de admisión to include weighted-subject bonus points (the nota de
acceso alone, without any voluntary-phase/PCE component, only clears the ≥5.0 baseline, not
competition for capacity-limited programmes). **No evidence was found that SAT/ACT/AP
scores play any role** in the standard Spanish formula for either domestic or international
applicants — a genuine structural difference from the Netherlands, where SAT/AP can help
establish diploma-equivalence for some diploma types. Real Decreto 534/2024 is the current
governing framework (in force for EBAU sittings from 2024-2025, admission procedures from
2025-2026 onward, subsequently amended by Real Decreto 482/2025) — treat any pre-2024
description of "Selectividad"/"PAU" under the older LOE/LOMCE-era rules as potentially
superseded. Private universities, especially for Medicine, commonly run their own bespoke
entrance tests entirely separate from EBAU/PCE — one illustrative, secondary-sourced,
single named private university combined a science-knowledge test (40%), Bachillerato
average (25%), an aptitude test (10%) and a personal interview (25%); treat as illustrative
of the private-pathway *pattern*, not a representative or stable formula across all private
institutions.

## Language requirements

For Spanish-taught programmes, non-native applicants whose prior education was not
conducted in Spanish generally need Spanish proficiency at a minimum of **B2** (CEFR),
evidenced via DELE, SIELE, an official language-school (Escuela Oficial de Idiomas)
certificate, or recognition already embedded within the UNEDasiss accreditation itself —
confirmed explicitly on UAM's own admissions page. This is **independent from academic
qualification recognition** (homologación/acreditación) — never conflate the two, the same
discipline already established for Germany's DSD-vs-Anabin distinction and the
Netherlands' IELTS-vs-VWO-equivalence distinction. Exemption rules for applicants whose
prior education occurred in Spanish-speaking contexts were not exhaustively confirmed this
pass. Precise English-language-proficiency thresholds (IELTS/TOEFL-equivalent) for Spain's
smaller but growing English-taught undergraduate segment were **not independently
confirmed** this pass — flagged as a gap, not evidence no such requirement exists.

## Application timing

Real Decreto 534/2024 Article 16.1 establishes exactly **two EBAU convocatorias per year**
nationally — an "ordinaria" (ordinary, commonly early-to-mid June) and an "extraordinaria"
(extraordinary, commonly July) — with each Comunidad Autónoma setting its own exact dates
within government-set maximum windows. Article 19.4 mandates a "llamamiento único" (single
call) per exam sitting within a convocatoria — a student isn't called to sit the same
exercise across staggered sub-sessions. Capacity-limited ("plazas limitadas") programmes do
**not** run on a separate, earlier deadline track the way the Netherlands' numerus fixus
does — they use the same EBAU calendar and the same regional Distrito Único preinscripción
window as every other programme; what differs is not an earlier deadline but the number and
duration of subsequent allocation rounds.

After the June/July preinscripción window, the regional Distrito Único platform runs an
**iterative, multi-round ranked-allocation process** — genuinely distinct from both a
single-deadline system and a continuously rolling one. Confirmed across two universities in
different regions: an initial "primera adjudicación" (first allocation) is followed by
further allocation rounds and "listas de espera"/"listas de resultas" (waiting-list/
leftover-place rounds) that can continue for months — one Andalusian public university's
published 2025-2026 calendar showed a second allocation in mid-July followed by up to **six
successive "listas de resultas" rounds running through 10 October**. Academic cycle for the
dates above: 2025-2026, retrieved 2026-08-21; specific dates should be reconfirmed per
Comunidad Autónoma for any given target cycle.

## Application strategy constraints

No confirmed national cap exists on the number of degree preferences ranked within a
*single* region's Distrito Único application (unlike UCAS's 5-choice cap) — a genuine gap,
not confirmed either way this pass. The real, confirmed constraint is structural rather than
numeric: applying to public universities in more than one Comunidad Autónoma requires a
**separate Distrito Único application per region**, an administrative/logistical
consequence of "distrito abierto" (no legal preference by home region) coexisting with
fully region-fragmented application portals — not a legal quota. For the international/
UNEDasiss pathway: a homologación file takes **up to three months** to resolve once
complete, and per Catalonia's guidance must be "definitiva" before the June preinscripción
window — meaning a Turkish applicant's realistic planning horizon is materially longer than
three months once translation, apostille/legalization, and embassy-submission logistics are
added. UNEDasiss accreditation validity is 2 years for non-EU/non-agreement systems from
issuance; PCE scores must be from the same calendar year as the target cycle to count.
Finally: official Grado ("título oficial") admission, public or private, requires the nota
de acceso/UNEDasiss pathway; a private university's own **"título propio"**
(institution-specific, non-state-recognized degree) does not require it, but also carries
materially less external recognition — families should verify which type a specific
private programme actually is, never assume.

## Personal statement / essays

**Not required nationally** for standard public Grado admission — absent from Real Decreto
534/2024 and from every official government/university page reviewed. May appear as one
input within a **private** university's own separate, institution-specific process (the
private-Medicine example above included a weighted personal-interview component) — a
programme/institution-level exception, not a national feature. Consistent with the broader
continental-European pattern already confirmed in the Netherlands and Germany research:
essays are not a baseline feature of a formula-driven, threshold-and-ranking system.

## Recommendation letters

**Not found as a requirement anywhere** in the sources reviewed — absent from Real Decreto
534/2024 and every official page checked, for both public and (in the one private example
reviewed) private-university pathways. Read as "not found in sources reviewed," not a
confirmed universal absence across every private institution nationally — the private
sector was sampled narrowly (one illustrative example) this pass.

## Extracurricular activities

**Not a factor** anywhere in the nota de acceso/nota de admisión formula — the entire
public system is grades-plus-weighted-subject-exams based, with no structural place for
activities review; not found in Real Decreto 534/2024 or any official page reviewed. May
enter indirectly within a private university's own separate interview/profile-review
process (an unweighted or lightly-weighted input, per the illustrative private-Medicine
example) — institution-specific, not independently confirmed as a general pattern across
private universities this pass.

## Interviews / tests / portfolios

For standard public Grado admission: **none** — the process is exam-and-formula based
throughout. For **private** universities (illustrated by one named Medicine programme):
own written science tests, an aptitude test, and a personal interview are commonly combined
with the Bachillerato average in the university's own weighted formula, entirely outside
the nota de admisión/Distrito Único mechanism. Whether Spanish **public** universities
require a portfolio or aptitude test for inherently practice-based programmes (Fine
Arts/Bellas Artes, Conservatorio-style music and performing-arts programmes) — a pattern
confirmed in both the Netherlands and Germany research — was **not independently confirmed
or ruled out** in sources reviewed this pass. This is flagged explicitly as a genuine gap
rather than assumed true by analogy to those other countries.

## Restricted / selective programmes

Spain uses capacity limits ("plazas limitadas," colloquially still often called "numerus
clausus") per degree per university per cycle, driven by teaching-capacity constraints
(clinical placements for Medicine, lab space, staff-student ratios) — conceptually the same
driver as the Netherlands' numerus fixus and Germany's NC. The resulting cutoff is the
**"nota de corte"**: confirmed precisely as the *lowest admitted* student's nota de admisión
in that cycle's *final completed* allocation round — a self-adjusting, demand-driven
number, never a fixed threshold set in advance.

**Unlike Germany's hochschulstart** (a single national body centrally coordinating seat
allocation for exactly 4 named subjects across all participating universities), no evidence
was found of any equivalent national seat-coordinating body for Spain's competitive
programmes. Real Decreto 534/2024 Article 24 gives the central government power to set
maximum national admission limits via the Conferencia General de Política Universitaria,
but this reads as an exceptional/general-interest override, not the primary mechanism
setting any degree's actual yearly capacity — capacity appears to be set per-university,
with the *regional* Distrito Único platform then executing the ranked allocation using the
nationally-defined formula. This is a materially different shape from Germany's
national-vs-local-NC split (which divides by *subject*: 4 subjects go one way, everything
else another) — Spain instead applies the *same* allocation mechanism uniformly to every
programme, with "how competitive" emerging purely from that specific programme's
supply-vs-demand that cycle, not from a categorically different admission mechanism
switched on for named subjects.

Medicine is the clearest example: illustrative, secondary-sourced cutoff figures for one
recent cycle ranged roughly 11.4–13.4 out of a possible 14 at several public universities —
treat as illustrative and year-specific only, never authoritative or predictive of a future
cycle. Other clinical/high-demand fields (Dentistry, Physiotherapy, Nursing, Veterinary
Medicine, Psychology) are expected to follow the same pattern by structural analogy, though
not individually verified this pass. **Private universities commonly offer parallel
Medicine (and other) programmes admitted through their own separate process, entirely
outside the nota de corte/Distrito Único mechanism** — a materially different pathway, not
merely a lower-bar version of the same one, exactly as this research package's brief
anticipated checking for.

## Admissions decision model

**A single, uniform, formula-and-ranking mechanism applied to every public Grado
programme** — this is the single most important structural fact about the Spanish system
for ORYN to encode correctly, and it is genuinely different in *shape* from both the
Netherlands' bifurcated model (two categorically different admission mechanisms depending
on programme type) and Germany's national-vs-local-NC split (different mechanisms for
different named subjects). Every applicant's standing is expressed as the same nota de
acceso/nota de admisión number, computed the same way nationally, and every public
programme allocates places by ranking applicants on that number through the same regional
Distrito Único mechanism. What varies is not the *mechanism* but a single emergent
property: whether that cycle's demand for a specific programme exceeds its set capacity.
An undersubscribed programme effectively admits everyone who clears the 5.0 floor
(eligibility functionally equals admission, as in the Netherlands' non-numerus-fixus
majority); an oversubscribed one (Medicine being the extreme case) produces a high nota de
corte through the *exact same* ranking mechanism, not a different one. ORYN should
represent Spanish competitiveness as a continuous, per-programme-per-cycle property of one
uniform ranking system, not as a categorical "this type of programme is selection-based,
that type is threshold-based" split.

## Safe inferences

A UNEDasiss-accredited international applicant (once any required homologación is
complete) competes in the same general admission pool as domestic EBAU-takers, ranked
purely by the same nota de admisión number — not a segregated or capped "international"
quota (confirmed at the University of Zaragoza). For a plain, non-IB, non-EU-agreement
Turkish MEB Lise Diploması, homologación must be completed and made "definitiva" *before*
UNEDasiss will compute any admission grade — two sequential processes run by different
bodies, not one. A full IB Diploma materially simplifies the pathway for a
Türkiye-educated applicant, routing directly to UNEDasiss acreditación and skipping
homologación. Spain's subject-weighting mechanism (ponderación) functions as a competitive
scoring *bonus*, not a hard eligibility gate. Any specific year's published nota de corte
is a historical, demand-driven artifact of that cycle's applicant pool and capacity — never
a guaranteed threshold for a future cycle. Personal statements, recommendation letters, and
general extracurricular-activity review are not primary levers in standard public Grado
admission, unlike the US/UK systems. Predicted/forecast grades play no role anywhere in the
Spanish system, domestic or international — both tracks are structurally built around
final, completed results.

## Unsafe inferences

Do not assume "distrito abierto" (the national legal principle of no preference by
home-region residence) means a single national application exists — in practice a student
must submit a separate Distrito Único application to each Comunidad Autónoma whose public
universities they're targeting. Do not assume homologación and UNEDasiss acreditación are
the same process, interchangeable, or that completing one automatically triggers the other
— they are sequential, run by different bodies, and treating them as one step risks
materially derailing an applicant's timeline. Do not assume the Spain-Türkiye bilateral
educational cooperation agreement eases or fast-tracks diploma recognition — its own text
commits only to "facilitating" future cooperation, not automatic equivalence. Do not assume
a specific illustrative nota de corte figure will hold, or even approximately hold, for any
future admission cycle. Do not assume all Spanish private universities follow one uniform
admission process — the single illustrative private-Medicine example found here should not
be generalized without independent verification. Do not assume a Spanish public
university's admission process includes a portfolio, aptitude test, or interview for Fine
Arts/performing-arts-type programmes just because the Netherlands and Germany both
confirmed that pattern — not independently verified for Spain this pass. Do not assume the
ponderación (subject-weighting) mechanism is a hard prerequisite gate rather than a scoring
bonus — conflating the two would incorrectly exclude students from programmes they remain
formally eligible for.

## Eligibility, competitiveness, fit

**Eligibility**: an objective, nationally-formula-defined threshold — nota de acceso ≥5.0
(domestic EBAU, or UNEDasiss acreditación once any required homologación is complete).
Binary and checkable, consistent with the continental-European pattern already confirmed in
the Netherlands, Germany and Italy research. **Competitiveness**: not a categorically
separate admission mechanism the way it is in the Netherlands (numerus fixus) or Germany
(national/local NC) — it is a continuous, emergent property of the *same* ranking mechanism
applied to every programme: how far a specific degree's cycle-specific nota de corte sits
above the 5.0 floor, driven purely by that cycle's applicant demand against that
university's set capacity. This is a genuinely distinct "shape" from every other system in
this package and should be modeled as such, not as a binary threshold-vs-selection split.
**Fit**: expressed almost entirely through the ponderación (weighted-subject) mechanism — a
pure numeric scoring bonus for having taken and scored well in programme-relevant
Bachillerato subjects — with no narrative, holistic, or interview-based "fit" component
anywhere in the standard public pathway. This makes Spain's public-university fit signal
more purely quantitative than any other system in this package, including the Netherlands'
profiel-mapped subject match (which is at least a qualifying gate, not purely a scoring
bonus). Narrative/interview-based fit assessment reappears only in the separate private-
university pathway.

## Counselor actions

For a plain MEB Lise Diploması holder with no IB/A-Level overlay: start homologación
immediately and treat it as a multi-month critical-path item — official processing alone is
stated at up to three months once documentation is complete, and translation, apostille/
legalization, and Spanish-Embassy-Ankara submission logistics add meaningfully more lead
time in practice; do not assume this compresses into the same timeline as a domestic EBAU
applicant. Never let a family conflate homologación (Ministry-level diploma recognition)
with UNEDasiss acreditación (the actual admission-grade-generating step) — confirm
homologación is "definitiva" before assuming any progress has been made toward an actual
admission grade. If the student holds or is completing a full IB Diploma, confirm this
explicitly — it routes directly to UNEDasiss acreditación, skipping homologación, and is
materially faster and simpler than the plain-MEB route. Confirm the Spanish B2
language-proficiency requirement separately from academic-qualification recognition for any
Spanish-taught target programme. For competitive programmes (Medicine above all), help the
student maximize their nota de admisión via PCE (or EBAU voluntary phase for domestic-track
students) in subjects the target university actually weights for that specific degree —
check the university's own published ponderación list per degree, since this is set
per-university, not nationally. Never treat a prior-year published nota de corte as a
guaranteed or even reliably approximate threshold for the target cycle — present it
explicitly as historical/illustrative only. If the student is targeting universities in
more than one Comunidad Autónoma, plan for multiple separate Distrito Único applications —
there is no single national portal reaching every Spanish public university. For a student
unlikely to clear a competitive public nota de corte, distinguish clearly between a private
university's own título oficial Grado (still requires the access credential, but admits via
the university's own process) and a título propio (does not require it, but carries
materially less external recognition) — confirm which type any specific private programme
actually is before assuming it's a straightforward lower-bar alternative. Do not assume
extracurricular activities, essays, or recommendation letters will meaningfully affect a
standard public-university application — redirect that preparation time toward the subjects
the target programme actually weights. Where the student targets an arts/performing-arts-
type public programme, independently verify whether a portfolio or aptitude test applies —
not confirmed in this research pass.

## Data model implications

Spain requires ORYN's data model to represent admission facts across at least **five**
distinct scope layers for a single qualification pathway: (1) national/legal (Real Decreto
534/2024's formula structure, the 5.0 floor, the 2-convocatoria calendar framework, the
"distrito abierto" no-regional-preference principle), (2) regional/Comunidad Autónoma
(actual EBAU exam content and administration, the region-specific Distrito Único portal and
its own calendar/round specifics, and — for Catalonia/Galicia/Basque Country — regional
handling of homologación itself), (3) university (which subjects are weighted and at what
value for each degree, exact reserved-quota percentages above the national floor, each
degree's admitted capacity that cycle), (4) programme/cycle (the resulting self-adjusting
nota de corte, a pure *output* of supply-vs-demand, never an input), and (5) — uniquely for
non-EU/non-agreement international applicants — a separate two-body recognition pipeline
(Ministry/regional-authority homologación, then UNEDasiss acreditación) that must be
modeled as sequential dependent steps, not parallel or interchangeable ones. A model that
stores a single "Spain requirement" record per qualification type, or that merges
homologación and acreditación into one status field, would misrepresent how this system
actually operates.

## System / university / programme override model

**Layer 1 (national/legal)**: Real Decreto 534/2024 fixes the nota de acceso formula (60%
Bachillerato + 40% EBAU obligatory phase, ≥5.0 floor), the nota de admisión structure
(access grade + at least two university-chosen weighted subjects), the two-convocatoria
annual calendar framework, minimum national reserved-quota floors, and the "distrito
abierto" no-regional-preference principle — no university or region can override these.
**Layer 2 (regional/Comunidad Autónoma)**: each CA drafts and administers its own EBAU exam
content within the national format, runs its own Distrito Único preinscripción/allocation
portal with its own exact calendar and round structure, and (Catalonia, Galicia, the Basque
Country) handles homologación processing itself rather than routing through the central
Ministry. **Layer 3 (university)**: sets which specific subjects are weighted and at what
value for each of its own degrees, sets exact reserved-quota percentages above the national
floor, and sets each degree's admitted capacity per cycle — this is where the system's real
discretionary variation lives, expressed entirely through formula *parameters* rather than
holistic case-by-case review. **Layer 4 (programme/cycle)**: the resulting nota de corte is
a pure emergent *output* of Layer 3's capacity choice against that cycle's actual demand,
not an independent input any actor sets in advance. A separate parallel track exists
entirely outside this four-layer model: private universities' own admission processes, and
the two-body homologación-then-acreditación pipeline for non-EU/non-agreement international
applicants, both operating under different governing logic from the domestic public-Grado
stack described above.

## Unresolved questions

Whether Spanish public universities require a portfolio/aptitude test for Fine Arts
(Bellas Artes) or Conservatorio-style performing-arts programmes, as confirmed in both the
Netherlands and Germany research — not independently verified for Spain this pass. Whether
any Spanish public degree imposes a hard subject-prerequisite gate (as opposed to the
confirmed ponderación scoring-bonus mechanism). What role, if any, Türkiye's YKS national
entrance exam plays in homologación or UNEDasiss acreditación for a Lise Diploması holder —
a gap identical in kind to the same unresolved question already flagged in the Netherlands
research. Whether a Spain-specific bridge/foundation-year mechanism exists for a foreign
secondary qualification judged short of Bachillerato-equivalent. The exact methodology for
converting a foreign transcript's native grading scale into the numeric NMB figure used in
the UNEDasiss formula. Whether Turkey has its own specifically codified homologación
equivalency sub-regulation (as sources indicated Germany and France do) or is handled under
a generic, non-tabled review process. Precise English-language-proficiency thresholds for
Spain's English-taught undergraduate segment. Whether A-Levels, AP-supplemented US
diplomas, the standard French Baccalauréat, and the German Abitur are named in Real Decreto
534/2024 Article 6's exam-exemption list alongside IB and the European Baccalaureate, or
instead route through the homologación-first pathway. The precise governance process by
which each university's per-degree admitted capacity is approved each cycle. Whether any
reserved quota specifically labeled for "foreign education systems" exists at any Distrito
Único beyond the general quotas (disability, elite athletes, over-25/40/45 access, existing
degree-holders) confirmed at the University of Zaragoza — one secondary/aggregated search
result suggested a Madrid-specific 1% figure that could not be corroborated against the
primary Comunidad de Madrid page fetched directly, and should be treated as unconfirmed.
