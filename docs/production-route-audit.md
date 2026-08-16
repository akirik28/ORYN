# Production Route / Action Audit

Every page, API route, and Server Action file in `app/`. Compiled by reading each file
directly (grep for the auth-check call + external-dependency imports, then manually
verified), not inferred. Updated across two passes; real bugs found are fixed and noted
inline rather than left as open findings: `app/auth/confirm/route.ts`'s open redirect,
`app/(app)/settings/page.tsx`'s non-redirecting stale-session gap, and
`app/(app)/advisor/actions.ts`'s missing ownership check on a client-supplied
`conversationId` (RLS's owner-only policy already made this harmless for reads — no
cross-user data was ever exposed — but it could silently insert orphaned
`advisor_messages` rows against someone else's conversation id instead of returning a
clear error; fixed to match every other action's "re-verify server-side" convention).

**E2E blocked?** = can this route currently be exercised end-to-end in a real browser with
a real account. Everything under `(app)`/`(onboarding)` is blocked by the standing
FOUNDER_BLOCKED_BACKLOG email-confirmation wall (no confirmed test account exists), not by
anything this pass changed. Routes needing a specific credential note which one on top of
that.

## Pages

| Route | Auth requirement | Authorization | External dependency | Automated test | E2E blocked? |
|---|---|---|---|---|---|
| `/` | None (public) | — | None | None | No — smoke-tested this pass (loads, no console error) |
| `/login`, `/signup`, `/forgot-password` | None (public by design) | — | None | None | Yes — email confirmation wall |
| `/reset-password` | `verifySession` (session optional — explicit "link expired" state when absent) | Supabase recovery-session token | None | None | Yes — needs a real recovery email |
| `/onboarding` | `requireProfile` (layout) — redirects to `/dashboard` if already completed | Own profile only | Anthropic (CV extraction step) | None for the route/action | Yes — email confirmation + `ANTHROPIC_API_KEY` |
| `/dashboard` | `requireUser` | Own data only | None directly (aggregates scoring/plan) | None for the route | Yes |
| `/advisor` | `requireUser` | Own conversations only (`user_id` scoped) — a client-supplied `conversationId` is now re-verified server-side before use (fixed this pass) | Anthropic | None for the route (the ownership check mirrors `resolveConversationAccess`'s already-tested pattern, no live DB to test the query itself against) | Yes — `ANTHROPIC_API_KEY` |
| `/plan` | `requireUser` | Own plan only | Anthropic (weekly plan generation) | None for the route | Yes — `ANTHROPIC_API_KEY` |
| `/profile` + CRUD | `requireUser` | Own records, `user_id`-scoped (`crudCreate`/`crudUpdate`/`crudRemove`) | Anthropic (refine/research-generator, achievement CV import) | `scoring/*` (11 files, math only, not the route/action), `errors/friendly-db-error.test.ts` | Yes |
| `/profile/cv`, `/profile/history`, `/profile/portfolio` | `requireUser` | Own records | None (read/print views) | None | Yes |
| `/profile/story-bank` | `requireUser` | Own records | Anthropic (outline generation) | None for the route | Yes — `ANTHROPIC_API_KEY`; also `CODE_READY_ENV_BLOCKED` on migration 0029 (writing `story_notes` fails until applied — read path degrades gracefully, live-verified this session) |
| `/connections` | `requireUser` | Participant-scoped (`requester_id`/`recipient_id`) | None | None for the route/action | Yes |
| `/messages`, `/messages/[userId]` | `requireUser` | Connection + block state | None | `messaging/authorization.test.ts`, `messaging/realtime.test.ts` (23 cases: block direction, read/send split, channel filter direction, duplicate/reconnect handling) | Yes — also needs Realtime enabled (migration 0031, unapplied) for live-update verification specifically |
| `/u/[id]` (public profile) | `requireUser` | `public_profiles` view + connection carve-out (migration 0024, privacy-critical) — portfolio/skills gate deliberately narrower than basic-field visibility | None | `social/public-profile-authorization.test.ts` (added this pass — see below) + `supabase/tests/connection_privacy_manual.sql` (manual SQL, not CI, for the SQL-view layer itself) | Yes |
| `/opportunities` | `requireUser` | Own saved/matches | Tavily (discovery job, not per-request) | `opportunities/dedup.test.ts`, `matching.test.ts` (lib math, not the route) | Yes |
| `/universities`, `/universities/[id]` | `requireUser` | Read-only global data + own `target_universities` writes | College Scorecard (sync job, not per-request) | `requirements/evaluate.test.ts`, `dedup.test.ts`, `admissions/outlook.test.ts` (lib math, not the route) | Yes |
| `/universities/[id]` admin requirement form | `requireAdmin` | `is_admin` flag | Anthropic (`interpret-requirement` suggestion only — never auto-saves) | None | Yes — `is_admin` + `SUPABASE_SECRET_KEY` |
| `/search` | `requireUser` | Own-scoped results | None | `search/rank.test.ts` (lib math, not the route) | Yes |
| `/settings` | `requireUser` (fixed this pass — was `verifySession`) | Own profile only; account deletion via admin client | `SUPABASE_SECRET_KEY` (account deletion only) | None | Yes |
| `/documents` | `requireUser` | Own evidence files, storage owner-folder-prefix policy | Supabase Storage | None | Yes |
| `/admin` | `requireAdmin` (page) + independently on every Server Action in `admin/actions.ts` | `is_admin` flag | `SUPABASE_SECRET_KEY` (every query on the page uses the admin client) | `moderation/report-status.test.ts` (UI constant) + `security/is-admin.test.ts` (the actual gate predicate, added this pass) | Yes — `is_admin` + `SUPABASE_SECRET_KEY` |
| `/design-preview`, `/design-preview/onboarding` | None, but hard `notFound()` when `NODE_ENV === "production"` | — | None (fixture data only) | None | N/A — not reachable in production by design |

## API routes

| Route | Auth requirement | Authorization | External dependency | Automated test | E2E blocked? |
|---|---|---|---|---|---|
| `/api/export-data` | `requireUser` | Own data only, explicit per-table filters (`message_reports` column allowlist, participant-pair filters now named + tested) | None | `export/tables.test.ts` | Yes — session |
| `/auth/confirm` | None — OTP token in the URL is the credential | Supabase `verifyOtp` | None | `security/safe-redirect.test.ts` (the fix from this pass) | Yes — email confirmation wall |
| `/api/jobs/discover-opportunities` | `verifyCronRequest` (bearer `CRON_SECRET`, **fail-closed** when unset — verified by reading `lib/jobs/verify-cron-request.ts` directly) | System job, no per-user scope | Tavily + Anthropic | `opportunities/dedup.test.ts`, `matching.test.ts` (lib, not the route) | Yes — `CRON_SECRET` + both provider keys |
| `/api/jobs/discover-requirements` | `verifyCronRequest` | System job | Tavily + Anthropic | `requirements/dedup.test.ts`, `evaluate.test.ts` (lib, not the route) | Yes — same |
| `/api/jobs/sync-university-data` | `verifyCronRequest` | System job | College Scorecard | None | Yes — `CRON_SECRET` + `COLLEGE_SCORECARD_API_KEY` |
| `/api/jobs/deadline-reminders` | `verifyCronRequest` | System job | None | None | Yes — `CRON_SECRET` only |

## Known gaps

Two of the three gaps originally listed here are closed (rate-limit boundary behavior:
`security/rate-limit-core.test.ts`, via an injectable store rather than a DB mock;
`/u/[id]`'s authorization logic: `social/public-profile-authorization.test.ts`). What
remains:

- **Zero component tests, zero Server Action *integration* tests, zero RLS/integration
  tests against a live database** — pre-existing, codebase-wide, not something this or
  the prior pass introduced. Every test added across both passes follows the same
  convention: pure decision logic extracted out of server-only/client-component files
  (`lib/messaging/authorization.ts`, `lib/security/rate-limit-core.ts`,
  `lib/social/public-profile-authorization.ts`, `lib/security/is-admin.ts`, ...) and
  *wired into* the real call site rather than left as an unenforced parallel model —
  documented per-module which. What this can't cover: whether the SQL itself (RLS
  policies, the `public_profiles` view, `is_blocked_between`) actually behaves as
  documented on a live database, and whole-request-lifecycle behavior (does a Server
  Action actually redirect via `next/navigation`, does a Route Handler actually return
  the right HTTP status). Closing that needs a live database (this environment has none)
  or a first real mocking/component-test decision — still not decided unilaterally
  across either autonomous pass, left for founder input given it's a standing
  architecture choice, not a one-off test.
- Two low-severity items noted but intentionally left as-is, both because fixing them
  is out of the stated scope for these passes and neither is a data-exposure risk:
  `app/(app)/universities/[id]/requirement-actions.ts` still returns raw
  `error.message` (admin-only surface, arguably useful for an admin debugging a bad
  insert), and `respondToConnectionRequest` (`app/(app)/connections/actions.ts`) doesn't
  guard `status = 'pending'` before updating, so a direct call could in principle flip an
  already-accepted connection back to `declined` — functionally equivalent to removing
  the connection (which that user could already do), no cross-user exposure.
