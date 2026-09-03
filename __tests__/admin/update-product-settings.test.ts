import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * updateProductSettings (app/(app)/admin/actions.ts) — the write path SignupsToggle,
 * MaintenanceModeToggle and TrialPeriodForm each call with only their own one field, same
 * "every field optional" contract updateFinanceSettings already established.
 */

vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// Identity mock, same convention as __tests__/plan/persist.test.ts and the other files
// using this pattern -- t(key) returns the key itself. Real catalog content (including that
// productSettingsNotSetUp mentions "0105") is covered separately by
// __tests__/i18n/translation-keys.test.ts; this file only needs to confirm the action picks
// the right key for the right branch, which the key name alone already proves.
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key }));

const { upsertMock } = vi.hoisted(() => ({ upsertMock: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "admin_product_settings") {
        return { upsert: (payload: Record<string, unknown>) => upsertMock(payload) };
      }
      throw new Error(`update-product-settings.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { updateProductSettings } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/security/require-admin";

const ADMIN_PROFILE = { id: "admin-1", display_name: "Ada", is_admin: true };

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue(ADMIN_PROFILE as never);
  upsertMock.mockReset();
  upsertMock.mockResolvedValue({ error: null });
});

describe("updateProductSettings — validation", () => {
  test("rejects a non-positive trial period without writing", async () => {
    const result = await updateProductSettings({ trialPeriodDays: 0 });
    expect(result.error).toBeTruthy();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("rejects a fractional trial period without writing", async () => {
    const result = await updateProductSettings({ trialPeriodDays: 3.5 });
    expect(result.error).toBeTruthy();
    expect(upsertMock).not.toHaveBeenCalled();
  });

  test("no fields provided: a genuine no-op, never writes", async () => {
    const result = await updateProductSettings({});
    expect(result).toEqual({});
    expect(upsertMock).not.toHaveBeenCalled();
  });
});

describe("updateProductSettings — partial writes", () => {
  test("only the provided field is included in the upsert payload", async () => {
    await updateProductSettings({ maintenanceMode: true });
    const [payload] = upsertMock.mock.calls[0];
    expect(payload).toMatchObject({ maintenance_mode: true });
    expect(payload).not.toHaveProperty("signups_enabled");
    expect(payload).not.toHaveProperty("trial_period_days");
  });

  test("every field can be set together in one call", async () => {
    await updateProductSettings({ signupsEnabled: false, maintenanceMode: true, trialPeriodDays: 14 });
    const [payload] = upsertMock.mock.calls[0];
    expect(payload).toMatchObject({ signups_enabled: false, maintenance_mode: true, trial_period_days: 14, updated_by: "admin-1" });
  });

  test("table missing (migration 0105 unapplied): the not-set-up key, naming the migration in the real catalog", async () => {
    upsertMock.mockResolvedValue({ error: { code: "PGRST205", message: `Could not find the table 'public.admin_product_settings' in the schema cache` } });
    const result = await updateProductSettings({ maintenanceMode: true });
    expect(result.error).toBe("productSettingsNotSetUp");
  });

  test("a real write error surfaces as a generic save failure, not the not-set-up key", async () => {
    upsertMock.mockResolvedValue({ error: { code: "42501", message: "permission denied" } });
    const result = await updateProductSettings({ signupsEnabled: false });
    expect(result.error).toBe("saveError");
  });
});
