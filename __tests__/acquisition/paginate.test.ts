import { afterEach, describe, expect, test, vi } from "vitest";
import { fetchAllRows, fetchAllRowsVerified, fetchExactCount } from "@/lib/acquisition/paginate";

const target = { url: "https://example.supabase.co", key: "test-key" };

/** Minimal PostgREST stand-in: serves `total` rows in pages, honouring limit/offset, and
 * reports an exact count in `content-range` the way PostgREST does with `Prefer: count=exact`. */
function stubPostgrest(total: number, opts: { reportedCount?: number } = {}) {
  return vi.fn(async (input: string | URL | Request) => {
    const url = new URL(String(input));
    const limit = Number(url.searchParams.get("limit") ?? total);
    const offset = Number(url.searchParams.get("offset") ?? 0);
    const isCount = limit === 1 && !url.searchParams.has("offset");

    if (isCount) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "content-range": `0-0/${opts.reportedCount ?? total}` }),
        json: async () => [{ id: "row-0" }],
        text: async () => "",
      } as unknown as Response;
    }

    const page = Array.from({ length: Math.max(0, Math.min(limit, total - offset)) }, (_, i) => ({ id: `row-${offset + i}` }));
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      json: async () => page,
      text: async () => "",
    } as unknown as Response;
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchExactCount", () => {
  test("reads the total out of content-range", async () => {
    vi.stubGlobal("fetch", stubPostgrest(1010));
    await expect(fetchExactCount(target, "universities")).resolves.toBe(1010);
  });

  test("throws rather than returning NaN when content-range is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => [], text: async () => "" }) as unknown as Response)
    );
    await expect(fetchExactCount(target, "universities")).rejects.toThrow(/unparseable content-range/);
  });
});

describe("fetchAllRows", () => {
  test("refuses a query with no stable order clause", async () => {
    vi.stubGlobal("fetch", stubPostgrest(10));
    // Paging without an order guarantee can skip or repeat rows, which is silently wrong.
    await expect(fetchAllRows(target, "universities", "id", "country=eq.Turkey")).rejects.toThrow(/order=/);
  });

  test("pages past the 1000-row cap that truncated reads before this existed", async () => {
    vi.stubGlobal("fetch", stubPostgrest(1010));
    const rows = await fetchAllRows<{ id: string }>(target, "universities", "id", "order=id.asc");
    expect(rows).toHaveLength(1010);
    // The row that a single unpaginated request would have silently dropped.
    expect(rows[1009].id).toBe("row-1009");
  });

  test("returns everything when the table fits in one page", async () => {
    vi.stubGlobal("fetch", stubPostgrest(42));
    await expect(fetchAllRows(target, "universities", "id", "order=id.asc")).resolves.toHaveLength(42);
  });

  test("handles an exact multiple of the page size without looping forever", async () => {
    vi.stubGlobal("fetch", stubPostgrest(2000));
    await expect(fetchAllRows(target, "universities", "id", "order=id.asc")).resolves.toHaveLength(2000);
  });

  test("throws on a failed page instead of returning a partial result", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 503, headers: new Headers(), json: async () => [], text: async () => "unavailable" }) as unknown as Response)
    );
    await expect(fetchAllRows(target, "universities", "id", "order=id.asc")).rejects.toThrow(/HTTP 503/);
  });
});

describe("fetchAllRowsVerified", () => {
  test("returns rows when the assembled count matches the server count", async () => {
    vi.stubGlobal("fetch", stubPostgrest(1010));
    const { rows, expected } = await fetchAllRowsVerified<{ id: string }>(target, "universities", "id", "order=id.asc");
    expect(rows).toHaveLength(1010);
    expect(expected).toBe(1010);
  });

  test("throws on a short read rather than proceeding on partial data", async () => {
    // Server says 1010 rows exist but only serves 1000 — precisely the failure that made a
    // truncation bug look like a data-quality refusal.
    vi.stubGlobal("fetch", stubPostgrest(1000, { reportedCount: 1010 }));
    await expect(fetchAllRowsVerified(target, "universities", "id", "order=id.asc")).rejects.toThrow(/assembled 1000 rows but the server counts 1010/);
  });

  test("strips the order clause before counting, so the count query stays valid", async () => {
    const spy = stubPostgrest(5);
    vi.stubGlobal("fetch", spy);
    await fetchAllRowsVerified(target, "universities", "id", "order=name.asc&country=eq.Turkey");
    const countCall = spy.mock.calls.find(([u]) => String(u).includes("limit=1"));
    expect(String(countCall?.[0])).not.toContain("order=");
    expect(String(countCall?.[0])).toContain("country=eq.Turkey");
  });
});
