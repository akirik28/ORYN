# US High School Diploma / Transcript System

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

**The single most important finding for this system is that there is no single system.**
That variability is the honest, expected research result — not a gap to be resolved.

## A. System identity

- **Owner/authority: none, singularly.** K-12 education policy is constitutionally
  reserved primarily to the individual states (50 states + DC + territories), each with
  its own State Department/Board of Education setting minimum graduation requirements;
  within most states, further discretion is delegated down to local school districts and
  individual schools for total credit counts, grading scales, and course offerings. The US
  Department of Education and NCES collect/publish comparative data across states but do
  **not** set a binding national diploma standard.
- **Contexts:** United States (50 states, DC, territories); American international
  schools abroad generally follow a similarly decentralized, school-specific model rather
  than one unified "US curriculum."
- **Qualification type:** State/district-issued school-leaving diploma; no separate
  national exit exam required in most states (some states impose their own — not verified
  exhaustively state-by-state in this research).
- Confidence: **high** — the absence of a single national system is itself extremely
  well-documented (NCES's own long-running "State requirements for high school graduation,
  in Carnegie units" table series exists precisely because there is no single number to
  report).

## B. Native grading model

**No single national grading scale.** Individual schools/districts set their own.
Commonly (not universally) seen: numeric 0-100 percentage grading and/or letter grades
A-F, converted locally into a GPA — typically **unweighted 4.0**, but **weighted** scales
(commonly 5.0, sometimes 6.0) adding bonus points for Honors (commonly +0.5) and AP/IB/
dual-enrollment (commonly +1.0, sometimes +2.0 on 6.0 scales) are widespread and vary
district-to-district with no standardizing body. **Two schools both claiming a "5.0
weighted scale" may compute it differently.**

**This variability is the key, expected finding, not a research gap** — confirmed by
NCES's own state-by-state Carnegie-unit tables and the complete absence of federal
grading-scale regulation. **Because of it, many US colleges do not simply use the
transcript-printed GPA** — they routinely recompute an applicant's GPA using their own
internal methodology (commonly stripping weighting, recalculating on a clean unweighted
4.0 basis) specifically to make cross-school comparison possible, itself confirming the
raw number isn't directly comparable school-to-school without knowing the local scale.

**ORYN's existing rule (never force a grade into a 4.0 GPA) is directly validated by this
research even for domestic US records** — a transcript-printed "GPA" is not a stable,
portable unit unless its scale (`gpa_scale`) and weighting status are also known and
preserved.

## C. Course / qualification structure

- **Carnegie unit** — a standardized measure of instructional time (roughly one
  year-long course meeting daily), the traditional credit-counting basis, tracked
  historically by NCES.
- **State variability, directly confirmed via two states' own agencies:**
  - **Texas** mandates a specific statewide default program (the "Foundation High School
    Program"), minimum 22 credits, per the Texas Education Agency — comparatively
    prescriptive and state-uniform, with defined subject-area minimums (e.g. 4 English
    credits).
  - **California**'s Education Code sets only specific state-minimum *course*
    requirements (e.g. 3 years English, 2 years math incl. Algebra I, 3 years social
    studies, 2 years science, 1 year language/arts/CTE elective) but explicitly leaves
    the *total* credit-unit count to individual local districts — most CA public high
    schools end up requiring 22-26 year-long courses, but the exact number varies
    **district-by-district within California itself**, not just state-to-state.
  - **National range:** per NCES/Education Commission of the States data, total required
    units range from roughly 13 in some states up to 26 in Texas's older maximal pathway;
    three states (Colorado, Massachusetts, Pennsylvania) have historically had **no**
    statewide minimum Carnegie-unit requirement at all, relying instead on state
    assessments or district-set requirements (medium confidence — NCES-derived secondary
    summary, not freshly re-verified against each state's current primary regulation).
- **Do not assume any single "typical" US graduation requirement** — always treat as
  state/district-specific, reading the actual requirement of the specific school/state
  where possible.

## D. Academic rigor signals

*(AP/IB/Dual-Enrollment coursework itself is covered in their own documents — this
section is specific to what's native to the standard US diploma track.)*

Because weighted-GPA scales exist specifically to reward Honors/AP/IB/dual-enrollment
relative to a school's own standard track, the **gap between a student's weighted and
unweighted GPA** (when both are known) is itself a locally-meaningful rigor signal — but
only interpretable relative to that specific school's own weighting policy, never across
schools without normalization. US counselor practice conventionally supplies colleges with
a **"school profile"** document contextualizing a given school's own grading scale,
weighting policy, and course offerings alongside any individual transcript — implying
rigor in the US system is inherently meant to be read *relative to* the specific school,
not as an absolute cross-school number. No ORYN-internal numeric rigor score is proposed.

## E. Predicted grades

**Not applicable / not a formal concept for domestic use.** A US transcript shows actual
grades-to-date (completed courses through the current term), not a formal prediction of a
future final grade — a structural difference from IB/A-Level, not a data gap. Predicted
grades become relevant only when a US student applies to a country that requires them
(not typically required domestically — senior-year US applicants submit actual
grades-to-date plus counselor recommendation, not a formal numeric prediction). **High
confidence** — a clean, well-corroborated "not applicable" finding, report it honestly as
such rather than forcing it to resemble the IB/A-Level pattern.

## F. Class rank

**Historically common, genuinely in decline, increasingly optional/unpublished** — a
real, sourced trend, not just an assumption. Per NACAC data referenced across multiple
sources: the share of colleges rating class rank as "considerable importance" in
admissions dropped from ~42% (2006) to ~9% (2023); **over 50% of US high schools now do
not report class rank at all**; average share of applicants submitting rank declined ~10
percentage points 2007-2017 overall, with steeper declines (14-22 points) at more
selective/Ivy-Plus institutions.

**Critical nuance:** a school not *reporting* rank doesn't necessarily mean it doesn't
*compute* it internally — many schools that still calculate it have deliberately stopped
*publishing* it (declining admissions weight, competitive-pressure concerns). **"No rank
on this transcript" should be read as "not published," not necessarily "not computed" or
as any signal about the student.** Never infer or fabricate a US student's class rank from
GPA alone.

## G. Standardized / external assessment

**No single national school-leaving exam** comparable to the French Bac or German
Abiturprüfung. The closest external, standardized assessments most students encounter are
the **SAT and ACT** — but these are **college-admissions tests** administered by
independent nonprofits (College Board for SAT; ACT Inc. for ACT), **not part of the
diploma or transcript system itself** — a student can earn a full diploma without ever
sitting either. Track SAT/ACT as separate `test_scores` evidence, never folded into
curriculum/diploma documentation. Some states have historically imposed their own
state-specific exit/end-of-course exam requirements for diploma eligibility (separate from
SAT/ACT) — not exhaustively verified state-by-state; flagged as open, not asserted as
either universal or absent.

## H. Unsafe inferences

- Do not assume any single "typical" US GPA scale, graduation-credit count, or grading
  convention — always defer to the specific school/state/district's own stated scale
  (`gpa_scale`) rather than assuming 4.0/100-point defaults.
- Do not assume a missing/unpublished class rank means the school doesn't track it
  internally — non-publication is now common practice at over half of US high schools
  specifically because of declining admissions weight, not because tracking stopped.
- Do not conflate SAT/ACT scores with the diploma/curriculum system — separate, optional,
  externally-administered admissions tests.
- Do not assume weighted GPA figures are comparable across different schools/districts
  without knowing each school's specific weighting policy.
- Do not assume predicted grades are a meaningful data point for a US-educated student's
  domestic record — largely inapplicable outside that student's own non-US applications.
- Do not assume every state's graduation-requirement structure resembles Texas's
  prescriptive statewide model — some states (e.g. California) delegate significant
  portions down to local districts, and a few historically had no statewide minimum at
  all.

## I. Counselor interpretation

**Should care about:** the specific school's own grading scale and GPA weighting policy
(via `gpa_scale` and `notes`) before drawing any conclusion from `overall_gpa`; the gap
between weighted and unweighted GPA where both are known, read relative to that school's
own weighting rules; class rank **only** when explicitly present, read with the awareness
that its absence is now the norm; the specific state/district's stated graduation
requirements as context for how much of a "standard load" a given transcript represents.

**Should not do:** force a single implied national GPA/credit standard onto every US
record; fabricate or infer a class rank when the transcript is silent; treat SAT/ACT
scores as part of the diploma/curriculum evidence rather than separate `test_scores`
evidence; assume a predicted-grade data point should exist for a domestic US applicant.

## J. Profile data-model implications (grounded against ORYN's actual schema)

`education_records.curriculum` has no explicit `us_high_school_diploma` value — mapping a
plain US diploma to `'national_curriculum'` is arguably **more** misleading here than for
France/Germany, since the US genuinely has no national curriculum at all; `'other'` may
actually be the more honest current fit, or a dedicated enum value would remove the
ambiguity entirely. `overall_gpa`/`gpa_scale` (already generic/numeric) are well-suited to
the US case **as long as `gpa_scale` is always populated accurately per-school** (4.0,
4.3, 4.5, 5.0, 6.0, or 100 — never defaulted) — this is the schema's biggest working
strength for the US case, already supporting scale preservation without forced conversion.

**Confirmed gaps:**
- **No field to record whether a given `overall_gpa` is WEIGHTED or UNWEIGHTED** — a
  materially important, US-specific gap: two students both showing `gpa_scale=5.0,
  overall_gpa=4.6` could represent very different rigor levels, or the same rigor level
  reported differently, depending on weighting policy, and the schema currently cannot
  distinguish this without free-text notes.
- No explicit curriculum value for a plain US diploma track — currently defaults to
  `'national_curriculum'` (semantically inaccurate) or `'other'` (honest but
  uninformative).
- **No structured field for class rank at all** in `education_records`. Given how central
  (if declining) a signal this historically is/was specifically in the US system, and
  given the explicit product rule to never infer it, a dedicated nullable
  `class_rank`/`class_size`/`rank_reported` field (rather than only `notes`) could reduce
  the risk of a future implementation accidentally inferring or inconsistently omitting
  this distinction — offered as a genuine, worth-flagging design consideration, not a
  demand; `'national_curriculum' + notes'` can technically capture it today, just with
  more inference risk than a dedicated field would carry.

## Unresolved questions

- Whether/which individual states currently impose their own state-specific exit exams as
  a diploma-eligibility condition (separate from SAT/ACT) — not exhaustively verified
  state-by-state.
- The precise current (2026) status of the "no statewide minimum Carnegie-unit
  requirement" claim for Colorado, Massachusetts, and Pennsylvania — sourced from an
  NCES-derived secondary summary, not freshly re-checked against each state's current
  primary regulation.
- No comprehensive state-by-state enumeration of exact weighted-GPA bonus-point
  conventions was attempted beyond the commonly-cited +0.5/Honors, +1.0/AP-IB pattern —
  illustrative/common, not exhaustive or universal.

## Primary / corroborating sources

Texas Education Agency (TEA) — Foundation High School Program, directly confirmed.
California Department of Education — Education Code course minimums, directly confirmed.
NCES / Education Commission of the States — state Carnegie-unit comparison data
(secondary-derived summary for the Colorado/MA/PA "no statewide minimum" claim and the
13-26 unit national range). NACAC (National Association for College Admission Counseling)
— class-rank-importance and non-publication trend data, referenced across multiple
sources.
