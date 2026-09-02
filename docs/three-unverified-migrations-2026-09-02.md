# Three migrations nobody verified — 0076, 0079, 0083

**Status:** report only. No code, no migration, no live write. Read-only throughout —
`information_schema`/`pg_catalog` reads, source reads, and read-only `select` queries against
`qtcvcflzxbuagvvwahhu` only.
**Trigger:** the founder applied all 14 pending migrations during the fleet pause. Six were
verified by the lanes that built them; these three weren't. Same standard as every prior
migration check tonight: does the real path run, does the degrade branch still compile into
something correct for a fresh deploy, and say plainly when "nothing has run since the
migration" is the honest answer.

## Summary

**All three migrations are live, confirmed against `information_schema`, not assumed.** What
differs is what happens next, and it's a different shape for each:

| Migration | Column(s) | Write path | Read/display path | Live evidence |
|---|---|---|---|---|
| **0076** | `ai_usage.degraded`, `.degrade_reason` | **Never attempted, by explicit design** — the values compute correctly but are dropped before the insert | N/A — nothing to read, nothing was ever written | 132 rows, 0 with `degraded=true`, 0 with a reason set |
| **0079** | `education_records.evidence_status`, `test_scores.evidence_status` | **Self-healed** — already attempts the write unconditionally, now succeeds since the column exists | **Still broken** — hardcoded to ignore the column, same shape `data_status` had | 21 rows across both tables, 100% `self_reported` (the migration's own backfill default) |
| **0083** | `external_sync_jobs.errors_encountered` | **Self-healed** — degrade-and-retry pattern, primary path now succeeds | N/A — the admin panel reads whatever's there | Still exactly 2 rows, both from 2026-08-22, unchanged since the last check — **nothing has run since the migration**, the honest answer given again |

## 1. Migration 0076 — `ai_usage.degraded`/`.degrade_reason`: not degrading, never attempted

**Live schema, confirmed:** both columns exist. `degraded boolean NOT NULL DEFAULT false`,
`degrade_reason text NULL`.

**This is not the same shape as the other two.** 0080 and 0083's consuming code already
*attempted* the real write and had a tested degrade-and-retry fallback for the specific
missing-column error — landing the migration was enough on its own, no code change needed.
**0076 is different: `lib/ai/usage.ts`'s `logAIUsage` never puts these two fields in the
insert payload at all.** Its own comment says why, in the present tense, describing a
condition that's now false and hasn't been revisited: *"Until that migration runs, PostgREST
rejects unknown columns for the whole insert... so these are omitted from the payload rather
than sent."* The migration has run. The omission is still unconditional — there's no `if` on
it, no retry, nothing that would pick the field back up now that it's safe to.

**The values aren't missing upstream — they're computed and discarded downstream.**
`lib/ai/limits/budget.ts`'s `selectModelForUser` computes a real `ModelSelection.degraded`/
`.reason` on every call (reading `ai_usage` itself to decide). `withUsageLogging`
(`lib/ai/usage.ts`) threads that straight into `logAIUsage({ ..., degraded: selection.degraded,
degradeReason: ... })` — the parameters exist, arrive correctly, and are used for exactly one
thing: a `console.log` on a successful degrade (line 78-80). They never reach the `.insert()`
call three lines above it. Confirmed there's no second write path to check: `logAIUsage`'s
insert (line 51) is the **only** `ai_usage.insert` anywhere in the codebase.

**Worth being precise about the failure mode, because it's not a gap — it's quietly wrong in
one specific way.** `degraded` has `DEFAULT false`, not null. Every row — past and future,
unless this changes — reads `degraded = false`, including a row where a real degrade
genuinely happened. That's not "we don't know," it's "we assert no," for exactly the calls
this column exists to flag. `degrade_reason` at least stays honestly `NULL`.

**Live-checked, not just reasoned about:** 132 total `ai_usage` rows, 0 with `degraded=true`,
0 with `degrade_reason` set — matches the code exactly. Checked whether any current-month
user is even over the $0.50 target (the condition that would make this visible today): the
two active users this month sit at $0.077 and $0.032, both well under — so there's no live
row this pass can point to as a currently-wrong `false`, but the code-level finding doesn't
need one: the day any user crosses the target, their calls will still show `degraded=false`
in the database, correctly reflecting nothing about what actually happened.

**Can this be exercised?** Yes, trivially and often — `ai_usage` gets rows on every AI call
(132 already, today). The columns aren't unexercised for lack of traffic. They're structurally
unwritable regardless of traffic, until `logAIUsage`'s insert payload is changed to include
them (a small, contained fix — add two keys to the object literal, remove the now-stale
comment explaining why they were absent).

## 2. Migration 0079 — `evidence_status` on `education_records`/`test_scores`: write works, read doesn't

**Live schema, confirmed:** both columns exist. `evidence_status` (enum
`self_reported`/`evidence_added`/`verified`/`verification_rejected`), `NOT NULL DEFAULT
'self_reported'` on both tables.

**The write path already self-healed — no code change needed, and it's already exercised
correctly.** `app/(app)/documents/actions.ts`'s `attachEvidence` always attempts
`supabase.from(linkedTable).update({ evidence_status: "evidence_added" }).eq(...)` for
whichever table the evidence links to — it was never gated behind a migration check, it just
used to fail (this table only has RLS-writable columns for the row's own owner, using the
session-scoped client correctly). The comment on that line explains the one real change:
*"Logged rather than silently swallowed (as this call was until migration 0079)"* — this was
one of the 9 instances the unchecked-write-guard fix caught (`d55698a6`, earlier today).
Both `education_records` and `test_scores` are in `EVIDENCE_LINKABLE_TABLES`
(`lib/validation/evidence.ts`) — students can attempt this today, and it should work.

**The read path is the `data_status` failure, confirmed a second time.** Two separate call
sites hardcode the new column out of the response, both explaining why in comments that are
now stale:

- `lib/portfolio/build.ts:38-39` — every education-record portfolio item gets
  `evidenceStatus: null`, hardcoded, with the comment *"education_records has no
  evidence_status column"*. `test_scores` isn't even one of `buildPortfolio`'s nine fetched
  categories at all — not a migration gap, a portfolio-scope gap that predates this migration
  entirely, worth naming since it's easy to conflate with the evidence-status question but
  isn't the same thing.
- `app/(app)/profile/page.tsx:451` and `:489` — the education and test-score
  `AchievementSection`s on the profile page don't pass an evidence-status-bearing prop at all,
  both commented *"No evidenceStatus yet... migration 0079... is written but not applied...
  Add it here... once the migration is applied and types are regenerated."*

**A second, real blocker sits under the first one: `types/database.ts` doesn't know the
column exists either.** Checked directly, not assumed from the comment: `EducationRecord` and
`TestScore` (`types/database.ts:448`, `:495`) have no `evidence_status` field in either
interface. This file is hand-authored in this codebase (confirmed by its own contents, not a
generated artifact), so fixing the read side needs two changes, not one: add the field to
both interfaces, then wire it into the two read call sites the same way `activities`/`awards`/
etc. already do a few lines below in each file.

`evidenceStatusPresentation()` (`lib/profile/evidence-status-presentation.ts`) already accepts
`null`/`undefined` safely and returns `null` — so today's gap renders as an absent badge, not
an error. Confirmed, not assumed, since it changes how severe this reads: nothing is broken
for a student today, a real signal is just invisible.

**Live-checked:** 12 `education_records` rows, 9 `test_scores` rows, **100% `self_reported`**
on both — the migration's own default, not evidence either way about whether the write path
works, since nobody has attached evidence to either type yet to exercise it. Consistent with
the read side never having shown any incentive to.

**Can this be exercised?** The write side, yes, any time a student uploads evidence for an
education record or test score — untested live this pass (a live write was out of bounds,
same boundary held all session), but every piece checks out statically: RLS-writable own-row
update, column exists, error path is checked and logged. The read side cannot be exercised
into showing anything no matter how many uploads happen, until the two-part fix above lands.

## 3. Migration 0083 — `external_sync_jobs.errors_encountered`: correct, live, and still unexercised

**Live schema, confirmed:** `errors_encountered integer NOT NULL DEFAULT 0`.

**Yours by context, and the context checks out.** `lib/jobs/run-with-tracking.ts` already had
the full degrade-and-retry pattern before today (`isUndefinedColumnError`, the same shared
helper `sync-us-universities.ts` uses) — its own comment names migration 0083 explicitly and
documents "write migrations, leave them unapplied" as this repo's normal state, not a gap to
special-case. `d55698a6` (today, "guard against unchecked writes, fix the 9 real instances
found") is oryn-3f's fix referenced in the assignment — checked its diff directly rather than
assuming what it did: it added error-checking to this file's tracking-row insert and both
status updates (3 of the 9 fixed instances were in this one file), and its own commit message
states `errors_encountered` was independently "confirmed applied" the same day. Re-confirmed
here, not just cited: live schema query above.

**Re-queried `external_sync_jobs` live, fresh this pass, not reused from the earlier Phase 30
audit:** still exactly 2 rows, both `deadline_reminders`, both `started_at` in the
2026-08-22 11:xx window — unchanged. Both now show `errors_encountered: 0` where an earlier
query this same session (before 0083 landed) couldn't select the column at all — **that's the
migration's own `DEFAULT 0` backfilling the two existing rows, not a new run.** Worth stating
precisely rather than letting a changed query result look like new activity: `column_default`
for `errors_encountered` is literally `0`, confirmed, which is exactly what a pre-existing row
gets the moment `ALTER TABLE ... ADD COLUMN ... DEFAULT 0` runs against it.

**Can this be exercised? No — same honest answer as before, re-confirmed rather than
repeated on faith.** None of the nine `app/api/jobs/*` routes have ever executed via cron
(`docs/scheduled-jobs-phase30-mapping-2026-09-01.md`, re-verified twice tonight already). The
code is correct and would populate `errors_encountered` on a real run the moment one happens
— there is nothing left to build here, only a deploy to actually see it exercised.

## What this means, plainly

- **0083 needed nothing.** Already correct, already live, genuinely blocked only on a
  deployment existing at all — the same honest ceiling this session has hit twice before.
- **0079's write half needed nothing either** — it already self-healed the moment the column
  landed. Its read half has the exact shape the `data_status` investigation already named:
  a real signal, correctly computed and stored, invisible in the UI. Fixing it needs two
  small, contained changes (two `types/database.ts` fields, two read-site wirings) — not a
  redesign.
- **0076 is the one that actually needs a code change to do anything at all.** The migration
  being live changed nothing here, because the write was never conditional on it — it was
  permanently omitted. And the specific way it's silent is worse than absent: `degraded`
  defaults to `false`, so the column will assert "never degraded" indefinitely rather than
  showing an honest gap.
