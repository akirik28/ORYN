# Founder-Blocked Backlog

Canonical, single list of everything left that needs founder/dashboard/credential/legal
access — nothing here is a code task an agent session can finish itself. When this list
is empty, ORYN is unblocked. Cross-referenced from every other doc that used to repeat
this information; update here first, not in five places.

Each item: **exact action**, **why it's blocking**, **what it depends on**.

---

## 1. Disable "Confirm email" (QA project)

**Action**: Supabase dashboard → Authentication → Sign In / Providers → Email → turn
"Confirm email" off, on the QA project only. Confirm Site URL / Redirect URLs includes
`http://localhost:3000`.
**Blocks**: every browser-QA step in `docs/browser-qa-checklist.md` — signup returns no
usable session without this, since no email provider exists in this repo to receive a
confirmation link.
**Depends on**: nothing — the single highest-leverage unblock, do this first.

## 2. Add `SUPABASE_SECRET_KEY`

**Action**: Supabase dashboard → Project Settings → API → copy the secret key → add to
`.env.local` as `SUPABASE_SECRET_KEY=...`.
**Blocks**: notifications, product analytics, account deletion, peer benchmarking, all
four background jobs, the entire `/admin` panel (including the new moderation Reports
section), and applying/verifying migrations 3–5 below via `npm run check:integrations`.
**Depends on**: nothing.

## 3. Apply migrations 0028 → 0032, in order

**Action**: follow `docs/founder-environment-unblock-runbook.md` steps 3–8 exactly —
each migration has its own pre-check/apply/post-check SQL. Do not skip a post-check.
**Blocks**: 0029 blocks all achievement saves (Activities/Projects/Awards/Research/
Volunteering/Work/Sports) from actually persisting — currently fails with a friendly-
but-real error. 0030 blocks the moderation panel and `message_reports` export. 0031
blocks realtime message updates (recipient must reload). 0032 blocks safe re-running of
the university sync job and honest null-handling on two opportunity fields.
**Depends on**: item 2 (secret key, for the post-checks) — the SQL editor itself doesn't
need it, but verifying each step does.

## 4. Apply `supabase/seed_drive_batch1.sql`

**Action**: runbook step 9, **after** 0028 and 0032 specifically (its
`university_requirements` insert depends on 0028's index; the fix that makes this safe
was verified against a real local Postgres this pass — see
`docs/migration-safety-audit-0028-0031.md`).
**Blocks**: university discovery, opportunities, and admission-outlook pages are
otherwise empty (21 identity-only universities, 0 programs/requirements/opportunities).
**Depends on**: item 3.

## 5. Add `ANTHROPIC_API_KEY`

**Action**: [console.anthropic.com](https://console.anthropic.com) → API Keys → add to
`.env.local`.
**Blocks**: AI Advisor (never once run against a live model), weekly plan generation, CV
extraction at onboarding, achievement refinement, research-project generation, Essay
Story Bank outline generation, opportunity/requirement extraction (also needs item 6),
and the admin-only "suggest a rule" AI assist on the requirement form.
**Depends on**: nothing.

## 6. Add `TAVILY_API_KEY` (optional)

**Action**: [tavily.com](https://tavily.com) → add to `.env.local`.
**Blocks**: the opportunity-discovery and requirement-discovery background jobs
specifically — everything else works without it.
**Depends on**: item 5 also needed for these two jobs (search + AI-structure both required).

## 7. Add `COLLEGE_SCORECARD_API_KEY` (optional)

**Action**: free, instant self-serve key at
[api.data.gov/signup](https://api.data.gov/signup/) → add to `.env.local`.
**Blocks**: the U.S. university sync job only (`sync-university-data`).
**Depends on**: nothing.

## 8. Add `CRON_SECRET` (needed only if scheduling the background jobs)

**Action**: `openssl rand -hex 32` → add to `.env.local` and to whatever scheduler calls
the four `/api/jobs/*` routes.
**Blocks**: nothing by default — `verifyCronRequest` is fail-closed, so the jobs simply
refuse every request until this is set (the correct default, not a bug). Only matters
once you actually want the jobs to run on a schedule rather than via the admin panel's
manual triggers.
**Depends on**: a hosting/scheduler decision (item 14) if you want it automated rather
than manually triggered from `/admin`.

## 9. Create two real QA accounts

**Action**: runbook step 11 — sign up Account A and Account B through the actual
browser at `/signup`, in two separate sessions.
**Blocks**: all of `docs/browser-qa-checklist.md`.
**Depends on**: item 1. Do **not** substitute `supabase/tests/*_manual.sql`'s inserted
test users — those have no GoTrue identity, can't log in through the browser.

## 10. Grant yourself `is_admin`

**Action**: `update public.profiles set is_admin = true where id = '<your auth.users id>';`
in the SQL editor.
**Blocks**: QA of `/admin` (moderation queue, provider health, job triggers) — no UI
grants this flag by design.
**Depends on**: item 9 (need your own account to exist first).

## 11. Product decision: Drive-doc conflict (messaging scope + visual theme)

**Action**: read `docs/known-issues.md`'s "Needs founder decision" section in full, then
say explicitly which is correct — the founder's own Drive planning doc (no DMs, light
theme) or the later same-day chat instructions that were actually built (messaging kept,
dark theme kept).
**Blocks**: nothing functionally today (the chat-instructed versions are what's live and
working), but this is a real, unresolved contradiction in the founder's own stated intent
that no session should keep guessing on indefinitely. If the doc is actually correct: the
messaging feature needs removing (schema, RLS, UI, nav — a real, scoped effort) and the
entire design system needs reworking toward light/white (also real, scoped).
**Depends on**: nothing — pure founder judgment call, still open as of 2026-08-16.

## 12. Product decision: suspension/ban mechanism for moderation

**Action**: decide what "suspended" means (duration, appealable how, what it blocks) —
then it's a real, scoped implementation task, not a column.
**Blocks**: the moderation panel (built, migration `0030`) currently supports
status-tracking and a resolution note, but has no actual punitive action beyond that —
an admin can mark a report reviewed but can't suspend or ban the reported user.
**Depends on**: nothing — deliberately scoped out of the minimum-viable moderation pass
pending this decision.

## 13. Professional legal review (COPPA/GDPR-for-minors)

**Action**: commission a lawyer review of the minor-safe/privacy engineering posture
described in `SECURITY.md`.
**Blocks**: any real minor signing up in production.
**Depends on**: nothing — required regardless of engineering state.

## 14. Hosting platform + deploy configuration

**Action**: choose a host (Vercel, etc.), connect the production Supabase project,
configure environment variables there, deploy, set up the custom domain.
**Blocks**: any real launch. Not attempted by any session so far — explicitly out of
scope per the founder's own earlier instruction.
**Depends on**: items 1–8 done against the *production* Supabase project, not just QA.

## 15. Error-monitoring provider (Sentry or equivalent)

**Action**: pick a provider, wire it in.
**Blocks**: nothing today, but every error currently goes to `console.error` and
vanishes in a serverless environment — messaging/social failures post-deploy would be
invisible without this.
**Depends on**: item 14 (needs a real deploy target to be worth setting up).

---

## Environment-capability gap (not founder-blocked, noted for completeness)

**RLS/server-layer integration testing** was investigated this pass (not skipped
unexamined — see `docs/production-route-audit.md`'s "Server-layer / RLS integration
testing" section for the concrete Docker/PostgREST/auth-schema investigation) and
correctly not built: it would need either a real Supabase project or Docker becoming
available in the execution environment, neither a "give me a credential" ask. Not on the
numbered list above because there's no single founder action that unblocks it — it's a
standing capability gap, revisit if either becomes available.
