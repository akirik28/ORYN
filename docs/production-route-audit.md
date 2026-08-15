# Production Route / Action Audit

Every page, API route, and Server Action file in `app/`, as of commit `e425870`.
Compiled by reading each file directly (grep for the auth-check call + external-dependency
imports, then manually verified), not inferred. Two real bugs found this pass are already
fixed and are noted inline rather than left as open findings:
`app/auth/confirm/route.ts`'s open redirect and `app/(app)/settings/page.tsx`'s
non-redirecting stale-session gap (see the commit that introduced this doc for the
full reasoning).

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
| `/advisor` | `requireUser` | Own conversations only (`user_id` scoped) | Anthropic | None for the route | Yes — `ANTHROPIC_API_KEY` |
| `/plan` | `requireUser` | Own plan only | Anthropic (weekly plan generation) | None for the route | Yes — `ANTHROPIC_API_KEY` |
| `/profile` + CRUD | `requireUser` | Own records, `user_id`-scoped (`crudCreate`/`crudUpdate`/`crudRemove`) | Anthropic (refine/research-generator, achievement CV import) | `scoring/*` (11 files, math only, not the route/action), `errors/friendly-db-error.test.ts` | Yes |
| `/profile/cv`, `/profile/history`, `/profile/portfolio` | `requireUser` | Own records | None (read/print views) | None | Yes |
| `/profile/story-bank` | `requireUser` | Own records | Anthropic (outline generation) | None for the route | Yes — `ANTHROPIC_API_KEY`; also `CODE_READY_ENV_BLOCKED` on migration 0029 (writing `story_notes` fails until applied — read path degrades gracefully, live-verified this session) |
| `/connections` | `requireUser` | Participant-scoped (`requester_id`/`recipient_id`) | None | None for the route/action | Yes |
| `/messages`, `/messages/[userId]` | `requireUser` | Connection + block state (this and the prior pass's core work) | None | `messaging/authorization.test.ts`, `messaging/realtime.test.ts` | Yes — also needs Realtime enabled (migration 0031, unapplied) for live-update verification specifically |
| `/u/[id]` (public profile) | `requireUser` | `public_profiles` view + connection carve-out (migration 0024, privacy-critical) | None | None automated — `supabase/tests/connection_privacy_manual.sql` (manual SQL, not CI) | Yes |
| `/opportunities` | `requireUser` | Own saved/matches | Tavily (discovery job, not per-request) | `opportunities/dedup.test.ts`, `matching.test.ts` (lib math, not the route) | Yes |
| `/universities`, `/universities/[id]` | `requireUser` | Read-only global data + own `target_universities` writes | College Scorecard (sync job, not per-request) | `requirements/evaluate.test.ts`, `dedup.test.ts`, `admissions/outlook.test.ts` (lib math, not the route) | Yes |
| `/universities/[id]` admin requirement form | `requireAdmin` | `is_admin` flag | Anthropic (`interpret-requirement` suggestion only — never auto-saves) | None | Yes — `is_admin` + `SUPABASE_SECRET_KEY` |
| `/search` | `requireUser` | Own-scoped results | None | `search/rank.test.ts` (lib math, not the route) | Yes |
| `/settings` | `requireUser` (fixed this pass — was `verifySession`) | Own profile only; account deletion via admin client | `SUPABASE_SECRET_KEY` (account deletion only) | None | Yes |
| `/documents` | `requireUser` | Own evidence files, storage owner-folder-prefix policy | Supabase Storage | None | Yes |
| `/admin` | `requireAdmin` (page) + independently on every Server Action in `admin/actions.ts` | `is_admin` flag | `SUPABASE_SECRET_KEY` (every query on the page uses the admin client) | `moderation/report-status.test.ts` (UI-adjacent constant, not the page) | Yes — `is_admin` + `SUPABASE_SECRET_KEY` |
| `/design-preview`, `/design-preview/onboarding` | None, but hard `notFound()` when `NODE_ENV === "production"` | — | None (fixture data only) | None | N/A — not reachable in production by design |

## API routes

| Route | Auth requirement | Authorization | External dependency | Automated test | E2E blocked? |
|---|---|---|---|---|---|
| `/api/export-data` | `requireUser` | Own data only, explicit per-table filters (fixed this pass: `message_reports` no longer selects admin-internal columns) | None | `export/tables.test.ts` | Yes — session; rate-limit boundary behavior itself is untested (see Known Gaps) |
| `/auth/confirm` | None — OTP token in the URL is the credential | Supabase `verifyOtp` | None | `security/safe-redirect.test.ts` (the fix from this pass) | Yes — email confirmation wall |
| `/api/jobs/discover-opportunities` | `verifyCronRequest` (bearer `CRON_SECRET`, **fail-closed** when unset — verified by reading `lib/jobs/verify-cron-request.ts` directly) | System job, no per-user scope | Tavily + Anthropic | `opportunities/dedup.test.ts`, `matching.test.ts` (lib, not the route) | Yes — `CRON_SECRET` + both provider keys |
| `/api/jobs/discover-requirements` | `verifyCronRequest` | System job | Tavily + Anthropic | `requirements/dedup.test.ts`, `evaluate.test.ts` (lib, not the route) | Yes — same |
| `/api/jobs/sync-university-data` | `verifyCronRequest` | System job | College Scorecard | None | Yes — `CRON_SECRET` + `COLLEGE_SCORECARD_API_KEY` |
| `/api/jobs/deadline-reminders` | `verifyCronRequest` | System job | None | None | Yes — `CRON_SECRET` only |

## Known gaps (not fixed this pass — see reasoning)

- **Zero component tests, zero Server Action tests, zero RLS/integration tests** anywhere
  in the repo, before or after this pass's additions — pre-existing, codebase-wide, not
  something introduced now. Every new test this pass follows the existing convention
  (pure functions extracted out of server-only/client-component files specifically so
  they're importable in Vitest's plain Node environment — see e.g.
  `lib/messaging/authorization.ts`, `lib/security/safe-redirect.ts`). Introducing the
  *first* mock-based or component-rendering test in this codebase would be a real
  test-infrastructure decision (which mocking approach, jsdom setup, etc.) — left as a
  backlog item rather than decided unilaterally mid-pass.
- **Rate-limit boundary behavior is untested.** `assertWithinRateLimit`
  (`lib/security/rate-limit.ts`) is a small function, but it's DB-touching (server-only) —
  testing "does it actually throw at exactly `maxCalls + 1`" needs either a live database
  or a mocked Supabase client, both outside what this environment or this codebase's
  existing test convention currently supports.
- **`/u/[id]`'s privacy carve-out has no automated regression test**, only the manual SQL
  file from an earlier pass. It's the single highest-consequence authorization surface in
  the app (a prior incident already leaked private-profile data before migration 0024
  fixed it) and deserves a real automated test more than most things on this list —
  flagged as the highest-priority item in NICE-TO-HAVE/AGENT-FIXABLE for a future pass,
  not attempted here because it would need the same DB-mock infrastructure decision noted
  above.
