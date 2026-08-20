# United States — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1)
for how MEB/IB/AP/Cambridge/French Bac/German Abitur evidence is itself structured.

## A. Admissions architecture

**Decentralized — no single national platform.** Common App (1,000+ member
institutions) is the dominant private, non-profit intermediary, but is one option among
several parallel systems: Coalition for College (~150 members, delivered via Scoir since
2023), and separate state-system platforms outside Common App entirely — the UC
Application (California), ApplyTexas, Cal State Apply, applySUNY. Some institutions (MIT)
accept **no** shared platform at all. A typical applicant maintains **two or three
separate application accounts** in parallel, not one.

Common App caps one account at **20 colleges/cycle** (a platform policy, not a legal
limit — not independently re-verified against a primary commonapp.org page this pass, so
treat as high-confidence-but-unconfirmed). A student can exceed 20 total by using
additional platforms. Within Common App: one shared core (biographical data, main essay,
Activities List) + per-college supplements — the defining "one core + N supplements"
mechanic, mirrored (with separate accounts) at Coalition/Scoir and the state systems.

## B. Qualification eligibility

**No national credential-recognition body exists.** Each university's admissions office
independently evaluates foreign secondary credentials as part of holistic review. Some
public universities/community colleges require or recommend third-party evaluation
(WES/ECE, NACES-accredited) to produce a US-equivalent GPA statement — a
**university-level** practice, not a national requirement; many selective privates read
the original transcript + school-profile document directly, without conversion.

**University discretion is very high** — a structural feature (private/decentralized
higher education, well-established legal latitude), not an oversight gap. MEB, IB, A-Levels,
French Bac, and German Abitur are each "broadly legible foreign credentials, evaluated
case by case, no codified national equivalency table" — IB/A-Level are the most familiar
to US readers; no Turkey-specific codified pathway was found (see below).

## Applicant educated in Türkiye

**Unknown / not confirmed from an authoritative Turkey-specific source this pass** —
flagged honestly as a genuine research gap, not filled with confident inference. Reasoned
(not sourced) extension of the general architecture: because there's no national
credential body and every foreign credential is read case-by-case, a standard MEB diploma
is *very likely, in principle,* sufficient to satisfy the baseline "equivalent to a US
high school diploma" expectation at most universities — the real open question is
**competitiveness, not eligibility**. AP/IB/A-Level layered on a Turkish diploma plausibly
strengthens both, by giving admissions readers more legible, standardized evidence and
hitting the explicit "most rigorous coursework available" criterion several universities
(MIT, Georgia Tech) name directly — but this is inference extended from general
architecture, not Turkey-specific sourced fact. LGS/YKS results were not found to play any
role in US decisions (structural inference: they're Turkey-internal placement
instruments). A named "foundation year" pathway (the UK's documented fallback for
MEB-only applicants) does not have a clear US analogue — closer US mechanisms are
bridge/pathway programs for underprepared international students generally, not a
credential-gap-specific institution. **Recommend a dedicated follow-up pass before
presenting any of this as settled fact to a student.**

## Academic evidence used

Transcript (multi-year, plus a counselor-authored **school profile** contextualizing the
school's grading scale/distribution) is central and mandatory. Native grades are handled
at university discretion — some recalculate a US 4.0-scale GPA in-house or via required
third-party evaluation; many selective privates read the native scale directly with a
trained international reader. **Predicted grades are not a formal, decision-driving
input** the way UK predicted grades are (see below). Final grades matter via the Common
App **Mid-Year Report** (first-semester senior grades) and **Final Report** (post-
graduation transcript, confirms the offer remains valid). AP exam scores and course
rigor are read as two different things per College Board's own framing: the **course**
(with its school-reported grade) is the pre-enrollment admissions-rigor signal; the
**exam score** matters more for post-enrollment credit/placement.

## Predicted grades

**Not used as a formal, decision-driving input.** Where they surface at all (e.g. IB
predicted grades, generated by the qualification itself), they're contextual supporting
material, not a field driving a conditional-offer decision. **Fundamentally different
mechanism from the UK**: no evidence of an equivalent formal predicted-grade →
conditional-offer pipeline in mainstream US admissions. Decisions are made on the actual
record already available (through 11th grade + Mid-Year Report), then remain contingent
on the final transcript not showing significant decline — a **continued-non-decline**
condition, not a target-grade condition.

## Conditional vs. unconditional admission

The concept exists but works differently from the UK. No US-wide term equivalent to "UK
conditional offer" tied to a future target grade. Practice: admission is decided on the
available record; offer letters commonly carry contingency language (Northwestern:
*"contingent upon the successful completion of your senior year and a review of your
final transcript"*; USF: *"all offers of admission are conditional, pending receipt of
final transcripts showing work comparable in quality"*). Rescission is uncommon but real
— a ~22% figure (share of colleges reporting at least one rescission/year) is
discovery-tier (admissions-consulting compilation, not NACAC/government), so treat as
lower confidence; the underlying mechanism (contingent on non-decline) is better
supported by real offer-letter language.

## Subject prerequisites

University/programme-level guidance, not a national or system-wide hard rule — framed as
"most rigorous coursework available at your school" rather than a fixed checklist, since
US schools vary enormously in what they offer. Illustrative: Georgia Tech and MIT both
state expectations for calculus-track math/science preparation without mandating a single
national syllabus.

## Standardized tests

**The single fastest-moving policy area in US admissions** — fragmented and
university-specific, verify per school before advising any student. As of retrieval
(2026-08-20): mandatory-testing reinstated at Harvard, Yale, Dartmouth, Brown, Cornell
(Fall 2026), Penn, MIT, Caltech, Stanford; Princeton and Columbia stay test-optional
through 2026-27 but go mandatory from 2027-28; Florida and Georgia public systems fully
reinstated; Notre Dame, Duke, Northwestern stay test-optional for 2026-27, Vanderbilt
through Fall 2028. **Confidence caveat: sourced from admissions-consulting aggregators**,
not a single official/NACAC dataset — re-verify per university before real advice.
AP exam scores: per College Board's own site, colleges weigh the course + its school
grade more heavily at the *admissions* stage; the numeric exam score matters more for
the separate, post-enrollment credit/placement process.

## Language requirements

No single mandated national test. University-set acceptance of TOEFL iBT (incl. Home
Edition), IELTS Academic (incl. Online), Duolingo, sometimes Cambridge English Scale.
Exemption pattern (university-set, not automatic): citizenship/nativity-based (e.g.
Australia, UK, Ireland — country list varies by university) or English-medium-of-
instruction (commonly 3+ years). Per UPenn's own FAQ, exemptions are "not guaranteed" and
must typically be actively requested/demonstrated.

## Application timing

2026-27 cycle (Fall 2027 entry); Common App opened July 31, 2026. Early rounds (ED/EA/REA)
cluster ~Nov 1–15; Regular Decision ~Jan 1–15; Rolling Admission has no single deadline.
These are industry-wide conventions reinforced by Common App's own cycle-tracking
cadence, but **each university still sets its own exact date**.

## Application strategy constraints

**Early Decision is binding** (College Board's own language: accepted-ED students "must
attend," "may apply to only one college early decision," "must withdraw all other
applications if accepted"). **Restrictive/Single-Choice EA** is non-binding on enrollment
but can still restrict simultaneous ED/EA/REA elsewhere. The practically significant
counselor-relevant fact: an ED choice forecloses comparison-shopping financial aid offers
from other schools — a real financial trade-off to surface explicitly, not just academic.

## Personal statement / essays

**Central and structurally mandatory.** The Common App main essay (from a set prompt
list) is required from every applicant on the platform; per-college supplemental essays
vary widely.

## Recommendation letters

**Normally required** at most Common App/Coalition institutions — a structural,
near-universal expectation. Typical pattern: one counselor recommendation + one or two
teacher recommendations, submitted directly by the recommender.

## Extracurricular activities

Structurally present (Common App's Activities List, up to 10 entries + up to 5 honors)
but **weighted more modestly than popular narrative suggests**. Per NACAC's own
factor-importance survey data: grades/rigor rated "considerable importance" by
75–80% of colleges, test scores by ~56%, extracurriculars by a much smaller share (exact
percentages accessed via secondary compilations of the NACAC report, not the raw table —
treat as approximate; the ordinal ranking — grades/rigor > tests > extracurriculars — is
well supported). **This directly contradicts an oversimplified "US cares mostly about
extracurriculars" claim.**

## Interviews / tests / portfolios

Not universal. Alumni/admissions-officer interviews (often optional/informational) at
some selective privates; portfolios for art/design/architecture/media; auditions for
performing arts. Programme/institution-level, verify per target.

## Restricted / selective programmes

**No government-mandated national numerus-fixus system.** The closest US analogue is a
patchwork of **university-level direct-admit programmes** (NYU Stern, Michigan Ross,
Cornell Dyson admit directly into a named business/engineering school at first-year
application) and **capacity-constrained majors** (nursing near-universally, CS at roughly
half of top-100 universities per one policy-brief source, many engineering/finance
majors) requiring internal competitive transfer post-enrollment. This must always be
checked per university/major — it does not generalize nationally.

## Admissions decision model

**Holistic review** — confirmed via College Board's own definition, not an ORYN
assumption: *"[c]onsideration of multiple, often intersecting, factors — academic,
nonacademic, and contextual — that, in combination, uniquely define and reflect
accomplishments and potential contributions."* No single deterministic formula. **No
authoritative source publishes explicit percentage weights** for any institution — ORYN
must never invent or assign such weights.

## Safe inferences

No third-party US body issues a binding eligibility ruling for a foreign credential; a
stronger course load is a broadly positive signal regardless of home curriculum; SAT/ACT
requirement status is university- and cycle-specific and must be re-verified, not treated
as evergreen; an ED acceptance is a genuine binding commitment; extracurriculars support
but don't outweigh academic record at the system level; a high AP exam score matters more
for post-admission credit than for the admission decision itself; predicted grades (where
they exist) are not a UK-style conditional-offer trigger; a US offer typically remains
contingent on the final transcript not showing significant decline.

## Unsafe inferences

Do not assume a Turkish MEB diploma alone is definitively sufficient or insufficient for
a named university without checking that university's current page — no authoritative
Turkey-specific source was found. Do not apply UK conditional-offer logic. Do not assume
a fixed testing policy across cycles. Do not assign specific percentage weights to a named
university's factors unless it has explicitly published one. Do not treat "US favors
extracurriculars" as a system-level truth. Do not assume Common App's 20-school cap is a
national/legal limit. Do not assume MIT-style direct application is rare — state-system
platforms mean a large share of public-university applicants never touch Common App at
all. Do not present the ~22% rescission statistic as precise/authoritative.

## Eligibility, competitiveness, fit

**Eligibility**: the baseline "equivalent to a US HS diploma" test plus whatever named
prerequisites/testing/language requirements the specific target university currently
states — largely binary once that university's current page is known, but "known"
requires checking *that* university, since no national standard exists.
**Competitiveness**: fundamentally not determinable in the abstract — admission is
holistic, institution-specific, and compared against an applicant pool ORYN cannot fully
observe; this is precisely why any admission-outlook feature must present ranges/
qualitative outlooks with explicit uncertainty, never false-precision percentages, for
the US specifically. **Fit**: a separate, non-academic judgment about size/culture/
location/cost/programme-strength alignment with the student's own goals — reasoning ORYN
can help with even when competitiveness is uncertain.

## Counselor actions

Confirm each target university's current-cycle SAT/ACT policy directly (never rely on a
static prior-year assumption); decide and sequence an ED/EA/REA/RD strategy explicitly,
flagging ED's binding, financial-aid-foreclosing nature; identify which platform(s) each
target university actually uses early (a student's list may need 2–3 separate accounts);
request recommendations with adequate lead time, confirming each university's required
count; complete the Activities List with depth over entry-count; verify AP/IB/A-Level
official score-submission deadlines separately from the application timeline; identify
subject-prerequisite gaps for the target major early enough to still address them;
proactively check third-party credential-evaluation and English-proficiency-exemption
requirements for international applicants — both university-specific; for direct-admit or
capacity-constrained majors, confirm at first-year application time whether the major
itself must be applied to directly.

## Data model implications (grounded, conceptual — no schema change proposed)

Distinct entities the US case argues for: an **ApplicationPlatform** entity separate from
University (one university can require multiple platforms simultaneously); an
**ApplicationRoute** per university (which platform(s), direct-only status); an
**AdmissionPlan** (ED/EA/REA/RD/Rolling) scoped per-university with binding-status,
deadline, and cross-plan-restriction fields; a **PredictedGradePolicy** that should record
*"not structurally used for admission decisions"* as a first-class value for the US
rather than defaulting to null (so ORYN doesn't silently assume UK-style behavior); a
**TestingPolicy** scoped per-university-**per-cycle** (not evergreen), carrying
`last_verified_at`; a **CredentialEvaluationRequirement** per university; a
**RestrictedProgramme/DirectAdmitMajor** entity per university+major.

## System / university / programme override model

The "national" layer is **minimal to the point of near-absence** for US undergraduate
admissions specifically — no ministry admissions authority, no single platform, no
credential body, no subject-prerequisite law. What exists at a quasi-national layer is
**industry convention reinforced by a dominant private intermediary** (Common App's own
mechanics, adopted by scale, not mandate) — and even that is only one of several parallel
systems. Nearly everything that matters (testing policy, prerequisites, credential
evaluation, deadlines, direct-admit rules, language exemptions, recommendation counts) is
set at the **university** layer, sometimes the **programme** layer within it. ORYN should
default to university/programme-level specificity for nearly every US admissions fact and
treat any "national"-scoped claim with heightened scrutiny.

## Unresolved questions

No authoritative Turkey-to-US-specific admissions source was found (a genuine gap,
recommend targeted follow-up via Turkish international-school counseling offices' own
published guidance, or direct outreach to US international-admissions offices). The
Common App 20-school cap wasn't independently verified against a primary page. No single
authoritative current-cycle SAT/ACT dataset exists from a government/NACAC-tier source —
all specific-university claims here are discovery-tier pending per-university
verification. The College Board's "Understanding Holistic Review" PDF could not be fully
rendered (core quote corroborated via separate citation). No source distinguishes French
Bac/German Abitur treatment beyond the general "broadly legible, evaluated case by case"
pattern. Exact NACAC extracurricular-importance percentages came via secondary
compilation, not the raw report table.
