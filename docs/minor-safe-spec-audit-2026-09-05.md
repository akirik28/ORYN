# AGENTS.md §12 ("Minor-Safe Product Design") audited against code — 2026-09-05

Every claim below is against the current code on `main` (`3d2a9115`), not memory and not
`LEGAL_REVIEW.md`/`DATA_RIGHTS_AUDIT.md`'s own prior text — those two documents were read
and their claims re-verified against today's actual files, not just cited. Per CEO's own
two rules from today: **code is real, a document asserts** (`LEGAL_REVIEW.md` was wrong
about the Anthropic data-sent claim earlier this session — a document's date doesn't mean
its content is still true); and **"exists" and "works" are different claims** (a table can
carry a policy nothing calls, same shape as this morning's notifications-guard finding).
Verdict on every item is one of the three CEO asked for: *exists and works (with proof)* ·
*doesn't exist* · *looks like it exists, not fully verified*.

## The one item that needed the most space: no public student messaging in V1

**This is built, fully wired, and would work end-to-end if switched on — which directly
contradicts this spec line's literal text.** Read in full because it's the headline
finding, not because I'm hedging on it.

`supabase/migrations/0023_social_v1.sql` and `0027_messaging.sql` — mutual-consent
connections (`connections` table, request→accept, not an open follow) and 1:1 messaging
(`messages` table, gated to an *accepted* connection only, re-checked at insert time, not
just hidden by the UI), plus `blocked_users` and `message_reports` for abuse handling.
`app/(app)/messages/actions.ts`'s `sendMessage()` really does insert into `messages` —
checks connection status, checks blocks, rate-limits, writes the row, notifies the
recipient. This is not dead schema; it is a real, callable, end-to-end feature.

**This was not accidental drift — it was a later, explicit, documented founder decision
that already quotes this exact spec line.** `docs/product-decisions.md`, "Chat 2 pass — V1
social/network scope (founder-approved, 2026-08-15)": the founder repositioned the product
mid-build to add a "Professional Network" pillar, and the session that built it flagged the
tension directly — *"`AGENTS.md`'s minor-safe section is explicit and non-negotiable-
adjacent ('avoid public-by-default profiles', 'do not build public student messaging in
V1')"* — and chose mutual-consent connections specifically **because** an open follow
model would let "any signed-in stranger attach themselves to a minor's profile with no
consent step." Mitigations actually built, not just claimed: no people-search/student
directory (`lib/search/` only ever searches the caller's own data); a "Connect" button
only ever appears on an already-public profile; messages only ever mediated by connection
status, not deleted on disconnect (dropped to preserve abuse-report evidence, per
`0027_messaging.sql`'s own comment); message permanence (no edit/unsend — "message
integrity matters for abuse review").

**Currently switched off in the code's own default, not just described as off.** Both
`messages` and `connections` are gated behind server-only env-var kill switches
(`ORYN_ENABLE_MESSAGING`, `ORYN_ENABLE_CONNECTIONS`), exact-string-match `"true"` only (an
unset or ambiguous value resolves to off), deliberately absent from `.env.example`.
Verified the gate is actually *called*, not just defined: `requireMessagingEnabled()` /
`requireConnectionsEnabled()` are invoked at the top of every relevant page
(`app/(app)/messages/page.tsx:28`, `[userId]/page.tsx:21,30`,
`app/(app)/connections/page.tsx:21` — grepped directly, not assumed), 404ing rather than
redirecting so the URL doesn't even reveal the feature exists. Every export in
`messages/actions.ts` calls `assertMessagingEnabled()` first. A dedicated test
(`__tests__/messaging/messaging-hidden.test.ts`) checks this **per exported function**,
specifically because an earlier, similar flag (the social feed's) only had a per-file
string-match test that would still pass with one bad call site.

**What I did not check**: the actual live value of these two env vars in the real
deployed (Vercel) environment right now — I verified the code's default and the kill-
switch mechanism, and three internal docs (most recently `docs/deploy-readiness-fresh-
database-2026-09-02.md`, three days old) independently state both are unset in the
deployment they checked, but I did not query Vercel's config directly this session. If
you want that pinned down to the minute, it's a fast, separate check.

**Bottom line for counsel**: the feature exists, is real, and is not live to any student
today under its own default. Whether "built but switched off, with a founder-authorized
scope change on file" is an adequate answer to "AGENTS.md says don't build this" is
exactly the kind of question this report exists to hand to you rather than settle here —
recommend adding it to `LAWYER_FLAGS` (`lib/legal/content.ts`), which currently has 9 open
items and none of them are this one.

## The other ten items

**1. Minimize data collection — looks right, judgment call, not independently modeled
against a "necessity" standard.** `profiles` (migration `0002`): `birth_year` (integer),
not a full birthdate — matches Phase 2's own explicit instruction ("do not unnecessarily
expose full birth date if birth year is sufficient"). `country`/`city` (text), not a
precise address. `school_name`/`graduation_year`/`curriculum` — all directly serve the
product's stated purpose (opportunity/university matching). No field found that looks
collected without a clear product use. I did not attempt a formal minimization audit
(comparing every column against a documented lawful purpose) — that's a legal-standard
judgment, not a code-presence check.

**2. No unnecessary identification documents — confirmed absent.** Searched the whole
app/features/lib/migrations tree for passport/national-ID/government-ID/kimlik/SSN
patterns: zero real hits (the only matches were unrelated substrings in CSS class names).
No such field exists in `profiles`, onboarding, or evidence upload.

**3. Evidence genuinely optional — exists and works, schema-level, not just a UI
convention.** Every achievement table's `evidence_status`/`verification_status` column is
`not null default 'self_reported'` (migrations `0004`, `0005`, `0026`, `0079` — eight
tables checked). A row is complete and valid with zero evidence attached; evidence is a
separate, later action (`uploadEvidence()`, `app/(app)/documents/actions.ts`) that moves
the status forward. This is enforced by the schema default, not merely by no `<input
required>` in one dialog.

**4. Account deletion — exists and works, independently re-verified.**
`deleteMyAccount()` (`app/(app)/settings/actions.ts:403`): removes Storage objects first
(`removeAllUserStorage`, merged `4409b65d` per `DATA_RIGHTS_AUDIT.md`'s own status note,
confirmed present in today's file), then deletes the `auth.users` row via the admin
client, which cascades through 41 of 42 live owner tables (`on delete cascade`,
independently confirmed against live `oryn-qa-scratch` `information_schema` per that same
audit). One deliberate, disclosed exception: `ai_usage.user_id` sets null rather than
cascading, anonymizing the row (no prompt content ever written there — verified against
`lib/ai/usage.ts`'s actual insert call) rather than deleting it; already flagged as an open
question in `LAWYER_FLAGS.aiUsageAnonymization`, not silently decided either way.

**5. Document deletion — exists and works.** `deleteEvidence()`
(`app/(app)/documents/actions.ts:126`): removes the Storage object first, only deletes the
`evidence_files` row once that succeeds — the deliberately safer failure direction (a
storage failure keeps the row and the retry option; the alternative order could silently
orphan a file with no record it ever existed).

**6. Data export — exists and works, with one specific, already-documented gap.**
`/api/export-data` covers 37 tables (29 plain `user_id` + 7 participant-pair tables +
`profiles`), including the newer messaging/connections/social tables, with an honest
`meta.complete`/`incompleteTables` flag rather than letting a failed read look identical
to a genuinely empty one. One known, unresolved gap, found by `DATA_RIGHTS_AUDIT.md` and
still true today: `birth_year_changes` (migration `0072`) has RLS enabled with **no
select policy at all**, so if it were added to the export table list today it would run,
return zero rows for every student, and report success — the exact "looks like it works,
doesn't" failure shape. Left as an open, named design choice (add a select-own policy vs.
read via the admin client) in that same doc, not fixed.

**7. Privacy controls — exist.** Settings has a real Visibility section
(`VisibilityForm`, backed by `updateVisibility()` — the `is_public` toggle plus an
optional "looking for" status), a `contact_info` table where every single contact field
(phone/email/LinkedIn/Instagram/GitHub/website/Twitter/Discord) has its own independent
`private`/`connections`/`public` visibility enum (migration `0033`), and per-category
notification toggles (`updateNotificationPreferences`).

**8. Public-by-default profiles — confirmed false.** `profiles.is_public boolean not
null default false` (migration `0023`) — every account starts private. The public view
(`public_profiles`) is a security-definer view over a hard-coded column whitelist that
explicitly excludes `birth_year`/`school_name`/`city`/`is_admin`/`profile_strength_score`
(the view's own comment names this reasoning), granted to `authenticated` only, never
`anon` — not a search-engine-indexable page, sign-in required even to view one.

**9. School/student information exposure — mostly clean, one feature checked in
detail.** The public-profile view (item 8) never selects `school_name` at all. The one
feature that *does* use it is "People You May Know"
(`lib/social/people-you-may-know-query.ts`): it queries `school_name` server-side to find
candidates at the same school, but the returned shape
(`{id, displayName, headline, reasons}`) never includes the school name text itself —
the UI-facing signal is the literal string `"Same school"`, nothing more specific,
confirmed by reading the actual reason-string generator
(`lib/social/people-you-may-know.ts:87`). It also only ever matches against profiles that
are already `is_public = true` (both the candidate-gathering queries and the final
filter check this) — it does not cross-reference private students' school data. This
feature currently only renders behind the same Connections gate as item 11's headline
finding (`app/(app)/connections/page.tsx` calls `requireConnectionsEnabled()` before
anything on the page runs, `getPeopleYouMayKnow` included), so it is presently inactive by
the same kill switch.

**10. No unnecessary precise location — confirmed.** `profiles` carries only
`country`/`city` (free text). The only `latitude`/`longitude` columns anywhere in the
schema belong to `universities` and the canonical institution registry (migrations
`0016`, `0038`) — geodata for *institutions*, sourced from College Scorecard, unrelated to
any student's own location.

## What this changes about the founder's lawyer list

`LAWYER_FLAGS` currently tracks 9 open questions (KVKK language, legal basis,
international transfer, minor consent, retention, `ai_usage` anonymization, AI-model-
degradation disclosure, liability, Turkish legal review, opportunity-image licensing).
**None of them is "we built student-to-student messaging and it contradicts our own
written minor-safety rule."** That is the one recommendation from this audit: add it, with
the specifics above (built, gated off by default, founder-authorized scope change on
file, safety mitigations in place) so counsel is reacting to the real shape of the
feature, not a one-line surprise.
