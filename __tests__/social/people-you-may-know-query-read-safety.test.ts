import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * 2026-09-03: readOr adoption, tier 2 -- getPeopleYouMayKnow had 12 unchecked reads across
 * its two-hop candidate-gathering pipeline. Its own header comment already establishes the
 * house philosophy for this function precisely: "a supplementary section, not load-bearing
 * for the page to render" -- so the fix stays pure visibility (log which read failed, by
 * name), matching that already-stated intent rather than adding a new "incomplete" signal
 * this function was explicitly designed not to need. Pure scoring logic (people-you-may-
 * know.ts) already has its own coverage; these tests are for the query/read-wiring layer
 * only.
 */

type QueryResult = { data: unknown[] | null; error: { message: string } | null };

function fakeAdmin(overrides: Record<string, QueryResult> = {}) {
  return {
    from: (table: string) => {
      const result = overrides[table] ?? { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        or: () => builder,
        in: () => builder,
        limit: () => Promise.resolve(result),
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
}

const { tryCreateAdminClientMock } = vi.hoisted(() => ({ tryCreateAdminClientMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: tryCreateAdminClientMock }));

import { getPeopleYouMayKnow } from "@/lib/social/people-you-may-know-query";

const USER_ID = "user-1";

beforeEach(() => {
  tryCreateAdminClientMock.mockReset();
});

describe("getPeopleYouMayKnow", () => {
  test("no admin client available: returns [] immediately, no reads attempted", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);
    const result = await getPeopleYouMayKnow(USER_ID);
    expect(result).toEqual([]);
  });

  test("every read succeeds, no candidates: returns [], logs nothing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    tryCreateAdminClientMock.mockReturnValue(fakeAdmin());
    const result = await getPeopleYouMayKnow(USER_ID);
    expect(result).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("a failed connections read degrades to [] for that read (unchanged) and is logged, not silent -- and does not crash the rest of the pipeline", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    tryCreateAdminClientMock.mockReturnValue(fakeAdmin({ connections: { data: null, error: { message: "boom" } } }));
    const result = await getPeopleYouMayKnow(USER_ID);
    expect(result).toEqual([]);
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("getPeopleYouMayKnow.connections"))).toBe(true);
    spy.mockRestore();
  });

  test("a failed profiles (my own) read: school-based candidate gathering skips cleanly rather than throwing", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    tryCreateAdminClientMock.mockReturnValue(fakeAdmin({ profiles: { data: null, error: { message: "boom" } } }));
    const result = await getPeopleYouMayKnow(USER_ID);
    expect(result).toEqual([]);
    expect(spy.mock.calls.some(([m]) => typeof m === "string" && m.includes("getPeopleYouMayKnow.myProfile"))).toBe(true);
    spy.mockRestore();
  });
});
