# Architecture

## Stack

Next.js 16 (App Router, Turbopack), TypeScript strict, Tailwind v4, shadcn/ui on Base UI
primitives, Supabase (Postgres + Auth + Storage), Anthropic Claude, Tavily, U.S. College
Scorecard, OpenAlex.

**Note on Next.js 16:** `middleware.ts` was renamed to `proxy.ts` (same mechanism,
functionality unchanged) — see `node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`.
This repo's session-refresh code uses the new convention.

## Folder structure

```
app/                    Routes only — thin. Data fetching + Server Actions live here
                         (co-located per route group), business logic does not.
  (auth)/                Sign in/up/out, password reset — public.
  (onboarding)/           5-screen wizard — gated on auth, ungated on onboarding_completed.
  (app)/                  Everything behind the sidebar shell — gated on both.
  api/jobs/               Cron-triggered background jobs (protected by CRON_SECRET).
  api/export-data/        User data export.
  auth/confirm/           Email OTP / password-recovery verification.

features/                UI components grouped by domain (dashboard, profile, advisor,
                         universities, opportunities, applications, onboarding,
                         app-shell, documents, settings, system). Client components live
                         here, not in app/.

lib/                     Framework-agnostic business logic. Pure functions are unit
                         tested (__tests__/ mirrors this structure); anything touching
                         Supabase or an external API is `import "server-only"`.
  ai/                     The only place @anthropic-ai/sdk is imported directly
                         (anthropic-provider.ts). Every feature goes through the
                         AIProvider interface (provider.ts) — swap models/providers
                         without touching business logic.
  scoring/                Deterministic career-profile scoring (9 dimensions) — see
                         "Scoring architecture" below.
  admissions/             Transparent admission-outlook heuristic.
  requirements/           Phase 69 — deterministic per-student evaluation of
                         university_requirements rows (met/likely_met/not_met/unknown/
                         needs_manual_review). evaluate.ts is pure and unit-tested;
                         facts.ts/persist.ts are the only Supabase-touching parts
                         (recompute-on-read, same convention as admissions/persist.ts).
  benchmarking/           Phase 19 — peer percentile comparison. cohort.ts is the one
                         place in the codebase that deliberately reads across many
                         users' profile_scores at once (via the admin client — RLS is
                         owner-only, and a percentile can't be computed without looking
                         past one user's own rows); its return shape (plain number[] per
                         dimension) makes it structurally impossible for a caller to
                         re-identify a peer. compute.ts is pure and unit-tested; never
                         shows a percentile below MIN_COHORT_SIZE (100) peers.
  search/                 Phase 25 — lib/search/index.ts fans a query out across
                         universities, programs, opportunities, every achievement-shaped
                         profile table, goals, and applications in parallel; rank.ts
                         (pure, unit-tested) orders the merged results.
  opportunities/          Discovery pipeline (search → extract → AI-structure → dedupe
                         → store) + deterministic per-student matching.
  providers/              External API clients (Tavily, College Scorecard) — typed,
                         timeout-guarded, health-tracked. No SDK dependency for either;
                         both are small enough that a typed fetch wrapper beats adding
                         a package.
  supabase/               client.ts (browser), server.ts (RLS-scoped, per-request),
                         admin.ts (service-role, background jobs / admin only),
                         proxy.ts (session refresh for proxy.ts).
  security/dal.ts         The authoritative auth check — see SECURITY.md.
  validation/             Zod schemas, one file per form-shaped concern.
  jobs/                   Shared background-job plumbing (cron auth, run tracking).

supabase/
  migrations/             Sequential, numbered, never edited after landing — see
                         "Migration discipline" below.
  seed.sql                Local-dev-only fixtures (Supabase CLI applies this
                         automatically on `db reset`; never applied to a hosted
                         linked project by anything in this repo).

types/database.ts        Hand-authored (no live Supabase project to codegen against in
                         this environment) but structurally identical to what
                         `supabase gen types typescript` would produce — run
                         `npm run db:types` once a project is linked to replace it with
                         the real generated file; nothing else in the codebase needs to
                         change when you do.
```

## Data flow for a typical mutation

1. A Client Component in `features/` calls a Server Action exported from
   `app/(group)/route/actions.ts`.
2. The action calls `requireUser()` (never trusts a client-supplied user id).
3. Input is validated against a Zod schema from `lib/validation/`.
4. The action uses `lib/supabase/server.ts`'s RLS-scoped client — never the admin client.
5. If the mutation changes achievement data, `lib/scoring/persist.ts`'s
   `recomputeCareerProfile()` runs synchronously (it's pure math + a few DB writes, not an
   AI call — cheap enough to run on every write). AI-backed recomputation (weekly plans)
   is different: idempotent per ISO week, never triggered by an unrelated write.
6. `revalidatePath()` invalidates the relevant Server Component routes.

## Scoring architecture

Structured facts → deterministic features → scoring rules → (separately) AI qualitative
interpretation. The number is never LLM-invented:

- `lib/scoring/math.ts` — shared primitives: score clamping, calendar-accurate month
  math, and a diminishing-returns aggregator that encodes "reward depth over quantity" in
  the math itself, reused by every dimension.
- `lib/scoring/dimensions/*.ts` — one file per dimension, each a pure function
  `(ScoringFacts) => DimensionResult`, unit tested against the specific behaviors the
  product spec calls out by name (e.g. a bare activity title shouldn't score high on
  leadership; a research project shouldn't need a publication to score well).
- `lib/scoring/completeness.ts` — a completely independent metric (how much Oryn
  knows) from profile strength (how good it is). Never conflate these two.
- `lib/scoring/persist.ts` — the only place that writes scores to the database.

The AI advisor and weekly-plan generator both read the *output* of this engine
(`lib/ai/student-context.ts`) — they narrate and prioritize, they never compute the
numbers.

## Migration discipline

Every schema change is a new numbered file in `supabase/migrations/` — never edit a
migration that's already landed. `0017_fix_missing_score_rls.sql` is a real example: a
security gap found during review became a new migration, not a silent edit to
`0014_row_level_security.sql`.

## Why some things are duplicated-looking rather than fully generic

- **Server Actions are one function per operation**, not table-driven dynamic dispatch,
  even though `app/(app)/profile/actions.ts` covers 9 structurally similar tables. Next.js
  requires every export from a `"use server"` file to be a standalone async function —
  an object of functions (`{create, update, remove}`) isn't detected as Server Actions by
  the compiler. The shared logic lives in three internal `crudCreate`/`crudUpdate`/
  `crudRemove` helpers; each table gets a 3-line named wrapper around them.
- **No nested PostgREST `.select("*, related(*)")` embedding anywhere in this codebase.**
  `types/database.ts` doesn't model foreign-key `Relationships` metadata (see the
  `Identity<T>` comment in that file for why), so embedded-select response shapes can't be
  typed reliably. The convention instead: fetch the primary rows, batch-fetch the
  referenced table with `.in("id", ids)`, zip them together in application code (e.g.
  `lib/universities/queries.ts`). A few files predate this convention and use a manual
  `as unknown as` cast at the embedding call site instead (documented inline where that
  happens) — both approaches are safe, the batch-fetch pattern is just cleaner and is what
  new code should follow.
