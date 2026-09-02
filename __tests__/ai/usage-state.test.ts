import { describe, expect, test } from "vitest";
import { usageState } from "@/lib/ai/usage-state";
import type { MonthlyQuota } from "@/lib/ai/monthly-quota";

/**
 * The single classification both features/advisor/monthly-usage-meter.tsx and
 * features/app-shell/usage-indicator.tsx derive their colour/copy from (2026-09-02,
 * founder-requested always-visible usage bar). Pinned directly here rather than only
 * through whichever component happens to render it first.
 */
function quota(overrides: Partial<MonthlyQuota> = {}): MonthlyQuota {
  return {
    used: 42,
    limit: 300,
    remaining: 258,
    fraction: 42 / 300,
    resetsAt: "2026-10-01T00:00:00.000Z",
    usedIsKnown: true,
    ...overrides,
  };
}

describe("usageState", () => {
  test("unknown outranks everything else — the count could not be read at all", () => {
    expect(usageState(quota({ usedIsKnown: false }), false)).toBe("unknown");
    // Even a genuinely exhausted-looking or degraded quota reads as unknown first, since
    // an unreadable count means remaining/limit aren't trustworthy either.
    expect(usageState(quota({ usedIsKnown: false, remaining: 0 }), true)).toBe("unknown");
  });

  test("exhausted: the 300-message backstop is genuinely gone", () => {
    expect(usageState(quota({ remaining: 0 }), false)).toBe("exhausted");
  });

  test("degraded takes priority over low — a student can be several degraded replies deep while the message backstop still shows plenty left", () => {
    // remaining is nowhere near the 10% floor, but budgetDegraded is true.
    expect(usageState(quota({ remaining: 260 }), true)).toBe("degraded");
  });

  test("degraded does not override a genuine exhausted state", () => {
    expect(usageState(quota({ remaining: 0 }), true)).toBe("exhausted");
  });

  test("low: within the last 10% of the limit, not degraded", () => {
    expect(usageState(quota({ remaining: 25, limit: 300 }), false)).toBe("low");
  });

  test("normal: comfortably within the allowance, not degraded", () => {
    expect(usageState(quota({ remaining: 258 }), false)).toBe("normal");
  });

  test("exactly at the 10% boundary counts as low, not normal", () => {
    expect(usageState(quota({ remaining: 30, limit: 300 }), false)).toBe("low");
  });

  test("just above the 10% boundary counts as normal", () => {
    expect(usageState(quota({ remaining: 31, limit: 300 }), false)).toBe("normal");
  });
});
