import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * The quota is the only thing standing between one student and the whole Anthropic
 * balance, so the case that matters is not "counts correctly" — it is what happens when
 * the count cannot be read at all.
 *
 * That state used to be indistinguishable from "nothing spent": `used` fell back to 0, so
 * the meter drew a full bar and the enforcement path saw a full allowance. The fallback
 * itself is a deliberate availability choice (failing closed would take every AI feature
 * down on a transient database error) — what was wrong was that nothing could tell the two
 * apart, including the person reading the code.
 */

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("server-only", () => ({}));

function storeReturning(result: { count: number } | Error) {
  createClient.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            gte: () => (result instanceof Error ? Promise.reject(result) : Promise.resolve(result)),
          }),
        }),
      }),
    }),
  });
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  consoleError.mockRestore();
  vi.resetModules();
});

describe("getMonthlyQuota", () => {
  test("a successful read is marked known", async () => {
    storeReturning({ count: 12 });
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1", "advisor_chat");

    expect(quota.usedIsKnown).toBe(true);
    expect(quota.used).toBe(12);
    expect(quota.remaining).toBe(quota.limit - 12);
  });

  test("an unreadable count is marked unknown rather than reported as zero used", async () => {
    storeReturning(new Error("connection reset"));
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1", "advisor_chat");

    // `used` still reads 0 so the surface renders, but the flag is what a caller must branch
    // on — this is exactly the pair that used to be indistinguishable.
    expect(quota.usedIsKnown).toBe(false);
    expect(quota.used).toBe(0);
    expect(consoleError).toHaveBeenCalled();
  });

  test("a genuine zero is not confused with an unreadable count", async () => {
    storeReturning({ count: 0 });
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1", "advisor_chat");

    expect(quota.used).toBe(0);
    expect(quota.usedIsKnown).toBe(true);
  });
});

describe("isMonthlyQuotaExhausted", () => {
  test("blocks once the allowance is spent", async () => {
    const { MONTHLY_AI_QUOTAS } = await import("@/lib/ai/monthly-quota");
    storeReturning({ count: MONTHLY_AI_QUOTAS.advisor_chat });
    const { isMonthlyQuotaExhausted } = await import("@/lib/ai/monthly-quota");

    expect(await isMonthlyQuotaExhausted("user-1", "advisor_chat")).toBe(true);
  });

  test("permits the call when the count is unreadable — deliberate, and asserted so a silent flip is caught", async () => {
    storeReturning(new Error("connection reset"));
    const { isMonthlyQuotaExhausted } = await import("@/lib/ai/monthly-quota");

    expect(await isMonthlyQuotaExhausted("user-1", "advisor_chat")).toBe(false);
  });
});
