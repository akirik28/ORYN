import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { MockSupabaseClient } from "@/__tests__/stubs/mock-supabase-table";
import { hashVerificationCode, EMAIL_VERIFICATION_MAX_ATTEMPTS } from "@/lib/contact/email-verification";

/**
 * E2 (docs/PROXOLA-PLAN.md). One shared MockSupabaseClient instance stands in for both
 * createClient() and tryCreateAdminClient() -- in production both point at the same
 * underlying rows (RLS only changes which rows a query can see, not which rows exist), so
 * a single shared instance is the more faithful model, not a shortcut.
 */

const USER_ID = "11111111-1111-1111-1111-111111111111";

const { requireUserMock, resolveLocaleMock, createClientMock, tryCreateAdminClientMock, getEmailProviderMock, revalidatePathMock, sendMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  resolveLocaleMock: vi.fn().mockResolvedValue("en"),
  createClientMock: vi.fn(),
  tryCreateAdminClientMock: vi.fn(),
  getEmailProviderMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: resolveLocaleMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/supabase/admin", () => ({ tryCreateAdminClient: tryCreateAdminClientMock }));
vi.mock("@/lib/email", () => ({ getEmailProvider: getEmailProviderMock }));

import { sendEmailVerificationCode, verifyEmailCode } from "@/app/(app)/profile/email-verification-actions";

function client(config: { contactInfo?: Record<string, unknown>[]; verifications?: Record<string, unknown>[] }) {
  const mock = new MockSupabaseClient({
    contact_info: { rows: config.contactInfo ?? [] },
    email_verifications: { rows: config.verifications ?? [] },
  }) as unknown as SupabaseClient<Database>;
  createClientMock.mockResolvedValue(mock);
  tryCreateAdminClientMock.mockReturnValue(mock);
  return mock;
}

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  resolveLocaleMock.mockReset().mockResolvedValue("en");
  revalidatePathMock.mockReset();
  sendMock.mockReset().mockResolvedValue({ success: true });
  getEmailProviderMock.mockReset().mockReturnValue({ name: "test-provider", send: sendMock });
});

describe("sendEmailVerificationCode", () => {
  test("no email on file: honest error, no send attempted", async () => {
    client({ contactInfo: [{ user_id: USER_ID, email: null, email_verified_at: null }] });

    const result = await sendEmailVerificationCode();

    expect(result.error).toBeTruthy();
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("already verified: succeeds without sending anything -- nothing to verify again", async () => {
    client({ contactInfo: [{ user_id: USER_ID, email: "student@example.com", email_verified_at: new Date().toISOString() }] });

    const result = await sendEmailVerificationCode();

    expect(result.success).toBe(true);
    expect(sendMock).not.toHaveBeenCalled();
  });

  test("no email provider configured: honest degrade, never a fake success (Phase 34/72)", async () => {
    client({ contactInfo: [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }] });
    getEmailProviderMock.mockReturnValue(null);

    const result = await sendEmailVerificationCode();

    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
  });

  test("a genuine provider send failure is reported honestly, not swallowed into a false success", async () => {
    client({ contactInfo: [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }] });
    sendMock.mockResolvedValue({ success: false, error: "mailbox rejected" });

    const result = await sendEmailVerificationCode();

    expect(result.error).toBeTruthy();
  });

  test("within the resend cooldown: refused without sending a second code", async () => {
    const verifications = [{ id: "v1", user_id: USER_ID, email: "student@example.com", code_hash: "x", expires_at: new Date(Date.now() + 900_000).toISOString(), attempts: 0, verified_at: null, created_at: new Date().toISOString() }];
    client({ contactInfo: [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }], verifications });

    const result = await sendEmailVerificationCode();

    expect(result.error).toBeTruthy();
    expect(sendMock).not.toHaveBeenCalled();
    // Real proof, not just "an error came back": no second row was inserted.
    expect(verifications).toHaveLength(1);
  });

  test("a real send writes exactly one new attempt row, with a HASHED code, never the raw code", async () => {
    const verifications: Record<string, unknown>[] = [];
    client({ contactInfo: [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }], verifications });

    const result = await sendEmailVerificationCode();

    expect(result.success).toBe(true);
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(verifications).toHaveLength(1);
    const stored = verifications[0] as { code_hash: string; email: string };
    expect(stored.email).toBe("student@example.com");
    // The email body sendMock received must contain a real 6-digit code, and that code
    // must NOT appear anywhere in what got persisted.
    const sentBody = sendMock.mock.calls[0][0].body as string;
    const codeInEmail = sentBody.match(/\b\d{6}\b/)?.[0];
    expect(codeInEmail).toBeTruthy();
    expect(stored.code_hash).not.toBe(codeInEmail);
    expect(stored.code_hash).toBe(hashVerificationCode(codeInEmail!));
  });
});

describe("verifyEmailCode", () => {
  function verificationRow(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      id: "v1",
      user_id: USER_ID,
      email: "student@example.com",
      code_hash: hashVerificationCode("123456"),
      expires_at: new Date(Date.now() + 900_000).toISOString(),
      attempts: 0,
      verified_at: null,
      created_at: new Date().toISOString(),
      ...overrides,
    };
  }

  test("no code was ever sent: honest 'request a code first', not a generic error", async () => {
    client({ contactInfo: [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }], verifications: [] });

    const result = await verifyEmailCode("123456");

    expect(result.error).toBeTruthy();
  });

  test("the correct code verifies, and marks contact_info for THIS email specifically", async () => {
    const contactInfo = [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }];
    client({ contactInfo, verifications: [verificationRow()] });

    const result = await verifyEmailCode("123456");

    expect(result.success).toBe(true);
    expect(contactInfo[0].email_verified_at).toBeTruthy();
    expect(revalidatePathMock).toHaveBeenCalledWith("/profile");
  });

  test("THE MANDATORY CASE: a wrong code does not verify, and consumes exactly one attempt", async () => {
    const contactInfo = [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }];
    const verifications = [verificationRow()];
    client({ contactInfo, verifications });

    const result = await verifyEmailCode("000000");

    expect(result.error).toBeTruthy();
    expect(contactInfo[0].email_verified_at).toBeNull();
    expect(verifications[0].attempts).toBe(1);
  });

  test("an expired code is refused even if the digits are correct", async () => {
    const contactInfo = [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }];
    client({ contactInfo, verifications: [verificationRow({ expires_at: new Date(Date.now() - 1000).toISOString() })] });

    const result = await verifyEmailCode("123456");

    expect(result.error).toBeTruthy();
    expect(contactInfo[0].email_verified_at).toBeNull();
  });

  test("at the attempt ceiling, even the correct code is refused -- the cap is real, not advisory", async () => {
    const contactInfo = [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }];
    client({ contactInfo, verifications: [verificationRow({ attempts: EMAIL_VERIFICATION_MAX_ATTEMPTS })] });

    const result = await verifyEmailCode("123456");

    expect(result.error).toBeTruthy();
    expect(contactInfo[0].email_verified_at).toBeNull();
  });

  test("a non-numeric or wrong-length input is rejected before touching the database at all", async () => {
    const contactInfo = [{ user_id: USER_ID, email: "student@example.com", email_verified_at: null }];
    const verifications = [verificationRow()];
    client({ contactInfo, verifications });

    const result = await verifyEmailCode("12ab");

    expect(result.error).toBeTruthy();
    expect(verifications[0].attempts).toBe(0); // untouched
  });
});
