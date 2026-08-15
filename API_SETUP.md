# API Setup

Every integration below is optional at boot. Oryn runs and the core product works
with none of these configured — each one just unlocks a specific feature. Run
`npm run check:integrations` at any time to see what's actually working (it makes real,
minimal calls to each configured provider, not just an env-var presence check).

Copy `.env.example` to `.env.local` and fill in what you have.

---

## Supabase (required for accounts, data, storage)

**Purpose:** Postgres database, authentication, and file storage — the foundation
everything else is built on. Without this, the app shows a "Supabase isn't configured
yet" screen instead of crashing.

**Environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY` (server-only — bypasses Row Level Security, never exposed to the browser)

**Where to get it:** Create a project at [supabase.com](https://supabase.com), then
Project Settings → API. Oryn expects the newer "publishable"/"secret" key naming
(not the legacy "anon"/"service_role" naming) — if your project shows the old names,
they're equivalent.

**Setup steps:**
1. Create a Supabase project.
2. Link the CLI: `npx supabase link --project-ref <your-project-ref>`.
3. Push the schema: `npx supabase db push` (applies every file in `supabase/migrations/`
   in order).
4. Optionally seed a handful of real, low-risk university fixtures for local dev:
   `npx supabase db reset` (applies migrations + `supabase/seed.sql` — local dev only,
   never applied to a linked hosted project by any command in this repo).
5. Once linked, regenerate exact types from the live schema (replacing the hand-authored
   `types/database.ts`): `npm run db:types`.

**Where it's used:** `lib/supabase/{client,server,admin,proxy}.ts`, every Server Action,
every data-fetching Server Component.

**How to verify:** `npm run check:integrations` — checks both the publishable key (a
real `select` against `universities`) and the secret key (a real `select` against
`provider_health`, which only the secret key can read).

**Typical failure:** wrong project URL, or a key from the wrong project. Auth-specific
issues (random logouts, session not persisting) almost always mean the cookie handling in
`proxy.ts` / `lib/supabase/server.ts` was bypassed somewhere — every Server Component that
reads user data must call `verifySession()`/`requireUser()` from `lib/security/dal.ts`.

**How the app handles failure:** `lib/env.ts`'s `integrationStatus.supabase` is checked
before any protected layout renders; if false, `features/system/not-configured-notice.tsx`
renders instead of attempting a doomed database call.

---

## Anthropic (AI Advisor, weekly plans, CV import, opportunity extraction)

**Purpose:** Every AI feature — advisor chat, weekly plan generation, CV parsing,
structuring opportunity search results — goes through `lib/ai/`, which wraps the
Anthropic Messages API.

**Environment variables:**
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_MODEL` (optional, defaults to `claude-sonnet-5`)

**Where to get it:** [console.anthropic.com](https://console.anthropic.com) → API Keys.

**Where it's used:** `lib/ai/anthropic-provider.ts` (the only file that imports
`@anthropic-ai/sdk` directly — every feature goes through the `AIProvider` interface in
`lib/ai/provider.ts`, so swapping models or providers never touches business logic).

**How to verify:** `npm run check:integrations` sends a real 1-token message.

**Typical failure:** invalid key, or a model name in `ANTHROPIC_MODEL` that doesn't
exist/isn't enabled for your account.

**How the app handles failure:** every AI-backed Server Action catches
`AIProviderNotConfiguredError` specifically and returns a clear message
("The AI Advisor isn't configured yet...") instead of a stack trace. Structured
generations (weekly plans, CV extraction, opportunity extraction) validate the model's
JSON output against a Zod schema and retry once before failing loudly — see
`lib/ai/anthropic-provider.ts`'s `generateStructured`.

---

## Tavily (opportunity discovery)

**Purpose:** Live web search + page extraction that feeds the opportunity-discovery
pipeline (`lib/opportunities/discover.ts`): search → extract → AI-structure → dedupe →
store.

**Environment variables:** `TAVILY_API_KEY`

**Where to get it:** [tavily.com](https://tavily.com).

**Where it's used:** `lib/providers/tavily.ts`, called from
`POST /api/jobs/discover-opportunities` (see "Background jobs" below).

**How to verify:** `npm run check:integrations` runs a real 1-result search.

**Typical failure:** rate limiting on the free tier if the discovery job runs too often.

**How the app handles failure:** `/opportunities` shows an honest empty state
distinguishing "not configured" from "no matches yet" — never fabricated results.

---

## College Scorecard (U.S. university data)

**Purpose:** Official U.S. Department of Education data — the primary structured source
for U.S. institutions (Phase 7 of the build spec): admission rate, size, cost, SAT/ACT
ranges, graduation rate.

**Environment variables:** `COLLEGE_SCORECARD_API_KEY`

**Where to get it:** Free, instant, self-serve key at
[api.data.gov/signup](https://api.data.gov/signup/) — no approval wait.

**Where it's used:** `lib/providers/college-scorecard.ts`,
`lib/universities/sync-us-universities.ts`, called from
`POST /api/jobs/sync-university-data`.

**How to verify:** `npm run check:integrations` runs a real lookup for "Harvard University".

**Typical failure:** the free api.data.gov key has a modest default rate limit — fine for
scheduled syncs, not for calling on every page view (which is why syncing writes to the
database instead of calling the API live per-request).

**How the app handles failure:** unsynced universities simply don't exist in the
database yet — the UI never shows a university with fabricated statistics.
`supabase/seed.sql` provides a small set of real, low-risk dev fixtures (name/country/
city/website only, no invented numbers) so the university explorer isn't empty in local
dev before a real sync has run.

---

## OpenAlex (research literature)

**Purpose:** Reserved for the research-project-idea generator (Phase 13 of the build
spec) — **not yet implemented in this build pass**, see `PHASE_STATUS.md`.

**Environment variables:** none required. `OPENALEX_CONTACT_EMAIL` is optional and only
opts you into OpenAlex's faster "polite pool" rate limit.

**How to verify:** `npm run check:integrations` — this one succeeds with zero
configuration, since OpenAlex has no auth requirement.

---

## Background jobs

Two scheduled jobs exist as protected Route Handlers rather than a cron dependency
(Vercel Cron, GitHub Actions, or any external scheduler can call them):

```bash
curl -X POST https://your-domain.com/api/jobs/discover-opportunities \
  -H "Authorization: Bearer $CRON_SECRET"

curl -X POST https://your-domain.com/api/jobs/sync-university-data \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Environment variable:** `CRON_SECRET` — generate with `openssl rand -hex 32`. Without
it set, both routes refuse every request (an unset secret never means "open to the
world" — see `lib/jobs/verify-cron-request.ts`).

Every run is logged to the `external_sync_jobs` table (`lib/jobs/run-with-tracking.ts`),
and every provider call updates `provider_health` (`lib/providers/health.ts`) —
regardless of admin UI, you can query these tables directly to see what's healthy.
