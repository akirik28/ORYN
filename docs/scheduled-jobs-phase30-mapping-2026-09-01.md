# Phase 30 scheduled jobs — mapping, gaps, and the Job D dependency question

**Status:** report only. No code, no migration, no scheduler change.
**Date:** 2026-09-01. **Author lane:** oryn-60, at oryn-a7's request.
**Base:** verified against local `main` (`05404863`) and the live database
(`qtcvcflzxbuagvvwahhu`), not against `origin/main` — as of this writing local `main` is 18
commits ahead of `origin/main` (clean fast-forward, a pending `git push origin main` that
needs the founder's own push or a widened permission, not a merge conflict). Re-check before
trusting this doc's "merged" claims against `origin/main` specifically if that gap is still
open.

---

## 0. Summary

Phase 30 names five jobs (A–E). Four routes exist under `app/api/jobs/`. **One spec job (D)
has no route at all. A second (E) has no route for either corpus it would need to cover.**
Of the four routes that do exist, three have **never recorded a single run** — not "run
before production," never, anywhere, including whatever manual/dev triggering has happened
to date. Only `deadline-reminders` has ever executed (twice, 2026-08-22, both processing 0
items).

This is not a new problem to build around later — it's the honest state of the plumbing the
day a production environment comes up, which per the founder's own build spec doesn't exist
yet. Nothing below implies urgency; it implies the map should be accurate before anyone
draws on it.

## 1. The mapping

| Spec job | What Phase 30 asks for | Route | Wired correctly? | Ever run? | Verdict |
|---|---|---|---|---|---|
| **A** — opportunity discovery | Find new opportunities | `discover-opportunities` | Yes (`runWithTracking`, cron in `vercel.json`) | **No** — 0 rows in `external_sync_jobs` | Built, never executed |
| **B** — upcoming deadline validation | Re-check deadlines against the source | *(none)* | — | — | **Not built.** See §2 |
| **C** — university information freshness | Keep university data current | `sync-university-data` | Yes | **No** — 0 rows | Built, never executed, and see §3 for what "freshness" currently means on this table |
| **D** — weekly student plan generation | Scheduled plan generation (Phase 9) | *(none)* | — | — | **Not built.** See §4 |
| **E** — stale data detection | Detect data that's gone stale | *(none)* | — | — | **Not built** for either corpus. See §2, §3 |
| *(unnamed)* | — | `discover-requirements` | Yes | **No** — 0 rows | Self-labeled "Phase 69 follow-up to Job A's pattern" in its own route comment — not one of the original five, doesn't claim to be |

`vercel.json` configures exactly these four crons, at 0200/0400/0600/0800 UTC respectively.
`lib/jobs/schedule.ts`'s `JOB_DEFINITIONS` (the admin-panel health tracker, merged
2026-08-31) tracks exactly these same four `job_name`s — consistent, nothing untracked.

**Live `external_sync_jobs`, full table, verified today:**

```
job_name           | status    | started_at           | items_processed
deadline_reminders | succeeded | 2026-08-22 11:44:45  | 0
deadline_reminders | succeeded | 2026-08-22 11:17:35  | 0
```

Two rows, both `deadline_reminders`, both zero-item, ten days ago. `discover_opportunities`,
`discover_requirements`, and `sync_us_universities` have **no rows at all** — not stale, not
failed, absent. Whatever exercised `deadline-reminders` twice on 2026-08-22 didn't touch the
other three.

## 2. Jobs B and E (opportunities) — already designed, not duplicating it here

`docs/opportunity-reverification-job-design-2026-08-23.md` (merged, on `main`) is a full
design for Job B and Job E combined, for the opportunities corpus specifically. Its own §1.3
is worth restating because it's still true and still unfixed: **`deadline-reminders`'s route
comment claims "Phase 30, Job B," and that's wrong.** `lib/deadlines/scan.ts` sends
*notifications* about deadlines already stored — it never re-reads a source. Real Job B
(validation against the source) and Job E (stale detection) for opportunities are the same
problem — "fetch the page, compare to what's stored" — which is why that design deliberately
merges them into one job (`opportunity_reverification`) rather than building two.

One thing worth flagging, not fixing here:

- **The stale "Job B" comment on `deadline-reminders`** — flagged by that design doc on
  2026-08-23, still there today. A one-line fix (correct the comment, nothing behavioral)
  whenever someone who owns that route is already in the file.

**Correction (2026-09-01, after this doc first merged):** an earlier version of this section
claimed `oryn/reverify-doc-refresh` (`7cdbd379`) shipped real code
(`lib/opportunities/lifecycle.ts`, `lib/counselor/eligibility.ts`,
`lib/ai/opportunity-context.ts`, tests) on top of the rev 1 design doc. **It doesn't.**
`git show 7cdbd379 --stat` — the commit against its own parent — touches exactly one file,
the design doc itself (+1008/−207), and its own commit message says outright "Design only:
no code, no migration, no database write, no scheduler enabled." That commit is now merged
(rev 2 is the current content of
[opportunity-reverification-job-design-2026-08-23.md](opportunity-reverification-job-design-2026-08-23.md)).
The false "ships real code" claim came from diffing against a stale ancestor commit rather
than the actual merge-base with `main`, which pulled in two *other*, already-separately-merged
commits' changes (`#146`, `#147`) and misattributed them to this branch. Caught by oryn-a7,
independently re-verified here via `git show <sha> --stat` on the commit itself, which
sidesteps branch-comparison ambiguity entirely. Whoever picks up Job B/E: rev 2's headline
finding still stands and still matters — rev 1's "51 rows to rescue" number is now 0 (a
different guard fix changed the predicate) — there just isn't a separate code branch to also
read. Read the doc as it stands now; there's nothing else to find.

**For universities, Job E has no design at all.** The reverification doc's own §12 scopes it
out explicitly: *"University data freshness (Phase 30 Job C). Same pattern, different corpus,
separate design."* That design doesn't exist yet — see §3.

## 3. Job C — built, wired, never run, and "freshness" is currently a research artifact

`sync-university-data` calls `syncUsUniversities(schools)`, defaulting to a hardcoded list of
15 US universities (`DEFAULT_US_UNIVERSITIES`) unless called with `?school=`. On a write, it
sets `data_status: "fresh"` and `last_checked_at: now` — real freshness semantics, correctly
implemented for whatever it touches.

It has never run (§1). Checking what that means for the data it's supposed to maintain:

```
select country, count(*), count(*) filter (where last_checked_at is not null) as has_ts,
       min(last_checked_at), max(last_checked_at)
from universities group by country;
```

**Every one of 143 countries returns 100% coverage on `last_checked_at`**, US included, and
**the newest timestamp anywhere in the table is 2026-08-20** — five days before this job's
own route file was even written, and eleven days before this report. Narrowing to the 10 of
15 `DEFAULT_US_UNIVERSITIES` names that matched the live table exactly (5 didn't match on
name string — a separate, minor data-hygiene gap, not chased further here): same cluster,
same window, `data_status: "fresh"` on all ten. Nothing distinguishes "the job's default
target list" from "everything else in 143 countries" — because the job never wrote any of it.

**This is the same trap the Job B/E design doc diagnosed for opportunities, now confirmed on
a second table.** That doc's §1.2 found `opportunities.last_verified_at` /`verified_at`
record *which pipeline touched the row*, not *whether it's still true*. `universities.
last_checked_at` is the same shape: a timestamp from the one-time research ingestion that
built the corpus, not from any recurring check. `data_status: "fresh"` is asserted, un-aged,
for rows up to two weeks old with no mechanism currently re-touching them. Job C's plumbing
(the route, the write shape, the freshness columns) is real and correctly built; the
*scheduled* part of "scheduled job" has not happened yet in this database, so nothing has
actually tested whether "fresh" ever stops meaning "fresh."

Separately, worth naming even though it wasn't asked: `syncUsUniversities` is scoped to a
15-school US list by construction (`DEFAULT_US_UNIVERSITIES`, or one `?school=` override per
call). Phase 8's non-US admissions architecture (`CountryAdmissionProvider` per country) has
no equivalent scheduled sync at all today — consistent with Job E's gap above, not a new one.

## 4. Job D — no route, and the question you asked directly

**Does Job D depend on item 39 (the founder-blocked-backlog decision about what "Regenerate"
does to completed actions)? No — not if Job D is built the way Phase 9 actually describes it.**

Tracing the mechanism precisely, because the answer rests on it: `getOrCreateWeeklyPlan` has
exactly two callers today (confirmed by grep, nothing else touches it):

- `app/(app)/plan/actions.ts` — the manual "Regenerate" button, calls with **`force: true`**.
- `app/(app)/dashboard/page.tsx:130` — the dashboard's lazy first-visit-of-the-week
  generation, calls **without force**.

The destructive delete item 39 is about (`weekly_actions.delete().eq("plan_id", plan.id)`)
only runs after the function reaches the upsert block. Whether it reaches that block depends
entirely on `force`:

- **Without force:** the function first calls `getCurrentWeeklyPlan` and returns immediately
  if a plan row already exists for `(user_id, current_week_start_date)` — the delete/insert
  block is never reached. If no plan exists yet for the week (the normal case for a student's
  first visit to a new ISO week), the upsert creates a **brand-new** `plan.id`, and the
  subsequent delete targets that same brand-new id — which nothing has ever inserted actions
  under yet. Zero rows to delete, structurally, not by luck.
- **With force:** the upsert reuses the **existing** `plan.id` for the current week (the
  upsert's `onConflict` is `user_id,week_start_date`), so the delete hits whatever actions —
  completed or not — already live under that id. This is the only path that loses data, and
  it's the path only the manual button takes today.

Phase 9 describes Job D as producing *next week's* plan on a schedule ("New profile data +
current profile + deadlines + ... → AI analysis → 3 weekly priorities"), not repeatedly
overwriting the current week's in-progress one. A Job D built that way — call
`getOrCreateWeeklyPlan(userId)` with no force, once per ISO week, for each active student —
takes the same no-force path the dashboard already takes today, just proactively instead of
lazily. It cannot reach the destructive branch, regardless of whether it runs before or after
a student's own dashboard visit that week: whichever caller gets there first creates the
week's plan, and the other becomes a no-op read. **Item 39's resolution changes nothing about
whether this version of Job D is safe to build.**

**The one interpretation where the dependency would be real:** if Job D were instead meant to
force-refresh the *current* week's plan on a timer — e.g., to pick up profile changes
mid-week without waiting for the student to click Regenerate — that would call `force: true`
on a schedule and hit exactly item 39's problem, silently, for every student, unattended.
Nothing in Phase 9's own language asks for this, and it would be a strictly worse, unrequested
feature (a cron quietly discarding a student's completed work is worse than a button doing it
with the student sitting right there). I'd rule this interpretation out rather than treat it
as open, but naming it means the founder can rule it out explicitly instead of it being an
unstated assumption.

**One real dependency Job D does have, unrelated to item 39:** cost and scope. Today,
`generateWeeklyPlan` (an AI call) only runs when a student actually shows up. A scheduled Job
D as described would call it for every active student on a fixed cron whether or not they
open Oryn that week — a genuine scale decision (batch size, whether to skip students inactive
for N weeks, etc.) that's implementation detail once someone builds this, not a blocker to
naming the job as safe to build now.

## 5. What this means, plainly

- **Nothing here is on fire.** No production environment exists yet (per the founder's own
  build spec), so "these jobs have never run" is expected, not a regression.
- **The two real gaps are D and E.** Job D can be built today, independent of item 39, as
  "call the existing no-force path on a schedule" — no new destructive-path exposure. Job E
  has a merged design for opportunities (plus an unmerged, more-current rev 2 worth reading
  first) and no design at all yet for universities.
- **Job C's freshness data needs the same skepticism the opportunities corpus already got.**
  "100% of rows have `last_checked_at`" reads as healthy and isn't — it's one ingestion wave,
  not a working freshness mechanism, exactly the distinction §1.2 of the reverification doc
  drew for the other table.
