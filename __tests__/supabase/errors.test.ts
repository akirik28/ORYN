import { describe, expect, test } from "vitest";
import { isUndefinedColumnError } from "@/lib/supabase/errors";

/**
 * Guards the degrade-and-retry path for a write naming a column whose migration hasn't
 * been applied yet on this environment — first written 2026-09-02 for
 * lib/universities/sync-us-universities.ts's university_statistics upsert (found unchecked
 * entirely, oryn-3f's unapplied-migration sweep, which let that write fail silently against
 * a real column PostgREST rejects), moved here the same night once
 * lib/opportunities/persist-matches.ts needed the identical check for an unrelated column
 * (opportunity_matches.match_confidence, migration 0086). Checks Postgres's SQLSTATE
 * (42703, undefined_column) rather than a string match on the whole message, and requires
 * the specific column name too, so a different missing column still surfaces as a real
 * error instead of being swallowed by this same guard.
 */
describe("isUndefinedColumnError", () => {
  test("matches the exact SQLSTATE and column name", () => {
    expect(isUndefinedColumnError({ code: "42703", message: 'column "last_changed_at" of relation "university_statistics" does not exist' }, "last_changed_at")).toBe(true);
  });

  test("does not match a different missing column", () => {
    expect(isUndefinedColumnError({ code: "42703", message: 'column "some_other_column" of relation "university_statistics" does not exist' }, "last_changed_at")).toBe(false);
  });

  test("does not match a different SQLSTATE even naming the right column", () => {
    expect(isUndefinedColumnError({ code: "23505", message: 'duplicate key value violates unique constraint "last_changed_at_idx"' }, "last_changed_at")).toBe(false);
  });

  test("null error (no failure) is not a match", () => {
    expect(isUndefinedColumnError(null, "last_changed_at")).toBe(false);
  });

  test("matches for a completely different column too -- the check is generic, not tied to any one migration", () => {
    expect(isUndefinedColumnError({ code: "42703", message: 'column "match_confidence" of relation "opportunity_matches" does not exist' }, "match_confidence")).toBe(true);
  });
});
