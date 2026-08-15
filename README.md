# Oryn

A Personal Career Operating System for students (roughly ages 14-18) preparing for
competitive universities and future careers. Oryn captures a student's academic
history, activities, projects, research, and goals; analyzes it into an honest picture of
strengths and gaps; and tells them — specifically, not generically — what's worth doing
next.

It is deliberately not a CV builder, a university ranking site, an admissions calculator,
or a chatbot bolted onto a dashboard. See `AGENTS.md` for the full product specification
this was built against — the permanent, tooling-immune copy lives at
`docs/founder-spec.md`, since `AGENTS.md` also hosts a Next.js-managed block that gets
regenerated independently of this repo's own content.

Multi-session build log: `PHASE_STATUS.md` (phase-by-phase). For the most recent passes
specifically, see `docs/chat-1-handoff.md` (backend/AI/data), `docs/chat-2-handoff.md`
(UI/UX/brand — start here for anything visual), `docs/design-system.md`,
`docs/current-state.md`, `docs/known-issues.md`, and `docs/product-decisions.md`.

## Architecture

Next.js 16 (App Router) + TypeScript strict + Tailwind v4 + shadcn/ui, on Supabase
(Postgres/Auth/Storage) and Anthropic Claude. Full breakdown, including why a few things
are structured the way they are, in **[ARCHITECTURE.md](./ARCHITECTURE.md)**. Schema
details in **[DATABASE.md](./DATABASE.md)**. Security posture in
**[SECURITY.md](./SECURITY.md)**.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in what you have — every integration is optional
```

### Supabase (required for the app to do anything beyond serve the marketing page)

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push          # apply supabase/migrations/
npm run db:types              # regenerate types/database.ts from the live schema
```

For local development without a hosted project, `npx supabase start` runs Postgres +
Auth + Storage in Docker; `npx supabase db reset` applies migrations and
`supabase/seed.sql`'s dev-only fixtures (a handful of real universities — name, country,
city, website only, no invented statistics).

### Other integrations

Anthropic, Tavily, and College Scorecard are all optional — see
**[API_SETUP.md](./API_SETUP.md)** for what each one unlocks, where to get a key, and how
the app behaves when it's missing (never a crash, never fabricated data — a clear
"isn't configured yet" state).

## Local development

```bash
npm run dev
```

Without Supabase configured, every authenticated route shows a clear "not configured"
notice rather than crashing — you can still see the app's design language at
`/design-preview` (dev-only; hard-404s in a production build), which mounts real
presentational components against fixture data. See `docs/design-system.md`.

## Running tests

```bash
npm run test          # vitest, single run
npm run test:watch    # watch mode
```

108 tests, focused on the high-risk deterministic logic the build spec explicitly calls
for unit coverage on: career-profile scoring (all 9 dimensions), admission-outlook
classification, opportunity eligibility/matching, opportunity deduplication, per-program
requirement evaluation, peer-benchmark percentile computation, and search ranking. Most
were written test-first (see the "notable bug fixed" notes in `PHASE_STATUS.md` for what
that caught).

## Integration health check

```bash
npm run check:integrations
```

Makes a real, minimal API call to every configured provider (not just an env-var
presence check) and reports OK / Missing credential / Error for each, without ever
printing a secret value. See API_SETUP.md's "Background jobs" section for the scheduled
jobs that use these same providers on an ongoing basis.

## Other checks

```bash
npm run lint
npm run typecheck
npm run build
```

## Deployment

Deploys anywhere Next.js 16 runs (Vercel is the reference target). Set every variable
from `.env.example` in your hosting platform's environment configuration —
`NEXT_PUBLIC_*` variables are inlined at build time, everything else stays server-only.
If you use the background jobs (`API_SETUP.md`), configure your scheduler to hit them
with the `CRON_SECRET` bearer token.

## Known limitations

This is a genuinely large product spec (80 phases); this build prioritized a trustworthy,
fully-working core over exhaustive feature coverage. Full detail and reasoning for each of
these in **[docs/known-issues.md](./docs/known-issues.md)**. Current list:

- **Rate limiting doesn't cover every Server Action** — AI-backed actions
  (`lib/ai/rate-limit.ts`) and the data export endpoint (`lib/security/rate-limit.ts`)
  are throttled; ordinary CRUD actions rely on RLS scoping rather than a per-user request
  cap. See SECURITY.md.
- **Peer benchmarking (spec Phase 19) is fully built but pre-launch every cohort is
  `n=0`** — see `lib/benchmarking/`. The only honest state to show is "not enough
  comparable students yet," which is what it shows today; no further code is needed for
  it to activate once real user data exists.
- **No professional legal review** of minor-safe/privacy claims — see SECURITY.md.
- **Essay Story Bank (founder-confirmed MVP scope) is not built.** CV Generator is
  (`/profile/cv`); Story Bank needs a schema addition and its own scoped pass — see
  `docs/known-issues.md`.
- **A real, sourced data batch (universities/programs/requirements/opportunities) is
  staged but not yet applied to the live database** — no working `SUPABASE_SECRET_KEY`
  this session. See `docs/pre-publish-checklist.md`.

Built, but worth knowing the shape of: `/admin` (provider health, job history, AI usage,
manual job triggers — gated by `profiles.is_admin`, not linked from navigation),
in-app notifications (weekly-plan-ready, deadline reminders — a bell in the nav, no
push/email delivery), a Portfolio showcase view (`/profile/portfolio`), a monthly Progress
view (`/profile/history` — score deltas against the oldest snapshot in the last 30 days),
a Goals section on the Profile page, "Study capacity" settings (weekly time budget + busy
mode, both feed the weekly-plan AI prompt), "Improve this entry with AI" on achievement
forms, an OpenAlex-grounded research-project generator (on the Profile page's Research
section), a privacy-conscious internal product-events log (`product_events` —
system-generated only, no user-facing read/write, not part of data export, same posture
as `ai_usage`), a unified cross-source Deadline Engine (the dashboard "Due soon" feed, the
deadline-reminder job, and the AI Advisor's own context all merge applications, saved
opportunities, and target-university program deadlines into one sorted view —
`lib/deadlines/upcoming.ts` / `lib/deadlines/scan.ts`), global search across universities,
programs, opportunities, profile items, goals, and applications (`lib/search/`, `/search`),
per-program requirement evaluation with two population paths — an admin form and an
automated discovery job, `POST /api/jobs/discover-requirements` (`lib/requirements/`, on
each university's page) — admin-triggerable background jobs for opportunity discovery,
university sync, deadline scans, and requirement discovery, all visible at `/admin`, and
a narrow V1 social layer added mid-Chat-2 at the founder's direction: an opt-in
shareable profile (`/u/[id]`, off by default) and mutual-consent connections
(`/connections`) — see `docs/product-decisions.md` for why this is request/accept rather
than an open follow, given the product's 14-18-year-old primary audience.

None of these are silently faked — where a feature isn't built, the UI says so (a real
empty state, a "not configured" notice, or the feature simply isn't linked from
navigation yet) rather than showing fabricated data.
