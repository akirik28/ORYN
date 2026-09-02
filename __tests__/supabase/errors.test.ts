import { describe, expect, test } from "vitest";
import { isUndefinedColumnError, isUniqueViolation } from "@/lib/supabase/errors";

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

  test("PGRST204 — the code a WRITE actually returns — is matched, not just Postgres's 42703", () => {
    // The regression this whole file exists for. PostgREST validates an INSERT/UPDATE/UPSERT
    // payload against its schema cache before any SQL runs and returns its own code; 42703 is
    // what Postgres raises when SQL executes, which is the SELECT path. Every degrade guard in
    // this codebase tested only 42703 and was therefore inert on writes -- proved live on
    // 2026-09-02 when refreshOpportunityMatches took its non-degrade branch against a genuinely
    // absent match_confidence column.
    expect(
      isUndefinedColumnError(
        { code: "PGRST204", message: "Could not find the 'match_confidence' column of 'opportunity_matches' in the schema cache" },
        "match_confidence",
      ),
    ).toBe(true);
  });

  test("a PGRST204 naming a DIFFERENT column still fails loudly — widening the code set did not widen the tolerance", () => {
    expect(
      isUndefinedColumnError(
        { code: "PGRST204", message: "Could not find the 'something_else' column of 'opportunity_matches' in the schema cache" },
        "match_confidence",
      ),
    ).toBe(false);
  });

  test("an unrelated error code is never treated as a missing column, whatever its message says", () => {
    expect(isUndefinedColumnError({ code: "23505", message: 'duplicate key value violates unique constraint "match_confidence_idx"' }, "match_confidence")).toBe(false);
    expect(isUndefinedColumnError(null, "match_confidence")).toBe(false);
    expect(isUndefinedColumnError({ message: "no code at all, mentions match_confidence" }, "match_confidence")).toBe(false);
  });
});

/**
 * Written for migration 0087 (lib/notifications/create.ts's dedup catch for
 * notifications_new_opportunity_link_unique_idx) — the opposite direction from
 * isUndefinedColumnError above: a real Postgres constraint violation, not a PostgREST
 * schema-cache short-circuit, so a single SQLSTATE (23505) is the whole check rather than
 * two inferred-spelling codes.
 */
describe("isUniqueViolation", () => {
  test("matches the exact SQLSTATE and index name", () => {
    expect(
      isUniqueViolation(
        { code: "23505", message: 'duplicate key value violates unique constraint "notifications_new_opportunity_link_unique_idx"' },
        "notifications_new_opportunity_link_unique_idx",
      ),
    ).toBe(true);
  });

  test("does not match a different constraint on the same table", () => {
    expect(isUniqueViolation({ code: "23505", message: 'duplicate key value violates unique constraint "notifications_pkey"' }, "notifications_new_opportunity_link_unique_idx")).toBe(false);
  });

  test("does not match the right message text under a different SQLSTATE", () => {
    expect(
      isUniqueViolation(
        { code: "42703", message: 'duplicate key value violates unique constraint "notifications_new_opportunity_link_unique_idx"' },
        "notifications_new_opportunity_link_unique_idx",
      ),
    ).toBe(false);
  });

  test("null error (no failure) is not a match", () => {
    expect(isUniqueViolation(null, "notifications_new_opportunity_link_unique_idx")).toBe(false);
  });

  test("a 23505 with no message at all is not a match -- narrowing by name requires the name to actually be present", () => {
    expect(isUniqueViolation({ code: "23505" }, "notifications_new_opportunity_link_unique_idx")).toBe(false);
  });
});
