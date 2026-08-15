# Security

Oryn's primary users may be minors (roughly 14-18). This document describes what's
actually implemented, and is explicit about what still needs professional legal review
before a public launch — see "Known gaps" at the end.

## Row Level Security

Every one of the 43 tables in `supabase/migrations/` has Row Level Security enabled.
There are three patterns, applied in `supabase/migrations/0014_row_level_security.sql`
and `0017_fix_missing_score_rls.sql`:

1. **Owner-only** (`user_id = auth.uid()`, full CRUD): every table holding private
   student data — achievements, evidence, goals, applications, weekly plans, advisor
   conversations, AI usage, and both scoring tables.
2. **Global read-only** (`to authenticated using (true)`, no write policy): universities,
   opportunities, and their related reference tables. Writes only happen via the
   service-role client (background jobs / admin routes) — no policy grants a normal
   request write access, which blocks it by default.
3. **No policy at all**: `provider_health` and `external_sync_jobs` (ops-only tables).
   RLS enabled with zero policies blocks every role except `service_role`, which bypasses
   RLS entirely.

**How this gets verified, not just asserted:** every `create table` across all migration
files was cross-checked against every table covered by an RLS policy (a plain shell diff,
not a manual eyeball) while writing this document. That check caught a real gap —
`profile_scores` and `profile_score_snapshots` had been created in `0009_scoring.sql` but
never picked up by the original RLS migration's table lists, which would have made every
student's dimension scores readable (and writable) by any authenticated request. Fixed in
`0017_fix_missing_score_rls.sql`. If you add a new table, re-run this check:

```bash
grep -h "^create table public\." supabase/migrations/*.sql | sed -E 's/create table public\.([a-z_]+).*/\1/' | sort
```

...and confirm every name appears in a policy somewhere in `0014_row_level_security.sql`
or a later migration.

**Re-run in this session** across all 43 tables (up from 40 — `rate_limit_events`,
`product_events`, and the new `student_requirement_evaluations`). No further gaps found;
the new table is owner-only (`user_id = auth.uid()`, full CRUD), added in the same
migration that creates it (`0020_requirement_evaluation.sql`) rather than as a follow-up
fix, to avoid repeating the `profile_scores` mistake this section already documents.

A parallel gap, same root cause but on the *write* side rather than RLS-policy coverage:
`lib/ai/usage.ts`'s `logAIUsage` was inserting into `ai_usage` through the RLS-scoped
request client, but that table's policy is deliberately select-only (see above) — every
insert was silently failing (caught by the function's own try/catch, which only logs a
console warning). Two real consequences: `ai_usage` was never actually populated, and
`lib/ai/rate-limit.ts`'s sliding window — sourced from that same table — had nothing to
count, so **the AI rate limiter has not been functioning** despite this document
previously describing it as active. Fixed by switching `logAIUsage` to the admin client,
matching `lib/analytics/log.ts`'s `logEvent` (which already did this correctly for
`product_events`). Worth specifically re-verifying after this fix ships to a real
environment — check `ai_usage` actually gains rows after an advisor chat message.

## Secrets

- `SUPABASE_SECRET_KEY` and `ANTHROPIC_API_KEY` are read only by files marked
  `import "server-only"` at the top — Next.js's bundler throws a build error if a
  server-only module is ever imported into client-bundled code, so this is enforced, not
  just a convention.
- The service-role Supabase client (`lib/supabase/admin.ts`) is only ever constructed in
  background jobs and admin-verified routes — never to serve a normal user request. Every
  normal request uses `lib/supabase/server.ts`, which is RLS-scoped to the caller.
- `.gitignore` excludes `.env*` except `.env.example` (explicitly re-allowed — see the
  `!.env.example` line — since a plain `.env*` glob would otherwise also hide the
  example file from git, defeating its purpose).
- No API keys or secrets appear anywhere in this repository's source (verified via
  pattern search for common key prefixes before every phase's completion).

## Authentication

- Supabase Auth (email/password) with server-side session management via
  `@supabase/ssr`. Sessions live in httpOnly cookies — never accessible to client JS.
- `proxy.ts` (Next.js 16's renamed `middleware.ts`) performs an **optimistic** redirect
  based on the cookie session. It is not the source of truth.
- `lib/security/dal.ts`'s `verifySession()` / `requireUser()` / `requireProfile()` are
  the **authoritative** check — every Server Component, Server Action, and Route Handler
  that touches user data calls one of these itself. This matters because Next.js layouts
  don't re-run on client-side navigation, so a check only in a parent layout would miss
  subsequent client-side navigations within the same layout.
- Password reset and email confirmation both complete server-side
  (`app/auth/confirm/route.ts` calls `supabase.auth.verifyOtp()`) — the token in the
  emailed link is never exposed to client-side JavaScript.

## Evidence & file storage

- Two private Supabase Storage buckets (`evidence`, `cv-uploads`), both `public: false`.
- Object paths are always `{auth.uid()}/{filename}` — a single folder-prefix RLS policy
  on `storage.objects` scopes every read/write to the owner (see
  `supabase/migrations/0015_storage_buckets.sql`).
- Files are never served via a public URL. `getSignedEvidenceUrl` /
  `createSignedUrl` issue short-lived (10-minute) signed URLs on demand.
- Uploading evidence never means "verified" — `evidence_status` moves from
  `self_reported` to `evidence_added`, and only a real verification process (not built in
  this pass) could ever move it to `verified`.

## Minor-safe design decisions

- No collection of full birth date — `profiles.birth_year` only (used only for rough
  opportunity age-eligibility filtering).
- Evidence is optional everywhere (Non-negotiable #3 in the build spec) — nothing in the
  scoring engine or the UI requires it.
- No public-by-default profiles, no student-to-student messaging, no public search of
  other students.
- Full data export (`GET /api/export-data`) and full account deletion
  (`app/(app)/settings/actions.ts`'s `deleteMyAccount`, admin-client
  `auth.admin.deleteUser`) are both implemented and reachable from Settings. Deletion
  cascades through every table via `references ... on delete cascade`.

## AI safety

- The advisor's system prompt (`lib/ai/advisor-prompt.ts`) explicitly instructs the model
  never to fabricate university requirements, deadlines, scholarships, competition rules,
  or admission statistics, and to separate verified fact from inference.
- Every structured AI output (weekly plans, CV extraction, opportunity extraction) is
  validated against a Zod schema before it touches the database; a validation failure
  triggers one retry with the error appended, then a controlled failure — never silently
  stored malformed data.
- Admission outlook is a transparent heuristic (`lib/admissions/outlook.ts`), not an
  LLM guess — the model version, inputs, and formula are all inspectable code, and the
  optional numeric estimate is always a wide range with capped confidence, never a
  single-point percentage.
- Every AI-backed Server Action (advisor chat, weekly-plan regeneration, CV extraction)
  is rate-limited per user (`lib/ai/rate-limit.ts`) — a sliding window sourced from the
  `ai_usage` log itself rather than a separate counter table, so it can never drift out
  of sync with what was actually billed. Not distributed-systems-grade (a burst of
  concurrent requests could all read the same count before any writes land), which is
  fine for a single-user abuse guard but worth knowing if this ever needs to be
  billing-critical.

## Admin panel

`/admin` (not linked from navigation — `notFound()`, not a redirect, for non-admins, so
its existence isn't revealed by poking at URLs) shows provider health, background job
history, and AI usage by feature, and can manually trigger each scheduled job. Gated by
`profiles.is_admin` (`lib/security/require-admin.ts`), re-checked independently in every
admin Server Action, not just the page.

## Known gaps (be explicit, not silent)

- **No professional legal review has been performed.** COPPA/GDPR-for-minors compliance
  needs a lawyer before any public launch — this document describes the engineering
  posture, not a compliance certification.
- **Rate limiting covers AI-backed actions and the data export endpoint, not every
  Server Action.** `lib/ai/rate-limit.ts` throttles AI calls (sourced from the `ai_usage`
  log); `lib/security/rate-limit.ts` is the same sliding-window approach generalized for
  everything else, backed by its own `rate_limit_events` table, currently applied to
  `/api/export-data` (a repeatable full-account-data dump — the clearest abuse target
  outside the AI path). Ordinary CRUD Server Actions (adding an achievement, updating a
  field) are *not* individually throttled — they're scoped to the caller's own rows by
  RLS, and Supabase's own infrastructure limits apply, but there's no per-user request
  cap on them yet. Auth endpoints (signup/login/password reset) rely on Supabase Auth's
  own built-in throttling, not this app's code.
- **No content moderation** on free-text fields (activity descriptions, advisor
  messages) beyond what the AI system prompt discourages.
- **The admin-only "add a requirement" form (Phase 69,
  `app/(app)/universities/[id]/requirement-actions.ts`) doesn't cross-check that a
  submitted `program_id` actually belongs to the given `university_id`.** Low severity —
  it's gated by `requireAdmin()` (a trusted operator, not a student-facing surface) and the
  UI only ever offers programs already scoped to that university — but a direct call to the
  Server Action with a mismatched pair wouldn't be rejected server-side. Worth adding if
  this form gets more than one admin using it.
