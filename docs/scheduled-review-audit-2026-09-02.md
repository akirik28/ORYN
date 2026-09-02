# Phase 41's "or scheduled review" — 2026-09-02

CEO's instruction: establish whether a score can move without an edit before deciding
whether the job should exist at all. This wasn't a rhetorical framing — the answer had to
come from the code, not from Phase 41's own wording.

## Can a score move without an edit? Yes — confirmed, then proven directly

`lib/scoring/math.ts`'s own comment on `monthsBetween` says it plainly: `end: null` means
an ongoing commitment, "measured up to `referenceDate` (defaults to now)." Five of the nine
scoring dimensions — `leadership`, `research`, `entrepreneurship`, `execution` (project
depth), `community_impact` — compute a `durationBonus` from this. Every one of them falls
back to `new Date()` when `facts.referenceDate` isn't supplied, and `assembleScoringFacts`
(the function that builds those facts for every real, live call) never supplies it.

So: a student with one ongoing leadership role, zero edits, genuinely scores higher today
than a month ago, purely because more calendar time has passed. Not inferred from reading
the code — proven directly (`__tests__/scoring/leadership.test.ts`): the identical activity
row, scored at two different `referenceDate`s six months apart, produces two different
scores; the same row with a real `end_date` (a closed role) produces the identical score
regardless of when it's scored. That asymmetry is the whole mechanism.

Nothing before this package ever re-triggered a recompute for a reason other than a
student's own edit — confirmed by grep, every one of the 26 live `profile_score_snapshots`
rows (from the previous audit) was edit-triggered. Which means, for a dormant student with
an ongoing role:

- Their **displayed** score (the cached `profile_strength_score`/`profile_scores` rows) is
  stale — understating what the same underlying data would compute to today.
- `getMonthlyReview`'s 30-day-baseline lookup (Phase 40) can only ever find whatever
  snapshot happened to exist before the 30-day cutoff — which, for a dormant student, could
  be months old, silently turning a "monthly" review into a review against an arbitrarily
  stale baseline, with nothing in the product surfacing that fact.

**The job should exist.** Built it.

## What was built

**`lib/scoring/persist.ts`**: `recomputeCareerProfile` now accepts optional
`supabaseClient`/`adminClient` overrides, defaulting to the existing
`createClient()`/`tryCreateAdminClient()` calls unchanged for every real caller. A scheduled
job has no session to scope reads to — it isn't acting as any one student — so it needs to
pass its own admin client for both roles. This is the identical fix
`lib/plan/generate-for-active-students.ts` already needed for `getOrCreateWeeklyPlan`, for
the identical reason (that function's own comment: a job calling it without a threaded
client had "every read/write RLS-filtered to nothing"). Also now returns `snapshotWritten:
boolean`, so a batch job can report real work done rather than students merely looked at —
the same `itemsProcessed` convention every other Phase 30 job follows.

**`lib/scoring/scheduled-review.ts`** (new): `runScheduledReview()` — the batch runner.
Iterates every `onboarding_completed = true` student (the same gate Job D uses; there's
still no separate "active" signal on `profiles`), calling `recomputeCareerProfile(userId, {
snapshotReason: "scheduled_review", supabaseClient: admin, adminClient: admin })` for each.
One student's failure is caught and recorded, never aborts the batch — same discipline as
Job D's `generateForStudent`. `"scheduled_review"` is a new, distinct reason string purely
for observability (so a snapshot this job wrote is distinguishable later from an edit-
triggered one); it has no special effect on whether a snapshot gets written — that's
governed only by `changedMeaningfully`, unchanged, for every reason string equally, since
this morning's snapshot-spam fix.

**`app/api/jobs/scheduled-review/route.ts`** (new): same shape as every other job route —
`verifyCronRequest`, `runWithTracking("scheduled_review", ...)`, the `GET = POST` cron
alias, `force-dynamic`. Real and manually triggerable today via
`curl -X POST /api/jobs/scheduled-review -H "Authorization: Bearer $CRON_SECRET"`.

**Left deliberately unarmed**, matching Job D's own precedent exactly: NOT added to
`lib/jobs/schedule.ts`'s `JOB_DEFINITIONS`, NOT in `vercel.json`. This repo's standing rule
is that anything changing production behavior on deploy is founder-gated. Worth naming the
one way this job's risk profile genuinely differs from Job D's: Job D stays unarmed
specifically because it's real, per-student billed AI spend on a recurring cadence.
**This job has no AI call anywhere in its path** — scoring is pure arithmetic (Phase 27;
confirmed via `lib/scoring/monthly-review.ts`'s own header comment) — so its own marginal
cost is bounded DB read/write volume, not billed spend. It stays unarmed anyway, because
the founder-gating rule doesn't carve out an exception for a cheap job, and CEO's own
instruction was explicit and unconditional on this point.

## Guarding against recreating this morning's snapshot-spam bug

The concern named going in: "a scheduled snapshot that fires on an unchanged profile
recreates the exact noise you just deleted." It doesn't, and the reason is structural, not
a new guard added for this job specifically: this job calls `recomputeCareerProfile` for
literally every onboarded student on every run, but `changedMeaningfully` — the same gate
fixed in the previous package — is what decides whether a snapshot (or a `profile_update`
notification) actually gets written, regardless of which caller triggered the call or which
reason string it passed. A student whose score didn't move produces a real, tracked
`no_meaningful_change` result and zero writes. Running the job for every onboarded student
rather than pre-filtering to "students with an ongoing commitment" is deliberate: the guard
already makes the no-op case both cheap and correct, so a pre-filter would add real
complexity (a second, independent notion of "who might have moved") for no behavioral
difference.

One deliberate, unforced consequence worth naming: a student whose ongoing commitment moved
their score enough to cross the notification threshold DOES get a `profile_update`
notification from this job, exactly as if they'd edited their profile themselves — the
existing notification gate (skipped only for `onboarding_completed` specifically) already
handles the new `"scheduled_review"` reason correctly with zero changes needed. This seems
like the right behavior, not an accident: telling a dormant student their research project
just crossed a real threshold is a legitimate, honest thing to say, and arguably the exact
kind of nudge Phase 41's "scheduled review" was for.

## Tests

- `__tests__/scoring/leadership.test.ts` — 2 new tests proving the core empirical claim
  directly: an ongoing role scores higher a year later from the identical row; a closed
  role's score is stable regardless of when it's recomputed.
- `__tests__/scoring/scheduled-review.test.ts` (new, 8 tests) — the batch runner's
  onboarding-gate query, error isolation, ordering, and the specific client-threading bug
  this exists to avoid (same admin client passed as both `supabaseClient` and
  `adminClient`, since a job has no session), mirroring
  `__tests__/plan/generate-for-active-students.test.ts`'s exact structure.
- `__tests__/scoring/profile-update-wiring.test.ts` — 3 new source-pin tests (this function
  still can't be driven with a mocked client for its own default path — calls the
  request-scoped `createClient()` internally — same reason the rest of this file already
  uses source-text pinning) confirming the new opts default to exactly the previous
  behavior, and that `snapshotWritten` is derived from the same gate that decides the write,
  not a second, independently-computed flag that could drift from it.
