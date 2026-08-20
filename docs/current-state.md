# ORYN Current State

Single short operational source of truth. **Rewritten in place, not appended to**, at each
integration checkpoint — history lives in `docs/handoffs/*` and `git log`, not here.

**Read `docs/ORYN_WORKSTREAMS.md` for who owns what right now, and
`docs/MASTER-EXECUTION-STRATEGY.md` for the enduring product/build direction — this file only
answers "what is actually true right now."**

## Measurement provenance (read this before trusting any number below)

This file mixes two genuinely different kinds of fact, and previous versions blurred them
under one implicit "as of the date at the top" framing — fixed here per an explicit
coordination-protocol correction:

- **Code state** is measured against a specific commit on a specific branch. It goes stale
  the moment anyone pushes. Re-run `git log --oneline -1 <ref>` before trusting it.
- **Live database state** is measured by directly querying the `oryn-qa-scratch` Supabase
  project (`qtcvcflzxbuagvvwahhu`) at a specific timestamp. It goes stale the moment anyone
  writes to that project (the app itself, a script, or the Supabase MCP tools from *any*
  concurrent session). Re-measure before trusting it for anything more than a same-day
  approximation.

| What | Value |
|---|---|
| Code measured against | `origin/main` @ `9c06610` ("docs: add canonical parallel execution strategy") |
| Code measurement timestamp | 2026-08-20 |
| Live DB measured against | `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), via Supabase MCP `execute_sql`/`list_migrations` |
| Live DB measurement timestamp | 2026-08-20 (this checkpoint) |
| Also true, not yet merged to `main` | `oryn/counselor-data-quality-v1` @ `88061d6` (Claude B / PROD-B — counselor data-quality hardening, 5 shipped correctness fixes, capability map; already has `origin/main` merged in, zero conflicts); `oryn/programs-pipeline-reconciled` @ `13f2e9a` (Claude A / DATA-A — admissions-URL + programme-catalogue acquisition) |

If this file and a handoff doc disagree, this file is newer and wins *for the date stamped
above*. If this file and a fresh live measurement disagree, the live measurement wins — this
file is a snapshot, not a live view.

## Branches / integration state

- `main` (`9c06610`) has not merged either active product branch yet. Per
  `docs/MASTER-EXECUTION-STRATEGY.md`, Computer B (`oryn/counselor-data-quality-v1`) is the
  default integration owner.
- `oryn/counselor-data-quality-v1` (Claude B): branched off `main`@`1f9c474`, has since merged
  `main`'s 3 newer commits back in cleanly (byte-identical patches for 2 of them, a pure new-
  file addition for the third — zero conflicts). Carries counselor data-quality fixes (see
  `docs/current-product-capability-map.md` for the full audit) plus 5 shipped correctness
  fixes this checkpoint: form-select default-value bug (`cb630c5`), opportunity eligibility
  unknown-vs-confirmed distinction (`5cdf1bd`), counseling-scoped profile completeness
  (`072313d`), `profile_views` RLS gap (`6b715ac`, migration written not yet applied live),
  plus this coordination package.
- `oryn/programs-pipeline-reconciled` (Claude A): admissions-URL coverage campaign (batch 3,
  82 universities) + programme-catalogue pipeline work, `13f2e9a` latest pushed. Not yet
  merged to `main`.
- `oryn/counselor-core-v1`, `oryn/integration-2026-08-19`, `oryn/recovery-pre-integration-
  2026-08-19`, `oryn/university-intelligence-spine`: no commits ahead of what's already in the
  lineage above as of this check — treat as historical/superseded, don't build on them without
  first confirming their content hasn't already landed.

## Live database (measured 2026-08-20)

- `universities`: **1,019** rows.
- `university_programs`: **418** rows, **100% `verified_current`**, across **50** of 1,019
  universities. (Grown from a prior checkpoint's 198 rows / 49 universities — Claude A's
  active acquisition work; re-measure before citing either number as current for long.)
- `opportunities`: **301** rows, **94 `verified_current`** (31.2%, up from a prior
  checkpoint's 22.1%). Data-quality gaps, honestly still present: 276/301 (91.7%) missing
  `deadline`, 301/301 (100%) missing `eligible_countries` — this second one gates real
  eligibility matching and hasn't moved. Cycle status: 13 `open`, 215 `unverified` (71.4%,
  improved from 80.7%).
- `profiles`: 1 (pre-launch scratch project, expected).
- `target_universities`: 0.

### Migration 0043 (`university_duplicate_supersession`) — corrected finding

**Previous docs (`docs/founder-blocked-backlog.md`, this session's own earlier capability-map
draft) said this migration was "never applied." That is now stale.** Direct query against the
live DB this checkpoint: `list_migrations` shows `0043_university_duplicate_supersession` and
`0046_advisor_message_failure_state` both applied (DDL is live — the `duplicate_status`/
`superseded_by_id` columns and the `advisor_messages.status`/`error_message` columns genuinely
exist now). **But the 0043 *data backfill* has not run**: `select count(*) from universities
where duplicate_status = 'superseded'` returns **0**. The schema-level fix is live; the actual
9 known duplicate pairs are still only suppressed by the application-layer
`lib/universities/duplicate-supersessions.json` workaround, exactly as before. Whoever picks
this up next: the remaining work is a data migration (populate the now-live columns from the
JSON file, or re-derive them), not a schema migration — DDL access is no longer the blocker
for this specific item.

- **Not yet applied anywhere live**: `0047_structured_eligibility_facts.sql` (citizenship/
  grade fields — `opportunities.eligible_citizenships`/`eligible_grades`,
  `profiles.citizenship_countries`) and `0048_profile_view_visibility_guard.sql` — both exist
  only on `oryn/counselor-data-quality-v1`. **Migration numbering note for whoever writes the
  next one on any branch: 0047 and 0048 are claimed. Use 0049+.**

## External service status (measured 2026-08-20, this checkpoint, via `npm run check:integrations`)

| Service | Status |
|---|---|
| Supabase (anon key) | OK |
| Supabase (secret key) | **Failing — "JWT issued at future".** This is a *new* regression relative to the prior checkpoint's "OK" — likely a clock-skew or rotated/misconfigured secret-key issue, not a missing credential. Every secret-key-dependent write (account deletion, admin panel, notification writes, moderation) is currently broken in this environment until this is fixed. Founder action, see below. |
| Anthropic | Blocked — 400, insufficient credit balance (unchanged; billing, not a missing key) |
| Tavily | Blocked — HTTP 432, plan usage limit (unchanged) |
| College Scorecard | Missing credential (unchanged; optional, US stats obtained via a public bulk CSV workaround instead) |
| OpenAlex | OK (keyless, unchanged) |

## Security advisors snapshot (measured 2026-08-20)

Nothing new/alarming found. INFO-level "RLS enabled, no policy" on a dozen internal/staging
tables (`canonical_entity_merges`, `entity_verification_queue`, `program_research_queue`,
`provider_health`, `qs2027_import_staging`, etc.) — consistent with those being service-role-
only tables with no direct user-facing policy needed, not re-triaged individually this
checkpoint. One ERROR: `public_profiles` view is `SECURITY DEFINER` (pre-existing, part of the
reconciliation-era architecture, not new). A few WARN-level items (`pg_trgm`/`unaccent`
extensions in the `public` schema, two `SECURITY DEFINER` functions callable by
`anon`/`authenticated`) match this codebase's own documented deliberate design
(`is_blocked_between`'s own migration comment explains exactly why it's `SECURITY DEFINER` and
granted to `authenticated`) — not re-litigated here. Leaked-password-protection is disabled
(a Supabase Auth project setting, founder-toggle, unrelated to app code).

## Product (last live-verified in-browser: 2026-08-19, NOT re-verified this checkpoint)

Carried forward from the prior checkpoint, not re-confirmed today — re-verify before citing as
current if more than a few days have passed. Home dashboard, University Explorer, university
detail page, Opportunities, global search were live-verified in an authenticated session with
real data on 2026-08-19. Signup/login as a new account, messaging, `/admin`, account deletion,
applications CRUD, connections were not exercised (needed a founder credential unblock that
may or may not have landed since — check `docs/founder-blocked-backlog.md`).

## Founder actions required

Only items no Claude session can do unilaterally. Full detail:
`docs/founder-blocked-backlog.md`, `docs/qa-environment-readiness-audit.md`.

1. **New, time-sensitive**: fix the Supabase secret-key "JWT issued at future" failure found
   this checkpoint — check the project's service-role key hasn't rotated and this
   environment's clock/credential is current.
2. Add billing credit to the Anthropic account (key present; failure is insufficient-credit,
   not missing) — unblocks the Advisor, weekly plans, CV extraction, requirement/opportunity
   AI-structuring.
3. Resolve the Tavily plan-usage limit (HTTP 432) — unblocks `admissions_url` acquisition and
   opportunity/requirement discovery jobs.
4. Run the 0043 data backfill now that its DDL is confirmed live (see above) — moves the 9
   duplicate pairs from the JSON-file workaround to the real schema columns.
5. Apply migrations 0047/0048 (both written, reviewed, not yet live) once DDL access allows.
6. The remaining founder-blocked-backlog items (QA accounts, `is_admin` grant, legal review,
   hosting/deploy choice, error-monitoring provider, scholarship-sourcing policy, QS-ranking
   licensing position, etc.) — see that file directly rather than a second copy going stale
   here.

## Next phase

1. **Fix the Supabase secret-key regression** (new this checkpoint) — highest priority, it's
   an active break, not a known/accepted limitation.
2. **Run the 0043 backfill** now that DDL access is confirmed no longer the blocker for it.
3. **Continue the B1-B12 product-integration package** (Claude B) and the admissions-URL /
   programme-catalogue acquisition campaign (Claude A) — both already in flight, tracked in
   `docs/ORYN_WORKSTREAMS.md`.
4. **Opportunity data quality**: `eligible_countries` is still 100% unpopulated (301/301) —
   this gates real eligibility matching regardless of how good the matching *logic* is (see
   `docs/current-product-capability-map.md`'s Opportunities section for the logic-side fix
   already shipped this checkpoint).
5. **Production readiness**: legal review (COPPA/GDPR for minors), hosting + error-monitoring
   provider choice, CI running lint/typecheck/test on push — all founder decisions or founder-
   unblocked, listed above.
