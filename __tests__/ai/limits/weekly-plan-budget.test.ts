import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * lib/ai/limits/weekly-plan-budget.ts — the aggregate-across-every-student monthly ceiling
 * for weekly_plan, the prerequisite for arming generate-weekly-plans (Job D) on a schedule.
 *
 * Deliberately mirrors __tests__/ai/limits/job-budget.test.ts's structure (same mock shape,
 * same categories of case) but pins DEGRADE at the limit, not STOP — see this module's own
 * header for why that's the right call here (a real student behind every call, unlike
 * job-budget.ts's no-user features) while still being a genuinely different mechanism from
 * budget.ts's per-student degrade (this sums across every student, not one).
 */

interface UsageRow {
  estimated_cost: number | null;
}

/** Dispatches by table name, and for ai_usage, by which column .eq() filtered on --
 *  "feature" is this module's own aggregate query, "user_id" is selectModelForUser's
 *  per-student query (called internally by selectModelForWeeklyPlan). Lets one mock serve
 *  both this module's function and the real, unmocked selectModelForUser it composes with
 *  -- vitest can't mock a same-module function call from within a test of a sibling export
 *  in that same module, so the real per-student check has to run against something.
 *
 *  quota_grants (migration 0096, lib/ai/limits/grants.ts) is a concurrent lane's addition
 *  that landed inside selectModelForUser itself after this file's own composition tests
 *  were first written -- every composition test below that passes a real (non-null) userId
 *  now runs the real getMonthlyGrantsUsd too, which this mock must answer or it throws
 *  "unexpected table: quota_grants" before ever reaching the per-student budget logic.
 *  Always empty here: these tests assert the per-student/aggregate interaction, not grants
 *  behavior (that's grants.ts's/budget.test.ts's own concern) -- an empty grants list keeps
 *  effectiveSpendUsd === knownSpendUsd, i.e. exactly what every usageByUser fixture above
 *  already assumed before grants existed. */
function mockAdmin({
  settings,
  usageByFeature,
  usageByUser,
}: {
  settings?: { data: { monthly_ceiling_usd: number } | null; error: unknown };
  usageByFeature?: { data: UsageRow[] | null; error: unknown };
  usageByUser?: { data: UsageRow[] | null; error: unknown };
}) {
  return {
    from: (table: string) => {
      if (table === "weekly_plan_budget_settings") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => settings }) }) };
      }
      if (table === "ai_usage") {
        return {
          select: () => ({
            eq: (column: string) => ({
              gte: async () => (column === "feature" ? usageByFeature : usageByUser),
            }),
          }),
        };
      }
      if (table === "quota_grants") {
        return { select: () => ({ eq: () => ({ gte: async () => ({ data: [], error: null }) }) }) };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

const { tryCreateAdminClientMock } = vi.hoisted(() => ({ tryCreateAdminClientMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  tryCreateAdminClient: tryCreateAdminClientMock,
  createAdminClient: () => {
    throw new Error("weekly-plan-budget should only ever call tryCreateAdminClient (fail-open), not createAdminClient (throws)");
  },
}));

import {
  checkWeeklyPlanAggregateBudget,
  selectModelForWeeklyPlan,
  DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD,
} from "@/lib/ai/limits/weekly-plan-budget";
import { DEGRADE_MODEL } from "@/lib/ai/limits/budget";
import { env } from "@/lib/env";

beforeEach(() => {
  tryCreateAdminClientMock.mockReset();
});

describe("checkWeeklyPlanAggregateBudget", () => {
  test("admin client unavailable — fails open, not degrading", async () => {
    tryCreateAdminClientMock.mockReturnValue(null);

    const check = await checkWeeklyPlanAggregateBudget();

    expect(check.shouldDegrade).toBe(false);
    expect(check.monthToDateSpendUsd).toBeNull();
    expect(check.ceilingUsd).toBe(DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD);
  });

  test("settings table not applied yet (42P01) — falls back to the default ceiling, not an error", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: null, error: { code: "42P01", message: 'relation "weekly_plan_budget_settings" does not exist' } },
        usageByFeature: { data: [], error: null },
      }),
    );

    const check = await checkWeeklyPlanAggregateBudget();

    expect(check.ceilingUsd).toBe(DEFAULT_WEEKLY_PLAN_MONTHLY_CEILING_USD);
    expect(check.shouldDegrade).toBe(false);
  });

  test("settings row exists — uses the founder-configured ceiling, not the default", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: { monthly_ceiling_usd: 25 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 5 }], error: null },
      }),
    );

    const check = await checkWeeklyPlanAggregateBudget();

    expect(check.ceilingUsd).toBe(25);
    expect(check.shouldDegrade).toBe(false);
  });

  test("well under the ceiling — not degrading, exact summed spend reported", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 1.5 }, { estimated_cost: 2 }], error: null },
      }),
    );

    const check = await checkWeeklyPlanAggregateBudget();

    expect(check.shouldDegrade).toBe(false);
    expect(check.monthToDateSpendUsd).toBeCloseTo(3.5, 10);
  });

  test("spend exactly at the ceiling degrades — boundary is >=, not >", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 10 }], error: null },
      }),
    );

    expect((await checkWeeklyPlanAggregateBudget()).shouldDegrade).toBe(true);
  });

  test("spend over the ceiling degrades", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 15 }], error: null },
      }),
    );

    expect((await checkWeeklyPlanAggregateBudget()).shouldDegrade).toBe(true);
  });

  test("an unpriced row degrades defensively — same 'unknown is not zero' rule as budget.ts/job-budget.ts", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 0.5 }, { estimated_cost: null }], error: null },
      }),
    );

    const check = await checkWeeklyPlanAggregateBudget();

    expect(check.shouldDegrade).toBe(true);
    expect(check.monthToDateSpendUsd).toBeCloseTo(0.5, 10);
  });

  test("the ai_usage query itself failing — fails open, not degrading", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: null, error: { message: "connection reset" } },
      }),
    );

    const check = await checkWeeklyPlanAggregateBudget();

    expect(check.shouldDegrade).toBe(false);
    expect(check.monthToDateSpendUsd).toBeNull();
  });
});

describe("selectModelForWeeklyPlan — layers the aggregate check on top of the per-student one", () => {
  test("a student already degraded for their own reason stays degraded, without the aggregate result changing anything", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        // Per-student spend at/over MONTHLY_BUDGET_TARGET_USD — selectModelForUser degrades on its own.
        usageByUser: { data: [{ estimated_cost: 1 }], error: null },
        // Aggregate well under ceiling — irrelevant here, the student's own reason wins.
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [], error: null },
      }),
    );

    const selection = await selectModelForWeeklyPlan("11111111-1111-1111-1111-111111111111", "standard");

    expect(selection.degraded).toBe(true);
    expect(selection.reason).toBe("at_or_over_target");
  });

  test("a student under their own target, aggregate under the ceiling — full ceiling model", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        usageByUser: { data: [], error: null },
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 2 }], error: null },
      }),
    );

    const selection = await selectModelForWeeklyPlan("11111111-1111-1111-1111-111111111111", "standard");

    expect(selection.degraded).toBe(false);
    expect(selection.model).toBe(env.anthropic.model);
  });

  test("a student under their own target, aggregate AT the ceiling — degrades for the aggregate reason specifically", async () => {
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({
        usageByUser: { data: [], error: null },
        settings: { data: { monthly_ceiling_usd: 10 }, error: null },
        usageByFeature: { data: [{ estimated_cost: 10 }], error: null },
      }),
    );

    const selection = await selectModelForWeeklyPlan("11111111-1111-1111-1111-111111111111", "standard");

    expect(selection.degraded).toBe(true);
    expect(selection.reason).toBe("aggregate_feature_budget");
    expect(selection.model).toBe(DEGRADE_MODEL);
  });

  test("no user (background context) — selectModelForUser's own no_user branch is not itself degraded, so the aggregate check still runs and can still override it", async () => {
    // weekly-plan.ts's own generateWeeklyPlan(userId: string, ...) never actually calls this
    // with null in practice — but selectModelForWeeklyPlan's signature is string | null to
    // stay a drop-in withUsageLogging.selectModel, so this is worth pinning precisely rather
    // than assumed: no_user's own degraded:false does NOT short-circuit this function the
    // way an already-degraded per-student result does (see the first test above) — the
    // aggregate ceiling is a feature-wide fact, independent of whether this one call happens
    // to carry a user id, so it's correct for it to still apply here.
    tryCreateAdminClientMock.mockReturnValue(
      mockAdmin({ settings: { data: { monthly_ceiling_usd: 10 }, error: null }, usageByFeature: { data: [{ estimated_cost: 10 }], error: null } }),
    );

    const selection = await selectModelForWeeklyPlan(null, "standard");

    expect(selection.degraded).toBe(true);
    expect(selection.reason).toBe("aggregate_feature_budget");
  });
});
