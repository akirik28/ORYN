# Security

Oryn's primary users may be minors (roughly 14-18). This document describes what's
actually implemented, and is explicit about what still needs professional legal review
before a public launch — see "Known gaps" at the end.

## Row Level Security

Every one of the 44 tables in `supabase/migrations/` has Row Level Security enabled.
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

**Re-verified again in Chat 3, this time live, not by grep.** Every migration through
`0025` was previously reviewed by hand only — no Docker/Supabase existed in any sandbox
this product had been built in, so "N tables have RLS" was a static-analysis claim, never
an observed fact. Chat 3 created a disposable scratch Supabase project via the Supabase
MCP, applied the full migration history, and queried `pg_class`/`pg_policies` directly:
all **44** tables (43 + `connections`, added by `0023_social_v1.sql` — the "43" figure
elsewhere in this document and `DATABASE.md` predates that migration and undercounts by
one; both are corrected as of this pass) confirmed `relrowsecurity = true`, with policy
counts matching the three patterns above exactly (owner-only tables all show 1 policy,
`profiles`/`rate_limit_events` show 2, `notifications` shows 3, `connections` shows 4, the
three ops-only tables show 0 — see the "No policy at all" pattern below). Doing this live run
also surfaced a real, independent bug: `0023_social_v1.sql`'s `public_profiles` view
referenced `connections` before that table existed in the same file, so the migration had
never actually been able to apply to a real Postgres database at all — see
`docs/known-issues.md` for the fix. Static review had missed this because nothing had
ever executed the file.

A parallel gap, same root cause but on the *write* side rather than RLS-policy coverage:
`lib/ai/usage.ts`'s `logAIUsage` was inserting into `ai_usage` through the RLS-scoped
request client, but that table's policy is deliberately select-only (see above) — every
insert was silently failing (caught by the function's own try/catch, which only logs a
console warning). Two real consequences: `ai_usage` was never actually populated, and
`lib/ai/rate-limit.ts`'s sliding window — sourced from that same table — had nothing to
count, so **the AI rate limiter has not been functioning** despite this document
previously describing it as active. Fixed by switching `logAIUsage` to the admin client,
matching `lib/analytics/log.ts`'s `logEvent` (which already did this correctly for
`product_events`). **Re-verified live in Chat 3** against the same scratch project:
inserted `ai_usage` rows directly, then ran `assertWithinAIRateLimit`'s exact query as
that user via a simulated JWT — the count came back correct, and a second, unrelated
simulated user could not see the first user's usage rows (RLS holds). The fix is now an
observed fact, not just a code-reading conclusion.

**Migrations 0061–0065 and 0067 applied live, 2026-08-31.** BUG-1's RLS verification
package (`docs/FOUNDER-START-HERE.md`, `docs/founder-blocked-backlog.md`) had closed these
in application code but left the database half founder-gated — see that page's own "every
fix has a code half and a database half" framing. All six re-verified directly against
`oryn-qa-scratch` after the founder applied them via the SQL Editor (not assumed from the
migration files existing): `profiles_00_guard_protected_columns` now guards `is_admin`,
`profile_strength_score`, and `completeness_percent` together (0062+0063 combined, matching
the live trigger definition); five more computed-column guard triggers exist on
`profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
`student_requirement_evaluations`, `evidence_files` (0063); `message_reports`' insert
policy's `WITH CHECK` now cross-references `messages.sender_id` /
`recommendations.author_id` rather than trusting the caller (0064); all six
INSERT-forgery tables now carry separate select/update/delete policies with no insert
policy at all, `"owner full access"` gone (0065); `public_profiles` requires
`auth.uid() is not null` (0061). **0067, new this pass**: the same additive-default-ACL
drift 0061 documents for `public_profiles` was independently found (via `get_advisors`,
not the original BUG-1 sweep) to also leave `is_blocked_between` executable by `anon`
despite two prior migrations (0027, 0040) each trying to close it the same
`revoke ... from public` way that doesn't touch a role's own separate additive grant —
fixed with an explicit `revoke execute ... from anon`, live-reverified via
`has_function_privilege('anon', ..., 'EXECUTE') = false` and confirmed off the advisor's
own output afterward. Every one of these was a genuinely open, live, exploitable gap until
this pass, not a defense-in-depth extra — treat prior mentions of them elsewhere in this
document or `docs/known-issues.md` as historical unless dated on or after 2026-08-31.

## Social / connections (V1, `supabase/migrations/0023`–`0025`)

- `public_profiles` is a security-definer view over a fixed column whitelist
  (`id, display_name, country, curriculum, graduation_year, looking_for, created_at`) —
  never the raw `profiles` row, which carries fields that must never be public
  (`birth_year`, `school_name`, `city`, `is_admin`, `busy_mode*`, `onboarding_*`, ...).
  Supabase's security linter flags this view as `security_definer_view` (ERROR severity)
  by design — that's a generic warning against a real footgun class, and this view *was*
  that footgun twice (see `known-issues.md`), but the current predicate was live-verified
  correct: `auth.uid()` inside a security-definer view still reads the calling user's JWT
  claim (it's a session-scoped `current_setting`, not tied to the view owner's identity),
  confirmed by querying the view under six different simulated identities and getting the
  expected result every time. Switching to `security_invoker` was considered and rejected
  — RLS is row-level only, not column-level, so an invoker-view would need a matching RLS
  policy directly on `profiles`, which would expose every column of `profiles` (not just
  this view's six) to any row satisfying that policy. The view is the narrower, safer
  option specifically because it avoids that.
- Visibility carve-out beyond `is_public = true` is deliberately split into two
  status-and-direction-specific clauses (accepted, either direction; pending, only
  recipient-sees-requester) rather than one broad "any relationship exists" predicate —
  see the migration's own comment for why collapsing these is exactly how the original
  vulnerability happened.
- `getPublicPortfolio`/`getPublicSkills` (`lib/social/public-profile.ts`) do not trust
  `public_profiles` as their authorization check — they independently re-read
  `profiles.is_public` via the admin client. An accepted connection unlocks the six-column
  view, never the full portfolio/skills; only `is_public = true` does. This is a
  deliberate, documented product decision (see `docs/product-decisions.md`), not an
  oversight.
- `sendConnectionRequest` (`app/(app)/connections/actions.ts`) re-checks server-side that
  the recipient is currently public before creating a `pending` row — a Server Action is
  directly callable with any argument regardless of what the UI shows, so the "Connect"
  button only appearing on a public profile page is not itself a security boundary.

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
- **Rate limiting covers AI-backed actions, the data export endpoint, and the three
  highest-abuse-risk social actions, not every Server Action.** `lib/ai/rate-limit.ts`
  throttles AI calls (sourced from the `ai_usage` log); `lib/security/rate-limit.ts` is
  the same sliding-window approach generalized for everything else (its core decision
  logic factored into `lib/security/rate-limit-core.ts`, unit-tested against boundary/
  window/isolation/fail-open behavior with an injectable store — see
  `__tests__/security/rate-limit-core.test.ts`), backed by its own `rate_limit_events`
  table. Applied to `/api/export-data` (a repeatable full-account-data dump), and — added
  2026-08-16, for a product where minors message each other — `sendMessage`,
  `sendConnectionRequest`, and `reportMessage` (thresholds in
  `lib/security/rate-limit-config.ts`). Ordinary CRUD Server Actions (adding an
  achievement, updating a field) and `blockUser`/`removeConnection` are still *not*
  individually throttled — they're scoped to the caller's own rows by RLS, and Supabase's
  own infrastructure limits apply, but there's no per-user request cap on them yet. Auth
  endpoints (signup/login/password reset) rely on Supabase Auth's own built-in
  throttling, not this app's code.
- **No content moderation** on free-text fields (activity descriptions, advisor
  messages) beyond what the AI system prompt discourages.
