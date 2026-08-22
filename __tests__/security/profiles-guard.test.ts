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

  test("also guards profile_strength_score and completeness_percent, and nothing else", () => {
    // Conservative column list, per ORYN-CEO's explicit instruction: only columns with
    // their own stated justification in the migration's header comment.
    expect(flat).toContain("new.profile_strength_score := old.profile_strength_score;");
    expect(flat).toContain("new.completeness_percent := old.completeness_percent;");
    const guardFn = MIGRATION.slice(
      MIGRATION.indexOf("function public.profiles_guard_protected_columns"),
      MIGRATION.indexOf("create trigger profiles_00_guard_protected_columns")
    );
    const assignments = guardFn.match(/new\.\w+ := old\.\w+;/g) ?? [];
    expect(assignments).toHaveLength(3);
  });

  test("detects service role by the actual authenticated Postgres role, not a client-set claim", () => {
    // current_user reflects which role PostgREST actually authenticated the connection
    // as (verified against the JWT's signature before this trigger ever runs) -- not
    // something a client can include as a field in its own request payload.
    expect(flat).toContain("current_user <> 'service_role'");
  });

  test("only guards the direct, top-level update (pg_trigger_depth), matching the posts_guard_system_columns precedent", () => {
    expect(flat).toContain("pg_trigger_depth() <= 1");
  });

  test("the trigger fires only when a protected column is actually part of the update", () => {
    // `before update of is_admin, profile_strength_score, completeness_percent` -- not a
    // bare `before update` -- so an ordinary profile edit that never touches these three
    // columns doesn't pay for this trigger at all.
    expect(flat).toContain(
      "before update of is_admin, profile_strength_score, completeness_percent on public.profiles"
    );
  });

  test("the migration announces it is not applied", () => {
    expect(MIGRATION).toContain("WRITTEN BUT NOT APPLIED");
  });
});
