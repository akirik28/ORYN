import { describe, test, expect, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-02 search audit (CEO's ask, "Does it respect the boundaries the rest of the
 * product enforces? A search over profile items must be scoped to the searching student's
 * own — RLS is the backstop, not the query"): confirmed live against project
 * qtcvcflzxbuagvvwahhu that every user-owned table `lib/search/index.ts` reads
 * (activities/awards/certifications/projects/research_experiences/
 * volunteering_experiences/work_experiences/education_records/test_scores/career_goals,
 * plus applications, checked separately) has `relrowsecurity = true` and an "owner full
 * access" policy (`user_id = auth.uid()`) — so even a code regression here would still be
 * caught by the database. That check had zero direct test coverage of the *app-layer*
 * scoping before this file — this pins it, so a future edit that accidentally drops the
 * `.eq("user_id", ...)` filter (leaving only the RLS backstop) fails a fast unit test
 * instead of only ever being caught by re-reading the code or re-querying pg_policies by
 * hand. `searchGoals`/`searchProfileItems` were exported (only) for this — same
 * "exported so it has a direct test" convention as `import-step.tsx`'s own `flatten`.
 */

import { searchGoals, searchProfileItems } from "@/lib/search";

/** Records exactly what `.eq()` calls happened against which table, in order, before
 * resolving each terminal `.limit()` call to an empty result — enough to assert the
 * *filter* was applied without needing real row data. */
function makeTrackingSupabase() {
  const eqCalls: { table: string; column: string; value: unknown }[] = [];
  const from = vi.fn((table: string) => {
    const builder = {
      select: vi.fn(() => builder),
      eq: vi.fn((column: string, value: unknown) => {
        eqCalls.push({ table, column, value });
        return builder;
      }),
      ilike: vi.fn(() => builder),
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    };
    return builder;
  });
  return { client: { from } as unknown as SupabaseClient<Database>, eqCalls };
}

describe("lib/search — user-owned sources are explicitly scoped, not left to RLS alone", () => {
  test("searchGoals filters career_goals by the searching student's own user_id", async () => {
    const { client, eqCalls } = makeTrackingSupabase();
    await searchGoals(client, "student-1", "%economics%");
    expect(eqCalls).toContainEqual({ table: "career_goals", column: "user_id", value: "student-1" });
  });

  test("searchGoals never queries with a different student's id, even by mistake in a refactor", async () => {
    const { client, eqCalls } = makeTrackingSupabase();
    await searchGoals(client, "student-1", "%x%");
    expect(eqCalls.every((c) => c.value === "student-1")).toBe(true);
  });

  // All 9 achievement-shaped tables searchProfileItems reads, matching the source file's
  // own list exactly — a per-table assertion rather than "at least one call happened",
  // since a regression that scopes 8 of 9 correctly and silently drops the 9th is exactly
  // the failure mode a single aggregate assertion would miss.
  const PROFILE_ITEM_TABLES = [
    "activities",
    "awards",
    "certifications",
    "projects",
    "research_experiences",
    "volunteering_experiences",
    "work_experiences",
    "education_records",
    "test_scores",
  ];

  test.each(PROFILE_ITEM_TABLES)("searchProfileItems scopes %s to the searching student's own user_id", async (table) => {
    const { client, eqCalls } = makeTrackingSupabase();
    await searchProfileItems(client, "student-1", "%robotics%");
    expect(eqCalls).toContainEqual({ table, column: "user_id", value: "student-1" });
  });

  test("searchProfileItems queries all 9 tables, not a subset — a search that silently covers 8 of 9 categories looks finished but isn't", async () => {
    const { client, eqCalls } = makeTrackingSupabase();
    await searchProfileItems(client, "student-1", "%x%");
    const queriedTables = new Set(eqCalls.map((c) => c.table));
    for (const table of PROFILE_ITEM_TABLES) expect(queriedTables.has(table)).toBe(true);
  });
});
