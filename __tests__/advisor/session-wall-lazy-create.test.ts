import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Settles the second open claim from the founder's complaint (CEO, 2026-09-04: "instructions
 * ve session şeyi de çalışmıyor"). createConversation (the explicit "new session" button) was
 * already thoroughly tested — __tests__/advisor/create-conversation.test.ts, 6 tests, the wall
 * genuinely fires there. What had never been tested — and turned out to be broken —
 * was sendAdvisorMessage's OWN lazy-create branch (app/(app)/advisor/actions.ts,
 * `if (!convId) { ...insert... }`): the path that runs when a message arrives with no
 * conversationId, which is also how a conversation gets created on a student's very first
 * message. It inserted unconditionally — no tier check, no count query, nothing enforcing
 * docs/ozellesme-spec-2026-09-03.md §2's "Standard gets exactly one conversation, ever."
 *
 * Confirmed live before any fix: a version of this suite's first test, run against the
 * unfixed code, passed — a Standard-tier caller with conversationId: null got a brand-new
 * conversation inserted with nothing stopping it. Fixed by extracting
 * assertConversationLimitNotExceeded (this file's own new shared helper) so createConversation
 * and this lazy-create branch enforce identically rather than one silently drifting from the
 * other, and this suite now proves the FIXED behavior — including the negative case
 * (Standard, already has one, still blocked here) that never existed before this pass.
 *
 * Mock setup mirrors __tests__/advisor/degraded-persistence.test.ts's harness (same function,
 * same dependency set) — this file's own subject is the conversation-creation gate, not the
 * assistant-message insert, so message-table reads/writes here are trivial no-op successes.
 */

function chainable(result: { data: unknown; error: unknown; count?: number | null }) {
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

const {
  requireUserMock,
  getCurrentProfileMock,
  resolveLocaleMock,
  assertWithinAIRateLimitMock,
  getMonthlyQuotaMock,
  generateAdvisorReplyMock,
  logEventMock,
  createClientMock,
  conversationInsertMock,
  conversationCountMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
  resolveLocaleMock: vi.fn().mockResolvedValue("en"),
  assertWithinAIRateLimitMock: vi.fn().mockResolvedValue(undefined),
  getMonthlyQuotaMock: vi.fn().mockResolvedValue({ used: 0, limit: 50, remaining: 50, fraction: 0, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true }),
  generateAdvisorReplyMock: vi.fn().mockResolvedValue({ text: "reply", degraded: false }),
  logEventMock: vi.fn().mockResolvedValue(undefined),
  createClientMock: vi.fn(),
  conversationInsertMock: vi.fn(),
  // Simulates the `.select("id", { count: "exact", head: true }).eq("user_id", userId)`
  // count check — a separate mock from the insert spy since real code calls each at most
  // once per invocation and they must be independently assertable.
  conversationCountMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock, getCurrentProfile: getCurrentProfileMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: resolveLocaleMock }));
vi.mock("@/lib/ai/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/rate-limit")>("@/lib/ai/rate-limit");
  return { ...actual, assertWithinAIRateLimit: assertWithinAIRateLimitMock };
});
vi.mock("@/lib/ai/monthly-quota", () => ({ getMonthlyQuota: getMonthlyQuotaMock }));
vi.mock("@/lib/ai/advisor-chat", () => ({ generateAdvisorReply: generateAdvisorReplyMock }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: logEventMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { sendAdvisorMessage } from "@/app/(app)/advisor/actions";

function client() {
  return {
    rpc: rpcStub,
    from: (table: string) => {
      if (table === "advisor_conversations") {
        return {
          // The count check: .select("id", { count: "exact", head: true }).eq("user_id", userId)
          select: () => ({ eq: () => chainable(conversationCountMock()) }),
          insert: (row: Record<string, unknown>) => chainable(conversationInsertMock(row)),
          // The first-message title update (lib/advisor/conversation-title.ts) — this file's
          // own subject is the session wall, not titling (see __tests__/advisor/
          // conversation-title.test.ts and instructions-round-trip-shaped coverage for that),
          // so a trivial, always-succeeding stub is correct here.
          update: () => ({ eq: () => chainable({ data: null, error: null }) }),
        };
      }
      if (table === "advisor_messages") {
        return { select: () => chainable({ data: [], error: null }), insert: () => chainable({ data: { id: "msg-1" }, error: null }) };
      }
      return chainable({ data: null, error: null });
    },
  };
}

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  getCurrentProfileMock.mockReset();
  resolveLocaleMock.mockReset().mockResolvedValue("en");
  assertWithinAIRateLimitMock.mockReset().mockResolvedValue(undefined);
  getMonthlyQuotaMock.mockReset().mockResolvedValue({ used: 0, limit: 50, remaining: 50, fraction: 0, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true });
  generateAdvisorReplyMock.mockReset().mockResolvedValue({ text: "reply", degraded: false });
  logEventMock.mockReset().mockResolvedValue(undefined);
  conversationInsertMock.mockReset().mockReturnValue({ data: { id: "conv-new" }, error: null });
  conversationCountMock.mockReset().mockReturnValue({ count: 0, error: null, data: null });
  createClientMock.mockReset().mockResolvedValue(client());
});

describe("sendAdvisorMessage's lazy-create — now walled the same as createConversation", () => {
  test("Standard, zero existing conversations: lazy-create still succeeds — a first message must still work", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null, response_mode: "balanced" });

    const result = await sendAdvisorMessage(null, "Should I start another club?");

    expect(conversationCountMock).toHaveBeenCalledTimes(1);
    expect(conversationInsertMock).toHaveBeenCalledTimes(1);
    expect(result.conversationId).toBe("conv-new");
    expect(result.error).toBeUndefined();
  });

  test("THE FIX: Standard, one existing conversation, conversationId arrives null anyway — lazy-create is now blocked, no insert happens", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null, response_mode: "balanced" });
    conversationCountMock.mockReturnValue({ count: 1, error: null, data: null });

    const result = await sendAdvisorMessage(null, "A second thing to ask, from a stale client with no convId in state.");

    expect(conversationInsertMock).not.toHaveBeenCalled();
    expect(result.conversationId).toBe("");
    expect(result.error).toBeTruthy();
  });

  test("Ultra, conversationId: null, regardless of existing count — always succeeds, count never even queried", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra", ultra_gift_expires_at: null, response_mode: "balanced" });
    conversationCountMock.mockReturnValue({ count: 99, error: null, data: null });

    const result = await sendAdvisorMessage(null, "A third, fourth, whatever thing to ask.");

    expect(conversationCountMock).not.toHaveBeenCalled();
    expect(conversationInsertMock).toHaveBeenCalledTimes(1);
    expect(result.conversationId).toBe("conv-new");
  });

  test("a count-query failure fails CLOSED here too, not open — same posture as createConversation's own identical check", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null, response_mode: "balanced" });
    conversationCountMock.mockReturnValue({ count: null, error: { code: "57014", message: "canceling statement due to statement timeout" }, data: null });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await sendAdvisorMessage(null, "Anything.");

    expect(conversationInsertMock).not.toHaveBeenCalled();
    expect(result.error).toBeTruthy();
    errorSpy.mockRestore();
  });

  test("an existing conversationId (the ordinary case) never touches the count check at all — this wall is lazy-create-specific", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null, response_mode: "balanced" });
    conversationCountMock.mockReturnValue({ count: 1, error: null, data: null });
    const c = client();
    // Override advisor_conversations for the ownership-check + touch-updated_at paths a real
    // convId triggers, which this suite's default client() doesn't model (its own
    // advisor_conversations.select/eq only implements the count shape).
    const withOwnership = {
      ...c,
      from: (table: string) => (table === "advisor_conversations" ? { select: () => ({ eq: () => ({ eq: () => chainable({ data: { id: "conv-existing" }, error: null }) }) }), update: () => ({ eq: () => chainable({ data: null, error: null }) }) } : c.from(table)),
    };
    createClientMock.mockResolvedValue(withOwnership);

    await sendAdvisorMessage("conv-existing", "A normal follow-up message.");

    expect(conversationCountMock).not.toHaveBeenCalled();
    expect(conversationInsertMock).not.toHaveBeenCalled();
  });
});
