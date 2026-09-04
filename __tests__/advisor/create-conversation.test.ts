import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * createConversation (app/(app)/advisor/actions.ts) -- the actual session wall for
 * docs/ozellesme-spec-2026-09-03.md §2. What matters here is the server-side enforcement
 * itself, not the client button: a Server Action is directly callable with any argument
 * regardless of what's rendered (this file's own header states the discipline), so these
 * tests call the action directly, the same way degraded-persistence.test.ts exercises
 * sendAdvisorMessage without going through AdvisorChat.
 */

vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn(), getCurrentProfile: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));

const { countMock, insertMock, createClientMock } = vi.hoisted(() => ({
  countMock: vi.fn(),
  insertMock: vi.fn(),
  createClientMock: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { createConversation } from "@/app/(app)/advisor/actions";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import type { Profile } from "@/types/database";

const USER_ID = "11111111-1111-1111-1111-111111111111";

/** Only the two fields resolvePlanTier actually reads -- same partial-Profile cast this
 * codebase's other tier-gated action tests already use (__tests__/security/is-admin.test.ts). */
function profile(planTier: "standard" | "ultra"): Profile {
  return { plan_tier: planTier, ultra_gift_expires_at: null, paid_ultra_expires_at: null } as unknown as Profile;
}

function client() {
  return {
    from: (table: string) => {
      if (table !== "advisor_conversations") throw new Error(`create-conversation.test.ts: unexpected table "${table}"`);
      return {
        // The count query: .select("id", { count: "exact", head: true }).eq("user_id", userId)
        select: () => ({ eq: () => countMock() }),
        insert: (row: Record<string, unknown>) => ({ select: () => ({ single: () => insertMock(row) }) }),
      };
    },
  };
}

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  vi.mocked(getCurrentProfile).mockReset();
  countMock.mockReset();
  insertMock.mockReset();
  createClientMock.mockReset().mockResolvedValue(client());
});

describe("createConversation — the actual session wall, not just the button", () => {
  test("Standard with zero existing conversations succeeds -- the button isn't wasted on a first-ever click", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(profile("standard"));
    countMock.mockResolvedValue({ count: 0, error: null });
    insertMock.mockResolvedValue({ data: { id: "conv-1" }, error: null });

    const result = await createConversation();

    expect(result.error).toBeUndefined();
    expect(result.conversationId).toBe("conv-1");
  });

  test("Standard with one existing conversation is rejected -- the wall actually firing", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(profile("standard"));
    countMock.mockResolvedValue({ count: 1, error: null });

    const result = await createConversation();

    expect(result.conversationId).toBeUndefined();
    expect(result.error).toBeTruthy();
    expect(insertMock).not.toHaveBeenCalled();
  });

  test("Ultra succeeds regardless of how many conversations already exist -- no count query even run", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(profile("ultra"));
    insertMock.mockResolvedValue({ data: { id: "conv-9" }, error: null });

    const result = await createConversation();

    expect(result.conversationId).toBe("conv-9");
    expect(countMock).not.toHaveBeenCalled();
  });

  test("a Server Action call is directly callable regardless of the client -- Standard is blocked even without going through any UI", async () => {
    // Same discipline this file's own actions all assert elsewhere: nothing about client-side
    // rendering is what actually enforces this, so calling the action with no client context
    // at all (exactly what this test does) must still refuse.
    vi.mocked(getCurrentProfile).mockResolvedValue(profile("standard"));
    countMock.mockResolvedValue({ count: 3, error: null });

    const result = await createConversation();
    expect(result.error).toBeTruthy();
  });

  test("a count-query failure fails CLOSED, not open -- the wall itself must never silently stop holding", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(profile("standard"));
    countMock.mockResolvedValue({ count: null, error: { code: "57014", message: "canceling statement due to statement timeout" } });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await createConversation();

    expect(result.conversationId).toBeUndefined();
    expect(result.error).toBeTruthy();
    expect(insertMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });

  test("a missing profile still resolves to the standard default and is still walled", async () => {
    vi.mocked(getCurrentProfile).mockResolvedValue(null);
    countMock.mockResolvedValue({ count: 1, error: null });

    const result = await createConversation();
    expect(result.error).toBeTruthy();
  });
});
