# Job scheduling decision — 2026-09-02

CEO's framing: nine job routes exist, four are in `vercel.json`, five are inert. Prepare a
staged, unapplied `vercel.json` diff — schedule chosen and justified per job, not a stampede
— and independently re-verify which of the five actually reach a billed AI call, since CEO's
own first verification pass reported all five clean, including one they already knew bills.

**Staged only. No file in this repo is edited by this doc** — `vercel.json` itself is
untouched on this branch, per explicit instruction. The proposed content is a code block
below, for the founder to apply by hand alongside the deploy decision it depends on (see
the blocking precondition in §4 before anything else here).

## 1. The nine jobs, as they stand today

`vercel.json`, unedited, currently declares exactly these four:

```json
{ "path": "/api/jobs/discover-opportunities", "schedule": "0 2 * * *" },
{ "path": "/api/jobs/discover-requirements", "schedule": "0 4 * * *" },
{ "path": "/api/jobs/sync-university-data", "schedule": "0 6 * * *" },
{ "path": "/api/jobs/deadline-reminders", "schedule": "0 8 * * *" }
```

The other five routes exist, work, and are simply never invoked by anything:
`detect-stale-data`, `generate-weekly-plans`, `notify-university-changes`,
`refresh-admission-outlooks`, `scheduled-review`.

## 2. Independent AI-reachability verification

Did not reuse CEO's method or trust their corrected conclusion at face value — built a
different instrument and ran it against all five inert jobs plus the one CEO already knew
bills, as a control.

**Method**: a pure static-text BFS over `import`/`export ... from`/dynamic `import()`
statements, starting at each job's `route.ts`, resolving both `@/`-aliased and relative
specifiers, fully transitive (every imported file's own imports followed, recursively, no
depth limit). Deliberately not an executed trace (avoids the `server-only` resolution
problem entirely — no file is ever run, only parsed as text) and deliberately not a grep for
suspicious-looking names (avoids assuming what "looks like" an AI call).

**Target set, not a single file**: every file in the repo that actually calls
`.generateStructured(` or `.generateText(` (11 files, grepped directly, independent of the
import graph), plus `lib/ai/anthropic-provider.ts` itself — the sole file anywhere in
`lib/`+`app/` that imports `@anthropic-ai/sdk` (confirmed by grep across the whole tree, not
assumed). `lib/ai/provider.ts`'s own header comment states this is architectural, not
incidental: *"The app never talks to Anthropic's SDK directly outside lib/ai... every
feature... goes through this interface."* Also confirmed zero dynamic imports with a
non-literal argument anywhere in `lib/`/`app/` — nothing in this codebase constructs an
import path at runtime, so a static trace cannot be fooled by one.

**Control case**: `generate-weekly-plans` — already known to bill. The trace correctly finds
it: 90 files in its transitive closure, reaching `lib/ai/anthropic-provider.ts` via
`lib/plan/generate-for-active-students.ts` → `lib/plan/persist.ts` → `lib/ai/weekly-plan.ts`
→ `lib/ai/index.ts`. Confirms the method actually catches the one positive case that
matters before trusting any negative result from it.

**Result on the four candidates** — full transitive closure size shown so "clean" doesn't
read as "shallow":

| job | files in closure | hits any of 11 known AI call sites |
|---|---|---|
| `scheduled-review` | 29 | none |
| `detect-stale-data` | 8 | none |
| `notify-university-changes` | 12 | none |
| `refresh-admission-outlooks` | 23 | none |

**Confirms CEO's corrected conclusion, independently.** Also checked each of the four's
actual implementation for non-AI external costs (Tavily, College Scorecard, any `fetch`) —
`lib/admissions/scan.ts` and `lib/universities/data-change-scan.ts` read in full, `detect-
stale-data.ts`/`scheduled-review.ts` grepped for network calls: all four are pure
Supabase-only reads/writes, no external service of any kind. Genuinely free to run, not just
AI-free.

## 3. Per-job: what breaks if it never runs, what it costs if it does

| Job | Cost per run | What breaks if never armed |
|---|---|---|
| `scheduled_review` | $0 (pure arithmetic — Phase 27; independently confirmed above) | A dormant student's displayed career-profile score and the monthly-review baseline never recompute without an edit, even though 5 of 9 scoring dimensions have a pure time-based duration bonus that should move them ([[project_oryn_scheduled_review_job]]). |
| `detect_stale_data` | $0 (stored-data-only recompute, no re-fetch) | `data_status` (fresh/stale/needs_review) on universities/requirements/deadlines never updates from age — frozen at whatever it was initially, regardless of how old the underlying data actually gets. |
| `notify_university_changes` | $0 (DB reads/writes only) | `university_data_changed` — confirmed live 2026-09-02 as the last of Phase 24's notification categories that had never fired even once — stays silently dead. A student tracking a university that changes finds out by chance or not at all. |
| `refresh_admission_outlooks` | $0 (DB reads/writes only) | The read-time refresh (`lib/universities/queries.ts`) only reaches a student who visits the dashboard or Saved list. A student who saved universities early and never returns to either surface carries a stale outlook indefinitely — this job is explicitly the backstop for exactly that student. |
| `generate_weekly_plans` | **~$0.029/call** (measured: 115 real `ai_usage` rows, feature=`weekly_plan`, model≠test-model; avg $0.0292, range $0.0197–$0.0315) | Nothing "breaks" — the dashboard's lazy first-visit-of-week path still generates a plan reactively. What's lost is proactivity: a student who doesn't open the app doesn't get one waiting. |

## 4. `generate_weekly_plans`: independently re-priced, recommendation confirmed

CEO's own number — "~25% of each student's own $0.50 budget before they open the app" — is
about the *monthly* cost of a *weekly* cadence, not one call. Re-derived independently rather
than taking the percentage on faith: $0.0292/call × 4 weeks/month = **$0.117/month/student**,
which is **23.4% of `PER_STUDENT_MONTHLY_TARGET_USD` (0.50)** — consistent with CEO's figure
to within rounding, arrived at from a fresh query rather than inherited. At today's fleet
size (8 onboarded students, `profiles.onboarding_completed = true`), that's **~$0.94/month**
fleet-wide if armed — small in absolute terms today, but the *percentage* is what matters:
it scales linearly with signups and eats a quarter of the per-student ceiling before a
single advisor message, CV import, or anything else the student actually asked for.
**Agree with CEO's recommendation: do not arm.** Enabling proactive generation is a tier/
pricing decision (who absorbs ~25% of one student's monthly ceiling before they've opened
the app), not a scheduling one — the mechanism is correct and already billed safely per-call
(rate-limited, idempotent per ISO week per `lib/plan/persist.ts`); what's gated is the
decision to spend it automatically.

## 5. Proposed schedule for the four to arm

Not all at `0200` — spaced to avoid two jobs contending for the same DB/rate-limit window,
and sequenced where one job's output feeds another same-day:

| Job | Proposed schedule (UTC) | Why this slot |
|---|---|---|
| `notify-university-changes` | `0 7 * * *` | One hour after `sync-university-data` (`0600`) — gives that day's university sync time to land (well inside its own 300s `maxDuration`) before scanning for what changed, with a full hour of buffer against Hobby's ±59-minute jitter. Own hour, no collision with any existing job. |
| `detect-stale-data` | `0 10 * * *` | Last in the daily sequence, two hours after the existing `deadline-reminders` slot (`0800`) — so the freshness recompute reflects whatever that day's other jobs already refreshed, not yesterday's state. |
| `refresh-admission-outlooks` | `0 12 * * 0` (Sundays) | Its own header comment calls it a *"weekly backstop,"* not a daily one — most rows it touches on any given run will already have been refreshed by a page load in the interim (its own docstring), so daily would mostly find nothing. Sunday, midday UTC: a low-traffic slot, and outside every daily job's window entirely. |
| `scheduled-review` | `0 14 1 * *` (1st of month) | Its own header comment states the intended cadence explicitly: monthly, matching `lib/scoring/monthly-review.ts`'s 30-day `REVIEW_WINDOW_DAYS` so a monthly-review baseline lookup reliably finds a recent snapshot. |

Resulting full-day picture for the four *daily* jobs (existing + newly proposed): `02, 04,
06, 07, 08, 10` — six distinct hours, no two jobs sharing one, respecting `docs/
deployment.md` §6's own two-hour-minimum spacing rule where jobs are actually adjacent
(07 sits deliberately close to 06 because it depends on it, not because spacing was
overlooked).

**Full proposed `vercel.json`** (not applied to the file — reproduced here for the founder
to paste in directly):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    { "path": "/api/jobs/discover-opportunities", "schedule": "0 2 * * *" },
    { "path": "/api/jobs/discover-requirements", "schedule": "0 4 * * *" },
    { "path": "/api/jobs/sync-university-data", "schedule": "0 6 * * *" },
    { "path": "/api/jobs/notify-university-changes", "schedule": "0 7 * * *" },
    { "path": "/api/jobs/deadline-reminders", "schedule": "0 8 * * *" },
    { "path": "/api/jobs/detect-stale-data", "schedule": "0 10 * * *" },
    { "path": "/api/jobs/refresh-admission-outlooks", "schedule": "0 12 * * 0" },
    { "path": "/api/jobs/scheduled-review", "schedule": "0 14 1 * *" }
  ],
  "functions": {
    "app/api/jobs/**": {
      "maxDuration": 300
    }
  }
}
```

`generate-weekly-plans` deliberately has no entry, matching §4 — this is the whole
recommendation expressed as a diff, not an omission to double check.

**One thing worth the founder's own attention before applying this**: `docs/deployment.md`
§6.0 confirms Hobby *rejects at deploy time* anything more frequent than daily, but its own
worked examples are all daily — it doesn't say, and this pass didn't find independent
confirmation either way, whether a weekly (`0 12 * * 0`) or monthly (`0 14 1 * *`) expression
is accepted the same way sub-daily ones are rejected. Standard Vercel Cron syntax supports
both, and Hobby's documented constraint is a frequency *ceiling* (≤ once/day), which a
weekly or monthly schedule satisfies — but this is worth a real deploy-time check rather than
asserting it as settled, since deploy-time is also where the more-frequent-than-daily case
fails outright with no local way to catch it first.

## 6. The precondition this entire diff sits behind

**Applying this `vercel.json` change alone will not make any of these four jobs run.**
`docs/nothing-scheduled-has-ever-run-2026-09-02.md`: the Vercel account backing this project
holds **zero deployments** — Vercel Cron only fires against a production deployment, never a
preview, and there has never been one. The four *already-armed* jobs prove this concretely:
`external_sync_jobs` has real rows for exactly one of them (`deadline_reminders`, 2 runs, both
2026-08-22, almost certainly the admin panel's manual trigger button rather than cron) and
zero for the other three, despite all four being correctly declared in `vercel.json` today.
**The config has been correct the whole time; nothing has been listening.** Staging this diff
is a real, necessary step, but it answers "what should run and when," not "will anything run"
— that second question is a deploy decision, already documented elsewhere
([[project_oryn_has_never_been_deployed]]), and out of scope for a scheduling package to
silently resolve by implication.

## Summary

- 5 inert job routes exist and work; this pass independently re-verified (different method,
  not inherited) that 4 of them never reach a billed AI call or any other external service —
  genuinely free to run.
- The 5th, `generate_weekly_plans`, costs ~$0.029/call; at a sensible weekly cadence that's
  ~23% of one student's monthly AI budget before they've opened the app — independently
  re-derived, confirms CEO's recommendation not to arm it without a tier decision.
- Proposed schedule for the 4 to arm: staggered across 4 new hour-slots (07, 10 daily; Sunday
  12 weekly; 1st-of-month 14 monthly), none colliding with the existing 4 or each other, two
  sequenced to run after the same-day job they depend on.
- Full proposed `vercel.json` content is in §5, staged only — the file itself is unedited on
  this branch, per instruction.
- None of this takes effect until ORYN is actually deployed to production, which nothing in
  this doc changes.
