import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * grantUltraGift (app/(app)/admin/actions.ts) — the founder's own named prototype item.
 * What this suite actually pins: once-per-person is enforced by the update's own
 * `.is("ultra_gift_granted_at", null)` guard, not just the pre-read, so a race between two
 * near-simultaneous grants can't double-grant — and the button-facing distinction between
 * "already used" (granted: false, no error) and a genuine failure (error), which is what
 * lets UltraGiftControl show "already used" instead of a generic failure toast.
 */

vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { selectMaybeSingleMock, updateIsSelectMock, insertMock } = vi.hoisted(() => ({
  selectMaybeSingleMock: vi.fn(),
  updateIsSelectMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: (...selectArgs: unknown[]) => ({ eq: (...eqArgs: unknown[]) => ({ maybeSingle: () => selectMaybeSingleMock(...selectArgs, ...eqArgs) }) }),
          update: (payload: Record<string, unknown>) => ({
            eq: (...eqArgs: unknown[]) => ({
              is: (...isArgs: unknown[]) => ({ select: (...selectArgs: unknown[]) => updateIsSelectMock(payload, ...eqArgs, ...isArgs, ...selectArgs) }),
            }),
          }),
        };
      }
      if (table === "admin_action_log") {
        return { insert: (payload: Record<string, unknown>) => insertMock(payload) };
      }
      throw new Error(`grant-ultra-gift.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { grantUltraGift } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/security/require-admin";

const ADMIN_PROFILE = { id: "admin-1", display_name: "Ada", is_admin: true };
const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue(ADMIN_PROFILE as never);
  selectMaybeSingleMock.mockReset();
  updateIsSelectMock.mockReset();
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
});

describe("grantUltraGift — input validation", () => {
  test("rejects a non-UUID user id before touching the database", async () => {
    const result = await grantUltraGift("not-a-uuid");
    expect(result.error).toBeTruthy();
    expect(selectMaybeSingleMock).not.toHaveBeenCalled();
  });

  test("target user not found: a clear error, not a silent no-op", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: null, error: null });
    const result = await grantUltraGift(USER_ID);
    expect(result.error).toBeTruthy();
    expect(updateIsSelectMock).not.toHaveBeenCalled();
  });
});

describe("grantUltraGift — once per person", () => {
  test("already granted (per the pre-read): reports granted:false, never writes or logs", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { ultra_gift_granted_at: "2026-08-20T00:00:00.000Z", display_name: "Deniz" }, error: null });

    const result = await grantUltraGift(USER_ID);

    expect(result).toEqual({ granted: false });
    expect(updateIsSelectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("a real grant: writes ultra_gift_granted_at guarded on IS NULL, and logs it", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { ultra_gift_granted_at: null, display_name: "Deniz" }, error: null });
    updateIsSelectMock.mockResolvedValue({ data: [{ id: USER_ID }], error: null });

    const result = await grantUltraGift(USER_ID);

    expect(result).toEqual({ granted: true });
    // Call shape: update(payload).eq(col, val).is(col, val).select(col) -- payload, then
    // eq's two args, then is's two args, then select's arg.
    const [updatePayload, , , isColumn, isValue] = updateIsSelectMock.mock.calls[0];
    expect(updatePayload).toHaveProperty("ultra_gift_granted_at");
    expect(typeof updatePayload.ultra_gift_granted_at).toBe("string");
    expect(isColumn).toBe("ultra_gift_granted_at");
    expect(isValue).toBeNull();
    expect(insertMock).toHaveBeenCalledTimes(1);
    const [logPayload] = insertMock.mock.calls[0];
    expect(logPayload).toMatchObject({
      admin_id: "admin-1",
      action: "grant_ultra_gift",
      target_user_id: USER_ID,
      target_label: "Deniz",
    });
  });

  test("a race lost at the guarded update (granted between the read and the write): reports granted:false, not an error", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { ultra_gift_granted_at: null, display_name: "Deniz" }, error: null });
    // The IS NULL guard matched zero rows -- another grant won the race in between.
    updateIsSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await grantUltraGift(USER_ID);

    expect(result).toEqual({ granted: false });
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("a real write error surfaces as an error and never logs", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { ultra_gift_granted_at: null, display_name: "Deniz" }, error: null });
    updateIsSelectMock.mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } });

    const result = await grantUltraGift(USER_ID);

    expect(result.error).toBeTruthy();
    expect(insertMock).not.toHaveBeenCalled();
  });
});
