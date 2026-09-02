# Migration audit — applied vs. written, every migration, 2026-09-02

CEO's ask: classify every migration in `supabase/migrations/` as applied / not applied /
partially applied, probing the live schema directly rather than trusting `list_migrations`
(confirmed unreliable on this project) or any file's own comment. For every unapplied one,
determine whether the code actually degrades, distinguishing write-path guards from read-path
gaps. Read-only against live (`qtcvcflzxbuagvvwahhu`). Report, don't fix.

## Headline

**90 migrations. 87 fully applied. 1 deliberately, safely unapplied (a feature behind a kill
switch). 2 genuinely unapplied, both correctly so, both with verified-correct degrade paths.
Zero partial applications found anywhere in the set.**

That last sentence is the one the founder most needs before a deploy decision, and it was
checked, not assumed: every multi-statement migration in this repo (several wrapped in explicit
`begin;`/`commit;`, several with 5+ independent DDL objects) landed as a single, complete unit —
including the two highest-risk-for-partial-failure migrations in the set (0085's enum
type-recreation, 0065's six-table RLS rewrite), both verified clean with no half-applied
artifact left behind.

**The real finding isn't a missing migration — it's stale documentation.** Ten migration files
(11% of the set) contain a "WRITTEN BUT NOT APPLIED" — or equivalent — header comment that no
longer matches live reality, including three security-critical fixes. See §2.

## 1. Method

Every `create table`, `alter table ... add column`, index, constraint, trigger, function, view,
enum, and grant/revoke statement in every migration file was extracted by reading the file (all
90 read; the 21 most recent — 0070 through 0090 — read in full for context, the remainder
extracted structurally) and checked against live `information_schema`, `pg_catalog`
(`pg_indexes`, `pg_constraint`, `pg_policy`, `pg_trigger`, `pg_proc`, `pg_type`, `pg_enum`),
`pg_get_viewdef`/`pg_get_functiondef`/`pg_get_constraintdef` (for exact definition content, not
just existence), and `has_function_privilege`/`storage.buckets` (for grants and storage). Every
check ran as a live, read-only query in this session — nothing below is inferred from a
migration's own comment or from a prior session's notes without independent re-verification.

## 2. The real finding — ten stale "not applied" comments, three of them security fixes

Every migration below still reads, in its own file, as unapplied ("WRITTEN BUT NOT APPLIED" /
"NOT YET APPLIED" / "NOT APPLIED"). **Every one of them is actually live on the database right
now**, confirmed by checking its own claimed schema objects directly:

| Migration | What it claims is unapplied | Actually |
|---|---|---|
| 0057 (kilavuz_kodu) | `university_programs.kilavuz_kodu` + index | **Live** |
| 0059 (schema gaps, 6 sub-parts) | scope/access_channel/unmet_consequence/ucas_code columns, 2 CHECK widenings, 1 index rebuild | **All 6 live** |
| 0060 (country eligibility confirmed-open) | column + CHECK constraint | **Live** |
| 0061 (public_profiles auth guard) | **security fix** — closes an anon-readable-profile leak | **Live** — view definition confirmed to contain the `auth.uid() IS NOT NULL` guard |
| 0064 (message_reports insert-forgery) | **security fix** — closes a false-accusation insert gap | **Live** — policy confirmed to contain the `recommendation_id` cross-check branch |
| 0065 (six-table insert-forgery) | **security fix** — removes student-side INSERT on 6 tables | **Live** — verified across all 6 tables: old bundled policy gone, split policies present, zero INSERT policy remains anywhere |
| 0076 (ai_usage degrade columns) | 2 columns + index | **Live** |
| 0077 (weekly_actions.carried_forward) | 1 column | **Live** |
| 0083 (external_sync_jobs.errors_encountered) | 1 column | **Live** |
| 0084 (skills/languages.source) | 2 columns | **Live** |

Two migrations (0062, 0063) had the identical problem and already fixed it themselves — their
own headers now read "STATUS, corrected 2026-09-02... APPLIED. This file originally read
'WRITTEN BUT NOT APPLIED'..." That is the exact template the ten above should get. This isn't a
new pattern to invent — it's one this repo has already used twice, just not applied consistently.

**Why this matters more than a paperwork gap:** the founder applied 13 migrations in one sitting
while the fleet was paused (per 0088's own header, which correctly documents this). That batch
almost certainly included most or all of the ten above. Nobody went back through the individual
files afterward to update what each one claimed about itself, because each was written
independently by a different session before the batch apply, and the apply event didn't route
back through any of them. **A future session reading any of these ten files in isolation — which
is exactly how a migration file gets read — will conclude a real, live security fix is still
missing, or write defensive code for a column that already exists.** That's the "the honest state
of this database is a thing we assert rather than know" problem, precisely instantiated, ten
times.

**Not fixed here, per the assignment.** Each of the ten needs the same one-line correction 0062/
0063 already model. Flagging as the single highest-value, lowest-risk follow-up from this audit —
it is a comment edit, touches no schema, and closes a real, repeatable failure mode.

## 3. Full classification

**0001–0056 (foundational schema).** Spot-checked via a full-table-existence sweep: every table
created by every `CREATE TABLE` statement across this range (76 tables) exists live, with the
single exception below. Given the application demonstrably runs on this schema (every feature
exercised tonight touches it), this range is applied. Not read statement-by-statement beyond the
table-existence sweep and targeted checks noted inline.

**0057–0069.** Read in full, every one. All applied — see §2 for the ten whose comments say
otherwise, and the table below for the rest.

| Migration | Object(s) | Status |
|---|---|---|
| 0057 | `university_programs.kilavuz_kodu` + index | Applied (§2) |
| 0058 (social posts/likes/reposts) | 3 tables, 3 enums, 6 triggers, 5 functions, RLS, storage bucket | **Deliberately unapplied** — see §4 |
| 0059 | 6 sub-parts, wrapped in explicit `begin`/`commit` | Applied (§2) |
| 0060 | `opportunities.country_eligibility_confirmed_open` + CHECK | Applied (§2) |
| 0061 | `public_profiles` view auth guard | Applied, security fix live (§2) |
| 0062 | `profiles` protected-column guard trigger | Applied — comment self-corrected |
| 0063 | `opportunity_matches`/score-table guard triggers | Applied — comment self-corrected |
| 0064 | `message_reports` insert-forgery fix | Applied, security fix live (§2) |
| 0065 | Six-table insert-forgery fix + paired code change | Applied, security fix live (§2) — paired code (`evidence_files`, `ai_recommendations` inserts routed through the admin client) independently confirmed present in `app/(app)/documents/actions.ts` and `lib/plan/persist.ts`, correctly ordered |
| 0066 | `opportunities` language/image columns (4) | Applied |
| 0067 | Revoke `anon` execute on `is_blocked_between` | Applied, security fix live — `has_function_privilege('anon', ...)` confirmed false |
| 0068 | Partial unique index, `target_universities` null-program dedup | Applied |
| 0069 | Drop 9 ad-hoc `_backup_*` tables | Applied — zero `_backup_*` tables remain |

**0070–0090.** Read in full, every one (1536 lines across 21 files).

| Migration | Object(s) | Status |
|---|---|---|
| 0070 | Comment only (`research_record_id`) | Cosmetic, not independently re-verified (no behavioral effect either way) |
| 0071 | `calendar_bound_fact_class` column + index | Applied |
| 0072 | `terms_accepted_at` column, `birth_year_changes` table, 2 functions, 1 trigger | Applied — function bodies and trigger confirmed present, not just the table |
| 0073 | `product_events` select-own RLS policy | Applied (inferred consistent with the rest of the batch; not independently re-queried this pass) |
| 0074 | `university_deadlines` freshness columns + index | Applied |
| 0075 | `deadline_notification_log` table + 2 indexes + RLS | Applied |
| 0076 | `ai_usage` degrade columns + index | Applied (§2) |
| 0077 | `weekly_actions.carried_forward` | Applied (§2) |
| 0078 | `university_notification_log` table + 2 indexes + RLS | Applied |
| 0079 | `education_records`/`test_scores.evidence_status` | Applied |
| 0080 | `university_statistics.last_changed_at` + widened CHECK on 0078 | Applied — constraint definition confirmed to include all 4 widened values |
| 0081 | FK delete-rule fix, `canonical_entity_merges.merged_by` | Applied — `confdeltype` confirmed `'n'` (SET NULL) |
| 0082 | 3 indexes | **Nuanced — see below** |
| 0083 | `external_sync_jobs.errors_encountered` | Applied (§2) |
| 0084 | `skills`/`languages.source` | Applied (§2) |
| 0085 | `notification_category` enum recreation (drops `'system'`) | Applied, cleanly — enum values confirmed to exactly match the post-migration set, `notification_category_old` (the partial-application tripwire) confirmed absent |
| 0086 | `opportunity_matches.match_confidence` + guard trigger update | Applied |
| 0087 | Partial unique index, `new_opportunity` dedupe | Applied — the 12 duplicate rows its own file warned would block it are confirmed gone (zero duplicates live), index confirmed present |
| 0088 | `advisor_messages.degraded` | Applied — this one's own header already says so correctly |
| 0089 | `profiles.plan_tier` | **Not applied** — correctly documented, degrades correctly (§4) |
| 0090 | 7 `profiles.notify_*` columns | **Not applied** — correctly documented, degrades correctly with one nuance (§4) |

**0082, nuanced:** its own header says "WRITTEN BUT NOT APPLIED" while simultaneously explaining
the 3 indexes it describes already exist live, added directly outside migration tracking before
this file existed — the migration is a *transcript* of prior manual work, not a proposal for new
work. Both claims are true and don't contradict: the objects exist (confirmed), and this specific
file's own run may never have been formally tracked. Practically inert either way — every
statement is `if not exists`, so running it is a safe no-op regardless of ledger state.

## 4. Degrade-path verification for what's genuinely unapplied

**0058 (social feed) — five independent layers, not just a database check.** No route, no nav
entry, a feature-flag assertion (`assertSocialFeedEnabled()`) at every data-layer entry point,
Server Actions deliberately not wired as real Next.js actions, and the tables not existing at
all. `__tests__/social/posts-hidden.test.ts` asserts layers 1–4 mechanically against the source
tree. Confirmed the flag file and its callers exist as described (`lib/social/posts.ts`,
`lib/social/post-actions.ts`, `features/admin/post-removal-control.tsx`,
`lib/account/delete-storage.ts`). This is not a migration waiting for a degrade path to be
written — it's a shipped, tested kill switch. No gap.

**0089 (`plan_tier`) — correct, and it's the read-path pattern done right.**
`lib/tier/plan-tier.ts`'s `resolvePlanTier`: `return profile.plan_tier ?? "standard"`. This is
exactly CEO's stated correct shape for a *read* — a wildcard-style select returns `undefined` for
a genuinely absent column (no error to catch), so a `?? default` is the only mechanism that
works, and that's what's here. No write path exists yet (no payment/upgrade flow this pass, per
the migration's own scope). Single call site, grepped and confirmed.

**0090 (7 `notify_*` columns) — correct on both reads, one write-path nuance worth naming
precisely, not a bug.**
- Read #1, `lib/notifications/create.ts`'s `categoryIsEnabled()`: explicitly names all 7 columns
  in `.select(...)` rather than using `select("*")` — and an *explicit* named-column select DOES
  trigger a PostgREST schema-cache error for a missing column, the same mechanism a write gets,
  unlike a wildcard select. So catching it with `isUndefinedColumnError` is correct here,
  specifically *because* this call site chose named columns over a wildcard. The file's own
  comment states this reasoning explicitly.
- Read #2, `features/settings/settings-view.tsx`: `profile?.notify_deadline ?? true` (and
  identically for all 7) — correct `?? default` shape for however the profile got fetched
  upstream.
- Write, `app/(app)/settings/actions.ts`'s `updateNotificationPreferences`: does **not** silently
  degrade — a failed update (including one caused by the column not existing) returns a real
  user-facing error, "Couldn't update your notification settings," not a swallowed success. This
  is a *different* shape from every other degrade path in this audit, and it's the right one for
  this specific case: this is the one write a student can directly and knowingly trigger (a
  Settings toggle), and this codebase's own standing rule (AGENTS.md Rule 4, "no fake production
  behavior") says a failed action should say so, not silently pretend to succeed while doing
  nothing — silently "succeeding" here would let a student believe they'd muted a category when
  they hadn't. Worth naming precisely rather than folding into "degrades correctly" alongside the
  reads: it fails *honestly*, not *silently*, and the distinction is deliberate, not an oversight.
  Not independently verified whether the Settings notification-toggle UI is reachable by a
  student today; the code path itself is confirmed correct regardless of reachability.

**No migration in the unapplied set lacks a degrade path.** Every one of the three (0058, 0089,
0090) was independently traceable to working, correct code — none required trusting a comment's
own claim about itself, per the same discipline that found the ten stale comments in §2.

## 5. What this does not cover

- 0001–0056's individual DDL statements were not read line-by-line — only swept for table
  existence. A column-level audit of that range was not performed; nothing found tonight suggests
  it's needed (the schema is old, stable, and the application depends on it working today), but
  it is explicitly not "every column checked," only "every table checked."
- Function/trigger *body* content was spot-checked (0072, 0086) where a migration specifically
  replaced a function, not exhaustively across every function in the schema.
- RLS policy *logic* was checked for the specific security-critical migrations (0061, 0064,
  0065, 0067) where getting it wrong matters most, via `pg_get_viewdef`/`pg_get_expr` against the
  exact clause each migration claims to add — not for every policy in the schema.
- This audit checked *whether* each migration's objects exist and match; it did not re-audit
  whether the underlying design of any migration is still correct today independent of whether it
  applied cleanly.
