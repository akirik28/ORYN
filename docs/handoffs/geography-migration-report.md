# Migration 0049 — Report

**Founder-authorized scope change.** Migration **written and committed, NOT applied to any
database** by this session — per the explicit instruction, the Org Leader applies it to the QA
project and verifies. Branch `oryn/geography-migration`, forked from `main` at `0e527af`.

**Full gate clean**: lint 0, typecheck 0, **test 1167/1167** (floor was 1165, +2 new), build
succeeds.

## Part 1 — `outlook_label` gets `not_applicable`: done

`supabase/migrations/0049_outlook_not_applicable.sql` — additive only, `alter type outlook_label
add value if not exists 'not_applicable'`. No renames, no drops, nothing else in the file.

Code changes so label and reason agree, as instructed:
- `types/database.ts`: `OutlookLabel` gains `"not_applicable"`.
- `lib/admissions/outlook.ts`: `computeAdmissionOutlook` now sets `outlook: "not_applicable"`
  whenever `admissionSystemType === "credential_gate"`, instead of still running the profile-
  strength/selectivity formula through `classifyOutlook`. `compositeScore` is still computed and
  returned (a real, if not admissions-relevant, number a caller may want to persist/display), but
  the *label* no longer claims a holistic-review classification that doesn't describe the target.
- `features/universities/outlook-badge.tsx` — the one place in the app that actually renders an
  `OutlookLabel` (confirmed via a repo-wide search before assuming this was the only spot):
  added a `not_applicable` entry to `OUTLOOK_CONFIG`, `neutral` tone (deliberately off the error→
  success ramp the other 5 use — this isn't a bad outlook, it's "this scale doesn't apply"),
  label "Not a profile-review system". Because `OUTLOOK_CONFIG` is typed
  `Record<OutlookLabel, ...>`, omitting a case here is a compile error, not a silent fallthrough
  — confirmed by temporarily removing the entry and watching `typecheck` fail before adding it
  back for real.

**Explicitly not in scope, flagging rather than guessing**: `notApplicableReason` (the sentence
explaining *why*) is returned by `computeAdmissionOutlook` but is not persisted anywhere —
`lib/admissions/persist.ts` writes `outlook`/`compositeScore`/estimate fields to
`target_universities` today, and threading the reason string through would need either a new
text column or reusing an existing one, which is its own small schema/design decision I didn't
make unilaterally given the instruction's specific scope (the label itself, and the badge
rendering it sensibly). The badge alone already stops the false-precision problem the QA report
named; the explanatory copy is a reasonable, separate follow-up.

Regression tests (`__tests__/admissions/outlook.test.ts`): `outlook` is exactly
`"not_applicable"` for every `credential_gate` input tried (5 profile strengths × 4 admission
rates), and never `"not_applicable"` for a holistic/omitted input.

## Part 2 — `CourseLevel` extension for Turkish curricula: NOT done, and here's why

Read the primary-sourced material this task pointed at (`docs/research/turkish-exams/{01,02,03,
06}*.md`, all landed on `main` today) specifically looking for what values to add. **The premise
doesn't hold.** Direct quotes:

- `06-counseling-implications.md`: **"Turkish central university placement contains no holistic
  component whatsoever... No consideration of leadership, volunteering, competitions,
  internships, research or entrepreneurship."**
- `02-yks-and-obp.md`, on the grades component specifically (OBP): **"No school-level adjustment
  whatsoever... A 90 average from a highly selective science high school and a 90 from a non-
  selective school produce the identical OBP... the regulation explicitly forbids [a school-
  quality correction]."**

I searched all Turkish-exam research docs for "Fen Lisesi", "Anadolu Lisesi", "ileri düzey",
"advanced course", "course level", and "rigor" — the only hits are `03-lgs-and-school-
placement.md`'s brief mention of **school types** (science high schools, Anatolian high schools,
etc.) as *placement-route categories*, never as a per-course rigor designation analogous to AP/
IB/A-Level/dual-enrollment.

**The reason `RIGOR_WEIGHT`/`CourseLevel` has no Turkish-curriculum value isn't a missing enum
member — it's that the Turkish system, as actually sourced, doesn't have the concept `CourseLevel`
models (per-course advanced/standard designation) at all.** What it has instead, if anything, is a
*school-type* signal (which school a student attends), which is structurally a fact about
`education_records`, not `courses` — a different, larger design question than "add a value to an
existing enum," and one with its own real problems: OBP already refuses a school-quality
adjustment by regulation, so building one into Oryn's own internal `academics` dimension (even
framed as "development, not admissions relevance," the same distinction the outlook fix above
draws) needs its own deliberate design, source-grounded in exactly which schools count and why,
not a fix bolted onto this migration under time pressure.

**Not inventing level names, as instructed — which is exactly why I'm not writing this half of
the migration.** Recommending a dedicated follow-up research/design pass ("how should Oryn's
academics dimension recognize Turkish school-type rigor, if at all, given OBP's own explicit
refusal to do the analogous thing") rather than shipping a schema change grounded in a premise
the primary sources contradict.

## Files changed

- `supabase/migrations/0049_outlook_not_applicable.sql` (new, additive-only, not applied).
- `types/database.ts`, `lib/admissions/outlook.ts`, `features/universities/outlook-badge.tsx`.
- `__tests__/admissions/outlook.test.ts`.
- This file.
