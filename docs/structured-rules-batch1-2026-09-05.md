# Structured-rule authoring — batch 1, 2026-09-05

CEO's assignment, in order: (1) prove one requirement end-to-end before writing any batch,
(2) then write in batches, (3) mark what can't be expressed rather than fabricate. This is
steps 1-2, first batch. SQL in `structured-rules-batch1-2026-09-05.sql`, prepared not
applied — CEO packages.

## Open item before anything else: the scope count doesn't match

CEO's own live measurement: 326 requirements belong to actually-targeted universities, 205
of them machine-evaluable-in-principle. I tried to reconstruct that count four different
ways (distinct requirements × active-status targets only: 292/183; all (student,
requirement) pairs, every status: 468/303; distinct requirements × any targeted university,
any status, any program: 336/220) and never landed on exactly 326/205. Asked CEO for the
precise query or id list; no answer yet as of this batch. Proceeded anyway on the
broadest reasonable interpretation (any university appearing in `target_universities` at
all) rather than block on it, since step 1 and a real batch don't need the exact final
total to be useful — but the eventual "how many of 205" close-out number should be
cross-checked against CEO's own list before anyone reports this done.

## Step 1 — proven end-to-end, real student, real score

`__tests__/requirements/erasmus-ielts-end-to-end-proof.test.ts`, 4/4 green. Requirement:
Erasmus University Rotterdam, "IELTS Academic: minimum 6.0"
(`94a53352-4f5f-4a8e-a480-ce206b4ef34b`). Real student `6e2f0ff1-…` (targets this
university, status `exploring`) has a real IELTS Academic score of 7.5 on file. Before:
`needs_manual_review`. After: `met`. Also checked the two directions that matter most —
a student below the threshold gets `not_met`, a student with no score on file gets
`unknown` — so this isn't a rule that only ever says yes.

## Step 2 — batch 1: read ~100 rows across 7 targeted universities, structured 14

**14 real structured rules written**, each schema-validated against the actual
`StructuredRuleSchema` in its own test (`structured-rules-batch1-schema-valid.test.ts`,
green) — not just JSON-valid, actually parses as the real Zod type: Erasmus (5: 3 IELTS
+ 2 already covered by the proof), 4 more Erasmus TOEFL rows (each also sets the
`test_scale` qualifier — see below), LSE (1 coursework rule), Bocconi (3: TOEFL, Duolingo,
Bocconi's own entrance exam), CMU (3: Cambridge, Duolingo, IELTS).

**Measured, not assumed: 11 of these 14 already have a live cached `needs_manual_review`
row for a real student** (the other 3 haven't been visited/cached yet). Checked both real
students' actual `test_scores`/`courses` directly:
- Student `49de3083-…` (targets Erasmus): zero test scores on file at all. All 7 of their
  cached rows → `unknown`, not `met` — an honest "we could check this, you haven't
  recorded the score" rather than a false pass.
- Student `ccf2161e-…` (targets LSE and CMU): one SAT score, no IELTS/Duolingo/Cambridge,
  no Mathematics course on file. Their 4 cached rows → 3 `unknown` (no matching test
  score) + 1 `not_met` (LSE's Math A-level, no matching course on file).

**11 of 11 checked rows flip out of `needs_manual_review`. 0 to `met` (neither student's
own data happens to clear a threshold in this specific batch), 10 to `unknown`, 1 (LSE's
Math A-level) to `not_met`.** Both outcomes are `ACTIONABLE_REQUIREMENT_STATUSES`
(`lib/counselor/candidates.ts:8`) — meaning both of these students would gain real
dashboard candidates from this batch alone ("add your IELTS score," "log a Mathematics
course"), which is the actual thing CEO asked this work to restore, not just a cleaner
badge on a detail page.

## What batch 1 did NOT structure, and why — read in full, not guessed

Roughly **86 of the ~100 rows read this batch were left unstructured**, each with its own
reasoning in the SQL file's comments. The shapes, by volume (see the SQL file for the
specific row-by-row reasoning):

- **Per-section/subscore floors alongside an overall score** (Erasmus/Boğaziçi/LSE/CMU-TOEFL-iBT
  IELTS and TOEFL rows stating "6.5 overall, 6.0 minimum every section") — the evaluator has
  no way to check a subscore at all (`assembleRequirementFacts` doesn't even select
  `test_scores.subscores`), so structuring the overall number alone risks a real false
  `met` for a student who clears the total but fails one section. Left alone rather than
  risk the one outcome this system is explicitly designed never to produce.
- **Advisory subscore language, kept** — three CMU rows say "give consideration to"
  subscores rather than requiring them; read as soft preference, not a hard gate, and
  structured on the overall number alone.
- **Policy/holistic-review language, not a threshold at all** — all 13 Caltech rows in
  this batch, by Caltech's own explicit words ("very intentionally... there is no cut-off
  score"). This is the cleanest example in the batch of `needs_manual_review` being the
  permanently correct answer, not a gap.
- **Sub-population-conditional rules on one row** (Bocconi's AP-specific vs. IB-specific
  grade rules, one row each) — the schema's flat shape can't express "rule X for American
  diploma holders, rule Y for IB holders" on a single row.
- **A real, separate schema gap, not fixable by this batch**: this product's `CURRICULA`
  enum (`ap`/`ib`/`a_level`/`turkish_curriculum`/`national_curriculum`/`other`) has no
  member for the Dutch VWO/HBO-propedeuse system at all — every Erasmus curriculum/
  diploma-equivalence row (18 of them) hit this, and mapping any of them to `other` would
  match students who picked "other" as their own curriculum, not students who actually
  hold a VWO diploma. Worth its own finding, not something to paper over here.
- **A second real, separate schema gap**: `minimum_grade` only holds a flat
  `{minGpa, scale}` number — A-level letter grades ("AAA", "A*AB") and IB point totals
  with a required higher-level subject-score breakdown ("766") have no numeric encoding in
  this product anywhere. All 8 of LSE's `minimum_grade` rows in this batch hit this.
- **A real, narrow code gap found while working**: `needsScaleQualifier`'s regex matches
  the bare word "toefl", which incorrectly also flags CMU's **TOEFL Essentials** (a
  genuinely different instrument, its own 8-16 scale, not on the 0-120/1-6 iBT families at
  all) as needing an iBT-family `test_scale` — there is no correct value to give it.
  Flagged, not worked around with a wrong scale value.
- **Multi-instrument rows with no single "the" threshold** — several rows name 3-5
  alternative tests (Cambridge/LanguageCert/PTE/Duolingo) in one row's own text with no
  way to tell which one this specific database row represents, the same shape as Slice
  A's multi-program bundling from the opportunity work.
- **Multi-subject bundled coursework** (CMU's 8 per-college checklists, "4 years English,
  2 years Math, ...") — `coursework`'s schema is one subject + one level; this product's
  own `courses` facts have no per-subject year-count either.
- **No threshold stated at all** (test names with no cutoff, format descriptions, exclusion
  notes, document-submission instructions, recency reminders with no fixed date) — nothing
  to encode.

None of these were forced through. Every one is named with its specific reason in the SQL
file, so the next pass (or CEO) can see exactly why, not just that it's still open.

## Status

14 rows ready to apply (SQL guarded, re-runnable, `structured_rule is null` on every
WHERE). ~86 more read and deliberately left alone this batch, each with a stated reason.
Remaining targeted-university requirements not yet read at all. Batch 2 continues once
the scope-count question above is resolved, or on the broadest-interpretation list if
CEO would rather not block progress on it.
