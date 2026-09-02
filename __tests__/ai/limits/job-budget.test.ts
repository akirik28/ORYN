import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/ai/limits/job-budget.ts — the per-feature monthly budget for background/catalog jobs
 * (opportunity_extraction, requirement_extraction) that lib/ai/limits/budget.ts's
 * per-student cap cannot see (selectModelForUser(null) always returns the ceiling model —
 * correct, there's no student to protect, but it also means nothing else bounds this spend).
 *
 * Deliberately mirrors __tests__/ai/limits/budget.test.ts's structure (same mock shape,
 * same categories of case) but pins the OPPOSITE policy at the limit: budget.ts degrades to
 * a cheaper model and keeps going; this stops entirely. See job-budget.ts's own header for
 * why that's the right call for a job rather than an inconsistency with the student case.
 */

interface MockRow {
  estimated_cost: number | null;
}

interface CapturedQuery {
  feature: string;
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
    throw new Error("job-budget should only ever call tryCreateAdminClient (fail-open), not createAdminClient (throws)");
  },
}));

import { checkJobBudget, assertWithinJobBudget, JobBudgetExceededError, JOB_BUDGET_USD } from "@/lib/ai/limits/job-budget";

interface MockOverrideRow {
  budget_usd: number;
}

/**
 * checkJobBudget now makes two independent admin-client reads (2026-09-02/03, live
 * job-budget-override support): the ai_usage spend sum (as before, via .eq().gte()) and a
 * job_budget_overrides lookup (.eq().maybeSingle()) — dispatched by table name, same
 * "unexpected table throws" convention lib/admin/queries.ts's own test mocks use.
 * `override` defaults to "no row" (data: null), which is the correct default for every
 * pre-existing test below: none of them were written to think about an override at all, and
 * "no override, fall back to JOB_BUDGET_USD" is the behavior that preserves their original
 * intent unchanged.
 */
function adminReturning(usage: { data: MockRow[] | null; error: unknown }, override: { data: MockOverrideRow | null; error: unknown } = { data: null, error: null }) {
  return {
    from: (table: string) => {
      if (table === "job_budget_overrides") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => override }) }) };
      }
      if (table !== "ai_usage") throw new Error(`job-budget.test.ts: unexpected table "${table}"`);
      return {
        select: () => ({
          eq: (_column: string, feature: string) => ({
            gte: async (gteColumn: string, gteValue: string) => {
              capturedQueryRef.current = { feature, gteColumn, gteValue };
              return usage;
            },
          }),
        }),
      };
    },
  };
}

beforeEach(() => {
  tryCreateAdminClientMock.mockReset();
  capturedQueryRef.current = null;
});

describe("checkJobBudget", () => {
  test("admin client unavailable — fails open (allowed), reason usage_unavailable", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.allowed).toBe(true);
    expect(check.reason).toBe("usage_unavailable");
    expect(check.monthToDateSpendUsd).toBeNull();
    expect(check.budgetUsd).toBe(JOB_BUDGET_USD.opportunity_extraction);
  });

  test("ai_usage query fails — fails open (allowed), reason usage_unavailable", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: null, error: { message: "connection reset" } }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.allowed).toBe(true);
    expect(check.reason).toBe("usage_unavailable");
  });

  test("well under budget — allowed, exact spend reported", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: 0.017 }, { estimated_cost: 0.017 }], error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.allowed).toBe(true);
    expect(check.reason).toBe("under_budget");
    expect(check.monthToDateSpendUsd).toBeCloseTo(0.034, 10);
  });

  test("spend exactly at budget is refused — boundary is >=, not >", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: JOB_BUDGET_USD.opportunity_extraction }], error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("over_budget");
  });

  test("spend over budget is refused", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: JOB_BUDGET_USD.opportunity_extraction + 5 }], error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("over_budget");
  });

  test("an unpriced row stops the job — unlike budget.ts, this does not just degrade defensively", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: 0.01 }, { estimated_cost: null }], error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("unknown_cost_this_month");
    expect(check.monthToDateSpendUsd).toBeCloseTo(0.01, 10);
  });

  test("scopes the query to the given feature and the start of the current UTC calendar month", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));

    await checkJobBudget("requirement_extraction");

    const now = new Date();
    const expectedMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
    expect(capturedQueryRef.current?.feature).toBe("requirement_extraction");
    expect(capturedQueryRef.current?.gteColumn).toBe("created_at");
    expect(capturedQueryRef.current?.gteValue).toBe(expectedMonthStart);
  });

  test("each feature checks its own budget figure from JOB_BUDGET_USD", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));

    const opportunityCheck = await checkJobBudget("opportunity_extraction");
    const requirementCheck = await checkJobBudget("requirement_extraction");

    expect(opportunityCheck.budgetUsd).toBe(JOB_BUDGET_USD.opportunity_extraction);
    expect(requirementCheck.budgetUsd).toBe(JOB_BUDGET_USD.requirement_extraction);
  });
});

describe("checkJobBudget — live override (job_budget_overrides, 2026-09-02/03)", () => {
  test("a real override row replaces JOB_BUDGET_USD's own default", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [{ estimated_cost: 40 }], error: null }, { data: { budget_usd: 100 }, error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.budgetUsd).toBe(100);
    expect(check.allowed).toBe(true); // $40 of $100 -- would have been over budget against the $25 default
  });

  test("no override row -- falls back to JOB_BUDGET_USD, not zero or unbudgeted", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }, { data: null, error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.budgetUsd).toBe(JOB_BUDGET_USD.opportunity_extraction);
  });

  test("override lookup itself fails -- still falls back to JOB_BUDGET_USD, never to $0", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }, { data: null, error: { message: "connection reset" } }));

    const check = await checkJobBudget("requirement_extraction");

    expect(check.budgetUsd).toBe(JOB_BUDGET_USD.requirement_extraction);
  });

  test("a $0 override is honored as a real value, not treated as \"no override\" -- an admin can deliberately pause a job this way", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }, { data: { budget_usd: 0 }, error: null }));

    const check = await checkJobBudget("opportunity_extraction");

    expect(check.budgetUsd).toBe(0);
    expect(check.allowed).toBe(false);
    expect(check.reason).toBe("over_budget"); // $0 spent >= $0 budget
  });

  test("the override is scoped to the feature it was looked up for, not shared across both", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }, { data: { budget_usd: 999 }, error: null }));

    const opportunityCheck = await checkJobBudget("opportunity_extraction");
    // A fresh mock with no override for the second call -- confirms the override applies per
    // lookup, not as global mutable state left over from the previous call.
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }, { data: null, error: null }));
    const requirementCheck = await checkJobBudget("requirement_extraction");

    expect(opportunityCheck.budgetUsd).toBe(999);
    expect(requirementCheck.budgetUsd).toBe(JOB_BUDGET_USD.requirement_extraction);
  });
});

describe("assertWithinJobBudget", () => {
  test("resolves silently when under budget", async () => {
    tryCreateAdminClientMock.mockReturnValue(adminReturning({ data: [], error: null }));

    await expect(assertWithinJobBudget("opportunity_extraction")).resolves.toBeUndefined();
  });

  test("throws JobBudgetExceededError, carrying feature/reason/spend, once over budget", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      adminReturning({ data: [{ estimated_cost: JOB_BUDGET_USD.requirement_extraction + 1 }], error: null }),
    );

    const error = await assertWithinJobBudget("requirement_extraction").catch((e) => e);

    expect(error).toBeInstanceOf(JobBudgetExceededError);
    expect((error as InstanceType<typeof JobBudgetExceededError>).feature).toBe("requirement_extraction");
    expect((error as InstanceType<typeof JobBudgetExceededError>).reason).toBe("over_budget");
    expect((error as InstanceType<typeof JobBudgetExceededError>).budgetUsd).toBe(JOB_BUDGET_USD.requirement_extraction);
  });

  test("does not throw when the admin client is unavailable — fails open, same as checkJobBudget", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);

    await expect(assertWithinJobBudget("opportunity_extraction")).resolves.toBeUndefined();
  });
});

describe("envBudgetUsd override (via JOB_BUDGET_USD, read once at module load)", () => {
  test("defaults are positive, finite numbers — a misconfigured env var must never silently zero out the whole budget", () => {
    expect(JOB_BUDGET_USD.opportunity_extraction).toBeGreaterThan(0);
    expect(JOB_BUDGET_USD.requirement_extraction).toBeGreaterThan(0);
    expect(Number.isFinite(JOB_BUDGET_USD.opportunity_extraction)).toBe(true);
    expect(Number.isFinite(JOB_BUDGET_USD.requirement_extraction)).toBe(true);
  });
});
