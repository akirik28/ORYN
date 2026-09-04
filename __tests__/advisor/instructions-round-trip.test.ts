import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockSupabaseClient } from "../stubs/mock-supabase-table";

/**
 * Settles one of the two open claims from the founder's complaint (CEO, 2026-09-04:
 * "instructions ve session şeyi de çalışmıyor" — the instructions and session thing also
 * doesn't work). 48 confirmed advisor_instructions exists live and the code "reads clean" but
 * stopped short of proving the actual pipeline, correctly, rather than fabricating a login.
 *
 * What this proves, and what it deliberately doesn't: a saved instruction persists and comes
 * back through the SAME code paths a real request uses — updateAdvisorInstructions (the real
 * save action) writes into ONE shared, stateful mock table, and a read shaped exactly like
 * buildStudentAdvisorContext's own `.select("*").eq("id", userId).single()` profile query,
 * against that SAME table, is what resolveAdvisorInstructions receives. That's the genuinely
 * untested seam — two previously separate assumptions (the save-side cap enforcement,
 * __tests__/settings/update-advisor-instructions.test.ts; the prompt-formatter's own inclusion
 * of an already-resolved value, __tests__/ai/student-context.test.ts's "included verbatim,
 * quoted, when set" and its three siblings) had never actually been chained through a shared,
 * mutating table before. It stops at resolveAdvisorInstructions rather than also calling
 * formatContextForPrompt: that function's OWN inclusion behavior (quoted, carries the
 * safety carve-out, is the last line) is already proven with real output-text assertions in
 * student-context.test.ts, and re-deriving its full StudentAdvisorContext fixture here would
 * duplicate that coverage rather than close a gap.
 */

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const { requireUserMock, getCurrentProfileMock, createClientMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
  createClientMock: vi.fn(),
}));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock, getCurrentProfile: getCurrentProfileMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { updateAdvisorInstructions } from "@/app/(app)/settings/actions";
import { resolveAdvisorInstructions } from "@/lib/tier/advisor-instructions";

const USER_ID = "11111111-1111-1111-1111-111111111111";

/** buildStudentAdvisorContext's own exact profile-read shape (lib/ai/student-context.ts:457) —
 * reproduced here rather than imported, since that function pulls in scoring/deadlines/
 * targets that are irrelevant to this seam and would need their own unrelated fixtures. */
async function readProfileLikeBuildStudentAdvisorContext(client: MockSupabaseClient, userId: string) {
  return client.from("profiles").select("*").eq("id", userId).single();
}

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  getCurrentProfileMock.mockReset();
  createClientMock.mockReset();
});

describe("advisor_instructions — save, then a fresh read, through one shared stateful table", () => {
  test("a saved instruction is what the next profile read actually returns", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null });
    const client = new MockSupabaseClient({
      profiles: { rows: [{ id: USER_ID, advisor_instructions: null }] },
    });
    createClientMock.mockResolvedValue(client);

    const saveResult = await updateAdvisorInstructions("Keep it short. No medicine.");
    expect(saveResult.error).toBeUndefined();

    const { data: profile, error } = await readProfileLikeBuildStudentAdvisorContext(client, USER_ID);
    expect(error).toBeNull();
    expect(resolveAdvisorInstructions(profile as { advisor_instructions: string | null })).toBe("Keep it short. No medicine.");
  });

  test("clearing (empty string) round-trips to null, not an empty string surviving into the prompt path", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null });
    const client = new MockSupabaseClient({
      profiles: { rows: [{ id: USER_ID, advisor_instructions: "Old instruction." }] },
    });
    createClientMock.mockResolvedValue(client);

    await updateAdvisorInstructions("   ");

    const { data: profile } = await readProfileLikeBuildStudentAdvisorContext(client, USER_ID);
    expect(resolveAdvisorInstructions(profile as { advisor_instructions: string | null })).toBeNull();
  });

  test("a Standard-tier save over the 500-char cap is rejected before the write, and the OLD value is still what reads back", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null });
    const client = new MockSupabaseClient({
      profiles: { rows: [{ id: USER_ID, advisor_instructions: "Original." }] },
    });
    createClientMock.mockResolvedValue(client);

    const saveResult = await updateAdvisorInstructions("x".repeat(501));
    expect(saveResult.error).toBeTruthy();

    const { data: profile } = await readProfileLikeBuildStudentAdvisorContext(client, USER_ID);
    expect(resolveAdvisorInstructions(profile as { advisor_instructions: string | null })).toBe("Original.");
  });

  test("Ultra's wider 2,000-char cap actually applies on this same save path, not just in the documented number", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra", ultra_gift_expires_at: null });
    const client = new MockSupabaseClient({
      profiles: { rows: [{ id: USER_ID, advisor_instructions: null }] },
    });
    createClientMock.mockResolvedValue(client);

    const longButUnderUltraCap = "y".repeat(1800);
    const saveResult = await updateAdvisorInstructions(longButUnderUltraCap);
    expect(saveResult.error).toBeUndefined();

    const { data: profile } = await readProfileLikeBuildStudentAdvisorContext(client, USER_ID);
    expect(resolveAdvisorInstructions(profile as { advisor_instructions: string | null })).toBe(longButUnderUltraCap);
  });

  test("migration 0111 unapplied (advisor_instructions column missing): save degrades honestly, and the read genuinely still returns nothing new — not a false green from an untriggered write", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null });
    const client = new MockSupabaseClient({
      profiles: { rows: [{ id: USER_ID }], missingColumns: ["advisor_instructions"] },
    });
    createClientMock.mockResolvedValue(client);

    const saveResult = await updateAdvisorInstructions("Won't stick.");
    expect(saveResult.error).toBeTruthy();

    // select("*") (real code, real mock) omits the missing column entirely rather than
    // erroring on the read side — resolveAdvisorInstructions's own header names this exact
    // gap (undefined vs null) as the reason it exists.
    const { data: profile } = await readProfileLikeBuildStudentAdvisorContext(client, USER_ID);
    expect(resolveAdvisorInstructions(profile as { advisor_instructions: string | null })).toBeNull();
  });
});
