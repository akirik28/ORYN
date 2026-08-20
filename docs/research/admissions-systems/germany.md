# Germany — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds directly on
[`docs/research/secondary-education-systems/germany-abitur-dsd.md`](../secondary-education-systems/germany-abitur-dsd.md)
(R2.1) — the DSD≠Abitur distinction established there is the load-bearing fact for this
document's Turkey section.

## A. Admissions architecture

**Two parallel routes.** (1) The four nationally-coordinated Numerus-Clausus subjects —
**Humanmedizin, Zahnmedizin, Tiermedizin, Pharmazie** — go through
**hochschulstart.de (Stiftung für Hochschulzulassung)** via the **DoSV**
(Dialogorientiertes Serviceverfahren), which centrally allocates seats across
participating universities. (2) Everything else is **decentralized**: direct application
to each university, though many universities require/accept **uni-assist e.V.**
pre-processing of international applicants' foreign qualifications first. **uni-assist is
a processing/pre-check service, not a decision body** — the admitting university still
decides. uni-assist's own "about us" page cites roughly **150** member institutions
(other sources range 150–180+ depending on counting method — treat as imprecise).

## B. Qualification eligibility

**Anabin** (anabin.kmk.org), maintained under KMK authority, is the authoritative
reference for whether a foreign secondary qualification is treated as equivalent to the
Abitur for direct entry (**Hochschulzugangsberechtigung, HZB**), or whether the holder
must first attend a **Studienkolleg** and pass the **Feststellungsprüfung (FSP)**. DAAD's
own admission-requirements database explicitly draws on Anabin and states it's a
non-binding preliminary check — *"the final decision on admission always lies with the
higher education institution."* Anabin classifies country-by-country using access codes
(commonly summarized as **H+** = directly equivalent, **H-** = insufficient alone
(Studienkolleg+FSP required), **H+/-** = conditional/restricted access — this exact
terminology could not be independently confirmed on Anabin's own live pages this
session, treat labels as medium confidence, while the underlying three-tier logic is
corroborated by DAAD's Studienkolleg guidance).

## Applicant educated in Türkiye

**Generally NO for unrestricted Universität access.** Per a KMK Anabin news notice on
Turkey, a standard 12-year Lise Diploması grants only **restricted, subject-specific
access to Fachhochschulen** (applied-sciences universities) — and only when combined with
proof of a qualifying Turkish national placement-exam result **and** proof of an actual
assigned place at a Turkish university-affiliated Yüksekokul in a 4-year Lisans programme.
**Without that combination, Studienkolleg + Feststellungsprüfung is required for any
university access.**

**The single most important non-obvious distinction for ORYN's counselor logic**: **DSD
resolves language readiness only, never the separate academic-qualification-recognition
question.** DSD I (~A2/B1) satisfies German-language proof for *admission to*
Studienkolleg; DSD II (~B2/C1) satisfies German-language proof for *direct enrollment* in
a German-taught programme — but **neither level changes whether the underlying MEB Lise
Diploması is classified H+, H-, or H+/- in Anabin**. A DSD II holder with a standard
(non-hybrid) MEB diploma and no other qualifying credential still generally needs
Studienkolleg + FSP for the academic side, even though DSD II already satisfies the
language side of both Studienkolleg and direct enrollment. **Never conflate a DSD
credential with academic qualification recognition.**

Pathways that most reliably unlock fuller access: (a) 1–2 years of completed credit at an
Anabin-H+ Turkish university (subject-matched to the intended programme); (b) an
internationally-benchmarked qualification alongside/instead of MEB — **IB Diploma is,
per DAAD, explicitly exempt from the Studienkolleg requirement** (functions as a full
HZB); A-Levels are generally recognized depending on subject/grade profile (not
independently re-verified this pass); (c) graduation from a German-curriculum school in
Turkey with its own KMK-recognized Abitur-equivalent — **Deutsche Schule Istanbul's**
DSD II + separate **"Deutsches Internationales Abitur" (DIA)** track, or the **GIB**
(Gemischtsprachiges Internationales Baccalaureat) bilingual pathway at schools like
ALKEV/İELEV — these are **not** the standard MEB Lise Diploması and should be tracked as
a distinct credential type. **Freshness caveat**: the KMK Anabin Turkey notice accessible
this session cited the pre-2018 **YGS** exam terminology and a 2015-dated decision
(effective Sommersemester 2016), predating Turkey's 2018 reform to YKS (TYT+AYT+YDT) —
the specific numeric threshold ("more than 180,000 points on YGS") is likely stale and
should be reconfirmed against a live, current Anabin Turkey page before use with a
2026/27-cycle applicant.

## Academic evidence used

For direct-entry-qualified applicants, the **final** qualification/transcript and its
overall grade (Abiturnote or converted equivalent) is the primary evidence for non-NC
programmes; for NC programmes it's the core input to the Abiturbestenquote and one input
among several to AdH. Foreign grades convert to the German 1.0–4.0/6.0 scale via the
**Bavarian formula** or an equivalent KMK-endorsed methodology, applied by uni-assist
(producing a **VPD**, Vorprüfungsdokumentation) or the university's own International
Office — a **purpose-bound** conversion for German-admission purposes only, never a
general GPA. A home-country exam integral to the underlying qualification (Turkey's YKS,
France's Bac exams) is what Anabin evaluates as *part of the qualification*, not a
separate SAT/ACT-style test.

## Predicted grades

**No, not in the UK conditional-offer sense** — not identified in any official source
consulted (DAAD, hochschulstart, uni-assist, Anabin). Admission for direct-entry-qualified
applicants is generally decided on the **final** qualification (final Abiturnote or
Anabin-equivalent, or completed FSP for Studienkolleg-track applicants), not a predicted
or in-progress result. Near-completion applicants may apply and be provisionally
processed, but enrollment requires the final certificate.

## Conditional vs. unconditional admission

Exists, but in a **narrower, different** sense than UK predicted-grade offers. **(1)
Studienkolleg-track**: admitted to the Studienkolleg itself conditionally on later
passing the FSP — the FSP is the actual gate to bachelor's enrollment, not the bachelor's
admission itself. **(2) Pending-final-results**: an applicant may submit with an interim
transcript, but Immatrikulation requires the completed final certificate before the
semester starts. **(3) NC programmes**: an AdH offer can be provisional pending final
Abiturnote confirmation in the narrow pre-results window. Fundamentally different from a
UK "AAB conditional on predicted grades" offer made months ahead on teacher judgment.

## Subject prerequisites

Operate mainly through (a) the applicant's demonstrated subject profile within their
qualification (Abitur Leistungskurs choices, or a foreign equivalent) and (b) explicit
programme-level lists published by individual universities — not a national cross-
programme framework. Studienkolleg course tracks are themselves subject-prerequisite
gates: passing the FSP in the **T-Kurs** (technical) only qualifies for technical/
engineering/natural-science programmes, not law or humanities — per DAAD's guidance, the
same logic applies to **M-Kurs** (medicine/biosciences), **W-Kurs** (economics/social
sciences), **G-Kurs** (humanities), **S-Kurs** (languages).

## Standardized tests

SAT/ACT are **not required** for Abitur-equivalent-qualified applicants — confirmed by
complete absence from DAAD's official overview and hochschulstart's own criteria pages.
For the 4 nationally-coordinated NC subjects, Germany uses its **own** domestic aptitude
tests as one AdH input at universities that choose to weight them: **TMS** (Test für
Medizinische Studiengänge) and **HAM-Nat** (Hamburger Naturwissenschaftstest) —
optional-by-university, not nationally mandatory; which universities weight them (and how
heavily) varies (e.g. Bochum/Bonn/Köln reportedly weight TMS heavily; Hannover reportedly
weights vocational/training experience; Heidelberg reportedly uses an interview). **TMS
and HAM-Nat are scheduled to merge into a single "TMSnat" from the 2027 cycle** per
multiple German-language admissions-consulting sources — not independently confirmed via
hochschulstart's own primary announcement, medium confidence.

**Post-reform Medicine criteria**: following the **Bundesverfassungsgericht's 19 December
2017 ruling** (Case 1 BvL 3/14, 1 BvL 4/14) that the prior allocation rules were partly
unconstitutional (criticizing the then-uncapped waiting-time quota, which had grown to
~15 semesters for some applicants), a new Staatsvertrag took effect from early 2020.
Current model (after a Vorabquote of ~20% for special applicant groups is deducted):
**Abiturbestenquote** (~30% of remaining seats — Abiturnote-only ranking, NC around 1.0 in
most Länder for Human Medicine), **AdH/Auswahlverfahren der Hochschulen** (~60% — each
university's own weighted combination of Abiturnote plus TMS/HAM-Nat/vocational
experience/interview, varying by institution), **ZEQ/Zusätzliche Eignungsquote** (~10% —
gives weaker-Abiturnote applicants a non-grade path). The pre-reform stand-alone
waiting-time quota appears to have been replaced by this structure — no evidence of a
pure waiting-time quota persisting in its old form, though residual waiting-time-like
credit may exist within ZEQ/AdH as a factor. **These percentages are consistently
reported by secondary sources but not independently confirmed against hochschulstart's
own primary quota table this session** — reconfirm before treating as authoritative.

## Language requirements

Two parallel tracks. **German-taught**: generally ≥B2, typically **C1-equivalent**
(DSH-2/3 or TestDaF 4 in each band) for full study, evidenced via DSH (administered by
the university itself), TestDaF, telc Deutsch C1 Hochschule, Goethe-Zertifikat C2, or
**DSD Stufe II**. **English-taught** (a genuinely large, growing category — reported
~1,984 English-taught programmes nationally, ~244 English-taught bachelor's, concentrated
at technical universities/private institutions): IELTS or TOEFL iBT, commonly cited
IELTS 6.0–6.5/TOEFL iBT 80–90 (exact thresholds vary meaningfully, not resolved to one
authoritative DAAD table — secondary sources gave inconsistent exact cutoffs). **DSD
II is explicitly recognized as satisfying the language requirement for direct enrollment
in German-taught programmes — the direct, well-established use of DSD in this system —
but it does not, on its own, resolve the separate academic recognition question.**

## Application timing

Per-semester: **Wintersemester** (starts ~October) and **Sommersemester** (starts
~April) — not all programmes admit for both; many bachelor's only have a Wintersemester
intake. **Wintersemester deadline: commonly 15 July** (some universities, e.g. TU
München, set materially earlier internal deadlines, sometimes May). **Sommersemester
deadline: commonly 15 January** (some sources give an earlier "early December"
start-of-window rather than a hard cutoff — reconfirm per-university/per-cycle). **NC/
hochschulstart runs on its own, earlier schedule**: hochschulstart's own FAQ (directly
fetched) states a **31 May** Wintersemester deadline for the NC-coordinated subjects,
notably earlier than the general 15 July university deadline.

## Application strategy constraints

**hochschulstart/DoSV**: applicants rank a bounded preference list — reported by
hochschulstart's own FAQ as **up to 12 combinations** of subject+university (should be
reconfirmed against current-cycle DoSV rules, not cross-verified against a second primary
source this pass); the platform enforces real-time offer/response coordination across the
list rather than allowing indefinite simultaneous holds. **Non-NC/direct**: no
platform-level cap on universities applied to, but uni-assist per-package fees and
per-university document requirements create a practical, not regulatory, limit. A student
can pursue hochschulstart-NC and non-NC direct applications **in parallel** — separate
systems, separate deadlines.

## Personal statement / essays

**Not standard** for most direct-entry bachelor's admission — absent from DAAD's official
overview (which centers on qualification recognition, language proof, application venue).
Specific programmes (some English-taught international-degree tracks, some Studienkolleg-
track applications) may request a motivation letter at the programme level — the
exception, not the rule.

## Recommendation letters

**Not standard**, same pattern and caveat as personal statements — absent from DAAD's
official overview, consistent with the qualification-threshold-based dominant model.

## Extracurricular activities

**Not a primary factor** for the great majority of programmes (predominantly Abiturnote-
threshold-based). The one meaningful exception: **NC Medicine's AdH quota post-2020
reform** — some universities explicitly weight health-related professional/vocational
experience (nursing training, paramedic work, relevant internships) as a scored
criterion, but this is programme/university-specific *within* AdH (reportedly weighted
heavily at Hannover), not a general national policy, and specific to health-related
experience rather than general leadership/clubs/sports in the US-holistic sense.

## Interviews / tests / portfolios

Art/Design (Kunsthochschulen) and Music (Musikhochschulen) institutions commonly require
a portfolio (Mappe, often ~15–20 work samples) and/or a practical **Eignungsprüfung**
(portfolio review + practical tasks + colloquium/interview); Musikhochschulen require a
live or video-pre-selected audition (**Vorspiel**). For NC Medicine, an interview
(**Auswahlgespräch**) is used as one AdH criterion by some but not all universities
(reportedly Heidelberg) — not nationally mandated.

## Restricted / selective programmes

**National NC**: exactly **4 subjects** — Humanmedizin, Zahnmedizin, Tiermedizin,
Pharmazie — coordinated centrally by hochschulstart.de using the quota structure above.
**Local NC (örtlicher Numerus Clausus)**: an entirely different, decentralized mechanism
— individual universities set their own thresholds/procedures for popular programmes
(commonly Psychology, Business Administration/BWL) purely by that specific university's
demand that cycle, using self-defined criteria — fluctuates yearly, set independently per
institution, **not** coordinated by hochschulstart or any national body. Applying to the
same nominal "NC" subject at two universities can mean two entirely different local
thresholds.

## Admissions decision model

**Eligibility/threshold-based** for the majority of direct-entry-qualified applicants to
non-NC programmes (largely automatic once HZB/equivalence + any local-NC threshold are
met); **quota-based ranked competitive allocation** for the 4 nationally-coordinated NC
subjects (Abiturbestenquote + AdH + ZEQ); **locally competitive threshold-based**
allocation for local-NC programmes. Fundamentally **credential-gate-based**, unlike US
holistic or UK predicted-grade-conditional models — the primary question is "does this
applicant hold (or will they hold) a recognized qualification meeting the threshold for
this programme."

## Safe inferences

A student with a fully KMK-recognized HZB (Abitur, IB Diploma, or Anabin H+ foreign
qualification) applying to a non-NC, non-local-NC-restricted programme can generally
expect largely eligibility-based admission once documentation/deadlines are met. For the
4 NC subjects, the final Abiturnote (or converted equivalent) remains a central input
across all three quotas. DSD II satisfies the LANGUAGE requirement; it does not by itself
satisfy the ACADEMIC qualification-recognition requirement — track as two independent
facts. A standard 12-year MEB Lise Diploması, absent additional qualifying credentials,
should be treated as very likely requiring Studienkolleg for full access. SAT/ACT are not
part of the standard evaluation path. Personal statements and recommendation letters are
not standard requirements.

## Unsafe inferences

Do not assume a DSD credential (any level) alone satisfies full academic-qualification
recognition — it only ever addresses language. Do not assume any 12-year foreign diploma
is automatically Abitur-equivalent — Studienkolleg exists precisely because this is often
false. Do not assume the numeric YKS/YGS threshold in the KMK Anabin Turkey notice
accessed this session is current for 2026/27 — it references the pre-2018 YGS structure
and a 2015 decision date. Do not present the 30%/60%/10% quota split, or the "12
preference" hochschulstart limit, as precisely and permanently fixed without
reconfirming against hochschulstart's own primary documentation. Do not treat uni-assist's
member-university count as a stable, precise figure (~150–180+ range across sources). Do
not assume local NC thresholds are stable year to year — they explicitly fluctuate with
each cycle's demand.

## Eligibility, competitiveness, fit

**Eligibility**: whether the applicant holds (or can obtain via Studienkolleg) a
KMK/Anabin-recognized HZB, and whether the qualification's subject profile and programme
prerequisites are met — **the dominant, load-bearing gate in the German system, more so
than in most other systems ORYN covers.** **Competitiveness**: relevant mainly within the
4 nationally NC-restricted subjects and locally-NC-restricted programmes at high-demand
universities — outside these, competitiveness in the US/UK holistic sense is largely
absent, admission is closer to a binary eligibility check. **Fit**: operates mainly
through subject-alignment (Studienkolleg track, Leistungskurs choices, programme
prerequisites) and, for German-taught programmes, language-readiness (DSH/TestDaF/DSD II
level) rather than narrative/extracurricular fit signals.

## Counselor actions

Check the applicant's qualification against Anabin or DAAD's admission-requirements
database **first**, before discussing any specific university, to establish whether
Studienkolleg is required. For a Turkish MEB Lise Diploması holder: verify YKS placement
result and threshold status; whether the student holds IB, A-Levels, or a German-
curriculum-school Abitur-equivalent (DIA/GIB) instead of/alongside standard MEB; and
whether Studienkolleg is therefore the realistic default — do not assume direct entry.
**Separately** verify DSD level for language readiness and Anabin status for academic
readiness — never conflate the two, and explain to the family that DSD II alone doesn't
remove the Studienkolleg requirement if the diploma needs it. Determine whether the
target programme is nationally NC-restricted (only the 4 subjects — apply via
hochschulstart/DoSV, its own earlier schedule) or locally NC-restricted/unrestricted
(apply directly, or via uni-assist if the university is a member for that specific
programme). For NC Medicine, check which AdH criteria the specific target university
weights. Confirm German-taught vs English-taught status early, since this determines the
relevant language-proof track. Don't prepare a personal statement/recommendation letters/
extracurricular narrative as a default expectation — confirm programme-by-programme
first.

## Data model implications

Requires tracking qualification-recognition status (Anabin H+/H-/H+/- or equivalent) as a
field **separate from** the underlying qualification type, since the same qualification
type (MEB Lise Diploması) resolves differently depending on companion evidence (YKS
result, IB/A-Level overlay, accredited-university credit, German-curriculum-school
status). Language-proficiency evidence (DSD, TestDaF, DSH, IELTS, TOEFL) must be modeled
as an **independent entity** from academic-qualification-recognition evidence, linked but
never merged, given how frequently these get conflated. Programme records need an
`nc_scope` field distinguishing none/local/national (only 4 subjects ever get "national");
universities/programmes need an `application_platform` field distinguishing hochschulstart/
uni-assist/direct, since a single university can require different platforms for
different programmes.

## System / university / programme override model

**National**: Anabin/KMK qualification-comparability classification (determines
Studienkolleg necessity) + hochschulstart's national NC allocation for exactly 4 subjects
+ the Studienkolleg/FSP mechanism itself (a nationally standardized bridge triggered
whenever an applicant's qualification isn't independently sufficient, regardless of
target university). **Platform**: uni-assist's processing/pre-check service — applies the
national Anabin standard but is a member-university-specific intermediary, not law; some
universities skip it entirely. **University/Programme**: local NC thresholds (independent
per university per cycle, uncoordinated), programme-specific subject prerequisites,
language-score cutoffs above the national baseline, and supplementary requirements
(portfolios, auditions, interviews, motivation letters) for the minority using them. A
given student's pathway is the **intersection** of all three: national status determines
IF they can proceed at all; national/local NC distinction determines WHICH allocation
mechanism applies; university/programme rules determine the SPECIFIC extra requirements.

## Unresolved questions

The current (2026/27) Anabin classification code and explanatory text for the standard
Turkish MEB Lise Diploması, verified from a live page rather than a possibly-outdated KMK
news notice referencing pre-2018 YGS. Whether the cited YGS threshold has been formally
updated to a current YKS-scale equivalent. Hochschulstart-published (not secondary-
reported) exact current Abiturbestenquote/AdH/ZEQ percentages and Vorabquote for 2026/27.
Whether any residual waiting-time-weighted element persists within ZEQ/AdH post-reform.
The precise current hochschulstart DoSV preference-list limit (only single-source "12").
uni-assist's precise current member-university count. Authoritative (DAAD-table-sourced)
IELTS/TOEFL thresholds for English-taught programmes. Whether TMSnat has been formally
confirmed by hochschulstart itself. Current Anabin classification for A-Levels, French
Bac, and US HSD (none independently re-verified this pass).
