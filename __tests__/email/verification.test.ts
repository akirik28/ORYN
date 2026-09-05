import { beforeEach, describe, expect, test, vi } from "vitest";
import { createHash } from "node:crypto";

/**
 * E2 (docs/PROXOLA-PLAN.md), 2026-09-05. Every result union member gets its own test — the
 * whole point of lib/email/verification.ts's closed-union design is that a caller can never
 * confuse "sent" with one of five distinct ways it wasn't, so a passing suite here has to
 * actually exercise each branch, not just the happy path.
 */

const h = vi.hoisted(() => ({
  sendEmail: vi.fn(),
  providerConfigured: true,
  profileRow: {} as Record<string, unknown>,
  updateCalls: [] as Record<string, unknown>[],
}));

vi.mock("@/lib/email/index", () => ({
  getEmailProvider: () => (h.providerConfigured ? { name: "fake", sendEmail: h.sendEmail } : null),
}));

vi.mock("@/lib/supabase/errors", () => ({
  isUndefinedColumnError: (error: { code?: string; message?: string } | null, column: string) =>
    error?.code === "42703" && (error.message?.includes(column) ?? false),
}));

function hashOf(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function fakeClient(readError: { code?: string; message?: string } | null = null, updateError: { code?: string; message?: string } | null = null) {
  return {
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: () => Promise.resolve(readError ? { data: null, error: readError } : { data: h.profileRow, error: null }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: () => {
            h.updateCalls.push(patch);
            if (!updateError) Object.assign(h.profileRow, patch);
            return Promise.resolve({ error: updateError });
          },
        }),
      };
    },
    // Cast target — the real SupabaseClient<Database> type is far larger than this fake
    // needs; every call site in verification.ts only ever touches .from("profiles").
  } as unknown as import("@supabase/supabase-js").SupabaseClient<import("@/types/database").Database>;
}

const { sendVerificationCode, verifyEmailCode } = await import("@/lib/email/verification");

beforeEach(() => {
  h.sendEmail.mockReset();
  h.sendEmail.mockResolvedValue({ success: true });
  h.providerConfigured = true;
  h.profileRow = {};
  h.updateCalls = [];
});

describe("sendVerificationCode", () => {
  test("not_configured when no email provider is set up — the dev-state case, not a crash", async () => {
    h.providerConfigured = false;
    const result = await sendVerificationCode("user-1", "student@example.com", fakeClient());
    expect(result).toEqual({ sent: false, reason: "not_configured" });
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  test("a fresh send stores a HASH, never the raw code, and calls the provider with the real code in the body", async () => {
    const result = await sendVerificationCode("user-1", "student@example.com", fakeClient());
    expect(result).toEqual({ sent: true });

    const stored = h.updateCalls[0];
    expect(stored?.email_verification_code_hash).toBeTypeOf("string");
    expect(stored?.email_verification_code_hash).toHaveLength(64); // sha256 hex

    expect(h.sendEmail).toHaveBeenCalledTimes(1);
    const [sentRequest] = h.sendEmail.mock.calls[0];
    expect(sentRequest.to).toBe("student@example.com");
    // The provider call's body must carry a real 6-digit code whose hash matches what was
    // stored — proves the two halves (what's sent, what's checked against) are the same code.
    const codeInBody = sentRequest.body.match(/\d{6}/)?.[0];
    expect(codeInBody).toBeDefined();
    expect(stored?.email_verification_code_hash).toBe(hashOf(codeInBody!));
  });

  test("cooldown blocks a second send within the window, with the remaining seconds surfaced", async () => {
    h.profileRow = { email_verification_last_sent_at: new Date(Date.now() - 10_000).toISOString() };
    const result = await sendVerificationCode("user-1", "student@example.com", fakeClient());
    expect(result.sent).toBe(false);
    expect(result).toMatchObject({ reason: "cooldown" });
    if (!result.sent && result.reason === "cooldown") {
      expect(result.retryAfterSeconds).toBeGreaterThan(0);
      expect(result.retryAfterSeconds).toBeLessThanOrEqual(60);
    }
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  test("a send outside the cooldown window succeeds normally", async () => {
    h.profileRow = { email_verification_last_sent_at: new Date(Date.now() - 120_000).toISOString() };
    const result = await sendVerificationCode("user-1", "student@example.com", fakeClient());
    expect(result).toEqual({ sent: true });
  });

  test("send_failed surfaces the provider's own error, code already stored beforehand (a resend is always safe)", async () => {
    h.sendEmail.mockResolvedValue({ success: false, error: "rejected address" });
    const result = await sendVerificationCode("user-1", "student@example.com", fakeClient());
    expect(result).toEqual({ sent: false, reason: "send_failed", error: "rejected address" });
    expect(h.updateCalls).toHaveLength(1); // the code WAS stored before the send attempt
  });

  test("migration 0134 not yet applied (42703 on the code-hash column) degrades to 'unavailable', not a throw", async () => {
    const client = fakeClient(null, { code: "42703", message: 'column "email_verification_code_hash" does not exist' });
    const result = await sendVerificationCode("user-1", "student@example.com", client);
    expect(result).toEqual({ sent: false, reason: "unavailable" });
    expect(h.sendEmail).not.toHaveBeenCalled();
  });

  test("migration not applied on the cooldown READ column also degrades to 'unavailable'", async () => {
    const client = fakeClient({ code: "42703", message: 'column "email_verification_last_sent_at" does not exist' });
    const result = await sendVerificationCode("user-1", "student@example.com", client);
    expect(result).toEqual({ sent: false, reason: "unavailable" });
  });

  test("a real, unrelated DB error also degrades to 'unavailable' rather than throwing", async () => {
    const client = fakeClient(null, { code: "42501", message: "permission denied" });
    const result = await sendVerificationCode("user-1", "student@example.com", client);
    expect(result).toEqual({ sent: false, reason: "unavailable" });
  });
});

describe("verifyEmailCode", () => {
  function pendingCode(code: string, overrides: Record<string, unknown> = {}) {
    return {
      email_verification_code_hash: hashOf(code),
      email_verification_code_expires_at: new Date(Date.now() + 10 * 60_000).toISOString(),
      email_verification_attempts: 0,
      ...overrides,
    };
  }

  test("no_code_pending when nothing has ever been sent", async () => {
    h.profileRow = {};
    const result = await verifyEmailCode("user-1", "123456", fakeClient());
    expect(result).toEqual({ verified: false, reason: "no_code_pending" });
  });

  test("the correct code verifies, and clears the code fields so it cannot be reused", async () => {
    h.profileRow = pendingCode("482913");
    const result = await verifyEmailCode("user-1", "482913", fakeClient());
    expect(result).toEqual({ verified: true });

    const finalUpdate = h.updateCalls.at(-1);
    expect(finalUpdate).toMatchObject({
      email_verified: true,
      email_verification_code_hash: null,
      email_verification_code_expires_at: null,
      email_verification_attempts: 0,
    });
  });

  test("an incorrect code increments attempts and reports how many remain", async () => {
    h.profileRow = pendingCode("482913", { email_verification_attempts: 1 });
    const result = await verifyEmailCode("user-1", "000000", fakeClient());
    expect(result).toEqual({ verified: false, reason: "incorrect", attemptsRemaining: 3 }); // 5 max - (1+1)
    expect(h.profileRow.email_verification_attempts).toBe(2);
  });

  test("an expired code is rejected as 'expired', not silently treated as still valid", async () => {
    h.profileRow = pendingCode("482913", { email_verification_code_expires_at: new Date(Date.now() - 1000).toISOString() });
    const result = await verifyEmailCode("user-1", "482913", fakeClient());
    expect(result).toEqual({ verified: false, reason: "expired" });
  });

  test("expiry is checked BEFORE the hash comparison — an expired code is 'expired' even if it's also the right code", async () => {
    // Same case as above by construction, named separately since this is the specific
    // ordering guarantee the header comment promises, not just "expiry works."
    h.profileRow = pendingCode("482913", { email_verification_code_expires_at: new Date(Date.now() - 1).toISOString() });
    const result = await verifyEmailCode("user-1", "482913", fakeClient());
    expect(result.verified).toBe(false);
    expect(result).toMatchObject({ reason: "expired" });
  });

  test("too_many_attempts blocks further guesses once the limit is reached, even with the right code", async () => {
    h.profileRow = pendingCode("482913", { email_verification_attempts: 5 });
    const result = await verifyEmailCode("user-1", "482913", fakeClient());
    expect(result).toEqual({ verified: false, reason: "too_many_attempts" });
  });

  test("migration not applied (42703) degrades to 'unavailable'", async () => {
    const client = fakeClient({ code: "42703", message: 'column "email_verification_code_hash" does not exist' });
    const result = await verifyEmailCode("user-1", "482913", client);
    expect(result).toEqual({ verified: false, reason: "unavailable" });
  });
});
