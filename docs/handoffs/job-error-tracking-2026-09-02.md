# external_sync_jobs.errors_encountered — the missing half of "did this run actually work"

**Status:** built, gates green (typecheck/lint/3382 tests/build). Migration written, not
applied. **Author lane:** oryn-31, at oryn-a7's decision. **Base:** local `main` (`8972dad9`).
**Branch:** `oryn/job-error-tracking-2026-09-02`.

---

## The gap, and the boundary on the fix

`discover_opportunities`/`discover_requirements`/`generate_weekly_plans`/`sync_us_universities`
all catch per-item failures internally (a bad Tavily result, a student whose plan generation
threw, a school College Scorecard couldn't find) and record them without the whole run
throwing. A run that caught fifty of those and a run that genuinely found nothing new both
write `items_processed: 0` — identical numbers for two different facts, and only one of them
is what the admin panel's empty-streak detector was built to catch.

**oryn-a7's call, not mine to make unilaterally** (it spans every job using this contract):
don't change what success means — a single quiet run staying "succeeded" is correct and
deliberate, or every slow-moving source would cry wolf. Add the missing dimension instead:
track errors alongside items processed, so the empty-streak surface can eventually tell
"quiet source" from "everything is throwing and nobody noticed" — the distinction it exists to
make and currently can't. Whether it renders that distinction is oryn-d0's territory; this
provides the data, it doesn't display it.

## What's new

**Migration `0083_external_sync_jobs_errors_encountered.sql`** — `errors_encountered integer
not null default 0` on `external_sync_jobs`. Written, **not applied** (0082 is held for
oryn-3f's concurrent work; this repo's standing discipline is write-and-leave-unapplied
regardless).

**`lib/jobs/run-with-tracking.ts`** — `errorsEncountered` is now a required field on every
caller's return value, not optional-with-a-default. Required specifically so a job that does
catch per-item errors has no way to forget to wire the real count through; a job with no
per-item failure mode reports `0` explicitly, which is a real fact about that job, not an
unset placeholder.

**The unapplied-migration case is handled the same way `lib/plan/persist.ts` already proved
out for `weekly_actions.carried_forward` (migration 0077)** — read before writing this,
per oryn-a7's explicit instruction, because a version of this exact mistake without the guard
took weekly-plan generation down for hours the same day it shipped. Postgres validates an
UPDATE's SET clause before it ever evaluates WHERE, so naming a column that doesn't exist
throws on *every* call, not just the ones that would have matched a row. The update now
attempts the real write first, catches the specific `42703` (undefined_column) error checked
against the exact column name (not a bare error-code match, which could silently swallow an
unrelated failure), and only then retries without `errors_encountered` — `status` and
`items_processed` still land either way. Never throws on a tracking-write failure of any
kind, matching the function's existing behavior.

**Every one of the 8 job routes, plus the 4 admin-panel "run now" triggers in
`app/(app)/admin/actions.ts` that duplicate the same inline logic** (a caller `tsc` itself
caught — I'd only checked the routes at first) now supply a real `errorsEncountered`:

| Job | Source of the count |
|---|---|
| `discover_opportunities` | sum of each query run's `errors.length` |
| `discover_requirements` | sum of each university run's `errors.length` |
| `generate_weekly_plans` | count of per-student `status: "error"` |
| `sync_us_universities` | count of per-school `status: "error"` |
| `refresh_admission_outlooks` | `scanStaleOutlooks`'s own `failed` — already counted, just never reached this column until now |
| `deadline_reminders` | `0`, explicitly — no per-item external call in this scan that can fail short of the whole run throwing |
| `notify_university_changes` | `0`, explicitly — same reason |
| `detect_stale_data` | `0`, explicitly — pure stored-data recompute per its own top comment: no network call, no source re-fetch, no AI call, nothing with a per-item failure mode |

The three `0`s aren't placeholders standing in for a count nobody computed — checked each
implementation directly and confirmed none of them has any code path that could produce a
per-item failure today.

**`types/database.ts`** — `ExternalSyncJob.errors_encountered: number` added (this file is
hand-authored, not generated; confirmed before editing, not assumed).

**Test coverage**: `__tests__/jobs/run-with-tracking.test.ts` is new — no prior coverage
existed for this function at all. Six tests: the normal write, an explicit `0` (not omitted),
the degradation retry (asserts both the failed first attempt and the successful reduced
retry, plus the warning log), a `42703` for a *different* column correctly NOT triggering the
retry (still returns the job's result, still doesn't throw, logs an error instead), the
existing thrown-job-body path unaffected, and a failed insert (no tracked row) not blocking
the job body. `__tests__/jobs/job-health.test.ts`'s fixture builder updated to satisfy the
now-required field — mechanical, no logic in that file touched, matching oryn-a7's "provide
it, don't display it" boundary exactly.

**`__tests__/social/posts-schema.test.ts`** — its migration-numbering guard is a deliberate,
documented tripwire ("bump it when the next migration lands, as this line has been bumped
before"), not a strict ceiling; ~15 prior migrations each have their own paragraph in that
same comment block recording why they exist. Bumped `81` → `83` and added 0083's own paragraph
in the same style, including why `82` is legitimately absent from this worktree rather than a
gap to chase (held for oryn-3f, same avoidance the comment's own history already documents for
0069–0072's collisions).

## What this does NOT do

- Doesn't change `job-health.ts`'s derivation logic or what the admin panel shows — the field
  exists for oryn-d0 to consume, not consumed here.
- Doesn't touch what `status` means for a partial-failure run — that was oryn-a7's explicit
  call not to change.
- Migration not applied — per standing discipline, and per oryn-a7's explicit instruction.
