import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * updateAdvisorInstructions()'s server-side tier cap (app/(app)/settings/actions.ts) — the
 * real enforcement of docs/ozellesme-spec-2026-09-03.md §1's "İstemciyi atlayıp doğrudan
 * çağıran biri 20.000 karakter yazamamalı" (someone bypassing the client must not be able to
 * write 20,000 characters). Mock infra mirrors update-response-mode.test.ts exactly — same
 * shape of gate (a tier check before the write), same reason to test it the same way.
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
      if (table !== "profiles") throw new Error(`update-advisor-instructions.test.ts: unexpected table "${table}"`);
      return { update: updateMock };
    },
  }),
}));

import { updateAdvisorInstructions } from "@/app/(app)/settings/actions";
import { revalidatePath } from "next/cache";

const USER_ID = "11111111-1111-1111-1111-111111111111";

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  getCurrentProfileMock.mockReset();
  eqMock.mockReset().mockResolvedValue({ error: null });
  updateMock.mockClear();
  vi.mocked(revalidatePath).mockReset();
});

describe("updateAdvisorInstructions — the 500/2,000 char cap is enforced server-side, not just by the textarea", () => {
  test("standard tier: 501 characters is refused before it reaches the database", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard" });

    const result = await updateAdvisorInstructions("a".repeat(501));

    expect(result.error).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("standard tier: exactly 500 characters is accepted (the boundary itself, not just comfortably under it)", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard" });

    const result = await updateAdvisorInstructions("a".repeat(500));

    expect(result).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({ advisor_instructions: "a".repeat(500) });
  });

  test("ultra tier: 1,500 characters — over standard's cap, under ultra's — succeeds, proving the check is tier-aware and not a flat 500 everywhere", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra" });

    const result = await updateAdvisorInstructions("a".repeat(1500));

    expect(result).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({ advisor_instructions: "a".repeat(1500) });
  });

  test("ultra tier: 2,001 characters is still refused — the cap has a ceiling even on the higher tier", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra" });

    const result = await updateAdvisorInstructions("a".repeat(2001));

    expect(result.error).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("a bypass attempt (20,000 characters, the spec's own example) is refused regardless of tier", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra" });

    const result = await updateAdvisorInstructions("a".repeat(20000));

    expect(result.error).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("whitespace-only input clears the instruction (null), not an error — a legitimate 'remove it' action", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard" });

    const result = await updateAdvisorInstructions("   \n  ");

    expect(result).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({ advisor_instructions: null });
  });

  test("leading/trailing whitespace is trimmed before storing and before the length check", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard" });

    const result = await updateAdvisorInstructions("  Keep it short.  ");

    expect(result).toEqual({});
    expect(updateMock).toHaveBeenCalledWith({ advisor_instructions: "Keep it short." });
  });

  test("a missing profile (getCurrentProfile returns null) degrades to standard's cap, not a crash", async () => {
    getCurrentProfileMock.mockResolvedValue(null);

    const result = await updateAdvisorInstructions("a".repeat(501));

    expect(result.error).toBeDefined();
    expect(updateMock).not.toHaveBeenCalled();
  });

  test("migration 0111 not yet applied here: fails loudly with a specific message, never silently drops the write", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard" });
    eqMock.mockResolvedValue({ error: { code: "PGRST204", message: "Could not find the 'advisor_instructions' column of 'profiles' in the schema cache" } });

    const result = await updateAdvisorInstructions("Keep it short.");

    expect(result.error).toMatch(/instructions.*aren't available/i);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
