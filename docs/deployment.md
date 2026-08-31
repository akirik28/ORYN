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

## 0. Before anything else: two known blockers

Both are verified, reproduced, and have a known fix. Neither can be worked around at
deploy time — they have to be fixed in the repository first.

### 0.1 Two migrations share the version number `0020` — this aborts `supabase db push`

`supabase/migrations/` contains both:

```
0020_requirement_evaluation.sql
0020_target_university_null_program_dedup.sql
```

The Supabase CLI reads the leading digits of each filename as that migration's *version*
and stores it in `supabase_migrations.schema_migrations`, where the version is the primary
key. Two files claiming version `0020` therefore violate that key. Reproduced against a
clean Postgres 17 database:

```
Applying migration 0020_requirement_evaluation.sql...
Applying migration 0020_target_university_null_program_dedup.sql...
ERROR: duplicate key value violates unique constraint "schema_migrations_pkey" (SQLSTATE 23505)
Key (version)=(0020) already exists.
```

The push stops at migration **21 of 68** and leaves the database **half-migrated** — not
empty, not complete. Everything from `0021` onward, including all of this year's RLS
hardening (`0061`–`0067`), is simply absent while the app appears to have a database.

**The fix** — renumber the second file to the next free number:

```bash
git mv supabase/migrations/0020_target_university_null_program_dedup.sql supabase/migrations/0068_target_university_null_program_dedup.sql
```

Safe to reorder: that migration only runs `create unique index if not exists` on
`target_universities`, which migration `0007` creates. Running it last is equivalent to
running it 20th. Verified — after the rename, all 68 migrations apply and the resulting
schema is identical to a plain in-order `psql` replay (81 tables, 103 policies, 257
indexes, 93 functions).

> **Do not "fix" this by renaming to `0020a`.** The CLI ignores files whose version is not
> purely numeric — the push then reports success while never running the file. Verified:
> the resulting database silently lacks
> `target_universities_user_university_no_program_idx`, the index that prevents duplicate
> target-university rows under concurrent requests. A silent gap is worse than the crash.

**If the database is already live and partly migrated**, check what it thinks it has
applied before renaming anything:

```bash
psql "$PRODUCTION_DB_URL" -c "select version, name from supabase_migrations.schema_migrations where version in ('0020','0068') order by version;"
```

A row already recorded as `0020` for the dedup file means renaming it to `0068` will make
the CLI treat it as new and re-run it. That is harmless here (`create ... if not exists`),
but confirm the file's content before assuming the same of any other migration.

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

**Plan limits that shaped this file:**

- **Hobby caps cron jobs at once per day.** A more frequent expression (`0 * * * *`,
  `*/30 * * * *`) *fails the deployment* — it is not silently downgraded. All four
  schedules above are daily, so this deploys on Hobby as-is.
- Pro allows per-minute scheduling and per-minute precision. If discovery needs to run
  more often than daily, that is the reason to upgrade — not the job count. All plans
  allow 100 cron jobs per project.
- `maxDuration` is set to 300s for `app/api/jobs/**` in `vercel.json`. That is also
  Hobby's ceiling; Pro allows up to 800s if a discovery run starts timing out.

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
