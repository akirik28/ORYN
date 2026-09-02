# ORYN Current State

Single short operational source of truth. **Rewritten in place, not appended to**, at each
integration checkpoint — history lives in `docs/handoffs/*` and `git log`, not here. This is
"here is what ORYN is right now," not a record of what happened to get here.

**Read `docs/ORYN_WORKSTREAMS.md` for who owns what right now (last touched 2026-08-29 — check
it's not itself stale before trusting an ownership claim), and `docs/MASTER-EXECUTION-STRATEGY.md`
for the enduring product/build direction.**

## ⚠️ `origin/main` is frozen — read this before checking anything against it (2026-09-01 ~15:40 onward)

**`git push origin main` is being refused by the local permission classifier in the integrating
session.** Not GitHub, not the token, not branch protection (`gh api …/branches/main/protection`
returns "Branch not protected"), and not a hold — branch pushes work normally throughout. Only
`main` is refused, and a denied action is not to be routed around.

**Consequence, and it has now misled multiple separate sessions independently:** `origin/main` has
been stuck at `cf3efcf9` since about 15:40. Local `main` has since accumulated **41 commits** it
doesn't have. Anything that reads the remote — `git log origin/main`, `merge-base --is-ancestor …
origin/main`, a fleet monitor polling GitHub — reports that the night stopped, and reports it
confidently. **Check the local ref**: `git -C <checkout> log --oneline -1 main`, and
`git rev-list --count origin/main..main` for the current size of the gap.

Two knock-on rules while this holds. **Cut new branches from local `main`, not `origin/main`** —
the latter is missing every merge since 15:40, including possibly your own. And **`git diff
origin/main <branch>` is meaningless** for a branch cut before the freeze: two-dot diffs render
`main`'s own progress as if it were the branch's content (this made one branch look like it
shipped 1,669 lines of code it does not contain). Use `main...branch` (three dots) or
`git merge-tree --write-tree main <branch>`.

Only the founder can clear this — by pushing `main` themselves or widening the permission. It is
item 0-bis on the launch plan.

## Measurement provenance (read this before trusting any number below)

- **Code state** is measured against a specific commit on a specific branch. It goes stale the
  moment anyone pushes. Re-run `git log --oneline -1 main` before trusting it — **local `main`,
  per the frozen-`origin/main` warning above; `origin/main` is not the honest ref right now.**
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
| Code measured against | local `main` @ `0cefab01` (`origin/main` frozen at `cf3efcf9` — see warning above; 41 commits behind) |
| Code measurement timestamp | **2026-09-01 ~17:55** |
| Prior checkpoint | `9ca9371d`, 2026-09-01 evening — **44 commits / 14 merges since**, not individually reconstructed here; see `git log 9ca9371d..main` for the full record |
| Gate on this checkpoint's commit | lint clean · typecheck clean · **211 files / 3,086 tests** · production build compiles |
| Live DB measured against | `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), via Supabase MCP, 2026-09-01, this checkpoint |
| Which migrations are actually live | **See `docs/migration-state.md`, not the Migrations section below** — that section's own "not applied" list was wrong by 2026-09-02 for four of five entries (re-probed directly); `migration-state.md` is the current, corrected table and also names a real live gap (`0048`) this checkpoint missed entirely |
| RLS re-verified live | 2026-09-01, this checkpoint: 78/78 `public` tables have RLS enabled, unchanged from prior checkpoint |

If this file and a handoff doc disagree, this file is newer and wins *for the date stamped
above*. If this file and a fresh live measurement disagree, the live measurement wins — this
file is a snapshot, not a live view.

## What ORYN is today

- **Legal pages exist and are live**: `app/(legal)/privacy`, `/terms`, `/kvkk`, a footer, and
  signup consent — English and Turkish, both explicitly marked draft/unapproved-by-counsel in
  their own copy (`lib/legal/content.ts`'s `LEGAL_REVIEW_STATUS`). Account deletion removes
  Storage objects before the DB row (`lib/account/delete-storage.ts`) rather than leaving
  orphaned files behind. Neither claim is "launch-ready legal compliance"; both are "the thing
  a prior checkpoint said didn't exist now exists and does what it says."

- **Turkish coverage is complete in `.tsx`, with four guards keeping it that way, and the
  frontier has moved to a well-scoped set of `.ts` files.** `npm run check:i18n` reports **0
  untranslated student-facing strings** across every `.tsx` file under `app/` and `features/`,
  and **0 pages with a build-time English title**. The two catalogs (`messages/en.json`,
  `messages/tr.json`) hold **1,174 keys each, in exact parity**. Two files still show raw JSX
  in the scan and both are deliberate, previously confirmed false positives: one is bilingual
  by conditional (`locale === "tr" ? … : …`), one is prompt-coupled.

  **The `.tsx`-only scope was itself a real gap, now closed.** Until `a25d18ce` the script's
  `walk` collected `.tsx` and nothing else, so it reported zero while
  `features/profile/field-config.ts` — no locale reference, ~173 labels, placeholders, help
  text and select options — supplied every achievement form a student fills in, and
  `lib/scoring/completeness.ts` supplied the checklist whose labels become the dashboard's top
  three actions for a brand-new profile. Both `.ts` files have since been translated. The
  script now prints a **Data modules** section listing the `.ts` files still locale-blind, as
  candidates for a human rather than a pass/fail count, since a `message:` in `lib/` may be a
  student-facing toast or an operator log line and only the call site settles which. Seven
  remain: `lib/validation/onboarding.ts` (8 candidate strings), `lib/story-bank/collect.ts`
  (7), `lib/jobs/schedule.ts` (4), `lib/moderation/report-status.ts` (4),
  `lib/requirements/evaluate.ts` (2), `lib/acquisition/verification.ts` (1),
  `lib/deadlines/ingest.ts` (1).

  The guards matter more than the count, because each was written after a real defect:
  `__tests__/i18n/locale.test.ts` fails on catalog drift, on a duplicate key (which
  `JSON.parse` resolves silently by dropping one), and on a new ICU `#` inside a plural (which
  formats with the active locale, bypassing the pinned `formatNumber`).
  `__tests__/i18n/translation-keys.test.ts` resolves every statically-decidable `t()` key,
  because next-intl renders an unresolved key as visible literal text.
  `__tests__/i18n/label-accessors.test.ts` fails when a locale-aware file indexes an
  English-only label map directly — the class of gap that leaves no untranslated string behind
  and that no string count can see. **What the count still cannot see: strings held in const
  arrays and maps** — one file this pass counted as a single string actually contained 21,
  inside a `FEATURES` array. Treat `check:i18n`'s 0/0 as a ceiling for prioritising files, not
  as a definition of done inside any one file.

  AI output follows the student's language on five of six surfaces
  (`lib/ai/output-language.ts`); the tests around those surfaces assert prompt contents and
  usage logging, not what the model says back. There is now infrastructure to close that —
  see the AI eval harness bullet below — but no real (paid) eval run has been executed yet, so
  output quality in either language is still unmeasured in practice, only measurable in
  principle.

- **A Saved page exists** (`/saved`, secondary nav). Two sections rather than one merged list,
  because "compare" means different things for a university and an opportunity. "Saved"
  includes every status except the two meaning *I took this off my list*, so
  applied/accepted/rejected all still appear.

- **A scheduler exists in config** (`vercel.json`): four daily cron jobs — opportunity
  discovery (02:00), requirement discovery (04:00), university-data sync (06:00), deadline
  reminders (08:00) — hitting the four `app/api/jobs/*` routes built for Phase 30. `docs/scheduled-jobs-phase30-mapping-2026-09-01.md`
  maps each route to its Phase 30 spec in detail (report-only; its own git-gap note is dated —
  written when local `main` was 18 commits ahead of `origin/main`, now 41, though its job-mapping
  content doesn't depend on that number). **Whether the crons are actually firing in a real
  deployment is still not visible from here.** `external_sync_jobs` now holds 2 rows (was 0) —
  both `job_name: "deadline_reminders"`, `status: "succeeded"`, both dated **2026-08-22**, not
  tonight. That's real evidence a run happened once, and equally real evidence it wasn't a
  live Vercel cron firing on schedule (nothing dated since, across ten days) — reads as a
  manual or test invocation, not proof the scheduler is live in production.

- **The dashboard no longer contradicts itself.** Home used to be able to tell a student their
  profile was "balanced" specifically in the one state that can only be reached when Oryn
  hasn't assessed their weakest dimension yet, and separately mislabeled its own "areas
  assessed" / "no evidence yet" counts. Now uses the same `signalCoverage`/`isAssessed`
  predicates the rest of the product already used correctly, and Home, Counselor, and the
  weekly plan agree.

- **Admission outlook no longer computes a verdict from an empty profile.**
  `refreshAdmissionOutlook` gates on `hasConfidentSignal` before producing Reach/Competitive/
  Strong language (commit `178ff931`).

- **The recommendation engine produces more than two of its four defined classes — but only on
  one of its two pipelines.** `lib/counselor/scoring.ts` (live on `/advisor` and `/dashboard`)
  deterministically produces `do`/`consider`/`deprioritize`/`avoid_for_now`. The older
  `lib/ai/weekly-plan.ts` → `lib/plan/persist.ts` path, which writes to the `ai_recommendations`
  table, still only ever writes `avoid_for_now`. Two systems, not one that got fixed. Full
  detail in `docs/known-issues.md`.

- **A verified, real accessibility fix landed this checkpoint**: `role="alert"` on 22
  form/dialog error messages, a contrast-token split (`ink-4` vs `ink-3`, 21 real-text call
  sites moved), and the guardian-consent disclosure's contrast fixed. `docs/accessibility.md`
  is now the standing Phase 46 status doc for this — first version, written to close a gap
  where the pass had landed in code but was never documented. A genuine upstream `@base-ui/react`
  Dialog focus-trap bug (Shift+Tab from the first element loses focus entirely) is tracked, not
  patched, in `docs/known-issues.md`, deliberately — a hand-rolled fix would fork behavior owned
  by a library this product doesn't maintain.

- **`docs/performance.md` now exists** — a Phase 48 baseline measurement, first version.
  Nothing in it was optimized; every number in it is what the codebase does today, not a target.
  Read it directly for the actual figures rather than a summary here.

- **An AI eval harness exists** (`lib/ai/eval/`, `scripts/run-ai-eval.ts`) and is safe to run by
  design: a plain `npm run eval:ai` makes **zero network calls** and only prints a cost
  projection; spending money requires both `--live` and `--confirm-spend` together, deliberately
  two flags rather than one so a partially copy-pasted command can't accidentally spend. Current
  fixture set: 12 cases (2 fixtures × 3 targets — `advisor_chat`, `weekly_plan`,
  `counselor_explain` — × en/tr). Projected cost for a real run: **$0.23** for target-model calls
  only, **$0.30** including judge calls. Input-token counts in that projection are real, from
  actually-assembled prompts; output-token counts are documented assumptions. No real (paid) run
  has been executed — this closes the "infrastructure to build" half of the AI-output-quality
  gap above, not the "actually measured" half.

## Live database (measured 2026-09-01, this checkpoint — every number re-queried, none carried forward)

### The MVP's sixteen capabilities, checked against live data

Every loop in Phase 53's list has real rows behind it except two, and the two are the same
loop:

| | |
|---|---|
| weekly plans generated | 8 |
| profile score snapshots (profile evolution) | 26 |
| advisor conversations / messages | 5 / 26 |
| target universities / applications | 18 / 3 |
| saved opportunities / evidence files | 4 / 1 |
| ai_recommendations (the avoid_for_now log) | 110 |
| **weekly actions completed** | **0** |
| **actions with a reflection recorded** | **0** |

So *act → reflect → profile changes → priorities change* — Phase 10, and the thing that
separates Oryn from a task list — **has never closed once in live data.**

**It is not broken.** The path was read end to end: `app/(app)/plan/actions.ts` persists the
reflection, `lib/plan/status-patch.ts` includes those columns only when actually supplied,
`student-context.ts:266` reads them back, and line 376 renders them into the prompt under
"learn from these — don't just repeat what was skipped or didn't work". Unit tests cover the
patch and the dashboard control. It has simply never had data. Worth one real pass before
launch, by someone who can write to a live account — not something an agent should do on the
founder's account.

**And it is not the only feedback loop with no data.** Phase 12.1's other one — asking why a
student is not interested in an opportunity, and using that in future recommendations — is
collected and discarded. `not_interested_reason` is written by
`app/(app)/opportunities/actions.ts` and read by nothing in `lib/`. The *status* is honoured
(`lib/opportunities/matching.ts:115` excludes `not_interested` outright), so a rejected
opportunity does stop being recommended; it is the seven-category reason that goes nowhere.
Live today: 4 saved opportunities, zero `not_interested`, zero reasons — latent rather than a
live defect, since nobody has used that flow yet.

Taken together: **both of the mechanisms that make Oryn learn from a student have never run.**
That is a usage fact, not a broken one — but it means the differentiating half of the product
is the least exercised.

- `universities`: **1,019** rows — 1,010 canonical, 9 superseded — unchanged.
- `university_programs`: **17,046** — unchanged.
- `university_requirements`: **1,325** — unchanged.
- `university_deadlines`: **470** — unchanged.
- `opportunities`: **421** total, **275 `active`**, **380/421 (90.3%) still missing
  `eligible_countries`** (`computeEligibility`/`evaluateOpportunityEligibility` still read an
  empty array as *unrestricted*, not *unknown*) — all unchanged this checkpoint. **122 rows sit
  in `under_review`**, fully traced this checkpoint (not merely counted): the gate that puts
  them there is working correctly, and the real gap — no code path anywhere promotes a row out
  of `under_review` once it's been reviewed — is documented with full evidence in
  `docs/known-issues.md`'s "All 122 `under_review` opportunity rows, traced" section. Read that
  directly; not summarized further here to avoid drifting from it.
- `canonical_entities`: **1,174**. `entity_verification_queue`: **92 open** (36 `in_progress` +
  56 `queued`), **11 `verified`** — unchanged.
- `profiles`: **11** — 7 of 11 missing `birth_year`, 8 of 11 onboarded — unchanged.

**Not re-run this checkpoint, flagged rather than silently reused**: the granular Tier-1
six-row and ~80-defective-description-row opportunity sweeps (per-row SQL and verdicts live in
`docs/founder-blocked-backlog.md` item 27) and the referential-integrity/duplicate-programme
sweep — all measured earlier the same day this checkpoint was written, not stale enough to
justify re-running the same queries again within one day. The schema-level protections behind
the integrity sweep (`university_programs_dedup_idx` UNIQUE index) are still in the schema and
still enforce the same guarantee structurally, independent of when the live query last ran.

## Migrations

**Superseded 2026-09-02 — see `docs/migration-state.md` for the current, authoritative
table.** The paragraph below is kept for its own history (it's what motivated the
2026-09-02 full re-check, which found this checkpoint's own "not applied" list for
`0057`/`0059`/`0072`/`0073`/`0074` was already wrong the day it was written), not as a
current source. Read `migration-state.md` first — it also names a *new* live gap (`0048`)
this checkpoint never checked for, and corrects `0062`/`0063`'s own file headers, which
claimed unapplied while being fully live.

**Latest applied live, as of this now-superseded checkpoint**: `0071`
(`calendar_bound_fact_class`). Every migration from `0057` through `0074` was individually
probed against live schema objects this checkpoint (columns, function grants, indexes,
table existence, column comments — not the ledger, which has no row for several of the
ones below that are, in fact, live).

**Applied, as of this checkpoint**: `0060` (`opportunity_country_eligibility_confirmed_open`),
the Security Gate 1 set `0061`–`0065` (admin self-grant guard, `message_reports` forgery guard,
and related — see `docs/known-issues.md`, which corrects an earlier framing of these as
founder-gated/unapplied; they are live), `0066` (opportunity language + image columns), `0067`
(revokes `anon` EXECUTE on `is_blocked_between` — confirmed by privilege check, no ledger row),
`0068` (target-university null-program dedup index — confirmed by index presence, no ledger
row), `0070` (documentation-only column comment), `0071`.

**Recorded "not applied" here — wrong by the next checkpoint (2026-09-02), re-probed
directly, all four now confirmed live**: `0057` (YÖK Atlas `kilavuz_kodu` column), `0059`
(`ucas_code` and three sibling columns, plus two widened CHECK vocabularies — confirmed via
`pg_get_constraintdef`, not just column presence), `0072` (birth-year change audit trail),
`0073` (`product_events` RLS policy). `0074` was also re-confirmed live (unchanged
conclusion, this time via `pg_get_constraintdef`/column default rather than assumed).
**`0058` is the one that was correctly "not applied" here and still is** — deliberately
withheld, the social-posts kill switch; still the founder's call, not resettled by any of
this. **`0048` was not on this checkpoint's list at all and is a real, live gap** — see
`docs/migration-state.md`. A same-checkpoint commit
(`fix(migrations): make the five unapplied migrations safe to re-run`) added `if not exists` /
`drop ... if exists` guards to `0057`, `0072`, and `0073` (`0059` and `0074` already had them)
— harmless now that all four are confirmed live, and still correct practice for whatever's
genuinely unapplied as of 2026-09-02 (`0048`, `0075`, `0076`, `0077`, `0078`).

**One live-state finding that contradicts a currently-open backlog item**: `0069`
(`drop_ad_hoc_backup_tables`) targets nine specific `_backup_*`/staging tables. None of the
nine — and no `_backup_*` table of any name — exist in the live database. Combined with `0067`
and `0068` showing the identical pattern (effect live, no ledger row), the most likely reading
is that `0069` was applied the same way. `docs/founder-blocked-backlog.md` item 33 still frames
this as an open decision ("drop them, or move them out") — flagged here, not edited there; see
**Founder actions required** below.

## External service status

**Per-checkout, not global** — `.env.local` is gitignored and not shared across worktrees, so
this only describes what this session's own worktree can see, not the founder's real checkout or
any deployment. Re-ran `npm run check:integrations` this checkpoint; unchanged from the prior one:

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
real deployment's env vars) holds working Anthropic/Tavily/Supabase-secret-key credentials
remains **not verifiable from this pass** — outside git, outside this session's tool access.

## Security advisors snapshot (measured 2026-09-01, this checkpoint, live via Supabase MCP `get_advisors`)

**Reverified this checkpoint, unchanged from the prior one, in every particular**: the same
WARN/ERROR items (`public_profiles` SECURITY DEFINER view; `pg_trgm`/`unaccent` extensions in
the public schema; two SECURITY DEFINER functions callable by `authenticated` —
`create_or_resolve_user_submitted_entity` and `is_blocked_between`; leaked-password protection
disabled), and the identical 14-table `rls_enabled_no_policy` set: `canonical_entity_merges`,
`canonical_field_policies`, `deadline_research_queue`, `entity_locations`,
`entity_relationships`, `entity_verification_queue`, `external_sync_jobs`,
`global_university_discovery_queue`, `product_events`, `program_research_queue`,
`provider_health`, `qs2027_import_staging`, `requirement_research_queue`,
`university_profile_verification_queue`. These are internal research/queue/tracking tables
with no direct student-facing exposure. RLS coverage: 78/78 `public` tables have it enabled.

## Founder actions required

Full detail: `docs/founder-blocked-backlog.md` (39 items, four resolved/struck as of this
checkpoint). Re-read directly rather than trusting a summary — but three concrete, evidence-
backed updates from this checkpoint:

1. **Items 30 and 36 are resolved.** Both verified live and struck by a peer session this same
   day (commit `5c6c740f`): the admin self-grant gap (36) and the `public_profiles` anonymous-
   read gap (30) are fixed and confirmed, not merely written. The file's own header blockquote
   still names them as the two highest-priority items — that line is now stale and should be
   re-ranked by whoever owns the file; not edited here.
2. **Item 29 (apply migration `0060`) also appears resolved**, per the live column check in
   **Migrations** above — `0060` is applied. The backlog entry has no strikethrough.
3. **Item 33 (nine `_backup_*`/staging tables) also appears resolved** — see the `0069` finding
   in **Migrations** above. Slightly less certain than item 29 (inferred from absence-of-table
   plus the `0067`/`0068` pattern, not a direct "this migration ran" record), but strong enough
   to flag rather than sit on.
4. The remaining 35 items were not individually re-verified this checkpoint. Given three of the
   four items actually checked turned out to be stale-in-the-file, "unlikely to have drifted"
   is a weaker assumption here than it would otherwise be — a dedicated pass through that file
   specifically, the same method used for `docs/known-issues.md`, is the honest way to close
   this gap, not this document.
5. Confirm email still off (Supabase dashboard) remains unverifiable from git/MCP — deployment/
   dashboard state, not a code fact.

## Next phase

Not re-derived from this pass's own opinion — pointing at what's already decided elsewhere,
plus what this checkpoint's own findings imply needs doing:

1. **`docs/founder-blocked-backlog.md` needs a priority re-rank by its owner** before it can be
   trusted as "what's next" again — its stated top two (items 36, 30) are done, and two more
   (29, 33) look done but unconfirmed by the file itself. Until that re-rank happens, this
   document cannot responsibly name a new "top priority" without repeating the same mistake
   the stale header made.
2. `docs/counselor-core-plan.md`/`docs/counselor-core.md` describe the `lib/counselor/`
   pipeline this and prior checkpoints found doing real, live work on `/advisor` and
   `/dashboard` — read those directly for where that effort is scoped to go next.
3. `docs/known-issues.md` (substantially rewritten this same night, across two passes) is the
   current, checked list of what's still actually wrong — read it directly rather than a
   summary here that will itself go stale.
4. `docs/accessibility.md` and `docs/performance.md` are new standing status docs (Phases 46
   and 48) worth a read by whoever picks up either area next — both explicitly state they
   describe current state, not a completed initiative.
