import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * softDismissParentEmailPrompt and notNowParentEmailPrompt (app/(app)/dashboard/actions.ts) —
 * same shape and same reasoning as __tests__/advisor/upgrade-prompt-actions.test.ts, against
 * the independent parent_email_prompt_* columns (migration 0117) instead of upgrade_prompt_*.
 * Both are fire-and-forget from the caller's perspective
 * (features/dashboard/parent-email-prompt.tsx never awaits or checks their result), so what
 * matters here is: the right columns get written, the escalation math is actually applied
 * against real prior state (not just lib/parent/email-prompt.ts's own pure-function tests),
 * and migration 0117 unapplied never throws.
 */

vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));

const { updateMock, selectMaybeSingleMock } = vi.hoisted(() => ({ updateMock: vi.fn(), selectMaybeSingleMock: vi.fn() }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`parent-email-prompt-actions.test.ts: unexpected table "${table}"`);
      return {
        update: (payload: Record<string, unknown>) => ({ eq: (...args: unknown[]) => updateMock(payload, ...args) }),
        select: (...args: unknown[]) => ({ eq: (...eqArgs: unknown[]) => ({ maybeSingle: () => selectMaybeSingleMock(...args, ...eqArgs) }) }),
      };
    },
  }),
}));

import { softDismissParentEmailPrompt, notNowParentEmailPrompt } from "@/app/(app)/dashboard/actions";
import { requireUser } from "@/lib/security/dal";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  updateMock.mockReset();
  selectMaybeSingleMock.mockReset();
});

describe("softDismissParentEmailPrompt", () => {
  test("writes a soft-dismiss timestamp roughly 7 days out, on the independent parent_email_prompt_ column", async () => {
    updateMock.mockResolvedValue({ error: null });

    await softDismissParentEmailPrompt();

    expect(updateMock).toHaveBeenCalledTimes(1);
    const [payload] = updateMock.mock.calls[0];
    expect(Object.keys(payload)).toEqual(["parent_email_prompt_soft_dismissed_until"]);
    const until = new Date(payload.parent_email_prompt_soft_dismissed_until as string).getTime();
    const expected = Date.now() + 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(until - expected)).toBeLessThan(5000); // generous clock-skew allowance, not asserting an exact instant
  });

  test("migration 0117 unapplied (PGRST204 naming a parent_email_prompt_ column) never throws", async () => {
    updateMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'parent_email_prompt_soft_dismissed_until' column of 'profiles' in the schema cache" },
    });

    await expect(softDismissParentEmailPrompt()).resolves.toBeUndefined();
  });

  test("an unrelated write error is logged but still never thrown -- this action must never surface an error to a close click", async () => {
    updateMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(softDismissParentEmailPrompt()).resolves.toBeUndefined();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});

describe("notNowParentEmailPrompt — read-then-write, escalation applied for real", () => {
  test("a first-ever click writes count 1, not escalated", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { parent_email_prompt_not_now_at: null, parent_email_prompt_not_now_count: 0 }, error: null });
    updateMock.mockResolvedValue({ error: null });

    await notNowParentEmailPrompt();

    const [payload] = updateMock.mock.calls[0];
    expect(payload.parent_email_prompt_not_now_count).toBe(1);
    expect(payload.parent_email_prompt_dismissed_forever).toBe(false);
  });

  test("a second click in a genuinely later month escalates dismissed_forever to true", async () => {
    const lastMonth = new Date();
    lastMonth.setUTCMonth(lastMonth.getUTCMonth() - 1);
    selectMaybeSingleMock.mockResolvedValue({
      data: { parent_email_prompt_not_now_at: lastMonth.toISOString(), parent_email_prompt_not_now_count: 1 },
      error: null,
    });
    updateMock.mockResolvedValue({ error: null });

    await notNowParentEmailPrompt();

    const [payload] = updateMock.mock.calls[0];
    expect(payload.parent_email_prompt_dismissed_forever).toBe(true);
    expect(payload.parent_email_prompt_not_now_count).toBe(2);
  });

  test("migration 0117 unapplied on the READ side (no prior row readable) still writes a first-click shape, not an error", async () => {
    selectMaybeSingleMock.mockResolvedValue({
      data: null,
      error: { code: "PGRST204", message: "Could not find the 'parent_email_prompt_not_now_at' column of 'profiles' in the schema cache" },
    });
    updateMock.mockResolvedValue({
      error: { code: "PGRST204", message: "Could not find the 'parent_email_prompt_not_now_at' column of 'profiles' in the schema cache" },
    });

    await expect(notNowParentEmailPrompt()).resolves.toBeUndefined();
    // Still attempts the write with the "never declined before" default -- degrades the
    // same way the read did, doesn't skip the write entirely.
    const [payload] = updateMock.mock.calls[0];
    expect(payload.parent_email_prompt_not_now_count).toBe(1);
  });

  test("only parent_email_prompt_ columns are ever written -- never touches upgrade_prompt_*", async () => {
    selectMaybeSingleMock.mockResolvedValue({ data: { parent_email_prompt_not_now_at: null, parent_email_prompt_not_now_count: 0 }, error: null });
    updateMock.mockResolvedValue({ error: null });

    await notNowParentEmailPrompt();

    const [payload] = updateMock.mock.calls[0];
    expect(Object.keys(payload).every((key) => key.startsWith("parent_email_prompt_"))).toBe(true);
  });
});
