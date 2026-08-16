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

**Status (2026-08-16, Professional Profile pack session)**: `0029` (story_notes columns)
is now applied to `oryn-qa-scratch` via the Supabase MCP tools directly from this
session — confirmed additive/safe per this file's own reasoning, applied with no schema
conflicts. **Do not re-run 0029 against `oryn-qa-scratch`** — this status is specific to
that one project (project ref `qtcvcflzxbuagvvwahhu`); a different project (a fresh QA
project, staging, production) starts from its own actual state, always confirm via the
runbook's own pre-check rather than assuming this note carries over. `0028`, `0030`,
`0031`, `0032` are **still not applied**: the very next
`apply_migration` call (0028) was refused by Claude Code's own auto-mode safety
classifier ("Blocked by classifier"), and a subsequent read-only `list_migrations` call
was refused for the same reason — the classifier appears to gate the whole Supabase
MCP-write category in this session, not just the specific 0028 statement, so retrying
individual migrations wasn't attempted further per the tool's own instruction not to work
around a denial. **Unblock**: the user needs to grant this session (or a future one) an
explicit Bash/MCP permission rule for Supabase migration application — see the denial
message's own suggestion ("add a Bash permission rule to their settings") — after which
0028, 0030, 0031, 0032, and this pack's own 0033–0037 (item 16 below) can all be applied
in one sitting following the runbook.
**Action**: follow `docs/founder-environment-unblock-runbook.md` steps 3–8 for the
remaining `0028`, `0030`, `0031`, `0032` — each has its own pre-check/apply/post-check
SQL. Do not skip a post-check.
**Blocks**: `0028` blocks safe re-running of the university program/requirement seed
(no dedup index yet). `0030` blocks the moderation panel and `message_reports` export.
`0031` blocks realtime message updates (recipient must reload). `0032` blocks safe
re-running of
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

## 16. Apply migrations 0033 → 0037 (Professional Profile & Networking Pack)

**Action**: apply, in order, `supabase/migrations/0033_professional_profile_core.sql`
(contact_info, featured_items, profiles.headline/about/open_to/show_gpa),
`0034_skill_endorsements.sql`, `0035_recommendations.sql`, `0036_profile_views.sql`,
`0037_public_profile_headline_about.sql` (adds headline/about to the `public_profiles`
view). All five are additive-only (new tables/columns/enums/one `CREATE OR REPLACE
VIEW`), no drops, no data migration — same safety shape as 0028–0032 above. Blocked by
the same classifier gate described in item 3; needs the same permission grant to unblock,
then apply both ranges (0028–0032, then 0033–0037) in one sitting.
**Blocks**: every feature this session built code for — headline/About, contact
info + visibility, Open To, Featured items, skill endorsements, recommendations, and
profile-view counts all query tables/columns that don't exist yet on any environment
except a hand-run local Postgres. None of it has been exercised against a real request
in a browser; `npm run lint`, `tsc --noEmit`, `vitest`, and `next build` all pass, which
confirms the code is internally consistent, not that the live queries succeed.
**Depends on**: the same permission grant as item 3.

## 17. Apply migration 0038 + seed_entities_drive_batch1.sql (Canonical Entity Autocomplete System)

**Action**: apply `supabase/migrations/0038_canonical_institutions.sql` (new
`institutions` table + RLS, `aliases text[]` added to `universities`/`opportunities`,
nullable `*_id` linkage columns added to nine achievement/education tables — all
additive, no drops), then `supabase/seed_entities_drive_batch1.sql` — 19 verified
organizations, 54 verified Turkish schools (of 58 in the source; 4 excluded because
their own `release_state` is `HOLD_*`) with 126 source-verified aliases, 77 new
universities + 3 alias-enrichments of already-seeded ones (of 98 QS-2027-ranked rows —
21 already existed), and 5 opportunity aliases (of 7 — 2 excluded because their
canonical opportunity isn't in the source's own 16-row "official-current" set). Sourced
from the founder's Drive "10 ORYN Canonical App Data Pack — Verified 2026-08-15" (not
the superseded copy) — see `docs/entity-canonicalization-audit.md`'s "Drive integration"
section for the full accounting and `scripts/drive-import/README.md` for how to
regenerate it. Supersedes an earlier single-row `seed_institutions.sql` from this same
session (removed — this batch is a strict superset, and its Üsküdar American Academy
aliases are the actual source-verified three, not the four this session originally
guessed at before finding the real alias table). Blocked by the same classifier gate as
items 3 and 16.
**Blocks**: every canonical school/organization field this pass wired (education
records' school, and every achievement type's organization/team field) — none of it has
executed against a real database; `npm run entities:backfill-report` (also new this
pass) additionally needs `SUPABASE_SECRET_KEY` to run at all.
**Depends on**: the same permission grant as item 3, applied after 0033–0037 (item 16) —
0038 doesn't structurally depend on them, but keeping the pack's own migrations in their
numeric order avoids ever needing to reason about out-of-order application.

---

## Environment-capability gap (not founder-blocked, noted for completeness)

**RLS/server-layer integration testing** was investigated this pass (not skipped
unexamined — see `docs/production-route-audit.md`'s "Server-layer / RLS integration
testing" section for the concrete Docker/PostgREST/auth-schema investigation) and
correctly not built: it would need either a real Supabase project or Docker becoming
available in the execution environment, neither a "give me a credential" ask. Not on the
numbered list above because there's no single founder action that unblocks it — it's a
standing capability gap, revisit if either becomes available.
