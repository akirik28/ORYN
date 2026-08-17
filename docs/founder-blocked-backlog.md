# Founder-Blocked Backlog

Canonical, single list of everything left that needs founder/dashboard/credential/legal
access — nothing here is a code task an agent session can finish itself. When this list
is empty, ORYN is unblocked. Cross-referenced from every other doc that used to repeat
this information; update here first, not in five places.

Each item: **exact action**, **why it's blocking**, **what it depends on**.

> Looking for *what to do first*, not *the full list*? **[FOUNDER-START-HERE.md](./FOUNDER-START-HERE.md)**
> sequences the subset that actually gets the app running, in order, with expected results.
> This file stays the complete inventory — including the optional and later-stage items
> that ordered path deliberately leaves out.

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

## 16. ~~Apply migrations 0033 → 0037 (Professional Profile & Networking Pack)~~ — RESOLVED 2026-08-17

**Applied to `oryn-qa-scratch`**, along with `0028` and `0030`–`0032`, which had also
never been applied. `contact_info`, `featured_items`, `skill_endorsements`,
`recommendations`, `profile_views` and `profiles.headline/about/open_to/show_gpa` now
exist.

`0037` had to be fixed first: it used `create or replace view`, which Postgres only allows
to *append* columns, so inserting `headline`/`about` next to `display_name` failed with
`42P16: cannot change name of view column "country" to "headline"` — on live and on any
fresh database. It now drops and recreates the view and re-issues its grant.

Still not exercised in a browser: the code paths for these features have never served a
real signed-in request. See the Phase 12 note in `docs/live-db-reconciliation.md`.

## 16b. Decide whether Education (and therefore GPA) appears on the public profile

**Action**: decide, as a product/minor-safety call, whether a student's public `/u/[id]`
profile may show an Education section — school name, and GPA behind the existing
per-student `profiles.show_gpa` opt-in.
**Why this is blocked, not built**: two parts of the product currently contradict each
other, and reconciling them is a disclosure decision about minors, not a wiring task.
`docs/product-decisions.md` records a deliberate choice that the public portfolio omits
the `education` category entirely, reasoning that "a public GPA/school-name toggle feels
like a materially bigger disclosure... worth a deliberate look, not an oversight";
`school_name` is likewise on `public_profiles`' forbidden-column list and regression
tested as such. Migration `0033` then added `profiles.show_gpa` with a comment promising
GPA "is only ever shown on the public profile when this is true" — a promise nothing can
keep while education isn't public at all.
**What was done instead (2026-08-16)**: the owner-facing "Show my GPA on my public
profile" checkbox has been withheld from the UI, because a control that silently does
nothing is a worse defect than a missing one. The column, the Server Action path, and any
value already stored are untouched, and `updateProfessionalIdentity` no longer writes the
field, so an unrelated headline/About save can't reset it. Nothing about GPA privacy
changed; GPA remains not publicly exposed.
**To unblock**: say yes or no. If yes, the wiring is small — include `education` in
`getPublicPortfolio`, strip `meta` (the "GPA x/y" string) unless `show_gpa`, add
`school_name` to the public column set, and restore the checkbox. If no, drop the
`show_gpa` column in a future migration and this item closes.
**Depends on**: nothing technical — a founder decision, and plausibly a legal review
touchpoint given the minor-safety framing (item 13).

## 17. ~~Apply migration 0038 + seed_entities_drive_batch1.sql~~ — RESOLVED 2026-08-17

**Closed by the live-database reconciliation.** Both artefacts named here are gone.

`0038_canonical_institutions.sql` was never applied to anything and has been deleted: the
live project already carried a richer canonical registry (`canonical_entities` and nine
supporting tables), built directly against the project and never committed. Applying 0038
would have created a second, competing identity system. The repo now converges on the
live design — see `docs/live-db-reconciliation.md` for the full trace.

`seed_entities_drive_batch1.sql` was deleted too, and replaced by
`supabase/seed_canonical_delta.sql`, which is a genuine delta rather than a replay: the
Drive pack's 54 schools and 77 universities were already live (14 of those universities
under a QS-style parenthetical name, so inserting them would have created real
duplicates), leaving 17 organizations actually missing. Those 17 are imported.

`npm run entities:backfill-report` still needs `SUPABASE_SECRET_KEY` to run — that part of
this item stands, and moves to item 3's credential ask.

## 18. Enable leaked-password protection (Supabase Auth)

**Action**: turn on "Leaked password protection" in the Supabase Auth dashboard
(Authentication -> Policies). It checks new passwords against HaveIBeenPwned.
**Why it's blocked**: it is a project setting, not schema — no migration can enable it,
and it is not exposed through the MCP tooling.
**Blocks**: nothing functional. It is the one security-advisor finding from the
reconciliation that cannot be fixed in code.

## 19. Decide what to do about 43 duplicate university identities

**Action**: review the 43 pairs now sitting in `entity_verification_queue` with
`blocker='possible_duplicate'`, and for each either merge with
`merge_canonical_entities(source, target, reason)` or give the two rows distinct
city/country values.
**Why it's blocked**: they are almost certainly the same institution ingested twice with
differently-written cities ("Boston" vs "Boston, MA"), but "almost certainly" is not the
bar for merging real entities, and a name-similarity heuristic must never run unattended.
Each needs a human to confirm against an official source.
**Blocks**: nothing today — duplicates make search noisier, not wrong.

## 20. Decide what `official_verified` means for 78 university entities

**Action**: either attach primary-source evidence rows to the 78 university entities
currently marked `official_verified`, or downgrade them to `source_verified`.
**Why it's blocked**: no university entity has any `entity_evidence` row at all, so the
registry is asserting a verification state its own evidence model does not support. Which
way to resolve it is a data-trust decision, not a reconciliation one — and this product's
own rule is that a verification claim must be backed by a source.
**Blocks**: any UI that surfaces a "verified" badge for universities.

---

## Environment-capability gap (not founder-blocked, noted for completeness)

**RLS/server-layer integration testing** was investigated this pass (not skipped
unexamined — see `docs/production-route-audit.md`'s "Server-layer / RLS integration
testing" section for the concrete Docker/PostgREST/auth-schema investigation) and
correctly not built: it would need either a real Supabase project or Docker becoming
available in the execution environment, neither a "give me a credential" ask. Not on the
numbered list above because there's no single founder action that unblocks it — it's a
standing capability gap, revisit if either becomes available.
