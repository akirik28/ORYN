import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * The ten isXLive() checks that gate proactive-disable across the admin panel — same
 * pattern isAdminActionsTableLive already established (__tests__/admin/catalog-health-
 * queries.test.ts), extended to the nine other tables/one column oryn-a7 asked for
 * ("one is-X-live() check per table, not per control"). Parameterized across the nine
 * table-shaped checks rather than nine copy-pasted describe blocks — each one's real
 * behavior is identical (a plain `.select(pkColumn).limit(1)`, PGRST205 -> false, no error
 * -> true, anything else -> false and logged), only the table name and primary-key column
 * differ, and those differences are exactly what a real typo would get wrong.
 * isFeedbackReportsTableLive (migration 0113) added 2026-09-03 — same shape, this file's
 * own parameterization is exactly why that addition is a one-line diff.
 */

const { limitMock, headMock } = vi.hoisted(() => ({
  limitMock: vi.fn(),
  headMock: vi.fn(),
}));

function makeAdminForTable(expectedTable: string, expectedColumn: string) {
  return {
    from: (table: string) => {
      if (table !== expectedTable) throw new Error(`live-check-functions.test.ts: unexpected table "${table}", expected "${expectedTable}"`);
      return {
        select: (col: string) => {
          if (col !== expectedColumn) throw new Error(`live-check-functions.test.ts: unexpected column "${col}" for table "${table}", expected "${expectedColumn}"`);
          return { limit: limitMock };
        },
      };
    },
  } as never;
}

function makeAdminForColumn(expectedTable: string, expectedColumn: string) {
  return {
    from: (table: string) => {
      if (table !== expectedTable) throw new Error(`live-check-functions.test.ts: unexpected table "${table}", expected "${expectedTable}"`);
      return {
        select: (col: string, opts: { head?: boolean }) => {
          if (col !== expectedColumn || !opts?.head) throw new Error(`live-check-functions.test.ts: unexpected select("${col}", ${JSON.stringify(opts)})`);
          return headMock();
        },
      };
    },
  } as never;
}

beforeEach(() => {
  limitMock.mockReset();
  headMock.mockReset();
});

const TABLE_CHECKS: { fnName: string; table: string; pkColumn: string; migration: string }[] = [
  { fnName: "isJobControlsTableLive", table: "job_controls", pkColumn: "job_name", migration: "0095" },
  { fnName: "isDeadFeatureFlagsTableLive", table: "admin_dead_feature_flags", pkColumn: "feature_key", migration: "0101" },
  { fnName: "isJobBudgetOverridesTableLive", table: "job_budget_overrides", pkColumn: "feature", migration: "0099" },
  { fnName: "isQuotaGrantsTableLive", table: "quota_grants", pkColumn: "id", migration: "0096" },
  { fnName: "isModelPricingTableLive", table: "ai_model_pricing", pkColumn: "model", migration: "0100" },
  { fnName: "isFinanceSettingsTableLive", table: "admin_finance_settings", pkColumn: "id", migration: "0094" },
  { fnName: "isProductSettingsTableLive", table: "admin_product_settings", pkColumn: "id", migration: "0105" },
  { fnName: "isWeeklyPlanBudgetSettingsTableLive", table: "weekly_plan_budget_settings", pkColumn: "id", migration: "0102" },
  { fnName: "isFeedbackReportsTableLive", table: "feedback_reports", pkColumn: "id", migration: "0113" },
];

describe.each(TABLE_CHECKS)("$fnName ($table, migration $migration)", ({ fnName, table, pkColumn }) => {
  test(`a real PGRST205 against ${pkColumn} -- reports false`, async () => {
    const queries = await import("@/lib/admin/queries");
    const fn = (queries as unknown as Record<string, (admin: unknown) => Promise<boolean>>)[fnName];
    limitMock.mockResolvedValue({ data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` } });

    expect(await fn(makeAdminForTable(table, pkColumn))).toBe(false);
  });

  test("no error -- the table genuinely exists -- reports true", async () => {
    const queries = await import("@/lib/admin/queries");
    const fn = (queries as unknown as Record<string, (admin: unknown) => Promise<boolean>>)[fnName];
    limitMock.mockResolvedValue({ data: [], error: null });

    expect(await fn(makeAdminForTable(table, pkColumn))).toBe(true);
  });

  test("an unrecognized error still reports false -- defaults to not-ready, not ready, on an unknown failure", async () => {
    const queries = await import("@/lib/admin/queries");
    const fn = (queries as unknown as Record<string, (admin: unknown) => Promise<boolean>>)[fnName];
    limitMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(await fn(makeAdminForTable(table, pkColumn))).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });
});

describe("isUltraGiftColumnLive (profiles.ultra_gift_expires_at, migration 0106)", () => {
  test("isUndefinedColumnError match -- the column genuinely doesn't exist -- reports false", async () => {
    const { isUltraGiftColumnLive } = await import("@/lib/admin/queries");
    headMock.mockResolvedValue({ error: { code: "PGRST204", message: `Could not find the 'ultra_gift_expires_at' column of 'profiles' in the schema cache` } });

    expect(await isUltraGiftColumnLive(makeAdminForColumn("profiles", "ultra_gift_expires_at"))).toBe(false);
  });

  test("no error -- the column genuinely exists -- reports true", async () => {
    const { isUltraGiftColumnLive } = await import("@/lib/admin/queries");
    headMock.mockResolvedValue({ error: null });

    expect(await isUltraGiftColumnLive(makeAdminForColumn("profiles", "ultra_gift_expires_at"))).toBe(true);
  });

  test("an indeterminate result (columnExistsLive's null case) collapses to not-live, not to live", async () => {
    const { isUltraGiftColumnLive } = await import("@/lib/admin/queries");
    headMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });

    expect(await isUltraGiftColumnLive(makeAdminForColumn("profiles", "ultra_gift_expires_at"))).toBe(false);
  });
});
