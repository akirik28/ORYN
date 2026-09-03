# The academic-tier column: what saying yes actually costs

A proposed migration, not applied — `supabase/migrations/0108_academic_tier.sql`, written and
dry-run validated live (clean), same discipline as every SQL staged this session. This doc is
the fast read; the migration file itself carries the full reasoning behind each choice below.

## Why now

Five countries' worth of institution data is staged and merged, all blocked on the same open
question: [Netherlands hogescholen](./netherlands-hbo-sector-2026-09-03.md) (36),
[Germany Fachhochschule/HAW](./germany-haw-sector-2026-09-03.md) (192),
[Finland AMK](./finland-amk-sector-2026-09-03.md) (22),
[Austria Fachhochschule](./austria-fh-sector-2026-09-03.md) (21),
[Ireland's 4 new TUs](./ireland-tu-sector-2026-09-03.md) (4) — 275 rows, all with
`institution_type` deliberately left `NULL` because that column is already occupied table-wide
by US College-Scorecard-style ownership data (public/private/nonprofit) for the existing 1,019
rows, not academic tier. The question has been open long enough that showing what it actually
costs, rather than restating that it's open, is the useful next step.

## The decision, in three parts

**1. Two columns, not one.** `academic_tier` (enum: `research_university` /
`applied_sciences`) is the shared class something can filter or group on across all five
countries. `academic_tier_local_name` (free text) is the actual local term — Fachhochschule,
Hogeschool, Ammattikorkeakoulu, Technological University — so a student sees what the
institution actually calls itself, not a flattened translation. Free text because this axis is
open-ended (Switzerland, Belgium's Hogeschool/Haute École split, whoever's next); `country`
already exists on the row, so local_name doesn't re-encode which nation's form it is.

**2. One case the design doesn't resolve by itself: Ireland.** Ireland's 5 Technological
Universities are, today, legally full universities — converted from Institutes of Technology by
statute, no different in law from Trinity or UCD. Every other country's applied-sciences tier is
a word specifically *because* that tier is legally distinct from "university" there. Ireland's
isn't, anymore. Two defensible answers:
   - **By current legal status**: `research_university`, consistent with every other Irish row
     already in the catalogue.
   - **By lineage and product purpose**: `applied_sciences` — this whole corridor-gap line
     exists because the applied-sciences tier is the more accessible admission route for a
     Turkish applicant, and Ireland's TUs are the corridor scan's own control case for exactly
     why some applied-sciences-lineage institutions already read as ordinary universities in
     this catalogue (Technological University Dublin, already in the DB, untouched by any of
     this) while others didn't — they got the word "University."

   The migration file leans toward the second reading in its own comment, because it matches
   why this data was sourced, but doesn't decide it silently — and is explicit that whether
   Irish TU admissions are, in practice, meaningfully different from Dublin/UCC/Galway's today
   is a factual question nobody has checked, separate from the institutional-history question
   answered above. Founder's call either way.

**3. NULL means "not yet classified," not "is a research university."** The 1,019 existing rows
are **not** backfilled by this migration. Verified directly before writing this (not assumed):
1,019 total rows, 17 already `institution_type IS NULL` for unrelated reasons. Backfilling all
1,019 with a checked classification is real, separate research this migration doesn't attempt —
most probably are research universities, but "probably" isn't the standard the rest of tonight's
work has held, and a bulk `UPDATE ... SET academic_tier = 'research_university'` without
checking would be the exact confident-output-from-absent-data problem this project's own build
spec (Phase 4) exists to prevent.

**What is ready**: the 275 applied-sciences rows plus the 2 Netherlands WO-gap rows all have a
known classification already — but none of the six staged files write `academic_tier`, because
the column didn't exist when they were written. If this migration is approved, the real
follow-up is editing those six files (five already merged to main) to add real values before
they're applied — not a bulk UPDATE after the fact. Flagged, not done here: rewriting five
already-merged files is its own decision to surface, not something to do unasked.

## What this does not buy

`institution_type` — the column this proposal deliberately doesn't reuse — is already visible
to a student today: a badge on the university card and the detail page, and a public/private
filter with its own English/Turkish label pairs. None of that exists yet for `academic_tier`.
Making the new column mean anything to a student — a distinct badge, a filter, a compare-page
column, Turkish strings alongside the English ones — is real front-end work, not included here
and not estimated here. This migration is a data-modeling decision. Making it visible is a
second, later one, and the founder should see both before treating "add the column" as "done."

## Validation

Dry-run validated live: `begin;` the full migration, confirm the 1,019 existing rows are
untouched (`academic_tier` null on all of them, as designed), insert one test row using the new
enum and both columns to confirm they behave as expected, `rollback;`. Fresh post-rollback
queries confirmed neither the columns nor the `academic_tier` type exist on the live schema —
clean.

## If approved

1. Apply `supabase/migrations/0108_academic_tier.sql`.
2. Decide Ireland (research_university vs. applied_sciences for the 5 TUs) — the one open
   sub-question this proposal surfaces rather than answers.
3. Update the six already-staged institution files to carry real `academic_tier` /
   `academic_tier_local_name` values (five already merged; editing merged files is a decision
   of its own, flagged here rather than done unasked).
4. Scope the front-end work separately if the column should be visible to a student, not as
   part of this migration.
