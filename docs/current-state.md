# Current State

Snapshot after Chat 1 (Functional Completion / Backend / AI / Data), Chat 2 (World-Class
UI/UX/Brand/Interaction Design), and Chat 3 (Adversarial QA). Any future session should
read this file, `known-issues.md`, `SECURITY.md`, `product-decisions.md`, and the other
root docs rather than any prior conversation transcript — the repository is the source of
truth.

## Update — Chat 3 adversarial security audit complete (2026-08-15)

Completed and hardened the connection-privacy fix (`0024`) a prior Chat 3 session had
started, found and fixed a second, independent, more severe bug in the same area
(`0023_social_v1.sql` had never successfully applied to any real database — see
`known-issues.md`), and — for the first time in this product's history — live-verified
both fixes plus the wider RLS/social layer against a real, disposable Supabase project via
the Supabase MCP, rather than continuing the review-by-hand-only pattern every prior
session was limited to. Also fixed six further concrete bugs found during a wider
adversarial pass (false-precision cross-scale GPA comparison, missing prompt-injection
framing on AI-extracted web content, global search swallowing real backend errors as
empty results, an application-status UI with no rollback on a failed save, an unfiltered
"don't repeat this" advisor query, and busy-mode-until never reaching the advisor). Full
detail in `docs/final-product-audit.md`, `PHASE_STATUS.md`'s "Chat 3" section, and
`known-issues.md`. Every "not run against a live Postgres" caveat elsewhere in this repo's
docs is now stale for anything through migration `0025` specifically — it *has* been run,
live, and the two real bugs that surfaced are fixed. The underlying sandbox limitation
(no app-level Supabase/Anthropic/Tavily credentials, so the running app itself still can't
be exercised end-to-end here) is unchanged and still applies to everything else.

## Update — Chat 2 UI/UX pass complete (2026-08-15)

Full design system (brand tokens, Newsreader/Geist typography split, motion, `components/oryn/*`
primitives) applied across every major surface — Home dashboard, app shell, landing/auth,
onboarding, university exploration, profile, advisor, opportunities, plan/applications
(incl. a new acceptance-moment celebration), and a rebuilt command-palette global search.
Full detail, including exactly what was and wasn't live-verified in this sandbox's
no-Supabase environment, in `chat-2-handoff.md`. Also shipped mid-pass: the founder's V1
social/network scope update (see `product-decisions.md`).

## Update — V1 social/network scope (Chat 2 pass, 2026-08-15)

The founder locked a narrow V1 social scope mid-build: an optionally-shareable public
profile, mutual-consent connections, and a "currently looking for" status — explicitly
**not** a feed, DMs, comments, likes, teammate matching, or a mentor marketplace. Full
reasoning in `product-decisions.md`'s "Chat 2 pass" section (read that before touching
`connections`/`public_profiles`/`is_public`/`looking_for`). Built this pass:

- `supabase/migrations/0023_social_v1.sql` — `profiles.is_public`/`looking_for`, a
  `public_profiles` view (fixed safe-column whitelist, never the raw table), and a
  `connections` table (request → accept, RLS-scoped, order-independent uniqueness).
- `lib/social/public-profile.ts`, `lib/social/connections.ts`.
- `app/(app)/u/[id]/` (public profile page), `app/(app)/connections/` (requests +
  accepted list), a "Visibility" section on `/settings`.
- `notification_category` gained a `'connection'` value; request-sent and
  request-accepted both notify through the existing in-app notification system.

Chat 3 found this migration had a real bug preventing it from ever applying to a live
database at all (fixed in place), and a real privacy vulnerability in the carve-out
described above (fixed in `0024`) — both now live-verified. See the Chat 3 update above
and `known-issues.md` for the full account; this section is left as the original
implementation record.

## What's functionally complete

Everything `README.md`'s "Known limitations" section used to list as missing is now built,
plus the pre-existing product surface documented in `PHASE_STATUS.md`:

- **Per-program requirement checklist (Phase 69)** — `lib/requirements/`. Deterministic
  evaluation (met/likely_met/not_met/unknown/needs_manual_review) of a student's profile
  against a university/program's stated requirements. Two ways rows get populated: an admin
  entry point (optionally AI-assisted structuring, always human-reviewed before save) and
  an automated discovery job (`lib/requirements/discover.ts`, `POST
  /api/jobs/discover-requirements` — Tavily search → AI extraction → dedupe → store,
  bounded to 5 universities/run, university-wide only). Student-facing: a "Requirement
  check" section on the university detail page.
- **Peer benchmarking (Phase 19)** — `lib/benchmarking/`. Cohort-based percentile
  comparison (graduation year + curriculum), gated at n≥100 comparable peers per dimension,
  shown on the Career Profile page. Pre-launch every cohort is genuinely n=0 — this is
  architecture that activates itself once there's real user data, not a stub.
- **Global search (Phase 25)** — `lib/search/`, `/search`. Universities, programs,
  opportunities, every achievement-shaped profile table, goals, and applications, ranked
  and merged into one result list. Reachable from a search icon in both the desktop and
  mobile headers.
- **AI Advisor context gaps closed** — `lib/ai/student-context.ts` now includes: evidence
  status (`[self-reported]`) and ongoing status on activities/projects/research; the
  cross-source Deadline Engine (previously the advisor only saw application deadlines, not
  saved-opportunity or university-program ones — a real gap, now fixed by reusing
  `lib/deadlines/upcoming.ts` instead of a second, narrower query); recent weekly-action
  outcomes (completed/skipped/expired, with the student's own reflection note) so advice
  can learn from what actually happened instead of only avoiding repeated titles; and
  unfinished application checklist items.
- **A real functional bug fixed**: `lib/ai/usage.ts`'s `logAIUsage` was writing through the
  RLS-scoped client to a table whose policy is deliberately select-only, so every insert
  silently failed. This meant `ai_usage` was never populated and `lib/ai/rate-limit.ts`'s
  sliding window (sourced from it) never actually throttled anyone. Fixed — see
  `SECURITY.md`.

## What's partially complete (by deliberate scope decision, not oversight)

- **Per-program requirement discovery is university-wide only, bounded per run.**
  `lib/requirements/discover.ts` (Tavily search → AI extraction → dedupe → store, mirroring
  `lib/opportunities/discover.ts`) populates `university_requirements` automatically now —
  built within this pass after initially being scoped out, see `known-issues.md`. It covers
  5 universities per run by default and only university-wide requirements (not
  program-specific ones, which would need more targeted per-program queries); a university
  already covered isn't re-scanned for freshness yet.
- **Peer benchmarking cohorts are real but currently empty.** Pre-launch, there's no
  population to compare against. The honest empty state ("Not enough comparable Oryn
  students yet") is what every viewer sees today; this is correct, not a bug.
- **`RecommendationClass`'s `consider`/`deprioritize` values are declared in the schema but
  never produced.** Only `do` (the weekly plan's top 1-3 actions, implicitly) and
  `avoid_for_now` (the plan's optional single callout) are ever generated. See
  `known-issues.md` for why this was scoped out rather than built now.

## Architecture quick-reference

- **AI**: `lib/ai/provider.ts` (interface) → `lib/ai/anthropic-provider.ts` (only concrete
  implementation, only file that imports `@anthropic-ai/sdk`). Every structured AI output
  is Zod-validated with one retry on schema failure. `lib/ai/student-context.ts` is the one
  place that assembles what the model sees about a student — never the raw database.
- **University data**: `universities` / `university_programs` / `university_requirements` /
  `university_statistics` / `university_deadlines` / `university_sources` (Phase 35
  canonical entities, no wide nullable-column table). College Scorecard sync
  (`lib/universities/sync-us-universities.ts`) populates U.S. institutions; everything else
  needs manual/admin population or a future country-specific provider (see AGENTS.md Phase
  8 — there is deliberately no "universal European admissions API").
- **Opportunities**: `lib/opportunities/discover.ts` (Tavily search → AI-structure →
  dedupe → store) → `lib/opportunities/matching.ts` (deterministic, no AI call, cheap
  enough to recompute per view).
- **Requirements**: see `lib/requirements/` above. Evaluation is 100% deterministic
  (`lib/requirements/evaluate.ts`) — the AI only ever helps an admin *structure* a
  requirement's already-sourced text (`lib/ai/interpret-requirement.ts`), never invents or
  evaluates one unsupervised.
- **Benchmarking**: see `lib/benchmarking/` above.
- **Search**: see `lib/search/` above.
- **Security**: RLS on all 44 tables, live-verified against a real Postgres in Chat 3 (not
  just cross-checked by grep — method + result in `SECURITY.md`, including the "Social /
  connections" section covering the `public_profiles` security-definer view specifically).
  Every foreign-key column checked against index coverage in Chat 1 (method + result in
  `DATABASE.md`).

## Verification status as of this handoff

```
npm run typecheck   -> clean
npm run lint        -> clean
npm run test         -> 113/113 passing (19 files)
npm run build        -> succeeds
npm run check:integrations -> OpenAlex OK (keyless); Supabase/Anthropic/Tavily/College
                              Scorecard all report "Missing credential" in this sandbox,
                              which is the correct, honest degraded state — no app-level
                              credentials are configured in this environment. (Separate
                              from the Supabase MCP access used for Chat 3's live
                              migration/RLS verification — that's this session's own tool
                              access, not an app credential, and doesn't change this
                              result.)
```

## Recommended UI surfaces for Chat 2 to prioritize

These are functionally complete but deliberately plain (Chat 1 was told not to spend time
on visual design) — see `chat-1-handoff.md` for the full list and reasoning.
