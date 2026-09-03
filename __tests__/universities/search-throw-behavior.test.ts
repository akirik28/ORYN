import { describe, expect, test, vi } from "vitest";
import { searchUniversityRows } from "@/lib/universities/alias-search";
import { loadUniversityBrowsePage } from "@/lib/universities/browse-page";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-03 (tier 2): searchUniversityRows used to log an RPC failure and return `[]` --
 * indistinguishable from "no results" to every caller. Now throws (matching
 * lib/search/index.ts's own unwrap() convention, its sibling sources in the same
 * Promise.all). loadUniversityBrowsePage -- which serves filter-browsing and plain
 * browsing through the same call site, not just search -- catches it locally to keep its
 * own prior tolerant behavior exactly, rather than taking the whole page down to the
 * generic app/(app)/error.tsx boundary over a search-specific failure. Both halves of that
 * split are pinned here so a future change to either doesn't silently undo the other.
 */

function fakeRpcClient(rpcResult: { data: unknown; error: { code?: string; message: string } | null }): SupabaseClient<Database> {
  return { rpc: () => Promise.resolve(rpcResult) } as unknown as SupabaseClient<Database>;
}

describe("searchUniversityRows", () => {
  test("a real RPC error throws, not a silent []", async () => {
    const client = fakeRpcClient({ data: null, error: { code: "XX000", message: "connection reset" } });
    await expect(searchUniversityRows(client, "MIT", { limit: 8 })).rejects.toThrow(/University search failed.*connection reset/);
  });

  test("success still returns [] for a genuinely empty match, no throw", async () => {
    const client = fakeRpcClient({ data: [], error: null });
    await expect(searchUniversityRows(client, "zzzznomatch", { limit: 8 })).resolves.toEqual([]);
  });

  test("a blank query short-circuits to [] before the RPC is even called", async () => {
    const rpc = vi.fn();
    const client = { rpc } as unknown as SupabaseClient<Database>;
    const result = await searchUniversityRows(client, "   ", { limit: 8 });
    expect(result).toEqual([]);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("loadUniversityBrowsePage — text search path", () => {
  test("a thrown search failure is caught, logged, and degrades to a real empty result -- the page does not crash", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeRpcClient({ data: null, error: { message: "connection reset" } });
    const result = await loadUniversityBrowsePage(client, { q: "MIT", scopedCountries: null, type: null, sort: "name", cost: [], size: [], rank: null, detailedOnly: false, page: 1 }, [], {});
    // sizeUnknownCount/costUnknownCount are only computed when that specific filter is
    // active (applyRangeFilters' own guard) -- undefined here, not 0, since neither is set
    // on this call. The point of this test is `universities`/`total`, not those two.
    expect(result).toEqual({ universities: [], total: 0, sizeUnknownCount: undefined, costUnknownCount: undefined });
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
