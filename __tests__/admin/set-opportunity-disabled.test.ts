import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * setOpportunityDisabled (app/(app)/admin/actions.ts) — oryn-a7's own named example: their
 * write to disable a bad opportunity record was blocked by RLS (opportunities has a
 * select-only policy for authenticated users, migration 0014), and the founder had to run
 * raw SQL for them a second time. Same three-outcome discipline as setUserPlanTier: error /
 * no-op (already in that state) / real change, and a zero-rows-matched update is a reported
 * error, never a silent success.
 */

vi.mock("@/lib/security/require-admin", () => ({ requireAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { selectMaybeSingleMock, updateSelectMock, insertMock } = vi.hoisted(() => ({
  selectMaybeSingleMock: vi.fn(),
  updateSelectMock: vi.fn(),
  insertMock: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "opportunities") {
        return {
          select: (...selectArgs: unknown[]) => ({ eq: (...eqArgs: unknown[]) => ({ maybeSingle: () => selectMaybeSingleMock(...selectArgs, ...eqArgs) }) }),
          update: (payload: Record<string, unknown>) => ({ eq: (...eqArgs: unknown[]) => ({ select: (...selectArgs: unknown[]) => updateSelectMock(payload, ...eqArgs, ...selectArgs) }) }),
        };
      }
      if (table === "admin_action_log") {
        return { insert: (payload: Record<string, unknown>) => insertMock(payload) };
      }
      throw new Error(`set-opportunity-disabled.test.ts: unexpected table "${table}"`);
    },
  }),
}));

import { setOpportunityDisabled } from "@/app/(app)/admin/actions";
import { requireAdmin } from "@/lib/security/require-admin";

const ADMIN_PROFILE = { id: "admin-1", display_name: "Ada", is_admin: true };
const OPPORTUNITY_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  vi.mocked(requireAdmin).mockResolvedValue(ADMIN_PROFILE as never);
  selectMaybeSingleMock.mockReset();
  updateSelectMock.mockReset();
  insertMock.mockReset();
  insertMock.mockResolvedValue({ error: null });
});

describe("setOpportunityDisabled — input validation", () => {
  test("rejects a non-UUID opportunity id", async () => {
    const result = await setOpportunityDisabled("not-a-uuid", true, "spam");
    expect(result.error).toBeTruthy();
    expect(selectMaybeSingleMock).not.toHaveBeenCalled();
  });

  test("a reason is required to disable — same rule post-removal-control.tsx enforces for posts", async () => {
    const result = await setOpportunityDisabled(OPPORTUNITY_ID, true, "   ");
    expect(result.error).toBeTruthy();
    expect(selectMaybeSingleMock).not.toHaveBeenCalled();
  });

  test("no reason required to reactivate", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { status: "disabled", title: "AI Scholars" }, error: null });
    updateSelectMock.mockResolvedValue({ data: [{ id: OPPORTUNITY_ID }], error: null });

    const result = await setOpportunityDisabled(OPPORTUNITY_ID, false);

    expect(result.changed).toBe(true);
  });
});

describe("setOpportunityDisabled — the three real outcomes", () => {
  test("disabling a genuinely active record: writes status=disabled and logs the reason", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { status: "active", title: "AI Scholars" }, error: null });
    updateSelectMock.mockResolvedValue({ data: [{ id: OPPORTUNITY_ID }], error: null });

    const result = await setOpportunityDisabled(OPPORTUNITY_ID, true, "Garbled description, likely a bad extraction");

    expect(result).toEqual({ changed: true });
    const [updatePayload] = updateSelectMock.mock.calls[0];
    expect(updatePayload).toEqual({ status: "disabled" });
    const [logPayload] = insertMock.mock.calls[0];
    expect(logPayload).toMatchObject({
      action: "disable_opportunity",
      target_label: "AI Scholars",
      detail: { from: "active", to: "disabled", reason: "Garbled description, likely a bad extraction", opportunityId: OPPORTUNITY_ID },
    });
  });

  test("reactivating restores to active regardless of what it was before (documented simplification)", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { status: "disabled", title: "AI Scholars" }, error: null });
    updateSelectMock.mockResolvedValue({ data: [{ id: OPPORTUNITY_ID }], error: null });

    await setOpportunityDisabled(OPPORTUNITY_ID, false);

    const [updatePayload] = updateSelectMock.mock.calls[0];
    expect(updatePayload).toEqual({ status: "active" });
    const [logPayload] = insertMock.mock.calls[0];
    expect(logPayload).toMatchObject({ action: "reactivate_opportunity", detail: { from: "disabled", to: "active" } });
  });

  test("a no-op (already disabled): reports changed:false, writes and logs nothing", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { status: "disabled", title: "AI Scholars" }, error: null });

    const result = await setOpportunityDisabled(OPPORTUNITY_ID, true, "spam");

    expect(result).toEqual({ changed: false });
    expect(updateSelectMock).not.toHaveBeenCalled();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("zero rows matched on write: a reported error, not a silent success", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { status: "active", title: "AI Scholars" }, error: null });
    updateSelectMock.mockResolvedValue({ data: [], error: null });

    const result = await setOpportunityDisabled(OPPORTUNITY_ID, true, "spam");

    expect(result.error).toBeTruthy();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("opportunity not found: a clear error, not a silent no-op", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: null, error: null });

    const result = await setOpportunityDisabled(OPPORTUNITY_ID, true, "spam");

    expect(result.error).toBeTruthy();
    expect(updateSelectMock).not.toHaveBeenCalled();
  });
});
