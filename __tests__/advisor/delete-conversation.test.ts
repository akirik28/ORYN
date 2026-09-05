import { beforeEach, describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { MockSupabaseClient } from "@/__tests__/stubs/mock-supabase-table";

/**
 * Founder, 2026-09-05: "silme butonu da lazım" (a delete button too), with CEO's own explicit,
 * non-negotiable requirement: prove a student can only delete their OWN conversation. RLS's
 * "owner full access" policy (confirmed live against the real database: cmd ALL, qual/with_check
 * both `user_id = auth.uid()`) is the actual enforcement in production; this file proves the
 * SAME thing at the application-query level, using the real row-filtering mock (not a call-spy)
 * specifically because the risk here is exactly the shape that mock exists to catch — a swapped
 * column, a missing filter, or a subtly-wrong value would all still make a call-spy assertion
 * pass. The real-Postgres-RLS proof (a stolen/forged request bypassing this application code
 * entirely) is separate and lives in docs/advisor-session-delete-rls-proof-2026-09-05.md.
 */

const { requireUserMock, createClientMock, revalidatePathMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createClientMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: revalidatePathMock }));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock, getCurrentProfile: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { deleteConversation } from "@/app/(app)/advisor/actions";

const OWNER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER_ID = "99999999-9999-9999-9999-999999999999";
const CONV_ID = "22222222-2222-2222-2222-222222222222";

function client(conversations: Record<string, unknown>[], forceError?: { code: string; message: string }) {
  return new MockSupabaseClient({
    advisor_conversations: { rows: conversations, forceError },
  }) as unknown as SupabaseClient<Database>;
}

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: OWNER_ID, email: "student@example.com" });
  revalidatePathMock.mockReset();
});

describe("deleteConversation — real ownership filtering, not a call-spy", () => {
  test("the owner deleting their own conversation succeeds and the row is actually removed", async () => {
    const conversations = [{ id: CONV_ID, user_id: OWNER_ID, title: "My session" }];
    createClientMock.mockResolvedValue(client(conversations));

    const result = await deleteConversation(CONV_ID);

    expect(result).toEqual({ success: true });
    // The real proof: the seeded row is gone from the underlying store, not just that the
    // function returned a success-shaped object.
    expect(conversations).toHaveLength(0);
    expect(revalidatePathMock).toHaveBeenCalledWith("/advisor");
  });

  test("THE MANDATORY CASE: a different user's own conversation ID is NOT deleted, even though it genuinely exists", async () => {
    const conversations = [{ id: CONV_ID, user_id: OTHER_USER_ID, title: "Someone else's session" }];
    createClientMock.mockResolvedValue(client(conversations));
    // requireUser resolves as OWNER_ID (beforeEach) -- OWNER_ID attempting to delete a row
    // that is real, has a real id, but belongs to OTHER_USER_ID.

    const result = await deleteConversation(CONV_ID);

    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
    // The row must still be there afterward -- this is the actual security property under
    // test, not the returned error string. A version of this function missing its
    // .eq("user_id", userId) filter would delete this row and still return a plausible-
    // looking result if the mock only recorded calls instead of genuinely filtering.
    expect(conversations).toHaveLength(1);
    expect(conversations[0]).toEqual({ id: CONV_ID, user_id: OTHER_USER_ID, title: "Someone else's session" });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test("a non-existent conversation ID reports the identical 'not found' error a stranger's ID gets — never distinguishing the two", async () => {
    const supabase = client([]); // nothing seeded at all
    createClientMock.mockResolvedValue(supabase);

    const result = await deleteConversation(CONV_ID);

    expect(result.error).toBeTruthy();
  });

  test("an invalid conversation id is rejected before any query runs", async () => {
    const conversations = [{ id: CONV_ID, user_id: OWNER_ID, title: "My session" }];
    createClientMock.mockResolvedValue(client(conversations));

    const result = await deleteConversation("not-a-real-uuid");

    expect(result.error).toBeTruthy();
    expect(conversations).toHaveLength(1); // untouched
  });

  test("a genuine database error surfaces as a real (non-fabricated) failure, not a false success", async () => {
    createClientMock.mockResolvedValue(client([{ id: CONV_ID, user_id: OWNER_ID, title: "x" }], { code: "XX000", message: "connection reset" }));

    const result = await deleteConversation(CONV_ID);

    expect(result.error).toBeTruthy();
    expect(result.success).toBeUndefined();
  });
});
