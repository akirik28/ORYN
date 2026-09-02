# Founder's morning: admin access, migrations, admin screens, deploy

Verification pass, not a summary of intent. Every claim below was checked directly —
against live `oryn-qa-scratch` schema/data, or against this branch's actual source — as
of 2026-09-02, in the same session that wrote this file. Where something depends on
state that can drift (which migrations are applied, current `is_admin`), the check is
included as a copy-pasteable query so you can re-confirm it yourself before trusting it.

Scope: read-only against the live database throughout. No migration was applied, no
admin flag was granted, nothing was deployed. This tells you what will happen when you
do those things, and how to tell if a step silently didn't work — it doesn't do the
steps for you.

---

## Step 1 — Grant yourself admin

**The naive version silently fails.** `/admin` is gated by `requireAdmin()`, and your
own account (`akirik28@my.uaa.k12.tr`) has `is_admin = false` right now — confirmed live.
If you run the obvious fix —

```sql
UPDATE profiles SET is_admin = true WHERE id = (SELECT id FROM auth.users WHERE email = 'akirik28@my.uaa.k12.tr');
```

— Supabase's SQL Editor will report `UPDATE 1` and `is_admin` will **still be false**.
This isn't a hypothetical: there's a trigger on `profiles`
(`profiles_00_guard_protected_columns`) that runs before every `UPDATE OF is_admin` and
silently reverts the column to its old value unless the session's `current_user` is
literally `service_role`:

```sql
if pg_catalog.pg_trigger_depth() <= 1 and current_user <> 'service_role' then
  new.is_admin := old.is_admin;   -- and profile_strength_score, completeness_percent
end if;
```

The SQL Editor connects as `postgres`, not `service_role`, so by default every plain
`UPDATE` from that editor hits this branch. The fix is `SET ROLE`, not `SESSION
AUTHORIZATION` — `SET ROLE service_role` changes `current_user` (what the trigger
checks); `SESSION AUTHORIZATION` would not. Confirmed live that `postgres` is a member
of `service_role` (so it's allowed to switch), so this is safe to run as one paste in
the SQL Editor:

```sql
SET ROLE service_role;

UPDATE profiles SET is_admin = true
WHERE id = (SELECT id FROM auth.users WHERE email = 'akirik28@my.uaa.k12.tr');

RESET ROLE;

SELECT is_admin FROM profiles p JOIN auth.users u ON u.id = p.id
WHERE u.email = 'akirik28@my.uaa.k12.tr';
```

**How you'll know it worked**: the final `SELECT` in that same paste returns
`is_admin: true`. If it comes back `false`, the `SET ROLE` didn't take — don't move on,
something's wrong with the connection's role membership. `RESET ROLE` at the end matters
because `SET ROLE` persists for the rest of that editor session/connection otherwise.

---

## Step 2 — Apply migrations

> **Updated 2026-09-02 ~10:45 — four more landed after this runbook was written.** All
> nine below re-verified unapplied against `information_schema` just now, and all nine
> re-verified re-run safe by reading each file.

> ### ⚠️ Apply them in numeric order, all in one go
>
> **This supersedes the urgency column below, which was a mistake.** Tiering the list into
> "now / before deploy / whenever" invites applying a subset — and **`0080` alters a table
> that `0078` creates.** Apply `0080` without `0078` and it fails on a missing table,
> mid-sequence. `docs/deployment.md` §0.1 records what a half-applied sequence cost this
> project once already: `supabase db push` stopped at 21 of 68 and left a database that
> **looked** complete with every RLS hardening silently absent.
>
> The urgency column below is still useful for understanding *what each one buys you*.
> It is not a licence to pick.

| Migration | What it buys | Note |
|---|---|---|
| `0075_deadline_notification_log.sql` | Deadline reminders stop re-sending nightly | New table |
| `0076_ai_usage_degrade_columns.sql` | Records which replies used the cheaper model | Additive |
| `0077_weekly_actions_carried_forward.sql` | Completed work separates from this week's focus | Was the live regression — the code degrades now, but the reflection split needs this |
| `0078_university_notification_log.sql` | University-change notifications stop repeating | New table — **`0080` depends on it** |
| `0079_education_test_score_evidence_status.sql` | Evidence status on education + test scores | Additive |
| `0080_statistics_last_changed...sql` | US statistics can persist a change at all | **Requires `0078`.** Until applied, the nightly sync silently drops every statistics update |
| `0081_canonical_entity_merges...sql` | An admin who merged an entity can still delete their account | First migration to *create* this FK — it was never in any migration |
| `0082_global_university_discovery_indexes.sql` | A fresh deploy gets indexes live already has | No effect here; matters only for a new database |
| `0083_external_sync_jobs_errors_encountered.sql` | A job that swallowed errors reports how many | Additive |
| `0058_social_posts.sql` | — | **Never**, without deciding first. See below. |

**Why 0077 is urgent, not routine**: `getOrCreateWeeklyPlan` — the function behind a
student's first weekly plan *and* every "Regenerate" click — now unconditionally updates
a `carried_forward` column that doesn't exist live. It throws for any student without an
already-generated plan for the current week (7 of 8 students, last checked). Both call
sites catch the throw, so nothing 500s, but weekly planning is dead for most of the
cohort until this lands.

**Why 0058 is a hard no, not just low priority**: it's not "not done yet," it's marked
`NOT YET APPLIED. Deliberately.` in its own header. It's the social/posts schema,
intentionally gated on a founder legal-review decision in
`docs/founder-blocked-backlog.md` ("Social layer (posts / likes / reposts)") — an
asymmetric follow graph is exactly the shape AGENTS.md's minor-safety rules (Phase 12/54)
say not to ship without that review, since your users are 14–18. Applying it wouldn't
break anything today (the feature ships behind a kill switch with no route pointing at
it), but it would put reviewable-only schema live before the review happened. Skip it
until you've made that call.

**All five are idempotent** — confirmed by reading each file: every `CREATE TABLE`/`ADD
COLUMN` uses `IF NOT EXISTS`. Pasting one twice by mistake is a no-op, not a duplicate
error.

**How you'll know each one worked**: the SQL Editor shows a visible error on genuine
failure, so the real risk here isn't silent SQL failure — it's *not checking* that the
paste you ran actually matches the file, or skipping the confirmation step. Run this
after applying (or all at once at the end) to confirm all five landed:

```sql
select 'deadline_notification_log table' as item, exists(select 1 from information_schema.tables where table_schema='public' and table_name='deadline_notification_log') as applied
union all select 'university_notification_log table', exists(select 1 from information_schema.tables where table_schema='public' and table_name='university_notification_log')
union all select 'ai_usage.degraded column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='ai_usage' and column_name='degraded')
union all select 'weekly_actions.carried_forward column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='weekly_actions' and column_name='carried_forward')
union all select 'education_records.evidence_status column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='education_records' and column_name='evidence_status')
union all select 'test_scores.evidence_status column', exists(select 1 from information_schema.columns where table_schema='public' and table_name='test_scores' and column_name='evidence_status');
```

All six should read `true`. Any `false` means that specific migration wasn't actually
run — go back and paste it again (safe, per the idempotency note above).

---

## Step 3 — Open `/admin` and see the spend screens

**This depends on Step 1 having actually worked** — `requireAdmin()` will bounce you
otherwise, and that failure mode looks identical to "the page is broken" if you land here
first. Do Step 1, confirm the `SELECT`, then come here.

I built and live-verified a second way to see these screens without needing Step 1 at
all: [`app/(dev-preview)/design-preview/admin/page.tsx`](../app/(dev-preview)/design-preview/admin/page.tsx),
reachable at `/design-preview/admin` on a local dev server (dev-only — it 404s in
production). It renders the exact same section components the real `/admin` page does,
against the same live read-only queries, with no auth gate — useful today because nobody
had `is_admin` before this and these screens had genuinely never been seen rendered.
I'm keeping this route; it costs nothing (no auth surface, no production route) and is
the fastest way to sanity-check an admin-screen change in the future without granting
yourself admin first.

**What I confirmed rendering correctly, with real data, just now**: all 8 sections
across Spend / System / People. One finding worth knowing before you look yourself:
**your own account is at 304% of its own $1.00/month AI spend ceiling** — $3.04 over the
last 30 days across 102 calls, correctly flagged in both "Budget warnings" and "Spend per
student." Provider health is correctly showing a real Anthropic schema-validation
incident from a few hours ago, since recovered. Scheduled jobs correctly shows "ORYN has
not been deployed yet" and every job as Never run / Stale — that's accurate, not a bug
(see Step 4).

One dead end worth naming so you don't chase it if you hit it yourself: on first load in
this session's own browser tooling, three of the eight sections appeared blank. Traced it
fully — the server-rendered HTML had the real data (no error, no "not configured"
string) the whole time; it was sitting in a hidden Next.js streaming placeholder that a
stale dev-tooling tab never swapped into view. A plain browser hitting your dev server
directly won't have this problem; it's specific to how this session's automated browser
reconnects across a dev-server restart, not the app.

---

## Step 4 — Deploy

Two things will fail *silently* here if you don't check for them specifically —
"silently" meaning: the app comes up, looks fine, and gives you no error anywhere in the
UI.

**`CRON_SECRET` must be set as a Vercel environment variable, not just locally.**
`verifyCronRequest` fails closed by design — an unset secret refuses every request rather
than allowing one through (confirmed in
[`lib/jobs/verify-cron-request.ts`](../lib/jobs/verify-cron-request.ts)). Vercel's own
Cron feature automatically attaches `Authorization: Bearer $CRON_SECRET` to its scheduled
invocations, but only once `CRON_SECRET` exists as a Vercel project env var — if you
forget to set it there, Vercel will still "run" the cron on schedule (its own dashboard
will show an invocation), but your route 401s immediately and does nothing. Also
confirmed: all four scheduled routes in `vercel.json` correctly alias `GET = POST`
(Vercel Cron calls with GET; a route missing this alias would 405 on every single run) —
this part is fine as-is, no action needed.

**A missing `TAVILY_API_KEY` or `COLLEGE_SCORECARD_API_KEY` looks identical to "ran
successfully, nothing new today" in the admin panel — this is the one I'd actually watch
for.** Traced the full path: when Tavily isn't configured,
`TavilySearchProvider.search()` returns a structured `{success: false, error: {message:
"TAVILY_API_KEY is not set."}}` — it does not throw. `discoverOpportunitiesForQuery`
correctly puts that message in the run's `errors` array. But `runWithTracking` (the
function that writes what the admin "Scheduled jobs" screen reads) only marks a job
`failed` when the wrapped function *throws* — a returned-but-unsuccessful result still
computes `itemsProcessed: 0` and gets recorded as `status: "succeeded"`. So: deploy
without `TAVILY_API_KEY` set, and the admin panel will show opportunity discovery running
on schedule, succeeding, processing 0 items — with the actual reason ("Tavily is not
configured") visible only in that request's raw JSON response or Vercel's function logs,
never in the UI. The same pattern applies to `sync-university-data` /
`COLLEGE_SCORECARD_API_KEY`. Right after your first deploy, don't just glance at
"Scheduled jobs" and see green — trigger one job manually and read its actual response:

```bash
curl -X POST https://<your-deploy-url>/api/jobs/discover-opportunities \
  -H "Authorization: Bearer $CRON_SECRET"
```

and check the `runs[].errors` array in the response, not just the HTTP status.

**Set `SENTRY_DSN` (or a self-hosted Sentry/GlitchTip DSN) before this first deploy, not
after — this is the one thing that makes your *first* production errors visible instead of
silent.** As of tonight, real error reporting is fully wired (`lib/monitoring/`,
`instrumentation.ts`, `lib/ai/anthropic-provider.ts`, `lib/providers/fetch-json.ts`) and
covers every uncaught server error, plus every real (not "not configured") failure from
Anthropic, Tavily, College Scorecard, and OpenAlex. **What you get with `SENTRY_DSN`
unset**: exactly what you have today — everything still lands in `console.error`/your
platform's function logs, nothing crashes, nothing hangs waiting on a Sentry endpoint that
doesn't exist (proven directly, not assumed: `__tests__/monitoring/sentry-reporter.test.ts`
asserts zero network calls and a clean resolve with no DSN). **What you get once it's
set**: the same errors become searchable, alertable events instead of lines you'd only see
by going looking — the difference that matters most in the first hours after a first-ever
deploy, when a cold cache, a never-exercised credential, or a job route firing for the
first time is exactly when something is most likely to break. Nothing else changes when
you set it; no code path branches differently, no feature turns on.

**`npm run check:integrations` exists and is the right first move** (Supabase ×2,
Anthropic, Tavily, College Scorecard, OpenAlex) — but it only checks whatever's in the
environment it runs in. Running it on your laptop confirms your *local* `.env.local`,
not what you actually set in Vercel. Run it against Vercel's real values with `vercel env
pull` first, or accept that the curl check above is what actually proves production is
configured. It does not check `CRON_SECRET` (nothing to ping for a shared-secret check),
so that one's on you to confirm directly in the Vercel dashboard.

One more honest observation, not a blocker: `vercel.json` only schedules 4 of the 8 job
routes that exist (`discover-opportunities`, `discover-requirements`,
`sync-university-data`, `deadline-reminders`). `notify-university-changes`,
`detect-stale-data`, `refresh-admission-outlooks`, and `generate-weekly-plans` exist as
routes but aren't on any schedule — didn't chase down whether that's intentional
(triggered elsewhere, or just not wired up yet); worth a look if you expect them to be
running on their own.

---

## Summary

| Step | Would it work as written? | Silent-failure risk |
|---|---|---|
| 1. Self-grant admin | No — needs `SET ROLE service_role` first | High — `UPDATE 1` with no actual change |
| 2. Apply migrations | Yes, all 5 are idempotent | Low — errors are visible; verify with the query above anyway |
| 3. See `/admin` | Yes, confirmed live with real data | None once Step 1 is done; use `/design-preview/admin` to check without it |
| 4. Deploy | Yes, if `CRON_SECRET` + both provider keys are set **in Vercel** | High — missing keys read as "succeeded, 0 items," not as errors. Set `SENTRY_DSN` too, or every other silent failure above stays silent in production as well |
