# Environment Variables

Single reference for every environment variable this app reads. No values appear here —
for where to obtain each credential, setup steps, and how to verify it's actually
working, see [`API_SETUP.md`](../API_SETUP.md). This doc answers a narrower question:
required or optional, server-only or client-exposed, which feature it gates, and exactly
what happens when it's absent. The ten application variables are read in one place,
[`lib/env.ts`](../lib/env.ts). Two small groups bypass it and read `process.env` directly —
the three `SENTRY_*` variables, and `ADMIN_STARTING_CREDIT_USD`/`_ENTERED_AT` — both
deliberate, both covered in their own notes below rather than folded into the main table.

`.env.example` is the committed, all-empty template. `.env.local` is git-ignored and
must never be committed — confirmed clean (`git log --all -- .env.local` is empty) as of
every audit this project has run.

| Variable | Required? | Server/Client | Feature(s) | Behavior if missing |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Client (browser-exposed by `NEXT_PUBLIC_` prefix — this is a project identifier, not a secret) | Everything — auth, database, storage | `integrationStatus.supabase` is false; every route under `(app)`/`(onboarding)` renders `NotConfiguredNotice` instead of attempting a doomed database call |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Required** | Client (browser-exposed by design — this is the anon/publishable key, safe to ship to the browser; RLS is the real access boundary) | Everything | Same as above |
| `SUPABASE_SECRET_KEY` | Required for a fully usable product | **Server-only** — `createAdminClient()` throws if a server function tries to use it without this set; never referenced from any `"use client"` file (verified by grep this pass) | Bypasses RLS entirely. Notifications, product analytics, account deletion, peer benchmarking, all four background jobs, all global-data writes (universities/opportunities/etc.), the admin panel, and now message moderation | Two genuinely different failure shapes depending on which of the two admin-client constructors a caller uses (`lib/supabase/admin.ts`) — see the table in `docs/qa-environment-readiness-audit.md` §1.3 for the per-consumer list. `tryCreateAdminClient()` (most page-level reads — notifications, analytics, peer benchmarking) returns `null` and the caller no-ops silently: **how you'd know:** you wouldn't, from using the app — a notification simply never arrives, a benchmark simply reads "not enough students." `createAdminClient()` (account deletion, and — critically — `runWithTracking`, meaning **all four background job routes**) throws synchronously: a job route returns a raw 500 *before it ever writes a tracking row*, so the admin panel's Jobs section shows nothing at all for that run, not even a failed one. **How you'd know:** Vercel's function-invocation logs show the 500 (and Sentry, if `SENTRY_DSN` is set, reports it via `onRequestError` — confirmed live in `instrumentation.ts`, which covers Route Handlers); the admin panel alone would show total silence, indistinguishable from the job never having been triggered |
| `ANTHROPIC_API_KEY` | Required for the core product promise | **Server-only** — only `lib/ai/anthropic-provider.ts` imports `@anthropic-ai/sdk`; every AI-backed Server Action reaches it through the `AIProvider` interface, never directly | Advisor chat, weekly plan generation, CV extraction, achievement refinement, research-project generation, essay outline generation (Story Bank), opportunity/requirement extraction | Every AI-backed action catches `AIProviderNotConfiguredError` specifically and returns a clear message instead of a stack trace — no feature crashes, they just say they're unavailable. **Update (2026-09-03):** `getClient()` also now records this to `provider_health` as `not_configured` before throwing (same fix as Tavily/College Scorecard above) — this key is expected to always be set in a real deployment, but the admin panel's Provider Health section would no longer read "Unknown" if it somehow weren't |
| `ANTHROPIC_MODEL` | Optional | Server-only | Same as above | Defaults to `claude-sonnet-5` |
| `TAVILY_API_KEY` | Optional (gates one feature) | Server-only — `lib/providers/tavily.ts`, called only from the discovery job routes | Opportunity discovery, requirement discovery (the search step of each pipeline) | **Correction (2026-09-03): not silent as of the current code.** `TavilySearchProvider.search()` returns `{success:false, error:{type:"not_configured",...}}` rather than throwing, and `runWithTracking` only marks a job `failed` on a thrown exception — so the job still records `status: "succeeded"`. But both discovery routes (`discover-opportunities`, `discover-requirements`) count every `{success:false}` into `errorsEncountered`, a real field the admin panel's Jobs section renders as a visible amber warning once it's `> 0` (`scheduled-jobs-section.tsx`) — confirmed live: with the key missing, every query in the batch fails this way, so `errorsEncountered` equals the query count, not 0. **How you'd know:** open the admin panel's Jobs section after the job has run once; `/opportunities` also shows an honest "not configured" empty state rather than fabricated results. **Update (2026-09-03, same day, the real incident this correction was about):** the Jobs-section signal above only fires once a job has actually run — the key sat as an empty string all night, `provider_health` had zero tavily rows, and the Provider Health section (a *different* section from Jobs) rendered that as "Unknown", indistinguishable from a provider that's simply never been called. `search()`/`extract()` now call `recordProviderNotConfigured` on this exact branch, so a row always exists once attempted, and Provider Health renders it as its own "Not configured" status — distinct from "Unknown" (never attempted) and from "Degraded" (a real failure). This closes the specific gap the incident exposed; it does not add a proactive push — "you have to open that panel" is still true, the panel itself is just no longer ambiguous once opened |
| `COLLEGE_SCORECARD_API_KEY` | Optional | Server-only — `lib/providers/college-scorecard.ts` | U.S. university data sync (`sync-university-data` job) | Same shape and same correction as `TAVILY_API_KEY` directly above — `sync-university-data`'s route also counts each failed sync into `errorsEncountered` (`runs.filter((r) => r.status === "error").length`), verified directly. Unsynced universities simply don't exist in the database yet; no fabricated statistics ever shown. **How you'd know:** same as Tavily — the admin panel's Jobs section, not anything proactive. **Update (2026-09-03):** same Provider Health fix as Tavily above — `searchByName()`/`getById()` now record `not_configured` the same way. Live-checked the same day: `provider_health` had no `college_scorecard` row at all even after the founder added this key that morning, genuinely indistinguishable (before this fix) from the key working but nothing having called it yet — this fix is what makes that distinction checkable going forward, though it doesn't retroactively explain which one this particular gap was |
| `OPENALEX_CONTACT_EMAIL` | Optional | Server-only | OpenAlex "polite pool" rate limit only — OpenAlex itself needs no auth | Nothing breaks; requests just use the standard (lower) rate-limit pool |
| `CRON_SECRET` | Required if the four background jobs are ever scheduled | Server-only — `lib/jobs/verify-cron-request.ts` | Bearer-auth guard on all four `/api/jobs/*` routes | **Fail-closed by design**: an unset secret makes `verifyCronRequest` refuse every request (`if (!env.cron.secret) return false`), including Vercel's own legitimate cron trigger — confirmed by reading the function directly. This is the one variable where "missing" means "feature completely inaccessible" rather than "degrades gracefully," on purpose. **How you'd know — and this is the quietest failure in this whole table:** the route returns 401 before `runWithTracking` is ever called, so the admin panel's Jobs section shows **zero rows, ever**, for all four jobs — not a failed run, no run at all, indistinguishable from a fresh install that's simply never been triggered. The only place this is visible is Vercel's own Cron/function-invocation dashboard, which shows the 401s directly. A founder who never opens that dashboard could go a long time assuming these jobs just haven't found anything yet |
| `NEXT_PUBLIC_APP_URL` | Optional (recommended for production) | Client-exposed by prefix, though only ever read server-side (`app/(auth)/actions.ts`) as a fallback base URL | Password-reset and signup-confirmation email links | Falls back to the request's own `origin` header first, then to `http://localhost:3000` if that's also unavailable — a second-line risk (matters if some future code path skips the `origin` header), not a first-line one |
| `SENTRY_DSN` | Optional (recommended for production) | **Server-only** — read in `lib/monitoring/index.ts` | Error tracking for every uncaught server error, via the root `instrumentation.ts` → `onRequestError` hook | Falls back to `ConsoleErrorReporter`: errors still print to the platform log stream tagged `[monitoring:error]`, they just aren't aggregated or alertable. Nothing throws, and a malformed DSN is treated as absent rather than crashing the server. **How you'd know something broke, without this set:** only by reading Vercel's raw function logs directly and noticing the `[monitoring:error]` tag — nothing pushes a notification. This is the single variable that determines whether *every other silent failure in this table* reaches a human proactively or only when someone goes looking |
| `SENTRY_ENVIRONMENT` | Optional | Server-only | Tags each event with an environment | Falls back to `VERCEL_ENV`, then `NODE_ENV`, then `"development"` — correct on Vercel with no configuration |
| `SENTRY_RELEASE` | Optional | Server-only | Ties an event to a specific deploy | Falls back to `VERCEL_GIT_COMMIT_SHA`; omitted from the event entirely if neither is set |

### The other five variables — not gated by `lib/env.ts`, missing from this doc until now

`ADMIN_STARTING_CREDIT_USD`, `ADMIN_STARTING_CREDIT_ENTERED_AT`, `QA_ACCOUNT_A_EMAIL`,
`QA_ACCOUNT_A_PASSWORD`, `QA_ACCOUNT_B_EMAIL`, `QA_ACCOUNT_B_PASSWORD` all exist in
`.env.example` but weren't listed anywhere in this doc despite its own opening claim to be
the reference for "every environment variable this app reads." Correcting that claim too:
`ADMIN_STARTING_CREDIT_USD`/`_ENTERED_AT` are a second direct-`process.env` exception
alongside `SENTRY_*` (`lib/admin/queries.ts`'s `getRemainingCredit`), not routed through
`lib/env.ts` either.

| Variable | Required? | Feature | Behavior if missing |
|---|---|---|---|
| `ADMIN_STARTING_CREDIT_USD` / `ADMIN_STARTING_CREDIT_ENTERED_AT` | Optional, cosmetic | The admin panel's "remaining credit" card | `getRemainingCredit` returns `null` on either being missing/non-numeric (verified: `Number.isFinite` guard); the caller renders this as the card simply not appearing, never as a fabricated $0. **How you'd know:** you wouldn't need to — there's nothing to notice, the card is absent rather than wrong |
| `QA_ACCOUNT_A_EMAIL` / `_PASSWORD`, `QA_ACCOUNT_B_EMAIL` / `_PASSWORD` | Not needed for production at all | One dev script only (`scripts/rls-verify-surface1-u-id.ts`), which logs in as two real, pre-existing QA accounts to verify RLS from an authenticated session rather than the service role | The script can't run without them; nothing in the deployed app reads these. Genuinely optional — don't block a deploy on these |

### Why `SENTRY_*` bypasses `lib/env.ts`

`lib/monitoring/` reads `process.env` directly, which is the only place in the codebase
that does so for a documented variable. Two reasons, both deliberate: the module is loaded
from the root `instrumentation.ts` during server bootstrap and from both the Node and Edge
runtimes, so it must not drag in a module graph that assumes either; and monitoring has to
keep working when env plumbing elsewhere is broken, because reporting that breakage is its
job. Folding these into `lib/env.ts` later is a safe, mechanical change.

They are also absent from `.env.example`, which lists only the application variables.
Local development needs no DSN — the console reporter is the intended local behavior.

## CI

The GitHub Actions workflow (`.github/workflows/ci.yml`) intentionally runs install,
lint, typecheck, test, and build with **zero** of the above configured — empirically
verified (not assumed) by temporarily removing `.env.local` and re-running all four
commands locally. Every integration above is optional at process level, so nothing in
that list is required for the app to type-check, pass its test suite, or produce a
production build; only for its *runtime* behavior once actually serving requests.

## Does `npm run check:integrations` catch the silent cases?

Re-verified against the current script (`scripts/check-integrations.ts`), 2026-09-03: yes,
for what it checks, and it checks the right thing — a real, minimal API call per provider
(Supabase both keys, a real 1-token Anthropic message, a real Tavily search, a real College
Scorecard query, a real OpenAlex query), not a presence check. If a key is present but
wrong, this catches it; `check:integrations` reporting a provider "OK" is trustworthy.

**But it does not, and structurally cannot, catch the specific failure this dispatch named
— a job that reports `status: "succeeded"` while quietly doing nothing.** It pings each
provider directly; it never runs `discoverOpportunitiesForQuery` or any other job body, so
it has no way to observe what `runWithTracking` records. Passing `check:integrations` and
having a healthy job history are two different claims. A second thing worth knowing before
reading its output: **the script itself treats "Missing credential" as an expected, non-
error outcome** — it doesn't fail the exit code or the summary line for it, by design
(`TAVILY_API_KEY` genuinely is optional at the process level). That's correct for CI, but
it means skimming straight to the final "Done" line after a deploy will not tell you Tavily
is unconfigured — you have to read every line, specifically the ones marked `○`.

Also outside its scope entirely: `CRON_SECRET`, `SENTRY_DSN`, `NEXT_PUBLIC_APP_URL`,
`ADMIN_STARTING_CREDIT_*`. Reasonable — none of these are third-party "integrations" in the
sense the other six are — but it means a clean `check:integrations` run says nothing about
whether cron is reachable or errors are being captured.

**What actually catches the silent job-success case: triggering each job once and reading
the admin panel, not re-running this script.** See the checklist below.

## First ten minutes after the first deploy

1. **Run `npm run check:integrations`** against the real production env (or the same
   values, run locally) — read every line, not just "Done". Confirm each configured
   provider says `OK`, not just present.
2. **Trigger each of the four job routes once, manually**, with the real `curl -X POST
   .../api/jobs/<name> -H "Authorization: Bearer $CRON_SECRET"` command each route's own
   file-header comment gives. A 401 here means `CRON_SECRET` itself is wrong or unset —
   the single fastest way to catch that specific silent-forever failure before Vercel's own
   cron schedule would (up to 24h later, depending on the job).
3. **Open the admin panel's Jobs section** (`/kumanda/sistem`) right after
   step 2 and confirm all four show a row at all (proves `CRON_SECRET` reached the routes),
   then check `items_processed`/`errors_encountered` on the two provider-dependent ones
   (discovery, university sync) specifically — a nonzero `errors_encountered` alongside
   `items_processed: 0` means the provider key is missing or wrong, rendered as the amber
   warning line described above.
4. **Send one real message in the AI Advisor.** Confirms `ANTHROPIC_API_KEY` beyond what
   `check:integrations`' 1-token ping proves (a real conversation turn, real system prompt
   length) and confirms the student-facing "unavailable" message never appears when it
   shouldn't.
5. **Cause one deliberate server error** (any convenient one — an invalid id in a URL that
   a route doesn't guard, for instance) and confirm it appears in Sentry within a minute or
   two, if `SENTRY_DSN` is set. If it isn't set yet, confirm instead that it appears in
   Vercel's function logs tagged `[monitoring:error]` — knowing which of the two is true
   for this deploy is the actual point of this step, not the specific error triggered.
6. **Visit the app itself signed out**, confirming Supabase's two public keys are correct
   (this is the one pair of variables that fails loudly and immediately if wrong — a
   student would see `NotConfiguredNotice` on the very first page load, so a working
   homepage is already partial proof, but worth confirming directly rather than inferring).

Steps 2-3 are the ones this dispatch was really asking for — they're the only way to
observe the specific silent-success shape directly rather than infer it from a credential
check.

## What's deliberately not listed here

`NODE_ENV` — set by the platform (Next.js/Vercel/CI), never something this project's own
`.env.local` should set. Read once, in `lib/env.ts`, purely to record `env.app.env` (not
currently branched on anywhere else) and in `app/(dev-preview)/design-preview/page.tsx`
to hard-block that route in production.
