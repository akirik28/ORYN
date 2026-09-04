import { describe, expect, test, vi, beforeEach } from "vitest";

/**
 * getConversationMessages (app/(app)/advisor/actions.ts) — the read half of the founder's
 * 2026-09-04 session-list request. CEO's own explicit check: "make sure the list can't trip"
 * assertConversationLimitNotExceeded, the session wall this same night's earlier fix built.
 * This suite proves that two ways — by construction (no INSERT call exists anywhere in the
 * mock this function is exercised against, so a real accidental call would throw immediately,
 * the same "mockAdminClient throws on any table access it doesn't expect" technique
 * __tests__/digest/run.test.ts already established) and by asserting the actual outcome
 * (fetching another tier's conversation never returns a wall-shaped error).
 */

vi.mock("@/lib/security/dal", () => ({ requireUser: vi.fn() }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));

const { createClientMock } = vi.hoisted(() => ({ createClientMock: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { getConversationMessages } from "@/app/(app)/advisor/actions";
import { requireUser } from "@/lib/security/dal";

const USER_ID = "11111111-1111-1111-1111-111111111111";
const CONVERSATION_ID = "22222222-2222-2222-2222-222222222222";
const OTHER_USERS_CONVERSATION_ID = "33333333-3333-3333-3333-333333333333";

/** No `insert` handler at all, on either table — deliberately. A code path that somehow
 * called .insert() (i.e. this function accidentally reaching createConversation/lazy-create
 * logic) would throw here immediately, rather than silently succeeding and hiding the bug. */
function client(ownedConversation: { id: string } | null, messages: unknown[]) {
  return {
    from: (table: string) => {
      if (table === "advisor_conversations") {
        return { select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: ownedConversation, error: null }) }) }) }) };
      }
      if (table === "advisor_messages") {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: messages, error: null }) }) }) };
      }
      throw new Error(`get-conversation-messages.test.ts: unexpected table "${table}" — no insert path should ever be reachable here`);
    },
  };
}

beforeEach(() => {
  vi.mocked(requireUser).mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  createClientMock.mockReset();
});

describe("getConversationMessages — a pure read, never a path to the session wall", () => {
  test("owns the conversation: returns its messages", async () => {
    const rows = [{ id: "m1", role: "user", content: "hi" }];
    createClientMock.mockResolvedValue(client({ id: CONVERSATION_ID }, rows));

    const result = await getConversationMessages(CONVERSATION_ID);

    expect(result.error).toBeUndefined();
    expect(result.messages).toEqual(rows);
  });

  test("a foreign conversation id (owned by someone else) is refused, not leaked", async () => {
    // The mock's ownership query itself is what a real .eq("user_id", userId) would filter to
    // null for — simulated directly here, matching sendAdvisorMessage's own existing-
    // conversation ownership check's exact shape.
    createClientMock.mockResolvedValue(client(null, []));

    const result = await getConversationMessages(OTHER_USERS_CONVERSATION_ID);

    expect(result.messages).toEqual([]);
    expect(result.error).toBeTruthy();
  });

  test("an invalid id shape is rejected before any query runs at all", async () => {
    createClientMock.mockResolvedValue(client({ id: CONVERSATION_ID }, []));

    const result = await getConversationMessages("not-a-uuid");

    expect(result.error).toBeTruthy();
    expect(createClientMock).not.toHaveBeenCalled();
  });

  test("a Standard-tier caller reopening their own conversation gets no wall-shaped error — reopening was never gated by tier", async () => {
    // No plan_tier read anywhere in this function's own mock, on purpose: getConversationMessages
    // doesn't call getCurrentProfile or resolvePlanTier at all, so there is no code path here
    // that could even construct the "Standard includes one conversation" message.
    createClientMock.mockResolvedValue(client({ id: CONVERSATION_ID }, []));

    const result = await getConversationMessages(CONVERSATION_ID);

    expect(result.error).toBeUndefined();
  });
});
