import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Schema-contract tests for migration 0062, mirroring `__tests__/social/posts-schema.test.ts`'s
 * own reasoning: there is no live Postgres in this environment, so the guarantee that
 * matters -- a non-service-role update to `is_admin` leaves the value unchanged -- cannot
 * be exercised against a real database here. It CAN be pinned against the migration's own
 * SQL text, so a later edit that quietly narrows or removes the guard fails here instead
 * of in production. See docs/research/verification/rls-live-verification-2026-08-22.md
 * for the live confirmation this migration fixes (QA account B, a real non-admin session,
 * successfully set its own is_admin=true with no guard in place -- reverted, then
 * independently re-verified reverted).
 *
 * AMENDED before this migration was ever applied: an earlier version also guarded
 * `profile_strength_score`/`completeness_percent`, which was wrong -- their legitimate
 * writer (`lib/scoring/persist.ts`) authenticates as `authenticated`, not `service_role`,
 * so that version would have silently frozen every student's score on the first
 * legitimate recompute after this migration ran. Narrowed to `is_admin` only, which has
 * no legitimate writer on any role but `service_role`. The two removed columns return in
 * migration 0063, paired with moving their writer to `createAdminClient()` -- see that
 * migration and its own tests. The negative test below pins the narrowing itself, so a
 * future edit can't silently re-add either column without a test failing here first.
 */

const MIGRATION = readFileSync(
  join(import.meta.dirname, "..", "..", "supabase", "migrations", "0062_profiles_guard_protected_columns.sql"),
  "utf8"
);
const flat = MIGRATION.replace(/\s+/g, " ");

describe("profiles_guard_protected_columns", () => {
  test("resets is_admin to its prior value rather than raising", () => {
    // RESET, not RAISE: a silent no-op is safer than an exception, which would tell an
    // attacker exactly which column is guarded and would fail a legitimate multi-column
    // profile update for an unrelated reason.
    expect(flat).toContain("new.is_admin := old.is_admin;");
  });

  test("guards is_admin only -- profile_strength_score/completeness_percent were removed and must stay removed", () => {
    const guardFn = MIGRATION.slice(
      MIGRATION.indexOf("function public.profiles_guard_protected_columns"),
      MIGRATION.indexOf("create trigger profiles_00_guard_protected_columns")
    );
    const assignments = guardFn.match(/new\.\w+ := old\.\w+;/g) ?? [];
    expect(assignments).toEqual(["new.is_admin := old.is_admin;"]);
    // Negative check, not just "exactly one assignment": specifically the two columns
    // whose legitimate writer authenticates as `authenticated`, not `service_role`. If
    // either reappears here without their writer also moving to the admin client, this
    // migration silently breaks the feature it shares a table with.
    expect(guardFn).not.toContain("profile_strength_score");
    expect(guardFn).not.toContain("completeness_percent");
  });

  test("detects service role by the actual authenticated Postgres role, not a client-set claim", () => {
    // current_user reflects which role PostgREST actually authenticated the connection
    // as (verified against the JWT's signature before this trigger ever runs) -- not
    // something a client can include as a field in its own request payload.
    expect(flat).toContain("current_user <> 'service_role'");
  });

  test("only guards the direct, top-level update (pg_trigger_depth), matching the posts_guard_system_columns precedent", () => {
    expect(flat).toContain("pg_catalog.pg_trigger_depth() <= 1");
  });

  test("the guard function pins its own search_path, so an earlier-schema function can't shadow pg_trigger_depth", () => {
    expect(flat).toContain("set search_path = ''");
  });

  test("the trigger fires only when is_admin is actually part of the update", () => {
    expect(flat).toContain("before update of is_admin on public.profiles");
  });

  // Corrected 2026-09-02 (docs/migration-state.md): this header used to read "WRITTEN BUT
  // NOT APPLIED" unconditionally — true when written, false by the time a full
  // replay-vs-live audit checked. It now states APPLIED and quotes the old language
  // verbatim as history, which is why the string is still found — inside a quote, not as
  // a live claim. See __tests__/security/computed-columns-guard.test.ts's sibling
  // correction for 0063, which this file's own header comment already points to.
  test("the migration's header states it is applied, and quotes its old status as history rather than asserting it", () => {
    expect(MIGRATION).toContain("STATUS, corrected 2026-09-02");
    expect(MIGRATION).toContain("APPLIED. This file originally read");
    expect(MIGRATION).toContain('"WRITTEN BUT NOT APPLIED');
  });
});
