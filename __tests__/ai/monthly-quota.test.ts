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
 *
 * 2026-09-02, token-metering change: `getMonthlyQuota`/`isMonthlyQuotaExhausted` dropped
 * their `feature` parameter (one shared pool across `PER_STUDENT_AI_FEATURES` now, not a
 * per-feature message count). The mock below moved with it: `.select("estimated_cost")
 * ...in("feature", ...)` summed in JS, not a `{ count: "exact", head: true }` query.
 *
 * 2026-09-02, second pass, same day: `used`/`limit`/`remaining` moved from a floored
 * cost-derived "AI uses" figure to the same figure scaled by `TOKENS_PER_USE_REFERENCE`
 * (4,723) — the founder rejected "uses" as a relabelled message count. The values below are
 * the token-scaled ones; the underlying $ boundaries (the $0.50/$1.00 targets, which
 * spend amounts cross the exhausted line) are unchanged from before this pass.
 */

const createClient = vi.hoisted(() => vi.fn());
vi.mock("@/lib/supabase/server", () => ({ createClient }));
vi.mock("server-only", () => ({}));

function storeReturning(result: { rows: Array<{ estimated_cost: number | null }> } | Error) {
  createClient.mockResolvedValue({
    from: () => ({
      select: () => ({
        eq: () => ({
          in: () => ({
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
});
afterEach(() => {
  consoleError.mockRestore();
  vi.resetModules();
});

describe("getMonthlyQuota", () => {
  test("a successful read is marked known, and spend converts to tokens via the reference cost", async () => {
    // $0.06 at the pre-degrade $0.03/use reference is exactly 2 reference uses, scaled to
    // 2 × 4,723 = 9,446 tokens — a round underlying number chosen so this test isn't itself
    // asserting on a floor/rounding edge.
    storeReturning({ rows: [{ estimated_cost: 0.03 }, { estimated_cost: 0.03 }] });
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1");

    expect(quota.usedIsKnown).toBe(true);
    expect(quota.used).toBe(9446);
    expect(quota.remaining).toBe(quota.limit - 9446);
  });

  test("spend past the $0.50 target keeps accumulating, just at the cheaper post-degrade rate", async () => {
    // $0.53 total: $0.50 pre-degrade capacity (~16.67 reference uses) plus $0.03 more at
    // the post-degrade $0.01/use rate (3 more reference uses) = ~19.67, scaled to tokens
    // and floored: 92,885 — not the ~83,000-token figure a flat $0.03/use division would
    // give, which is exactly the miscalibration usesConsumed's own comment explains (it
    // would understate real capacity and make the full allowance correspond to $1.50, not
    // $1.00).
    storeReturning({ rows: [{ estimated_cost: 0.53 }] });
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1");

    expect(quota.used).toBe(92885);
  });

  test("an unreadable count is marked unknown rather than reported as zero used", async () => {
    storeReturning(new Error("connection reset"));
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1");

    // `used` still reads 0 so the surface renders, but the flag is what a caller must branch
    // on — this is exactly the pair that used to be indistinguishable.
    expect(quota.usedIsKnown).toBe(false);
    expect(quota.used).toBe(0);
    expect(consoleError).toHaveBeenCalled();
  });

  test("a genuine zero is not confused with an unreadable count", async () => {
    storeReturning({ rows: [] });
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1");

    expect(quota.used).toBe(0);
    expect(quota.usedIsKnown).toBe(true);
  });

  test("a single row with a NULL estimated_cost marks the whole month unknown, not silently under-counted", async () => {
    // SUM ignores NULLs — summing through this would read as $0.03 spent (one real row)
    // instead of "we don't actually know what this row cost," undercounting exactly the
    // spend this check exists to see. Same failure shape selectModelForUser already
    // guards against on the degrade side (lib/ai/limits/budget.ts's hasUnknownCostRows).
    storeReturning({ rows: [{ estimated_cost: 0.03 }, { estimated_cost: null }] });
    const { getMonthlyQuota } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1");

    expect(quota.usedIsKnown).toBe(false);
  });

  test("the token limit is exactly 50 reference uses' worth, not a separately-chosen number", async () => {
    storeReturning({ rows: [] });
    const { getMonthlyQuota, TOKENS_PER_USE_REFERENCE, MONTHLY_AI_TOKEN_LIMIT } = await import("@/lib/ai/monthly-quota");
    const quota = await getMonthlyQuota("user-1");

    expect(TOKENS_PER_USE_REFERENCE).toBe(4723);
    expect(MONTHLY_AI_TOKEN_LIMIT).toBe(50 * 4723);
    expect(quota.limit).toBe(MONTHLY_AI_TOKEN_LIMIT);
  });
});

describe("isMonthlyQuotaExhausted", () => {
  test("blocks once real spend converts to at least the shared token limit", async () => {
    // $1.00 converts to 314,866 floored tokens (well past the 236,150 limit, with real
    // margin — see MONTHLY_AI_TOKEN_LIMIT's own comment on why the allowance sits under
    // $1.00, not at its edge). The $-boundary is unchanged from the pre-token-display pass;
    // only the number it's expressed in changed.
    storeReturning({ rows: [{ estimated_cost: 1.0 }] });
    const { isMonthlyQuotaExhausted } = await import("@/lib/ai/monthly-quota");

    expect(await isMonthlyQuotaExhausted("user-1")).toBe(true);
  });

  test("does not block a moment before the limit is genuinely reached", async () => {
    // $0.80 converts to 220,406 floored tokens — under the 236,150 limit, so still
    // permitted. Pinned so a future change to the piecewise formula or the token reference
    // can't silently start blocking earlier than it should without a test noticing.
    storeReturning({ rows: [{ estimated_cost: 0.8 }] });
    const { isMonthlyQuotaExhausted } = await import("@/lib/ai/monthly-quota");

    expect(await isMonthlyQuotaExhausted("user-1")).toBe(false);
  });

  test("permits the call when the count is unreadable — deliberate, and asserted so a silent flip is caught", async () => {
    storeReturning(new Error("connection reset"));
    const { isMonthlyQuotaExhausted } = await import("@/lib/ai/monthly-quota");

    expect(await isMonthlyQuotaExhausted("user-1")).toBe(false);
  });
});
