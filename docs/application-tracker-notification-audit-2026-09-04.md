# Application tracker + notification center audit — 2026-09-04

Investigate-only, per CEO assignment: look and report, do not fix. Everything below is
read directly from the current codebase (branch point `f192fd61`) and from real rows in the
live Supabase project (`qtcvcflzxbuagvvwahhu` — the only database this project has; there is
no separate staging/prod split). No writes were made anywhere. "Today" throughout is
2026-09-04, matching the environment's own current date.

## Part 1 — Application tracker

### The 4 real application rows

| University | Status | Deadline | Days out | Readiness shown | Notes |
|---|---|---|---|---|---|
| Erasmus University Rotterdam | not_started | none | — | 0% | no |
| MIT | **submitted** | none | — | *(not shown — see below)* | no |
| MIT | not_started | 2027-01-15 | ~4 months | 13% (1/8) | yes |
| **University of Oxford** | not_started | **2026-09-10** | **6 days** | **0% (0/8)** | no |

`lib/applications/readiness.ts`'s `computeReadiness()` is a discriminated union
(`measured` / `not_tracked` / `unmeasured`), not a bare percentage — this is already good,
correct design, not a gap:

- The submitted MIT application correctly shows **no percentage at all** once status leaves
  `not_started`/`in_progress` — its checklist is genuinely 1/8 complete in the database, but
  the code deliberately stops treating that as "readiness" once an application is sent
  (`app/(app)/applications/[id]/page.tsx:154`, `readiness.notTracked` copy), reasoning that a
  stale completion percentage next to "Submitted" would read as something being wrong with an
  application that can't be un-sent. This is real code, and the 1/8-complete submitted
  application in the database is exactly the case its own header comment says it was written
  for.
- The **detail page** (`app/(app)/applications/[id]/page.tsx:144-159`) shows "Application
  readiness" as an explicit label with the disclaimer *"Measures how much of your known
  checklist is complete — not your chance of admission."* directly under the progress bar.
  This satisfies founder rule #13 (readiness ≠ admission probability) correctly, in text, on
  the page that matters most.

**One real, narrow gap**: the **list page** (`features/applications/applications-view.tsx:119-126`)
shows only a bare `72%` + the word `"ready"` — no disclaimer, no link to one. In isolation,
next to a status badge and a deadline chip, a percentage badge on a university card is
visually the same shape as the admission-outlook percentages shown elsewhere in the app
(`Estimated range 15–25%`). A student who never opens the detail page never sees the
distinction stated. Not a fabricated probability — just an undisclaimed number sitting where
the app elsewhere reserves that shape for admission estimates.

### Requirements checklist: real per-application data, but a fixed template

`app/(app)/applications/actions.ts:11,37-49` (`createApplication`) inserts the exact same 8
rows — `application, transcript, test_score, essay, recommendation, portfolio, interview,
financial_aid` — for every new application, every university, unconditionally
(`DEFAULT_REQUIREMENTS`). Confirmed against real data: all 4 applications have exactly 8
`application_requirements` rows, no more, no fewer, no custom items added by any student.

This is **not** dishonest — it's a personal admin checklist ("did I send my transcript yet"),
which genuinely is the same list for any application, and the spec's own Phase 22 example list
matches it almost verbatim. It is a **separate, correctly-distinguished concept** from
`university_requirements` (Phase 69's real, sourced, per-university/per-program data, shown
further down the same detail page in its own "Requirement Check" section with its own
evaluation status). The two are not conflated in the UI — they're visually separate sections
with separate headings. Reporting this precisely because "real or template" doesn't have a
single yes/no answer here: the personal checklist is a template by design; the requirement
facts next to it are real and sourced.

### The live urgent case

The Oxford application (`early_decision`, deadline 2026-09-10, **6 days from today**) is
`not_started` at 0/8. This is a real, current, unresolved case — not a fixture — and it directly
connects to Part 2's deadline-reminder finding below: 6 days does not cross any of this
codebase's reminder thresholds, so this specific application will not get a deadline
reminder unless the job happens to catch it on exactly day 7 or day 3 or day 1 (see below —
not something to bet on right now).

## Part 2 — Notification center

### The headline number is misleading if read alone

125 notification rows exist. That is **not** zero, and reading CEO's framing ("has any
notification ever fired") literally would be wrong — some have. But the shape underneath is
not a working pipeline:

- **107 of 125 (86%) sit on one single account** (`ccf2161e-…`, the same student who owns the
  Oxford application above). Every other real account has 0, 2, 2, 6, or 8.
- **6 of 11 real users have zero notifications, ever.**
- Category breakdown: **only** `weekly_plan` (112) and `new_opportunity` (13) exist. Zero
  rows of category `deadline`, `university_data_changed`, or `profile_update` — despite all
  three having real, wired `createNotification()` call sites in the codebase
  (`lib/deadlines/scan.ts:381`, `lib/universities/data-change-scan.ts:397`,
  `lib/scoring/persist.ts:210`).

### What actually ran, verified three independent ways

`external_sync_jobs` (the real job-run ledger `runWithTracking()` writes to) has **exactly one
job type with any row at all**: `deadline_reminders`, 2 runs, both `succeeded`. Every other job
— including `generate_weekly_plans`, the job whose category accounts for 112 of the 125
notifications — has **zero** rows, ever.

That doesn't mean `deadline_reminders` is meaningfully "on," either: `deadline_notification_log`
(the dedup table it writes to on every real notify) has **zero rows total**. Both of its two
successful runs found nothing to notify about (`notified: 0` both times) — consistent with,
not contradicting, the burst measurement below.

`vercel.json` declares 7 real daily/weekly cron schedules (`discover-opportunities`,
`discover-requirements`, `sync-university-data`, `notify-university-changes`,
`deadline-reminders`, `detect-stale-data`, `refresh-admission-outlooks`). Declaring a schedule
in that file only takes effect on a live Vercel deployment — this project's actual run history
(one job, twice) is the ground truth, and it shows this declared schedule has not been
producing runs. The two `deadline_reminders` runs are far more consistent with someone
manually curling the route (its own header comment documents exactly that as the intended
manual-trigger path) than with a live scheduler firing daily.

`generate-weekly-plans/route.ts:15-19` — the actual source of the 112 `weekly_plan`
notifications — states outright in its own comment that it is **deliberately** not wired into
`vercel.json` or `lib/jobs/schedule.ts`'s `JOB_DEFINITIONS`, specifically because turning it on
means paying for a real AI call per onboarded student on a recurring cadence, and that decision
was left for whoever turns it on. This is a documented, intentional withholding, not an
oversight — and it means the 112 `weekly_plan` notifications in the database almost certainly
came from someone manually curling this route against one test account during dev work, not
from any live schedule. `job_controls` (the admin on/off switch table) has zero rows — nothing
has ever been explicitly turned on or off through the admin panel either.

### The empty state: two different messages for the same true condition, and the more visible one is the wrong one

The dedicated `/notifications` page's empty state
(`app/(app)/notifications/page.tsx:98`, `messages/en.json` `notifications.page.emptyAllTitle`/
`emptyAllDescription`) is honest:

> **Nothing here yet.** Deadlines, new opportunities, and profile changes will show up here
> as they happen.

But the **bell popover** — the always-visible surface in the top nav, seen on every page,
before a student ever opens the notifications page at all — has its own, different empty
state (`features/app-shell/notification-bell.tsx:114`, `notifications.allCaughtUp`):

> **"All caught up."** (TR: "Hepsi tamam.")

For a student who has never received a single notification because the generating jobs have
essentially never run against real accounts — true for 6 of 11 real users right now, and not
a transient state, a durable one — "all caught up" is a materially different claim than
"nothing here yet." It presupposes there was something to catch up on and reassures the
student they've seen it. The honest phrasing exists in this exact codebase, one component
away, on the *less* visible surface. This is the sharpest finding in this audit and matches
exactly what was asked: does the product say plainly that nothing has been generated, or does
it read as "everything is fine" — here, on the surface a student sees most often, it reads as
the latter.

### Burst-size measurement, computed against real current data (not estimated)

Direct SQL against real `applications`/`saved_opportunities`/`target_universities` deadline
data, using the exact same filters and exact-day threshold list (`[30, 14, 7, 3, 1]`,
`lib/deadlines/scan.ts:28`) the real job uses:

- **5 students** currently have at least one real, active, in-window deadline within the next
  45 days.
- **0 of those 5** would be hit **today** — none of their deadlines happens to land exactly on
  a threshold day right now.
- Over the next 45 days, hits land on scattered individual days (checked: days 20, 25, 26, 41
  each currently have exactly 2 students' university deadlines on them) — never a large
  cluster.

**Answer to "how many notifications land at once on first run": not a flood.** The exact-day
matching design means a freshly-turned-on daily cron would typically produce 0–2 aggregated
notifications on any given day, not a burst across the 8-11 real students at once. The
opposite risk is the real one: this same exact-day design is exactly why the live Oxford
6-day case above will silently get no reminder — a deadline that doesn't happen to land on
30/14/7/3/1 the day the job runs gets nothing, and this job has only ever run twice in this
project's history.

## Summary for the founder-facing question

- Application readiness is correctly, explicitly distinguished from admission probability on
  the page that matters (the detail page); the compact list-view badge is the one place that
  distinction isn't restated, and could visually pattern-match the app's own admission-outlook
  percentages shown elsewhere.
- The requirements checklist is a real, honest personal admin list — deliberately generic by
  design, correctly kept separate from the real, sourced, per-university requirement data
  shown alongside it.
- The notification center is not "empty and honest about it" everywhere — it's honest on the
  full page and presumptuous ("all caught up") on the one surface every student actually sees
  first, for a condition (zero notifications, ever) that is currently true for the majority of
  real accounts.
- Turning the declared cron schedule on for real is not a notification-storm risk by current
  data — it's the opposite risk, sparse and easy to miss, and the live Oxford case is a
  concrete example of exactly that gap happening right now, today, to a real deadline 6 days
  out.

No code was changed for this audit.

---

## ✅ 2026-09-05 audit — all three findings closed

All three (undisclaimed readiness badge, bell's overconfident empty state, exact-day deadline
threshold bug) → **Closed**, same commit: `cbf5e966` (2026-09-04), "Fix the exact-day deadline
threshold bug, the bell's overconfident empty state, and the undisclaimed readiness badge".
Verified via `git merge-base --is-ancestor cbf5e966 origin/main`.
