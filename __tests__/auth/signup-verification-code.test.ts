import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * E2 (docs/PROXOLA-PLAN.md), 2026-09-05 — "the code goes out the moment the email is
 * collected," and signup is that moment. Neither this call nor the pre-existing
 * setParentInviteEmail one right above it in app/(auth)/actions.ts had coverage of the
 * data.user branch before this file: __tests__/auth/signup-gate.test.ts's own mock never
 * populates `data.user` (only `data.session`), so its passing tests never actually reach
 * either side effect. Scoped narrowly to this one new call, not a general backfill of that
 * pre-existing gap.
 */

vi.mock("next-intl/server", () => ({ getTranslations: vi.fn().mockResolvedValue((key: string) => key) }));
vi.mock("next/headers", () => ({ headers: vi.fn().mockResolvedValue(new Map()) }));

const { settingsSelectMock, authSignUpMock, sendVerificationCodeMock } = vi.hoisted(() => ({
  settingsSelectMock: vi.fn(),
  authSignUpMock: vi.fn(),
  sendVerificationCodeMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "admin_product_settings") {
        return { select: () => ({ eq: () => ({ maybeSingle: () => settingsSelectMock() }) }) };
      }
      throw new Error(`signup-verification-code.test.ts: unexpected table "${table}"`);
    },
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signUp: authSignUpMock } }),
}));

vi.mock("@/lib/email/verification", () => ({ sendVerificationCode: sendVerificationCodeMock }));

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
  sendVerificationCodeMock.mockReset();
  settingsSelectMock.mockResolvedValue({ data: { signups_enabled: true, maintenance_mode: false, trial_period_days: 7 }, error: null });
  sendVerificationCodeMock.mockResolvedValue({ sent: true });
  // session: null (not undefined data.user) so the function returns the "check your email"
  // message normally, without ever calling next/navigation's redirect() — same trick
  // signup-gate.test.ts uses, now paired with a real `user` so this branch is actually hit.
  authSignUpMock.mockResolvedValue({ data: { session: null, user: { id: "new-user-1" } }, error: null });
});

describe("signUp — sends a verification code the moment the account (and its email) is created", () => {
  test("calls sendVerificationCode with the new user's id and the address they signed up with", async () => {
    await signUp({ errors: {} }, formData({ email: "deniz@example.com" }));

    expect(sendVerificationCodeMock).toHaveBeenCalledTimes(1);
    expect(sendVerificationCodeMock).toHaveBeenCalledWith("new-user-1", "deniz@example.com", expect.anything());
  });

  test("a failed send (any reason) does not throw and does not block the signup response", async () => {
    sendVerificationCodeMock.mockResolvedValue({ sent: false, reason: "not_configured" });

    const result = await signUp({ errors: {} }, formData());

    // The account itself is the outcome that matters — same non-negotiable as
    // setParentInviteEmail's own header comment one block above this call.
    expect(result).toMatchObject({ variant: "success" });
  });

  test("never called when supabase.auth.signUp itself failed — no user, nothing to verify", async () => {
    authSignUpMock.mockResolvedValue({ data: { user: null, session: null }, error: { message: "Email already registered" } });

    await signUp({ errors: {} }, formData());

    expect(sendVerificationCodeMock).not.toHaveBeenCalled();
  });
});
