# ORYN Current State

Single short operational source of truth. **Rewritten in place, not appended to**, at each
integration checkpoint — history lives in `docs/handoffs/*` and `git log`, not here. This is
"here is what ORYN is right now," not a record of what happened to get here.

**Read `docs/ORYN_WORKSTREAMS.md` for who owns what right now (last touched 2026-08-29 — check
it's not itself stale before trusting an ownership claim), and `docs/MASTER-EXECUTION-STRATEGY.md`
for the enduring product/build direction.**

## The `origin/main` freeze is over (resolved 2026-09-02 ~00:20)

The section that used to lead this file warned that `git push origin main` was being refused
locally, that `origin/main` had been stuck at `cf3efcf9` since 2026-09-01 ~15:40, and that any
tool reading the remote would confidently report the night had stopped. **That is no longer
true.** The founder added the permission rule, and `main` has been pushed many times since —
`origin/main` and local `main` have been level all night.

Kept as a short note rather than deleted, because the warning misled several separate sessions
independently while it held, and the two rules it produced are still generally good practice
here: cut branches from a ref you have actually just fetched, and prefer `main...branch`
(three dots) or `git merge-tree` over a two-dot diff, which renders `main`'s own progress as
if it were the branch's content.

## Measurement provenance (read this before trusting any number below)

- **Code state** is measured against a specific commit on a specific branch. It goes stale the
  moment anyone pushes. Re-run `git log --oneline -1 main` before trusting it — **local `main`,
  per the frozen-`origin/main` warning above; `origin/main` is not the honest ref right now.**
- **Live database state** is measured by directly querying the `oryn-qa-scratch` Supabase
  project (`qtcvcflzxbuagvvwahhu`) via the Supabase MCP connector. Re-measure before trusting it
  for anything more than a same-day approximation — every count below was queried fresh for this
  checkpoint, none carried forward from the prior one.
- **Deployment state IS measured, as of 2026-09-02.** It previously said it wasn't. It is now,
  and the answer changed the shape of several other findings: **ORYN has never been deployed.**
  The Vercel account holds zero projects, so no cron has ever fired — see
  `docs/nothing-scheduled-has-ever-run-2026-09-02.md`. Build and integration readiness were
  also measured directly (`npm run build` exits 0; Tavily and College Scorecard report missing
  credentials).

| What | Value |
|---|---|
| Code measured against | `main` @ `4a3f3573`, **pushed** — `origin/main` level |
| Code measurement timestamp | **2026-09-02 ~02:10** |
| Prior checkpoint | `0cefab01`, 2026-09-01 ~17:55 — **12 packages merged since**, see `git log 0cefab01..main` |
| Gate on this checkpoint's commit | lint clean · typecheck clean · **3,243 tests** · production build compiles |
| **Staleness pass** (not a full rewrite — see `docs/doc-staleness-audit-2026-09-02.md`) | **`main` @ `579093f4`, 2026-09-02, ~40 packages merged since the row above. 3,617 tests.** Everything below this table is otherwise as of the original checkpoint; only the specific corrections in that audit doc were re-verified and fixed in place. |
| Live DB measured against | `oryn-qa-scratch` (`qtcvcflzxbuagvvwahhu`), via Supabase MCP, 2026-09-02 |
| Which migrations are actually live | **`docs/migration-state.md` is the current, authoritative table** — every migration replayed against empty Postgres and diffed object-by-object against live; also names a real, live gap (`0048`) no prior checkpoint had found, and (added this pass) four live objects — three indexes plus a foreign key — with no migration file anywhere, which a replay cannot reproduce regardless of ledger state. |
| Deployment | **Never deployed.** Vercel account holds zero projects; no scheduled job has ever run. |

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

- **Added this staleness pass, since it's the specific shape of claim being hunted for: a real,
  per-student AI dollar cap already exists.** `lib/ai/limits/budget.ts` implements the
  founder's own $0.50 soft / $1.00 ceiling figures, verified from actual call sites (not
  inferred from feature names) to cover all ten distinct `ai_usage.feature` values through one
  shared `withUsageLogging` path — seven student-triggered, two background jobs, one
  admin-triggered. Full call-site-by-call-site trail: `docs/ai-spend-cap-2026-09-02.md`. If a
  claim that most AI features have no cost cap is heard anywhere, it's wrong; this is the
  correction, not the risk.

- **An AI eval harness exists** (`lib/ai/eval/`, `scripts/run-ai-eval.ts`) and is safe to run by
  design: a plain `npm run eval:ai` makes **zero network calls** and only prints a cost
  projection; spending money requires both `--live` and `--confirm-spend` together, deliberately
  two flags rather than one so a partially copy-pasted command can't accidentally spend. Current
  fixture set: 12 cases (2 fixtures × 3 targets — `advisor_chat`, `weekly_plan`,
  `counselor_explain` — × en/tr). Projected cost for a real run: **$0.23** for target-model calls
  only, **$0.30** including judge calls. Input-token counts in that projection are real, from
  actually-assembled prompts; output-token counts are documented assumptions.

  **Update, this staleness pass: two real, paid runs have since been executed** (one Sonnet
  baseline, one Haiku comparison) — raw logs preserved in `docs/eval-runs/`, full findings in
  `docs/ai-quality-eval-2026-09-02.md`. This closes the "actually measured" half named above,
  at least once; a single run per model is a first data point, not a trend line.

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

**Update, this staleness pass: the other feedback loop's read half is now built.** Phase 12.1's
`not_interested_reason` was collected and discarded as of the checkpoint above — confirmed
true at the time, independently re-derived rather than taken on report. Three of the seven
reasons (`not_interested_topic`, `too_expensive`, `location`) now feed future matching, as a
capped relevance penalty gated on 2+ repeated dismissals, never an eligibility exclusion — the
other four are deliberately left alone with the reasoning for each written into the code
(`too_competitive` is a judgment about the student, not the opportunity, and automating it
would push easier work toward exactly the students who least need it). Full detail:
`docs/not-interested-reason-audit-2026-09-02.md`. Still true as of this pass: **zero live
dismissals exist to exercise either path** — the `weekly_actions` reflection loop above and
this one are both real, tested, and both still waiting for a first real use.

Taken together: **both of the mechanisms that make Oryn learn from a student are built now, and
both have still never run on real data.** That is a usage fact, not a broken one — but it means
the differentiating half of the product is the least exercised.

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

**Superseded, and corrected.** The prior checkpoint probed migrations `0057`–`0074`
individually against live objects and published an "Applied / Not applied" split. That split
was **wrong for five files**. On 2026-09-02 all **76** migrations were replayed against an
empty Postgres and the result diffed object-by-object against live —
`docs/would-a-fresh-deploy-match-live-2026-09-02.md`. Trust that, not the earlier list.

**A fresh deploy reproduces live almost exactly, with two distinct kinds of exception.**
Zero replay errors. The live `profiles` guard trigger is `0062` + `0063` applied together,
reproduced byte-for-byte via `pg_get_functiondef` rather than by paraphrase — both files'
own headers, which claimed "WRITTEN BUT NOT APPLIED" while being fully live, are corrected
in place as of the same day. Separately: four live objects (three research-queue indexes,
one foreign key on `canonical_entity_merges.merged_by`) exist with **no migration file at
all**, found by this audit and a follow-up constraint sweep — a replay cannot reproduce
these regardless of ledger state, unlike the ledger-silent-but-tracked migrations below.

**Genuinely unapplied — five, not the six previously claimed:**
- `0058` (`social_posts`) — see the warning below.
- `0048` (`profile_view_visibility_guard`) — a **real, live gap**: any authenticated
  account can insert a `profile_views` row against an arbitrary profile UUID right now.
  Found the same day as the rest of this correction. Full detail in `migration-state.md`.
- `0075` (`deadline_notification_log`), `0076` (`ai_usage` degrade columns), `0077`
  (`weekly_actions.carried_forward`, still unapplied, re-verified this staleness pass — the
  column is absent live), all written the same night, all founder-gated as intended.
  **`0077` shipped a live outage** (weekly plan generation broke for most students —
  `getOrCreateWeeklyPlan` wrote a column that didn't exist) — **confirmed fixed this
  staleness pass**, read directly in `lib/plan/persist.ts`: the write path now catches the
  specific `42703` error for this exact column and degrades to a warning instead of throwing.
  Still the sharpest evidence yet that "write migrations, leave them unapplied" needs a second
  rule: code merged alongside one must degrade, not break, without it.

`0057`, `0059`, `0072`, `0073` and `0074` were listed as "not applied" at the prior
checkpoint. **All are live.** `0072` in particular was asserted unapplied in two separate
places (`docs/migration-state.md` and `lib/export/tables.ts`) as of 2026-09-01; it went live
within the following 24 hours and both were corrected on 2026-09-02.

> **⚠️ `0058` is a deploy-blocking decision, not a note.** It is entirely absent from live —
> no tables, triggers, policies or enums. A fresh deployment replays every migration, so it
> **would create the social-posts feature**, and **AGENTS.md Phase 54 lists social feed and
> likes as explicitly out of V1 scope.** The first production deploy would therefore switch
> on a spec-excluded feature as a side effect, with nobody having decided it. Nobody has
> touched it; the founder decides before deploying.

**The ledger cannot answer "what is applied."** `supabase_migrations.schema_migrations` has
no row for **26 of the 76** files — and **23 of those 26 are fully live**, applied outside
the CLI's ledger path. This is not a bounded incident around one block; it spans `0048`–`0059`
and `0072`–`0076`. Check the objects, never the ledger. Two migration files
(`0062`, `0063`) still carry a "WRITTEN BUT NOT APPLIED — founder-gated" header while being
fully applied, so the files describing the live security posture currently assert its
opposite; a correction pass is in flight.

Also: three indexes exist live with no migration trace at all, on two research-queue tables,
apparently tuned directly.

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

Full detail: `docs/founder-blocked-backlog.md`. Re-read it directly rather than trusting a
summary — the prior checkpoint found three of the four items it actually checked were stale
in the file, so "unlikely to have drifted" is a weak assumption here.

**Three concrete items from 2026-09-02, in priority order. All need the founder; none can be
done by an agent.**

1. **The founder is not an admin.** Across eleven profiles, exactly one account has
   `is_admin` — `oryn.qa.a@example.com`, a QA throwaway last used 2026-08-24. The founder's
   real, active account is on their **school** address, and `requireAdmin()` turns it away.
   Every spend and credit screen built for them is invisible to them. They cannot fix it
   in-app either: the column is trigger-guarded, so it needs a service-role SQL run. The
   statement is in `docs/admin-access-and-0062-divergence-2026-09-02.md`. Secondary question
   in the same place: whether a fake-email test account should keep the only admin role into
   a pilot.
2. **Decide `0058` before deploying** — see the warning under **Migrations**. Deploying
   replays it and switches on a feature the spec excludes from V1.
3. **Deploy.** It is the gate four subsystems sit behind, and until now it was one line on
   the backlog next to a domain and SMTP. Readiness was measured, not assumed: the production
   build exits 0, and `check:integrations` reports Supabase, Anthropic and OpenAlex healthy
   with **Tavily and College Scorecard missing** — declared in `.env.local` as empty values,
   and precisely the dependencies of the two jobs that have never run. `CRON_SECRET` is
   fail-closed: unset rejects every cron request including Vercel's own, producing a symptom
   indistinguishable from not having deployed. Full checklist in
   `docs/nothing-scheduled-has-ever-run-2026-09-02.md`.

Still open from the prior checkpoint and not re-verified here: confirm-email state (Supabase
dashboard, not visible from git or MCP), and a dedicated pass through
`founder-blocked-backlog.md` to re-rank it now that several of its top items are done.

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
