import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * CEO's follow-up on the same-named integration (2026-09-04): both real UI surfaces
 * (the full-screen upgrade modal, features/settings/plan-tier-view.tsx) already had their
 * own tests -- but every one of them mocks startUltraCheckoutAction itself, proving how the
 * UI reacts to a given result, never that the exported Server Action actually reaches
 * lib/payments/checkout.ts's real startUltraCheckout. This is the one test that calls the
 * real, unmocked app/(app)/upgrade-interstitial-actions.ts export and checks what it
 * actually does with a real session and a real request origin -- the glue itself, not
 * either side of it.
 *
 * Verified to actually fail: reverting startUltraCheckoutAction's body to the literal
 * pre-2026-09-04 stub (`return { status: "not_configured" }`, no requireUser/headers/
 * startUltraCheckout call at all) turns every test below red -- the userId/origin
 * assertions fail with "undefined" and the pass-through result no longer matches --
 * before being reverted.
 */

const { requireUserMock, startUltraCheckoutMock, headersMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  startUltraCheckoutMock: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/payments/checkout", () => ({ startUltraCheckout: startUltraCheckoutMock }));
vi.mock("next/headers", () => ({ headers: headersMock }));

import { startUltraCheckoutAction } from "@/app/(app)/upgrade-interstitial-actions";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  startUltraCheckoutMock.mockReset().mockResolvedValue({ status: "not_configured" });
  headersMock.mockReset().mockResolvedValue(new Map([["origin", "https://proxola.app"]]));
});

describe("startUltraCheckoutAction -- the wiring itself, not either side of it", () => {
  test("passes the real session's userId through, not a placeholder", async () => {
    await startUltraCheckoutAction();
    expect(startUltraCheckoutMock).toHaveBeenCalledWith(USER_ID, expect.any(String), expect.any(String));
  });

  test("builds the return/cancel URLs from the request's own origin header", async () => {
    await startUltraCheckoutAction();
    const [, returnUrl, cancelUrl] = startUltraCheckoutMock.mock.calls[0]!;
    expect(returnUrl).toBe("https://proxola.app/settings/plan?checkout=success");
    expect(cancelUrl).toBe("https://proxola.app/settings/plan?checkout=canceled");
  });

  test("falls back to env.app.url when no origin header is present (e.g. a non-browser caller)", async () => {
    headersMock.mockResolvedValue(new Map());
    await startUltraCheckoutAction();
    const [, returnUrl] = startUltraCheckoutMock.mock.calls[0]!;
    expect(returnUrl.startsWith("http")).toBe(true);
    expect(returnUrl).not.toContain("proxola.app");
  });

  test("returns whatever lib/payments/checkout.ts's startUltraCheckout returns, unchanged", async () => {
    startUltraCheckoutMock.mockResolvedValue({ status: "ready", checkoutUrl: "https://provider.example.com/session/abc" });
    const result = await startUltraCheckoutAction();
    expect(result).toEqual({ status: "ready", checkoutUrl: "https://provider.example.com/session/abc" });
  });

  test("an error result also passes through unchanged", async () => {
    startUltraCheckoutMock.mockResolvedValue({ status: "error", message: "The payment provider is temporarily unreachable." });
    const result = await startUltraCheckoutAction();
    expect(result).toEqual({ status: "error", message: "The payment provider is temporarily unreachable." });
  });
});
