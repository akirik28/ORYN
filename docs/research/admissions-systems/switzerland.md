# Switzerland — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**No shared application or registration platform exists at all — not even a
Studielink-style registration-only layer.** Switzerland has 12 "universities": 10
cantonal public universities (Basel, Bern, Fribourg, Geneva, Lausanne, Lucerne,
Neuchâtel, St. Gallen, Zurich, USI/Lugano) plus 2 federally-run institutes (ETH Zurich,
EPFL), each requiring a fully separate, direct online application through its own portal.
A distinct parallel sector, Fachhochschulen/Hautes écoles spécialisées (universities of
applied sciences, FH/HES-SO), runs its own admissions logic entirely (see B). The closest
thing to a shared layer is **swissuniversities**, the universities' own umbrella
association (a rectors'-conference body, not a government ministry), which publishes an
annually-revised country-by-country admission-requirements reference that member
institutions draw on — but it explicitly disclaims deciding anything: "the relevant legal
provisions of each university are decisive." **Federal/cantonal split**: ETH Zurich and
EPFL are run directly by the Confederation (the "ETH Domain"); the other 10 are legally
the responsibility of their home canton. No government body processes or decides a
Bachelor's application anywhere in this system — every decision sits with the individual
institution's own admissions office.

## B. Qualification eligibility

**Baseline qualification: the gymnasiale Maturität (federal Matura)**, or a foreign
upper-secondary certificate recognized as equivalent. Recognition of the Matura is a
**joint cantonal-federal instrument**: EDK/CDIP (the inter-cantonal Swiss Conference of
Cantonal Ministers of Education) issues the Regulation of Baccalaureates (MAR), paired
with the Federal Council's own Ordinance on the Recognition of Baccalaureates (MAV) —
neither layer alone is sufficient. CDIP's 2011/2015 declarations commit to **long-term
exam-free university access** for Maturität holders, confirmed directly by ETH Zurich:
"If you hold a Swiss Matura, you gain direct admission to any ETH bachelor's programme —
no entrance exam required." For foreign qualifications, swissuniversities' country list
sorts every country/diploma type into one of three outcomes: **(1)** direct admission
without exam, reserved for diplomas meeting a documented grade/subject threshold (e.g. IB
38/42 points with a defined Higher/Standard Level subject spread; German Abitur, Austrian
Reifeprüfung or French Baccalauréat with a ≥70% average across three core examined
subjects plus four more studied, and, for France, an overall average of 16.00/20+);
**(2)** admission gated behind ETHZ's or EPFL's own Reduced Entrance Examination once
minimum documentary conditions are met; **(3)** ETHZ's Comprehensive Entrance Examination
(five subjects) if they are not. **The two higher-ed tracks differ structurally, not just
by threshold**: a Berufsmatura (federal vocational baccalaureate) combined with
field-matched vocational training grants exam-free FH/HES admission (plus generally ≥1
year of related practical experience), but does **not** by itself grant university/ETH
admission — that requires EPFL's or ETH's own entrance-exam bridge. **Swiss ENIC**
(hosted at swissuniversities) is the national ENIC-NARIC contact point, but its
documented remit is evaluating foreign **higher-education (tertiary)** degrees via a
non-binding "statement of comparability" — it is **not** the mechanism governing
upper-secondary diploma recognition for Bachelor's entry; that sits with the
swissuniversities country list plus each university's own office. Do not conflate the two.

## Applicant educated in Türkiye

**Only two certificate types are named as recognized: Anadolu Lisesi Diplomasi and Fen
Lisesi Diplomasi** (Turkey carries the "(L)" marker — 1997 Lisbon Recognition Convention
signatory). Confirmed independently on swissuniversities' own country list and, verbatim,
in ETH Zurich's official "Admission requirements" PDF (Academic Year 2025/26): *"Turkey
(L): Upper secondary school-leaving certificate + certificate of university admission in
the desired academic subject provided by a recognised Turkish university + reduced
Entrance Examination ETHZ. Otherwise: Comprehensive Entrance Examination ETHZ."* Other
MEB-system Lise sub-types (Genel Lise, Meslek Lisesi, İmam-Hatip Lisesi) are simply **not
named** on either list — a genuine gap, not a confirmed exclusion (unlike, e.g., Tilburg
in the Netherlands, which explicitly excludes Meslek/İmam-Hatip). **At the 10 non-ETH/EPFL
universities**, the Lise diploma plus a "certificate of university admission to a 4-year
programme in the desired academic subject provided by a recognised Turkish university" is
stated as sufficient on its own — no ECUS, no further exam. St. Gallen adds its own HSG
selection procedure on top regardless (it applies to all foreign-certificate holders);
USI adds "special conditions" (Admission Regulations art. 8 para. 3), not further detailed
in sources reviewed. **At ETHZ, there is no exam-free pathway for this qualification at
all**: even the Lise diploma *plus* the Turkish-university-admission certificate still
requires the Reduced Entrance Examination (mathematics + one further subject, in German);
without that certificate, the Comprehensive Entrance Examination (five subjects) applies
instead. **At EPFL**, Turkey falls under "a country that is not a member of EU, EFTA, nor
UK" — eligible for EPFL's own entrance exam (in French; CHF 150 registration tax + CHF
550/800 exam fee), with the CMS preparatory mathematics course accepted as an equivalent
alternative. **YKS's role is structurally implied but never named**: no Swiss source cites
a YKS score directly, but since Turkish Lisans admission is itself YKS-gated, YKS is the
mechanism that *produces* the required "certificate of university admission" — an inferred
causal link, not a Swiss-confirmed criterion. **AP/IB/A-Levels held alongside or instead
of the Lise diploma materially change the picture**: evaluated under IB (38/42 +
defined subjects) or A-Level (three A-Levels grade A in maths/science/language + four
more subjects) criteria instead, which can reach ETHZ's exam-free bar — materially easier
than the plain-Lise pathway. **"One year of completed accredited home-country university
study" as an ETHZ transfer-evaluation alternative** was found only via secondary
consultancy sourcing (college-council.com), **not** independently confirmed on an
ethz.ch primary page this pass — flag as secondary-corroborated only. No dedicated Swiss
government "foundation year" pathway for foreign qualifications generally (distinct from
Germany's Studienkolleg) was identified.

## Academic evidence used

Full transcript and final school-leaving certificate required; the **Complementary
Examination of Swiss Universities (ECUS)** is required for many applicants from
non-Lisbon-Convention or otherwise insufficiently-recognized diploma types, but is
**confirmed not to apply to Turkey**. Native grades are read on their original scale with
country-specific minimum thresholds set by each university, not a universal GPA
conversion — the pattern already found in every other country in this package. ETH
Zurich's official country-by-country PDF reveals a **recurring shared template applied
almost uniformly across roughly 190 countries**: the final 2-3 years of schooling must
show (1) mathematics, (2) physics/chemistry/biology, and (3) the language of instruction
or a foreign language as *examined* subjects (commonly ≥70% average across those three),
**plus** four further subjects, from a defined list, studied during the final three years.
Only the named certificate and grade threshold vary by country; the 3-core-plus-4-more
structure itself does not. This differs from the Netherlands' profielen (a specific Dutch
curriculum's internal structure) — in Switzerland this template *is* the
qualification-recognition mechanism for foreign applicants, not a layer applied after.

## Predicted grades

**No native Swiss-Matura predicted-grade artifact.** Cantonal gymnasiale Matura final
exams commonly sit in May-June, *after* the ~30 April general application deadline several
universities cite — meaning Swiss-track applicants, like foreign ones, may plausibly apply
before final results are confirmed. No source reviewed explicitly labels this "conditional
admission" system-wide for domestic Matura holders, unlike the UK or Netherlands — treat
as a plausible but **unconfirmed inference, a genuine gap**. For foreign IB/A-Level/AP
applicants, predicted or interim grades **are** submitted and relied on operationally: the
University of St. Gallen's own checklist explicitly allows "the half-year report of the
final year" or a school confirmation if the final certificate isn't yet available, with
the actual certificate required "as soon as you receive it, no later than the start of
the course."

## Conditional vs. unconditional admission

**A narrower, more procedural sense than the UK or Netherlands.** No source uses a
distinctly-named "conditional offer" status (no equivalent of UCAS Track or Dutch
*voorwaardelijke toelating*) for the general route — the functional equivalent is
administrative: interim documents are accepted provisionally, final certificate due
before the programme starts. This places Switzerland closer to Germany's/Italy's "narrow
procedural sense" cluster than the UK/Netherlands' "load-bearing mechanic" cluster.
**Restricted fields show a clearer two-stage decoupling**: for Medicine/Dentistry/
Veterinary Medicine/Chiropractic, a Matura-equivalent qualification establishes
eligibility only; admission itself depends separately on the EMS ranking (or, in
French-speaking Switzerland, the first-year selection exam) — eligible and admitted are
explicitly different states here.

## Subject prerequisites

**For foreign qualifications, subject prerequisites are built directly into the
qualification-recognition template** described above (mathematics + a science + language
of instruction as examined subjects, plus four more studied subjects), not layered on as
a separate programme-specific filter. **For Swiss-Matura holders, whether individual
Bachelor's programmes require a specific Matura Schwerpunktfach (subject specialization)
was not independently confirmed this pass — a genuine gap**, unlike the Netherlands'
well-documented VWO-profiel mapping. Specific programmes add further content: EMS itself
tests scientific reasoning and spatial/quantitative ability rather than memorized biology
(per swissuniversities' own EMS materials), and Basel lists "special provisions" for
Sport, Exercise and Health alongside Medicine.

## Standardized tests

**No SAT/ACT-equivalent exists anywhere in the system.** The dominant instrument is
**EMS (Eignungstest für das Medizinstudium)** — a full-day aptitude test (~CHF 300, once
yearly, early July) covering scientific reasoning, spatial/quantitative ability and
memory/concentration, used by Basel, Bern, Fribourg, Zurich (incl. its Lucerne and St.
Gallen tracks), USI and ETH Zurich for Human Medicine, Dentistry, Veterinary Medicine and
Chiropractic. Per swissuniversities, EMS activates specifically "when the number of
study-interested persons exceeds the number of available study places by more than 20
percent." One EMS sitting is usable across the entire consortium — a shared *instrument*
despite no shared *platform*. **Geneva, Lausanne and Neuchâtel (French-speaking) do not
use EMS at all** — absent from swissuniversities' own EMS-user list; secondary Swiss-press
sourcing (Le Temps, 20 minutes) indicates they instead admit broadly into first-year
Medicine (BMed1) and apply a competitive first-year/propaedeutic exam to determine
progression to year two — a post-entry rather than pre-entry mechanism for the *same*
restricted field. **Do not describe Swiss Medicine selection as one national mechanism**
— it is at least two, split by linguistic region. Separately, ETH Zurich and EPFL each run
their own bespoke Reduced/Comprehensive (ETHZ) or single-tier (EPFL) entrance
examination, university-specific and unrelated to EMS. St. Gallen's online aptitude test
(quantitative problem-solving + diagram/table interpretation, 70 minutes) is a further,
HSG-specific instrument used only in its foreign-quota selection procedure (see Restricted
/ selective programmes).

## Language requirements

**The most distinctive Swiss finding relative to every other country in this package:
Bachelor's instruction is overwhelmingly German, French or Italian — not English.** ETH
Zurich's Bachelor's programmes are taught in German from year one, "mostly German"
thereafter with only some individual English courses; EPFL's own documents and
registration run in French; Geneva/Lausanne/Neuchâtel are French-medium; USI is
Italian-medium. This is a materially different emphasis from the Netherlands' or
Germany's substantial English-taught Bachelor's offerings, and from Swiss **Master's**
programmes, commonly English. A confirmed exception: St. Gallen's Assessment Year
(Bachelor year one) in Economic Sciences (Business Administration, Economics,
International Affairs, Law and Economics) **"can be taken either entirely in English or
entirely in German"** (HSG's own page) — though the standalone Law and Computer Science
Assessment Years at HSG are German-only. Required proficiency in the instruction language
is commonly **C1 CEFR** (UZH and Bern require German C1; HSG recommends C1), while Geneva
requires French at B2 (DELF/DALF or UNIGE's own test). IELTS/TOEFL-style English tests are
**not** the load-bearing language gate for most Swiss Bachelor's programmes — materially
different from the Netherlands/UK/Germany's English-taught tracks.

## Application timing

**No single national deadline.** A general (non-restricted) deadline around **30 April**
is cited across several universities; St. Gallen's own page independently confirms an
application window of **1 October – 30 April** for its Assessment Year. EPFL's
entrance-exam registration runs on its own earlier schedule (1 October – 1 December, for a
January scientific-exam sitting), distinct from EPFL's general application timeline. ETH's
own entrance exam sits annually in "the third and fourth weeks of the year" (mid/late
January). EMS sits once yearly in early July, on a separate registration schedule not
independently confirmed to the day this pass. **Non-EU/EFTA applicants needing a Swiss
student visa are commonly advised (secondary-corroborated) to submit by roughly
end-February** to leave time for visa processing — explicitly a **visa-processing-driven
practical target, not a university admissions deadline**; do not conflate the two.
Findings reflect the 2025/26–2026/27 cycle as published at the time of this research
(retrieved August 2026); re-verify closer to any future cycle.

## Application strategy constraints

**No shared platform means no shared numeric choice-limit** — unlike UCAS's 5, the
Netherlands' 2-numerus-fixus cap, or Germany's 12-preference hochschulstart list, a
student may apply directly to as many of the 12 institutions as time/money allow, each an
independent process with its own fee (commonly CHF 100–250, rising to CHF 268 at St.
Gallen from autumn 2026). EMS is a partial exception: one sitting is usable across the
entire consortium. **EPFL's new 2025–2029 admissions cap** (3,000 first-year Bachelor's
places, for at least four years) is a live, time-bound constraint: Swiss nationals, Swiss
Matura holders, and all CMS/entrance-exam passers are guaranteed a place, while EPFL's own
announcement separately states non-Swiss-qualification holders "compete" on secondary-
school GPA/points if oversubscribed — **exactly which subgroup this GPA-ranking touches
was not fully disambiguated in the source reviewed; do not over-specify.** St. Gallen's
25%-by-law foreign-student quota plus its twice-yearly-only, two-stage selection procedure
is a further hard constraint specific to foreign-certificate holders targeting HSG.

## Personal statement / essays

**Not a standard requirement anywhere in the general route reviewed.** The closest
analogue is St. Gallen's foreign-applicant-only selection procedure, which includes a
~10-minute **recorded video interview** on motivation and interests — oral rather than
written, and specific to HSG's foreign quota, not a general Swiss feature. An
aggregator-sourced claim that Geneva requires a statement of purpose, letters of
recommendation and a CV was **not** corroborated on UNIGE's own official page (which lists
only diploma, grade, language and ECUS-type requirements) — treat as unconfirmed
aggregator content, not a verified requirement.

## Recommendation letters

**Not identified as a standard requirement in any official Swiss source reviewed**,
consistent with the pattern already established for the Netherlands, Germany, and Italy.

## Extracurricular activities

**Not a documented factor in any official source reviewed for the general route.** The
threshold/qualification-based model (or, for restricted fields, the aptitude-test/ranking
model) leaves no structural place for holistic activities review — the same pattern
already confirmed for Italy and, for non-selective programmes, the Netherlands.

## Interviews / tests / portfolios

Four distinct, non-overlapping mechanisms confirmed: **(1)** St. Gallen's video interview,
foreign-quota applicants only; **(2)** the EMS aptitude test, for Medicine/Dentistry/
Veterinary Medicine/Chiropractic in most linguistic regions; **(3)** ETH Zurich's and
EPFL's own bespoke entrance examinations, for foreign diplomas that don't clear the
direct-admission bar; **(4)** Geneva/Lausanne/Neuchâtel's post-entry first-year selection
exam for Medicine, structurally distinct from EMS. **Portfolio-based Bachelor's admission
(art/design/music) was not independently confirmed this pass** — such programmes exist
(commonly at Fachhochschule/HES level, e.g. Zurich University of the Arts) but fell
outside this pass's scope; a genuine gap, not a confirmed absence.

## Restricted / selective programmes

**At least four structurally distinct mechanisms operate simultaneously — Swiss "numerus
clausus" is not one system.** (1) **EMS pre-entry test**: Basel, Bern, Fribourg, Zurich
(+ Lucerne/St. Gallen tracks), USI, ETH Zurich, for Medicine/Dentistry/Veterinary
Medicine/Chiropractic, activated when demand exceeds places by more than 20%. (2)
**French-region post-entry selection**: Geneva, Lausanne, Neuchâtel admit broadly into
first-year Medicine, then rank/cut after first-year exams — the same restricted fields, a
genuinely different mechanism, split by linguistic region rather than by programme or
university choice as elsewhere in this package. (3) **EPFL's blanket capacity cap**
(3,000 first-year Bachelor's places at EPFL specifically, 2025–2029): not field-specific
— caps EPFL's entire Bachelor's intake, with Swiss-qualification and exam-route holders
guaranteed and other applicants potentially GPA-ranked. (4) **St. Gallen's 25%-by-law
foreign-student quota**, confirmed directly on HSG's own page ("Foreign applicants with a
recognised international educational certificate can only be admitted through the HSG
selection procedure... the number of places for foreign applicants... is limited by
law") — gated by certificate origin/nationality across *all* HSG fields, not by academic
field. (5) Narrower programme caps also exist, e.g. Basel's "special provisions" for
Sport, Exercise and Health.

## Admissions decision model

**Multi-tier, with a foreign-vs-Swiss-qualification axis baked in even at the "ordinary"
level.** (a) Swiss Matura + non-restricted field: threshold-based, essentially automatic.
(b) Foreign diploma meeting a direct-admission threshold (IB 38+, Abitur/Bac ~70%+16/20):
also threshold-based, exam-free. (c) Foreign diploma not meeting that bar: threshold-based
but gated behind a pass/fail entrance exam (not a ranked competition) at the 10 cantonal
universities — **except EPFL's new capacity cap can convert this into a genuinely
ranked/competitive step** if oversubscribed. (d) Medicine/Dentistry/Veterinary
Medicine/Chiropractic: genuinely selection/ranking-based (EMS score, or the French-region
first-year rank). (e) St. Gallen: genuinely selection/ranking-based for **all**
foreign-qualification applicants regardless of field, due to the 25% legal quota. No
disclosed percentage-weighted formula was found anywhere in this system.

## Safe inferences

A Swiss-Matura holder targeting a non-restricted field can be treated as essentially
certain of admission once the Matura is confirmed. A foreign applicant whose diploma
clears the swissuniversities/ETH direct-admission threshold can likewise be treated as
exam-free eligible at most institutions. A Turkish MEB-system applicant holding only a
plain Lise diploma (not Anadolu Lisesi or Fen Lisesi) should be flagged as an
unconfirmed-recognition case requiring direct university verification, not assumed
eligible. Any Turkish applicant should be told a Turkish-university admission certificate
is very likely also required, and that ETH Zurich requires its Reduced Entrance
Examination regardless of whether that certificate is produced. Any applicant targeting
Medicine/Dentistry/Veterinary Medicine/Chiropractic must be told which linguistic-region
mechanism (EMS vs. French-region first-year exam) applies to their target universities —
these are not interchangeable. Recommendation letters and broad extracurricular review
are not meaningful levers anywhere in this system.

## Unsafe inferences

Do not assume Switzerland has any shared application platform, even registration-only —
it does not. Do not assume swissuniversities' country list accepting a diploma type means
admission is secured — it establishes eligibility at most, and ETHZ/EPFL commonly add
their own entrance-exam layer on top even then. Do not assume "numerus clausus" is one
national mechanism — EMS, the French-region first-year exam, EPFL's new blanket cap, and
St. Gallen's foreign quota are four different things with different triggers. Do not
assume Swiss Bachelor's programmes are commonly English-taught by analogy with Swiss
Master's or with the Netherlands/Germany — outside a small number of specific tracks
(confirmed at HSG), they are not. Do not assume a YKS score is itself a named Swiss
admission criterion — only the resulting Turkish-university admission certificate is
named; the YKS link is inferred, not source-confirmed. Do not assume the "one year of
completed foreign university study" ETH transfer route is verbatim-confirmed — it is
secondary-sourced only this pass. Do not assume EPFL's new capacity cap is permanent — it
is explicitly framed as a 2025–2029, at-least-four-year measure, reviewable afterward.

## Eligibility, competitiveness, fit

**Eligibility** is an objective, checkable threshold for the large majority of the
system: is the qualification Matura-equivalent, and, where applicable, has the required
entrance exam been passed. **Competitiveness essentially does not exist as a separate
concept** for Swiss-Matura holders in non-restricted fields, or for foreign applicants
clearing a direct-admission threshold — eligible and admitted are the same outcome,
similar to the Netherlands' and Italy's non-selective programmes. It re-emerges sharply
and dominates exactly where restriction applies: Medicine/Dentistry/Veterinary
Medicine/Chiropractic (EMS or the French-region exam), EPFL once its capacity cap binds,
and St. Gallen for every foreign applicant regardless of field. **Fit** has essentially no
formal role anywhere reviewed — no motivation letter or holistic review exists for the
general route; the closest is HSG's foreign-quota video interview, one structured input
rather than a freestanding narrative judgment.

## Counselor actions

Confirm which of the 12 institutions a target programme sits at, since each runs a fully
separate application with no shared platform to lean on. For any foreign-qualification
student, check the swissuniversities country list first, but never treat listing on it as
equivalent to admission — verify per-university whether an entrance exam (ETHZ/EPFL) or a
selection procedure (HSG) applies on top. For a Turkish MEB-educated student: confirm
whether the diploma is Anadolu Lisesi or Fen Lisesi (the only named types); arrange proof
of admission to a Turkish university programme in the matching subject proactively, since
most Swiss universities require it; and set expectations for ETH Zurich/EPFL specifically,
where an entrance exam applies regardless of that documentation. Where the student holds
AP/IB/A-Levels alongside a Turkish diploma, evaluate under those criteria instead, since
they can reach an exam-free bar the plain-Lise pathway cannot. For any
Medicine/Dentistry/Veterinary Medicine/Chiropractic target, determine early which
linguistic-region mechanism applies — EMS requires dedicated aptitude-test preparation
months ahead; the French-region route instead demands a strong first university year. For
EPFL, do not assume a guaranteed place for a non-Swiss-qualification applicant even after
clearing the entrance-exam pathway, given the 2025–2029 capacity cap. For any HSG target,
budget for the mandatory two-stage foreign-applicant selection procedure (fixed February
or June sittings) well in advance. Confirm the actual language of instruction per
programme — do not assume English is available anywhere outside the confirmed HSG
Economic Sciences exception — and plan German/French/Italian proficiency (commonly C1)
accordingly, well before application.

## Data model implications

Switzerland requires ORYN's data model to represent admission facts across **at least
five distinct scope levels**, more than any other country in this package: (1) joint
federal-cantonal (Matura recognition, via MAR/MAV), (2) inter-cantonal coordination
(CDIP's exam-free-access commitment; swissuniversities' shared but non-binding country
list), (3) federal-institution-specific (ETHZ's and EPFL's own entrance-exam rules and
EPFL's capacity cap, applying only to these two institutions), (4) cantonal-university-
specific (each of the 10 cantonal universities' own regulations, including St. Gallen's
quota-driven selection procedure), and (5) linguistic-region clustering as an independent
axis cutting across university boundaries (the EMS-vs-French-region-exam split for
identical restricted fields). A single "country requirement" record per qualification
type would be actively misleading here — arguably more so than for any other country
researched, because even the *shared* baseline (the swissuniversities list) is explicitly
non-binding, and the two federal institutions add their own exam layer the ten cantonal
universities do not.

## System / university / programme override model

**Layer 0 (joint federal-cantonal)**: recognition of the gymnasiale Maturität itself, via
EDK/CDIP's MAR regulation paired with the Federal Council's MAV ordinance — binding
nationally; no university can redefine what counts as a valid Matura. **Layer 1
(inter-cantonal coordination, non-binding)**: CDIP's exam-free-access commitment, and
swissuniversities' shared country-by-country reference — both coordination layers every
institution consults but that do not themselves decide any case ("the relevant legal
provisions of each university are decisive"). **Layer 2 (institution type)**:
universities/ETHs (Matura-track) versus Fachhochschulen (Berufsmatura-track) run
genuinely different admission logics, not just different thresholds. **Layer 3
(individual institution)**: where Switzerland diverges most sharply from every other
country in this package — ETH Zurich and EPFL each layer their *own* entrance-exam
requirement on top of the shared baseline (the same Turkish diploma package sufficient
alone at 10 cantonal universities still requires ETHZ's Reduced Entrance Examination),
while St. Gallen layers a quota-driven selection procedure regardless of qualification
strength. **Layer 4 (linguistic region)**: for Medicine and related restricted fields,
German/Italian-speaking institutions use EMS while French-speaking institutions use a
structurally different post-entry exam — a grouping axis cutting across, not nesting
inside, the institution layer. **Layer 5 (programme)**: subject-prerequisite content
embedded in the foreign-qualification recognition template itself, plus narrower
programme rules (Basel's Sport, Exercise and Health provisions). ORYN should never present
a Layer 3, 4, or 5 fact as if it were a Layer 0 or Layer 1 national fact.

## Unresolved questions

Whether individual Bachelor's programmes require a specific Matura Schwerpunktfach from
Swiss-track applicants, analogous to the Netherlands' profiel mapping — not independently
confirmed this pass. Whether "one year of completed accredited home-country university
study" is a verbatim-confirmed ETH Zurich transfer pathway or only a secondary
characterization — only secondary sourcing was found. The precise legal instrument
(cantonal statute vs. university regulation) behind St. Gallen's 25% foreign-student
quota — confirmed as "limited by law" on HSG's own page, but the specific statute wasn't
identified. Exactly which applicant subgroup EPFL's GPA-ranking mechanism touches when
its 3,000-place cap is oversubscribed — not fully disambiguated in the source reviewed.
Whether YKS scores play any explicit, named role in Swiss recognition of Turkish
qualifications beyond indirectly producing the Turkish-university-admission certificate —
no Swiss source named YKS directly. Whether portfolio-based Bachelor's admission exists at
Swiss *university* level (as opposed to Fachhochschule level) for art/design/music — out
of scope this pass. The precise EMS registration deadline and its relationship to each
consortium university's own general deadline — not independently confirmed to the day.
Full current-cycle Turkey-specific criteria at Lausanne, Neuchâtel, Lucerne and Fribourg
individually — this pass sampled ETHZ, EPFL, UZH, Bern, Geneva and St. Gallen directly,
plus the swissuniversities aggregate covering all 12; a dedicated per-university sweep of
the remaining institutions' own Turkey-specific pages was out of scope.
