import { describe, expect, test, vi, beforeEach } from "vitest";

// next/navigation's real notFound()/redirect() throw a special internal signal Next itself
// catches to actually perform the navigation -- mocked here as a distinguishable throw
// (not a plain vi.fn(), which would just record the call and let execution continue past
// it) so a test can assert "the code after this point never ran", the same shape as a real
// request would actually experience.
class FakeNotFound extends Error {
  constructor() {
    super("NEXT_NOT_FOUND");
  }
}
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new FakeNotFound();
  }),
}));

class FakeRedirect extends Error {
  constructor(readonly to: string) {
    super("NEXT_REDIRECT");
  }
}
vi.mock("@/lib/security/dal", () => ({
  requireUser: vi.fn(),
  getCurrentProfile: vi.fn(),
}));

import { notFound } from "next/navigation";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { requireAdmin } from "@/lib/security/require-admin";

const ADMIN_PROFILE = { id: "admin-1", is_admin: true } as never;
const NON_ADMIN_PROFILE = { id: "user-1", is_admin: false } as never;

beforeEach(() => {
  vi.mocked(notFound).mockClear();
  vi.mocked(requireUser).mockReset();
  vi.mocked(getCurrentProfile).mockReset();
});

/**
 * 2026-09-03: requireAdmin() used to call getCurrentProfile() directly, with nothing
 * checking whether a session existed at all first -- getCurrentProfile() quietly returns
 * null for a missing/expired session (it checks session.userId itself and never queries
 * profiles), and isAdminProfile(null) is false the same way a real non-admin's profile is.
 * So "the page doesn't exist", "you're signed in but not allowed", and "you got signed
 * out" all rendered as one identical 404 -- found live when the founder read seven
 * /kumanda screens fine and hit a 404 on the eighth purely because his session had expired.
 *
 * These tests prove the fix at the only level that doesn't need a running server or a real
 * session: that requireUser() is called, and — the part that actually matters — that a
 * missing session is caught THERE, before the admin check ever runs, rather than merely
 * being called first and ignored.
 */
describe("requireAdmin — session check happens before the admin check", () => {
  test("no session: requireUser() throws its own redirect, and the admin check never runs", async () => {
    vi.mocked(requireUser).mockRejectedValue(new FakeRedirect("/login"));

    await expect(requireAdmin()).rejects.toThrow("NEXT_REDIRECT");

    // The one assertion that proves this isn't just "call requireUser() and ignore the
    // result" -- getCurrentProfile() (and therefore notFound()) must never be reached once
    // requireUser() has already thrown.
    expect(getCurrentProfile).not.toHaveBeenCalled();
    expect(notFound).not.toHaveBeenCalled();
  });

  test("real session, non-admin profile: still 404s -- the case this function exists to protect, unchanged", async () => {
    vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: "user-1", email: "student@example.com" });
    vi.mocked(getCurrentProfile).mockResolvedValue(NON_ADMIN_PROFILE);

    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");

    expect(requireUser).toHaveBeenCalled();
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  test("real session, no profile row at all (a genuine DB read failure, not a missing session): still 404s, not a redirect loop", async () => {
    vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: "user-1", email: "student@example.com" });
    vi.mocked(getCurrentProfile).mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow("NEXT_NOT_FOUND");
  });

  test("real session, admin profile: no notFound, the profile is returned", async () => {
    vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: "admin-1", email: "admin@example.com" });
    vi.mocked(getCurrentProfile).mockResolvedValue(ADMIN_PROFILE);

    const result = await requireAdmin();

    expect(result).toBe(ADMIN_PROFILE);
    expect(notFound).not.toHaveBeenCalled();
  });
});
