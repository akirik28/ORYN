# Phase Status

Tracks build progress against `MASTER_BUILD_PROMPT`'s 80 phases. Updated after each phase
lands. "Done" means real, working code — not a stub. See the final Completion Report
(Phase 80, added at the end of this file) for the full honest accounting.

## Phase 1 — Foundation
**Status: Done**
- Next.js 16 (App Router, TypeScript strict, Tailwind v4), ESLint flat config.
- shadcn/ui (Base UI primitives) with a single indigo accent + neutral palette.
- Domain folder structure: `app/`, `components/`, `features/*`, `lib/*`, `types/`, `supabase/`.
- Full normalized Postgres schema (15 migration files, `supabase/migrations/`), hand-authored
  TypeScript types matching it exactly (`types/database.ts`).
- `lib/env.ts` — typed, optional-by-default access to every integration credential.
- `lib/supabase/{client,server,admin,proxy}.ts`, `lib/security/dal.ts` (verifySession DAL).
- Git repository initialized.

**Assumption recorded:** Next.js 16 renamed `middleware.ts` to `proxy.ts` (functionally
identical). All session-refresh / route-gating code uses the new convention.

**Assumption recorded:** the spec's `courses`/`grades` split and its `leadership_experiences`/
`internships`/`summer_programs` tables are consolidated into `courses` (grade lives on the
course row; GPA lives on `education_records`), `activities` (category + `is_leadership_role`),
and `work_experiences` (`employment_type`), respectively — see comments in
`supabase/migrations/0004_achievements.sql`. This follows the spec's own canonical Phase 58
table list rather than the earlier prose description, and avoids fragmenting one underlying
concept across near-duplicate tables.

## Phase 2 — Auth & user model
**Status: Done**
- Supabase Auth: sign up, sign in, sign out, forgot/reset password, all as Server Actions
  with Zod validation (`app/(auth)/actions.ts`).
- Email confirmation + password recovery both go through `app/auth/confirm/route.ts`
  (server-side OTP verification — the token never reaches client JS).
- `lib/security/dal.ts` is the authoritative per-request auth check (`verifySession`,
  `requireUser`, `requireProfile`); `proxy.ts` only does an optimistic cookie-based
  redirect, per Supabase/Next's documented split of responsibilities.
- `profiles` row is auto-created via a Postgres trigger on `auth.users` insert.

## Phase 6 — Career profile scoring engine
**Status: Done**
- `lib/scoring/math.ts` — shared primitives (score clamping, calendar-accurate month math,
  diminishing-returns aggregation for "reward depth over quantity"), TDD'd first.
- 9 dimension calculators in `lib/scoring/dimensions/*`, each TDD'd against the specific
  behaviors the product spec calls out by name (e.g. leadership: a bare title stays under
  30/100; research: a strong score is reachable with zero publications; execution: an
  unshipped idea scores a fraction of an adopted, shipped project).
- `lib/scoring/completeness.ts` — profile completeness, deliberately independent of
  profile strength (Phase 67).
- `lib/scoring/persist.ts` — recomputes and writes `profile_scores` +
  `profile_score_snapshots` (on meaningful change) + the `profiles` cache columns.
- 32 unit tests across 11 files, all passing (`npm run test`).

**Notable bug fixed during this phase:** every table in `types/database.ts` was silently
resolving to `never` in Supabase's generic type inference. Root cause: `interface`-declared
types don't get TypeScript's implicit index-signature inference the way object type
aliases do, so none of them structurally satisfied `@supabase/postgrest-js`'s
`Record<string, unknown>` constraint on Row/Insert/Update. Fixed once, centrally, with an
`Identity<T>` mapped-type wrapper inside the shared `Table<>` helper — every table gets it
automatically, no per-table changes needed. See the comment above `Identity<T>` in
`types/database.ts` if this ever needs re-diagnosing.

## Phase 3 — Onboarding
**Status: Done**
- 5-screen client wizard (`features/onboarding/onboarding-wizard.tsx`): goals, education,
  interests, target geography, import.
- CV import is real, not a stub: PDF and plain text go to Claude as native document
  content; DOCX is converted via `mammoth` first (`lib/ai/cv-extraction.ts`). Extraction
  always shows a review screen — nothing is saved without the student confirming it.
- Upload always succeeds independently of extraction (a parsing failure never loses the
  file), matching Phase 61's requirement.

## Phase 7/9/10 — Dashboard, Weekly Plan, Reflection
**Status: Done**
- Home (`app/(app)/dashboard/page.tsx`): one dominant story — score ring with monthly
  trend, biggest gap, biggest improvement, top 3 weekly actions, one "don't do this"
  callout, university/opportunity previews. Deliberately not a stats grid.
- Weekly plan generation (`lib/ai/weekly-plan.ts`, `lib/plan/persist.ts`) is idempotent per
  ISO week — revisiting the dashboard mid-week never re-burns an AI call.
- Reflection loop: completing an action prompts "what happened?" inline
  (`features/dashboard/weekly-focus.tsx`), stored on `weekly_actions.reflection_*`.

## Phase 8 — AI Advisor
**Status: Done**
- Shared system prompt (`lib/ai/advisor-prompt.ts`) encodes the demanding-mentor
  behavior — also reused by weekly-plan generation so the "don't inflate activity"
  philosophy is consistent everywhere the AI speaks, not just in chat.
- `lib/ai/student-context.ts` builds the compact context (Phase 8.1) — never dumps the
  raw DB into a prompt.
- Chat UI (`features/advisor/advisor-chat.tsx`) with real multi-turn history persisted to
  `advisor_conversations` / `advisor_messages`.

## Phase 4/5 — Master profile + achievement entry
**Status: Done**
- Full CRUD for 9 achievement types (activities, projects, awards, research,
  volunteering, work experience, education, test scores, certifications) built on one
  generic field-config-driven form (`features/profile/`) instead of nine bespoke forms.
- Every write recomputes the career profile and revalidates Home + Profile.
- Career Profile page: radar chart (gestalt) + precise per-dimension bars (detail) +
  completeness — deliberately two views of the same data, not one or the other.

**Not yet built (Phase 5's AI-assisted refinement):** the "Improve this entry with AI"
enhancement that suggests stronger factual descriptions is not implemented — forms are
solid structured entry today. Noted as a follow-up, not silently skipped.

## Phase 11/12 — Opportunity engine + matching
**Status: Done**
- Full pipeline: Tavily search → Tavily extract → AI structuring
  (`lib/ai/opportunity-extraction.ts`) → dedupe (`lib/opportunities/dedup.ts`, TDD'd) →
  store, triggered via `POST /api/jobs/discover-opportunities`.
- Deterministic per-student matching (`lib/opportunities/matching.ts`, TDD'd) —
  eligibility, relevance, and profile-need are separate, inspectable numbers, not one
  opaque score. Cheap enough (no AI call) to recompute on every `/opportunities` view.
- "Not interested" capture with a reason (Phase 12.1).

## Phase 14-17 — Universities + admission outlook
**Status: Done**
- World-map exploration (`features/universities/world-map-explorer.tsx`,
  react-simple-maps) as the desktop experience; a fully accessible, real-`<Link>`-based
  region grid (`region-grid-explorer.tsx`) as both the mobile experience and the
  keyboard/screen-reader alternative to the (aria-hidden, mouse-only) map.
- College Scorecard provider + sync job (`POST /api/jobs/sync-university-data`) for real
  U.S. institution data. `supabase/seed.sql` provides real, low-risk dev fixtures (name/
  country/city/website only — no invented statistics) so the explorer isn't empty
  in local dev before a sync has run.
- Admission outlook (`lib/admissions/outlook.ts`, TDD'd): a transparent heuristic
  (`admission_model_v1`) combining profile strength with institutional selectivity. The
  optional numeric range is always whole-number, always wide, and confidence is capped at
  "medium" — the non-negotiable "never false precision" requirement is enforced in code,
  not just copy.

## Phase 20-23 — Portfolio, evidence, applications, deadlines
**Status: Mostly done**
- Applications tracker with an auto-generated 8-item requirement checklist per
  application and a readiness percentage (`lib/applications/readiness.ts`) — explicitly
  not an admissions-probability signal.
- Evidence upload, centralized on a Documents page rather than built into every
  achievement form individually (pragmatic scope decision): upload validates the target
  achievement is actually owned by the caller before attaching, stores privately, issues
  short-lived signed URLs, and moves `evidence_status` to `evidence_added` — never
  `verified`.
- **Not built:** a dedicated read-only Portfolio showcase view, and a unified
  cross-source Deadline Engine widget (deadlines currently live per-feature — on
  applications and, via the advisor context, on the dashboard — rather than one
  consolidated view).

## Cross-cutting: security, secrets, provider health
**Status: Done**
- Full RLS audit: every `create table` across all 17 migration files
  cross-checked against every RLS policy. **Found a real gap** —
  `profile_scores`/`profile_score_snapshots` had no RLS policy at all (created in
  `0009_scoring.sql`, never picked up by the original `0014_row_level_security.sql`
  table lists), which would have made every student's scores readable by any
  authenticated request. Fixed in `0017_fix_missing_score_rls.sql`. See SECURITY.md for
  the verification method, so this can be re-run after future schema changes.
- Secret-scan of the full source tree for hardcoded API keys: clean.
- `npm run check:integrations` makes a real, minimal call to every provider and reports
  OK / Missing credential / Error — not just an env-var presence check (this is what the
  build spec explicitly asked for, having previously been burned by integrations that
  looked configured but didn't actually work).
- Settings page: account info, data export (`GET /api/export-data`), and account
  deletion (admin-client `auth.admin.deleteUser`, cascades through every table).

**Second real bug found during final QA — `npm run build` failed outright.** Every
auth-gated page called `requireUser()`, which throws a "Supabase not configured" error
*before* the `cookies()` call that would normally signal Next.js to skip static
prerendering and render the route dynamically instead. Next attempted to statically
prerender these pages at build time anyway, hit the throw, and failed the entire build —
meaning the app couldn't have been deployed at all in any environment without
pre-existing Supabase credentials. Fixed by marking all three gated route groups
`export const dynamic = "force-dynamic"` (correct regardless of the credential issue,
since every route under them is genuinely per-user and was never a static-prerendering
candidate). `npm run build` now succeeds cleanly. This is exactly why Phase 78's "run the
real build before calling anything done" matters — lint/typecheck/tests all passed
throughout and none of them would have caught this.

## Continuation pass — remaining gaps closed

Everything listed as "not built this pass" above was subsequently built:

- **Notifications** (Phase 24): system-generated only (no client insert policy, matches
  the RLS design), triggered on weekly-plan-ready and deadline reminders. Bell in both
  desktop sidebar and mobile header, unread badge, mark-read/mark-all-read.
- **Deadline reminder job** (Phase 30 Job B): scheduled scan of application deadlines at
  14/7/3/1 days out, deduped against recently-sent notifications. Dashboard gained a "Due
  soon" feed sourced from the same data.
- **Admin panel** (Phase 51): `/admin`, gated by `profiles.is_admin`, 404s (not
  redirects) for non-admins so its existence isn't revealed. Provider health, job run
  history, AI usage by feature, and manual "run now" triggers for all three background
  jobs — calling the job logic directly rather than round-tripping through HTTP with the
  cron secret.
- **Rate limiting** on every AI-backed action (`lib/ai/rate-limit.ts`): a sliding window
  sourced from the `ai_usage` log itself, so it can't drift out of sync with what's
  actually being billed.
- **Portfolio** (Phase 20): `/profile/portfolio`, timeline and by-category views across
  all 9 achievement types.
- **AI-assisted achievement refinement** (Phase 5): "Improve this entry with AI" on any
  achievement form with a description field — rewrites use only facts already provided
  (never invents numbers) and asks clarifying questions for missing high-value context,
  matching the spec's own worked example almost exactly.
- **OpenAlex + research-project generator** (Phase 10/13): grounds up to 3 AI-generated
  project ideas in real current literature (`lib/providers/openalex.ts`'s live search
  results), with an explicit system-prompt rule against proposing anything a high
  schooler couldn't actually complete with public data.

**Third real bug found — and this is why `npm run build` has to be the last step every
time, not lint/typecheck/test.** `lib/portfolio/build.ts` was `server-only` (it queries
Supabase) but also exported the `PortfolioItem` type and a `PORTFOLIO_CATEGORY_LABELS`
constant that the Portfolio page's Client Component needed. Importing *anything* from a
server-only module — even just a type — pulls the whole module into the client bundle
graph, and the build fails outright. `lint` and `typecheck` both have no way to catch
this (it's a bundler-graph constraint, not a type error); only an actual `next build`
does. Fixed by splitting client-safe types/constants into `lib/portfolio/types.ts` and
keeping only the Supabase-querying function in `build.ts`. Same underlying lesson as the
`Identity<T>` and `force-dynamic` findings earlier in this file: verify with the real
tool, not the one that's easiest to run.

Genuinely remaining (see README.md "Known limitations"): a unified cross-source Deadline
Engine (today, deadlines are per-application, not also pulling in saved-opportunity and
university-program deadlines), rate limiting beyond AI-backed actions, and professional
legal review of minor-safe/privacy claims.

## Branding pass — product named "Oryn"

The product was named (was "Career AI" throughout code, docs, and metadata). Renamed
end-to-end: every UI string, AI system-prompt reference, `package.json` name, the
`.claude/launch.json` dev-server label, and the data-export filename. Verified with a
repo-wide grep for the old name (including case variants) after the pass — zero hits
outside `package-lock.json`, which `npm install` resynced automatically.

The user supplied a logo (`ORYN Logo/*.png` — a flattened raster, no source vectors or
layers). Built a small pipeline (`public/brand/`) rather than hand-placing the raw file:
matte out the near-white canvas into real alpha transparency (color-difference matting
against the sampled background, not a hard threshold, so anti-aliased edges stay clean),
trim to content bounds, and split the combined icon+wordmark into two assets — a full
lockup for navigation (`logo-full.png`) and an icon-only crop for `app/icon.png` /
`app/apple-icon.png` (favicon and iOS home-screen icon; the apple variant gets an opaque
white backing since iOS renders alpha in touch icons unpredictably). Replaced every
plain-text "Oryn" in nav chrome (landing header, app sidebar, mobile nav + its sheet
title, auth layout, onboarding layout) with the lockup image.

Sampled the logo's ink color (`#3A19FD`) and converted it to OKLCH to become the site's
accent hue (272°, was 264° — a generic indigo picked in Phase 1 before there was a logo
to match). Every `primary`/`ring`/`accent-foreground`/`chart-1`/`sidebar-*` token in
`app/globals.css`, in both light and dark mode, was re-derived at the new hue with the
chroma pushed as close to the logo's actual vividness as sRGB gamut allows at each
token's lightness (checked numerically — OKLCH → linear sRGB round-trip per candidate
value — rather than by eye, since a couple of the higher-lightness dark-mode tokens do
clip out of gamut at high chroma and silently get clamped by the browser if you don't
check). Added a `--brand` token holding the true, uncompromised logo color
(`oklch(0.477 0.29 272)`) for one-off decorative use (currently the landing page's hero
glow) where full vividness matters more than the safety margin baked into the reusable
UI tokens.

**Fourth thing worth recording, not a code bug this time:** partway through this pass the
project's root folder was renamed on disk (`Kariyer ai` → `ORYN`) by the user while work
was in progress. Absolute-path shell commands issued against the old path kept
succeeding for a while (already-resolved strings, cached in a still-open shell) before
failing outright once something re-resolved the path fresh. Recovered by verifying both
candidate paths directly (`ls` on each) rather than guessing from the error text, and by
re-grepping the whole tree post-move to confirm no in-flight edit had been silently lost
in the rename. Nothing was lost — same inode-level move, not a copy — but it's a reminder
that a long-running session shouldn't trust a path string it resolved several tool calls
ago without re-checking, especially right after a request that plausibly triggers the
user to go rename things in Finder themselves (as "the system's name will be Oryn" did
here).

## Unified cross-source Deadline Engine

The last genuinely-missing gap from the earlier "Known limitations" list. Previously
`getUpcomingDeadlines` (dashboard "Due soon") and `scanApplicationDeadlines` (the
reminder job) only looked at `applications.deadline`. Both now merge three sources:

- **Applications** — unchanged, except it now also filters to active statuses
  (`not_started`/`in_progress`/`submitted`/`under_review`), matching what the reminder
  job already did; previously the read-side widget would show a deadline for an
  application the student had already withdrawn from or heard back on.
- **Saved opportunities** — `saved_opportunities` rows with `status = 'saved'`, joined to
  `opportunities.deadline`. Opportunities marked `not_interested` or already `applied`
  don't need a countdown.
- **Target-university program deadlines** — `university_deadlines`, scoped to
  universities the student has actively targeted (`exploring`/`target`/`applying`, not
  `applied`/`accepted`/`rejected`/`withdrawn`/`waitlisted`). A university-level deadline
  (`program_id` null) always applies; a program-specific one only surfaces once the
  student has actually targeted that exact program — otherwise there's no way to know
  which of a university's programs it belongs to, and showing all of them would be noise,
  not signal.

`lib/deadlines/scan.ts`'s three source-specific scans share one
`notifyIfThresholdCrossed` helper (threshold check + dedup + `createNotification` call)
instead of duplicating that logic three times. `scanApplicationDeadlines` was renamed to
`scanDeadlines` (both call sites — the cron route and the admin panel's manual trigger —
updated); its return shape (`{ notified, checked }`) is unchanged, now aggregated across
all three sources. `getUpcomingDeadlines` gained a `source` field
(`"application" | "opportunity" | "university"`) so the dashboard widget can show a
distinct icon per kind instead of one generic clock.

Confirmed `university_deadlines` and `opportunities` both carry the "authenticated read"
RLS policy (`supabase/migrations/0014_row_level_security.sql`'s public-reference-data
loop) before relying on the user-scoped client to read them — the failure mode for
getting this wrong is silent (RLS default-denies, the query just returns empty rows, no
error), so it's worth checking against the migration rather than assuming.

## Rate limiting beyond AI actions

Scoped deliberately rather than blanket-wrapping every Server Action in the app (dozens
of files, mostly ordinary CRUD against RLS-scoped rows the caller already owns — low
abuse value for the churn). Added `lib/security/rate-limit.ts`, the same sliding-window
approach as `lib/ai/rate-limit.ts` generalized: since there's no pre-existing usage log
to piggyback on for non-AI actions (unlike `ai_usage`, which every AI call already writes
for cost tracking), this version records its own events in a new `rate_limit_events`
table (migration `0018_rate_limit_events.sql`) — select and insert RLS policies scoped to
`user_id = auth.uid()`, deliberately *no* update/delete policy, since a user who could
delete their own rows here could reset their own throttle.

Applied it to the one clear remaining abuse target: `/api/export-data` (a full-account
JSON dump, previously callable with no limit at all), 5 calls/hour. Everything else —
ordinary field edits, achievement CRUD — stays covered by RLS ownership checks and
Supabase's own infrastructure limits rather than an explicit per-action cap; README and
SECURITY.md both describe this narrower, honest scope rather than claiming the gap is
fully closed.

## Fifth bug: the master spec itself went missing from AGENTS.md

Not a code bug — a data-loss incident, caught while auditing remaining phases. AGENTS.md
had shrunk to just the auto-generated Next.js block; the actual 80-phase founder prompt
that `README.md`/`PRODUCT_SPEC.md` both point to as authoritative was gone, almost
certainly overwritten when `next dev` regenerated the file (it only manages its own
block, and apparently doesn't preserve content appended below it) around the same time as
the `Kariyer ai` → `ORYN` folder rename. Recovered verbatim from the prior session's own
transcript (still on disk under `~/.claude/projects/`, unaffected by the project-folder
rename since it lives outside the repo) and re-appended, with the product-name mentions
inside it updated to "Oryn" for consistency with everything else. Lesson for next time:
this file is load-bearing and un-backed-up outside git — and nothing in this repo is
committed to git yet — so it was one `next dev` regeneration away from being permanently
gone. Worth an early commit once the user's ready for one.

## Phase audit against the recovered spec

With the full phase list back, went through it looking for phases that were silently thin
or missing — not just the ones already tracked as known gaps. Found three real ones:

- **Phases 64/65 (time budget, busy mode) were half-wired.** The schema
  (`profiles.weekly_time_budget`, `busy_mode`, `busy_mode_until`) existed, and
  `lib/ai/student-context.ts` already read both into the advisor's prompt — but *nothing
  in the entire codebase ever wrote to `weekly_time_budget`*, and `updateBusyMode` was a
  server action called from zero components. A student could never actually set either
  field, which quietly defeats the spec's explicit "don't recommend 15 hours to a student
  with 3 free hours" requirement — the AI would always see `null`/`false`. Added a "Study
  capacity" section to Settings (`features/settings/capacity-form.tsx`) that actually
  calls both.
- **Phase 66 (goal system) had no UI at all.** `career_goals` only ever got written once,
  during onboarding's "what are you working toward" screen — there was no way to view,
  add, edit, or resolve a goal afterward, even though the schema (`priority`, `status`)
  and the advisor context (`lib/ai/student-context.ts` already includes goal titles in the
  prompt) were both built for full lifecycle management. Added Goals as a tenth
  `AchievementSection` instance on the Profile page (`GOAL_FIELDS` in `field-config.ts`,
  `createGoal`/`updateGoal`/`deleteGoal` in `profile/actions.ts`) — reused the existing
  generic CRUD-form component rather than building a new one.
- **Phase 63 (recommendation history) turned out already correct** — worth recording as a
  negative result, not just gaps. `recentRecommendationTitles` was already in the advisor
  context with an explicit "don't repeat these" instruction. No action needed; audited and
  confirmed rather than assumed.
- **Phase 40 (monthly review) didn't exist.** Built `/profile/history`
  (`lib/scoring/monthly-review.ts` + the page): overall and per-dimension score deltas
  against the most recent snapshot at least 30 days old, plus recently-completed project
  and application counts. Deliberately not AI-generated — Phase 27 says not to spend
  model budget where arithmetic already answers the question, and the deltas are
  self-explanatory numbers. Honest empty state ("not enough history yet") when no snapshot
  is old enough, rather than fabricating a trend from one data point.

**Genuinely still not built** (auditing turned these up too; scoped deliberately out of
this pass rather than half-built — noting them honestly instead of leaving them
undocumented):

- **Phase 19 (peer benchmarking).** Cohort comparison against other students with a
  minimum-n=100 threshold before showing anything. Pre-launch, every cohort is `n=0` — the
  correct behavior (the spec's own "Not enough comparable [Oryn] users yet" state) would
  be the *only* state anyone ever sees until the product has real scale, so building the
  comparison math now has no way to be exercised or verified. Worth building once there's
  actual user data to compare against, not before.
- **Phase 69 (university requirement check).** A per-target-program checklist
  ("Mathematics requirement: met/unknown", etc.) that checks the student's actual profile
  against that program's published requirements. `university_requirements` exists as a
  table but isn't populated by the College Scorecard sync (it doesn't provide
  requirement-level data in that shape) and matching a student's coursework against
  arbitrary program requirements is a real rules engine, not a display feature — needs its
  own scoped pass, not a shallow version bolted on here.
- **Phase 52 (analytics events).** No product-event log (`onboarding_completed`,
  `opportunity_saved`, etc.) exists yet. Bounded and low-risk to add (same pattern as
  `ai_usage`/`rate_limit_events` — an insert-only table plus call sites), but is
  internal instrumentation with no user-visible payoff, so it lost priority against
  features a student actually sees this pass.
- **Phase 25 (global search).** Explicitly soft in the spec itself ("implement cleanly if
  practical during V1") — not attempted.

## Phase 52 — product analytics events

Closed after the audit above. `product_events` (migration `0019_product_events.sql`) —
RLS enabled with *zero* policies, so even the owning student can't read their own rows
through the regular client; writes go exclusively through the admin client
(`lib/analytics/log.ts`'s `logEvent`), matching `notifications`' existing
"system-generated only" posture rather than `rate_limit_events`' owner-read/write one.
Deliberately left out of `/api/export-data`, consistent with how `ai_usage` and
`notifications` are already excluded — this is behavioral telemetry, not profile content.

Wired all ten events the spec names by name, at the point each already succeeds:
`onboarding_completed` and `cv_imported` (onboarding actions), `profile_item_added` (one
call site — inside the shared `crudCreate` helper in `profile/actions.ts`, so it covers
all nine achievement types plus Goals for free instead of ten separate call sites),
`research_project_started` (saving an AI-generated research idea — fires *in addition to*
`profile_item_added`, since it goes through the same `crudCreate` path; that's intentional
double-signal, not a bug), `target_university_added`, `opportunity_saved` /
`opportunity_applied` (one status-update function, branches on the new status),
`advisor_message_sent`, `weekly_action_completed` (only on the transition to
`completed`, not every status change), and `application_updated`.

`logEvent` swallows its own errors (network issue, or — like this sandbox — no
`SUPABASE_SECRET_KEY` configured at all) and never throws, so a logging failure can never
break the user-facing action it's attached to; every call site `await`s it rather than
firing-and-forgetting, since an unawaited promise in a serverless Server Action can get
cut off before it completes once the response is sent — correctness over shaving a few
milliseconds of latency on a lightweight insert.

## Chat 1 — functional completion pass

A second Claude session (per this build's own three-stage protocol — see
`docs/chat-1-handoff.md` for the full contract with the sessions that follow it) re-audited
the repository rather than trusting this file, then closed the three gaps the prior pass had
explicitly and honestly left open, plus found and fixed one real bug along the way.

**Phase 69 — per-program requirement checklist.** `lib/requirements/` (`types.ts`,
`evaluate.ts` — pure, unit-tested — `facts.ts`, `persist.ts`) plus
`lib/ai/interpret-requirement.ts`. Extends `university_requirements` (Phase 35's existing
canonical entity) rather than forking it into a parallel table — see `DATABASE.md` for the
full reasoning. Five evaluation statuses (met/likely_met/not_met/unknown/
needs_manual_review), always deterministic — the AI's only role is turning an admin-pasted,
already-sourced requirement description into a structured comparison rule, reviewed by the
admin before saving, never invented or auto-published. Categories with no evaluable shape
(essay, recommendation, interview, portfolio, supplemental, international) always resolve
to `needs_manual_review`, honestly, rather than guessing. Student-facing: a "Requirement
check" section on the university detail page, grouped university-wide vs. per-program, each
row showing a status badge, plain-language reasoning, and the source link. Admin-facing: an
inline form on the same page (gated by `requireAdmin()`, independently re-checked in every
Server Action) to add a sourced requirement, with an "AI: suggest structured rule" button
that only structures text the admin already pasted. No automated ingestion crawler yet —
see `docs/known-issues.md`.

**Phase 19 — peer benchmarking.** `lib/benchmarking/` (`types.ts`, `compute.ts` — pure,
unit-tested — `cohort.ts`, `index.ts`). Cohort = graduation year + curriculum (additive
filter, designed so a third dimension can be added later without touching callers). Gated
at ≥100 peers *with a score for that specific dimension*, not just ≥100 peers sharing the
cohort attributes — slightly stricter than the spec's literal wording, in the direction its
own "never a small-sample percentile" principle clearly favors. `cohort.ts` is the one place
in the codebase that deliberately reads across many users' `profile_scores` at once (via the
admin client — RLS is owner-only, and a percentile can't be computed without looking past
one user's own rows); its return shape (`Map<dimension, number[]>`, no peer id ever
attached) makes it structurally impossible for a caller to re-identify a peer from the
result. Shown on the Career Profile page. Pre-launch every cohort is genuinely `n=0` — the
honest empty state is what renders today, which is correct, not a stub.

**Phase 25 — global search.** `lib/search/` (`types.ts`, `rank.ts` — pure, unit-tested —
`index.ts`) and `/search`. Fans one query out in parallel across universities, programs,
opportunities, all nine achievement-shaped profile tables, goals, and applications (the last
one has no title of its own — resolved via the same batch-fetch-and-zip pattern used
elsewhere in this codebase, not a nested embed). Reachable via a search icon added next to
the notification bell in both headers — not a new primary nav item, since `AGENTS.md` Phase
42 explicitly enumerates the current 7-item nav as a spec requirement, not an arbitrary
choice.

**AI Advisor context audit.** Read every context-assembly and prompt file against the
operating brief's explicit checklist (age/stage, evidence confidence, active projects,
deadlines, time budget, previous outcomes, ...) instead of assuming the existing
implementation covered it. Found and closed real, concrete gaps in
`lib/ai/student-context.ts`:
- Achievement entries never carried evidence status or ongoing/unfinished status — the
  advisor couldn't distinguish a self-reported claim from a stronger one, or tell an active
  project from a finished one, despite the system prompt explicitly instructing it to use
  existing unfinished work before proposing something new.
- `upcomingDeadlines` was a bespoke applications-only query — narrower than what the
  dashboard itself shows a student (the "Due soon" widget already merges applications,
  saved opportunities, and target-university program deadlines via
  `lib/deadlines/upcoming.ts`). The advisor could genuinely miss a deadline the student can
  already see on their own dashboard. Fixed by reusing the existing unified source instead
  of a second, narrower one.
- **`recentRecommendationTitles` only ever covered "avoid_for_now" suggestions** —
  `ai_recommendations` is written *only* for that one case (see `lib/plan/persist.ts`), never
  for the actual do/consider weekly actions that make up the bulk of what's recommended, and
  its `user_response`/`feedback` columns are never updated anywhere in the codebase. The real
  outcome signal (Phase 10's reflection loop) lives on `weekly_actions.status` +
  `reflection_outcome` + `reflection_note` and was never being read back into the advisor's
  context at all — so despite the reflection loop capturing real student feedback, none of
  it was actually improving future advice, contradicting Phase 10's own stated purpose.
  Added `recentActionOutcomes` (last 10 completed/skipped/expired actions with their
  reflection) to the context, and a new system-prompt rule instructing the model to
  acknowledge and learn from them rather than re-suggesting something recently skipped or
  that didn't work.
- Added unfinished `application_requirements` items (essay/recommendation/... still
  outstanding on an active application) so the advisor can point at a concrete near-term
  task, not just reason at the profile-dimension level.

**Real bug found and fixed: `ai_usage` was silently never being written.**
`lib/ai/usage.ts`'s `logAIUsage` inserted through the RLS-scoped request client, but that
table's RLS policy (`0014_row_level_security.sql`) is deliberately select-only ("never
write directly") — every insert failed, caught by the function's own try/catch, which only
ever logged a console warning. Two real consequences: `ai_usage` (and therefore the admin
panel's "AI usage" section) was always empty, and `lib/ai/rate-limit.ts`'s sliding window —
sourced from that same table — never had anything to count, so **the AI rate limiter has
not actually been throttling anyone**, despite `SECURITY.md` describing it as active. Fixed
by switching to the admin client, matching `lib/analytics/log.ts`'s already-correct pattern
for `product_events`. Recommend a live smoke test once real credentials exist: send an
advisor message, confirm `ai_usage` gains a row.

**RLS re-audit.** Re-ran the full cross-check (every `create table` against every RLS
policy) across all 43 tables, not just the new one — SECURITY.md documents the method and
result. No further gaps found; `student_requirement_evaluations` was given its owner-only
policy in the same migration that creates it, not as a follow-up fix, specifically to avoid
repeating the `profile_scores` mistake this file already documents from an earlier pass.

**Database index audit.** Every foreign-key column across all 22 migrations checked against
index coverage (a reusable verification script is now in `DATABASE.md`) — Postgres never
auto-indexes the referencing side of a FK, so an un-indexed one means both a sequential scan
on direct queries and, easy to miss, a sequential scan on the child table every time a
parent row is deleted. Found and closed 9 real gaps in `0022_missing_fk_indexes.sql`.

**Incident: `README.md` was found reduced to a one-line stub (`# ORYN`) partway through this
pass**, with the repository unexpectedly carrying real git history (`origin` →
`github.com/akirik28/ORYN.git`, two prior commits) that hadn't been there earlier in the
same session — almost certainly the user connecting the local project to a fresh GitHub
repository between turns (this build has form here — see the "root folder renamed on disk"
incident earlier in this file). Investigated before touching anything (per this repo's own
"investigate, don't guess" discipline): confirmed via `git log`/`git ls-tree` that every
other file in the new commit matched this session's own advanced state (including files
created earlier in this very pass), and that README.md was the *only* file affected — a
targeted scan of every committed file under 5 lines turned up nothing else anomalous.
Restored from this conversation's own earlier tool output (the original was read in full
before any edits happened) rather than guessing at a reconstruction, then updated in place
for this pass's new features. Nothing was lost, but — same lesson as the AGENTS.md
founder-spec incident — worth committing promptly once content is known-good, rather than
leaving a long stretch of valuable, unrecoverable-if-overwritten content sitting only in an
editor's undo history or a conversation transcript.

**Verification**: `npm run typecheck` / `npm run lint` clean; `npm run test` 104/104
passing (17 files, up from 57/14 — added coverage for requirement evaluation, benchmark
computation, and search ranking); `npm run build` succeeds, all routes compile including the
new `/search`. `npm run check:integrations`: OpenAlex OK (keyless), Supabase/Anthropic/
Tavily/College Scorecard all correctly report "Missing credential" in this sandbox — no
credentials are configured in this environment, which is the honest, correct degraded
state, not a bug.

See `docs/chat-1-handoff.md` for the full handoff to the next session, `docs/known-issues.md`
for the current honest gap list, and `docs/product-decisions.md` for the reasoning behind
this pass's schema and scope choices.

### Follow-up within the same pass: automated requirement discovery

The section above initially scoped the Phase 69 ingestion crawler out as a "real, scoped
next phase." Reconsidered against this build's own stopping rule (keep going until what's
left is an external blocker, legal review, or explicitly Chat 2/Chat 3 territory — an
ingestion job is none of those) and built it before ending the session instead of leaving it
as a documented gap.

`lib/ai/requirement-extraction.ts`: one AI call per source page returns every distinct
requirement it states, with an *optional* inline structured rule — deliberately not a
second AI call per requirement (unlike the admin-form path,
`lib/ai/interpret-requirement.ts`, which structures one already-reviewed requirement at a
time). A background job fanning out to up to 20 structuring calls per page would be slow
and expensive; a lower inline hit-rate is safe because `lib/requirements/evaluate.ts`
already treats a missing or malformed rule as an honest `needs_manual_review`, never a wrong
answer — cost-cutting here doesn't trade away correctness, only completeness.

`lib/requirements/discover.ts`: Tavily search → extract → dedupe
(`lib/requirements/dedup.ts`, unit-tested, reuses `lib/opportunities/dedup.ts`'s
title-similarity function rather than reimplementing fuzzy matching) → store via the admin
client. `getUniversitiesNeedingRequirementDiscovery` targets universities with zero
existing `university_requirements` rows, bounded to 5 per run by default — a university
already covered is left alone (no freshness re-check built yet). University-wide only, not
per-program: reliably attributing a found page to one specific program needs more targeted
per-program queries than a university-name search provides, and guessing would risk
attaching a requirement to the wrong program.

One safety detail worth keeping: an extracted `structuredRule` is only trusted when its
`kind` actually matches the category's expected shape (`categoryToRuleKind`) — a mismatch
(the model attached, say, a `coursework` rule to a `minimum_grade` requirement) is dropped
to `null` rather than stored, so a confused extraction degrades to
`needs_manual_review` instead of producing a wrong automatic evaluation.

Wired up exactly like the existing jobs: `POST /api/jobs/discover-requirements`
(`CRON_SECRET`-protected), an admin panel "Run requirement discovery" button, tracked via
`external_sync_jobs` like every other job. `npm run test` now at 108/108 (4 more for the
dedup module); `npm run build` still succeeds with the new route.

## Chat 2 — World-Class UI/UX/Brand/Interaction Design pass

Full design system (brand token ramp, Newsreader/Geist typography split, motion,
`components/oryn/*` primitives) applied across every major surface — Home dashboard, app
shell, landing/auth, onboarding, university exploration, profile, advisor, opportunities,
plan/applications (new acceptance-moment celebration), and a rebuilt command-palette
global search. Also shipped mid-pass at the founder's direction: a narrow V1 social scope
(shareable profiles, mutual-consent connections, migration `0023_social_v1.sql`). Full
detail, design-decision reasoning, and an honest per-surface account of what was and
wasn't live-verified (this sandbox still has no Docker/Supabase) in
`docs/chat-2-handoff.md` and `docs/design-system.md`. `npm run lint`/`typecheck`/`test`
(108/108)/`build` all clean at the end of this pass.

## Chat 3 — Adversarial security audit

Picked up mid-fix: a prior Chat 3 session had found a real privacy vulnerability in
`public_profiles` (the V1 social feature's connection carve-out matched any connection
status, not just accepted) and started `0024_fix_connection_privacy_leak.sql` before
running out of session budget. This pass verified, completed, and — for the first time in
this product's history — **live-tested** that fix and the surrounding schema, using
Supabase MCP access to create a disposable scratch project rather than continuing the
review-by-hand-only pattern every prior session was limited to.

**The privacy fix, completed and hardened.** The in-progress fix restricted the carve-out
to `status = 'accepted'` only, which is safe but breaks a real case (a recipient can't see
who's asking to connect before responding). Shipped version keeps a `pending` clause but
makes it direction-aware — only the recipient of a pending request sees the requester,
never the reverse — closing the original hole (a cold request letting the *requester* see
a private target) while preserving the legitimate UX. `sendConnectionRequest` also
independently re-verifies the recipient is public server-side (a Server Action is callable
with any argument, regardless of what the UI shows).

**A second, independent, more fundamental bug found by the live run.** `0023_social_v1.sql`
itself had never successfully applied to any real Postgres database, ever — its
`public_profiles` view referenced the `connections` table before that file created it,
which fails immediately (`CREATE VIEW` resolves dependencies at creation time) and rolls
back the entire migration transaction. Every session before this one had documented "not
run against a live Postgres" as an honest limitation; none had discovered it was actually
a hard blocker, not just an unverified claim. Fixed by reordering the migration in place —
justified as a rare, deliberate exception to this repo's own "never rewrite a past
migration" discipline, since a migration that never once successfully ran has no live
schema history to diverge from. See `docs/product-decisions.md`'s "Chat 3 pass" section
for the full reasoning on both calls.

**Live verification methodology.** Created a scratch Supabase project (pausing an
unrelated existing project to stay under the account's free-tier limit, with the
founder's explicit approval at each step), applied all 25 migrations, and:
- Queried `public_profiles` under six simulated identities covering every cell of the
  privacy invariant matrix (private+no-connection, private+pending both directions,
  private+declined, private+accepted, public+no-connection, plus a direct non-view
  `profiles` read) — all eight assertions matched intent, including the two that matter
  most (the original attack shape stays blocked; the "declined kept the leak forever" bug
  is fixed).
- Confirmed all 44 `public`-schema tables have RLS enabled (up from 43 — `connections` was
  never added to that count; corrected in `DATABASE.md`/`SECURITY.md`).
- Confirmed storage RLS genuinely blocks a cross-user `evidence` object read, so
  `getSignedEvidenceUrl`'s raw caller-supplied path is safe despite no explicit ownership
  check in the Server Action itself.
- Confirmed the AI rate limiter (fixed in Chat 1, never live-tested before now) actually
  reads back what it writes, and that `ai_usage` RLS isolates users from each other.
- Ran Supabase's security/performance advisors against the live schema: fixed a mutable
  `search_path` on `set_updated_at()` (`0025_function_search_path_hardening.sql`);
  investigated and deliberately left open a `handle_new_user` grant warning (proven
  non-exploitable live, but no live GoTrue available to verify a fix wouldn't break
  signups); logged a real, pervasive, pre-existing RLS performance pattern (40 policies
  using `auth.uid()` instead of `(select auth.uid())`) as a scoped-out follow-up, not
  attempted this pass.

A manual SQL reproduction of the exact live-verified query matrix is saved in
`supabase/tests/connection_privacy_manual.sql` for re-running after any future change to
this view — the invariant has now broken twice in different ways, so "reads correctly" is
not being trusted as sufficient for this specific file going forward.

**Wider adversarial pass**, using the founder's own re-verification checklist plus a
background research pass over AI Advisor quality and international-student handling.
Real, concrete findings, all fixed:
- **False-precision cross-scale GPA comparison** in `lib/requirements/evaluate.ts` — a
  linear ratio doesn't validly convert between grading systems (e.g. Turkish 100-point to
  US 4.0), and this module was doing exactly that while a sibling module
  (`lib/scoring/dimensions/academics.ts`) already explicitly refuses to. Now only compares
  GPAs already on the requirement's own scale; anything else is `needs_manual_review`
  rather than a confident guess.
- **No prompt-injection framing** on scraped page content fed to Claude in
  `lib/ai/opportunity-extraction.ts` / `lib/ai/requirement-extraction.ts` — content was
  concatenated after a bare label with no delimiter and no untrusted-data instruction.
  Both now wrap content in `<page_content>` tags with an explicit system-prompt
  instruction not to follow anything inside it.
- **Global search silently returned empty results on a real backend failure**, not just a
  genuine no-match — every `lib/search/index.ts` helper discarded Supabase's `error`
  return value, so only a thrown exception (not the far more common error-object failure)
  ever reached the command palette's error state. Now throws on a real query error.
- **Application status control had no rollback or error message on a failed save** — the
  UI updated optimistically and never checked the result. Fixed with rollback + a `sonner`
  toast (the app's `<Toaster/>` was already mounted globally but had zero real call sites
  before this).
- **`ai_recommendations`' "don't repeat this" query had no class filter**, relying on it
  being the only class ever written to that table — added the explicit filter so the code
  matches its own label instead of an unstated invariant.
- **Advisor context knew "busy mode" was on but never when it ends** — `busy_mode_until`
  is now read into the prompt.
- Everything else on the founder's checklist (AI advisor opportunity-cost reasoning, time
  budget respect, unfinished-work preference, deadline urgency, curriculum-neutral
  scoring, no hardcoded-US-student assumptions, the `Progress` hydration fix, the
  dashboard opportunity preview, `updateApplicationStatus`'s persistence) checked out —
  see `docs/known-issues.md` for the one remaining scoped-out gap this surfaced
  (`target_geography` is collected but never read back into matching/outlook logic).

**Verification**: `npm run lint` / `typecheck` clean; `npm run test` 113/113 passing (19
files, up from 108/18 — added `__tests__/validation/uuid.test.ts` and two `evaluate.test.ts`
cases replacing the one that encoded the now-fixed cross-scale-conversion behavior);
`npm run build` succeeds, all routes compile; `npm run check:integrations` unchanged
(OpenAlex OK, everything else correctly reports "Missing credential" — no app credentials
configured in this sandbox, separate from the Supabase MCP access used for live-verification
above). Full detail in `docs/final-product-audit.md`.
