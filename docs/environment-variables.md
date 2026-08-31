# Environment Variables

Single reference for every environment variable this app reads. No values appear here —
for where to obtain each credential, setup steps, and how to verify it's actually
working, see [`API_SETUP.md`](../API_SETUP.md). This doc answers a narrower question:
required or optional, server-only or client-exposed, which feature it gates, and exactly
what happens when it's absent. The ten application variables are read in one place,
[`lib/env.ts`](../lib/env.ts) — nothing elsewhere in the codebase reads `process.env`
directly for one of these. The three `SENTRY_*` variables are the one deliberate
exception; see the note under the table.

`.env.example` is the committed, all-empty template. `.env.local` is git-ignored and
must never be committed — confirmed clean (`git log --all -- .env.local` is empty) as of
every audit this project has run.

| Variable | Required? | Server/Client | Feature(s) | Behavior if missing |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | **Required** | Client (browser-exposed by `NEXT_PUBLIC_` prefix — this is a project identifier, not a secret) | Everything — auth, database, storage | `integrationStatus.supabase` is false; every route under `(app)`/`(onboarding)` renders `NotConfiguredNotice` instead of attempting a doomed database call |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | **Required** | Client (browser-exposed by design — this is the anon/publishable key, safe to ship to the browser; RLS is the real access boundary) | Everything | Same as above |
| `SUPABASE_SECRET_KEY` | Required for a fully usable product | **Server-only** — `createAdminClient()` throws if a server function tries to use it without this set; never referenced from any `"use client"` file (verified by grep this pass) | Bypasses RLS entirely. Notifications, product analytics, account deletion, peer benchmarking, all four background jobs, all global-data writes (universities/opportunities/etc.), the admin panel, and now message moderation | Each consumer degrades differently — see the table in `docs/qa-environment-readiness-audit.md` §1.3. Most `console.warn`/`console.error` and no-op silently (e.g. no notification fires); account deletion and the four job routes fail outright rather than silently succeeding at nothing |
| `ANTHROPIC_API_KEY` | Required for the core product promise | **Server-only** — only `lib/ai/anthropic-provider.ts` imports `@anthropic-ai/sdk`; every AI-backed Server Action reaches it through the `AIProvider` interface, never directly | Advisor chat, weekly plan generation, CV extraction, achievement refinement, research-project generation, essay outline generation (Story Bank), opportunity/requirement extraction | Every AI-backed action catches `AIProviderNotConfiguredError` specifically and returns a clear message instead of a stack trace — no feature crashes, they just say they're unavailable |
| `ANTHROPIC_MODEL` | Optional | Server-only | Same as above | Defaults to `claude-sonnet-5` |
| `TAVILY_API_KEY` | Optional (gates one feature) | Server-only — `lib/providers/tavily.ts`, called only from the discovery job routes | Opportunity discovery, requirement discovery (the search step of each pipeline) | The relevant background job degrades to a no-op run (zero items processed, no error) rather than failing; `/opportunities` shows an honest "not configured" empty state, never fabricated results |
| `COLLEGE_SCORECARD_API_KEY` | Optional | Server-only — `lib/providers/college-scorecard.ts` | U.S. university data sync (`sync-university-data` job) | Unsynced universities simply don't exist in the database yet; no fabricated statistics ever shown |
| `OPENALEX_CONTACT_EMAIL` | Optional | Server-only | OpenAlex "polite pool" rate limit only — OpenAlex itself needs no auth | Nothing breaks; requests just use the standard (lower) rate-limit pool |
| `CRON_SECRET` | Required if the four background jobs are ever scheduled | Server-only — `lib/jobs/verify-cron-request.ts` | Bearer-auth guard on all four `/api/jobs/*` routes | **Fail-closed by design**: an unset secret makes `verifyCronRequest` refuse every request, including legitimate ones — verified by reading the function directly this pass. This is the one variable where "missing" means "feature completely inaccessible" rather than "degrades gracefully," on purpose |
| `NEXT_PUBLIC_APP_URL` | Optional (recommended for production) | Client-exposed by prefix, though only ever read server-side (`app/(auth)/actions.ts`) as a fallback base URL | Password-reset and signup-confirmation email links | Falls back to the request's own `origin` header first, then to `http://localhost:3000` if that's also unavailable — a second-line risk (matters if some future code path skips the `origin` header), not a first-line one |
| `SENTRY_DSN` | Optional (recommended for production) | **Server-only** — read in `lib/monitoring/index.ts` | Error tracking for every uncaught server error, via the root `instrumentation.ts` → `onRequestError` hook | Falls back to `ConsoleErrorReporter`: errors still print to the platform log stream tagged `[monitoring:error]`, they just aren't aggregated or alertable. Nothing throws, and a malformed DSN is treated as absent rather than crashing the server |
| `SENTRY_ENVIRONMENT` | Optional | Server-only | Tags each event with an environment | Falls back to `VERCEL_ENV`, then `NODE_ENV`, then `"development"` — correct on Vercel with no configuration |
| `SENTRY_RELEASE` | Optional | Server-only | Ties an event to a specific deploy | Falls back to `VERCEL_GIT_COMMIT_SHA`; omitted from the event entirely if neither is set |

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

## What's deliberately not listed here

`NODE_ENV` — set by the platform (Next.js/Vercel/CI), never something this project's own
`.env.local` should set. Read once, in `lib/env.ts`, purely to record `env.app.env` (not
currently branched on anywhere else) and in `app/(dev-preview)/design-preview/page.tsx`
to hard-block that route in production.
