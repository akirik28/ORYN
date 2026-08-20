# Canada — undergraduate admissions system

Part of ORYN's R3.1 country-level admissions research package. See
[`README.md`](./README.md) for the cross-country matrix and evidence-based ruleset, and
`data/research/admissions-systems/admissions-systems-v1.json` for the machine-readable
version of everything below. Builds on
[`docs/research/secondary-education-systems/`](../secondary-education-systems/) (R2.1).

## A. Admissions architecture

**Genuinely decentralized at the national level — education is constitutionally
provincial in Canada**, structurally similar in spirit to the US state pattern R2.1
already documented, but with a real (if geographically limited) provincial layer the US
analysis didn't find at the state level. **No pan-Canadian platform exists.**
Centralization exists only within **three specific provinces**: **Ontario** (**OUAC**,
Ontario Universities' Application Centre — near-universal, all Ontario universities
except Royal Military College, which processes its own applications), **British
Columbia** (**EducationPlannerBC** — UBC, SFU, UVic, UNBC and others; UBC also layers its
own supplementary Personal Profile), **Alberta** (**ApplyAlberta** — links 26 publicly
funded institutions). **Quebec** is structurally distinct: CEGEP admission (the mandatory
pre-university stage for Quebec residents) is centralized regionally via **SRAM/SRACQ/
SRASL**, but admission to the actual bachelor's degree is a **separate**, university-
specific application, evaluated for CEGEP-origin applicants via the province-wide
**R-score** (cote de rendement au collégial). Manitoba, Saskatchewan, Nova Scotia, New
Brunswick, PEI, Newfoundland & Labrador: **no centralized platform found** — direct
application is the norm.

**No parallel-application restriction anywhere in Canada** — unlike UCAS's 5-choice cap,
a student may apply to as many universities across as many provinces as they're willing
to pay separate (or platform) fees for, with no exclusivity or single-choice mechanism.

## B. Qualification eligibility

**No Canada-wide credential-recognition body.** Each university independently evaluates
foreign secondary credentials against its own published country/qualification-specific
minimums. **WES** (World Education Services, a NACES-member evaluator) is used by some
institutions and, more commonly, by **immigration (IRCC)/professional licensing** bodies
— it is **not** a universal or mandatory gateway for undergraduate admission; most large
universities (U of T, McGill, UBC, Waterloo, Alberta) publish their own country-specific
equivalency tables and evaluate transcripts in-house.

## Applicant educated in Türkiye

**Likely yes for many mid-tier and non-restricted programs, but could not be confirmed
with a specific numeric Turkey threshold from an official Canadian source this pass** —
University of Toronto's country-requirement page structure (paginated, ~8 pages of
countries) confirms Turkey is a listed, individually evaluated country, but automated
fetch couldn't retrieve the Turkey-specific row. **Genuinely flagged as an open item
requiring direct manual verification per target university**, not filled with confident
inference. A strong MEB average alone likely won't be competitive for high-demand
programs (Engineering, CS, Business) at top-ranked universities without strong subject
grades — the same subject-prerequisite pressure any international applicant faces.
AP/IB/A-Level materially strengthens both eligibility clarity and competitiveness,
consistent with the pattern already found for the US and UK. LGS/YKS play no found role
in Canadian decisions (consistent with the US/UK pattern). A UK-style named foundation-
year pathway for MEB-only applicants was **not confirmed as common** — Canada appears
closer to the US pattern here, but this is inference, not a directly sourced finding.
Recognition is university-specific — no Canada-wide or reliably provincial body evaluates
Turkish credentials.

## Academic evidence used

Transcript is the central evidentiary piece for all applicant types; universities
evaluate the applicant's own curriculum directly rather than universally converting to a
single Canadian GPA scale — e.g. McGill evaluates Ontario applicants via a "Top 6" 4U/4M
average, Quebec CEGEP applicants via the **R-score**, international applicants via
country-specific transcript evaluation. **Admission averages/percentages, not a converted
4.0 GPA, are the dominant reporting convention** at most Canadian universities — unlike
common US practice. **Predicted grades are used operationally**, primarily for IB (and by
pattern A-Level) applicants applying before final results exist — McGill and University
of Alberta explicitly state they evaluate applicants "on predicted IB results" where final
results aren't yet available. Not a defining nationwide mechanic the way UK conditional
offers are, but a real, commonly used tool for internationally-curriculumed applicants
specifically — domestic provincial-curriculum applicants are typically evaluated on
interim/final grades reported directly by their school (Ontario's OUAC receives midterm
and final 4U/4M grades directly from schools).

## Predicted grades

**Yes, specifically for IB (and by strong analogy A-Level) applicants**, where final
results aren't yet available at application time. Issued by the applicant's own
IB-authorized school (generated by IB itself, independent of destination country) and
submitted as part of the application. Used to make an **initial conditional decision**
before final results publish each July; becomes unconditional once final results meet or
exceed the programme's stated minimum. Final results required by a stated deadline (e.g.
Carleton: August 15) — universities state they'll withdraw the offer, and where possible
redirect to an alternate programme, if results fall short.

## Conditional vs. unconditional admission

**Exists, functionally similar to (though less universally central-mechanic-driven than)
the UK model**, applied mainly to applicants still completing secondary school. Domestic
provincial-curriculum students (e.g. Ontario 4U/4M final grades submitted post-offer) and
explicitly IB/A-Level applicants (predicted-grade-based offer, confirmed against final
results by a stated summer deadline) both receive conditional offers. If final results
fall short, the university may withdraw the offer or (documented at Carleton) redirect to
an alternate programme the applicant does qualify for.

## Subject prerequisites

**Common and consequential at the programme level.** Competitive/technical programmes
(Engineering, CS, Business/Commerce, health sciences) typically require specific senior
courses with stated minimum grades, layered on top of the general admission average.
Illustrative: **University of Waterloo Engineering** requires five specific
Ontario-equivalent courses (Advanced Functions, Calculus and Vectors, Chemistry, Physics,
English) each with a minimum 70%, though competitive admitted averages run high-80s to
mid-90s (Software Engineering: low-to-mid 90s). **McGill IB applicants**: HL Maths
(Analysis & Approaches, or Applications & Interpretation) or SL Maths AA satisfies the
maths prerequisite for most programmes — SL Maths: Applications & Interpretation is
**explicitly NOT accepted** where a maths prerequisite is required. **Carleton IB
conditional offers vary by programme**: Bachelor of Computer Science requires min. grade
4 in HL or SL Maths; Engineering requires no grade below 5 in HL or SL Maths, Physics,
Chemistry.

## Standardized tests

**Generally NOT required** — a genuine, confirmed system-level difference from the US;
Canadian admission is predominantly grades/transcript-based, for both domestic and most
international applicants. Some universities/programmes may consider SAT/ACT as
supplementary evidence for international applicants whose local system is less familiar
to admissions officers, but this is the exception, university/programme-specific, not a
system-wide requirement. AP exam scores follow the same pattern already documented for
the US: supplementary rigor evidence in admission review, separately used by many
universities for post-enrollment credit/placement — never a diploma substitute.

## Language requirements

Standard international battery broadly accepted: IELTS, TOEFL, PTE, Duolingo. Canada also
has its own purpose-built **CAEL** (Canadian Academic English Language Assessment),
accepted by 180+ Canadian institutions, scored 10–90 (multiples of 10, "Adept" ≥70
generally sufficient) — CAEL is also recognized by IRCC for the **Student Direct Stream**
(SDS) study-permit fast-track, giving it a dual admission+immigration role distinct from
IELTS/TOEFL. Exemptions common for substantial prior English (or French, for Quebec
French-language institutions) education — e.g. McGill exempts Quebec CEGEP applicants who
completed a DEC at an English CEGEP, or a French-CEGEP DEC after the Quebec Secondary V
diploma. Minimum scores and accepted tests vary by university (and sometimes programme) —
university-level variation, not national or provincial.

## Application timing

2026-27 cycle for September 2027 entry. Most Fall-intake deadlines fall **January–March**
of the entry year. **Ontario/OUAC**: a well-documented "equal consideration" deadline
(commonly **January 15**) for Group A (current Ontario HS / OUAC 101) applications; the
earliest date universities may require a financial-commitment response is typically **June
1**. **UBC**: international deadline for 2026-27 reported as **January 15, 2027**
(tentative), with an earlier Oct 1–Nov 15 window offering a first-round-offer option +
Presidential Scholars Award eligibility. **Quebec/McGill CEGEP-stream**: deadlines run
earlier in some categories (March 1 application / April 15 supporting documents in a
recent cycle; select programmes like Music/Nursing/Social Work open as early as January
15). **Western and Atlantic Canada institutions tend toward later windows and rolling-
style flexibility**, continuing to accept applications into spring/early summer for Fall
intake until programmes fill — a real, sourced contrast to both the UK's single autumn
deadline and the US's rigid ED/EA/RD structure.

## Application strategy constraints

**No binding early-decision or Oxbridge-style single-choice exclusivity mechanism was
found anywhere in the Canadian system** — students may hold and compare multiple
simultaneous offers from different universities and provinces with no binding-commitment
mechanism analogous to US ED or the UK's Oxbridge rule. OUAC allows multiple choices
within one account but charges a base fee covering a limited number (reportedly up to 3
for the 105 stream per third-party guides, with extra per-choice fees beyond that —
official schedule should be verified each cycle). Some universities (Western) group
choices by faculty/direct-entry status. **The main real constraints are cost/fee-driven,
not rule-driven exclusivity** — a real structural contrast to both the US (ED binding
commitment) and UK (5-choice cap, Oxbridge exclusivity).

## Personal statement / essays

**Varies significantly by university — not universal, not universally absent.** Most
universities (e.g. U of T's general Arts & Science admission) evaluate primarily on
transcript, no required essay. **UBC is a notable, well-documented exception**: requires
a multi-question **"Personal Profile"** (up to 8 short essay-style responses, ~500–2100
characters each) from effectively all high-school applicants across nearly every
programme — a central, heavily weighted holistic component distinct from the norm
elsewhere in Canada. A student cannot assume either "Canada requires an essay" or "Canada
doesn't" without checking the specific target university.

## Recommendation letters

**Generally not required** for most undergraduate admission — closer to the UK's
lighter-emphasis pattern than the US near-universal model. Most institutions rely on
transcript-based (or transcript-plus-supplementary-application) review with no reference-
letter component at the undergraduate level. Where letters do appear, it's typically for
specific competitive/professional-track programmes or scholarship applications, not a
general requirement.

## Extracurricular activities

**Genuinely variable by institution, not a stable Canada-wide midpoint between US and
UK.** At some universities (U of T general Arts & Science), extracurriculars are
explicitly not considered — transcript-driven only. At others (most notably UBC, via its
mandatory Personal Profile), extracurricular depth and leadership are a heavily weighted,
near-US-level factor. Where considered at all, **depth (sustained commitment, leadership,
demonstrable outcome) is consistently valued over breadth** — but *whether* they're
considered at all is the first, university-specific question a counselor must answer.

## Interviews / tests / portfolios

Not a general requirement — applies at the programme level for creative, performance, and
some professional/health-adjacent programmes. Music programmes (U of T Faculty of Music,
UBC Music) require an audition and typically an interview. Fine Art/Design (Queen's Fine
Art, UBC Bachelor of Design in Architecture) require a portfolio, sometimes in place of a
general personal statement. Some professional-adjacent selective programmes (Western's
Ivey Advanced Entry Opportunity for Business) use additional structured evaluation beyond
grades. General Arts, Science, and most Engineering/Business direct-entry programmes
require neither.

## Restricted / selective programmes

**Real and common: a "separate faculty/programme application" model** — many universities
require applying directly to a specific faculty/programme at the point of application
(rather than a general university application streamed into a major later), each with its
own admission average, prerequisites, and sometimes supplementary application.
Illustrative: **Waterloo Engineering** is direct-entry per specific programme from day
one, with its own Admission Information Form (AIF) and, per some programmes, online
interview submissions, atop the five-course prerequisite set. **U of T Engineering**
requires a supplementary personal-profile-style application covering extracurriculars,
competitions, work experience. **Western's Ivey Business School** uses a distinct
"Advanced Entry Opportunity" (AEO) — entered from high school but formally admitted in
year three, reported acceptance rates far tighter than general admission. This means
eligibility and competitiveness must be assessed **at the programme level**, not just the
university level — the same applicant can be strong for one faculty and weak for another
at the identical institution.

## Admissions decision model

**Predominantly a grades-threshold/admission-average model**, not the US-style broad
holistic model. Universities commonly publish (or effectively operate) a minimum and a
separate, higher "competitive" admission average per programme/faculty, and most
applicants are evaluated primarily against that average plus completed prerequisites.
Admission averages are **programme-specific**, not just university-specific (McGill's
most competitive Engineering streams require ~95%+ while other programmes at the same
university require substantially less), and the actual admitted-student average often
runs well above the published minimum at oversubscribed programmes. Genuine holistic
factors (Personal Profile essays, portfolios, auditions, extracurricular evidence) apply
selectively — concentrated at specific universities (UBC) or specific competitive/
creative/professional programmes — not as a system-wide layer the way the US Common App
essay is.

## Safe inferences

Canada has no single national undergraduate application platform — OUAC, EducationPlannerBC,
and ApplyAlberta are each strictly provincial; several provinces have no centralized
platform at all. Grades/transcript and completed subject prerequisites are the dominant
signal across virtually all universities, more uniformly than the US holistic model.
SAT/ACT are not a general requirement — a genuine system-level difference from the US. IB
predicted grades are operationally used for conditional offers, confirmed against final
results by a stated summer deadline — real and documented at multiple institutions.
Quebec is structurally distinct (CEGEP + R-score) — this materially changes the
evaluation mechanism for CEGEP-track applicants specifically. No binding early-decision-
style mechanism exists anywhere found.

## Unsafe inferences

Do not assume "Canada" has one uniform national system or timeline — only three
provinces have any centralized platform at all. Do not assume OUAC's Ontario-specific
deadlines/fees/codes (101/105) apply nationally. Do not assume a Turkish MEB diploma's
exact numeric equivalency without checking each target university's own published table
— no Canada-wide table exists. Do not assume extracurriculars/essays are universally
required or universally absent — both U of T (no essay, no extracurricular review) and
UBC (heavy weight) are real, opposite examples within the same country. Do not assume
WES is a mandatory step for undergraduate admission the way it more commonly is for
immigration/professional-licensing purposes — most large universities evaluate
transcripts in-house. Do not assume a published "minimum" admission average is sufficient
for actual admission at competitive programmes — the effectively-required average often
runs 8–12+ points above the published floor at oversubscribed programmes.

## Eligibility, competitiveness, fit

**Eligibility**: whether the applicant meets the specific target university's and
programme's published minimum credential/grade/subject-prerequisite bar — must be checked
per-university and per-programme, since no national or reliably provincial eligibility
standard exists. **Competitiveness**: whether the applicant's actual average, subject
grades, and (where applicable) supplementary evidence meet or exceed the realistic
admitted range for that specific programme, commonly well above the published minimum at
oversubscribed faculties. **Fit**: whether demonstrated interests, subject strengths, and
(where evaluated) personal-profile narrative align with what that specific programme
selects for — most consequential at UBC-style holistic institutions and highly
specialized programmes, least consequential at general Arts & Science admission driven
purely by transcript average.

## Counselor actions

First identify which province(s) the student's target universities are in — platform,
deadline structure, and process differ meaningfully (Ontario/OUAC vs BC/EducationPlannerBC
vs Alberta/ApplyAlberta vs direct-application provinces vs Quebec's CEGEP-linked system).
If applying to Ontario universities, use OUAC (101 for current Ontario HS students, 105
for international/out-of-province/mature) and track the equal-consideration deadline
separately from each university's supplementary deadlines. If applying to BC or Alberta
public institutions, check whether EducationPlannerBC/ApplyAlberta covers the target
school before assuming direct application is required. If applying to a Quebec university
as a non-CEGEP (international) applicant, confirm the university evaluates international
transcripts directly rather than through the R-score CEGEP pathway. Verify each target
university's published Turkey-specific equivalency requirement directly — do not assume a
uniform Canada-wide MEB threshold exists. Confirm subject-prerequisite requirements
(Calculus, Physics, Chemistry) for the specific target faculty/programme — missing one
can disqualify an otherwise strong applicant regardless of overall average. Check whether
the target programme requires a separate faculty-specific application, supplementary
essay, portfolio, or audition. For IB/A-Level students, plan for a conditional-offer
workflow: predicted grades drive the initial offer, final results due by a stated summer
deadline confirm it — stress-test whether predicted grades meet the specific programme's
minimum. Do not assume SAT/ACT is required — check the specific target university's
policy, distinct from any US-bound testing plan.

## Data model implications

Requires a **province-aware layer between country and university** (unlike a flatter
US-state-is-mostly-irrelevant model, since in Canada the province genuinely determines
which application platform, if any, applies). An **ApplicationPlatform** entity distinct
from University is needed, since one platform maps to many universities within a
province, and most Canadian universities map to no platform at all. Quebec CEGEP-origin
applicants need a distinct evaluation-mechanism flag (**R-score**) that doesn't apply to
any other applicant type, analogous to how MEB/IB/A-Level are already distinct credential
types — R-score is not a credential type per se but a province-specific evaluation output
derived from the CEGEP DEC credential.

## System / university / programme override model

Canada has **almost nothing genuinely national** in undergraduate admissions — no
national platform, deadline, credential-equivalency table, or admissions body. The
**provincial** layer carries real, meaningful structure but only in specific provinces:
**Ontario** has the most centralized structure via OUAC (shared platform, common
equal-consideration deadline, common application codes); **Quebec** has a structurally
distinct system via the mandatory CEGEP stage and R-score mechanism (fundamentally
changing evaluation for domestic Quebec-track applicants vs. everyone else); **BC/
Alberta** have meaningful but lighter-touch shared platforms that mostly simplify
application logistics without imposing a uniform deadline/evaluation standard the way
OUAC's equal-consideration deadline does. Below the provincial layer, the **university**
layer carries most substantive admission policy (minimum averages, country-equivalency
tables, language-test acceptance, essay/profile requirements), and below that, the
**programme/faculty** layer carries prerequisite courses, competitive averages, and
supplementary components. In short: almost nothing is national, a real but geographically
limited provincial layer exists (strongest in Ontario, structurally distinct in Quebec),
and university/programme layers do the majority of the substantive work — similar in
spirit to the US "almost nothing is national" finding, but with a genuine provincial layer
the US analysis did not find at the state level.

## Unresolved questions

Exact current OUAC fee schedule and full list/definition of active OUAC application codes
beyond 101/105 (106/108/109 referenced by third-party sources, not confirmed from OUAC's
own site, which returned HTTP 403 to automated fetch). Turkey-specific numeric grade/
average equivalency thresholds at major universities (U of T's country-requirement page
listing for Turkey specifically — page structure prevented automated retrieval of the
Turkey row). Whether a foundation-year pathway is meaningfully used in Canada for
underqualified Turkish/MEB applicants, and at what scale. French Bac and German Abitur-
specific equivalency tables at named Canadian universities — not independently verified,
flagged as a gap. Whether ApplyAlberta/EducationPlannerBC enforce anything resembling
OUAC's Ontario-wide equal-consideration deadline, or member institutions retain fully
independent deadlines within those shared platforms. Current, official OUAC-published
(not third-party-summarized) 2026-27/2027-entry deadline dates — OUAC's own domain
blocked automated fetch throughout this research.
