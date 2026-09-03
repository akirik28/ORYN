import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * getPageViewStats (lib/admin/queries.ts) -- must return null, never zeroes, when
 * page_views doesn't exist yet (migration 0107 is proposed, not applied), and real numbers
 * once it does. "Not measured" and "measured, found zero" are different claims (see
 * TrafficPage's own doc comment) -- these tests pin that distinction at the function that
 * both the Trafik detail page and the /kumanda overview card read.
 */

const { todayGteMock, last30dGteMock } = vi.hoisted(() => ({
  todayGteMock: vi.fn(),
  last30dGteMock: vi.fn(),
}));

function makeAdmin() {
  return {
    from: (table: string) => {
      if (table !== "page_views") throw new Error(`page-view-stats.test.ts: unexpected table "${table}"`);
      return {
        select: (cols: string) => {
          if (cols === "visitor_hash") return { gte: todayGteMock };
          if (cols === "id") return { gte: last30dGteMock };
          throw new Error(`page-view-stats.test.ts: unexpected select "${cols}"`);
        },
      };
    },
  } as never;
}

beforeEach(() => {
  todayGteMock.mockReset();
  last30dGteMock.mockReset();
});

describe("getPageViewStats", () => {
  test("page_views missing (PGRST205) -- returns null silently, no console.error", async () => {
    const { getPageViewStats } = await import("@/lib/admin/queries");
    const missingTableError = { code: "PGRST205", message: "Could not find the table 'public.page_views' in the schema cache" };
    todayGteMock.mockResolvedValue({ data: null, error: missingTableError });
    last30dGteMock.mockResolvedValue({ data: null, error: missingTableError });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getPageViewStats(makeAdmin())).toBeNull();
    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("an unrecognized error -- returns null AND logs, unlike the expected missing-table case", async () => {
    const { getPageViewStats } = await import("@/lib/admin/queries");
    todayGteMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    last30dGteMock.mockResolvedValue({ data: [], error: null });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await getPageViewStats(makeAdmin())).toBeNull();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  test("live, zero rows -- returns real zeroes, not null (measured-zero, not not-measured)", async () => {
    const { getPageViewStats } = await import("@/lib/admin/queries");
    todayGteMock.mockResolvedValue({ data: [], error: null });
    last30dGteMock.mockResolvedValue({ data: [], error: null });

    expect(await getPageViewStats(makeAdmin())).toEqual({ uniqueVisitorsToday: 0, pageViewsLast30d: 0 });
  });

  test("live, real rows -- dedupes today's hashes but counts every 30-day row raw", async () => {
    const { getPageViewStats } = await import("@/lib/admin/queries");
    // Same hash appears twice today (two page loads, one visitor) -- must count as 1.
    todayGteMock.mockResolvedValue({
      data: [{ visitor_hash: "hash-a" }, { visitor_hash: "hash-a" }, { visitor_hash: "hash-b" }],
      error: null,
    });
    // 30-day window: 5 raw rows -- a page-views count, deliberately not deduplicated (see
    // pageViewsLast30d's own doc comment on the interface for why summing distinct-per-day
    // hashes across multiple days would over-count instead).
    last30dGteMock.mockResolvedValue({ data: [{ id: "1" }, { id: "2" }, { id: "3" }, { id: "4" }, { id: "5" }], error: null });

    expect(await getPageViewStats(makeAdmin())).toEqual({ uniqueVisitorsToday: 2, pageViewsLast30d: 5 });
  });
});
