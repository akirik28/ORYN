import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * The bug CEO named directly, 2026-09-04: createConversation's own "New session" button
 * inserts a conversation with the DB's generic default title ("New conversation"), and unlike
 * sendAdvisorMessage's lazy-create path (which already derived a title from the first message
 * before this pass), nothing ever updated it once real messages arrived — a button-created
 * conversation carried "New conversation" forever. Both paths now converge on ONE mechanism
 * inside sendAdvisorMessage: whenever priorMessages comes back empty (genuinely the first user
 * message, regardless of how the conversation came to exist), the title gets derived from it.
 *
 * Mock harness mirrors __tests__/advisor/degraded-persistence.test.ts's own shape (same
 * function, same dependency set) — this file's own subject is the title-update call
 * specifically, not the assistant-message persistence that file already covers.
 */

function chainable(result: { data: unknown; error: unknown }) {
  const builder: Record<string, unknown> = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () => Promise.resolve(result),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: typeof result) => void) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

const MISSING_LOCK_FUNCTION_ERROR = { code: "PGRST202", message: "Could not find the function public.acquire_advisor_generation_lock in the schema cache" };
const rpcStub = () => Promise.resolve({ data: null, error: MISSING_LOCK_FUNCTION_ERROR });
const USER_ID = "11111111-1111-1111-1111-111111111111";
const EXISTING_CONV_ID = "22222222-2222-2222-2222-222222222222";

const { requireUserMock, getCurrentProfileMock, generateAdvisorReplyMock, createClientMock, titleUpdateMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentProfileMock: vi.fn().mockResolvedValue({ response_mode: "balanced", plan_tier: "standard", ultra_gift_expires_at: null }),
  generateAdvisorReplyMock: vi.fn().mockResolvedValue({ text: "reply", degraded: false }),
  createClientMock: vi.fn(),
  titleUpdateMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock, getCurrentProfile: getCurrentProfileMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: vi.fn().mockResolvedValue("en") }));
vi.mock("@/lib/ai/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/rate-limit")>("@/lib/ai/rate-limit");
  return { ...actual, assertWithinAIRateLimit: vi.fn().mockResolvedValue(undefined) };
});
vi.mock("@/lib/ai/monthly-quota", () => ({
  getMonthlyQuota: vi.fn().mockResolvedValue({ used: 0, limit: 50, remaining: 50, fraction: 0, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true }),
}));
vi.mock("@/lib/ai/advisor-chat", () => ({ generateAdvisorReply: generateAdvisorReplyMock }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { sendAdvisorMessage } from "@/app/(app)/advisor/actions";

/** priorMessagesCount controls whether this simulates a brand-new lazy-created conversation
 * (0) or an existing one already carrying real history (>0) — the exact fork this whole file
 * exists to prove behaves correctly on both sides of. ownershipRow non-null simulates a
 * pre-existing conversationId being passed in (the button-created-shell case); null simulates
 * lazy-create (conversationId: null from the caller). */
function client(priorMessagesCount: number, ownershipRow: { id: string } | null) {
  return {
    rpc: rpcStub,
    from: (table: string) => {
      if (table === "advisor_conversations") {
        return {
          // Ownership check (existing-conversation branch only) — .select("id").eq("id",
          // convId).eq("user_id", userId).maybeSingle()
          select: () => ({ eq: () => ({ eq: () => chainable({ data: ownershipRow, error: null }) }) }),
          // The lazy-create insert (no conversationId branch only)
          insert: () => chainable({ data: { id: EXISTING_CONV_ID }, error: null }),
          update: (row: Record<string, unknown>) => ({ eq: () => chainable(titleUpdateMock(row)) }),
        };
      }
      if (table === "advisor_messages") {
        return {
          select: (cols: string) =>
            // The touch-updated_at path (existing-conversation branch) has no .order()/.limit()
            // chained onto it in the real code, so distinguish it from the priorMessages
            // history read by column list.
            cols.includes("role")
              ? chainable({ data: Array.from({ length: priorMessagesCount }, (_, i) => ({ role: "user", content: `msg ${i}` })), error: null })
              : chainable({ data: null, error: null }),
          insert: () => chainable({ data: { id: "msg-1" }, error: null }),
        };
      }
      return chainable({ data: null, error: null });
    },
  };
}

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  getCurrentProfileMock.mockReset().mockResolvedValue({ response_mode: "balanced", plan_tier: "standard", ultra_gift_expires_at: null });
  generateAdvisorReplyMock.mockReset().mockResolvedValue({ text: "reply", degraded: false });
  titleUpdateMock.mockReset().mockReturnValue({ data: null, error: null });
});

describe("sendAdvisorMessage — title derivation converges both paths", () => {
  test("lazy-create (conversationId: null), genuinely first message: title is set and returned", async () => {
    createClientMock.mockResolvedValue(client(0, null));
    const result = await sendAdvisorMessage(null, "Should I start another entrepreneurship club?");

    expect(titleUpdateMock).toHaveBeenCalledTimes(1);
    expect(titleUpdateMock.mock.calls[0][0]).toEqual({ title: "Should I start another entrepreneurship club?" });
    expect(result.conversationTitle).toBe("Should I start another entrepreneurship club?");
  });

  test("THE FIX: an EXISTING conversation (button-created shell) with zero prior messages also gets titled", async () => {
    createClientMock.mockResolvedValue(client(0, { id: EXISTING_CONV_ID }));
    const result = await sendAdvisorMessage(EXISTING_CONV_ID, "Is my university list realistic?");

    // This branch also fires the pre-existing, unrelated "touch updated_at" update
    // (sendAdvisorMessage's own ownership-check path, `{ updated_at: ... }`) — both calls
    // share this table's own update() spy, so isolate the title-shaped one specifically
    // rather than asserting a raw call count that would conflate the two.
    const titleCalls = titleUpdateMock.mock.calls.filter(([row]) => "title" in (row as Record<string, unknown>));
    expect(titleCalls).toHaveLength(1);
    expect(titleCalls[0][0]).toEqual({ title: "Is my university list realistic?" });
    expect(result.conversationTitle).toBe("Is my university list realistic?");
  });

  test("an existing conversation with real prior history is never re-titled by a later message", async () => {
    createClientMock.mockResolvedValue(client(3, { id: EXISTING_CONV_ID }));
    const result = await sendAdvisorMessage(EXISTING_CONV_ID, "A follow-up question, not the opener.");

    // The unrelated touch-updated_at call is still expected here (see the test above) — only
    // asserting that no TITLE-shaped write happened.
    const titleCalls = titleUpdateMock.mock.calls.filter(([row]) => "title" in (row as Record<string, unknown>));
    expect(titleCalls).toHaveLength(0);
    expect(result.conversationTitle).toBeUndefined();
  });

  test("a title-update failure degrades: the message still sends, and no false title is reported back", async () => {
    createClientMock.mockResolvedValue(client(0, null));
    titleUpdateMock.mockReturnValue({ data: null, error: { code: "23514", message: "check constraint violated" } });
    const errorSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendAdvisorMessage(null, "First message, but the title write will fail.");

    expect(result.error).toBeUndefined();
    expect(result.content).toBe("reply");
    expect(result.conversationTitle).toBeUndefined(); // never claim a title that wasn't actually saved
    errorSpy.mockRestore();
  });
});
