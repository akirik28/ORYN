import { describe, expect, test, vi, beforeEach } from "vitest";

const { eqMock, updateMock } = vi.hoisted(() => ({ eqMock: vi.fn(), updateMock: vi.fn() }));
updateMock.mockImplementation(() => ({ eq: eqMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`ultra-welcome.test.ts: unexpected table "${table}"`);
      return { update: updateMock };
    },
  }),
}));

import { shouldShowUltraWelcome, markUltraWelcomeSeen } from "@/lib/tier/ultra-welcome";
import { createClient } from "@/lib/supabase/server";

const USER_ID = "11111111-1111-1111-1111-111111111111";

describe("shouldShowUltraWelcome", () => {
  test("ultra + never shown (real null, migration applied) -- shows", () => {
    expect(shouldShowUltraWelcome("ultra", null)).toBe(true);
  });

  test("ultra + already shown -- does not show again", () => {
    expect(shouldShowUltraWelcome("ultra", "2026-09-02T10:00:00.000Z")).toBe(false);
  });

  test("ultra + column absent (migration 0092 unapplied, undefined not null) -- does not show", () => {
    // The one case this function treats differently from every other absent-column fallback
    // in this codebase: undefined is NOT collapsed into "same as null." There is nowhere to
    // durably record having shown it yet, so staying silent is the correct degrade, not a
    // missed case -- see the function's own comment for the full reasoning.
    expect(shouldShowUltraWelcome("ultra", undefined)).toBe(false);
  });

  test("standard tier -- never shows, regardless of the seen-at value", () => {
    expect(shouldShowUltraWelcome("standard", null)).toBe(false);
    expect(shouldShowUltraWelcome("standard", undefined)).toBe(false);
    expect(shouldShowUltraWelcome("standard", "2026-09-02T10:00:00.000Z")).toBe(false);
  });
});

describe("markUltraWelcomeSeen", () => {
  beforeEach(() => {
    eqMock.mockReset();
    updateMock.mockClear();
  });

  test("writes a real ISO timestamp to ultra_welcome_seen_at, scoped to the caller's own id", async () => {
    eqMock.mockResolvedValue({ error: null });
    const supabase = await createClient();

    await markUltraWelcomeSeen(supabase, USER_ID);

    expect(updateMock).toHaveBeenCalledTimes(1);
    const payload = updateMock.mock.calls[0][0];
    expect(typeof payload.ultra_welcome_seen_at).toBe("string");
    expect(new Date(payload.ultra_welcome_seen_at).toString()).not.toBe("Invalid Date");
    expect(eqMock).toHaveBeenCalledWith("id", USER_ID);
  });

  test("a write failure logs a warning and does not throw -- best-effort, never blocks the page", async () => {
    eqMock.mockResolvedValue({ error: { code: "PGRST301", message: "JWT expired" } });
    const supabase = await createClient();
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    await expect(markUltraWelcomeSeen(supabase, USER_ID)).resolves.toBeUndefined();

    expect(warnSpy).toHaveBeenCalledTimes(1);
    warnSpy.mockRestore();
  });
});
