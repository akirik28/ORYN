# ORYN Current State

Single short operational source of truth. **Rewritten in place, not appended to**, at each
integration checkpoint — history lives in `docs/handoffs/*` and `git log`, not here. This is
"here is what ORYN is right now," not a record of what happened to get here.

**Read `docs/ORYN_WORKSTREAMS.md` for who owns what right now (last touched 2026-08-29 — check
it's not itself stale before trusting an ownership claim), and `docs/MASTER-EXECUTION-STRATEGY.md`
for the enduring product/build direction.**

## Measurement provenance (read this before trusting any number below)

- **Code state** is measured against a specific commit on a specific branch. It goes stale the
  moment anyone pushes. Re-run `git log --oneline -1 origin/main` before trusting it.
- **Live database state** is measured by directly querying the `oryn-qa-scratch` Supabase
  project (`qtcvcflzxbuagvvwahhu`) via the Supabase MCP connector. Re-measure before trusting it
  for anything more than a same-day approximation — every count below was queried fresh for this
  checkpoint, none carried forward from the prior one.
- **Deployment state is not measured here at all.** Whether the app is actually deployed, whether
  the Vercel cron schedules below are actually firing, whether the founder's own `.env.local`
  holds real credentials — none of that is visible from a git checkout or from this session's
  Supabase MCP access, which is a separate credential path from the app's own runtime env vars.
  Flagged explicitly wherever it matters below rather than assumed either way.

| What | Value |
|---|---|
| Code measured against | `origin/main` @ `4188bada` |
| Code measurement timestamp | **2026-09-01 03:15** |
| Prior checkpoint | `2334f07`, 2026-08-22 19:40 — **208 commits since**, not individually reconstructed here; see `git log 2334f07..origin/main` for the full record |
| Gate on the checkpoint commit | lint clean · typecheck clean · **203 files / 2,998 tests** · production build compiles |
| Updated | 2026-09-01 evening, at `9ca9371d` — 78 merges since `0bd3206b`. The 03:21 version of this file described an i18n situation that no longer exists; that section is rewritten below rather than amended. |
| Live DB measured against | `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), via Supabase MCP, 2026-09-01 ~03:10 |
| Which migrations are actually live | `docs/migration-state.md` — probed from the schema, **not** from `schema_migrations`, which has no row for twelve of them |
| RLS re-verified live | 2026-09-01, at 78 tables (the figure in `SECURITY.md` had been 44); 78/78 enabled, no blanket SELECT on a `user_id` table, no `anon` grant without an `auth.uid()` predicate |

If this file and a handoff doc disagree, this file is newer and wins *for the date stamped
above*. If this file and a fresh live measurement disagree, the live measurement wins — this
file is a snapshot, not a live view.

## What ORYN is today

Capabilities the 2026-08-22 checkpoint described as missing or broken, verified against current
source and the commits that changed them — not from memory of what a lane intended to build.

- **Legal pages exist and are live**: `app/(legal)/privacy`, `/terms`, `/kvkk`, a footer, and
  signup consent — English and Turkish, both explicitly marked draft/unapproved-by-counsel in
  their own copy (`lib/legal/content.ts`'s `LEGAL_REVIEW_STATUS`). Account deletion now removes
  Storage objects before the DB row (`lib/account/delete-storage.ts`,
  `fix(settings): remove Storage objects before deleting an account, not never`) — it used to
  leave orphaned files behind indefinitely. Neither claim is "launch-ready legal compliance";
  both are "the thing the 08-22 checkpoint said didn't exist now exists and does what it says."
- **Turkish is complete across `.tsx`, and there are now four guards keeping it that way —
  but `.ts` was never scanned at all, and that is where the largest remaining block is.**
  `npm run check:i18n` reports **0 untranslated student-facing strings in `.tsx` files under
  `app/` and `features/`** (from 332 across 86 files that morning) and **0 pages with a
  build-time English title** (from 25). The catalogs hold 1,000+ keys in exact parity. Two
  files still show raw JSX and both are deliberate — one is bilingual by conditional, one is
  prompt-coupled.

  **Read that first number with its scope attached.** Until `a25d18ce` the script's `walk`
  collected `.tsx` and nothing else, so it reported zero while
  `features/profile/field-config.ts` — 400 lines, no locale reference, ~173 labels,
  placeholders, help text and select options — supplied **every achievement form a student
  fills in**, and `lib/scoring/completeness.ts` supplied the checklist whose labels become the
  dashboard's **top three actions for a brand-new profile**. Both are `.ts`. The claim was true
  of what was scanned and false of the product, and it was a lane tracing the empty-profile
  path that found it, not the guard. The script now prints a separate **Data modules** section
  listing locale-blind `.ts` files — candidates for a human, not a count, since a `message:` in
  `lib/` may be a student's toast or an operator's log line and only the consumer settles
  which.

  The guards matter more than the number, because each was written after a real defect:
  `__tests__/i18n/locale.test.ts` fails on catalog drift, on a **duplicate key** (which
  `JSON.parse` resolves silently by dropping one — it nearly broke four unrelated files), and
  on a new ICU `#` inside a plural (which formats with the active locale, bypassing the
  pinned `formatNumber` — it rendered "1.010 üniversite" against "1,010" elsewhere on the same
  page). `__tests__/i18n/translation-keys.test.ts` resolves every statically-decidable `t()`
  key, because next-intl renders an unresolved key as *visible literal text*.
  `__tests__/i18n/label-accessors.test.ts` fails when a locale-aware file indexes an
  English-only label map directly — the class that leaves no untranslated string behind and
  which no string count can see.

  **What the count still cannot see, and repeatedly did not:** strings held in const arrays
  and maps. Every package this day found more than the tool reported — one file counted as 1
  string contained 21, all inside a `FEATURES` array. Treat `check:i18n` as a ceiling for
  prioritising files, never as a definition of done inside one.

  AI output follows the student's language too, on five of six surfaces
  (`lib/ai/output-language.ts`). **Its quality is unmeasured** — the eval suite is
  measured at all, in either language: there is no output-quality eval suite: the tests
  around these surfaces assert prompt contents and usage logging, never what the model says
  back. Building one is free; running it costs model calls.

- **A Saved page exists** (`/saved`, secondary nav) — founder request, 2026-09-01. Two
  sections rather than one merged list, because "compare" means different things for a
  university and an opportunity. "Saved" includes every status except the two meaning *I took
  this off my list*, so applied/accepted/rejected all still appear — hiding `applied` would
  have hidden the most important rows. Opportunities had no compare mechanism at all before
  this; the university one's shape was mirrored rather than abstracted over, since two call
  sites is not enough information to design an abstraction from.

- **A scheduler exists in config** (`vercel.json`): four daily cron jobs — opportunity discovery
  (02:00), requirement discovery (04:00), university-data sync (06:00), deadline reminders
  (08:00) — hitting the four `app/api/jobs/*` routes built for Phase 30. **Whether they're
  actually firing depends on Vercel deployment state, which this pass cannot see.** The 08-22
  checkpoint's "opportunities pipeline has never run" claim about live data is very likely still
  true (`external_sync_jobs` would show it — not re-queried this pass, worth one live check) but
  isn't the same claim as "no scheduler exists," which is what's now fixed in config.
- **The dashboard no longer contradicts itself.** Home used to be able to tell a student their
  profile was "balanced" specifically in the one state that can only be reached when Oryn hasn't
  assessed their weakest dimension yet — and separately, mislabeled its own "areas assessed" /
  "no evidence yet" counts, both wrong on the same account that surfaced it (commit `a2967804`,
  `fix(dashboard): Home called an unmeasured profile balanced, and miscounted its own evidence`).
  Now uses the same `signalCoverage`/`isAssessed` predicates the rest of the product already used
  correctly, and the three surfaces (Home, Counselor, weekly plan) agree.
- **Admission outlook no longer computes a verdict from an empty profile.** `refreshAdmissionOutlook`
  now gates on `hasConfidentSignal` before producing Reach/Competitive/Strong language — confirmed
  6/7 live `target_universities` rows were affected by the old behavior before the fix (commit
  `178ff931`, merged `04f91ca9`).
- **The recommendation engine produces more than two of its four defined classes — but only on
  one of its two pipelines.** `lib/counselor/scoring.ts` (live on `/advisor` and `/dashboard`)
  deterministically produces `do`/`consider`/`deprioritize`/`avoid_for_now`. The older
  `lib/ai/weekly-plan.ts` → `lib/plan/persist.ts` path, which writes to the `ai_recommendations`
  table, still only ever writes `avoid_for_now` — two systems, not one that got fixed. See
  `docs/known-issues.md`'s "consider/deprioritize" entry for the full detail.
- **A verified, real accessibility fix landed tonight**: `role="alert"` on 22 form/dialog error
  messages (including the delete-account confirmation), a contrast-token split (`ink-4` vs
  `ink-3`, 21 real-text call sites moved), and the guardian-consent disclosure's own contrast
  fixed. A genuine upstream `@base-ui/react` Dialog focus-trap bug (Shift+Tab from the first
  element loses focus entirely) was found, minimally reproduced, and is tracked — not
  patched — in `docs/known-issues.md`, deliberately, since a hand-rolled fix would fork behavior
  owned by a library this product doesn't maintain.

## Live database (measured 2026-09-01 ~03:10, this checkpoint — every number re-queried, none
carried forward)

### The MVP's sixteen capabilities, checked against live data (2026-09-01)

Every loop in Phase 53's list has real rows behind it except two, and the two are the same
loop:

| | |
|---|---|
| weekly plans generated | 8 |
| profile score snapshots (profile evolution) | 26 |
| advisor conversations / messages | 5 / 26 |
| target universities / applications | 18 / 3 |
| saved opportunities / evidence files | 3 / 1 |
| ai_recommendations (the avoid_for_now log) | 110 |
| **weekly actions completed** | **0** |
| **actions with a reflection recorded** | **0** |

So *act → reflect → profile changes → priorities change* — Phase 10, and the thing that
separates Oryn from a task list — **has never closed once in live data.**

**It is not broken.** The path was read end to end: `app/(app)/plan/actions.ts` persists the
reflection, `lib/plan/status-patch.ts` includes those columns only when actually supplied,
`student-context.ts:266` reads them back, and line 376 renders them into the prompt under
"learn from these — don't just repeat what was skipped or didn't work". Unit tests cover the
patch and the dashboard control. It has simply never had data.

Worth one real pass before launch, by someone who can write to a live account: complete an
action, answer the reflection, and check whether the next plan changes. Nothing an agent
should do on the founder's account.

**And it is not the only feedback loop with no data.** Phase 12.1's other one — asking why a
student is not interested in an opportunity, and using that in future recommendations — is
collected and discarded. `not_interested_reason` is written by
`app/(app)/opportunities/actions.ts` and read by nothing in `lib/`. The *status* is honoured
(`lib/opportunities/matching.ts:115` excludes `not_interested` outright, so a rejected
opportunity does stop being recommended); it is the seven-category reason that goes nowhere.

Live today: 3 saved opportunities, zero `not_interested`, zero reasons. So it is latent
rather than a live defect — nobody has used that flow. But it means the product currently
asks a question it does not use, and *how* a reason should shape ranking ("too expensive"
→ deprioritise costly ones?) is a product decision rather than a wiring task.

Taken together: **both of the mechanisms that make Oryn learn from a student have never
run.** That is a usage fact, not a broken one — but it means the differentiating half of the
product is the least exercised.


- `universities`: **1,019** rows — **1,010 canonical, 9 superseded** — **unchanged from 08-22.**
  No university-catalogue growth since; the intervening work went into requirements, deadlines,
  and i18n instead.
- `university_programs`: **17,046** — also **unchanged from 08-22.** Same caveat.
- `university_requirements`: **1,325** (up from 1,254 — +71).
- `university_deadlines`: **470** (up from 396 — +74; includes the UK October-exception
  deadlines added today).
- `opportunities`: **421** total, **275 `active`** (up from 391/271 — +30 rows, +4 active).
  - **380/421 (90.3%) still missing `eligible_countries`** — proportionally about where the
    08-22 checkpoint's 351/391 (89.8%) was; the gap widened in absolute terms as new
    unresearched rows were added faster than the backfill closed old ones. The underlying risk
    is unchanged: `computeEligibility`/`evaluateOpportunityEligibility` both still read an empty
    array as *unrestricted*, not *unknown*.
  - **82/421 carry a deadline** (up from 60/391).
  - The Tier-1 six-row disable: **that query has now been run (2026-09-01), and the answer was
    not what the docs said in either direction.** Three rows were disabled on 2026-08-23
    (King's College London, St Andrews, the UCSC class page); three were missed and are still
    `active`. Reading the rows then changed the verdict again: none of the six match the
    "categorically wrong, never valid opportunity records" label they were filed under — each
    has a real pre-college programme and a correct official URL. What makes two of the three
    survivors retire-able is narrower: CMU's and NYU's rows are index pages whose specific
    programmes already exist as separate properly-titled active rows. **USC's does not, and
    disabling it would remove USC Pre-College from the catalogue** — it needs a retitle. Per-row
    verdicts and both SQL statements are in `docs/founder-blocked-backlog.md`; the shape is the
    same "umbrella row" question the S5 research lane raised independently, now cross-referenced.
  - **The wider ~80-defective-rows decision was re-measured the same pass and is now about 31.**
    Raw URLs in description bodies 77 → 1, descriptions restating their own title 77 → 7 (five
    purely cosmetic), truncated mid-word 45 → 31; roughly 34 of 275 active rows carry any hard
    defect, against 85 of 271 in August. Indicative rather than an exact delta — different
    detector — and the SQL is in the backlog so it can be re-run. What remains is milder than the
    item was framed around: the 31 truncated rows have good titles and real content.
- `canonical_entities`: **1,174** (up from 1,172). `entity_verification_queue`: **92 open**
  (36 `in_progress` + 56 `queued`), **11 `verified`** — down from "101 still open," real
  progress, not carried forward.
- `profiles`: **11** (up from 5 pre-launch-scratch) — **7 of 11 missing `birth_year`, 8 of 11
  onboarded.** Measured fresh this pass, not copied from an earlier verbal count from elsewhere
  in tonight's own work — a small (one-row) discrepancy from a number quoted hours earlier is
  exactly the kind of drift a live system produces between two real checks, not an error in
  either one.

**Not re-run this checkpoint, flagged rather than silently reused**: the full referential-
integrity/duplicate-programme sweep the 08-22 checkpoint ran (7 specific queries, all clean) —
the schema-level protections it found (the `university_programs_dedup_idx` UNIQUE index) are
still in the schema and still enforce the same guarantee structurally, so the *mechanism* is
still verifiably true from source even though the *live query* wasn't repeated today.

## Migrations

**Latest applied live**: `20260831211822_calendar_bound_fact_class` (repo: `0071`). The repo
has migrations through `0072_birth_year_change_audit.sql`.

**This is not a clean "N behind."** Checked directly against the live migration ledger (by
name, not just number, since not every applied migration's ledger name carries its repo file's
numeric prefix): `0060`, `0066`, `0070`, and `0071` are all live, out of numeric order relative
to what isn't — `0057` (deliberately withheld per its own header), the Security Gate 1 set
`0061`–`0065` (deliberately founder-gated, see `docs/founder-blocked-backlog.md`), and `0072`
(this session's own birth-year audit-trail migration) are not. `0058`/`0059`/`0067`/`0068`/`0069`
were not individually reconciled against the live ledger this pass — flagged, not assumed either
way; a precise migration-by-migration diff would need a dedicated pass, not a byproduct of this
one.

## External service status

**Per-checkout, not global** — `.env.local` is gitignored and not shared across worktrees, so
this only describes what this session's own worktree can see, not the founder's real checkout or
any deployment. Ran `npm run check:integrations` fresh this pass:

| Service | Status (this worktree) |
|---|---|
| Supabase (anon key) | Missing credential in this checkout |
| Supabase (secret key) | Missing credential in this checkout |
| Anthropic | Missing credential in this checkout |
| Tavily | Missing credential in this checkout |
| College Scorecard | Missing credential in this checkout |
| OpenAlex | OK (keyless) |

**Separately, this session's Supabase MCP connector has real, working live access** to
`oryn-qa-scratch` (used throughout this checkpoint's own measurements) — a different credential
path from the app's own `.env.local`, and not evidence either way about whether the app's own
runtime secrets are configured anywhere real. Whether the founder's actual `.env.local` (or a
real deployment's env vars) holds working Anthropic/Tavily/Supabase-secret-key credentials is
**not verifiable from this pass** — outside git, outside this session's tool access.

## Security advisors snapshot (measured 2026-09-01, live via Supabase MCP `get_advisors`)

Same previously-accepted WARN/ERROR items as every prior checkpoint, unchanged: `public_profiles`
SECURITY DEFINER view, `pg_trgm`/`unaccent` extensions in the public schema, two SECURITY
DEFINER functions callable by `authenticated`, leaked-password-protection disabled.

**The INFO-level `rls_enabled_no_policy` set has changed shape, not just count.** 14 tables now
carry it — `canonical_entity_merges`, `canonical_field_policies`, `deadline_research_queue`,
`entity_locations`, `entity_relationships`, `entity_verification_queue`, `external_sync_jobs`,
`global_university_discovery_queue`, `product_events`, `program_research_queue`,
`provider_health`, `qs2027_import_staging`, `requirement_research_queue`,
`university_profile_verification_queue` — **none of them the `_backup_*` tables the 08-22
checkpoint named.** Those still exist separately: `supabase/migrations/0069_drop_ad_hoc_backup_tables.sql`
is in the repo but not in the confirmed-live migration set above, and `founder-blocked-backlog.md`
item 33 ("ten `_backup_*`/staging tables... drop them, or move them out") is still open — so this
pass's 14-table list is a genuinely different, additional set the 08-22 checkpoint didn't
mention, not a renaming of the same one. These are internal research/queue/tracking tables with
no direct student-facing exposure, same risk class as the backup-table set.

## Founder actions required

Full detail: `docs/founder-blocked-backlog.md` (38 items) — **itself last touched 2026-08-22,
same as the prior checkpoint**, but that's less alarming than it sounds for this specific doc:
its contents are, by definition, things nothing but the founder's own authorization can close,
so an unchanged file plausibly means unchanged (still-blocked) reality rather than staleness —
confirmed for the two highest-priority items by direct re-read this pass:

1. Item 36 (admin self-grant, migration `0062`) — still open, still "written, not applied."
2. Item 30 (`public_profiles` anonymous read) — still open, same status.
3. The remaining 36 items were not individually re-verified this pass — the file's own
   08-22 vintage plus the reasoning above make outright staleness unlikely, but "unlikely" is
   not "checked," and a dedicated pass through that file specifically (the same method used for
   `docs/known-issues.md`) would be the honest way to close that gap, not this document.
4. Confirm email still off (Supabase dashboard) is unverifiable from git/MCP — deployment/dashboard
   state, not a code fact.

## Next phase

Not re-derived from this pass's own opinion — pointing at what's already decided elsewhere
rather than inventing a new roadmap:

1. `docs/founder-blocked-backlog.md` items 36 and 30 (privilege escalation, anonymous profile
   read) remain the two highest-priority founder actions on the whole list, per that file's own
   framing, unchanged.
2. `docs/counselor-core-plan.md`/`docs/counselor-core.md` describe the `lib/counselor/` pipeline
   this checkpoint found doing real, live work on `/advisor` and `/dashboard` — read those
   directly for where that effort is scoped to go next rather than a summary here.
3. `docs/known-issues.md` (refreshed the same night as this file) is the current, checked list of
   what's still actually wrong — read it directly rather than a summary here that will itself go
   stale.
