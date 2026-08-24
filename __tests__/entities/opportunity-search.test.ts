import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { searchEntities } from "@/lib/entities/search";

/**
 * Regression cover for opportunities being visible in Opportunities but unfindable from
 * Journey.
 *
 * Root cause, confirmed against the live catalogue: `searchOpportunities` applied the
 * student's profile country as a hard `.eq("country", ...)` exclusion. `opportunities.country`
 * is null for anything international or online — 243 of 421 rows at the time — so every one
 * of them vanished for any student who had a country set. "Purple Comet! Math Meet"
 * (status active, country null) was the founder-reported case; measured against real data,
 * a Turkish student searching "Research" saw 1 result instead of 14, and "Summer" 6 instead
 * of 67.
 *
 * A second, compounding bug: the candidate fetch was an unordered `.limit(300)` with no name
 * predicate, so ranking ran over an arbitrary subset of the table.
 *
 * These tests deliberately assert the *query* the module builds, not just its output —
 * the bug was entirely in which rows were fetched, so a test that only checked ranking of
 * an already-filtered fixture would have passed throughout.
 */

interface OpportunityRow {
  id: string;
  title: string;
  category: string;
  organization: string | null;
  country: string | null;
  status: string;
}

/** The founder-reported case plus two other opportunity types, per the brief. */
const CATALOGUE: OpportunityRow[] = [
  // competition, international — country null. The reported failure.
  { id: "pc", title: "Purple Comet! Math Meet", category: "competition", organization: "Purple Comet", country: null, status: "active" },
  // research, country set to a country that is NOT the student's.
  { id: "rsi", title: "Research Science Institute (RSI)", category: "research", organization: "CEE", country: "United States", status: "active" },
  // summer_program, also foreign.
  { id: "bu", title: "Boston University Summer Term", category: "summer_program", organization: "Boston University", country: "United States", status: "active" },
  // Same country as the student, to prove local rows still resolve.
  { id: "tr", title: "Turkish Summer Research Camp", category: "summer_program", organization: "METU", country: "Turkey", status: "active" },
  // Must never surface: not active.
  { id: "dis", title: "Purple Comet Retired Edition", category: "competition", organization: "Purple Comet", country: null, status: "disabled" },
];

interface RecordedQuery {
  table: string;
  eq: Record<string, unknown>;
  ilike: [string, string][];
  limit: number | null;
}

function mockSupabase(rows: OpportunityRow[]) {
  const recorded: RecordedQuery[] = [];

  function builder(table: string) {
    const q: RecordedQuery = { table, eq: {}, ilike: [], limit: null };
    recorded.push(q);

    const resolve = () => {
      let out = rows;
      for (const [col, val] of Object.entries(q.eq)) {
        out = out.filter((r) => (r as unknown as Record<string, unknown>)[col] === val);
      }
      for (const [col, pattern] of q.ilike) {
        const needle = pattern.replace(/^%|%$/g, "").replace(/\\(.)/g, "$1").toLowerCase();
        out = out.filter((r) =>
          String((r as unknown as Record<string, unknown>)[col] ?? "").toLowerCase().includes(needle),
        );
      }
      if (q.limit !== null) out = out.slice(0, q.limit);
      return { data: out, error: null };
    };

    const chain: Record<string, unknown> = {
      select: () => chain,
      eq: (col: string, val: unknown) => { q.eq[col] = val; return chain; },
      ilike: (col: string, pattern: string) => { q.ilike.push([col, pattern]); return chain; },
      not: () => chain,
      limit: (n: number) => { q.limit = n; return Promise.resolve(resolve()); },
      then: (onOk: (v: unknown) => unknown) => Promise.resolve(resolve()).then(onOk),
    };
    return chain;
  }

  const client = { from: (table: string) => builder(table) } as unknown as SupabaseClient<Database>;
  return { client, recorded };
}

async function search(query: string, country?: string) {
  const { client, recorded } = mockSupabase(CATALOGUE);
  const results = await searchEntities(client, "opportunity", query, country ? { country } : {});
  return { results, recorded };
}

describe("opportunity search — country must not exclude", () => {
  // The exact founder-reported failure.
  test("an international opportunity resolves for a student who has a country", async () => {
    const { results } = await search("Purple Comet", "Turkey");
    expect(results.map((r) => r.displayName)).toContain("Purple Comet! Math Meet");
  });

  test("it resolves identically for a student with no country set", async () => {
    const { results } = await search("Purple Comet");
    expect(results.map((r) => r.displayName)).toContain("Purple Comet! Math Meet");
  });

  // Two further opportunity types, per the brief — the bug was never specific to competitions.
  test("a research opportunity in another country still resolves", async () => {
    const { results } = await search("Research Science", "Turkey");
    expect(results.map((r) => r.displayName)).toContain("Research Science Institute (RSI)");
  });

  test("a summer programme in another country still resolves", async () => {
    const { results } = await search("Boston University", "Turkey");
    expect(results.map((r) => r.displayName)).toContain("Boston University Summer Term");
  });

  test("a local opportunity still resolves too — the fix widens, it doesn't invert", async () => {
    const { results } = await search("Turkish Summer", "Turkey");
    expect(results.map((r) => r.displayName)).toContain("Turkish Summer Research Camp");
  });

  // The guard that would have caught the original bug directly.
  test("country is never used as a SQL exclusion", async () => {
    const { recorded } = await search("Summer", "Turkey");
    const opportunityQuery = recorded.find((q) => q.table === "opportunities");
    expect(opportunityQuery).toBeDefined();
    expect(Object.keys(opportunityQuery!.eq)).not.toContain("country");
  });
});

describe("opportunity search — fetch scope", () => {
  // The compounding bug: an unordered limit with no predicate meant ranking saw an
  // arbitrary slice of the catalogue.
  test("the name filter runs in SQL, not only in memory", async () => {
    const { recorded } = await search("Purple Comet", "Turkey");
    const opportunityQuery = recorded.find((q) => q.table === "opportunities");
    expect(opportunityQuery!.ilike.some(([col]) => col === "title")).toBe(true);
  });

  test("wildcards in the query are escaped rather than widening the pattern", async () => {
    const { recorded } = await search("100%_bonus", "Turkey");
    const opportunityQuery = recorded.find((q) => q.table === "opportunities");
    const [, pattern] = opportunityQuery!.ilike.find(([col]) => col === "title")!;
    expect(pattern).toContain("\\%");
    expect(pattern).toContain("\\_");
  });

  // `searchEntities` refuses a too-short query before dispatching, so the opportunity
  // branch is never reached and no query is issued at all. Asserted here so the
  // `trimmed.length > 0` guard inside searchOpportunities is not mistaken for the thing
  // protecting the database from a blank-query table scan — that guard is a second line.
  test("a blank query never reaches the database", async () => {
    const { results, recorded } = await search("   ", "Turkey");
    expect(results).toEqual([]);
    expect(recorded.find((q) => q.table === "opportunities")).toBeUndefined();
  });
});

describe("opportunity search — status", () => {
  test("only active opportunities are searchable, matching what Browse lists", async () => {
    const { results } = await search("Purple Comet", "Turkey");
    expect(results.map((r) => r.displayName)).not.toContain("Purple Comet Retired Edition");
  });
});
