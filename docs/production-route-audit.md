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

All items previously listed here as fixable have been fixed
(`requirement-actions.ts`'s raw error, `respondToConnectionRequest`'s missing pending
guard, rate-limit boundary tests, `/u/[id]` authorization tests). One remains, genuinely
architectural rather than a one-off gap:

### Server-layer / RLS integration testing — investigated this pass, not built

**The question**: can `sendConnectionRequest`, `sendMessage`, block/report, `/u/[id]`,
and the admin gate be tested at the real server layer — the actual Server Action calling
the actual `@supabase/supabase-js` client against something that actually enforces RLS —
without a real Supabase credential, without a mock that could give a false PASS, and
without building a large harness?

**What was checked, concretely, before answering:**

- `docker` — not installed in this environment. `npx supabase start` (the project's own
  local-dev tooling, already a devDependency) is confirmed container-based with no
  Docker-free mode (`supabase start --help`: "Start containers for Supabase local
  development"), so it's unusable here regardless of credentials.
- A local Postgres *binary* is available (`/opt/homebrew/bin/postgres`), and network
  access works, so `postgrest` (the HTTP layer `@supabase/supabase-js` actually talks to
  — it does not speak the Postgres wire protocol directly) is installable via Homebrew.
  So the raw pieces exist. But making them into a real Supabase-shaped stack needs a
  hand-built `auth` schema (`auth.users`, an `auth.uid()` function, JWT-claim-to-`SET
  ROLE` wiring matching PostgREST's actual verification behavior) — none of which exists
  in a vanilla Postgres, all of which Supabase's real GoTrue+PostgREST stack provides
  and this migration set assumes throughout (`auth.uid()` appears in nearly every RLS
  policy in `supabase/migrations/`). A hand-rolled stub of that is exactly the kind of
  thing that can subtly diverge from the real thing's behavior — and a test suite that
  passes against a slightly-wrong auth simulation while the real project behaves
  differently is a false PASS, which was explicit out-of-bounds for this pass.
- `pg-mem` (an in-memory JS Postgres-emulator, considered as a lighter alternative) was
  ruled out for the same reason: it doesn't implement real `CREATE POLICY`/RLS semantics
  or several extensions/functions this schema's migrations use, so passing against it
  wouldn't demonstrate anything about how the real policies behave — the same
  false-confidence risk, from a different direction.
- Wiring the *actual* Server Actions to a local stack (rather than testing hand-copied
  SQL) would also mean overriding `NEXT_PUBLIC_SUPABASE_URL` per test run to point at a
  local PostgREST instance, plus minting JWTs shaped exactly like Supabase's — each an
  independent way for the harness to diverge from production behavior.

**Conclusion**: reproducing enough of Supabase's platform to make this trustworthy is
not "a small harness" — it's rebuilding a meaningful slice of what `supabase start`
already does under Docker, in a way that risks false confidence if any piece drifts from
the real thing, and it would need its own install step in CI (this project's CI
currently needs zero external services or credentials — see `.github/workflows/ci.yml`'s
own comment — and that property was deliberately verified, not assumed, when the
workflow was added). Per this pass's own instruction to not write code when it can't be
done cleanly: not built. What every pure-function test added across the last several
passes already covers — the *app-layer* authorization decisions
(`resolveConversationAccess`, `canRespondToConnectionRequest`,
`canViewBasicProfile`/`canViewPortfolio`, `isAdminProfile`, `isMessageFromConversationPartner`,
export filter scoping) — is real and regression-tested. What remains genuinely
unverified by anything in this repository is whether the **RLS policies themselves**,
on a live database, produce the same answer. That needs one of: a real Supabase project
(`docs/browser-qa-checklist.md`), or Docker becoming available in a future environment so
`supabase start` can run for real.
