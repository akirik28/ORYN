# Age calibration in AI prompts — 2026-09-02

## Assignment

CEO's question: does any product AI surface know how old the student is? Diagnosis
(reported separately, no files changed) found:

- `birthYear` is fetched into `StudentAdvisorContext` but never interpolated into any
  prompt — confirmed in `student-context.ts`'s own code, not just a comment.
- `graduationYear` **is** already in the prompt, on the `formatContextForPrompt` "Student:
  ..." line, but nothing told the model it's the thing to calibrate ambition and pacing
  against. The spec's own "scale difficulty to age and experience" (Phase 6.5, §8.2) had
  nowhere to land.
- `counselor-explain.ts` hand-builds its own prompt and doesn't call
  `formatContextForPrompt` at all — it has zero live callers (grepped repo-wide), so this
  is a latent gap, not a live one.
- `EvalCaseResult.responseText` exists on every eval run but was never printed by
  `scripts/run-ai-eval.ts`'s own CLI loop — all 4 saved logs under `docs/eval-runs/` show
  only the deterministic/judge summary lines, never the actual model prose. This is why
  "does the output show age-awareness" couldn't be answered from the existing logs.
- The judge rubric (`lib/ai/eval/judge.ts`) has exactly 6 dimensions (specific / concise /
  analytical / calm / evidenceAware / actionOriented) — no age dimension, so its silence
  on age isn't evidence either way.

CEO's three rulings, all implemented here:

1. Dump the raw response text unconditionally — free, no API cost, byproduct of the next
   live run whatever it's for.
2. Do NOT add a judge rubric dimension. The 6×12 = 72-cell rubric is what makes prior runs
   (e.g. 325/360) comparable to future ones; adding a 7th dimension changes the
   denominator and breaks that. If age turns out to matter, a dimension gets added
   deliberately with an explicit re-baseline, not as a side effect of this investigation.
3. Build the framing fix now, in the shared formatter, derived from `graduationYear` (not
   `birthYear`), degrading by omission (not by announcing "unknown"), and never stating a
   computed age.

## Changes

### 1. `scripts/run-ai-eval.ts` — print the raw response text

Added an unconditional `console.log` of `result.responseText` inside the existing
per-case loop, delimited on its own lines (`response:\n---\n...\n---`) so it never sits
inline with the compact summary line. `docs/eval-runs/README.md` documents reading these
logs with `grep -E "concise=|\[ok\]|\[FAIL\]"` — the delimiter keeps that grep pattern
matching exactly what it always has; the new block only appears between matches, never on
a line that pattern would touch.

No live run was spent verifying this line executes — per CEO's own instruction ("No live
run — both are verifiable from source and tests"), verification here is the diff itself:
`result.responseText` is an existing, already-typed field
(`EvalCaseResult.responseText`), and the print statement is a straightforward
`console.log` with no branching to test. This file is deliberately excluded from `test`,
`lint`, and CI per its own header comment (it's the only place allowed to spend real
model credit, gated behind `--live --confirm-spend`), so there is no existing convention
of unit-testing this file directly — the fix is source-verifiable by design, matching how
every other line in this CLI wrapper is verified.

### 2. `lib/ai/student-context.ts` — `formatContextForPrompt` calibration line

Added a new line immediately after the existing "Student: ..., graduating {year}, ..."
line:

```
{N} year(s) until they apply to university — calibrate ambition and pacing to this: more
runway supports an exploratory or multi-year commitment, less runway means prioritizing
what can realistically strengthen an application in the time left.
```

or, when `graduationYear <= currentYear`:

```
at or past their expected graduation year — calibrate ambition and pacing to this: ...
```

Omitted entirely — not replaced with an "unknown" placeholder — when `graduationYear` is
null. The existing "graduating unknown" on the line above already covers that case once;
an explicit second "calibration: unknown" would only invite the model to hedge in its
reply, for no benefit.

Derived from `graduationYear`, never `birthYear`: `birth_year` is null on 4 of 11
onboarded profiles including the founder's own real account (confirmed independently by
oryn-3f via direct SQL during this task, matching what CEO had relayed), so a
birth-year-based signal would be silently absent for the one real student this product
has today. `graduationYear` is present for every onboarded profile.

Frames years-remaining and what that implies for pacing — never a computed age, never a
birth year. A graduation year implies a range (school-entry cutoffs and birth month both
vary within a cohort), so stating an invented specific age would be exactly the kind of
false precision this product already refuses elsewhere (admission percentages, etc.).

### 3. `__tests__/ai/student-context.test.ts` — 5 new tests

New `describe("formatContextForPrompt — age/experience calibration", ...)` block:

- Plural framing + the "calibrate ambition and pacing" phrase present, for 3 years out.
- Singular grammar ("1 year", not "1 years") for exactly 1 year out.
- At-or-past wording (not a negative number) when `graduationYear` equals the current
  year.
- Never states a computed age, a birth year, or the word "age" — even when `birthYear` is
  also set on the fixture (2009 must not appear in the output).
- Missing `graduationYear` omits the new line entirely; the pre-existing "graduating
  unknown" on the line above is untouched and still present.

All 19 pre-existing tests in this file pass unchanged (they use `.toContain()`, safe
against an additive line). Full file: **24 passed (24)**.

## Verification

No live model call was made anywhere in this work — confirmed by inspection of every
command run (`typecheck`, `lint`, `test`, `build`; none invoke `scripts/run-ai-eval.ts`
with `--live`). All 4 gates green in this worktree:

```
typecheck   clean
lint        clean
test        3595 passed (255 files)
build       succeeded (Next.js 16.3.1, Turbopack)
```

## What this does NOT do

- Does not add a judge rubric dimension (CEO ruling 2 — deliberately deferred).
- Does not fix `counselor-explain.ts`'s missing `formatContextForPrompt` call — it has no
  live caller today, so there's no live surface to fix; noted here so it isn't lost if
  that function ever gets wired up.
- Does not run a live eval to measure whether the new framing actually changes model
  output — CEO's instruction was explicit that this phase is source/test-verifiable only,
  and that a live run needs separate sign-off given real API cost.
