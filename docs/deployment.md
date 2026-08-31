# Deployment

Everything needed to take Oryn from "runs on a laptop" to "running in production," in the
order it has to happen. Written to be followed literally by one person with a terminal.

Oryn has **never been deployed**. There is no hosting project, no domain, no production
database, and no scheduled job has run since 22 August 2026. Nothing below is a
re-configuration of something already live — it is all first-time setup.

**What this document does not do:** create accounts, enter payment details, or accept
terms on your behalf. Every step that needs a credential or a signature is written as an
instruction for you, with the exact values to paste.

---

## 0. Before anything else: one remaining blocker (a second was found and fixed)

### 0.1 [RESOLVED 2026-08-31] Two migrations shared the version number `0020`

`supabase/migrations/` briefly contained both `0020_requirement_evaluation.sql` and
`0020_target_university_null_program_dedup.sql`. The Supabase CLI keys
`supabase_migrations.schema_migrations` on that leading version number, so two files
claiming `0020` violated its primary key. Reproduced against a clean Postgres 17 database:
`supabase db push` stopped at migration **21 of 68**, leaving the database
**half-migrated** — everything from `0021` on, including all of this year's RLS hardening
(`0061`–`0067`), silently absent while the app appeared to have a database.

Fixed by renumbering the second file to `0068_target_university_null_program_dedup.sql`
(commit `7e0f74ac`) — safe, since it only runs `create unique index if not exists` against
a table `0007` already creates. **Re-verified against current `main` after the fix**, both
independently:

```
psql, filename order:             68/68 applied, 0 errors
supabase db push (--include-all): 68/68 applied, 0 errors, 68 rows in schema_migrations
```

Both paths produce an identical schema — **81 tables, 103 policies, 257 indexes, 93
functions** — and the specific index the bug would have silently dropped
(`target_universities_user_university_no_program_idx`) is confirmed present. The three
security objects this defect would have taken down with it are confirmed present and
correct on the fresh replay too: `public_profiles`'s `auth.uid() IS NOT NULL` guard, all 3
`*_guard_computed_columns` triggers, and `anon`'s revoked execute on `is_blocked_between`.

> **If you hit this again on some other pair of migrations**: do not "fix" it by renaming
> to e.g. `0020a`. The CLI ignores any filename whose leading version isn't purely
> numeric — the push reports success while silently never running that file, which is
> worse than the crash. Renumber to the next free integer instead. A CI job that catches
> this class of bug automatically is written and verified, but not yet installed — see
> [`docs/ci-migration-replay-setup.md`](./ci-migration-replay-setup.md) for why (a git
> permission gap, not a code problem) and the exact file to add.

### 0.2 Supabase's built-in email cannot deliver a single real signup

Oryn emails users at signup (`/auth/confirm`) and at password reset — see
`app/(auth)/actions.ts`. Supabase's default email service:

- is rate-limited to **2 messages per hour**, and
- **only delivers to pre-authorized addresses** (your own team members).

A real student signing up would receive nothing at all. This is not a capacity concern to
revisit later; it blocks the first external user. Custom SMTP is set up in step 4.

---

## 1. Production Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard). Pick the
   region closest to your users — Frankfurt (`eu-central-1`) suits a
   Turkey/Europe-weighted audience; Vercel functions default to `iad1` (US East), so see
   step 5.3 if you want them co-located.
2. Choose a strong database password and store it in a password manager. It is shown once.
3. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `service_role` / secret key → `SUPABASE_SECRET_KEY` (**server-only — never expose**)

Free tier is enough to launch. Note that free projects pause after a week of inactivity,
which will also stop scheduled work from having anything to write to.

## 2. Apply the schema

With blocker 0.1 fixed:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

Expect 68 migrations. Verify the result rather than trusting the exit code:

```bash
npx supabase db push --dry-run
```

A clean run reports nothing left to apply. To confirm the schema landed intact, connect
with `psql` and check the shape:

```bash
psql "$PRODUCTION_DB_URL" -c "select (select count(*) from pg_tables where schemaname='public') as tables, (select count(*) from pg_policies where schemaname='public') as policies;"
```

A correct, fully-migrated database reports **81 tables and 103 policies**. Fewer tables
means the push stopped early — do not continue until this matches.

Confirm row-level security is on everywhere, since this is the boundary protecting student
data:

```bash
psql "$PRODUCTION_DB_URL" -c "select t.tablename from pg_tables t join pg_class c on c.relname=t.tablename and c.relnamespace='public'::regnamespace where t.schemaname='public' and not c.relrowsecurity;"
```

This must return **zero rows**. (`.github/workflows/migrations.yml` runs both of these
checks on every migration change, so a regression is caught before it reaches you.)

## 3. Storage buckets

Migrations `0015` and `0058` create the `evidence` and `post-media` buckets and their
per-user RLS policies, so `db push` already made them. Confirm in **Storage** that both
exist and neither is public.

## 4. SMTP (required — see blocker 0.2)

Pick a transactional email provider and verify your sending domain with it. Supabase
documents Resend, AWS SES, Postmark, SendGrid, ZeptoMail and Brevo as working choices; any
SMTP host is fine.

1. Verify your domain with the provider (DNS records — SPF/DKIM). Do this before the
   domain is under load; propagation is not instant.
2. In Supabase: **Project Settings → Authentication → SMTP Settings** → enable custom
   SMTP and enter the host, port, username, password and sender address.
3. Raise the auth rate limit: **Authentication → Rate Limits**. Enabling custom SMTP
   moves the default to 30 emails/hour, which is still low for a launch day.
4. Send a real test signup to an address outside your team and confirm the email arrives.
   This is the only way to know it works — the setting saving successfully proves nothing.

Also set **Authentication → URL Configuration → Site URL** to your production domain, and
add `https://<your-domain>/auth/confirm` to the redirect allow-list, or confirmation links
will bounce users to `localhost`.

## 5. Vercel project

### 5.1 Import

Create a project at [vercel.com/new](https://vercel.com/new) from the GitHub repository.
Next.js is detected automatically; the default build command and output settings are
correct — do not override them.

### 5.2 Environment variables

Set these under **Settings → Environment Variables** for the **Production** environment
(and Preview, if you want previews to work against a separate database):

| Variable | Value | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from step 1 | Inlined at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from step 1 | Browser-exposed by design; RLS is the real boundary |
| `SUPABASE_SECRET_KEY` | from step 1 | **Server-only.** Bypasses RLS entirely |
| `ANTHROPIC_API_KEY` | from console.anthropic.com | Without it every AI feature says it is unavailable |
| `ANTHROPIC_MODEL` | leave unset | Defaults to `claude-sonnet-5` |
| `TAVILY_API_KEY` | from tavily.com | Gates opportunity + requirement discovery |
| `COLLEGE_SCORECARD_API_KEY` | from api.data.gov | Gates U.S. university sync |
| `OPENALEX_CONTACT_EMAIL` | your email | Politeness only; no auth needed |
| `CRON_SECRET` | `openssl rand -hex 32` | See step 6 — this one is special |
| `NEXT_PUBLIC_APP_URL` | `https://<your-domain>` | Currently still `http://localhost:3000` |
| `SENTRY_DSN` | from step 7 | Omit to log errors to Vercel logs only |

`NEXT_PUBLIC_*` variables are baked into the build, so changing one requires a redeploy,
not just a restart.

### 5.3 Region (optional)

Functions run in `iad1` (US East) by default. If your Supabase project is in Frankfurt,
every query crosses the Atlantic twice. **Settings → Functions → Function Region** →
`fra1` removes that. Changing the region needs a redeploy.

## 6. Scheduled jobs

`vercel.json` (committed) defines all four:

| Job | Path | Schedule (UTC) | What it does |
|---|---|---|---|
| Opportunity discovery | `/api/jobs/discover-opportunities` | `0 2 * * *` | Tavily search → extract → dedupe → store |
| Requirement discovery | `/api/jobs/discover-requirements` | `0 4 * * *` | Finds official requirement pages, 5 universities/run |
| University sync | `/api/jobs/sync-university-data` | `0 6 * * *` | College Scorecard refresh |
| Deadline reminders | `/api/jobs/deadline-reminders` | `0 8 * * *` | Scans deadlines, writes notifications |

They are spaced **two hours apart on purpose.** On the Hobby plan Vercel only guarantees
the hour, not the minute: a job set for `0 2 * * *` fires somewhere in `02:00–02:59`.
Two-hour gaps mean that even at worst-case drift, two jobs can never overlap and contend
for the same Anthropic and Tavily rate limits.

### 6.0 Daily-only cadence is a product decision, not just a config detail

This section deploys cleanly on Hobby specifically *because* every schedule above is
daily — that was a constraint, not a preference. It's worth being deliberate about, since
the tradeoff compounds as the product grows:

- **Hobby hard-caps every cron job at once per day.** A more frequent expression
  (`0 * * * *`, `*/30 * * * *`) doesn't get silently downgraded to daily — it **fails the
  deployment outright**. So "stay on Hobby" and "run these jobs more than once a day" are
  mutually exclusive; there's no partial version of this decision.
- **What that costs today:** a newly-posted opportunity can sit undiscovered for up to
  ~24h before the daily discovery run finds it. An opportunity whose deadline moved, or
  that closed early, can show stale in the product for the same window before the next
  run re-checks it. Deadline reminders (§`deadline-reminders`) are themselves only
  re-evaluated once a day, so "6 days left" is accurate to within a day, not an hour —
  fine for a 6-day-out reminder, less fine as a deadline gets close.
- **What Pro removes:** per-minute scheduling and per-minute precision (vs. Hobby's
  ±59-minute jitter). That's the whole change — job logic, `CRON_SECRET`, and everything
  else in this section stays identical. Concretely, it's what would let discovery or
  requirement re-verification move from once daily to, say, hourly near a deadline
  cluster, without any code change — just tighter `vercel.json` schedules.
- **What Pro does *not* change on its own:** more frequent job *runs* mean more Anthropic
  and Tavily calls in the same period. Tightening these schedules on Pro is a rate-limit
  and cost decision as much as a scheduling one — check `ai_usage` and provider rate
  limits before tightening, not just the cron expression.
- All plans allow 100 cron jobs per project either way, so job *count* was never the
  constraint here — cadence is.
- `maxDuration` is set to 300s for `app/api/jobs/**` in `vercel.json`. That's also
  Hobby's ceiling; Pro allows up to 800s if a discovery run starts timing out, independent
  of the daily-vs-more-often decision above.

Nothing here needs deciding before the first deploy — daily is a reasonable, honest
default, and every job already degrades safely (a no-op run, not a crash, when a provider
key is missing). It's a decision worth revisiting once real opportunity volume makes
same-day discovery lag actually felt, not something to discover by noticing data feels
stale.

### 6.1 `CRON_SECRET` behaves differently from the other variables

Vercel reads `CRON_SECRET` itself and attaches `Authorization: Bearer <value>` to every
cron invocation. `lib/jobs/verify-cron-request.ts` checks exactly that header. So the
variable is not just read by the app — setting it in Vercel is what makes the crons
authenticate at all.

It is **fail-closed**: if `CRON_SECRET` is unset, `verifyCronRequest` rejects *everything*,
including Vercel's own cron requests. Unset does not mean "open," it means "off."

### 6.2 Verifying the crons

Cron jobs only run against **production** deployments — never previews. After the first
production deploy, check **Settings → Cron Jobs** in the Vercel dashboard: all four should
be listed with their next run time.

To trigger one immediately rather than waiting:

```bash
npx vercel crons run /api/jobs/deadline-reminders
```

Or call it directly with the secret:

```bash
curl -i -X POST "https://<your-domain>/api/jobs/deadline-reminders" -H "Authorization: Bearer $CRON_SECRET"
```

Expected results, and what each means:

- **401** — the secret is wrong, or `CRON_SECRET` is not set on the project.
- **500** — authentication passed and the job body ran but failed, almost always a missing
  `SUPABASE_SECRET_KEY`.
- **200** — it worked. The run is also recorded in `external_sync_jobs` and visible at
  `/admin`, which is the better place to confirm it did real work rather than a no-op.

> The job routes answer **both** GET and POST. Vercel Cron only ever sends GET; POST is
> the manual/curl trigger. Before this was wired, GET returned 405 and a cron would have
> failed silently every night while looking correctly configured in the dashboard.

### 6.3 If you are not deploying to Vercel

The routes are ordinary authenticated HTTP endpoints — any scheduler works. Supabase's own
`pg_cron` + `pg_net` can call them (`pg_cron` is not currently installed on this project),
as can GitHub Actions or any external cron service. Send `Authorization: Bearer
$CRON_SECRET` and use POST.

## 7. Error tracking

Without this, a production error appears only in Vercel's log stream and is gone once it
rolls off. `lib/monitoring/` is wired into Next's `onRequestError` hook via the root
`instrumentation.ts`, so every uncaught server error — Server Components, Route Handlers,
Server Actions — is captured.

1. Create a project at [sentry.io](https://sentry.io) (platform: Next.js). Any
   Sentry-compatible backend works, including self-hosted Sentry and GlitchTip — Oryn
   speaks the envelope protocol directly rather than depending on the Sentry SDK.
2. Copy the DSN into `SENTRY_DSN` on Vercel.
3. Redeploy.

Optional: `SENTRY_ENVIRONMENT` and `SENTRY_RELEASE` override the defaults. On Vercel they
are inferred from `VERCEL_ENV` and `VERCEL_GIT_COMMIT_SHA`, so you normally do not need
them.

**With no DSN set, nothing breaks** — errors fall back to `console.error` and land in
Vercel's logs, tagged `[monitoring:error]`. Sentry is an upgrade, not a dependency.

What is deliberately *not* sent: cookies, `Authorization` headers, query strings, and any
value whose key looks like a secret. Only an allow-list of headers travels. Given the
user base is largely minors, the redaction rules in `lib/monitoring/redact.ts` are worth
reading before adding new context to an error report.

To confirm it is live, visit a URL that throws in production and check the Sentry issue
stream. Do not test by triggering an error on a page students use.

## 8. Domain

1. **Settings → Domains** in Vercel → add your domain.
2. Follow the DNS instructions it prints (`A` record for an apex domain, `CNAME` for a
   subdomain). TLS is provisioned automatically once DNS resolves.
3. Update `NEXT_PUBLIC_APP_URL` to the final `https://` URL and redeploy — it is inlined at
   build time, so it does not pick up the change on its own.
4. Update Supabase's **Site URL** and redirect allow-list to match (step 4).

## 9. Post-deploy verification

Run through this in order. Each line is a thing that has silently failed in a real
deployment somewhere.

- [ ] `psql` reports 81 tables / 103 policies, and zero tables without RLS.
- [ ] Signing up with a **non-team** email address delivers a confirmation email.
- [ ] The confirmation link lands on your domain, not `localhost:3000`.
- [ ] Password reset delivers and the link works.
- [ ] Logging in reaches the dashboard with no "not configured" notice.
- [ ] The AI Advisor answers (proves `ANTHROPIC_API_KEY` reached the server).
- [ ] All four cron jobs appear under **Settings → Cron Jobs**.
- [ ] `npx vercel crons run /api/jobs/deadline-reminders` returns 200, and a row appears in
      `external_sync_jobs` at `/admin`.
- [ ] `/admin` provider health shows the configured providers as healthy.
- [ ] A deliberate error appears in Sentry.
- [ ] `npm run check:integrations` reports no missing credential you meant to set.

## 10. What this does not cover

- **Backups.** Supabase's free tier keeps daily backups with limited retention; paid tiers
  add point-in-time recovery. Decide before you have real student data, not after.
- **Legal review.** `SECURITY.md` is explicit that the minor-safe and privacy claims have
  not been reviewed by a lawyer. That review is a launch prerequisite, not a deployment
  step.
- **Staging.** There is one environment here. A separate Supabase project wired to Vercel's
  Preview environment is the natural next step, and costs another project's worth of
  resources.
- **Security headers.** No CSP or HSTS is configured. Worth adding to `vercel.json` before
  taking real traffic.
- **Rate limiting at the edge.** Application-level limits exist for AI and social actions
  (`lib/security/`); there is no platform-level protection in front of them.
