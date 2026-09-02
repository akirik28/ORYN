# Which migrations are actually live

Measured 2026-09-01, corrected 2026-09-02 (0072, 0073), and corrected again 2026-09-02
against the full 76-migration set — 0057 and 0059 were wrong in the previous version of
this table (recorded "no", confirmed "yes" this pass), and 0048 is a genuinely new finding
this table never covered before. Full method, full object-by-object diff against a clean
replay, and the two other findings this same pass turned up (three live-only indexes, one
stale export-coverage comment) live in
`docs/would-a-fresh-deploy-match-live-2026-09-02.md` — this file stays the short,
per-migration reference; that one is the investigation.

## Read this part even if you skim the rest

**This database's own files cannot be trusted about its security posture, in both
directions at once.** `0062`/`0063` claimed unapplied while their guard trigger has been
live for some time — a caution nobody needed anymore, still printed. `0048` is the mirror
image: nothing anywhere warns it's missing, and it is — live right now, on
`oryn-qa-scratch`, a real RLS gap (see "0048" below), not a stale caution. Neither error
announces itself. Both were found the same way: by not trusting what a document or a tool
says about the database, and reading the database instead.

**`list_migrations` (the Supabase MCP tool) and `supabase_migrations.schema_migrations`
(the table it reads) are the same trap twice.** Both report Supabase's own tracking
metadata, not the schema. Two independent sessions hit this the same night: this file's
own 2026-09-01 version, corrected 2026-09-02 after 0072 turned out to be live despite
being recorded "no" the day before; and, separately, another lane nearly wrote off 0074 as
unapplied on `list_migrations`' word alone before re-probing directly. **Neither tool nor
table is evidence of anything, in either direction.** The only evidence is the object
itself: `information_schema.columns`, `to_regclass`, `pg_policies`, `pg_get_functiondef`,
`pg_get_triggerdef`, `pg_get_viewdef`, `pg_get_constraintdef`. Compare the *definition*
a migration and only that migration produces — not whether a same-named thing exists (see
lesson 2 below), and never the ledger (lesson 1).

## Two ways this table got it wrong before getting it right

Both are worth writing down, because both are cheap to repeat.

**1. The ledger is not the authority.** `supabase_migrations.schema_migrations` has no row
for twenty-six of our seventy-seven migrations. Twenty-three of those twenty-six are
demonstrably applied. Reading the ledger to answer "what is live?" reports finished work as
missing, and the gap is wider than it first looks — a first pass that stops at the block
named in a bug report (0061–0065) will miss that 0048–0059 and 0072–0076 are silent too.

**2. A probe that matches a *conventional* name proves nothing.** Having learned (1), a
schema probe alone still isn't enough — 0059 was gotten backwards twice before landing on
the right check:

- Checking `university_requirements.scope` finds nothing, because 0059 adds `scope` to
  `university_deadlines` — a different table with a same-named column already on it.
- Checking for the constraints `university_requirements_verification_state_check` and
  `..._evaluation_gate_check` finds both, unconditionally — Postgres auto-names check
  constraints `<table>_<column>_check`, so those exact names exist whether or not 0059
  ever ran. Only reading `pg_get_constraintdef` settles it: does the live constraint's
  actual value list match the migration's, not just its name.

The rule: probe for something the migration and *only* the migration produces, and compare
the **definition**, not the name. This is exactly how 2026-09-02's pass caught 0048 (below)
— a `record own view` policy existed under the right name, matching the pre-0048 baseline
migration (0036) exactly, not the 0048 fix.

## State

All 77 migration files, by whether the object they define is live — not by the ledger.

| Migration | Live | How it was established |
|---|---|---|
| 0001–0047 | yes | full table/column/trigger/policy/index diff against a clean replay, zero unexplained gaps in this range |
| 0048 profile_view_visibility_guard | **no — a real, live gap** | see "0048" below |
| 0049–0056 | yes | full diff, plus `pg_get_constraintdef` checked directly for 0052 and 0056's constraint-only edits |
| 0057 university_program_kilavuz_kodu | **yes** | `university_programs.kilavuz_kodu` present (was recorded "no" here as of 2026-09-01; re-probed 2026-09-02, now live — don't trust either date without re-checking) |
| 0058 social_posts | **no — deliberately** | `public.posts` and everything else it defines (6 triggers, 4+ policies, 3 enums) absent, confirmed at every level |
| 0059 schema_gaps_2026-08-22 | **yes** | all four columns present; both CHECK definitions (`pg_get_constraintdef`) match 0059's widened lists item-for-item, not the pre-0059 vocabulary (same "no" → "yes" correction as 0057) |
| 0060 | yes | recorded in the ledger |
| 0061 public_profiles_require_authenticated | yes | `public_profiles` view's `pg_get_viewdef` matches this file's `auth.uid() is not null` gate exactly |
| 0062 profiles_guard_protected_columns | yes | see "0062/0063" below |
| 0063 guard_computed_score_columns | yes | see "0062/0063" below |
| 0064 message_reports_verify_reported_user | yes | `create own report` policy, matches |
| 0065 close_insert_forgery_six_tables | yes | all six tables' select/update/delete-only policy sets present, no insert policy on any — the exact shape 0065 creates |
| 0066 | yes | recorded in the ledger |
| 0067 revoke_anon_is_blocked_between | yes | `is_blocked_between`'s live grants: `authenticated`, `postgres`, `service_role` only, no `anon` |
| 0068 target_university_null_program_dedup | yes | named unique index present |
| 0069 drop_ad_hoc_backup_tables | yes | zero `public._backup_*` tables remain |
| 0070, 0071 | yes | recorded in the ledger |
| 0072 birth_year_change_audit | yes | `birth_year_changes` table, `profiles_log_birth_year_change` trigger, `profiles.terms_accepted_at` all present — re-confirmed 2026-09-02, consistent with the 2026-09-02 finding below it |
| 0073 product_events_select_own | yes | `select own product_events` policy present, matching definition |
| 0074 deadline_freshness | yes | `university_deadlines.last_checked_at`/`data_status` present, correct default |
| 0075 deadline_notification_log | **no** | founder-gated, written 2026-09-02, table absent |
| 0076 ai_usage_degrade_columns | **no** | founder-gated, written 2026-09-02, `ai_usage.degraded`/`degrade_reason` absent |
| 0077 weekly_actions_carried_forward | **no** | founder-gated, written 2026-09-02, `weekly_actions.carried_forward` absent |
| 0078 global_university_discovery_indexes | **no** | written 2026-09-02 specifically to capture three indexes found live with no prior migration — see "the three untraced indexes" below |

Twenty-three migrations the ledger has no row for are nonetheless fully live. **One,
0048, is not — and unlike 0057/0059, this one is a real, currently-live gap, not a
harmless one.**

## 0048 — a real, live gap, found 2026-09-02

`profile_view_visibility_guard` fixes a genuine RLS hole from migration 0036: `record own
view`'s `WITH CHECK` only ever verified `viewer_id = auth.uid()`, never that the viewed
profile was actually visible to the viewer, so any authenticated account could insert a
`profile_views` row against an arbitrary profile UUID — public, private, connected or not.

Live's policy is still exactly that pre-0048 version:

```
"record own view"  INSERT  WITH CHECK (viewer_id = auth.uid())
```

`can_record_profile_view()`, the function 0048 adds and the fixed policy calls, does not
exist live at all (checked directly, not inferred). This is why the earlier version of
this table didn't catch it and 2026-09-01's pass didn't either: both diffed policy names
and table/column/trigger existence, never individual `WITH CHECK` clause text — the exact
blind spot lesson (2) above exists to name. The 2026-09-02 audit
(`would-a-fresh-deploy-match-live-2026-09-02.md`) found it by re-verifying this table's
specific claims about 0057/0059 with the rigorous method and applying the same rigor
sideways to 0048 while already in the file.

**What it actually costs, and it isn't nothing**: any authenticated student can confirm
whether an arbitrary UUID is a real profile (existence enumeration) and write a spam view
against it, including a private profile — profile_views' own SELECT policy is already
self-only, so nothing is readable back and no content leaks, but the write itself is real
and live right now. 0048's own header rates this correctly as low severity, not zero.

Worth one more sentence precisely because of who this product is for: this is a platform
built for 14-to-18-year-olds, and "confirm this stranger's profile exists" plus "write a
view record against someone who deliberately never made themselves visible to you" are
lower-stakes findings for an adult product than for a minor-safe one. Still low severity —
nothing readable back, per above — but the audience is the reason it's worth the founder's
attention now rather than whenever 0058 gets decided.

Not applied here — founder-gated, same as every other migration in this repo's history.

## 0062 / 0063 — corrected in the files themselves, 2026-09-02

Both files said "WRITTEN BUT NOT APPLIED... founder-gated... do not run against a live
project without explicit review" until this pass. Both are fully applied: `profiles_00_
guard_protected_columns` (all three columns — `is_admin`, `profile_strength_score`,
`completeness_percent`) and all five of 0063's other guard triggers
(`profile_scores`, `profile_score_snapshots`, `opportunity_matches`,
`student_requirement_evaluations`, `evidence_files`) are live, `pg_get_functiondef`
compared byte-for-byte against both files, not just checked by trigger name. The files'
own headers are corrected in place now — see the migrations themselves for the full note,
including that whether the founder's own review happened out-of-band isn't something a
schema diff can answer, only that live behavior matches what both files describe.

This also settles `docs/admin-access-and-0062-divergence-2026-09-02.md` §2's open
question ("resolve by deciding which version is correct and making both agree") — the
wide, three-column guard is correct and is what's live; 0062 and 0063's corrected headers
are that resolution.

## The three untraced indexes

Three indexes exist live with zero trace in `supabase/migrations/`:
`idx_global_university_discovery_order`, `idx_global_university_discovery_queue_state`
(both on `global_university_discovery_queue`), `idx_university_profile_queue_state_priority`
(on `university_profile_verification_queue`) — both tables from migration 0038, indexes
added directly to live afterward without a migration ever capturing them. Low stakes
(performance only, no correctness or security implication) but real, and exactly the
"live ahead of the repo" direction that's easy to stop checking for once "is anything
missing" comes back clean. Migration 0078 captures them, `if not exists`, written and not
applied.

## What each remaining gap actually costs

**0048 — real, see above. Not "costs nothing."**

**0058 — genuinely contested; the founder's call, and there are two documents' worth of
argument on file already, not decided by this one.** It's named as layer 5 of a deliberate
five-layer kill switch on the social feature (`lib/social/posts-feature-flag.ts`, with
`__tests__/social/posts-hidden.test.ts` asserting layers 1–4 mechanically) — one reading
says the schema gap is the load-bearing final layer and must stay closed.
`docs/migration-gap-audit-2026-08-31.md` §2 argues the schema gap is the *wrong* layer to
rely on: 0058 is purely additive DDL touching no existing row, the flag file's own text
says the five layers are independent (so removing one leaves route/nav/Server-Action/flag
intact), and applying tables doesn't turn the feature on *for students* — only the flag
does that. Both readings agree on the one fact that actually matters — nothing here is
reachable by a logged-in student today — and disagree only on whether the schema gap is a
safeguard or dead weight. Not resolved by this pass, and not touched: removing a layer
from a deliberate defence-in-depth is the founder's decision to make deliberately, not
either document's to make for them.

**0057, 0059 — no longer gaps, confirmed 2026-09-02.** Both are live; the "costs nothing
today" writeups that used to sit here described a state that no longer exists.

**0072 — no longer a gap for logging, confirmed live.** `profiles.terms_accepted_at`, the
`birth_year_changes` table, and its trigger are all live — a birth-year change is recorded
now. What's still open is a *different* question the migration deliberately left that way:
`birth_year_changes` carries RLS with zero policies, so nothing can read it back —
including the data export. `lib/export/tables.ts`'s comment on this was stale as of
2026-09-01 (claimed 0072 unapplied) and was corrected 2026-09-02 by a different session to
describe the real, current blocker (zero read policies, an open design question in
`DATA_RIGHTS_AUDIT.md` Part 3a) rather than a stale one. Not this file's question to
answer; named here so the next reader has the current framing, not the outdated one.

## Operational consequence

`supabase db push` against **this project** (`oryn-qa-scratch`) will fail if run today:
the ledger's twenty-six missing rows mean it would attempt to re-run migrations already
applied, and 0065's `create policy` statements have no `if not exists` guard. This is a
fact about this one long-lived QA project's own history, not about migration correctness —
a **fresh** project (production, when it's created) is unaffected: its ledger starts
empty, and a plain `psql`-in-order replay of all 76 applies cleanly (verified directly,
2026-09-02 — see `would-a-fresh-deploy-match-live-2026-09-02.md`).

**Correction to a claim this file used to make**: it previously said this was proven "by
the `Migrations` CI workflow... on every push." That workflow was never actually
installed — `docs/ci-migration-replay-setup.md` explains why (no `workflow` OAuth scope to
push a `.github/workflows/*.yml` file) and is explicit that the file exists locally,
verified, but was never pushed. There is no CI proving this on every push today; the
2026-09-02 audit is a manual, one-time replay, not a standing check. Worth actually
installing before relying on this claim again.
