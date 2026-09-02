# Closing the version-tracking gap — 2026-09-02

Follow-through on the stale-output sweep's structural finding: `profile_scores` and
`target_universities` both write a version field per row (`calculation_version`,
`outlook_model_version`) that the read side never read back — only timestamps were
compared. Harmless today because both fields have had exactly one value their entire live
history (verified again at the end of this pass); load-bearing the day either doesn't.

No migration. Both fields already exist and are already written — this is entirely
application code: one new small module, nine existing queries each gaining one `.eq()`,
and the tests to match.

## What each field needs to be load-bearing

**`calculation_version` (profile_scores): a read-side filter, and the trigger already
exists.** `recomputeCareerProfile`'s upsert keys on `(user_id, dimension,
calculation_version)` (`lib/scoring/persist.ts`) — a version bump would **insert** fresh
rows rather than overwrite old ones, so every reader needs to filter to the current
version or risk getting a dimension back twice, one row per version, once a second
version exists. The **trigger** question turned out to already be answered:
`lib/scoring/scheduled-review.ts`'s `runScheduledReview` recomputes **every onboarded
student unconditionally**, monthly, regardless of edit activity or version — read its own
doc comment, it was built for exactly "a dormant student's displayed score... silently
going stale." A version bump would be absorbed for every processed student within one
cycle, no new trigger logic needed. The only reason it doesn't protect against this
today is the same reason it protects against nothing yet: it isn't armed (not in
`vercel.json`, not in `lib/jobs/schedule.ts`'s `JOB_DEFINITIONS`) — founder-gated, a
separate, already-known issue, not something this package changes.

**`outlook_model_version` (target_universities): a read-side filter on BOTH refresh
paths, because — unlike scoring — the backstop job shared the primary path's blind spot
instead of being unconditional.** `lib/admissions/scan.ts`'s `scanStaleOutlooks` (the
weekly backstop) uses the *identical* timestamp-only staleness rule as the read-time
`refreshStaleOutlooks`, by design (its own doc comment: mirrors the read-time check on
purpose). That symmetry is exactly what made both blind to a version-only staleness case
together — arming this job would not have fixed the gap the way arming scheduled-review
would, since it inherits the same narrow rule. Both needed the fix, not just one.

## Same answer for both fields, not different ones — reasoning shown

CEO's framing invited considering that an admission-model version might want to
*preserve* the old outlook for comparison rather than invalidate, since Phase 18
anticipates learning from historical outcomes. Investigated this directly rather than
assuming either way: `target_universities.outlook` is read and displayed as the
student's **current** outlook — Phase 16's own language, "the estimate must clearly show
as an estimate," is about precision, not about the value being allowed to lag a known
formula improvement. If the code has established a better formula, continuing to show a
target-universities row computed under the old one *as current advice* is the product
withholding its own best available answer from a student who simply hasn't revisited a
page — the identical harm a stale score causes, not a different one. Phase 18's
"historical comparison" value is real, but it's served by a **separate** mechanism
(matching `profile_score_snapshots`' own precedent for scores) recording what the model
said at a point in time — not by leaving the live-facing field stale. No such
`outlook`-snapshot table exists today; building one is a new, schema-touching feature
and explicitly out of this pass's scope (no migration). Landed on: **both fields
invalidate the live value on a version mismatch, no field preserves-by-default** — the
same answer, reached independently for each, not assumed to match going in.

## The fix

### `lib/admissions/staleness.ts` (new)

`isOutlookStale(target, profileUpdatedAtMs)` — the one staleness rule both outlook
refresh paths now share. Three independent conditions: never computed, wrong model
version, or timestamp older than the profile. Extracting this closes a second, smaller
but real risk found along the way: `refreshStaleOutlooks` and `scanStaleOutlooks` were
two hand-written, separately-maintained copies of the same idea before this — precisely
the shape that drifts silently, since nothing would fail a gate if only one of the two
ever got a future fix. Both now import one function; they cannot drift again by
construction.

5 unit tests in `__tests__/admissions/staleness.test.ts`, covering all three conditions
independently plus the never-computed/null-version edge cases.

### `lib/universities/queries.ts` (`refreshStaleOutlooks`) and `lib/admissions/scan.ts` (`scanStaleOutlooks`)

Both now call `isOutlookStale` instead of their own inline timestamp check.
`scanStaleOutlooks`'s own `target_universities` select widened to also fetch
`outlook_model_version` (previously `id, user_id, outlook_calculated_at` only).

New test in each of `__tests__/universities/queries-outlook-refresh.test.ts` and
`__tests__/admissions/scan.test.ts`: a row with a **fresh** timestamp but the wrong model
version still refreshes, specifically constructed with the **profile timestamp older
than the row's own** — if either test passed without the version check actually wired
in, that would prove the timestamp rule alone triggered it, not the new one. One
pre-existing `scan.test.ts` fixture (`"skips a row whose outlook is newer..."`) was
missing `outlook_model_version` entirely, which made it read as version-stale by
construction once the check existed — fixed by adding the matching version, since the
test's own intent was "a row that's genuinely fresh," which now requires being fresh on
both counts to mean the same thing.

### Seven `profile_scores` read sites, each gaining `.eq("calculation_version",
CAREER_PROFILE_SCORE_VERSION)`

`lib/security/dal.ts` (`getProfileScores`, the shared cached helper), and the six places
that read the table directly rather than through it — three "no-session job path"
branches that deliberately bypass the cached helper (`lib/opportunities/
persist-matches.ts`, `lib/counselor/state.ts`, `lib/admissions/persist.ts`, each with a
`client ? <direct query> : getProfileScores(...)` shape) plus `lib/scoring/
monthly-review.ts`, `lib/benchmarking/cohort.ts`, and `lib/benchmarking/index.ts`. All
seven found the same way the reason-codes/other multi-caller gaps were found earlier
tonight: grep every `.from("profile_scores")` in the repo, don't trust that fixing the
one shared helper covers the callers that bypass it.

`lib/benchmarking/cohort.ts` gets an extra sentence in its own comment: this is the one
site that pools **many students'** scores into one computation (a cohort percentile) —
a version-mismatched peer wouldn't just show one student a stale number, it would
compare every other student in the cohort against a value computed on a different scale.

New `__tests__/scoring/profile-scores-version-filter.test.ts`: source-text assertions
(same technique as `pagination-safety.test.ts`'s own established convention for a
property a Node-side unit test can't exercise behaviorally — there's no second version
to actually construct) confirming all seven sites carry the filter, each scoped to its
specific enclosing function so the test fails on the function that regresses, not on
`.eq("calculation_version"` appearing anywhere in a large file.

One pre-existing test (`__tests__/scoring/monthly-review.test.ts`) had a `profile_scores`
mock that resolved after exactly one `.eq()` call — broke on the second one this fix
adds. Fixed the mock to a proper chainable + directly-awaitable builder, the same shape
`queries-outlook-refresh.test.ts`'s own helper already uses; not a change to what the
test asserts, only to a mock that assumed a narrower query shape than the real function
now has.

## Deliberately not done

- **No write-side cleanup of old-version rows.** The upsert's own `onConflict` key means
  a version bump inserts rather than overwrites, so old rows would persist in the table
  after the read-side fix makes them invisible to every reader. This is a real, minor
  hygiene question (unbounded row growth after a hypothetical bump) but not a
  correctness one — the read filter alone fully closes the student-facing gap CEO's
  framing was about. Noted rather than built, to keep this pass scoped to the read-side
  gap it was asked to close.
- **No outlook-history/snapshot table.** Would be the right home for Phase 18's
  "preserve for comparison" value if that's ever wanted; a new table is a migration,
  explicitly out of scope today.
- **Did not arm `scheduled-review`.** Already known, already founder-gated, unrelated to
  what changed in this pass — mentioned only to answer the trigger question precisely.

## Verification

Confirmed once more, not assumed from the earlier sweep: `profile_scores.calculation_version`
and `target_universities.outlook_model_version` each still carry exactly one distinct
value across every live row (grouped, counted). All 4 gates green: typecheck clean, lint
clean, test 3813/3813 passed (269 files, up from 3799/266 before this branch — 14 new
tests, 6 files touched by new/extended coverage), build succeeded.
