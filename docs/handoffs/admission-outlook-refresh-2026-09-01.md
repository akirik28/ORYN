# Admission outlook refresh — the stored value that outlived its reasoning

**2026-09-01. Branch `oryn/admission-outlook-refresh-2026-09-01`, pushed not merged. No live
writes — this is code plus tests, not a run against production data.**

## The gap, precisely

`target_universities.outlook` (and its siblings — `academic_fit_score`, `estimate_range_*`,
`outlook_confidence`) is written by `refreshAdmissionOutlook` (`lib/admissions/persist.ts`), and
that function has exactly two triggers: `addTargetUniversity` (once, at save) and the university
detail page (`app/(app)/universities/[id]/page.tsx`, on every visit to *that specific
university's own page*). Confirmed by grep, not assumed — nothing else in the codebase calls it.

Both the dashboard ("University Outlook") and the Saved list read this stored value through a
shared function, `getTargetUniversitiesWithDetails` (`lib/universities/queries.ts`), which never
refreshed anything — it read whatever was last written, however old. A student who saves five
universities in week one and improves their profile in week three still sees five outlook badges
computed against the week-one profile, on the two surfaces actually designed to summarize
"where do things stand" — the detail page was the only page keeping itself honest, and a student
who doesn't click into it a second time never sees the improvement reflected anywhere else.

One more consumer worth naming: `lib/ai/student-context.ts:135` feeds this same stored `outlook`
into the Advisor's own context. A stale outlook doesn't only mis-render a badge — it can also
tell the advisor "Yale is a stretch" for a profile that has since improved past that read.

## Three designs considered, with the actual trade-offs

**Recompute on `profile_scores` write (rejected as the primary mechanism).** `profile_scores` has
exactly one write call site, `recomputeCareerProfile` (`lib/scoring/persist.ts`), called from 4
known places (achievement CRUD × 3, onboarding) — genuinely easy to hook. Rejected anyway: the
value of a fresh outlook is entirely instrumental to being *seen*. Recomputing eagerly on every
profile edit does real work (a handful of DB queries per target university) speculatively, for a
student who may not look at either surface again that session — work that a lazy, read-time
refresh does exactly once, exactly when it's actually looked at, with zero waste. It would also
slow down a frequent, unrelated hot path (adding one achievement) proportional to how many
universities a student has targeted, for a benefit the student isn't looking at in that moment.

**Weekly sweep alone (rejected as the *only* mechanism, kept as a backstop).** Simple, decoupled,
reuses 100% of the existing `lib/jobs/` infrastructure. But this computation is explicitly cheap
— "deterministic math and table lookups, no AI/network call," per `refreshAdmissionOutlook`'s own
doc comment — so a week's staleness window is bought for no real cost reason; it buys nothing for
the exact scenario named above (a student who edits their profile and checks the dashboard the
same day would see nothing new for up to a week). Not discarded, though — see below.

**Refresh stale rows at read time (the primary fix, implemented).** Extends
`getTargetUniversitiesWithDetails` itself — the one function both display surfaces already share
— to detect and refresh any outlook older than the student's own `profiles.updated_at` before
returning. This is the same idiom the function already uses one line below for a different
problem: it self-heals a target row referencing a known-duplicate university at read time rather
than showing a stale card, and this reuses exactly that pattern for outlook staleness instead of
inventing a new one. It closes the actual stated scenario directly: whenever the student next
looks at either surface, what they see is current, regardless of how long it's been.

**Both are implemented, not just the primary one** — read-time refresh only reaches a student who
revisits the dashboard or Saved list. A student who saves universities and never comes back to
either surface again would otherwise carry a stale outlook indefinitely; the weekly sweep
(`lib/admissions/scan.ts`, wired as `/api/jobs/refresh-admission-outlooks`, Sundays 10:00 UTC) is
that backstop. Most rows it touches on a given run will already have been refreshed by a page
load in the interim — finding nothing stale on a run is the job succeeding, not doing nothing.

## The honesty gate — inherited for free, not re-implemented

Both mechanisms call `refreshAdmissionOutlook` itself rather than duplicating its logic, so the
existing honesty gate (`hasConfidentSignal`) applies unchanged everywhere: a profile it would
refuse today stays refused, on every trigger. No new code makes this decision anywhere.

**The one subtlety that needed getting right, not just assumed**: `refreshAdmissionOutlook`
returning `null` (gate refuses) deliberately leaves the stored row untouched — by design, per its
own doc comment. A naive "refresh then re-read the row" implementation would still show the old,
stale non-null value on exactly this case: the one row the honesty gate has now decided it
shouldn't have shown in the first place. Both new call sites (`refreshStaleOutlooks` in
`queries.ts`, `scanStaleOutlooks` in `scan.ts`) handle this explicitly — a refused row is patched
to a cleared outlook in the returned/in-memory data rather than re-read from a database that was
never written. Covered by its own test in both files (`queries-outlook-refresh.test.ts`,
`scan.test.ts`).

## Two things flagged, not solved

**`hasConfidentSignal` is permissive by design** (true if even one dimension is assessed) — a
refresh will produce a real outlook for a profile that's still thin everywhere else. This was
already true for the two existing triggers; neither new mechanism changes it, and changing it is
a separate product decision (a stricter bar for a background-triggered refresh specifically)
outside this fix's scope. Named so it isn't mistaken for solved here.

**Staleness is keyed on `profiles.updated_at`, which bumps on *any* profile column** (migration
0002's generic trigger), not only the scoring-relevant ones. Editing `preferred_language` also
triggers a refresh. Accepted rather than solved with a new dedicated `scores_updated_at` column:
`refreshAdmissionOutlook` is deterministic, so re-running it on an unchanged profile just writes
back the same numbers — wasteful in the rare case, never wrong.

## What's implemented

- `lib/universities/queries.ts` — new `refreshStaleOutlooks` helper, wired into
  `getTargetUniversitiesWithDetails`. Both current callers (dashboard, Saved list) get this for
  free, no call-site changes needed.
- `lib/admissions/persist.ts` — `refreshAdmissionOutlook` takes a new optional `client` param
  (defaults to the existing request-scoped client; every current caller unaffected) so a
  cookie-less job context can pass an admin client instead.
- `lib/admissions/scan.ts` (new) — `scanStaleOutlooks(pageSize?)`, the weekly sweep, admin-client
  throughout, paginated, one row's failure isolated from the rest of its page.
- `app/api/jobs/refresh-admission-outlooks/route.ts` (new) — identical shape to every existing
  job route (`verifyCronRequest` + `runWithTracking`, GET aliased to POST for Vercel Cron, `force
  -dynamic`). `runWithTracking` gives this an `external_sync_jobs` row automatically — the
  existing job-observability admin surface would show a silently-failing sweep the same way it
  already watches every other job, directly addressing "a sweep that silently fails on 200 rows
  would be indistinguishable from one that ran."
- `vercel.json` — new weekly cron entry, Sundays 10:00 UTC (the other four jobs run daily at
  02:00/04:00/06:00/08:00; this one doesn't need daily and doesn't collide with them).

## Verified

13 new tests, both new failure-mode edges covered explicitly (the honesty-gate-refusal-clears
case; per-row failure isolation in the sweep; pagination — caught and fixed a real infinite loop
in the *test's own mock* during this work, not in the shipped code: a naive mock rebuilt its page
iterator on every `.from()` call, which happens once per loop iteration in the real function,
silently handing back page 1 forever whenever a page's length equalled `pageSize`. Cost an actual
OOM crash before being found — kept as a comment in the test file for the next person who reaches
for this same mock shape). Full suite green: 214 files / 3128 tests, lint/typecheck/build all
clean.

**Not verified live in a browser this pass** — this is a data-layer change with no touched
rendering component (`OutlookBadge` and its callers are unmodified), and the staleness/refresh/
gate-interaction logic is exercised directly and completely by the 13 new unit tests. Flagging
this explicitly as a deliberate scope call under time pressure, not an oversight.

## How to apply

- The weekly cron entry needs a deploy to actually start running — `vercel.json` changes take
  effect on the next production deploy, not before.
- If `target_universities` ever grows large enough that the read-time refresh's occasional
  N-stale-rows-per-page-load becomes a real latency concern, the fix is capping how many rows a
  single dashboard/Saved load will refresh at once (not implemented — no evidence this scale
  exists yet, named so it isn't rediscovered as a surprise).
- If a future pass wants a stricter honesty bar specifically for background-triggered refreshes
  (not just the interactive ones), that's a `hasConfidentSignal`-adjacent product decision, not
  a follow-up to this branch.
