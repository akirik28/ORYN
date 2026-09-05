# Structured-rule authoring — the complete 205-row scope, read in full, 2026-09-05

CEO's exact query re-run and confirmed: **326 / 326 / 205 / 205** — matches precisely.
Root cause of my own earlier mismatch: `target_universities` carries one row per
student, and my non-`distinct` join counted the same university once per student who
targets it (five students targeting MIT counted MIT five times). Fixed, verified,
moving on.

**Read all 205 rows this pass** — not a sample, the complete scoped set, across every
targeted university (Bocconi, Boğaziçi, Caltech, Carnegie Mellon, Erasmus Rotterdam, LSE,
MIT, Stanford, University of Amsterdam, University of Oxford, University of Warwick,
Yale). Batch 1's 14 structured rows came from the first ~100; this pass covers the
remaining ~105 and, having now seen the whole set, gives the honest complete-scope
number instead of an in-progress one.

## The honest number: 14 of 205 (6.8%)

**Zero new rows structured in this second pass.** Not for lack of effort — every one of
the remaining ~105 rows was read and individually classified, the same way as batch 1's
100. The reason is not coverage, it's that the *content* of these specific 205 rows is
dominated by three things this schema genuinely cannot express without risking a false
`met`, plus a fourth category of universities whose actual, stated policy is holistic
review with no cutoff at all:

**1. Per-component score floors, in addition to an overall score — the single largest
category.** Oxford, Warwick, LSE, and University of Amsterdam's English-proficiency rows
almost universally state both an overall threshold *and* a minimum in every section
("IELTS 7.5 overall, minimum 7.0 per component" — Oxford; "TOEFL 100 overall, minimum 22
Reading/24 Listening/24 Writing/25 Speaking" — UvA). `assembleRequirementFacts()` doesn't
even select `test_scores.subscores` — the evaluator has no way to check a per-section
floor today, at all. Structuring the overall number alone would produce a real false
`met` for a student who clears the total but fails one section. Left unstructured, for
every one of these, at every university that states them this way — this is not a
judgment call repeated per-row, it's the same fact applying every time the shape recurs.

**2. Grade formats this schema cannot hold at all.** A-level letter grades (`A*AA`,
`AAB`) and IB point totals with a required higher-level subject breakdown (`766`, meaning
7-6-6 across three named HL subjects) have no numeric encoding anywhere in this product —
`minimum_grade`'s schema is a flat `{minGpa, scale}` number. Every one of Oxford's ~10 and
LSE's ~9 `minimum_grade` rows is this shape. Not a gap in this pass's effort — a genuine
absence of the concept in the schema.

**3. The Dutch VWO/HBO-propedeuse system, which this product's `CURRICULA` enum
(`ap`/`ib`/`a_level`/`turkish_curriculum`/`national_curriculum`/`other`) has no member
for.** Every Erasmus and University of Amsterdam curriculum-equivalence row (30+ rows
combined) hit this. Mapping any of them to `other` would match students who picked
"other" as their *own* curriculum type, not students who actually hold a VWO diploma —
a real false-positive risk, not a conservative simplification.

**4. Universities whose own stated policy is explicitly holistic, no cutoff — the
correct, permanent answer is `needs_manual_review`, and always will be.** Caltech
("Very intentionally... there is no cut-off score"), Stanford ("There are no minimum test
scores required... no score that guarantees admission," "we do not require any English
proficiency exam"), and Yale (every English-proficiency row phrased as "most competitive
applicants have X," describing admitted-student statistics, never stating X as a
requirement) together account for **~35 of the 205 rows**. This is not a data gap to
close; it is these institutions' actual, official admissions philosophy, read directly
from their own text.

**Smaller, named categories**: multi-instrument rows naming 3-5 alternative tests with no
single value this one database row represents (10+ rows, mostly Erasmus/UvA/MIT);
procedural/exclusion notes with no threshold at all ("TOEFL Home Edition not accepted,"
recency reminders, self-report vs. official-score policy — 20+ rows); multi-subject
bundled coursework checklists ("4 years English, 2 years Math, ...", no per-subject
year-count concept in this product's own `courses` table — CMU's 8 rows); named exams
with no stated cutoff (LNAT, TMUA, UCAT, ESAT, TARA — ~10 rows, used holistically by the
universities that require them).

## What this means for the dashboard consequence, stated the way CEO's own question framed it

CEO's sharper question: once the rules are written, how many come out `not_met`/
`unknown` (which fill the dashboard slot) versus `met` (correct, but doesn't)? **The
honest answer for this scope is a third option neither of us had named yet: most of the
205 can't be safely written as a rule at all, regardless of what any student's data would
produce.** Not "everyone happens to meet everything" (which would mean the real problem
is elsewhere) and not "the data was there and I found it" (which was the working
assumption) — the requirement *text itself*, at this specific set of universities, is
overwhelmingly holistic-review prose or a grade format this schema doesn't hold, for
real, structural reasons named above.

Of the 14 that *were* structurable, batch 1 already showed the actual distribution for
the rows with a live cache: **11 of 11 checked, 0 `met`, 10 `unknown`, 1 `not_met`** — a
real, if narrow, win for the two students who had those rows cached. That distribution
(never `met`, always something actionable) held for every checked case, for what it's
worth as a small, real signal — but the honest headline is the 6.8%, not the 100%
flip-rate among the ones that could be attempted.

## What I'd recommend, not decide myself

Three of the four blocking categories above are schema questions, not requirement-reading
questions, and are worth naming as their own follow-up rather than leaving buried in this
report:
1. Add subscore support to `RequirementFacts`/`evaluateRequirement` (read
   `test_scores.subscores`, check it against a per-component floor) — closes category 1,
   the largest one, at both this university set and presumably every other UK/European
   institution in the wider catalog.
2. Add a letter-grade/IB-breakdown rule shape (or a lookup table translating `AAA`/`A*AB`/
   `766` into a comparable ordinal) — closes category 2.
3. Add a Dutch (or general "foreign secondary" equivalence) curriculum concept — closes
   category 3, though this one is a genuine product/scope decision (does this platform's
   profile model need to represent VWO at all, or is this out of scope for now), not
   purely an engineering one.

None of these are built here — this pass is a reading-and-authoring pass against the
existing schema, per the assignment, not a schema-change proposal to act on unilaterally.
