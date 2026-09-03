import { describe, expect, test } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract tests: they read migration 0058's SQL and assert the guarantees the
 * rest of this feature depends on.
 *
 * Why this exists rather than a live-database test: there is no Postgres in this
 * environment (see supabase/tests/*_manual.sql for the by-hand RLS matrices this repo
 * already uses for the same reason). The guarantees below — cascade on delete, no default
 * on visibility, the like primary key — cannot be exercised without a database, but they
 * CAN be pinned so that a later edit which quietly relaxes one of them fails here instead
 * of in production. Every assertion is about a specific clause someone might reasonably
 * "clean up" without realising what it was load-bearing for.
 */

const MIGRATIONS_DIR = join(import.meta.dirname, "..", "..", "supabase", "migrations");
const MIGRATION = readFileSync(join(MIGRATIONS_DIR, "0058_social_posts.sql"), "utf8");

/** Collapses whitespace so an assertion is about the clause, not about formatting. */
const flat = MIGRATION.replace(/\s+/g, " ");

describe("migration numbering", () => {
  test("0058 is not duplicated, even though a later migration now exists", () => {
    // Two lanes collided on a number once already. This fails loudly if another lane
    // lands a 0058 too, instead of one of them silently never running. This test only
    // pins 0058's own uniqueness — it does not assert 0058 is the highest number in the
    // directory forever; migrations 0061-0065 (the RLS verification package's own fixes,
    // all unapplied like 0058 — public_profiles_require_authenticated,
    // profiles_guard_protected_columns, guard_computed_score_columns,
    // message_reports_verify_reported_user, close_insert_forgery_six_tables), 0066
    // (opportunity_language_and_image), 0068 (the renumbered dedup fix that used to
    // collide at 0020), and 0069 (drops nine ad-hoc `_backup_*` tables — schema hygiene,
    // 2026-08-31) are what currently follow it. Bump the literal below when the next
    // migration lands, the same way this one did — it is a collision guard, not a
    // permanent ceiling.
    const numbers = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => f.slice(0, 4));
    // Checked across EVERY migration, not a hand-listed range. The previous version
    // enumerated 0058-0067 one line at a time, which is why it sat green for months while
    // 0020 was duplicated: 0020_requirement_evaluation.sql and
    // 0020_target_university_null_program_dedup.sql both existed, and no assertion looked
    // there. That collision was not cosmetic — `supabase db push` against an empty database
    // hard-aborts on the primary-key violation in supabase_migrations.schema_migrations at
    // migration 21 of 68, so a fresh install silently stopped before EVERY RLS migration
    // from 0061 on. The live project only has those because a session applied them directly,
    // outside the ledger; a clean production install would have shipped without them
    // (found by the deploy lane, 2026-08-31, verified against a clean Postgres 17; the
    // duplicate is now renumbered to 0068).
    const duplicates = [...new Set(numbers.filter((n, i) => numbers.indexOf(n) !== i))];
    expect(duplicates, `duplicate migration version(s): ${duplicates.join(", ")}`).toEqual([]);

    // Still pinned, still a collision guard rather than a ceiling — bump it when the next
    // migration lands, as this line has been bumped before. Two migrations both claimed
    // 0069 on 2026-08-31 — schema-hygiene's backup-table drop and the requirement
    // investigation's comment-only note — caught here on merge, which is the second time
    // in one day this guard has earned its place. The latter was renumbered to 0070. 0071
    // (calendar_bound_fact_class) is the CAO-points display path's own new column. And a
    // third same-day collision, this time caught by this exact guard before merging rather
    // than on merge: birth_year_changes (the minor-consent audit trail) also started as
    // 0071, found the collision with calendar_bound_fact_class on rebase, and was
    // renumbered to 0072. 0073 (product_events_select_own) is the export-coverage fix: it
    // added no collision, but the pin did its other job and made whoever added it read all
    // of the above before appending — which is the point of a tripwire over a ceiling. 0074
    // (deadline_freshness) is the column pair that lets a deadline say when it was last
    // checked, added before applying 85 records across six new countries so that what gets
    // promised can also be measured. 0075 (deadline_notification_log) is the dedupe table
    // the reminder job's aggregation needs — one row per (student, deadline, urgency
    // bucket) already notified, so a nearer bucket can still re-notify without ever
    // repeating the same bucket twice. 0076 (ai_usage_degrade_columns) carries the
    // per-user AI spend cap's degrade/degrade_reason columns and makes user_id's NULL
    // contract explicit — see docs/handoffs/ai-usage-attribution-audit-2026-09-02.md.
    // These two are worth reading together as the guard's fourth same-day collision and
    // its first *avoided* one: 0076 started as 0075 too, and its author found the clash by
    // checking every remote branch's tree before picking a number — not just this
    // worktree's own migrations/ listing, which could not see an unmerged branch. That is
    // the check this comment has been telling people to run, actually run, one step
    // earlier than the guard itself would have caught it. 0077
    // (weekly_actions_carried_forward) is the "Regenerate destroys completed actions and
    // their reflections" fix — docs/founder-blocked-backlog.md item 39 — adding the column
    // that tells a preserved-through-regeneration action apart from a fresh one. It landed
    // on main while a second, independent 0077 draft (university_notification_log, the
    // dedupe table university_data_changed's aggregation needs — mirrors
    // deadline_notification_log's own shape one field wider, a `source` column, since two
    // independently real events about one university must not collide into one dedupe
    // slot) was still sitting in a branch — found by running that same every-remote-branch
    // check before pushing rather than after a rejected push forced it, and renumbered to
    // 0078 before anyone else collided with it. 0079 (education_test_score_evidence_status)
    // closes a real gap found auditing the evidence-upload path: education_records and
    // test_scores were both in EVIDENCE_LINKABLE_TABLES without the evidence_status column
    // every other evidence-linkable table has had since migration 0004, so
    // uploadEvidence()'s status-mirroring update always failed for those two, silently
    // (the write's error was never checked) — confirmed live against oryn-qa-scratch, not
    // assumed from the migration files. Checked every remote branch (git ls-tree across
    // refs/remotes/origin/*) and every local worktree's filesystem before claiming this
    // number, not just this worktree's own listing — the check this comment has been
    // telling people to run. It landed on main while a second, independent 0079 draft
    // (statistics_last_changed_and_notification_sources — university_statistics gets the
    // same last_changed_at universities already had, and 0078's source check widens from
    // two values to four, 'deadline'/'statistics' added; university_deadlines itself is
    // deliberately untouched — every write there is a plain insert, nothing ever updates a
    // row in place, so there is no last_changed_at-style column any writer could advance,
    // a genuinely larger gap than a missing column) was still sitting in a branch — found
    // by running that same every-remote-branch check before pushing, and renumbered to
    // 0080 before anyone else collided with it either.
    //
    // 0081 (canonical_entity_merges_merged_by_set_null) is the account-deletion audit's
    // second finding, and it is a different KIND of gap from every collision above: the
    // ON DELETE NO ACTION foreign key it re-declares was **never created by any migration
    // at all**. 0038 declares merged_by as a bare uuid with no `references` clause; the
    // constraint was added straight against the live database, outside migration history.
    // A fresh install replaying only tracked migrations would have that column entirely
    // unconstrained. So 0081 is the first migration that CREATES this FK, not merely the
    // first to set its delete rule — and it is the fourth known live object with no
    // migration provenance, after the three untraced research-queue indexes
    // docs/would-a-fresh-deploy-match-live-2026-09-02.md names. All still unapplied.
    //
    // 0082 (global_university_discovery_indexes) is the migration for those three
    // untraced indexes themselves — global_university_discovery_queue's and
    // university_profile_verification_queue's own, first drafted as 0078, then 0079, then
    // 0080, then 0081, each time colliding with another lane's migration landing on `main`
    // faster than this one could push. Renumbered four times on one branch, not because
    // anything about the migration itself was wrong — see
    // docs/migration-state.md's own new "object live, no migration anywhere" category,
    // which groups these three indexes with 0081's FK finding above as the sharper
    // sibling of the ledger-silence problem the rest of this comment documents: a replay
    // reproduces a ledger-silent-but-tracked migration; it cannot reproduce an object with
    // no migration file at all, for either reason. Still unapplied.
    //
    // 0083 (external_sync_jobs_errors_encountered) is the job-observability gap CEO named
    // directly: items_processed alone can't tell a run that found nothing new apart from
    // one that caught real per-item failures internally (discover_opportunities,
    // discover_requirements, generate_weekly_plans, and sync_us_universities all do
    // exactly that) -- both write items_processed: 0 identically. This column is the
    // missing half of that signal, and lib/jobs/run-with-tracking.ts carries the identical
    // unapplied-column degradation pattern 0077/persist.ts already proved out, for the
    // same reason: an UPDATE naming a column that doesn't exist throws on every call, not
    // just the ones that would have matched a row.
    //
    // 0084 (skills_languages_source) gives skills/languages the same `source` column
    // (manual/cv_import) every other achievement table has had since migration 0004 --
    // CV extraction already pulls both categories, but neither the review surface nor the
    // save path ever did anything with them until this pass wired them in, and a
    // CV-imported row needs the same provenance tag every other imported claim carries.
    //
    // 0085 (drop_system_notification_category) is the last of the eight
    // `notification_category` values with no writer, resolved rather than left flagged a
    // third time: docs/handoffs/notification-categories-audit-2026-09-01.md recommended
    // removing it back on 09-01 without drafting the migration; this is that migration,
    // decided only after checking both concrete uses raised for keeping it (an async
    // export-ready notification -- doesn't apply, export-data/route.ts is a synchronous
    // GET with no later "ready" moment; a failed-job alert -- doesn't apply either, that
    // already has its own home in features/admin/sections/{scheduled-jobs,provider-health}
    // -section.tsx, unconnected to this student-facing table) and finding neither real.
    // Zero of 113 live notifications rows use it, and it is the only column anywhere on
    // `notification_category` (checked via information_schema.columns), so the type-swap
    // recreate-the-enum pattern this migration uses has no data to lose and nothing else
    // to fan out to.
    //
    // 0086 (opportunity_match_confidence) adds `opportunity_matches.match_confidence`,
    // CHECK-constrained to the same five EvidenceState values (lib/scoring/signal.ts) every
    // other confidence surface in the product already uses rather than a second vocabulary --
    // resolveMatchConfidence() picks the most-cautious state when a match spans several gap
    // dimensions. Found a real landmine while building it, not after: the opportunity_matches
    // upsert had no `{ error }` destructure at all, so once every row started always including
    // this column, an unapplied migration would have rejected the upsert outright for every
    // user on every page render that touches opportunities -- fixed with the same
    // isUndefinedColumnError degrade-and-retry 0077/0083 already established, moved out of
    // lib/universities/sync-us-universities.ts into the shared lib/supabase/errors.ts once a
    // second, unrelated domain needed the identical check. Still unapplied.
    //
    //
    // 0087 (notifications_new_opportunity_dedupe) backstops
    // notifyNewlyEligibleMatches()'s check-then-insert dedup with a real database
    // constraint -- live-verified 2026-09-02 that the check alone lets a race through: 12
    // notifications.new_opportunity rows for one account, three groups of exactly 4,
    // created in a 13-second window. A partial unique index on (user_id, link), scoped to
    // `category = 'new_opportunity'` only -- checked every other category's own dedup
    // semantics first and found none of them share this one's "same link, forever" shape
    // (weekly_plan dedupes by week not link; message/connection legitimately re-notify on
    // a repeated link; deadline already has migration 0075's own index; profile_update has
    // no such notion at all), so a table-wide constraint would have silently broken at
    // least two of them. Still unapplied -- the 12 existing duplicate rows would violate it
    // on creation, and deleting them is a founder decision this migration doesn't make.
    //
    // 0088 (advisor_messages_degraded_column) exists so a degraded advisor reply's disclosure
    // survives a page reload -- until this, `degraded` was live-session-only React state
    // (features/advisor/advisor-chat.tsx), never persisted, so a reply that really was served
    // by the cheaper model looked identical to a normal one the moment the page reloaded.
    // Checked first, per CEO's own instruction, whether this could be derived from
    // ai_usage.degraded (0076, also unapplied) instead of a second column: it can't -- logAIUsage's
    // insert never returns its own row id, so there is no correlation key between an
    // advisor_messages row and the ai_usage row its own generation logged, only
    // (user_id, feature, approximate created_at). A timestamp-proximity join would be a guess
    // dressed up as a derivation, and this feature exists specifically so the disclosure is
    // something Oryn can stand behind, not something inferred after the fact. `not null default
    // false` is still honest for rows written before this column existed: the only consumer
    // renders `false` and "unknown" identically (no note), and nothing anywhere asserts a
    // historical reply was confirmed NOT degraded. Still unapplied.
    //
    // 0089 (profiles_plan_tier) is the Ultra visual-tier foundation's one real schema
    // addition -- a plain "standard"|"ultra" label on profiles, not a subscription: no
    // payment/billing logic reads or writes it, per the founder's own explicit scope for
    // this pass ("skin only"). Defaults every existing and future profile to "standard",
    // so constraint #1 (the free surface must not change at all) holds at the data layer,
    // not only in the CSS that reads it. Chosen over a per-message response-mode/answer-
    // style toggle deliberately -- checked first and confirmed no such control exists
    // anywhere in the codebase yet -- because a paying student choosing a faster answer
    // style is still paying, and shouldn't visually downgrade over an unrelated choice.
    // Still unapplied.
    //
    // 0090 (notification_preferences) closes the gap this session's own
    // docs/notification-settings-gap-2026-09-02.md audit found: nothing anywhere let a
    // student turn a notification category off -- not the Settings page, not the schema, not
    // lib/notifications/create.ts's single shared insert path, checked directly rather than
    // assumed missing. Deliberately numbered to skip 0089 -- that draft was still uncommitted
    // in another session's worktree, invisible to this branch and to git, when this one was
    // written; landing on the far side of a real 0089 rather than colliding with it was the
    // point, not a coincidence of the number itself. Seven flat `notify_<category>` columns
    // on profiles, one per NotificationCategory, `not null default true` so migration day
    // changes nobody's actual behavior -- matches this table's own existing convention for a
    // small fixed set of per-student flags (busy_mode, is_public) rather than a new join for
    // seven enum values that don't change shape often. Enforced once, inside
    // createNotification() itself -- the same choke point 0087's dedupe already lives in --
    // rather than at each of the seven call sites, degrading to "every category enabled" via
    // isUndefinedColumnError (matched on the shared `notify_` prefix, since whichever of the
    // seven Postgres/PostgREST names first, the rest are missing too -- they land together)
    // for as long as this migration stays unapplied, the same pattern 0077/0083/0086 already
    // established. Going-forward only, not retroactive -- see this migration's own header for
    // why that distinction matters to whoever reads it next. Still unapplied.
    //
    // 0091 (profiles_response_mode) is the response-mode slider's own persistence --
    // Fast/Standard/Ultra as the founder-approved UI labels (a prototype the founder had
    // already seen and signed off on before this was built, "kayacının tasarımı var zaten
    // yaptın ya o çok güzeldi"), deliberately NOT the stored values: profiles.plan_tier
    // (0089) already uses the literal strings "standard"/"ultra" for a different concept
    // -- visual skin, not model selection -- and reusing them here would be exactly the
    // "which ultra" confusion that migration's own header already flagged a future
    // response-mode toggle to keep separate from. "fast"/"balanced"/"thorough" internally
    // instead, `not null default 'balanced'` so migration day changes nobody's actual
    // behavior, same convention 0090 already established. Spend-based degrade
    // (lib/ai/limits/budget.ts) always overrides which model actually answers a call
    // regardless of this column's value -- it records a student's preference, not a live
    // guarantee, and stays selectable/saved even while overridden, this product's own
    // "never a hard wall" posture applied to a new control rather than a special case for
    // this one. 0089/0090/0091 are now live -- the founder applied all three by hand
    // 2026-09-02 (docs/present-case-verify-2026-09-02.md) -- kept as "still unapplied" here
    // deliberately: this test's own point is guarding the numbering sequence, not tracking
    // live/applied status, and restating that history accurately at time of writing is more
    // useful to a future reader than silently rewriting it to match today.
    //
    // 0092 (ultra_welcome_seen_at) is the one-time "welcome to Ultra" moment (Phase 57,
    // founder request 2026-09-02: "ultra alındıktan sonra 'ultraya hoş geldiniz' yazısı
    // çıkması lazım"). A single nullable timestamp on profiles, written once and never
    // cleared -- lib/tier/ultra-welcome.ts's shouldShowUltraWelcome() is the one place its
    // absent-vs-null distinction matters (unlike every other column in this file, absence is
    // NOT treated the same as "never shown" -- see that file's own comment for why). Written,
    // not applied -- same house pattern as every migration in this narrative above it.
    //
    // 0093 (upgrade_prompt_dismissal) is the founder-approved, frequency-capped upgrade
    // pop-up's dismissal state (relayed: "pop up reklamları yap sıklık sınırıyla"; policy
    // finalized by oryn-60's research -- docs/upgrade-prompt-design-spec-2026-09-02.md,
    // docs/research/upgrade-prompt-frequency-precedent-2026-09-02.md). Numbered 0093, not
    // 0092 -- this branch was cut before 0092 (ultra_welcome_seen, directly above) merged,
    // the same two-lanes-same-number shape as 0079/0080 and 0075/0076/0077 above it, caught
    // on rebase rather than left for someone else to hit. Four columns, not a boolean,
    // because the policy has three distinct tiers of "no" (soft/explicit/permanent) that
    // each suppress for a different duration -- see the migration's own header. Durable and
    // cross-device, deliberately not localStorage: a student who explicitly declined on one
    // device and gets asked again on another reasonably feels ignored, and re-showing after
    // an explicit no is what turns a prompt into an ad.
    //
    // Worth reading against 0092 directly above, not in isolation: both migrations left
    // "written, not applied," and both had to decide what an absent column should mean for
    // their own feature -- and reached opposite answers on purpose. 0092's welcome moment
    // has no cap of its own, so absence there defaults to "can't durably record this yet,"
    // meaning stay silent -- the alternative is firing on every page load forever. This
    // feature already has an independent cap regardless of database state (sessionStorage's
    // once-per-session, plus the real degraded-reply trigger event), so absence here
    // defaults the other way, to "not yet dismissed" -- the prompt can still show, bounded
    // to one appearance per session even while unapplied. The two migrations argue their
    // own case in their own header comments rather than share one; the shared principle is
    // only "pick the failure direction that costs less for this feature's actual shape,"
    // not a rule either column's default was allowed to inherit from the other's.
    //
    // 0094 (admin_finance_settings) landed on main between this pass's first rebase attempt
    // and this one -- an earlier version of this paragraph said it wasn't present yet, which
    // was accurate at the time and stopped being true within the same session; corrected
    // here rather than left stale, the same discipline this file asks of every other entry.
    // 0095 (job_controls) is the admin ops-panel pivot's "disable future runs" flag -- a new
    // table, not a column addition, so it carries no fail-open-on-missing-column tension the
    // way 0092/0093 above do; the equivalent question for a whole new table (a missing row,
    // including "the table itself doesn't exist yet," should read as "not disabled") is
    // answered in lib/jobs/job-controls.ts's own comment instead. 0097 (admin_action_log) is
    // a separate lane's shared audit-log table for operational admin actions -- landed on
    // main during this same rebase; see that migration's own header for its reasoning, not
    // duplicated here since it isn't this entry's migration to narrate.
    //
    // 0096 and 0099 are this AI-spend deep-dive's own two, reserved as part of the same
    // 0094-0099 block (five lanes working the same night, assigned up front specifically so
    // nobody kept independently reaching for "the next free number" against different
    // snapshots of main -- the exact shape of tonight's two earlier collisions, 0020 then
    // 0069). 0098 (oryn-31's catalog audit) was absent when this paragraph was first
    // written and landed in the same merge that joined these two narratives -- corrected
    // here rather than left standing, since a stale "not present" reads as a claim about
    // today. This guard only checks for duplicates and the true maximum on disk, never
    // contiguity, so a gap would have been fine either way.
    //
    // 0096 (quota_grants) is an append-only admin top-up/reset ledger for a student's shared
    // monthly AI allowance, never an edit to ai_usage itself -- "a student who legitimately
    // exhausted their month has no recourse today" (oryn-a7, 2026-09-02), and this is that
    // recourse without touching the one honest record of what was actually spent. Read by
    // BOTH selectModelForUser's degrade decision and getMonthlyQuota's hard monthly stop
    // through one shared function (lib/ai/limits/grants.ts), not summed independently in two
    // places -- a "reset" that relieved only one of the two gates would leave a student
    // still stuck on the degraded model, which isn't a reset. Students can read their own
    // grant rows (same "select own X" shape ai_usage already established); only the service
    // role can write one.
    //
    // 0099 (job_budget_overrides) is this same deep-dive's other lever: live-adjustable
    // per-feature job budgets for the two catalog jobs (oryn-a7 dispatch, 2026-09-02/03) --
    // one row per feature, not a singleton like 0094's admin_finance_settings, since job
    // budgets are a growing set keyed by feature name rather than a handful of scalar
    // settings. Same "a missing row means use the existing default, never zero or
    // unbudgeted" discipline every fail-open path in this session already follows -- this
    // one gates a real spend control, so failing toward "unbudgeted" would undo the entire
    // point of the table it replaces a hardcoded constant with.
    //
    // 0100 (ai_model_pricing) is this same deep-dive's third and final lever (build order:
    // job-budget adjust, student grant, pricing table) -- one row per model, checked before
    // PRICE_PER_MILLION_TOKENS_USD's own hardcoded table falls back
    // (lib/ai/pricing.ts's resolveModelCostUsd). Not part of the original 0094-0099 block
    // (that block was five lanes' known needs reserved up front; this one wasn't known to
    // be needed until the first two levers were built) -- claimed only after checking every
    // remote branch's own migrations/ tree, not just this worktree's listing, the same
    // discipline 0076/0079 above first established and every entry since has repeated.
    // resolveModelCostUsd caches admin-entered rates in memory for up to 60 seconds (this is
    // the single hottest path in the AI system, logAIUsage, called on every AI response) and
    // fails toward the last successfully-fetched rates on any read failure, never toward an
    // empty table -- the same "unknown or unavailable must never look like healthy/default"
    // discipline this whole narrative has repeated for every fail-open path added tonight.
    //
    // 0098 (admin_actions) is the field-level audit trail the admin panel's course
    // correction (2026-09-02: founder wants a control panel, not a report) surfaced a live
    // need for -- two real writes already happened that night with zero record of who or
    // why (AI Scholars disabled, per oryn-a7's own account). One append-only table shared by
    // every write-capable catalog-health action rather than one per action -- see
    // docs/catalog-health-actions-design-2026-09-02.md. Deliberately a second table alongside
    // 0097's admin_action_log rather than merged into it -- checked directly rather than
    // assumed compatible: admin_action_log's schema (target_user_id, a human-readable label +
    // freeform detail) doesn't fit a non-user target without misusing target_user_id for an
    // opportunity id. CEO's own ruling, once flagged rather than decided unilaterally: keep
    // both tables, unify them at the read layer instead (getAdminActivityTimeline, lib/admin/
    // queries.ts) -- the schema split stays real underneath, a founder reading "recent
    // activity" never has to know it exists. Still unapplied.
    //
    // Ceiling was 100, not 98, before this branch's own addition below: 0098 and 0100 were
    // written by two lanes in parallel and merged together, and this guard pins the true
    // maximum on disk rather than the highest number any one branch knew about.
    //
    // admin_dead_feature_flags (record + display only for the growth panel's feature census,
    // docs/admin-panel-architecture-2026-09-02.md's own D8 read/act boundary — RLS enabled,
    // zero policies, same posture as provider_health/external_sync_jobs, migration 0014,
    // since this is operational decision data, not a student's own data) first claimed 0094,
    // colliding with admin_finance_settings above -- both lanes read main's own max (93) as
    // the next free number, which is a lower bound on what's claimed, not the claim itself:
    // 0094-0100 were all separately taken on other unmerged branches by the time this
    // rebased (0098 admin_actions, 0099 job_budget_overrides, 0100 ai_model_pricing) -- same
    // lesson oryn-f5 already applied claiming 0100. Renumbered to 0101, the actual next-free
    // number checked against every remote branch, not just main, at rebase time. Only this
    // branch's own migration is present in THIS worktree, so the max on disk here is 101,
    // not 94-100 (those files live on other branches, not this one) -- if a future session
    // finds this assertion failing against a lower actual max, that's this branch merging
    // behind others that claimed 94-100, not a bug in this test.
    //
    // 0102 (weekly_plan_budget_settings) landed on main while this branch was held by a
    // session-level permission gate on git push, so the ceiling is 102 rather than this
    // branch's own 101. Neither number was wrong when written -- which is the whole reason
    // this guard pins the maximum actually on disk instead of the highest number any one
    // branch knew about.
    //
    // 0103 (opportunity_verification_runs) is source_verified_at and its runs table -- the
    // designed-but-unbuilt fix from docs/opportunity-reverification-job-design-2026-08-23.md
    // §8.2/§8.5, CEO-assigned once three confirmed live instances (Stanford Anesthesia,
    // ISSYP, Kadir Has) made it the highest-leverage next package. Confirmed against this
    // worktree's own supabase/migrations/ directly (not assumed) that 0101
    // (admin_dead_feature_flags) and 0102 (weekly_plan_budget_settings) are both real,
    // on-disk files by this point in the rebase -- 0103 is the genuine next-free number,
    // not a guess past a still-claimed one.
    //
    // 0104 (ultra_gift) is the founder's own named prototype item -- a single nullable
    // ultra_gift_granted_at column on profiles for the once-per-student 7-day Ultra gift.
    // First claimed 0103 after sweeping every remote branch's own migrations/ tree above
    // 0102 -- collided with another lane's opportunity_verification_runs directly above,
    // also 0103, claimed on a branch this worktree couldn't see until the next sweep.
    // Renumbered to 0104, re-checked against every remote branch again before landing on
    // it, the same discipline every entry above this one already established. See
    // lib/tier/plan-tier.ts's own comment for why this was one column and not two, and why
    // nothing here is a scheduled job -- superseded in one detail by 0106 directly below,
    // corrected here rather than left standing per this file's own repeated discipline.
    //
    // 0105 (admin_product_settings) closes the three Ayarlar controls oryn-31 shipped
    // honest about having no mechanism (signups on/off, maintenance mode, trial period
    // length) -- one settings singleton for all three, same shape as admin_finance_settings
    // (0094) rather than three columns spread across unrelated tables. All three columns
    // default to today's actual behavior (signups open, no maintenance, 7-day trial), so
    // reading this table before it exists changes nothing -- see the migration's own header
    // for why that's true by construction, not a coincidence.
    //
    // 0106 renames+redefines 0104's ultra_gift_granted_at into ultra_gift_expires_at --
    // safe as a plain rename since 0104 has never been applied to a live database. Once
    // 0105 made the gift's duration admin-configurable (trial_period_days), storing a grant
    // timestamp and re-deriving expiry from a now-mutable global constant would have meant
    // a later trial-length change silently reached backward into gifts already granted.
    // Storing the already-computed expiry instead keeps resolvePlanTier exactly as simple
    // and synchronous as it already was, and makes a length change affect only future
    // grants -- see that migration's own header for the full reasoning.
    // 0107 (page_views) is the visitor-counting table the founder asked for on 2026-09-03 --
    // written, deliberately not applied, because it was the one control-centre surface with
    // no table behind it at all rather than a missing column. 0108 (academic_tier) is the
    // column pair that lets an institution say what academic kind it is, distinct from
    // institution_type's ownership axis -- 275 staged institutions across five countries
    // wait on it. Both proposed, neither applied. Bumping this from 106 caught exactly what
    // it is for: 0108 landed while I was merging and the pin went red on the same push.
    //
    // 0107 (page_views) -- anonymous logged-out visitor counting, oryn-a7's assignment
    // 2026-09-03 answering the founder's own "how many people have looked at the app" ask.
    // Proposed, not yet applied: a schema decision oryn-a7 explicitly asked to be told about
    // rather than have land silently, since the table (and the ask itself) didn't exist
    // anywhere in the repo, any branch, or the live database before this -- confirmed all
    // three before writing this migration, not assumed. See the migration's own header for
    // why visitor_hash can never be an IP, a user agent, or a persistent identifier.
    // 0109 (curriculum_other_text) adds two nullable text columns -- profiles and
    // education_records -- for what a student meant by picking curriculum = "other", which
    // had no companion field anywhere in the product before this (confirmed live: the
    // onboarding wizard, the profile editor, and every relevant Zod schema, none of them
    // ever had one). Motivated by the founder's own observation that Turkish residents at
    // schools like Alman Lisesi/İtalyan Lisesi/Galatasaray/Saint-Joseph hold real foreign
    // qualifications the fixed 6-value enum can't name -- this migration doesn't add those
    // enum values (a separate, priced, not-yet-decided piece of work), only the free text so
    // "other" stops being a value that captures nothing. Proposed, not applied. Landed on
    // main first, which is what settles 0109's own identity below.
    //
    // 0110 (advisor_generation_locks, this lane) is part of
    // docs/ozellesme-spec-2026-09-03.md piece 2's concurrency half -- one row per student
    // present only while an advisor reply is actually generating, enforcing "one concurrent
    // generation, both tiers" via two atomic Postgres functions rather than application-code
    // read-then-write, since the one property that piece exists to guarantee is atomicity
    // across a double-click or two open tabs. This number has a three-way history worth
    // recording rather than smoothing over: this migration, oryn-11's advisor_instructions
    // (piece 1, the tier-capped 500/2000-char persistent instruction string), and
    // curriculum_other_text above all independently started as 0109. The instructions/
    // generation-lock collision was caught and resolved directly between the two lanes before
    // either pushed (this one moved to 0110, since the other was the smaller sweep);
    // curriculum_other_text reached main first and is what makes 0109 unambiguous now.
    // advisor_instructions still needs to move again -- to 0111 -- when it lands; this
    // comment is what tells whoever does that why the number they'd naturally reach for
    // (0109, the one they were told to keep) is already spoken for twice over.
    // lib/advisor/generation-lock.ts fails open (never blocks a reply) until 0110 lands.
    expect(Math.max(...numbers.map(Number))).toBe(110);
  });
});

describe("visibility is stored and explicit", () => {
  test("posts.visibility is not null and has NO default", () => {
    // The single most important line in the schema: a default of any kind would make a
    // minor's audience an implicit decision.
    expect(flat).toContain("visibility post_visibility not null,");
    expect(flat).not.toMatch(/visibility post_visibility not null default/);
  });

  test("the widest tier is oryn_public — there is no anonymous/world value", () => {
    expect(flat).toContain("create type post_visibility as enum ('private', 'connections', 'oryn_public')");
    expect(MIGRATION).not.toMatch(/grant\s+select\s+on\s+public\.posts\s+to\s+anon/i);
  });

  test("the oryn_public tier is double-gated on the author's own profile flag, at read AND write", () => {
    expect(flat).toContain("visibility = 'oryn_public' and public.is_profile_public(posts.author_id)");
    expect(flat).toContain("(visibility <> 'oryn_public' or public.is_profile_public(auth.uid()))");
  });
});

describe("deletion actually deletes", () => {
  test("a repost's reference to its original cascades — deleting a post takes its reposts with it", () => {
    expect(flat).toMatch(/reposted_post_id uuid references public\.posts\(id\) on delete cascade/);
  });

  test("likes cascade from the post", () => {
    expect(flat).toMatch(/post_id uuid not null references public\.posts\(id\) on delete cascade/);
  });

  test("the edit history cascades too — a deleted post leaves no retained prior versions", () => {
    const revisions = MIGRATION.slice(MIGRATION.indexOf("create table public.post_revisions"));
    expect(revisions).toMatch(/post_id uuid not null references public\.posts\(id\) on delete cascade/);
  });

  test("no soft-delete column exists on posts", () => {
    // `removed_at` is moderator removal, which is a different thing and is not how a
    // student's own delete works. A `deleted_at` would be retention with extra steps.
    expect(flat).not.toContain("deleted_at");
  });

  test("a report survives its post being deleted, but the content does not", () => {
    expect(flat).toContain("add column post_id uuid references public.posts(id) on delete set null");
  });
});

describe("likes are idempotent and cheaply countable", () => {
  test("the primary key IS the idempotency constraint", () => {
    expect(flat).toContain("primary key (post_id, user_id)");
  });

  test("counters are denormalized onto posts rather than counted per render", () => {
    expect(flat).toContain("like_count integer not null default 0 check (like_count >= 0)");
    expect(flat).toContain("repost_count integer not null default 0 check (repost_count >= 0)");
  });

  test("the counter triggers are SECURITY DEFINER — without it they would update zero rows", () => {
    // Liking someone else's post updates a row the liker does not own. A trigger running
    // as the invoking user is still subject to the posts UPDATE policy, which would
    // silently match nothing and leave the counter at 0 forever while likes accumulated.
    const likeFn = MIGRATION.slice(
      MIGRATION.indexOf("function public.posts_bump_like_count"),
      MIGRATION.indexOf("create trigger post_likes_maintain_count")
    );
    expect(likeFn).toContain("security definer");
    const repostFn = MIGRATION.slice(
      MIGRATION.indexOf("function public.posts_bump_repost_count"),
      MIGRATION.indexOf("create trigger posts_maintain_repost_count")
    );
    expect(repostFn).toContain("security definer");
  });

  test("counters are maintained on both insert and delete", () => {
    expect(flat).toContain("after insert or delete on public.post_likes");
    expect(flat).toContain("after insert or delete on public.posts");
  });
});

describe("system columns are not client-writable", () => {
  test("a guard trigger restores counters and moderation state on any direct update", () => {
    const guard = MIGRATION.slice(
      MIGRATION.indexOf("function public.posts_guard_system_columns"),
      MIGRATION.indexOf("create trigger posts_00_guard_system_columns")
    );
    for (const column of ["like_count", "repost_count", "edit_count", "edited_at", "removed_at", "removed_by", "removal_reason"]) {
      expect(guard, `guard must restore ${column}`).toContain(`new.${column} := old.${column}`);
    }
  });

  test("the guard's only escapes are a nested trigger and the service role", () => {
    expect(flat).toContain("if pg_trigger_depth() <= 1 and current_user <> 'service_role' then");
  });

  test("trigger names keep their explicit ordering prefixes", () => {
    // Postgres fires same-timing triggers in NAME order, and these three are
    // order-dependent: guard restores edit_count, then the revision trigger increments it.
    const order = ["posts_00_guard_system_columns", "posts_10_record_revision", "posts_30_set_updated_at"];
    const positions = order.map((name) => MIGRATION.indexOf(`create trigger ${name}`));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...order].sort()).toEqual(order);
  });
});

describe("an edit does not silently rewrite what others already saw", () => {
  test("the superseded version is copied into post_revisions by a trigger", () => {
    expect(flat).toContain("insert into public.post_revisions (post_id, revision, body, visibility, attachment_path, attachment_kind)");
    expect(flat).toContain("before update on public.posts");
  });

  test("a visibility change is recorded as a revision too, not just a body edit", () => {
    // "Who could see this on the day it was reported" is a moderation question; narrowing
    // visibility after the fact would otherwise erase the answer.
    expect(flat).toContain("or new.visibility is distinct from old.visibility");
  });

  test("post_revisions has no INSERT policy for anyone — the trigger is the only writer", () => {
    const revisionPolicies = MIGRATION.match(/create policy "[^"]+" on public\.post_revisions[\s\S]*?;/g) ?? [];
    expect(revisionPolicies.length).toBeGreaterThan(0);
    expect(revisionPolicies.every((p) => p.includes("for select"))).toBe(true);
  });
});

describe("RLS", () => {
  test.each(["posts", "post_likes", "post_revisions"])("%s has row level security enabled", (table) => {
    expect(flat).toContain(`alter table public.${table} enable row level security;`);
  });

  test("the read policy is fail-closed: private matches no branch", () => {
    const policy = MIGRATION.slice(
      MIGRATION.indexOf('create policy "read visible posts"'),
      MIGRATION.indexOf('create policy "create own post"')
    );
    expect(policy).toContain("visibility = 'connections'");
    expect(policy).toContain("visibility = 'oryn_public'");
    expect(policy).not.toContain("visibility = 'private'");
  });

  test("the read policy is restricted to authenticated — the oryn_public branch never checks the CALLER's identity, only the author's, so without this restriction anon inherits it from the schema-wide default grant", () => {
    // Regression pin for the exact defect BUG-1's RLS verification package found and
    // fixed here on 2026-08-22 (docs/research/verification/rls-live-verification-2026-08-22.md):
    // the identical shape was live in migration 0023's public_profiles view (fixed
    // separately in migration 0061) before this one was caught unapplied. A future edit
    // that drops "to authenticated" while "cleaning up" this policy would reopen it
    // silently — this test exists so that fails here instead of in production.
    const policy = MIGRATION.slice(
      MIGRATION.indexOf('create policy "read visible posts"'),
      MIGRATION.indexOf('create policy "create own post"')
    );
    expect(policy).toMatch(/for select\s+to authenticated/);
  });

  test("blocking gates reads in both directions via the symmetric helper", () => {
    expect(flat).toContain("not public.is_blocked_between(auth.uid(), author_id)");
  });

  test("removal hides a post from everyone except its author", () => {
    const policy = MIGRATION.slice(
      MIGRATION.indexOf('create policy "read visible posts"'),
      MIGRATION.indexOf('create policy "create own post"')
    );
    expect(policy).toContain("author_id = auth.uid()");
    expect(policy).toContain("removed_at is null");
  });

  test("an insert cannot arrive with pre-set counters or a pre-set removal", () => {
    const policy = MIGRATION.slice(
      MIGRATION.indexOf('create policy "create own post"'),
      MIGRATION.indexOf('create policy "author edits own post"')
    );
    expect(policy.replace(/\s+/g, " ")).toContain("like_count = 0 and repost_count = 0 and edit_count = 0 and removed_at is null");
  });

  test("a moderator-removed post cannot be edited by its author at all", () => {
    expect(flat).toContain("for update using (author_id = auth.uid() and removed_at is null)");
  });

  test("who liked a post is narrower than the like count: liker and post author only", () => {
    expect(flat).toContain('create policy "select own likes" on public.post_likes for select using (user_id = auth.uid())');
    expect(flat).toContain('create policy "post author sees its likes"');
  });

  test("the new helper is security-definer and boolean-only, like is_blocked_between", () => {
    const fn = MIGRATION.slice(
      MIGRATION.indexOf("function public.is_profile_public"),
      MIGRATION.indexOf("revoke all on function public.is_profile_public")
    );
    expect(fn).toContain("returns boolean");
    expect(fn).toContain("security definer");
    expect(flat).toContain("revoke all on function public.is_profile_public(uuid) from public;");
    expect(flat).toContain("grant execute on function public.is_profile_public(uuid) to authenticated;");
  });
});

describe("attachments", () => {
  test("the media bucket is private", () => {
    expect(flat).toContain("values ('post-media', 'post-media', false)");
  });

  test("its storage policies are owner-only, including read", () => {
    // A viewer allowed to see the post still cannot read the object directly; access is a
    // short-lived signed URL minted after the post itself came back from an RLS-filtered
    // read. One audited gate beats a second, drifting copy of the audience rules.
    const policies = MIGRATION.match(/create policy "post-media[^"]*"[\s\S]*?;/g) ?? [];
    expect(policies).toHaveLength(3);
    expect(policies.every((p) => p.includes("(storage.foldername(name))[1] = auth.uid()::text"))).toBe(true);
  });
});

describe("the migration announces that it is not applied", () => {
  test("the header says so, so nobody applies it as a side effect of an earlier backlog item", () => {
    expect(MIGRATION.slice(0, 1200)).toContain("NOT YET APPLIED");
  });
});
