import { describe, expect, test, vi, beforeAll, beforeEach, afterEach } from "vitest";

const STUDENT_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_STUDENT_ID = "22222222-2222-4222-8222-222222222222";
const PARENT_EMAIL = "parent@example.com";

// createParentInviteToken/verifyParentInviteToken hard-require SUPABASE_SECRET_KEY (see
// invite-token.ts's own sign() comment for why this one can't degrade) — vitest.config.mts
// doesn't load .env.local into process.env, so the ambient test environment genuinely has no
// secret configured (confirmed by __tests__/social/admin-client-degradation.test.ts's own
// tests, which rely on exactly that absence for a *different* module). Every export used
// below — including isPendingLinkExpired/PARENT_INVITE_WINDOW_DAYS, which don't themselves
// need the secret — comes from this single dynamic import rather than a static top-level
// one: a static `import ... from "@/lib/parent/invite-token"` anywhere in this file would
// evaluate lib/env.ts (and freeze env.supabase.secretKey as undefined) before beforeAll ever
// runs, regardless of source order, since ES module imports are hoisted above everything
// else in the file. Matches admin-client-degradation.test.ts's own established pattern for
// the identical problem.
let createParentInviteToken: typeof import("@/lib/parent/invite-token").createParentInviteToken;
let verifyParentInviteToken: typeof import("@/lib/parent/invite-token").verifyParentInviteToken;
let isPendingLinkExpired: typeof import("@/lib/parent/invite-token").isPendingLinkExpired;
let PARENT_INVITE_WINDOW_DAYS: typeof import("@/lib/parent/invite-token").PARENT_INVITE_WINDOW_DAYS;

beforeAll(async () => {
  process.env.SUPABASE_SECRET_KEY = "test-only-secret-do-not-use-in-production";
  const mod = await import("@/lib/parent/invite-token");
  createParentInviteToken = mod.createParentInviteToken;
  verifyParentInviteToken = mod.verifyParentInviteToken;
  isPendingLinkExpired = mod.isPendingLinkExpired;
  PARENT_INVITE_WINDOW_DAYS = mod.PARENT_INVITE_WINDOW_DAYS;
});

describe("createParentInviteToken / verifyParentInviteToken", () => {
  test("a freshly created token verifies successfully and round-trips the payload", () => {
    const token = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);
    const result = verifyParentInviteToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.payload.studentUserId).toBe(STUDENT_ID);
      expect(result.payload.invitedEmail).toBe(PARENT_EMAIL);
    }
  });

  test("normalizes the invited email (trim + lowercase) so lookups can compare it exactly", () => {
    const token = createParentInviteToken(STUDENT_ID, "  Parent@Example.com  ");
    const result = verifyParentInviteToken(token);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.payload.invitedEmail).toBe("parent@example.com");
  });

  test("both tokens for the same (student, email) pair independently verify", () => {
    const first = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);
    const second = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);
    expect(verifyParentInviteToken(first).ok).toBe(true);
    expect(verifyParentInviteToken(second).ok).toBe(true);
  });

  test("rejects a malformed token (no signature segment)", () => {
    expect(verifyParentInviteToken("not-a-real-token")).toEqual({ ok: false, reason: "malformed" });
  });

  test("rejects an empty string", () => {
    expect(verifyParentInviteToken("")).toEqual({ ok: false, reason: "malformed" });
  });

  test("rejects a token with a tampered payload (signature no longer matches)", () => {
    const token = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);
    const [payloadB64, signature] = token.split(".");
    // Swap in a different student's id, base64url-encoded the same way createParentInviteToken
    // does, then reattach the ORIGINAL signature — this is exactly the attack the HMAC check
    // exists to catch: redirecting an invite meant for one student onto a different one by
    // editing the payload directly.
    const forgedPayload = Buffer.from(
      JSON.stringify({ studentUserId: OTHER_STUDENT_ID, invitedEmail: PARENT_EMAIL, issuedAt: Date.now() }),
      "utf8"
    ).toString("base64url");
    expect(payloadB64).not.toBe(forgedPayload); // sanity: we actually changed something
    expect(verifyParentInviteToken(`${forgedPayload}.${signature}`)).toEqual({ ok: false, reason: "bad_signature" });
  });

  test("rejects a token with a garbage signature", () => {
    const token = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);
    const [payloadB64] = token.split(".");
    const result = verifyParentInviteToken(`${payloadB64}.not-a-valid-signature-at-all`);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });
});

describe("expiry — the window CEO explicitly asked to see reasoned and enforced", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  test("a token is still valid one second before the window elapses", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(start);
    const token = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);

    const almostExpired = new Date(start.getTime() + PARENT_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000 - 1000);
    vi.setSystemTime(almostExpired);
    expect(verifyParentInviteToken(token).ok).toBe(true);
  });

  test("a token is expired just after the window elapses, and still carries the payload", () => {
    const start = new Date("2026-01-01T00:00:00.000Z");
    vi.setSystemTime(start);
    const token = createParentInviteToken(STUDENT_ID, PARENT_EMAIL);

    const justExpired = new Date(start.getTime() + PARENT_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000 + 1000);
    vi.setSystemTime(justExpired);
    const result = verifyParentInviteToken(token);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toBe("expired");
      // The accept-invite page (app/(parent-invite)/parent-invite/[token]/page.tsx) needs
      // this to personalize the expired-invite message — regression guard for that.
      if (result.reason === "expired") {
        expect(result.payload.studentUserId).toBe(STUDENT_ID);
      }
    }
  });
});

describe("isPendingLinkExpired — same window, applied to a parent_links row instead of a token", () => {
  test("a link invited well within the window is not expired", () => {
    const recent = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
    expect(isPendingLinkExpired(recent)).toBe(false);
  });

  test("a link invited just past the window is expired", () => {
    const justPast = new Date(Date.now() - (PARENT_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000 + 1000)).toISOString();
    expect(isPendingLinkExpired(justPast)).toBe(true);
  });

  test("a link invited just short of the window is not yet expired", () => {
    const justShort = new Date(Date.now() - (PARENT_INVITE_WINDOW_DAYS * 24 * 60 * 60 * 1000 - 1000)).toISOString();
    expect(isPendingLinkExpired(justShort)).toBe(false);
  });
});
