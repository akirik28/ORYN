import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * signUp (app/(auth)/actions.ts) — oryn-a7's assignment was explicit that this needed to
 * gate account creation itself, not just the signup page's UI: "find where signup actually
 * enters — the auth route, not just the UI — or the switch is decoration." What this suite
 * pins is that the gate runs BEFORE supabase.auth.signUp is ever called, and that it
 * degrades to open (the safe default) when admin_product_settings doesn't exist yet.
 */

vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Map()) }));

const { settingsSelectMock, authSignUpMock } = vi.hoisted(() => ({
  settingsSelectMock: vi.fn(),
  authSignUpMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "admin_product_settings") {
        return { select: () => ({ eq: () => ({ maybeSingle: () => settingsSelectMock() }) }) };
      }
      throw new Error(`signup-gate.test.ts: unexpected table "${table}"`);
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: authSignUpMock } }),
}));

import { signUp } from "@/app/(auth)/actions";

function formData(overrides: Record<string, string> = {}) {
  const fd = new FormData();
  fd.set("displayName", overrides.displayName ?? "Deniz");
  fd.set("email", overrides.email ?? "deniz@example.com");
  fd.set("password", overrides.password ?? "password1");
  fd.set("acceptedTerms", overrides.acceptedTerms ?? "true");
  return fd;
}

beforeEach(() => {
  settingsSelectMock.mockReset();
  authSignUpMock.mockReset();
  authSignUpMock.mockResolvedValue({ data: { session: null }, error: null });
});

describe("signUp — signups-closed gate", () => {
  test("signupsEnabled: false blocks account creation before Supabase Auth is ever called", async () => {
    settingsSelectMock.mockResolvedValue({ data: { signups_enabled: false, maintenance_mode: false, trial_period_days: 7 }, error: null });

    const result = await signUp({ errors: {} }, formData());

    expect(result).toMatchObject({ message: "signupsClosedMessage", variant: "error" });
    expect(authSignUpMock).not.toHaveBeenCalled();
  });

  test("signupsEnabled: true lets account creation proceed", async () => {
    settingsSelectMock.mockResolvedValue({ data: { signups_enabled: true, maintenance_mode: false, trial_period_days: 7 }, error: null });

    await signUp({ errors: {} }, formData());

    expect(authSignUpMock).toHaveBeenCalledTimes(1);
  });

  test("admin_product_settings missing (migration 0105 unapplied) degrades to open, not closed", async () => {
    settingsSelectMock.mockResolvedValue({ data: null, error: { code: "PGRST205", message: `Could not find the table 'public.admin_product_settings' in the schema cache` } });

    await signUp({ errors: {} }, formData());

    expect(authSignUpMock).toHaveBeenCalledTimes(1);
  });
});
