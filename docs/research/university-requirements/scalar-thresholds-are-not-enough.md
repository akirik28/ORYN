# Two requirement shapes a bare scalar cannot represent honestly

**Status:** research finding, for an engineering decision. No code changed by this lane.
**Found:** 2026-08-21, during university requirements research.
**Companion to:** `source-authority-gap.md` (same directory). Same class of problem: a real-world
value that the current storage shape cannot carry without silently losing something.

## Summary

`university_requirements.structured_rule` stores a machine-evaluable rule, and
`lib/requirements/evaluate.ts` compares a student's stored facts against it. For grade and test
requirements that comparison is a scalar threshold: *is the student's number ≥ the required
number?*

Three separate findings in one research batch show that a bare scalar gets the answer **wrong in
the confident direction** — returning `met` or `not_met` where the truthful answer is
`needs_manual_review`. That is worse than a missing answer, because the student acts on it.

---

## 1. A test score is meaningless without its scale version

### What happened

Two UK universities, both official, both fetched, published TOEFL requirements for tests taken
**from the same date** — 21 January 2026:

- **University of Edinburgh**: "total 4.5 with at least 4.0 in each component"
- **University of Glasgow**: "92 Overall, no subtest lower than Reading 22; Listening 20; Speaking 23; Writing 21"

Same test. Same cutover date. Numbers an order of magnitude apart.

### What ETS actually says

From ETS — the operator of TOEFL, and therefore the authority for TOEFL's own scale, by the same
principle that makes UCAS authoritative for UCAS deadlines:

- "Effective January 21, 2026" the scale changes.
- "an updated score scale (from 1 – 6 in increments of 0.5)".
- The overall is now "the average of the four section scores, rounded to the nearest half band",
  where previously the overall was the **sum** of section scores. Average, not sum — so the two
  overall figures are not interconvertible by arithmetic.
- "To ease the transition for students and institutions, we will provide comparable scores on the
  0 – 120 score scale on score reports for two years."

### The resolution, which is sharper than "one of them is wrong"

**Edinburgh is correct and current.** 4.5 with 4.0 per component is the new 1–6 scale applied to
exactly the range ETS defines. It only looked anomalous against the familiar 0–120 scale.

**Glasgow is half-satisfiable, which is worse than being wrong.** The "92 Overall" half *is*
meetable, because ETS supplies a comparable 0–120 **overall** score for two years. But the
per-subtest half is not: after the cutover ETS reports section scores on the 1–6 scale and does
**not** restate them on the old 0–30 subtest scale. So Glasgow's requirement, as published, cannot
be met by any score report issued in the date range it claims to govern.

A checker doing a naive numeric comparison against Glasgow's rule would tell a student they had
**failed** a requirement that cannot be measured.

### The audit found a second instance with no adjacent conflict

Running the scale check across all 14 English-proficiency rows in the corpus — not only where two
sources disagreed — surfaced **Boğaziçi University**: "TOEFL iBT (minimum 79 total, 22 writing)",
with no cutover date stated at all. 79/22 is unambiguously the old scales. The 79 survives via the
comparable overall; the "22 writing" subtest requirement has exactly Glasgow's defect. Nobody would
have caught this by looking at Boğaziçi alone, because nothing on the page contradicts anything
else on the page.

That is the argument for auditing the whole corpus rather than only the noisy cases.

Rows confirmed **unaffected**, and recorded as such so the audit is re-runnable: IELTS (0–9,
unchanged), the Cambridge English Scale for CAE/CPE (unchanged), and Edinburgh's pre-cutover TOEFL
row, which is explicitly bounded to its own date range and therefore unambiguous.

### What storage needs

A threshold needs a **scale/version qualifier** and, where the source gives one, the **date range
the scale applies to**. This lane's records now carry `test_scale` (e.g. `TOEFL_IBT_1_6`,
`TOEFL_IBT_0_120_COMPARABLE`, `TOEFL_IBT_0_120_LEGACY`, `IELTS_0_9`,
`CAMBRIDGE_ENGLISH_SCALE`) and `scale_ambiguity` (`none` / `resolved_unambiguous` /
`undated_scale_assumption` / `partially_unsatisfiable`).

**Any TOEFL threshold stored without a scale qualifier is unsafe to evaluate**, and will remain so
until at least January 2028, when ETS's dual reporting ends and the ambiguity gets worse rather
than better — because at that point the 0–120 comparable score disappears and every legacy
threshold in the database silently becomes unmeetable.

This generalises past TOEFL. It is the same problem as the SAT's 1600/2400 history and any future
rescale of any test. The qualifier belongs on the requirement, not in a comment.

---

## 2. Recency rules: a grade that was true is not always still valid

Edinburgh, Computer Science BSc:

> "Your Mathematics qualifications must have been achieved no more than two academic years prior
> to entry."

and, for English:

> "Qualifications from the following English language tests must be no more than two years old
> from the start date of this programme, regardless of your nationality"

— with all *other* English qualification types getting three and a half years, and no time limit
at all for nationals of majority English-speaking countries.

Koç University applies the same idea to admissions tests: scores "are valid for 2 years", while
"There is no time limitation on eligible diploma grades" — validity windows differ between tests
and diplomas at the same institution.

**The defect:** a student who meets the grade with a qualification that is too old is currently
told they **qualify**. The evaluator has no concept of qualification age, so it cannot even know
it is guessing. This is a confidently wrong answer produced from correct data.

**What storage needs:** a max-age constraint on the rule (value + unit + what it is measured
from — "prior to entry" and "from the start date of this programme" are different anchors), and a
`date_achieved` on the student-side fact to compare against.

---

## 3. Named exclusions: a qualifying number the institution will not accept

- Edinburgh: "We do not accept IELTS One Skill Retake to meet our English language requirements."
- Edinburgh: "We do not accept TOEFL MyBest Score to meet our English language requirements."
- Koç: "Reported 'Evidence-based Reading and Writing' and 'Math' scores must be from the same
  session; superscores are not accepted."

**The defect:** a student can hold a numerically qualifying score that the institution rejects on
provenance. Koç's is the sharpest — a superscored 1300 and a single-sitting 1300 are the same
number and only one is accepted. A threshold comparison cannot tell them apart, and answers `met`
for both.

**What storage needs:** a list of excluded score *provenances* on the rule, and a corresponding
provenance flag on the student's stored score (single-sitting vs superscore vs retake).

---

## Recommended interim behavior — cheap, and available before any schema change

`lib/requirements/evaluate.ts` already has the right instinct: its `requirement_evaluation_status`
enum includes `needs_manual_review`, and the surrounding discipline is to return it rather than
guess.

**Until these three shapes are modelled, any requirement carrying an unqualified test scale, a
recency rule, or a named exclusion should evaluate to `needs_manual_review` even when the number
matches.** That is a small, safe change: it converts three classes of confidently-wrong answer
into an honest "a human should check this", which is exactly what ORYN's own non-negotiables ask
for — Phase 68's "Oryn should know when it does not know enough", and the standing rule that false
certainty is worse than an admitted gap.

The research records make this mechanical rather than a judgement call: every affected row is
already flagged with `scale_ambiguity`, or carries the recency/exclusion language in its
`limitations` field, so the interim rule can be applied by filtering rather than by re-reading
every requirement.
