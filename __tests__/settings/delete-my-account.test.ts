import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * Component-level coverage for deleteMyAccount() (app/(app)/settings/actions.ts) — the
 * two failure branches specifically, per docs/account-deletion-audit-2026-09-02.md's
 * "silent-loss gap": a storage failure and a deleteUser() failure are NOT the same
 * situation (one means nothing happened, the other means files are already,
 * irrecoverably gone) and must not share a message.
 *
 * removeAllUserStorage() itself is mocked rather than re-exercised — its own pagination/
 * chunking/first-failure-stops-everything behavior is already covered by
 * __tests__/account/delete-storage.test.ts. This file's job is deleteMyAccount()'s own
 * orchestration: which branch runs when, and what each one tells the student.
 */

vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/account/delete-storage", async () => {
  const actual = await vi.importActual<typeof import("@/lib/account/delete-storage")>("@/lib/account/delete-storage");
  return { ...actual, removeAllUserStorage: vi.fn() };
});

const deleteUserMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ auth: { admin: { deleteUser: deleteUserMock } } }),
}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ auth: { signOut: signOutMock } }),
}));

import { deleteMyAccount } from "@/app/(app)/settings/actions";
import { requireUser } from "@/lib/security/dal";
import { removeAllUserStorage, StorageCleanupError } from "@/lib/account/delete-storage";
import { redirect } from "next/navigation";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  vi.mocked(removeAllUserStorage).mockReset();
  deleteUserMock.mockReset();
  signOutMock.mockReset();
  vi.mocked(redirect).mockReset();
});

describe("deleteMyAccount — storage fails first (nothing happened yet)", () => {
  test("returns the 'account has not been deleted' message and never calls deleteUser", async () => {
    vi.mocked(removeAllUserStorage).mockRejectedValue(new StorageCleanupError("evidence", "list", new Error("down")));

    const result = await deleteMyAccount();

    expect(result.error).toMatch(/your account has not been deleted/i);
    expect(deleteUserMock).not.toHaveBeenCalled();
  });

  test("does not claim the files were removed — they weren't", async () => {
    vi.mocked(removeAllUserStorage).mockRejectedValue(new StorageCleanupError("evidence", "list", new Error("down")));

    const result = await deleteMyAccount();

    expect(result.error).not.toMatch(/already been removed/i);
  });
});

describe("deleteMyAccount — storage succeeds, then deleteUser fails (the silent-loss gap)", () => {
  test("returns a message distinct from the storage-failure message", async () => {
    vi.mocked(removeAllUserStorage).mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue({ error: new Error("auth API blip") });

    const result = await deleteMyAccount();

    expect(result.error).not.toMatch(/your account has not been deleted/i);
  });

  test("tells the student their files are already gone and can't be recovered", async () => {
    vi.mocked(removeAllUserStorage).mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue({ error: new Error("auth API blip") });

    const result = await deleteMyAccount();

    expect(result.error).toMatch(/already been removed/i);
    expect(result.error).toMatch(/can't be recovered/i);
  });

  test("still tells the student the account itself was not deleted, so they know to retry", async () => {
    vi.mocked(removeAllUserStorage).mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue({ error: new Error("auth API blip") });

    const result = await deleteMyAccount();

    expect(result.error).toMatch(/hasn't been deleted yet/i);
  });

  test("does not sign out or redirect on this failure — the session is still valid to retry from", async () => {
    vi.mocked(removeAllUserStorage).mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue({ error: new Error("auth API blip") });

    await deleteMyAccount();

    expect(signOutMock).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe("deleteMyAccount — both steps succeed (the pinned success path)", () => {
  test("signs out and redirects home", async () => {
    vi.mocked(removeAllUserStorage).mockResolvedValue(undefined);
    deleteUserMock.mockResolvedValue({ error: null });

    await deleteMyAccount();

    expect(deleteUserMock).toHaveBeenCalledWith(USER_ID);
    expect(signOutMock).toHaveBeenCalled();
    expect(redirect).toHaveBeenCalledWith("/");
  });
});
