# International Baccalaureate Diploma Programme (IB DP)

Part of ORYN's R2.1 secondary-education-system research package. See
[`README.md`](./README.md) for the cross-system matrix and evidence-based ruleset, and
`data/research/academic-systems/secondary-systems-v1.json` for the machine-readable
version of everything below.

**Access note:** ibo.org is protected by a Cloudflare bot-verification challenge that
blocked both direct page fetching and a browser this research session. All ibo.org facts
below come from search-engine snippet-level extraction of indexed ibo.org pages — the
official domain, quoted/paraphrased, but not independently re-verified against a raw
page fetch. Facts flagged accordingly; a follow-up direct-fetch pass is recommended before
using any of this in exact product copy.

## A. System identity

- **Owner/authority:** International Baccalaureate Organization (IBO), a Geneva-based
  non-profit foundation, founded 1968.
- **Contexts:** Global — 6,200+ authorized "IB World Schools" in 160+ countries (per
  ibo.org's own "Facts and figures," search-snippet). DP targets ages ~16-19, typically
  the final two years of secondary school.
- **Qualification type — two genuinely distinct outcomes, not one:**
  1. The **full IB Diploma** — awarded only when a candidate completes all six subjects
     plus TOK, EE, and CAS and meets the passing conditions (see B).
  2. **"IB Diploma Programme courses"** (a real, named IBO pathway, sometimes called IB
     course candidates) — a student takes one or more individual DP subjects and sits
     the subject assessment(s) for an **IB course result/certificate**, *without*
     TOK/EE/CAS and *without* the overall Diploma being awarded.

  A student can have IB HL/SL subject grades on record **without ever having pursued or
  earned the Diploma itself.** This is a precise, source-grounded distinction — directly
  relevant to J below.

## B. Native grading model

- Each of the 6 subjects (HL and SL alike — level affects depth/hours, not the scale) is
  graded **1-7**, 7 highest.
- **TOK and EE** are each graded separately **A-E**, then combined via an official IBO
  points matrix into **0-3 bonus "core points."** (One example combination recovered:
  B+C → 2 points; the full current matrix could not be retrieved verbatim this session —
  flagged as an unresolved question.)
- **Diploma total: max 45** = 42 (6×7) + 3 core points. A bounded composite with its own
  pass/fail logic — **not a GPA**, no official GPA-scale equivalence.
- **Passing/award conditions** (medium-high confidence, search-snippet-sourced from
  ibo.org's own "DP passing criteria" page): total ≥ 24 points; **no grade E in TOK or
  EE** (automatic fail regardless of total); at least grade 2 in every subject; no more
  than two grade 2s; no more than three grade 3s-or-below; ≥12 points across HL subjects;
  ≥9 points across SL subjects; a grade awarded in every subject/TOK/EE (nothing
  incomplete); CAS completed and certified (pass/fail, not graded).
- **No universal IB→GPA conversion exists or should be invented.** Grade boundaries
  (raw-mark-to-1-7 cutoffs) are reset by IBO after every session, per subject, per level —
  there is no fixed percentage table. Any GPA-equivalence table in circulation is, at
  most, a specific receiving university's own internal admissions policy and must be
  labeled as that institution's choice, never a universal IB rule.

## C. Course / qualification structure

Subject grade (1-7), TOK grade (A-E), EE grade (A-E), CAS completion (pass/fail, not
graded), predicted grade, final examination result, and diploma total (0-45, derived) are
**six/seven separate concepts** — ORYN must never flatten them into one number.

- **Subject groups:** one subject from each of Groups 1-5 plus a sixth from Group 6 (the
  arts), OR (per IB flexibility — medium confidence, not independently re-verified this
  session) a second Groups-1-5 subject in place of the arts subject.
- **HL vs SL:** at least 3, not more than 4, of the 6 subjects at Higher Level; the rest
  Standard Level. Same 1-7 scale for both — level affects instructional depth, not the
  grading scale. (Commonly-cited ~240h HL / ~150h SL over two years — medium confidence,
  widely repeated but not independently re-confirmed this session.)
- **TOK** (Theory of Knowledge) — required core element, distinct from the 6 subjects.
- **EE** (Extended Essay) — required ~4,000-word independent research essay, distinct
  from the 6 subjects.
- **CAS** (Creativity, Activity, Service) — required core element, **not graded at all**;
  assessed complete/incomplete by the school's CAS coordinator against 7 IBO-defined
  learning outcomes. Diploma is withheld if incomplete, independent of academic
  performance.
- **Predicted grade** — teacher-assigned, pre-exam estimate (1-7 per subject), submitted
  by the school (not the student).
- **Final examination result** — the actual 1-7 grade, released after the exam session.

## D. Academic rigor signals

Number/identity of HL vs SL subjects is a real, factual rigor signal ORYN can surface
as-is — do not compress into a synthetic score. Let the counselor/scoring layer interpret
relevance to the student's target field (e.g. HL Economics + HL Math for an Economics
target) using these raw facts; this research does not propose a numeric "IB rigor score."

## E. Predicted grades

**Formally exist**, are named and official (distinct from a generic "teacher estimate"),
and are **used directly in university admissions before final results exist.** Set by the
school/teachers using internal assessments, mock exams, coursework, and professional
judgment (no single fixed IBO formula independently confirmed this session). In the UK,
predicted grades flow to UCAS for conditional offers ahead of July results; UCAS's own
guidance (search-snippet, direct fetch blocked) states predictions "should be set
independently of an applicant's university or college choices" and be "objective and
data-driven" — final admission still requires the *achieved* result. **A predicted grade
is never equivalent to, or a reliable proxy for, the final result** — ORYN must keep them
as genuinely separate data points, and surfacing a large predicted-to-final gap is itself
informative, not something to hide.

## F. Class rank

IBO does not compute, define, or publish class rank as part of the DP. Whether a specific
IB World School reports rank is a school/national-system policy choice entirely
independent of the IB curriculum — many IB schools explicitly do not rank. **Never infer
or derive class rank from 1-7 subject grades or the diploma total.**

## G. Standardized / external assessment

Final subject grades derive from a mix of **externally-set/marked written exams** and,
for many subjects, **internally-assessed components** (e.g. Internal Assessments, oral
components) marked by the student's own teacher and then **externally moderated**
(sample-checked/adjusted) by IBO examiners — so "IB assessment" is externally controlled
end-to-end, but the internal/external marking balance varies by subject (exact split per
subject not independently confirmed this session — the intended primary source page could
not be fetched at all). Two sessions/year: **May** (dominant, Northern Hemisphere) and
**November** (Southern Hemisphere and some schools) — results commonly reported released
~July and ~January respectively (medium confidence, not independently confirmed against a
raw results-calendar this session).

## H. Unsafe inferences

- Do not convert an IB Diploma total (0-45) into a US GPA/4.0 as a universal rule.
- Do not assume a predicted grade equals the final result.
- Do not assume a student with IB HL/SL course grades on record has earned (or even
  attempted) the full Diploma — the DP-courses pathway allows individual subject
  participation without TOK/EE/CAS or an overall Diploma award.
- Do not infer class rank from subject grades or diploma total.
- Do not treat a 24-27-point diploma total as reflecting the same profile strength as
  40+ — both may pass, but represent very different levels; always surface subject-level
  detail alongside "Diploma awarded: yes/no."
- Do not assume TOK/EE letter grades (A-E) are on the same scale as, or convertible to,
  the 1-7 subject scale — combined via a distinct points matrix, not a shared scale.
- Do not assume a school offering IB offers the full 6-subject-group catalog a student
  would need for a given HL combination — availability varies by school.
- Do not treat CAS completion as a graded/comparative quality signal — it is a binary
  gate.

## I. Counselor interpretation

**Should care about:** HL vs SL subject choice and its alignment with the student's
target field; predicted-vs-final trajectory per subject (a large gap either direction is
informative, not something to hide); whether the Diploma was pursued/awarded at all vs.
individual DP courses only (a materially different profile signal); TOK/EE as evidence of
independent research/argumentation skill; CAS completion as evidence of sustained
non-academic engagement, read qualitatively.

**Should not care about:** fabricating a GPA-equivalent from the diploma total; computing
or displaying an inferred class rank; treating "Diploma awarded: yes" alone as sufficient
without subject/core-element detail; assuming fixed grade-boundary percentages.

## J. Profile data-model implications (grounded against ORYN's actual schema)

`education_records.curriculum='ib'` is a reasonable base tag for a DP (or DP-courses-only)
enrollment. The 6 subjects map cleanly to 6 `courses` rows (`level='ib_hl'`/`'ib_sl'`,
`course_name`/`subject` populated). This part of the existing design is sound.

**Confirmed, real gaps:**
- **Predicted vs. final grade:** `courses.grade_value` is a single TEXT field with no
  accompanying assessment-status flag. A DP subject legitimately has both a predicted
  grade (at application time) and a different final grade (after results) — today's
  schema can only hold one value at a time, forcing an overwrite that destroys the
  trajectory signal counselors should care about (section I), or a fragile duplicate-row
  workaround. Recommend an explicit `grade_status` (predicted/final/mock) column, or a
  side table.
- **TOK / EE have no home.** `courses.level` has no `ib_tok`/`ib_ee` value, and forcing
  them into `courses` is semantically awkward (A-E scale vs. 1-7, no real credit_hours,
  their point contribution comes from a joint matrix, not an independent score).
- **CAS has no home at all** — not a course (no grade), not a test_score (not a test).
  Would need a "CAS-certified: yes/no" flag plus the 7 IBO learning outcomes to be
  faithfully represented rather than looking like an ordinary self-reported activity.
- **IB Diploma total (0-45)** should **not** be repurposed into `overall_gpa`/`gpa_scale`
  — those fields elsewhere in the product are treated as GPA-shaped linear-achievement
  values, and the IB total is a bounded composite with its own gating logic that doesn't
  behave like a GPA (two students both "passing" at 24 vs. 42 look wildly different).
  Recommend a dedicated field (e.g. `diploma_points_total`/`diploma_points_max=45`), or at
  minimum an enforced rule that `curriculum='ib'` rows never get blended with other
  curricula's GPA values anywhere in scoring.
- **Diploma-awarded status** — nothing currently records whether the full Diploma was
  actually awarded vs. the student merely having a set of IB course grades on file. Given
  this is a real, sourced distinction (section A), its absence is a confirmed gap.

## Unresolved questions

- The exact, complete current TOK/EE bonus-points matrix (all A-E × A-E combinations) —
  Cloudflare-blocked; only one example combination recovered.
- Exact official HL (~240h) vs SL (~150h) teaching-hour figures — widely repeated,
  not independently confirmed against a raw ibo.org fetch.
- Precise current Group 6 substitution-flexibility rules — secondary-source-corroborated
  only.
- Exact IBO-side predicted-grade submission timeline (vs. UCAS's own deadline framing).
- Exact current May/November result-release calendar and internal/external assessment
  weighting per subject — the intended primary source page could not be fetched at all.
- Recommend a follow-up pass with a properly configured browser/session, or IBO's General
  Regulations PDF (found in search but not fetchable this session), before using any
  "search-snippet extraction" fact above as verbatim product copy.

## Primary sources

- [ibo.org — Facts and figures](https://ibo.org/about-the-ib/facts-and-figures/) (search-snippet)
- [ibo.org — DP courses (non-Diploma pathway)](https://www.ibo.org/programmes/career-related-programme/curriculum/diploma-programme-courses/) (search-snippet)
- [ibo.org — DP passing criteria](https://www.ibo.org/about-the-ib/what-it-means-to-be-an-ib-student/recognizing-student-achievement/about-assessment/dp-passing-criteria/) (search-snippet — high-value, recommend verbatim follow-up)
- [ibo.org — DP core (TOK/EE/CAS)](https://ibo.org/programmes/diploma-programme/curriculum/dp-core/) (search-snippet)
- [ibo.org — Creativity, Activity and Service](https://ibo.org/programmes/diploma-programme/curriculum/dp-core/creativity-activity-and-service/) (search-snippet)
- [ibo.org — DP curriculum overview](https://ibo.org/programmes/diploma-programme/curriculum/) (search-snippet)
- [UCAS — predicted grades guide](https://www.ucas.com/advisers/help-and-training/guides-resources-and-training/application-overview/predicted-grades-what-you-need-to-know-for-entry-this-year) (search-snippet, direct fetch blocked)
- [ibo.org — Understanding IB assessment](https://ibo.org/programmes/diploma-programme/assessment-and-exams/understanding-ib-assessment/) (intended primary source, **could not be fetched or found via search this session** — follow-up needed)
