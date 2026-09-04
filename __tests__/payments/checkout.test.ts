import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockSupabaseClient } from "../stubs/mock-supabase-table";
import { FakePaymentProvider } from "./fake-provider";

const { providerRef, adminRef, financeSettingsMock } = vi.hoisted(() => ({
  providerRef: { current: null as FakePaymentProvider | null },
  adminRef: { current: null as MockSupabaseClient | null },
  financeSettingsMock: vi.fn(),
}));

vi.mock("@/lib/payments/index", () => ({ getPaymentProvider: () => providerRef.current }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => adminRef.current }));
vi.mock("@/lib/admin/queries", () => ({ getFinanceSettings: financeSettingsMock }));

import { startUltraCheckout } from "@/lib/payments/checkout";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  adminRef.current = new MockSupabaseClient({ checkout_sessions: { rows: [] } });
  providerRef.current = new FakePaymentProvider();
  financeSettingsMock.mockReset().mockResolvedValue({ ultraPriceTry: 399.99, usdTryRate: null, ultraPriceTryUpdatedAt: new Date(0).toISOString() });
});

describe("startUltraCheckout", () => {
  test("with no provider configured, returns not_configured rather than a fake checkout URL", async () => {
    providerRef.current = null;
    const result = await startUltraCheckout(USER_ID, "https://app.test/success", "https://app.test/cancel");
    expect(result).toEqual({ status: "not_configured" });
  });

  test("with a provider configured, writes a checkout_sessions row and returns a real checkout URL", async () => {
    const result = await startUltraCheckout(USER_ID, "https://app.test/success", "https://app.test/cancel");

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("unreachable");
    expect(result.checkoutUrl).toContain("fake-provider.test/checkout/");

    // Read back through the same mock the function wrote to, confirming the row is real —
    // not just that createCheckoutSession was called with plausible-looking arguments.
    const { data } = await adminRef.current!.from("checkout_sessions").select("*").eq("user_id", USER_ID).maybeSingle();
    expect((data as { user_id: string } | null)?.user_id).toBe(USER_ID);
  });

  test("passes the live finance-settings price (not a hardcoded one) through to the provider", async () => {
    financeSettingsMock.mockResolvedValue({ ultraPriceTry: 249, usdTryRate: null, ultraPriceTryUpdatedAt: new Date(0).toISOString() });
    const createCheckoutSpy = vi.spyOn(providerRef.current!, "createCheckoutSession");

    await startUltraCheckout(USER_ID, "https://app.test/success", "https://app.test/cancel");

    expect(createCheckoutSpy).toHaveBeenCalledWith(expect.objectContaining({ amountTry: 249 }));
  });

  test("a provider that throws during checkout creation returns a real error, not a silent success", async () => {
    vi.spyOn(providerRef.current!, "createCheckoutSession").mockRejectedValue(new Error("network error"));
    const result = await startUltraCheckout(USER_ID, "https://app.test/success", "https://app.test/cancel");
    expect(result.status).toBe("error");
  });
});
