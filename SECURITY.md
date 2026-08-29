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
- **`public_profiles` required `auth.uid() is not null` as of `0061_public_profiles_require_authenticated.sql`.**
  Before that migration the view's WHERE clause never checked the caller was signed in at
  all, so an anonymous request could read any `is_public = true` row's six whitelisted
  columns. Re-verified live in this pass (Security Gate 1, 2026-08-29,
  `supabase/tests/security_gate_1_anonymous_and_isolation.sql`): `anon` reads zero rows
  from the view even for a row with `is_public = true`, while a signed-in, unconnected,
  non-owner user correctly still sees it.

## Column-level forgery guards (`0062`–`0067`)

RLS answers "which rows can this caller touch," not "which *columns* of a row it already
owns can it set to anything it wants." A table like `profile_scores` or
`target_universities` is owner-writable by design (the student legitimately edits other
fields on the same row), which means a plain owner-scoped RLS policy alone cannot stop
that same student from directly setting a system-computed column — `score`, `is_admin`,
`outlook`, `evidence_status` — to whatever value they like in the same request.

The fix is a `BEFORE INSERT OR UPDATE OF <protected columns>` trigger per protected table
(first established in `0062_profiles_guard_protected_columns.sql` for `profiles.is_admin`,
extended by `0063` to the two scoring tables plus `opportunity_matches` and
`student_requirement_evaluations`, and by `0066`/`0067` — Security Gate 1, 2026-08-29 — to
`target_universities`' outlook/estimate columns and `evidence_status` across all eight
achievement tables that carry it). On UPDATE it silently resets the protected column(s) back
to their prior value; on a fresh INSERT it sanitizes them to `NULL` (or a safe default) —
never `RAISE`, deliberately: an error would reveal exactly which column is guarded and would
break a legitimate multi-column UPDATE that happens to also touch an ordinary field on the
same row. The guard checks `current_user <> 'service_role'`
(`pg_catalog.pg_trigger_depth() <= 1` guards against a trigger re-entering itself), so the
one intended writer — this app's own background/scoring code, via the admin client — still
works.

`0065_close_insert_forgery_six_tables.sql` closes a narrower but sharper version of the same
problem for six tables where *no* legitimate student INSERT exists at all: it removes the
INSERT policy outright rather than adding a trigger, so a direct insert is rejected, not
silently sanitized.

None of this introduces a `SECURITY DEFINER` function — every fix here is either a trigger
scoped to `current_user`, or a `WITH CHECK` subquery that relies on the *caller's own* RLS
visibility into a referenced table (`0064_message_reports_verify_reported_user.sql`, closing
message/recommendation report accused-party forgery — a report can only name the actual
sender/author of the thing it references, verified independently for both the `message_id`
and `recommendation_id` branches).

Each guarded write has a paired application-side change moving that specific write from the
RLS-scoped client to the admin client (`lib/scoring/persist.ts`,
`lib/opportunities/persist-matches.ts`, `lib/requirements/persist.ts`,
`app/(app)/documents/actions.ts`, `lib/plan/persist.ts`, `lib/admissions/persist.ts`) — pinned
by `__tests__/security/computed-writes-use-admin-client.test.ts` so a future edit can't
quietly move a write back onto the caller's own client and silently reopen the exact gap the
trigger exists to close (the trigger would then reset the legitimate write too, not just a
forged one). Database-level proof — both the forgery being blocked and the legitimate
service-role write still working, for every table above, plus anonymous access and two-user
isolation — lives in `supabase/tests/security_gate_1_self_forgery.sql`,
`security_gate_1_anonymous_and_isolation.sql`, and `security_gate_1_report_integrity.sql`
(81 pgTAP assertions total, run via a locally-built Postgres + pgTAP, `supabase start`/Docker
not being available in this sandbox — see this pass's own closing report for exact commands).

## Secrets

- `SUPABASE_SECRET_KEY` and `ANTHROPIC_API_KEY` are read only by files marked
  `import "server-only"` at the top — Next.js's bundler throws a build error if a
  server-only module is ever imported into client-bundled code, so this is enforced, not
  just a convention.
- The service-role Supabase client (`lib/supabase/admin.ts`) is constructed in background
  jobs and admin-verified routes, and — a deliberate, narrower exception, not an oversight —
  in a specific set of ordinary student-facing Server Actions that must write a
  system-computed value the student must not be able to set directly (career-profile
  scores, opportunity match percentages, requirement evaluations, admission outlook,
  evidence verification status, account deletion's Storage cleanup). See "Column-level
  forgery guards" below for the full list and why RLS alone can't close this gap. In every
  one of these, the *read* side and the caller's own authorization/ownership check stay on
  `lib/supabase/server.ts` (RLS-scoped) — only the specific write of the protected value
  moves to the admin client, verified by `__tests__/security/computed-writes-use-admin-client.test.ts`
  and `__tests__/security/account-deletion.test.ts`. Every other normal request uses
  `lib/supabase/server.ts` throughout.
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
  (`app/(app)/settings/actions.ts`'s `deleteMyAccount`) are both implemented and reachable
  from Settings. Deletion cascades every DB table via `references ... on delete cascade`,
  and — added 2026-08-29, Security Gate 1, after an audit found it silently missing —
  separately enumerates and removes the student's objects from both Storage buckets
  (`evidence`, `cv-uploads`) by their own `{userId}/` prefix, since no DB cascade reaches
  Storage. The auth/DB delete runs first, Storage cleanup after — reordered during this
  same pass's own adversarial second-pass review, which is why: a Storage failure after a
  successful account deletion only orphans unreachable bytes, while the reverse order's
  failure case would leave a live account with permanently broken evidence/CV links.
  Storage cleanup is best-effort: a failure there is logged for follow-up but does not
  block the account/auth deletion itself (matching this app's existing convention for
  single-file evidence deletion), and there is currently no user-facing surface for a
  partial-Storage-failure case — the confirmation dialog's promise to delete evidence files
  now matches what the code actually attempts, but not every failure mode is user-visible.
  See `__tests__/security/account-deletion.test.ts`.

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
  `sendConnectionRequest`, `reportMessage`, and `reportRecommendation` (thresholds in
  `lib/security/rate-limit-config.ts`; the latter two were sharing one action key,
  `report_message`, until Security Gate 1 (2026-08-29) split them — see that file's own
  comment on `report_recommendation`). Ordinary CRUD Server Actions (adding an
  achievement, updating a field) and `blockUser`/`removeConnection` are still *not*
  individually throttled — they're scoped to the caller's own rows by RLS, and Supabase's
  own infrastructure limits apply, but there's no per-user request cap on them yet. Auth
  endpoints (signup/login/password reset) rely on Supabase Auth's own built-in
  throttling, not this app's code.
- **`checkRateLimit` (`lib/security/rate-limit-core.ts`) has the identical non-atomic
  count-then-record pattern the AI limiter's own entry above already discloses** — it was
  verified directly during Security Gate 1's second-pass review, not assumed to be
  different just because it backs a different set of actions. `countSince` and `record`
  are two separate, unlocked database calls; a tight-enough burst of truly concurrent
  requests from the same user could all read the same pre-increment count and all proceed,
  exceeding the nominal cap by roughly the burst's own width. This applies to every action
  in `rate-limit-config.ts`, `report_message`/`report_recommendation` included — it is a
  soft abuse-throttle, not a hard, provably-enforced ceiling, and RLS (not rate limiting)
  remains the actual authorization boundary against unauthorized data access.
- **No content moderation** on free-text fields (activity descriptions, advisor
  messages) beyond what the AI system prompt discourages.
