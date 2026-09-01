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

import { selectModelForUser, getSpendQuota, MONTHLY_BUDGET_TARGET_USD, MONTHLY_BUDGET_CEILING_USD } from "@/lib/ai/limits/budget";
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

/**
 * getSpendQuota — the UI-facing view added 2026-09-02 to close the gap oryn-b9 found:
 * MonthlyUsageMeter renders a 300-message quota that has nothing to do with this file's
 * $0.50 target, so a student could be degraded for a while before the meter shows anything
 * unusual. These pin that getSpendQuota's `degraded` always agrees with what
 * selectModelForUser would actually decide for the same inputs — the property that matters,
 * since a UI reading a *second*, independently-wrong number would just move the lie rather
 * than fix it.
 */
describe("getSpendQuota", () => {
  test("well under target — not degraded, exact spend and fraction reported", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: 0.1 }], error: null }));

    const quota = await getSpendQuota(USER_ID);

    expect(quota.spentUsd).toBeCloseTo(0.1, 10);
    expect(quota.spentIsKnown).toBe(true);
    expect(quota.degraded).toBe(false);
    expect(quota.targetUsd).toBe(MONTHLY_BUDGET_TARGET_USD);
    expect(quota.ceilingUsd).toBe(MONTHLY_BUDGET_CEILING_USD);
    expect(quota.fraction).toBeCloseTo(0.1 / MONTHLY_BUDGET_TARGET_USD, 10);
  });

  test("at or over target — degraded true, agreeing with selectModelForUser for the same data", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: MONTHLY_BUDGET_TARGET_USD }], error: null }));

    const quota = await getSpendQuota(USER_ID);

    expect(quota.degraded).toBe(true);
    expect(quota.spentIsKnown).toBe(true);
    expect(quota.fraction).toBe(1); // clamped, not > 1
  });

  test("spend well past target clamps fraction to 1 rather than overflowing the bar", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: MONTHLY_BUDGET_TARGET_USD * 3 }], error: null }));

    const quota = await getSpendQuota(USER_ID);

    expect(quota.fraction).toBe(1);
    expect(quota.degraded).toBe(true);
  });

  test("an unpriced row: spend is still known (a real partial sum), but degraded is true — the two fields answer different questions", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: 0.01 }, { estimated_cost: null }], error: null }));

    const quota = await getSpendQuota(USER_ID);

    expect(quota.spentIsKnown).toBe(true);
    expect(quota.spentUsd).toBeCloseTo(0.01, 10);
    expect(quota.degraded).toBe(true); // the defensive degrade, not a statement that spend itself is unknown
  });

  test("usage unavailable (no admin client) — spentUsd null, spentIsKnown false, NOT degraded", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);

    const quota = await getSpendQuota(USER_ID);

    expect(quota.spentUsd).toBeNull();
    expect(quota.spentIsKnown).toBe(false);
    expect(quota.degraded).toBe(false); // fails open — matches selectModelForUser's own usage_unavailable branch, never punishes the student for the check's own outage
    expect(quota.fraction).toBe(0); // an unreadable count is not the same as an empty bar's worth of confidence, but there is no fraction to show either
  });

  test("resetsAt is the first instant of next UTC calendar month", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));

    const quota = await getSpendQuota(USER_ID);

    const now = new Date();
    const expectedResetsAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString();
    expect(quota.resetsAt).toBe(expectedResetsAt);
  });
});
