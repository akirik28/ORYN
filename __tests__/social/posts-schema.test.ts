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
    // 0080 before anyone else collided with it either. All still unapplied.
    expect(Math.max(...numbers.map(Number))).toBe(80);
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
