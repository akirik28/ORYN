# QA Environment & Production Readiness Audit

Independent audit pass. **Read-only** — no application code, migration, schema, or component
was modified by this pass, and nothing outside this file was committed. Written while other
agents were working in parallel, so anything below that touches a file another pass was
mid-edit is marked as such.

Purpose: establish exactly what is missing before ORYN can be tested end-to-end **in a real
browser, with real user accounts**, and before it can be deployed for real users. This is
deliberately narrower and more operational than `docs/launch-readiness.md` (product status)
or `docs/data-readiness.md` (content status) — those answer "is the product good enough";
this one answers "can anyone actually run it against real accounts, and what breaks first."

No credential value appears anywhere in this document. Where a credential's state is
reported, it is reported as present/absent/empty only.

## Method — what was actually verified vs. read

| Check | How |
|---|---|
| Env var inventory + current local state | Parsed `.env.local` key names and value *lengths* only; no values read or logged |
| Committed-secret scan | `git grep` for key-shaped patterns; `git log --all -- .env.local` |
| Test suite | Ran `npm run test` — **19 files, 113 tests, all pass** (1.77s) |
| Live schema state | Read-only PostgREST probes against the project in `.env.local` using the publishable (anon) key only |
| Everything else | Source reading: migrations 0014/0015/0023/0024/0026/0027/0029, auth actions, DAL, messaging/connections actions + UI, settings, export route, job routes, nav, `lib/env.ts`, `scripts/check-integrations.ts` |

Not done (out of scope for a read-only pass): running `next build`, running a dev server,
signing up through the UI, applying any migration or seed.

---

## 1. Environment configuration

### 1.1 `.env*` structure

Three files matter:

- `.env.example` — committed, correct, all-empty template. 10 variables.
- `.env.local` — **not tracked** (`.gitignore` has `.env` + `.env.*` with a `!.env.example`
  negation). Confirmed never committed in any commit reachable from any ref.
- `lib/env.ts` — the single typed accessor. Every integration is optional at process level;
  `integrationStatus` exposes per-integration booleans so UI degrades instead of crashing.

There is **no `.env.test`, no `.env.development`, no `.env.production`**, and no
environment-selection logic anywhere. `lib/env.ts` reads `NODE_ENV` into `env.app.env` but
nothing branches on it except Next.js itself. See §3.

### 1.2 Variable inventory and current local state

State column = what is in `.env.local` on this machine right now (presence only).

| Variable | Required for | Prod requirement | Local state |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Everything. App shows `NotConfiguredNotice` without it | **Required** | Present |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Everything (browser + server user-scoped client) | **Required** | Present |
| `SUPABASE_SECRET_KEY` | Admin client: notifications, product analytics, account deletion, peer benchmarking, all background jobs, all global-data writes | **Required for a usable product** (see §1.3) | **Empty** |
| `ANTHROPIC_API_KEY` | Advisor, weekly plan, CV extraction, opportunity/requirement extraction, achievement refinement, Essay Story Bank outlines | **Required for the core promise** | **Empty** |
| `ANTHROPIC_MODEL` | Model override; defaults to `claude-sonnet-5` in `lib/env.ts` | Optional | Empty (default applies) |
| `TAVILY_API_KEY` | Opportunity + requirement discovery jobs | Optional at boot, required for discovery | **Empty** |
| `COLLEGE_SCORECARD_API_KEY` | U.S. university sync job | Optional | **Empty** |
| `OPENALEX_CONTACT_EMAIL` | Polite-pool header only; OpenAlex is keyless | Optional | **Not present in `.env.local` at all** |
| `CRON_SECRET` | Bearer auth on all four `/api/jobs/*` routes | **Required if jobs are scheduled** | **Empty** |
| `NEXT_PUBLIC_APP_URL` | Fallback base URL for auth email redirects when no `origin` header | Recommended | **Not present in `.env.local` at all** (defaults to `http://localhost:3000`) |

Two variables present in `.env.example` are absent from `.env.local` entirely
(`OPENALEX_CONTACT_EMAIL`, `NEXT_PUBLIC_APP_URL`). Neither breaks anything locally;
`NEXT_PUBLIC_APP_URL` **will** matter in production if any code path ever falls back to it
(password-reset and signup-confirm links use the request `origin` header first, so this is
a second-line risk, not a first-line one).

### 1.3 `SUPABASE_SECRET_KEY` — what specifically stops working

This is the single highest-leverage missing credential for QA, above even the Anthropic key,
because it silently degrades *social* behavior rather than showing a "not configured" notice.
`createAdminClient()` throws when it is absent; callers vary in how they handle that:

| Consumer | Behavior without the key |
|---|---|
| `lib/notifications/create.ts` | Catches and `console.warn`s. **Connection requests and new messages produce no notification** — the bell stays empty. Silent. |
| `lib/analytics/log.ts` | Catches and `console.error`s. All product events (`onboarding_completed`, `cv_imported`, …) are silently dropped. |
| `deleteMyAccount()` (`app/(app)/settings/actions.ts`) | Throws — account deletion fails. This is a stated minor-safe requirement. |
| `lib/benchmarking` | Peer benchmarking unavailable |
| All four `/api/jobs/*` routes | Cannot write global data |
| Drive seed / any global-table write | Blocked by design (migration 0014: service-role-only writes) |

**QA consequence**: a two-account messaging test will *look* half-broken — messages send and
appear, but the recipient gets no notification and no badge in the nav bell. That is expected
behavior for the current environment, not a messaging bug, and a tester needs to know that in
advance or they will file it as one. The unread count *on the Messages list page itself* is
computed directly from the `messages` table (`lib/messaging/messages.ts`) and **does** work
without the secret key.

### 1.4 Committed secrets / placeholders

- No secret value of any kind is committed. Scanned for Anthropic (`sk-ant-`), Tavily
  (`tvly-`), JWT-shaped, AWS, and PEM private-key patterns across all tracked files: **zero
  real hits** (the single grep hit was the literal string `service_role` inside migration
  0014's explanatory comment).
- `.env.local` has never been committed.
- **No placeholder secrets remain.** Earlier docs (`docs/known-issues.md`,
  `docs/pre-publish-checklist.md`) describe `SUPABASE_SECRET_KEY` as "still the placeholder";
  as of this pass it is present as an **empty** key, which is the safer state — `lib/env.ts`'s
  `required()` treats empty as unset, so the app degrades correctly rather than attempting to
  authenticate with a junk key and producing confusing 401s.

---

## 2. Supabase project, auth, and the signup wall

### 2.1 Live schema/data state (probed this pass)

Read-only probes with the anon key against the project `.env.local` points at:

| Probe | Result | Meaning |
|---|---|---|
| `sports_experiences` | 200 | Migration 0026 applied |
| `messages` | 200 | Migration 0027 applied |
| `activities.story_notes` | **400 — `42703: column activities.story_notes does not exist`** | **Migration 0029 is NOT applied** |
| `universities`, `opportunities`, `university_programs`, `university_requirements` | 200, 0 rows | **Inconclusive** — RLS grants read `to authenticated` only (migration 0014), so an anon probe legitimately sees zero rows whether or not data exists |

**Finding (blocker):** the Essay Story Bank shipped in commit `8ef7077` reads and writes
`story_notes` on seven achievement tables. That column does not exist in the live dev
database. `/profile/story-bank` and any achievement save that touches the field will fail
against the current backend until `supabase/migrations/0029_story_notes.sql` is applied. The
migration file is committed; applying it needs SQL-editor/CLI access (founder or a session
with the secret key).

**Finding (tooling gap):** `npm run check:integrations` probes Supabase by selecting from
`universities` **with the anon key**. Because that table's read policy is `to authenticated`,
the query succeeds with zero rows against a correct project, an empty project, *or a
different project entirely*. It verifies reachability and key validity, not that the schema
or data is what you think. Treat a green `Supabase: OK` as "the URL and key resolve," nothing
more.

### 2.2 Signup and email confirmation — the actual QA wall

`signUp()` (`app/(auth)/actions.ts`) already handles both project configurations correctly:

- If the Supabase project has email confirmations **disabled**, `signUp` returns a session
  immediately and the code redirects straight to `/onboarding`.
- If confirmations are **enabled**, it returns "Check your email…" and the account stays
  unconfirmed until the emailed link hits `/auth/confirm`, which verifies the OTP
  server-side and redirects to `/onboarding`.

The code is fine. The environment is not:

1. **No email provider is configured anywhere in this repo**, and none can be — SMTP is a
   Supabase *dashboard* setting, not a repo setting. Nothing in `package.json`,
   `.env.example`, or `lib/` sends email.
2. On a default hosted Supabase project, the built-in SMTP is rate-limited to a couple of
   messages per hour and (on recent projects) will only deliver to addresses belonging to the
   project's own team members. **Two throwaway QA accounts will not reliably receive
   confirmation mail.**
3. Every prior session's live-QA attempt died exactly here — see `docs/known-issues.md`'s
   record of the leftover unconfirmed account `oryn.qa.alpha.chat4@qamail.io`, still sitting
   in the dev project's auth table.

**This is the #1 browser-QA blocker, and it is a dashboard toggle, not a code change.** Two
acceptable resolutions, in order of preference for QA:

- **Preferred for dev/QA:** Supabase dashboard → Authentication → Sign In / Providers →
  Email → turn **"Confirm email" off** on the *dev/QA project only*. Signup then returns a
  live session and the existing code path handles it with no changes. Turn it back on for
  production.
- **Preferred for production:** configure a real SMTP provider (Resend/Postmark/SES) in
  Authentication → Emails → SMTP Settings, plus Site URL and redirect allowlist.

Either way, the dashboard's **Site URL / Redirect URLs** must include the origin QA runs on
(`http://localhost:3000` for local browser QA) or confirmation and password-reset links will
bounce.

### 2.3 Test accounts and seeded users

**There are none, and there is no mechanism to create them.**

- `supabase/seed.sql` contains 21 universities and their source rows. **Zero users.** It is
  applied only by the local Supabase CLI (`supabase db reset`/`start`), never to a linked
  hosted project.
- `supabase/tests/connection_privacy_manual.sql` and
  `supabase/tests/messaging_authorization_manual.sql` *do* insert disposable users — but by
  writing directly into `auth.users` from the SQL editor. Those rows have no GoTrue identity
  or password, so **you cannot log into the browser as one of them.** They are RLS-layer
  fixtures, not usable QA accounts.
- There is no `scripts/seed-test-users.*`, no admin-createUser helper, no fixture loader.
  `AGENTS.md` Phase 49 specifies four dev personas (A–D); nothing in the repo implements them.

So real browser QA today requires either (a) email confirmation off + two real signups
through the UI, or (b) `SUPABASE_SECRET_KEY` + a small script using
`auth.admin.createUser({ email_confirm: true })`. Option (b) does not exist yet and would be
new code (see AGENT-FIXABLE).

---

## 3. Environment separation: local vs. dev vs. test vs. production

**There is currently exactly one environment, and it is shared.**

| Concern | State |
|---|---|
| Local dev DB | None. No `supabase/config.toml`, no Docker/compose file, no `supabase start` setup. The Supabase CLI is a devDependency, but the project is used in "linked hosted project" mode only |
| Dev/QA project | One hosted project (`oryn-qa-scratch` per `docs/launch-readiness.md`), pointed at by `.env.local` |
| Test DB | **None.** Vitest runs in `environment: "node"` with no DB, no Supabase mock, no test container. Every test is a pure function test |
| Staging | None |
| Production | Not created (per `docs/pre-publish-checklist.md` §6) |
| CI | **None.** No `.github/`, no CI config of any kind. Lint/typecheck/test/build run only when a human or agent runs them |
| Deploy config | **None.** No `vercel.json`, no Dockerfile, no platform config |

Consequences for QA:
- Any destructive or messy QA (blocking, reporting, disconnecting, deleting accounts) happens
  in the same database that holds the seeded university data and any future real content.
  Acceptable pre-launch; **must not** stay true once real students exist.
- `supabase/seed_drive_batch1.sql` (~1,300 lines, 31 universities / 189 programs / 520
  requirements / 273 opportunities) has still never been executed against any Postgres — with
  no disposable environment, the first execution is also the production-shaped one. That risk
  is real but bounded: the file is idempotent and uses `ON CONFLICT`.

---

## 4. RLS: where automated and manual testing gets blocked

RLS is correct and strict, which is exactly why testing is hard. The specific walls:

| Table / area | Policy posture | Testing consequence |
|---|---|---|
| Global reference data (`universities`, `university_programs`, `university_requirements`, `university_statistics`, `university_deadlines`, `university_sources`, `opportunities`, `opportunity_sources`) | `select to authenticated`, writes service-role only (0014) | Cannot seed or verify content without the secret key or SQL-editor access. Anon probes always show zero rows — indistinguishable from empty |
| Ops tables (`provider_health`, `external_sync_jobs`, `product_events`, `notifications` inserts) | **No policies at all** — service-role only | Notifications and analytics cannot be produced or inspected during QA without the secret key |
| `messages` | select: participant only; insert: `WITH CHECK` requires a live accepted `connections` row **and** `not is_blocked_between(...)`; update: recipient only; **no delete policy for anyone** | Cannot clean up test messages from the client at all. Message history is permanent by design |
| `blocked_users` | select/insert/delete restricted to `blocker_id = auth.uid()` | A tester logged in as the *blocked* party cannot query whether they are blocked (by design — `is_blocked_between` is the security-definer boolean escape hatch). Verifying "who blocked whom" needs SQL-editor access |
| `message_reports` | **insert-only**; nothing can read it back | A submitted report is unverifiable from inside the product. Confirming a report landed requires the SQL editor. No admin surface reads this table |
| `public_profiles` view | Status- and direction-aware carve-out (0024) | Correct, and already live-verified by an earlier pass. Any new QA on it must re-run `supabase/tests/connection_privacy_manual.sql` rather than reason about it |
| Storage (`evidence`, `cv-uploads`) | Owner-folder-prefix policies per bucket (0015) | Cross-user evidence access testing needs two real sessions; already verified once at the storage layer |

Net: **every write-side verification of global data, notifications, analytics, and reports
requires either the secret key or Supabase SQL-editor access.** Read-side per-user
verification works fine with two ordinary browser sessions.

---

## 5. Feature × test inventory

`existing automated test` = a test file in `__tests__/` that exercises this feature's logic.
All 113 tests are pure unit tests of `lib/` functions in a Node environment — **there are
zero component tests, zero server-action tests, zero RLS tests, zero integration tests, and
zero end-to-end tests**, despite `@testing-library/react` + `jsdom` being installed.

| Feature | Existing automated test | Browser QA needed | Required account/state | Blocker |
|---|---|---|---|---|
| Signup / email confirm | None | **Yes** | Fresh email | **Email confirmation wall** (§2.2) |
| Login / logout / password reset | None | Yes | Any account | Password reset needs working SMTP |
| Route protection (`proxy.ts` + DAL) | None | Yes | Signed-out + signed-in | None |
| Onboarding (5 screens, curriculum/geography) | None | **Yes** | New unonboarded account | None (CV-upload step needs Anthropic) |
| CV import + review screen | None | Yes | Account + PDF/DOCX | `ANTHROPIC_API_KEY` |
| Profile / Digital Twin (add-edit achievements) | Scoring dimensions only (`__tests__/scoring/*`, 9 files) — the *math*, never the CRUD or the form | **Yes** | Onboarded account | None |
| Sports section | None | **Yes** | Onboarded account | None (0026 is live) |
| Story Bank (`story_notes` + outlines) | None | **Yes** | Onboarded account + ≥1 achievement | **Migration 0029 not applied**; outlines also need `ANTHROPIC_API_KEY` |
| CV Generator (`/profile/cv`, print-to-PDF) | None | Yes | Account with portfolio items | None |
| Portfolio (`/profile/portfolio`) | None | Yes | Account with items | None |
| Profile completeness / strength | `completeness.test.ts` | Light | Account | None |
| Peer benchmarking | `benchmarking/compute.test.ts` | Light — expect "not enough students" | Account | `SUPABASE_SECRET_KEY`; also genuinely n=0 |
| Dashboard / prioritization | None (`lib/search/rank` is a different ranker) | Yes | Onboarded account | Thin without data |
| AI Advisor | None | **Yes** | Onboarded account | `ANTHROPIC_API_KEY` — **never once run against a live model** |
| Weekly plan generation + reflection loop | None | **Yes** | Onboarded account | `ANTHROPIC_API_KEY` |
| University discovery (World→Europe→country) | None | Yes | Signed-in | Needs data (§2.1 inconclusive; seed likely unapplied) |
| University detail / requirement check | `requirements/evaluate.test.ts`, `requirements/dedup.test.ts` | Yes | Signed-in + a university with programs | Requirements data absent |
| Admission outlook | `admissions/outlook.test.ts` | Yes | Target university saved | Needs university statistics (none exist) |
| Target universities / applications / deadlines | None | Yes | Account | None, but thin without data |
| Opportunities browse/match/save | `opportunities/matching.test.ts`, `dedup.test.ts` | Yes | Account | Opportunity data absent |
| Global search / command palette | `search/rank.test.ts` | Yes | Account with content | None |
| Public profile `/u/[id]` + privacy toggle | None (privacy verified by manual SQL only) | **Yes** | Two accounts, one public | None |
| Connections (request/accept/decline/remove) | None | **Yes** | Two accounts | Notifications silently absent without secret key |
| Messaging send/receive | None | **Yes** | Two accounts, accepted connection | Same |
| Unread/read state | None | **Yes** | Two accounts, unread message | None (computed from `messages`) |
| Block / unblock | None (manual SQL matrix only) | **Yes** | Two accounts | See §6 findings — real UI bug |
| Report message | None | **Yes** | Two accounts | Unverifiable without SQL editor (insert-only RLS) |
| Disconnect → messaging revoked | Manual SQL only | **Yes** | Two accounts, accepted then removed | See §6 — history becomes unreachable in UI |
| Settings: name, capacity, busy mode, visibility | None | Yes | Account | None |
| Data export (`/api/export-data`) | None | Yes | Account | None — but see §6 gap |
| Account deletion | None | Yes | Throwaway account | **`SUPABASE_SECRET_KEY`** |
| Notifications | None | Yes | Two accounts | **`SUPABASE_SECRET_KEY`** |
| Admin panel (`/admin`) | None | Yes | Account with `is_admin = true` | Flag must be set via SQL editor — no UI to grant it |
| Background jobs (4 routes) | None | Curl, not browser | — | `CRON_SECRET` + Tavily/Anthropic/Scorecard |
| Rate limiting (AI + export) | None | Hard to test manually | Account | Needs many rapid calls |
| Scoring math / normalization | 11 test files, 113 assertions total | Not needed | — | None |
| UUID validation | `validation/uuid.test.ts` | No | — | None |

---

## 6. Findings from this pass's code read (messaging/social, not previously documented)

These were found by reading the shipped code against the QA scenarios below. None were fixed
(read-only pass). Severity is QA/UX unless stated.

1. **Block direction is invisible to the UI, and the copy asserts the wrong one.**
   `is_blocked_between(a, b)` is deliberately symmetric and returns only a boolean (correct —
   it must not leak who blocked whom). But `features/messaging/conversation-thread.tsx` renders
   that boolean as *"You've blocked this student"* and offers an **Unblock** menu item. If **B
   blocked A**, then A sees "You've blocked this student" — factually wrong — and A's "Unblock"
   click calls `unblockUser(B)`, which deletes `where blocker_id = A and blocked_id = B`,
   matches **zero rows, returns no error**, and the UI optimistically flips to unblocked. A then
   composes a message and gets "You can't message this person." Not a security hole (RLS holds,
   and direction still isn't disclosed) but a genuinely confusing loop for the blocked party.
   Correct fix needs a direction-aware server read (e.g. "did *I* block them", which `blocked_users`
   already allows the blocker to query) separate from the symmetric "can I send" boolean.

2. **Disconnect makes message history unreachable in the product, despite the schema
   deliberately retaining it.** Migration 0027 goes out of its way to denormalize `messages` so
   history survives a removed connection ("do not destroy evidence needed for abuse reports"),
   and the RLS `select` policy correctly still allows both participants to read it. But
   `app/(app)/messages/[userId]/page.tsx` renders a "You can only message accepted connections"
   empty state whenever the connection is not `accepted` — including for reading — and
   `getConversations()` builds the conversation list *from accepted connections only*, so the
   thread also disappears from `/messages`. Net: the data is retained at the DB layer and
   invisible at the product layer to both parties. Whether that's the intended product behavior
   is a founder call; either way it should be a deliberate decision, not an accident of the list
   query. **QA note: do not test "disconnect preserves history" through the UI — it will look
   like history was destroyed. Verify it in the SQL editor.**

3. **No realtime; the recipient must reload.** Nothing subscribes to Supabase Realtime, and the
   thread keeps local state after an optimistic append (`id: optimistic-…`) without a
   `router.refresh()`. `revalidatePath` on the server does not update an already-rendered client
   component. So: A's sent message appears instantly on A's screen **whether or not it was
   persisted** (the persistence proof only comes from the server action's error return), and B
   sees nothing until B navigates or reloads. Expected for V1, but a tester will otherwise
   report "messages don't arrive."

4. **Data export omits Sports, story notes, messages, connections, and blocks.**
   `EXPORT_TABLES` in `app/api/export-data/route.ts` lists 25 tables but not
   `sports_experiences` — a section the product calls first-class — nor `messages`,
   `connections`, `blocked_users`, `message_reports`, or `notifications`. `story_notes` rides
   along on its parent rows, so that one is covered. For a product whose export exists to
   satisfy a minor-safe/GDPR-shaped commitment, the Sports omission in particular is a real
   gap, not a nicety.

5. **`markConversationRead` fires on mount unconditionally**, including when the thread is
   empty or the user is blocked. Harmless (the update matches zero rows) but it means a read
   receipt is set by *opening* the page, never by scrolling to the message — worth knowing when
   QA-ing unread counts.

6. **Nothing grants `profiles.is_admin`.** `requireAdmin()` 404s non-admins (good), but the flag
   can only be set via the SQL editor. Admin-panel QA is therefore gated on database access.

---

## 7. Minimum real browser QA scenario

Two accounts, one browser session each (use a normal window + a private/incognito window, or
two profiles — **not** two tabs of the same session).

**Preconditions before step 1 — all of these, or the scenario stalls:**

- Supabase dashboard → Authentication → **"Confirm email" disabled** on the QA project (or
  real SMTP configured and both addresses deliverable).
- Site URL / redirect allowlist includes `http://localhost:3000`.
- `supabase/migrations/0029_story_notes.sql` applied (otherwise Profile→Story Bank 500s;
  messaging itself is unaffected).
- Understand that **no in-app notifications will fire** for any step below unless
  `SUPABASE_SECRET_KEY` is set (§1.3). Navigate directly to `/connections` and `/messages`
  instead of waiting for the bell.
- `npm run dev`, and have the Supabase SQL editor open in another tab for the three steps
  marked **SQL-verify**.

| # | Step | DB state required going in | Expected result | Expected DB state after |
|---|---|---|---|---|
| 1 | Sign up Account **A**, complete onboarding | none | Redirects to `/onboarding` immediately (confirmations off), then `/dashboard` | `auth.users` +1; `profiles` row with `onboarding_completed = true` |
| 2 | Sign up Account **B**, complete onboarding | — | Same | second `profiles` row |
| 3 | As **B**: Settings → Visibility → **Public profile on** | B onboarded | Toggle persists on reload; a `/u/<B>` link is shown | `profiles.is_public = true` for B |
| 4 | As **A**: open `/u/<B-id>`, click **Connect** | B is public | Button flips to "Request sent". **If B is not public, expect the explicit error** "This profile isn't public…" — that guard is deliberate (migration 0024's fix) | `connections` row, `status = 'pending'`, `requester_id = A` |
| 5 | As **B**: open `/connections` → Incoming → **Accept** | pending row exists | Row moves to Accepted; a **Message** button appears (also on `/u/<A-id>`) | `status = 'accepted'`, `responded_at` set |
| 6 | As **A**: `/messages` → B → send "hello" | accepted connection | Message appears immediately in A's thread | `messages` row, `read_at = null` |
| 7 | As **B**: open `/messages` **(reload — no realtime)** | message exists | Conversation listed with **unread badge = 1**; opening the thread clears it | `read_at` set on that row |
| 8 | As **B**: reply "hi back" | accepted, unblocked | Sends | second `messages` row, opposite direction |
| 9 | As **A**: reload `/messages` | — | Sees B's reply; unread badge 1 → cleared on open | `read_at` set |
| 10 | As **B**: thread → ⋮ → **Block A** | accepted | Composer replaced by "Unblock to send a new message" | `blocked_users` row (blocker = B, blocked = A) |
| 11 | As **B**: try to send (should be impossible from UI) | blocked | No composer rendered — UI-level denial only | unchanged |
| 12 | **Blocked-send denial (the one that matters)** — as **A**, open the thread and send | B has blocked A | **Expected:** error *"You can't message this person."* **Also expect the §6.1 bug:** A's header wrongly says *"You've blocked this student"* and offers Unblock, which appears to succeed and changes nothing | **no new `messages` row** — SQL-verify |
| 13 | As **A**: hover any message from B → **Report** → submit a reason | any received message | Dialog closes with no confirmation UI (insert-only table, nothing reads it back) | `message_reports` row — **SQL-verify**, it is unreadable from the app |
| 14 | As **B**: ⋮ → **Unblock A** | B is the actual blocker | Composer returns | `blocked_users` row deleted |
| 15 | As **A**: send again | unblocked, still accepted | Sends normally | new `messages` row |
| 16 | As **A**: `/connections` → **Remove** the connection | accepted | Row disappears | `connections` row **hard-deleted** |
| 17 | **Messaging permission revoked** — as **A**, navigate directly to `/messages/<B-id>` | no connection row | "You can only message accepted connections" empty state, no composer. Thread also gone from `/messages` for both parties | unchanged |
| 18 | **Historical retention** — SQL-verify only | — | `select count(*) from public.messages where …` still returns every message from steps 6–15 | **rows retained** (§6.2: retained in DB, unreachable in UI — this is the discrepancy to confirm) |
| 19 | As **A**: try to send to B via the direct URL again | no connection | Blocked at three layers: page guard, server action re-check, and RLS `WITH CHECK` | no new rows |

Optional but recommended in the same session, since both accounts already exist:

- **Private-profile invariant**: B turns Public profile **off**, then A opens `/u/<B-id>` —
  expect the locked state. Re-run `supabase/tests/connection_privacy_manual.sql` if anything
  looks off; do not reason about it from the UI alone.
- **Account deletion**: only if `SUPABASE_SECRET_KEY` is set — delete Account A and confirm the
  cascade (profiles → everything). Do this **last**.
- **Mobile width (390px)** for `/messages`, the Sports section, and Story Bank — never checked
  at mobile width by any pass.

---

## 8. Production / deployment readiness

| Area | State | Needed before deploy |
|---|---|---|
| Required env vars | See §1.2 | Supabase URL + publishable key + **secret key** + Anthropic key at minimum; `CRON_SECRET` if jobs are scheduled; `NEXT_PUBLIC_APP_URL` set to the real domain |
| Optional env vars | Tavily, College Scorecard, `OPENALEX_CONTACT_EMAIL`, `ANTHROPIC_MODEL` | Degrade cleanly if absent |
| Committed secrets | **None** — verified | — |
| Placeholder secrets | **None remaining** — all unset keys are empty | — |
| Deploy config | **Absent.** No `vercel.json`, no Dockerfile, no platform config | Choose a host; Next.js 16 App Router with `force-dynamic` app routes needs a Node runtime, not static export |
| CI | **Absent.** No `.github/workflows` | At minimum lint + typecheck + test on push; nothing currently prevents a broken commit |
| Cron jobs | Four route handlers exist (`discover-opportunities`, `discover-requirements`, `sync-university-data`, `deadline-reminders`), all bearer-guarded by `CRON_SECRET`, and **`verifyCronRequest` correctly refuses everything when the secret is unset** — good default. **But nothing schedules them.** No `vercel.json` crons, no Supabase scheduled function, no GitHub Action | Add a scheduler; decide cadence per job |
| External APIs | Anthropic, Tavily, College Scorecard, OpenAlex. Provider-health tracking exists (`provider_health`); failures degrade rather than crash | Keys + a first real run. The ingestion pipeline has **never executed once** in any environment |
| Supabase migrations | 0001–0029 committed. **0029 confirmed not applied** to the dev project; 0028's application state unverified. No migration is run automatically by any deploy step | Apply 0028 + 0029, then `supabase/seed_drive_batch1.sql`; add migration application to the deploy runbook |
| Seed scripts | `supabase/seed.sql` (CLI-only, universities), `supabase/seed_drive_batch1.sql` (staged, **never executed against any Postgres**) | Apply the staged batch in a disposable environment first if one can be created |
| Email provider | **None, and none possible from the repo** — Supabase dashboard setting | Configure SMTP before any real signup; the built-in provider will not carry real traffic |
| Analytics | `product_events` + `logEvent`, privacy-conscious (structural signals only). **Silently no-ops without the secret key**; no dashboard reads it | Secret key; a way to read the table |
| Error monitoring | **None.** No Sentry/equivalent; errors go to `console.error` and vanish in a serverless environment | Add before real users — messaging/social failures are currently invisible post-deploy |
| Rate limiting | AI-backed actions + `/api/export-data` only, sourced from `ai_usage`. Ordinary CRUD relies on RLS ownership. **No rate limit on `sendMessage`, `sendConnectionRequest`, `blockUser`, or `reportMessage`** | For a product with minors messaging each other, message-send and connection-request rate limits are a real pre-launch item |
| Abuse / reporting infrastructure | `message_reports` table + insert-only RLS + a report dialog. **Nothing reads reports. No admin surface, no alerting, no moderation queue, no way to suspend a user.** Free-text fields have no moderation beyond AI system-prompt discouragement | A minimum viable moderation path: read reports, act on them, suspend/ban. Currently reports land in a table nobody can see |
| Legal | No professional review of minor-safe/COPPA/GDPR claims (unchanged since Chat 1) | Required before real minors sign up |

---

## BLOCKERS

Things that genuinely stop browser QA or launch. Ordered by what stops you first.

1. **Email confirmation wall — no email provider, no confirmable test accounts.** Every prior
   session's live QA died here; one unconfirmed leftover account is still in the dev project.
   Nothing in the repo can fix this — it is a Supabase dashboard change (§2.2). *Blocks: all
   browser QA.*
2. **`SUPABASE_SECRET_KEY` empty.** Blocks account deletion, all notifications, all product
   analytics, peer benchmarking, every background job, every global-data write, and any script
   that could create confirmed test accounts. Also the reason messaging QA will *look* broken
   (no notifications) when it is not. *Blocks: notification QA, deletion QA, data application,
   automated test-account creation.*
3. **Migration 0029 is not applied to the live dev database** (proved this pass:
   `42703 column activities.story_notes does not exist`). The Essay Story Bank shipped in
   `8ef7077` reads/writes that column. *Blocks: Story Bank QA entirely.*
4. **`ANTHROPIC_API_KEY` empty — the AI Advisor has never been run against a live model, ever.**
   The product's central promise ("what should I do next?") is unexercised end-to-end. Weekly
   plans, CV import, and Story Bank outlines are equally untested. *Blocks: the core product
   loop.*
5. **No moderation path for a product where minors message each other.** Reports are written to
   a table nothing reads; there is no admin surface, no suspension mechanism, and no rate limit
   on message send or connection requests. The messaging *authorization* model is strong and
   verified; the *abuse-response* model does not exist. *Blocks: launch, not QA.*

Also launch-blocking, unchanged from `docs/launch-readiness.md` and not re-litigated here:
near-zero real university/opportunity content, and no professional legal review.

## REQUIRED FOUNDER ACTIONS

Only things Claude cannot do — credentials, dashboards, legal, product decisions.

1. **Supabase dashboard → Authentication → disable "Confirm email" on the QA project** (and/or
   configure real SMTP). Also confirm Site URL + redirect allowlist includes
   `http://localhost:3000`. *This single toggle unblocks all browser QA.*
2. **Put a real `SUPABASE_SECRET_KEY` in `.env.local`** (Project Settings → API). Confirm it
   lands in `/Users/direncagankirik/Desktop/Founder/ORYN/.env.local` specifically.
3. **Apply the pending migrations and the staged seed**, via the SQL editor, in order:
   `0028_program_requirement_dedup_indexes.sql`, `0029_story_notes.sql`, then
   `seed_drive_batch1.sql`. (0029 is confirmed missing; 0028 is unverified.)
4. **Add `ANTHROPIC_API_KEY`** — and optionally `TAVILY_API_KEY`, `COLLEGE_SCORECARD_API_KEY`,
   and a generated `CRON_SECRET`. Verify with `npm run check:integrations` (read §2.1's caveat
   about what its Supabase check does and does not prove).
5. **Delete the leftover QA account** `oryn.qa.alpha.chat4@qamail.io` (Authentication → Users),
   or it self-resolves once #2 is done.
6. **Grant yourself `is_admin`** via SQL if you want to QA `/admin` — no UI grants it.
7. **Decide the two open product questions**, both consequential and neither guessable:
   the Drive-doc conflicts on messaging scope and the light/dark visual direction
   (`docs/known-issues.md`, first section); and whether message history *should* stay readable
   in-app after a disconnect (§6.2).
8. **Commission the legal review** (COPPA/GDPR-for-minors) before any real minor signs up.
9. **Choose a hosting platform + error-monitoring provider**, so the deploy and Sentry-shaped
   work below can actually be done.

## AGENT-FIXABLE

Safe for a later Claude session, no founder input needed beyond the credentials above.

- **A disposable test-account script** (`scripts/seed-test-users.ts`) using
  `auth.admin.createUser({ email_confirm: true })` to create/reset Accounts A and B plus the
  connection states the §7 scenario needs. Requires `SUPABASE_SECRET_KEY` at run time; the code
  can be written now. Highest-leverage QA fix in this list.
- **Fix the block-direction UI bug** (§6.1): a direction-aware "did *I* block them" read from
  `blocked_users` (already permitted to the blocker by RLS), so the blocked party sees accurate
  copy and no phantom Unblock button.
- **Add `sports_experiences` (and decide on `messages`/`connections`) to `EXPORT_TABLES`**
  (§6.4).
- **Rate-limit `sendMessage`, `sendConnectionRequest`, and `reportMessage`** — reuse the
  existing `lib/security/rate-limit.ts` pattern already used by `/api/export-data`.
- **An admin surface that reads `message_reports`** (plus `provider_health` failures) — the
  smallest useful moderation read path.
- **CI workflow** running lint + typecheck + test on push.
- **`vercel.json` (or equivalent) with cron schedules** for the four job routes.
- **Make `check:integrations` prove more than reachability** — e.g. assert an expected table
  exists and report row counts via the secret key when available (§2.1).
- **`router.refresh()` after a successful send**, or a Realtime subscription, so a message
  round-trip is observable without a manual reload (§6.3).
- **Component/action tests** — nothing currently tests any React component or server action
  despite the testing libraries being installed. Start with the messaging authorization actions,
  which are the highest-risk untested code in the repo.
- **Local Supabase CLI setup** (`supabase/config.toml` + a documented `supabase db reset` flow)
  so future sessions get a disposable DB and `seed.sql` becomes usable.

## NICE-TO-HAVE

Not blocking launch or QA.

- Playwright end-to-end coverage of the §7 scenario, once test accounts can be created
  programmatically.
- `auth_rls_initplan` performance pass across the ~40 owner-scoped RLS policies (correctness-
  neutral, pre-existing).
- Opportunity moderation/review state before a discovered record becomes `active`.
- Realtime messaging (Supabase Realtime) rather than reload-to-see.
- `handle_new_user()`'s `EXECUTE` grant narrowing — needs a live GoTrue to test against.
- `profiles.target_geography` is collected at onboarding and never read.
- `RecommendationClass`'s unused `consider` / `deprioritize` values.
- Per-item public-profile visibility (currently whole-profile on/off).
- Base UI `Progress` hydration mismatch (`aria-valuetext` locale).
- Messages/Sports/Story Bank mobile-width visual verification (partly covered in §7's optional
  block).
