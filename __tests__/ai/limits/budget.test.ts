import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/ai/limits/budget.ts — the per-user AI spend cap's sole enforcement point (2026-09-02).
 *
 * Contract under test, from the founder's own constraint: $0.50/month target triggers a
 * degrade to a cheaper model, never a hard wall. These tests pin the boundary (>=, not >),
 * the two "fail open" paths (no admin client, query error — a broken check must never punish
 * a student for the check's own unavailability), the defensive unknown-cost-row degrade, and
 * the UTC-calendar-month scoping — each one a real behavioral decision this module documents
 * inline, not an incidental implementation detail.
 */

interface MockRow {
  estimated_cost: number | null;
}

interface CapturedQuery {
  userId: string;
  gteColumn: string;
  gteValue: string;
}

const { tryCreateAdminClientMock, capturedQueryRef } = vi.hoisted(() => ({
  tryCreateAdminClientMock: vi.fn(),
  capturedQueryRef: { current: null as CapturedQuery | null },
}));

vi.mock("@/lib/supabase/admin", () => ({
  tryCreateAdminClient: tryCreateAdminClientMock,
  createAdminClient: () => {
    throw new Error("selectModelForUser should only ever call tryCreateAdminClient (fail-open), not createAdminClient (throws)");
  },
}));

import { selectModelForUser } from "@/lib/ai/limits/budget";
import { env } from "@/lib/env";

const USER_ID = "22222222-2222-4222-8222-222222222222";

function adminReturning(result: { data: MockRow[] | null; error: unknown }) {
  return {
    from: () => ({
      select: () => ({
        eq: (_column: string, userId: string) => ({
          gte: async (gteColumn: string, gteValue: string) => {
            capturedQueryRef.current = { userId, gteColumn, gteValue };
            return result;
          },
        }),
      }),
    }),
  };
}

beforeEach(() => {
  tryCreateAdminClientMock.mockReset();
  capturedQueryRef.current = null;
});

describe("selectModelForUser", () => {
  test("no user — ceiling model, and no budget check is even attempted", async () => {
    const selection = await selectModelForUser(null);

    expect(selection).toEqual({ model: env.anthropic.model, degraded: false, reason: "no_user", monthToDateSpendUsd: null });
    expect(tryCreateAdminClientMock).not.toHaveBeenCalled();
  });

  test("admin client unavailable — fails open to the ceiling model, not degraded", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);

    const selection = await selectModelForUser(USER_ID);

    expect(selection).toEqual({ model: env.anthropic.model, degraded: false, reason: "usage_unavailable", monthToDateSpendUsd: null });
  });

  test("ai_usage query fails — fails open to the ceiling model, not degraded", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: null, error: { message: "connection reset" } }));

    const selection = await selectModelForUser(USER_ID);

    expect(selection).toEqual({ model: env.anthropic.model, degraded: false, reason: "usage_unavailable", monthToDateSpendUsd: null });
  });

  test("well under target — ceiling model, exact spend reported", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      adminReturning({ data: [{ estimated_cost: 0.035 }, { estimated_cost: 0.014 }], error: null }),
    );

    const selection = await selectModelForUser(USER_ID);

    expect(selection.model).toBe(env.anthropic.model);
    expect(selection.degraded).toBe(false);
    expect(selection.reason).toBe("under_target");
    expect(selection.monthToDateSpendUsd).toBeCloseTo(0.049, 10);
  });

  test("spend exactly at the target degrades — boundary is >=, not >", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: 0.5 }], error: null }));

    const selection = await selectModelForUser(USER_ID);

    expect(selection.degraded).toBe(true);
    expect(selection.reason).toBe("at_or_over_target");
    expect(selection.model).not.toBe(env.anthropic.model);
    expect(selection.monthToDateSpendUsd).toBe(0.5);
  });

  test("spend over target degrades", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      adminReturning({ data: [{ estimated_cost: 0.9 }, { estimated_cost: 0.2 }], error: null }),
    );

    const selection = await selectModelForUser(USER_ID);

    expect(selection.degraded).toBe(true);
    expect(selection.reason).toBe("at_or_over_target");
    expect(selection.model).not.toBe(env.anthropic.model);
  });

  test("an unpriced row degrades defensively even though known spend is nowhere near target", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      adminReturning({ data: [{ estimated_cost: 0.01 }, { estimated_cost: null }], error: null }),
    );

    const selection = await selectModelForUser(USER_ID);

    expect(selection.degraded).toBe(true);
    expect(selection.reason).toBe("unknown_cost_this_month");
    expect(selection.model).not.toBe(env.anthropic.model);
    // Reports the known partial sum, not null — the ambiguity is in whether it's complete,
    // not in the arithmetic on the rows that do have a price.
    expect(selection.monthToDateSpendUsd).toBeCloseTo(0.01, 10);
  });

  test("scopes the query to this user and the start of the current UTC calendar month", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));

    await selectModelForUser(USER_ID);

    const now = new Date();
    const expectedMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();

    expect(capturedQueryRef.current?.userId).toBe(USER_ID);
    expect(capturedQueryRef.current?.gteColumn).toBe("created_at");
    expect(capturedQueryRef.current?.gteValue).toBe(expectedMonthStart);
  });
});
