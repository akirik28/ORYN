import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * updateResponseMode()'s plan-tier guard (app/(app)/settings/actions.ts) — the server-side
 * layer of the three-layer Ultra gate (interactive clamp in the slider, this guard, and
 * generateAdvisorReply's own check). Mock infra mirrors
 * __tests__/settings/update-notification-preferences.test.ts, extended with getCurrentProfile
 * since this action (unlike updateNotificationPreferences) reads plan_tier before writing.
 * Scope is deliberately narrow (oryn-a7, 2026-09-02): a standard-tier "thorough" write is
 * refused, an Ultra-tier one succeeds. Nothing more — see that function's own test file and
 * __tests__/advisor/response-mode-slider.test.tsx for the other two layers' coverage.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireUserMock, getCurrentProfileMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
}));
vi.mock("@/lib/security/dal", () => ({
  requireUser: requireUserMock,
  getCurrentProfile: getCurrentProfileMock,
}));

const { eqMock, updateMock } = vi.hoisted(() => ({ eqMock: vi.fn(), updateMock: vi.fn() }));
updateMock.mockImplementation(() => ({ eq: eqMock }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "profiles") throw new Error(`update-response-mode.test.ts: unexpected table "${table}"`);
      return { update: updateMock };
    },
  }),
}));

import { updateResponseMode } from "@/app/(app)/settings/actions";
import { revalidatePath } from "next/cache";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  getCurrentProfileMock.mockReset();
  eqMock.mockReset().mockResolvedValue({ error: null });
  updateMock.mockClear();
  vi.mocked(revalidatePath).mockReset();
});

describe("updateResponseMode — Ultra is plan-gated server-side, not just in the slider", () => {
  test("standard-tier: a \"thorough\" write is refused before it reaches the database", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard" });

    const result = await updateResponseMode("thorough");

    expect(result.error).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("ultra-tier: the identical \"thorough\" write succeeds", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra" });

    const result = await updateResponseMode("thorough");

    expect(result).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({ response_mode: "thorough" });
    expect(revalidatePath).toHaveBeenCalledWith("/advisor");
  });
});
