# Chat 1 Handoff

Written into the repo, not carried in conversation history, per this build's own protocol.
Chat 2 (World-Class UI/UX/Brand/Interaction Design) should start by reading this file,
`current-state.md`, `known-issues.md`, `product-decisions.md`, and the root docs
(`README.md`, `ARCHITECTURE.md`, `DATABASE.md`, `SECURITY.md`) — not any prior conversation.

## What is functionally complete

The full MVP happy path (Phase 53) works end to end: register → onboard → import/add
profile → review AI extraction → dashboard → weekly priorities → explore universities →
save a target → see requirement check → discover opportunities → save/apply → ask the AI
Advisor → complete an action → see the profile evolve → track an application. Every feature
`PHASE_STATUS.md` and `README.md` previously listed as built is still built and re-verified
this pass (typecheck/lint/test/build all clean — see "Verification" below), plus three
previously-open gaps closed this session:

- **Per-program university requirement checklist (Phase 69)** — `lib/requirements/`.
- **Peer benchmarking (Phase 19)** — `lib/benchmarking/`.
- **Global search (Phase 25)** — `lib/search/`, reachable at `/search`.

Full detail on each in `current-state.md`. A real bug was also found and fixed: the AI
usage log (and therefore the AI rate limiter, which reads from it) was silently
non-functional — see "Security/RLS notes" below.

## What is partially complete

- Requirement checklist: schema + evaluation engine + admin entry point all work, but there
  is no automated crawler populating `university_requirements` yet — rows only exist where
  an admin has added them. See `known-issues.md`.
- Peer benchmarking: fully built, but every cohort is genuinely `n=0` pre-launch, so the
  only thing anyone sees today is the honest "not enough comparable students" state. This
  is correct behavior, not a stub — no further code is needed for it to activate.

## What remains blocked externally

- **No live Supabase project, Anthropic key, Tavily key, or College Scorecard key in this
  environment** — see "APIs / credentials status" below. Nothing about this is a code gap;
  every integration has a real implementation and a real "not configured" fallback.
- **Professional legal review** of minor-safe/COPPA/GDPR-for-minors posture has not
  happened and can't happen in this session — `SECURITY.md` describes the engineering
  posture, explicitly not a compliance certification.
- **Migrations have not been run against a live Postgres** — this sandbox has no Docker, so
  `supabase db reset` couldn't be executed to test the two new migrations
  (`0020_requirement_evaluation.sql`, `0021_benchmarking_indexes.sql`,
  `0022_missing_fk_indexes.sql`) against a real database. They were reviewed carefully by
  hand (standard, well-precedented Postgres DDL — enum creation, an `alter column type ...
  using` cast on an empty table, partial indexes) but **run `supabase db reset` locally
  before trusting them in a shared environment**, per this repo's own migration discipline.

## Current database architecture

43 tables across 22 migrations. Full breakdown in `DATABASE.md`, including the entity-group
table, cascade-behavior rules, and this session's two audits (RLS coverage and FK index
coverage) with runnable verification commands for both. Headline numbers to know: RLS is
enabled and correctly scoped on every table (re-verified this session); every foreign-key
column now has a covering index (9 gaps found and closed this session, listed in
`0022_missing_fk_indexes.sql`'s header comment).

## Current AI architecture

`lib/ai/provider.ts` is the only interface any feature talks to; `AnthropicProvider` is the
only implementation and the only file importing `@anthropic-ai/sdk` directly. Every
structured output is Zod-validated with one retry on schema failure, never trusted raw.
`lib/ai/student-context.ts` is the single compact-context assembler both the chat advisor
and the weekly-plan generator read from — this session added evidence status, ongoing
status, the full cross-source deadline list (previously narrower than what the dashboard
itself shows), recent action outcomes (completed/skipped/expired with reflection notes),
and unfinished application checklist items to that context. `lib/ai/advisor-prompt.ts`
holds the shared system prompt (demanding-mentor behavior, non-negotiables about never
fabricating facts) — reused by both the chat and the weekly-plan generator so the tone and
rules are defined once. See `current-state.md` for the specific gaps closed.

## Current university data architecture

`universities` / `university_programs` / `university_requirements` / `university_statistics`
/ `university_deadlines` / `university_sources` — Phase 35's canonical entities, global (no
`user_id`), read-only to normal requests, written only via the admin client from background
jobs or admin actions. College Scorecard (`lib/providers/college-scorecard.ts` →
`lib/universities/sync-us-universities.ts`) is the only live data source wired up; there is
deliberately no single "European admissions API" (per `AGENTS.md` Phase 8) — non-U.S.
institutions need country-specific providers or manual/admin population, not built this
pass beyond the requirement-checklist admin form.

## Current opportunity architecture

`lib/opportunities/discover.ts`: Tavily search → AI-structures each result
(`lib/ai/opportunity-extraction.ts`, Zod-validated, `isRealOpportunity` gate rejects
non-opportunity pages) → dedupe (`lib/opportunities/dedup.ts`, unit-tested) → store via
admin client. Matching (`lib/opportunities/matching.ts`) is fully deterministic — no AI
call, cheap enough to recompute on every `/opportunities` view. Unchanged this session;
re-verified as still correct while auditing background jobs (see `known-issues.md` for the
one adjacent thing that *was* touched — the deadline reminder job, reused rather than
duplicated, for the advisor's context).

## Current requirements architecture (new this session)

See `lib/requirements/` (`types.ts`, `evaluate.ts` — pure, unit-tested in
`__tests__/requirements/evaluate.test.ts` — `facts.ts`, `persist.ts`) and
`lib/ai/interpret-requirement.ts`. Full reasoning on the schema shape in
`product-decisions.md`. Student-facing: `app/(app)/universities/[id]/page.tsx`'s
"Requirement check" section, grouped university-wide vs. per-program, each row showing a
status badge, Oryn's plain-language reasoning, and a link to the original source. Evaluated
on every view of a university/program page a student has (recompute-on-read, same
convention as admission outlook), never persisted stale.

## Security/RLS notes

- All 43 tables have RLS enabled and correctly scoped; the new
  `student_requirement_evaluations` table is owner-only. Full audit trail and re-run
  commands in `SECURITY.md`.
- **Real bug fixed**: `lib/ai/usage.ts` was inserting into `ai_usage` via the RLS-scoped
  client against a select-only policy — every insert silently failed. This also meant
  `lib/ai/rate-limit.ts` (sourced from `ai_usage`) never actually throttled anyone. Fixed
  by switching to the admin client, matching the existing correct pattern in
  `lib/analytics/log.ts`. **Recommend a live smoke test once credentials exist**: send an
  advisor chat message, then check the `ai_usage` table actually gained a row.
- Every new admin-only write (the requirement form) is gated by `requireAdmin()`
  independently in each Server Action, not just the page — matches this repo's existing
  convention, checked explicitly this session.
- No new IDOR surface introduced — none of the new `lib/` modules are Server Actions (no
  `"use server"`), so none are directly client-callable with an attacker-controlled
  `userId`; every entry point derives the user id from `requireUser()`/`requireAdmin()`
  server-side first. Verified by grep, not assumed.

## Known technical debt

Full list with severity/reasoning in `known-issues.md`. Highlights Chat 2 doesn't need to
fix but should know about: `RecommendationClass`'s `consider`/`deprioritize` values are
unused (only `do` and `avoid_for_now` are ever produced — matches the spec's own worked
dashboard example); `ProviderStatus.down` is never set (only `healthy`/`degraded`); no
requirement-ingestion crawler yet.

## APIs / credentials status

```
Supabase           Missing credential  (no live project linked in this sandbox)
Supabase (secret)  Missing credential
Anthropic          Missing credential
Tavily             Missing credential
College Scorecard  Missing credential
OpenAlex           OK (keyless public API)
```
`npm run check:integrations` makes a real minimal call to each — rerun it once real
credentials are configured. Nothing in the app crashes or fabricates data when a credential
is missing; every integration has a documented, tested "not configured" fallback state
(`API_SETUP.md`).

## Important implementation decisions Chat 2 must not casually break

- **Don't add a nested PostgREST `.select("*, related(*)")` embed anywhere.**
  `types/database.ts` doesn't model FK `Relationships` (see the `Identity<T>` comment in
  that file) — embedded-select response shapes can't be typed reliably here. Use the
  batch-fetch-and-zip pattern (fetch primary rows, `.in("id", ids)` the related table, zip
  in application code) — see `lib/universities/queries.ts`, `lib/search/index.ts`,
  `lib/ai/student-context.ts`'s `getPendingApplicationRequirements` for examples.
- **Don't move any write to a global reference table (`universities`, `opportunities`,
  `university_requirements`, ...) off the admin client.** These tables have no write
  policy for normal requests by design — RLS will silently reject it, not error loudly.
- **Don't add a new primary nav item without checking `AGENTS.md` Phase 42 first** — the
  current 7-item list is an explicit spec requirement, not an arbitrary choice. The new
  search entry point is deliberately an icon, not a nav item — see `product-decisions.md`.
- **Don't let visual changes remove the "why" text** next to any status badge (evaluation
  reasoning, outlook explanation, admission-outlook strengths/gaps/unknowns, peer-benchmark
  cohort description). These aren't decoration — they're the founder spec's explicit
  "recommendation explainability" and "never false certainty" requirements. Restyle freely,
  but the reasoning text itself needs to survive the redesign somewhere visible.
- **Don't touch the evidence status vocabulary** (`self_reported` → `evidence_added`, never
  automatically `verified`) or the admission-outlook / profile-score / application-readiness
  three-way distinction — these are explicit non-negotiables in `AGENTS.md`.
- **Keep the requirement-evaluation and benchmark badges honest under restyling**: `unknown`
  and `needs_manual_review` are meaningfully different states from `not_met` (see
  `lib/requirements/types.ts`) — a redesign that collapses them into one generic "incomplete"
  visual would lose real information the spec cares about (Phase 68: Oryn should know when
  it doesn't know enough, not just report a flat completion state).

## Recommended UI surfaces for Chat 2 to prioritize

These are functionally complete but deliberately plain — Chat 1 was told not to spend time
on visual design, and it shows most on these three:

1. **`/search`** — currently a bare input + flat result list with a text label per result
   type. A real product would want type-grouped results, keyboard navigation, and probably
   a command-palette-style overlay rather than a dedicated page.
2. **The "Requirement check" section** (`app/(app)/universities/[id]/page.tsx`) — currently
   a plain divided list with a status badge and a line of reasoning per row. This is a good
   candidate for the kind of clear, calm, information-dense treatment the founder spec's
   design philosophy calls for (see AGENTS.md Phase 13/36) — it's one of the more novel,
   differentiating pieces of the product.
3. **Peer benchmark section** (Career Profile page) — currently a plain list of "Nth
   percentile (n=X)" rows. Once real cohort data exists this is a strong visualization
   candidate (a distribution/position indicator, not just text) — but don't build that
   against fabricated data in the meantime; the honest empty state must survive.
4. **The admin requirement-add form** (`features/universities/admin-requirement-form.tsx`)
   — intentionally utilitarian (admin-only, low-traffic). Low priority for Chat 2 relative
   to the student-facing surfaces above.

## Verification

```
npm run typecheck    -> clean
npm run lint          -> clean (0 problems)
npm run test           -> 104/104 passing, 17 files
npm run build           -> succeeds, all routes compile (including new /search)
```

## Git handoff

See the commit this file ships in for the full diff. No secrets in the tree (checked before
commit — `.env*` stays gitignored except `.env.example`). `docs/founder-spec.md` holds the
permanent, tooling-immune copy of the founder's original 80-phase spec — see that file's own
header for why it exists outside `AGENTS.md`.
