import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Same mocking shape as __tests__/ai/monthly-quota.test.ts (dynamic import + vi.resetModules
 * per test, since the mock's return value changes per test) — deliberately mocking the ADMIN
 * client here, not the regular server client: see lib/comparison/usage.ts's own header for
 * why this reader uses createAdminClient rather than mirroring getMonthlyQuota's
 * createClient exactly.
 */

const createAdminClient = vi.hoisted(() => vi.fn());
const logEvent = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient }));
vi.mock("@/lib/analytics/log", () => ({ logEvent }));
vi.mock("server-only", () => ({}));

function storeReturning(result: { rows: Array<{ metadata: unknown }> } | Error) {
  createAdminClient.mockReturnValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve({ data: result.rows, error: null })),
          }),
        }),
      }),
    }),
  });
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
  logEvent.mockClear();
});
afterEach(() => {
  consoleError.mockRestore();
  vi.resetModules();
});

describe("getMonthlyComparisonUsage", () => {
  test("counts distinct comparison keys, not rows — a revisited comparison is free", async () => {
    // Same set viewed 3 times (3 rows, e.g. from a refresh or a revisited link) plus one
    // genuinely different comparison — must read as 2 used, not 4.
    storeReturning({
      rows: [
        { metadata: { key: "university:a,b" } },
        { metadata: { key: "university:a,b" } },
        { metadata: { key: "university:a,b" } },
        { metadata: { key: "university:c,d" } },
      ],
    });
    const { getMonthlyComparisonUsage } = await import("@/lib/comparison/usage");
    const usage = await getMonthlyComparisonUsage("user-1");

    expect(usage.used).toBe(2);
    expect(usage.remaining).toBe(3);
    expect(usage.usedIsKnown).toBe(true);
  });

  test("a genuine zero is not confused with an unreadable count", async () => {
    storeReturning({ rows: [] });
    const { getMonthlyComparisonUsage } = await import("@/lib/comparison/usage");
    const usage = await getMonthlyComparisonUsage("user-1");

    expect(usage.used).toBe(0);
    expect(usage.usedIsKnown).toBe(true);
    expect(usage.remaining).toBe(usage.limit);
  });

  test("a row with a malformed/missing key is skipped rather than counted or crashing", async () => {
    storeReturning({ rows: [{ metadata: {} }, { metadata: null }, { metadata: { key: "university:a,b" } }] });
    const { getMonthlyComparisonUsage } = await import("@/lib/comparison/usage");
    const usage = await getMonthlyComparisonUsage("user-1");

    expect(usage.used).toBe(1);
  });

  test("an unreadable count is marked unknown rather than reported as zero used", async () => {
    storeReturning(new Error("connection reset"));
    const { getMonthlyComparisonUsage } = await import("@/lib/comparison/usage");
    const usage = await getMonthlyComparisonUsage("user-1");

    expect(usage.usedIsKnown).toBe(false);
    expect(usage.used).toBe(0);
    expect(consoleError).toHaveBeenCalled();
  });

  test("the limit is exactly MONTHLY_COMPARISON_LIMIT, not a separately-chosen number", async () => {
    storeReturning({ rows: [] });
    const { getMonthlyComparisonUsage } = await import("@/lib/comparison/usage");
    const { MONTHLY_COMPARISON_LIMIT } = await import("@/lib/comparison/limits");
    const usage = await getMonthlyComparisonUsage("user-1");

    expect(usage.limit).toBe(MONTHLY_COMPARISON_LIMIT);
  });
});

describe("logComparisonViewed", () => {
  test("logs the event with the canonical key and item type in metadata", async () => {
    const { logComparisonViewed } = await import("@/lib/comparison/usage");
    await logComparisonViewed("user-1", "opportunity", ["z", "a"]);

    expect(logEvent).toHaveBeenCalledWith("user-1", "comparison_viewed", { itemType: "opportunity", key: "opportunity:a,z" });
  });
});
