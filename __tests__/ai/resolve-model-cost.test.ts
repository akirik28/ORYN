import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * resolveModelCostUsd (lib/ai/pricing.ts, 2026-09-03) — the live-aware cost estimate for
 * logAIUsage, the hottest path in the AI system. Its own in-memory cache is module-level
 * mutable state, so every test here uses vi.resetModules() + a fresh dynamic import, the
 * same isolation pattern __tests__/ai/monthly-quota.test.ts's own header explains — without
 * it, the cache populated by one test would silently answer the next one's query.
 */

interface MockPricingRow {
  model: string;
  input_rate_per_million: number;
  output_rate_per_million: number;
}

const { tryCreateAdminClientMock, selectMock } = vi.hoisted(() => ({
  tryCreateAdminClientMock: vi.fn(),
  selectMock: vi.fn<() => Promise<{ data: MockPricingRow[] | null; error: unknown }>>(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  tryCreateAdminClient: tryCreateAdminClientMock,
  createAdminClient: () => {
    throw new Error("resolveModelCostUsd should only ever call tryCreateAdminClient (fail-open), not createAdminClient (throws)");
  },
}));

function adminReturning(result: { data: MockPricingRow[] | null; error: unknown }) {
  selectMock.mockResolvedValue(result);
  return { from: () => ({ select: selectMock }) };
}

beforeEach(() => {
  tryCreateAdminClientMock.mockReset();
  selectMock.mockReset();
});

afterEach(() => {
  vi.resetModules();
  vi.useRealTimers();
});

describe("resolveModelCostUsd — no live override", () => {
  test("falls back to estimateCostUsd's own hardcoded table when the model isn't overridden", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);

    expect(cost).toBe(3); // same rate __tests__/ai/pricing.test.ts pins for estimateCostUsd
  });

  test("a model in neither the DB nor the hardcoded table returns null, not a fabricated cost", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("some-future-model-nobody-added-yet", 1000, 1000);

    expect(cost).toBeNull();
  });

  test("admin client unavailable falls back to the hardcoded table, not null or zero", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("claude-haiku-4-5", 1_000_000, 0);

    expect(cost).toBe(1); // haiku's own hardcoded input rate
  });

  test("a failed DB read falls back to the hardcoded table rather than throwing", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: null, error: { message: "connection reset" } }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);

    expect(cost).toBe(3);
  });
});

describe("resolveModelCostUsd — a live override exists", () => {
  test("an override for an already-hardcoded model replaces the hardcoded rate", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ model: "claude-sonnet-5", input_rate_per_million: 100, output_rate_per_million: 500 }], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);

    expect(cost).toBe(100); // the override, not the hardcoded $3
  });

  test("an override for a model absent from the hardcoded table prices it for the first time", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ model: "claude-future-6", input_rate_per_million: 20, output_rate_per_million: 80 }], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("claude-future-6", 500_000, 250_000);

    expect(cost).toBeCloseTo(500_000 * 20e-6 + 250_000 * 80e-6, 10);
  });

  test("an override for one model doesn't affect a different, unrelated model", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ model: "claude-sonnet-5", input_rate_per_million: 100, output_rate_per_million: 500 }], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const cost = await resolveModelCostUsd("claude-haiku-4-5", 1_000_000, 0);

    expect(cost).toBe(1); // haiku's own hardcoded rate, untouched by sonnet's override
  });
});

describe("resolveModelCostUsd — caching (this is the hottest path in the AI system)", () => {
  test("two calls within the TTL only read the database once", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    await resolveModelCostUsd("claude-sonnet-5", 100, 100);
    await resolveModelCostUsd("claude-sonnet-5", 100, 100);

    expect(tryCreateAdminClientMock).toHaveBeenCalledTimes(1);
  });

  test("a call after the TTL expires reads the database again", async () => {
    vi.useFakeTimers();
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    await resolveModelCostUsd("claude-sonnet-5", 100, 100);
    vi.advanceTimersByTime(61_000); // just past the 60s TTL
    await resolveModelCostUsd("claude-sonnet-5", 100, 100);

    expect(tryCreateAdminClientMock).toHaveBeenCalledTimes(2);
  });

  test("a fresh override takes effect once the TTL expires, without restarting the process", async () => {
    vi.useFakeTimers();
    tryCreateAdminClientMock.mockReturnValueOnce(adminReturning({ data: [], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const before = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);
    expect(before).toBe(3);

    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ model: "claude-sonnet-5", input_rate_per_million: 999, output_rate_per_million: 999 }], error: null }));
    vi.advanceTimersByTime(61_000);
    const after = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);

    expect(after).toBe(999);
  });

  test("a transient failure after a successful fetch keeps using the last known-good rates, not an empty map", async () => {
    vi.useFakeTimers();
    tryCreateAdminClientMock.mockReturnValueOnce(adminReturning({ data: [{ model: "claude-sonnet-5", input_rate_per_million: 42, output_rate_per_million: 42 }], error: null }));
    const { resolveModelCostUsd } = await import("@/lib/ai/pricing");

    const firstFetch = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);
    expect(firstFetch).toBe(42);

    tryCreateAdminClientMock.mockReturnValue(null); // simulate the admin client going unavailable
    vi.advanceTimersByTime(61_000);
    const duringOutage = await resolveModelCostUsd("claude-sonnet-5", 1_000_000, 0);

    // Still 42 -- the last successfully-fetched override, not a reversion to the $3
    // hardcoded rate or a fabricated fallback. Losing a known override during a transient
    // outage would understate spend exactly like a stale "no override" read would.
    expect(duringOutage).toBe(42);
  });
});
