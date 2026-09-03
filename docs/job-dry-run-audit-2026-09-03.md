# Pre-deploy dry run: the four jobs armed hours ago

**Date:** 2026-09-03. **Author lane:** this session. **CEO dispatch**, direct follow-on to the
opportunity-reverification dry-run work earlier tonight: `notify-university-changes`,
`detect-stale-data`, `refresh-admission-outlooks` and `scheduled-review` were armed on a
staggered `vercel.json` schedule during an earlier task
([[project_oryn_job_scheduling_audit_2026_09_03]]) but have never run unattended against real
data. The founder deploys today. Same discipline as the reverification dry runs: what would
each actually do on its first real run, read-only against live data, no writes attempted from
this pass — a live write from a dry-run task is exactly the mistake that discipline exists to
avoid.

## The one that matters most: `notify-university-changes` (fires 07:00 daily)

**Finding: on its first run right now, every candidate notification traces to this project's
own catalogue-research work, not to any genuine external change.** This is exactly the failure
shape flagged as the highest-risk one — a notification about a change that isn't real.

Live query against the real due-set (`target_universities` with `status IN
('exploring','target','applying')`, 19 active rows, tracked 2026-08-21 to 2026-09-02): **10
raw hits, collapsing to real notifications for 3 distinct students**, all from the
`requirement`/`deadline` "new row appeared" sources — zero from `university`/`statistics`
("value changed"). Checked by hand, not assumed:

- User `6e2f0ff1…`'s Erasmus University Rotterdam hits trace to **~87 `university_requirements`
  rows inserted between 19:39:49 and 19:42:41 on 2026-08-21** — sub-second intervals between
  consecutive rows, the same bulk-insert signature this project already has a name for
  ([[reference_timestamp_clustering_reveals_bulk_insert]]). That is a research/ingestion batch
  covering a dozen different Erasmus programme pages, not Erasmus publishing a dozen new
  requirements in three minutes.
- The same student's LSE and Warwick hits, and a second student (`7722ebe9…`, tracked
  2026-08-23) who independently tracks LSE, both trace to the identical LSE requirement batch
  from 2026-08-31 18:31:4x — one real ingestion event, counted as "changed" for two students
  who happen to both track the university it touched.
- A third student (`49de3083…`) has one MIT `deadline` hit, row created 20 minutes after they
  started tracking — same shape, smaller batch.

**This is not a bug in `scanUniversityDataChanges` — the code's own extensive top comment
already reasoned carefully about a related but different confound** ("did the same fact get
re-extracted and read slightly different" vs. "did the fact actually change") and correctly
declined to build a signal for that case on either `requirement` or `deadline`. What it did not
address is a second axis: **"new to Oryn's database" is not the same claim as "new in the real
world,"** and the "new row appeared" sources conflate them. A row inserted by this project's own
backfill work satisfies `created_at > target_universities.created_at` exactly as well as a row
the university itself just published would.

**What a student would actually see**, checked against the real i18n strings
(`messages/en.json`): two of the three get `"{name} — information updated"` naming one specific
university; the third (4 universities hit across sources) gets `"4 universities updated"`. The
copy itself is reasonably neutral — it doesn't claim the university did anything — but a
notification arriving in an inbox reads as "something just happened," and what actually happened
is that Oryn finished researching institutions it already had partial data for, days to weeks
ago.

**Confirmed live, not assumed: nothing softens this on the actual first run.**
`university_notification_log` has **zero rows** (never fired), and none of the three affected
students have `notify_university_data_changed = false`. All three would receive a real
notification the first time this runs.

**Recommendation, not executed — this needs a real write to a live table, out of scope for a
read-only dry run**: backfill `university_notification_log` for every hit that exists *right
now*, before the first scheduled run, so the job's own dedupe treats today as the honest
baseline — "changes since this feature went live" rather than "changes since whenever each
student happened to start tracking, even if that predates most of the catalogue being built."
Concretely: for the same four-source union query this document already ran, insert one
`(user_id, university_id, source, last_changed_at)` row per hit with `ignoreDuplicates: true`
(the same upsert shape `writeUniversityChangeNotifications` already uses) — that primes the log
without notifying anyone, and every row inserted *after* this backfill runs still classifies
normally the way the job already intends. This does not change the mechanism, does not touch
`target_universities.created_at`, and is fully reversible (a dedupe log, not a data table).
The alternative — pull `notify-university-changes` from `vercel.json` until this is done — is
the safer default if there is not time to review and apply a backfill before 07:00.

## `detect-stale-data` (fires 10:00 daily) — low risk, safe as armed

Every per-row write **throws** on failure (`if (updateError) throw new Error(...)`), correctly
caught by `runWithTracking` as a real job failure — not the silent-success shape. Live check of
the actual thresholds (90d/60d/30d) against real `last_checked_at`/`retrieved_at`/`created_at`
values: **zero rows in any of the three tables (universities, university_requirements,
university_deadlines) would flip status on the first run** — everything is genuinely within
threshold. No AI or external calls. Nothing surprising here.

## `refresh-admission-outlooks` (fires 12:00 Sundays — not today) — safe, and its own comment already tells you why the number looks big

Live check: of 20 `target_universities` rows, **17 have never had an outlook calculated at all**
(`outlook_calculated_at IS NULL`, which `isOutlookStale` correctly treats as stale) and 2 more
are stale against a newer profile — **19 of 20 would be refreshed on first run.** This is not a
surprise finding the way `notify-university-changes`'s is: the outlook is *computed fresh from
the student's current profile at compute time*, not an echo of some past event, so there is no
"looks like news, isn't" risk the way a notification carries. `scanStaleOutlooks` wraps each
row's refresh in try/catch, increments `failed` (never throws past one row), and the route
already reports `errorsEncountered: failed` — the real per-item count, not a hardcoded value.
No AI calls in `refreshAdmissionOutlook`/`persist.ts` (confirmed by grep — pure arithmetic, per
AGENTS.md Phase 17's own "transparent heuristic infrastructure" design). Doesn't fire today
regardless (Sunday-only schedule).

## `scheduled-review` (fires 14:00 on the 1st of the month — not today, next fires 2026-10-01) — flagging a real discrepancy, not a bug

The code itself is fine: `reviewOneStudent` catches every per-student failure
(`errorsEncountered = runs.filter(r => r.status === "error").length`, a real count), only the
initial `profiles` read throws. 8 onboarded students — a small, cheap batch, no AI calls
(confirmed: scoring is pure arithmetic, matching `lib/scoring/monthly-review.ts`'s own header).

**What's worth surfacing: this file's own top comment, unchanged since it was written, says
arming was *deliberately withheld* pending founder sign-off specifically** — *"NOT wired into
vercel.json and NOT added to lib/jobs/schedule.ts's JOB_DEFINITIONS — both deliberately left
for whoever turns this on... anything that changes production behavior on deploy is
founder-gated... the gating rule doesn't carve out an exception for a cheap job."* Confirmed
live: it is now in **both** `vercel.json` and `lib/jobs/schedule.ts`'s `JOB_DEFINITIONS`. The
comment's own reasoning is explicit that cost was never the gating reason, so "it's cheap and
safe" (true) doesn't answer whether the gate was actually cleared. Not asserting it wasn't —
just that this specific job's own file is the one of the four that documents a founder-specific
requirement by name, and I can't confirm from here whether that was satisfied before arming.
Lowest urgency of the four (doesn't fire until 2026-10-01), but worth resolving before then
rather than after.

## Re-confirming `runWithTracking`'s thrown-vs-structured behavior, for the actual current code, not inherited from the earlier audit

Read `lib/jobs/run-with-tracking.ts` fresh. `errorsEncountered` is a **required** field in the
callback's return type (not optional) — TypeScript itself won't compile a caller that omits it,
which is a stronger guarantee than "checked by hand once." The function's own current comment
names the exact same split independently confirmed above: *"a job with no per-item external
call that can fail short of the whole run throwing (deadline_reminders,
notify_university_changes, detect_stale_data) reports 0 correctly and explicitly; a job that
does catch per-item failures internally (discover_opportunities, discover_requirements,
generate_weekly_plans, sync_us_universities) has no way to forget to wire the real count
through."* `refresh_admission_outlooks` and `scheduled_review` belong in that second group too
(confirmed by reading each, not by this comment's own list, which predates both being armed) —
both correctly wire a real per-item count.

**One precise, minor gap found in re-tracing `notify_university_changes` specifically**:
`createNotification` (`lib/notifications/create.ts`) makes a real per-item DB insert that can
fail, but its return value collapses "student muted this category" and "the insert genuinely
failed" into the identical `false`, and `writeUniversityChangeNotifications` treats both as
"nothing to do." Both cases are silently invisible to `errorsEncountered` (hardcoded `0` for
this job, correctly, in the sense that neither case throws — but a real write failure and an
intentional mute are different facts, and only one of them is expected). Not the catastrophic
shape (a job never reports `succeeded` while everything failed — `itemsProcessed` still
accurately reflects real sends), and not touched in this pass since it's a design refinement to
a working job, not a first-run risk — noted for whoever picks up notification-write
observability next.

## Also fixed, in passing: three stale route comments

`notify-university-changes`, `detect-stale-data` and `scheduled-review`'s route files all still
said "Not wired into vercel.json — scheduling is a deployment decision left to the founder" (or
equivalent), which stopped being true the moment the earlier job-scheduling-audit task armed
them. A reader trusting that comment — which is exactly what this dry run's own first read of
each file did before checking `vercel.json` directly — would conclude these routes are safely
inert when they are not. Updated all three to state the real armed schedule and point at this
document; `refresh-admission-outlooks`'s own header never made the stale claim and needed no
change.

## Gates

`npm run typecheck` / `npm run lint` — comment-only changes, both green. No test changes (no
behavior changed). This pass was read-only against live data throughout — every number above
came from a direct SQL query or a source read, never from invoking any job's real code path,
so nothing here risked an unintended write. The one concrete recommendation (backfilling
`university_notification_log`) is deliberately left as a recommendation with the exact
mechanism specified, not executed.
