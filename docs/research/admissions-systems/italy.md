# Italy — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**Decentralized.** Each of Italy's ~97 public (and many private) universities runs its
own separate application/enrollment system — there is **no UCAS-equivalent**.
**Universitaly** is a national portal, but its core function for non-EU applicants abroad
is **pre-enrolment + visa processing, not the admission decision itself**. Its own
official guidance is explicit: *"Pre-enrolment... does not guarantee admission to the
degree programme; you must also carry out the specific admission procedures."* EU/EEA/
Swiss citizens and non-EU students already legally resident in Italy skip Universitaly
entirely and apply directly to each university.

**Platform constraint**: a non-EU applicant abroad may hold only **one live pre-enrolment
application at a time** (one university, one programme) — switching requires the current
university to reopen/reject first, with unpredictable delays. This is a workflow limit,
not a formally declared "apply to N universities max" policy — EU/resident applicants face
no such constraint.

## B. Qualification eligibility

**National baseline (MUR)**: a minimum of **12 years of total pre-university schooling**
to access a first-cycle degree, with documented compensatory measures (MUR Attachment 1)
for qualifications obtained after only 10 or 11 years. **CIMEA**, Italy's ENIC-NARIC
center, issues a "Statement of Comparability" (increasingly substituting for the
traditional consulate-issued **Dichiarazione di Valore**, faster and fully online) — each
university independently decides which of the two it accepts/requires, and each publishes
its own country-by-country equivalency table operationalizing the national framework.

## Applicant educated in Türkiye

**Yes, on the years-of-schooling test, for most current applicants**: a standard Lise
Diploması obtained **since 2009** (12-year system) satisfies Italy's 12-year threshold on
its own (per Sapienza's official country table). Diplomas from **before 2009** (11-year
system) do not, and need compensatory measures or a Foundation Year. **But** this is
layered on top of, and separate from, a second requirement: a passing **YKS** result
(Turkish nationals) or **YÖS** (non-Turkish-citizen applicants schooled in Turkey), with a
minimum normalized **0.5 in both TYT and AYT**, and 0.5 on YTD if taken — this is
evidentiary (proving the Turkish qualification is genuinely complete under Turkey's own
system), not a score fed into any Italian ranking, and entirely separate from Italy's own
tests (TOLC/CEnT-S/IMAT/semestre filtro) if the target programme requires one of those
too. If the school offered IB/A-Level/AP instead of the standard Lise Diploması, the
applicant is assessed under those rules instead (see B credentials below) — whether
Turkey's schooling-year count still independently satisfies the 12-year floor in that
specific combination wasn't independently verified, flagged as unresolved. Foundation
Year is commonly needed only for pre-2009 diploma holders, those who haven't
sat/passed YKS/YÖS, or anyone whose qualification falls short of 12 years. The underlying
*rule* is national (MUR); each university independently *administers/verifies* it via its
own equivalency table and choice of recognition documents.

**Other credentials, per Sapienza's table**: full **IB Diploma** (not partial) needs
≥24 points across 6 subjects (12+ at HL) plus TOK/CAS/EE passes; **A-Levels** need ≥3
subjects each passing (E minimum) — IGCSE alone does not grant access and cannot
substitute even for Foundation Year; **US HSD** needs either 3 AP exams (3–5) in relevant
subjects OR ≥1 year (30 US credits) of completed university attendance — HSD alone is
insufficient; **French Bac** and **German Abitur** each meet the 12-year threshold on
their own (Fachhochschulreife does not).

## Academic evidence used

Transcripts (all school years) are supporting/corroborating documents, but Italy's
admission logic is **not** a holistic weighted-transcript review — it's a **binary
qualification-completeness + years-of-schooling + (where applicable) test-score check**.
No national grade-conversion scale exists; a handful of country-specific entries set a
minimum native-scale threshold as part of that country's own bar (Albania ≥6.5/10, Israel
Bagrut ≥55/100, Romania Bacalaureat ≥6/10) but **no minimum grade threshold is documented
for MEB** beyond holding the diploma + passing YKS/YÖS. Where the origin country has its
own standardized school-leaving/entrance exam integral to qualification completion
(Turkish YKS/YÖS, Greek Panhellenic, Spanish Selectividad, Brazilian ENEM), passing it is
generally required as **completeness proof**, not an Italian ranking input.

## Predicted grades

**No UK-style formal predicted-grade/conditional-offer mechanism exists.** The closest
analogue is procedural, not academic: Universitaly pre-enrolment can start with a
"certificate of enrolment in the final year" or a "provisional qualification" while
still finishing school, marked **"conditionally validated"** pending later document
verification — but this conditionality is about document authenticity/completeness (and,
for restricted programmes, test/language/payment completion), never a predicted final
grade. The **final, completed qualification is required to complete enrollment.**

## Conditional vs. unconditional admission

Exists, but in a **narrower, procedural** sense than the UK model. Universitaly
pre-enrolment starts "conditionally validated"; reaching "unconditional validation"
(required to actually apply for the visa/complete enrollment) requires: for restricted-
access applicants — passed the admission test, met the language requirement, paid the
first instalment, submitted authenticity/value documents; for open-access applicants —
taken the required TOLC/CEnT-S, met the language requirement, submitted documents, paid
the first instalment. Final in-person document verification happens at enrollment. **This
is about verification/procedural completion status, not a UK-style grade-prediction
condition.**

## Subject prerequisites

**Not documented nationally as a formal "must have studied X" list** (unlike UK
A-Level requirements). Enforced instead mainly through **admission-test content** (e.g. an
Engineering-track TOLC-I tests maths/physics/logic/verbal comprehension) and university-
level judgment on whether a foreign qualification's field is "relevant to the chosen
programme" — a recurring qualifying phrase for shorter/technical foreign diplomas.
Students below a set TOLC score on a **non-restrictive** programme may get an **OFA**
(Obbligo Formativo Aggiuntivo — a mandatory catch-up module) rather than being denied
admission — a university-level mechanism.

## Standardized tests

Depends entirely on programme type. **(1) Open-access programmes**: TOLC/CEnT-S may be
required as a **non-binding** orientation/placement check — doesn't block enrollment, but
a low score can trigger the OFA remedial module. **(2) Locally-capped ("numero
programmato locale") programmes**: the same test family becomes the **binding selective
ranking criterion**. **(3) Nationally-restricted Italian-taught Medicine/Dentistry/Vet
Med**: the up-front national entrance test was **replaced starting a.y. 2025/2026** by
the **"semestre filtro"** — free/open enrollment into the first semester (secondary
diploma is the only requirement, no entrance test), with selection instead based on three
propaedeutic exams (Chemistry & Biochemical Propaedeutics, Physics, Biology; 6 CFU each)
sat *during* that semester. Governing decree for 2026/27: **DM 941 of 10 July 2026**
(MUR). **(4) English-taught Medicine and Surgery**: **not** covered by the semestre
filtro reform — still uses **IMAT**, a national, mandatory, competitive up-front test
(MUR-owned, CINECA-administered since a.y. 2023/24).

**Current cycle note**: the old name **"TOLC-MED" is obsolete for the Italian-taught
track** as of a.y. 2025/26 onward (some university/secondary pages, including Sapienza's
own page title, still reference it — flagged as possibly stale content). **TOLC**
(Test OnLine CISIA) is a family developed by CISIA (a university consortium, not a MUR
body) with variants for Engineering, Economics, Pharmacy, Humanities, Sciences, Biology,
Psychology, Political/Social Sciences, Agriculture/Veterinary, professionally-oriented
programmes (~€35/attempt). CISIA discontinued its English-language TOLC variants in
November 2025, replaced by a unified **CEnT-S** (5 sections: Maths, Reasoning on
texts/data, Biology, Chemistry, Physics; 55 questions, up to 110 minutes).

## Language requirements

Two parallel tracks. **Italian-taught**: B1 or B2 typically (varies by university/
programme), via CILS/CELI/PLIDA or an equivalent, or a university-run placement test as
an alternative to a certificate. **English-taught** (an increasingly large share of
Italy's international offering): IELTS/TOEFL or equivalent, and for a defined set of
STEM/Economics/Pharmacy programmes now also gated by the CEnT-S test itself. Exemptions
set at university/programme level. Universitaly itself does **not** collect/verify
language certificates — that happens at the university, and the visa-issuing Embassy/
Consulate may separately impose its own additional requirement.

## Application timing

**Decentralized/university-specific for ordinary programmes** — each university sets its
own windows independently, most commonly opening across summer (roughly June–September),
sometimes rolling, sometimes fixed cutoffs; Bologna's own FAQ states explicitly it "has
not set a general deadline for pre-enrolment" at the Universitaly-platform level, leaving
timing to each university plus the issuing Embassy/Consulate's own visa-processing
deadlines. **Nationally-restricted programmes DO have centrally fixed dates**: for
2026/27, DM 941/2026 plus Ministerial Directive n.249 (13 July 2026) set semestre filtro
dates — secondary reporting (not independently re-verified against the full decree text)
states applications opened 13 July 2026, deadline 3 August 2026, payment by 6 August
2026. IMAT 2026: reported single national sitting 29 September 2026, Universitaly-based
registration 26 August–9 September 2026.

## Application strategy constraints

Universitaly's one-live-pre-enrolment-at-a-time rule (see A) is the main platform
friction; once fully validated and especially once a Consulate has recorded a visa
outcome, it can no longer be reopened/switched within that academic year. Nationally-
restricted-programme tests are sat on nationally fixed dates — effectively one attempt
per cycle per track. **Whether the current semestre filtro produces one unified
cross-university national ranking, or per-university rankings, was not conclusively
confirmed** — flagged as a real open question, not asserted either way.

## Personal statement / essays

**Not standard** for ordinary bachelor's/single-cycle admission — absent from every
national/near-primary source reviewed (MUR procedures, Universitaly workflow, university
equivalency tables, CISIA test descriptions), consistent with Italy's qualification/test-
threshold model. This is a safe-but-not-airtight absence inference — specific selective
English-taught international programmes could conceivably add one, not directly
evidenced either way.

## Recommendation letters

**Not standard**, same reasoning and caveat as personal statements.

## Extracurricular activities

**Not a documented factor.** Italy's admission architecture for the vast majority of
programmes is qualification/test-threshold based, not holistic-file review, so there's no
structural "place" for extracurriculars to be weighed — a safe inference from consistent
absence across the reviewed sources, not an explicit MUR disclaimer.

## Interviews / tests / portfolios

Not standard for ordinary university programmes. A **structurally different subsystem —
AFAM institutions** (Accademie di Belle Arti/Fine Arts, Conservatori/Music, related
dance/performing-arts academies) — commonly requires a portfolio and/or audition as its
normal admission mechanism (confirmed indirectly via the recurring "AFAM pathway" vs.
"ordinary-university pathway" distinction in equivalency tables). Architecture at ordinary
universities is generally TOLC-based, not portfolio-based (not exhaustively verified).

## Restricted / selective programmes — numero chiuso

Exists at **two distinct levels, must not be conflated**. **(1) National**, set by MUR
decree, currently Medicine and Surgery, Dentistry and Dental Prosthetics, Veterinary
Medicine (Italian-taught). **(2) Local/university**, where an individual university caps
a high-demand programme (Engineering, Economics, Architecture, Psychology, Communication,
etc.) and sets its own TOLC/CEnT-S-based ranking threshold — a university decision,
varies institution-by-institution and year-by-year, **not** part of any nationally
uniform list. Mechanism: national track (Italian-taught Medicine et al.) is now the
semestre filtro (open enrollment → in-semester ranked exams); national track
(English-taught Medicine) is still up-front IMAT; local track is TOLC/CEnT-S-ranked.

## Admissions decision model

**Bimodal.** (1) Qualification-threshold-based for the large majority of non-restricted
programmes — meeting the 12-year/equivalency bar, language requirements, and (where
required) a non-binding orientation TOLC/CEnT-S is sufficient, essentially automatic
within capacity, no competitive ranking. (2) Genuine ranked/test-score-based competitive
selection for numero chiuso programmes. No holistic composite score, no essay/
recommendation weighting, no invented percentage breakdown exists anywhere in the
researched architecture — Italy's model is "you meet the threshold, you're in" (open) or
"you're ranked against other candidates, places filled top-down" (numero chiuso).

## Safe inferences

A post-2009 Turkish Lise Diploması satisfies the 12-year threshold on its own; pre-2009
does not. Universitaly is a pre-enrolment/visa layer, not the admission-decision body.
TOLC/CEnT-S functions differently depending on open-access vs locally-numero-chiuso —
check per programme, never assume. Italian-taught Medicine/Dentistry/Vet Med no longer
use a single up-front national test as of a.y. 2025/26 — any reference to a fixed
"TOLC-MED test date" for that track is likely outdated. English-taught Medicine still
uses IMAT, unaffected by the reform. Personal statements, recommendation letters,
extracurriculars are not part of Italy's national admission architecture for ordinary
degrees. Italy uses no predicted grades or UK-style conditional offers — conditionality
here is procedural/document-based.

## Unsafe inferences

Do not assume every Italian university requires the same TOLC/CEnT-S threshold, language
level, or recognition document (CIMEA vs DoV) — confirm per target university. Do not
assume the semestre filtro still produces one unified national ranking the way the
pre-2025 test did — not conclusively confirmed. Do not assume numero chiuso is limited to
Medicine/Dentistry/Vet Med — many other programmes are numero chiuso at the local level,
and the list changes yearly. Do not assume a Turkish student's IB/A-Level/AP-based (rather
than Lise-based) education automatically meets the 12-year threshold without checking that
specific school's total years of instruction. Do not assume personal statements/
recommendations/interviews are universally absent — specific selective English-taught
programmes could add them at their own discretion, not directly evidenced either way. Do
not treat the reported semestre filtro/IMAT 2026 specific dates as fully authoritative
without cross-checking directly against the MUR decree and Universitaly's own pages.

## Eligibility, competitiveness, fit

**Eligibility**: for the majority of programmes (non-numero-chiuso), effectively equals
admission — once the foreign qualification meets the 12-year/equivalency threshold,
language requirements are met, and (where required) a non-binding orientation TOLC/
CEnT-S is completed, enrollment generally proceeds — a structural parallel to the
Netherlands' non-selective-programme pattern, worth stating explicitly to counselors/
students. **Competitiveness**: applies only to numero-chiuso programmes (nationally via
semestre filtro/IMAT, or locally via TOLC/CEnT-S ranking) — outside these, "how
competitive is this programme" is largely not a meaningful question in the US/UK sense.
**Fit**: determined mainly by subject/field alignment between the prior qualification and
target programme (relevant especially for shorter/technical foreign diplomas), and by
admission-test performance where one exists, rather than a holistic profile-fit
assessment.

## Counselor actions

Verify whether the target programme is nationally numero chiuso (Medicine/Dentistry/
Vet Med), locally numero chiuso (a specific university's own cap), or genuinely open-
access — the mechanism differs fundamentally. For Turkish MEB students: confirm the
diploma is post-2009 (12-year system), and confirm passing YKS (nationals) or YÖS
(non-nationals) with the required 0.5 minimum in TYT and AYT. Check whether the target
university requires a CIMEA Statement, a Dichiarazione di Valore, or accepts either —
initiate well before deadlines given processing-time variability. For non-EU applicants
abroad: confirm the Universitaly pre-enrolment targets only ONE university/programme at a
time, and plan the choice carefully given switching friction. If targeting Medicine/
Dentistry/Vet Med, confirm Italian-taught (semestre filtro) vs English-taught (still
IMAT) — entirely different preparation strategies. Confirm the language track and the
specific proficiency level/accepted certificates for each target programme. Confirm
whether a required TOLC/CEnT-S is non-binding orientation or the binding ranking
mechanism, and clarify to the student which situation applies. Advise explicitly that
Italy doesn't use predicted grades/conditional offers UK-style — the final qualification
must generally be in hand before enrollment completes. Re-verify all time-sensitive
national dates directly against the current MUR decree and Universitaly close to the
application date, given how recently this area was reformed.

## Data model implications

Requires modeling at least **four distinct scope layers** for any stored rule: national/
MUR-level (12-year threshold, compensatory measures, numero chiuso status, semestre
filtro mechanics), platform-level (Universitaly's one-live-pre-enrolment rule,
conditional-vs-unconditional validation states), university-level (local numero chiuso
caps, TOLC/CEnT-S thresholds, accepted recognition documents, language level, Foundation
Year availability), and programme-level (which specific test is required — TOLC-I vs
TOLC-E vs CEnT-S vs IMAT vs semestre filtro exams). A single flat "admission requirement"
record would collapse these incorrectly. Worth modeling generically: some origin-country
qualifications require proof of passing **that country's own national exam** as an
eligibility-completeness signal, independent of any destination-country test — a distinct
fact type from a destination-country entrance test, illustrated cleanly by the Turkey
YKS/YÖS pattern, and should not be merged with it in the data model.

## System / university / programme override model

**National** (cannot be overridden): the 12-year schooling threshold and compensatory
measures; CIMEA's ENIC-NARIC role; numero chiuso status and current mechanism for
Medicine/Dentistry/Vet Med; Universitaly's basic pre-enrolment/visa-gatekeeping function.
**Platform** (Universitaly-specific, set by MUR but operationally distinct): the
one-pre-enrolment-at-a-time rule; conditional-vs-unconditional validation workflow.
**University** (independent within the national floor): CIMEA vs DoV requirement; local
numero-chiuso caps and thresholds; enrollment timing; language level/certificates;
Foundation Year availability; whether an open-access TOLC/CEnT-S is orientation-only or
stricter. **Programme** (within a university): which specific test variant is required;
subject-relevance judgments for non-standard qualifications; interview/portfolio elements
(mainly AFAM).

## Unresolved questions

Whether the current semestre filtro produces one unified national ranking or per-
university rankings. Whether a Turkish student's IB/A-Level/AP track (vs standard Lise/
YKS-YÖS) still independently satisfies the 12-year floor. Exact treatment of Turkish
Mesleki ve Teknik Lise (vocational) diplomas under the 12-year system. Full seat numbers
and exam-date calendar in DM 941/2026's annexes weren't retrieved in full. Whether any
selective English-taught programmes require personal statements/recommendations/
interviews. The precise current relationship between Professioni Sanitarie (allied
health, e.g. Nursing) numero chiuso and the semestre filtro reform wasn't researched.
Whether Sapienza's "TOLC-MED" page title reflects genuinely outdated content.
