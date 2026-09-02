import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * softDismissUpgradePrompt and notNowUpgradePrompt (app/(app)/advisor/actions.ts) — the two
 * writes for the founder-approved upgrade pop-up's dismissal state. Both are fire-and-forget
 * from the caller's perspective (features/advisor/advisor-chat.tsx never awaits or checks
 * their result), so what matters here is: the right columns get written, the escalation math
 * is actually applied (not just lib/advisor/upgrade-prompt.ts's own pure-function tests --
 * this is the wiring that calls it with real prior state), and migration 0093 unapplied
 * never throws.
 */

vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));

const { updateMock, selectMaybeSingleMock } = vi.hoisted(() => ({ updateMock: vi.fn(), selectMaybeSingleMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`upgrade-prompt-actions.test.ts: unexpected table "${table}"`);
      return {
        update: (payload: Record<string, unknown>) => ({ eq: (...args: unknown[]) => updateMock(payload, ...args) }),
        select: (...args: unknown[]) => ({ eq: (...eqArgs: unknown[]) => ({ maybeSingle: () => selectMaybeSingleMock(...args, ...eqArgs) }) }),
      };
    },
  }),
}));

import { softDismissUpgradePrompt, notNowUpgradePrompt } from "@/app/(app)/advisor/actions";
import { requireUser } from "@/lib/security/dal";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  updateMock.mockReset();
  selectMaybeSingleMock.mockReset();
});

describe("softDismissUpgradePrompt", () => {
  test("writes a soft-dismiss timestamp roughly 7 days out", async () => {
    updateMock.mockResolvedValue({ error: null });

    await softDismissUpgradePrompt();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const [payload] = updateMock.mock.calls[0];
    const until = new Date(payload.upgrade_prompt_soft_dismissed_until as string).getTime();
    const expected = Date.now() + 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(until - expected)).toBeLessThan(5000); // generous clock-skew allowance, not asserting an exact instant
  });

  test("migration 0093 unapplied (PGRST204 naming an upgrade_prompt_ column) never throws", async () => {
    updateMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'upgrade_prompt_soft_dismissed_until' column of 'profiles' in the schema cache" },
    });

    await expect(softDismissUpgradePrompt()).resolves.toBeUndefined();
  });

  test("an unrelated write error is logged but still never thrown -- this action must never surface an error to a close click", async () => {
    updateMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(softDismissUpgradePrompt()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("notNowUpgradePrompt — read-then-write, escalation applied for real", () => {
  test("a first-ever click writes count 1, not escalated", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { upgrade_prompt_not_now_at: null, upgrade_prompt_not_now_count: 0 }, error: null });
    updateMock.mockResolvedValue({ error: null });

    await notNowUpgradePrompt();

    const [payload] = updateMock.mock.calls[0];
    expect(payload.upgrade_prompt_not_now_count).toBe(1);
    expect(payload.upgrade_prompt_dismissed_forever).toBe(false);
  });

  test("a second click in a genuinely later month escalates dismissed_forever to true", async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    selectMaybeSingleMock.mockResolvedValue({
      data: { upgrade_prompt_not_now_at: lastMonth.toISOString(), upgrade_prompt_not_now_count: 1 },
      error: null,
    });
    updateMock.mockResolvedValue({ error: null });

    await notNowUpgradePrompt();

    const [payload] = updateMock.mock.calls[0];
    expect(payload.upgrade_prompt_dismissed_forever).toBe(true);
    expect(payload.upgrade_prompt_not_now_count).toBe(2);
  });

  test("migration 0093 unapplied on the READ side (no prior row readable) still writes a first-click shape, not an error", async () => {
    selectMaybeSingleMock.mockResolvedValue({
      data: null,
      error: { code: "PGRST204", message: "Could not find the 'upgrade_prompt_not_now_at' column of 'profiles' in the schema cache" },
    });
    updateMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'upgrade_prompt_not_now_at' column of 'profiles' in the schema cache" },
    });

    await expect(notNowUpgradePrompt()).resolves.toBeUndefined();
    // Still attempts the write with the "never declined before" default -- degrades the
    // same way the read did, doesn't skip the write entirely.
    const [payload] = updateMock.mock.calls[0];
    expect(payload.upgrade_prompt_not_now_count).toBe(1);
  });
});
