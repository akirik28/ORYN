import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * setUserPlanTier (app/(app)/admin/actions.ts) — the founder's own named example: they had
 * to ask oryn-a7 to run raw SQL twice to set their own plan_tier, and once it silently
 * affected zero rows with neither of them knowing why. What this test suite actually pins
 * is the THREE-way outcome (error / no-op / real change) and specifically that a
 * zero-rows-matched update is reported as a real error rather than swallowed the way the
 * founder's own SQL swallowed it — the exact regression this whole action exists to
 * prevent.
 */

vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: vi.fn() }));
// revalidatePath needs a request-scoped store Next only provides inside a real request —
// irrelevant to what this suite actually pins (the update/log logic), and the first test
// run here found this the hard way: "Invariant: static generation store missing".
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { selectMaybeSingleMock, updateSelectMock, insertMock } = vi.hoisted(() => ({
  selectMaybeSingleMock: vi.fn(),
  updateSelectMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: (...selectArgs: unknown[]) => ({ eq: (...eqArgs: unknown[]) => ({ maybeSingle: () => selectMaybeSingleMock(...selectArgs, ...eqArgs) }) }),
          update: (payload: Record<string, unknown>) => ({ eq: (...eqArgs: unknown[]) => ({ select: (...selectArgs: unknown[]) => updateSelectMock(payload, ...eqArgs, ...selectArgs) }) }),
        };
      }
      if (table === "admin_action_log") {
        return { insert: (payload: Record<string, unknown>) => insertMock(payload) };
      }
      throw new Error(`set-user-plan-tier.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { setUserPlanTier } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/security/require-admin";

const ADMIN_PROFILE = { id: "admin-1", display_name: "Ada", is_admin: true };
const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue(ADMIN_PROFILE as never);
  selectMaybeSingleMock.mockReset();
  updateSelectMock.mockReset();
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
});

describe("setUserPlanTier — input validation", () => {
  test("rejects a non-UUID user id before touching the database", async () => {
    const result = await setUserPlanTier("not-a-uuid", "ultra");
    expect(result.error).toBeTruthy();
    expect(selectMaybeSingleMock).not.toHaveBeenCalled();
  });

  test("rejects a tier outside the check constraint's two values", async () => {
    // @ts-expect-error deliberately calling with an invalid tier to prove the runtime guard exists independent of the type system
    const result = await setUserPlanTier(USER_ID, "premium");
    expect(result.error).toBeTruthy();
    expect(selectMaybeSingleMock).not.toHaveBeenCalled();
  });
});

describe("setUserPlanTier — the three real outcomes", () => {
  test("a genuine change: writes the new tier and logs it with from/to", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { plan_tier: "standard", display_name: "Deniz" }, error: null });
    updateSelectMock.mockResolvedValue({ data: [{ id: USER_ID }], error: null });

    const result = await setUserPlanTier(USER_ID, "ultra");

    expect(result).toEqual({ changed: true, fromTier: "standard" });
    const [updatePayload] = updateSelectMock.mock.calls[0];
    expect(updatePayload).toEqual({ plan_tier: "ultra" });
    expect(insertMock).toHaveBeenCalledTimes(1);
    const [logPayload] = insertMock.mock.calls[0];
    expect(logPayload).toMatchObject({
      admin_id: "admin-1",
      action: "set_plan_tier",
      target_user_id: USER_ID,
      target_label: "Deniz",
      detail: { from: "standard", to: "ultra" },
    });
  });

  test("a no-op (already on the requested tier): reports changed:false, never writes or logs", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { plan_tier: "ultra", display_name: "Deniz" }, error: null });

    const result = await setUserPlanTier(USER_ID, "ultra");

    expect(result).toEqual({ changed: false, fromTier: "ultra" });
    expect(updateSelectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("the founder's own regression: an update matching zero rows is a reported error, not a silent success", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { plan_tier: "standard", display_name: "Deniz" }, error: null });
    // No error from Postgres/PostgREST -- exactly the shape that fooled a bare .update() with no .select() before.
    updateSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await setUserPlanTier(USER_ID, "ultra");

    expect(result.error).toBeTruthy();
    expect(result.changed).toBeUndefined();
    expect(insertMock).not.toHaveBeenCalled(); // never log an action that didn't actually happen
  });

  test("a real write error surfaces as an error and never logs", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { plan_tier: "standard", display_name: "Deniz" }, error: null });
    updateSelectMock.mockResolvedValue({ data: null, error: { code: "42501", message: "permission denied" } });

    const result = await setUserPlanTier(USER_ID, "ultra");

    expect(result.error).toBeTruthy();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("target user not found: a clear error, not a silent no-op", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await setUserPlanTier(USER_ID, "ultra");

    expect(result.error).toBeTruthy();
    expect(updateSelectMock).not.toHaveBeenCalled();
  });
});
