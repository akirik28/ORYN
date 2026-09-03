import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * registerUltraInterestAsParentAction's authorization check (lib/tier/parent-interest-action.ts)
 * — the actual enforcement behind G9's "either can pay": a parent may only register interest
 * for a student they hold an *active* link to, checked here rather than assumed from whatever
 * page happened to call this. Mock shape mirrors update-advisor-instructions.test.ts.
 */

const { requireUserMock } = vi.hoisted(() => ({ requireUserMock: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock }));

const { logEventMock } = vi.hoisted(() => ({ logEventMock: vi.fn() }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: logEventMock }));

const { maybeSingleMock } = vi.hoisted(() => ({ maybeSingleMock: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table !== "parent_links") throw new Error(`parent-interest-action.test.ts: unexpected table "${table}"`);
      return { select: () => ({ eq: () => ({ eq: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }) }) }) };
    },
  }),
}));

import { registerUltraInterestAsParentAction } from "@/lib/tier/parent-interest-action";

const PARENT_ID = "11111111-1111-1111-1111-111111111111";
const STUDENT_ID = "22222222-2222-2222-2222-222222222222";

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: PARENT_ID, email: "parent@example.com" });
  logEventMock.mockReset().mockResolvedValue(undefined);
  maybeSingleMock.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("registerUltraInterestAsParentAction", () => {
  test("an active link logs the event under the parent's own id, tagged with which student it's about", async () => {
    maybeSingleMock.mockResolvedValue({ data: { status: "active" }, error: null });

    await registerUltraInterestAsParentAction(STUDENT_ID);

    expect(logEventMock).toHaveBeenCalledWith(PARENT_ID, "ultra_interest_registered", { registered_by: "parent", student_user_id: STUDENT_ID });
  });

  test("no active link (row absent) is refused, not silently allowed", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null });

    await expect(registerUltraInterestAsParentAction(STUDENT_ID)).rejects.toThrow(/no active link/i);
    expect(logEventMock).not.toHaveBeenCalled();
  });

  test("parent_links doesn't exist yet (migration 0116 unapplied) refuses cleanly rather than crashing or silently allowing", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { code: "PGRST205", message: "Could not find the table 'public.parent_links' in the schema cache" } });

    await expect(registerUltraInterestAsParentAction(STUDENT_ID)).rejects.toThrow(/not available yet/i);
    expect(logEventMock).not.toHaveBeenCalled();
  });

  test("a different, unrelated read error also refuses rather than defaulting to allow", async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { code: "PGRST301", message: "JWT expired" } });

    await expect(registerUltraInterestAsParentAction(STUDENT_ID)).rejects.toThrow();
    expect(logEventMock).not.toHaveBeenCalled();
  });
});
