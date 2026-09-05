import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * E2 (docs/PROXOLA-PLAN.md), 2026-09-05. This layer's only real job is translating each
 * closed-union result from lib/email/verification.ts into the student's own language — the
 * point of testing it is proving every reason actually maps to a real, distinct string, not
 * that any of them are silently swallowed into a generic fallback (which would defeat the
 * whole reason the union underneath is closed rather than a bare boolean).
 */

const { sendVerificationCodeMock, verifyEmailCodeMock, revalidatePathMock } = vi.hoisted(() => ({
  sendVerificationCodeMock: vi.fn(),
  verifyEmailCodeMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("@/lib/security/dal", () => ({
  requireUser: vi.fn().mockResolvedValue({ userId: "user-1", email: "student@example.com" }),
  getCurrentProfile: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/email/verification", () => ({ sendVerificationCode: sendVerificationCodeMock, verifyEmailCode: verifyEmailCodeMock }));
vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => `settings.emailVerification.${key}`,
}));

const { resendEmailVerificationCodeAction, submitEmailVerificationCodeAction } = await import("@/app/(app)/settings/actions");

beforeEach(() => {
  sendVerificationCodeMock.mockReset();
  verifyEmailCodeMock.mockReset();
  revalidatePathMock.mockReset();
});

describe("resendEmailVerificationCodeAction", () => {
  test("passes the session's own userId and email through to sendVerificationCode", async () => {
    sendVerificationCodeMock.mockResolvedValue({ sent: true });
    await resendEmailVerificationCodeAction();
    expect(sendVerificationCodeMock).toHaveBeenCalledWith("user-1", "student@example.com", expect.anything());
  });

  test("sent: true passes straight through", async () => {
    sendVerificationCodeMock.mockResolvedValue({ sent: true });
    expect(await resendEmailVerificationCodeAction()).toEqual({ sent: true });
  });

  test.each([
    ["not_configured", "settings.emailVerification.notConfiguredMessage"],
    ["cooldown", "settings.emailVerification.cooldownError"],
    ["send_failed", "settings.emailVerification.sendFailedError"],
    ["unavailable", "settings.emailVerification.unavailableError"],
  ] as const)("reason '%s' maps to its own distinct translated message, not a generic fallback", async (reason, expectedKey) => {
    sendVerificationCodeMock.mockResolvedValue({ sent: false, reason, retryAfterSeconds: 30, error: "x" });
    const result = await resendEmailVerificationCodeAction();
    expect(result.error).toBe(expectedKey);
  });
});

describe("submitEmailVerificationCodeAction", () => {
  test("passes the session's userId and the submitted code through to verifyEmailCode", async () => {
    verifyEmailCodeMock.mockResolvedValue({ verified: true });
    await submitEmailVerificationCodeAction("482913");
    expect(verifyEmailCodeMock).toHaveBeenCalledWith("user-1", "482913", expect.anything());
  });

  test("verified: true revalidates /settings so the badge flips without a manual refresh", async () => {
    verifyEmailCodeMock.mockResolvedValue({ verified: true });
    const result = await submitEmailVerificationCodeAction("482913");
    expect(result).toEqual({ verified: true });
    expect(revalidatePathMock).toHaveBeenCalledWith("/settings");
  });

  test("a failed verification does NOT revalidate — nothing about the student's state actually changed", async () => {
    verifyEmailCodeMock.mockResolvedValue({ verified: false, reason: "incorrect", attemptsRemaining: 2 });
    await submitEmailVerificationCodeAction("000000");
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test.each([
    ["no_code_pending", "settings.emailVerification.noCodePendingError"],
    ["expired", "settings.emailVerification.expiredError"],
    ["too_many_attempts", "settings.emailVerification.tooManyAttemptsError"],
    ["incorrect", "settings.emailVerification.incorrectError"],
    ["unavailable", "settings.emailVerification.unavailableError"],
  ] as const)("reason '%s' maps to its own distinct translated message, not a generic fallback", async (reason, expectedKey) => {
    verifyEmailCodeMock.mockResolvedValue({ verified: false, reason, attemptsRemaining: 1 });
    const result = await submitEmailVerificationCodeAction("000000");
    expect(result.error).toBe(expectedKey);
  });
});
