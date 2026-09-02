import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Coverage for the specific thing CEO's degrade-persistence package asked to be tested
 * explicitly, not just believed: sendAdvisorMessage's assistant-message insert and
 * retryAdvisorMessage's update both now write `degraded`, and migration 0088
 * (advisor_messages.degraded) is unapplied by house pattern. lib/supabase/errors.ts's
 * isUndefinedColumnError was itself found, live, to be checking the wrong error code for a
 * write (42703 vs PGRST204) earlier this same night — these tests use the corrected,
 * two-code version and assert the actual retry-and-succeed outcome, not just that the code
 * compiles with a try/retry shape around it (same standard
 * __tests__/opportunities/refresh-matches-confidence-degradation.test.ts holds itself to).
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

const MISSING_DEGRADED_ERROR = { code: "PGRST204", message: "Could not find the 'degraded' column of 'advisor_messages' in the schema cache" };
const UNRELATED_ERROR = { code: "23505", message: "duplicate key value violates unique constraint" };
const USER_ID = "11111111-1111-1111-1111-111111111111";
const CONVERSATION_ID = "22222222-2222-2222-2222-222222222222";
const FAILED_MESSAGE_ID = "33333333-3333-3333-3333-333333333333";

const {
  requireUserMock,
  resolveLocaleMock,
  assertWithinAIRateLimitMock,
  getMonthlyQuotaMock,
  generateAdvisorReplyMock,
  logEventMock,
  createClientMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  resolveLocaleMock: vi.fn().mockResolvedValue("en"),
  assertWithinAIRateLimitMock: vi.fn().mockResolvedValue(undefined),
  // Not exhausted by default — this suite is about the assistant-message insert/update
  // degrading, not about the quota gate, so every test just needs a normal, well-under-
  // limit quota to pass through both sendAdvisorMessage and retryAdvisorMessage unblocked.
  getMonthlyQuotaMock: vi.fn().mockResolvedValue({
    used: 0,
    limit: 50,
    remaining: 50,
    fraction: 0,
    resetsAt: "2026-10-01T00:00:00.000Z",
    usedIsKnown: true,
  }),
  generateAdvisorReplyMock: vi.fn(),
  logEventMock: vi.fn().mockResolvedValue(undefined),
  createClientMock: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: resolveLocaleMock }));
vi.mock("@/lib/ai/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/rate-limit")>("@/lib/ai/rate-limit");
  return { ...actual, assertWithinAIRateLimit: assertWithinAIRateLimitMock };
});
vi.mock("@/lib/ai/monthly-quota", () => ({ getMonthlyQuota: getMonthlyQuotaMock }));
vi.mock("@/lib/ai/advisor-chat", () => ({ generateAdvisorReply: generateAdvisorReplyMock }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: logEventMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));

import { sendAdvisorMessage, retryAdvisorMessage } from "@/app/(app)/advisor/actions";

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  resolveLocaleMock.mockReset().mockResolvedValue("en");
  assertWithinAIRateLimitMock.mockReset().mockResolvedValue(undefined);
  getMonthlyQuotaMock.mockReset().mockResolvedValue({
    used: 0,
    limit: 50,
    remaining: 50,
    fraction: 0,
    resetsAt: "2026-10-01T00:00:00.000Z",
    usedIsKnown: true,
  });
  generateAdvisorReplyMock.mockReset();
  logEventMock.mockReset().mockResolvedValue(undefined);
  createClientMock.mockReset();
});

describe("sendAdvisorMessage — the assistant-message insert degrades instead of failing outright", () => {
  function clientWithAssistantInsertSpy(assistantInsertSpy: (row: Record<string, unknown>) => unknown) {
    return {
      from: (table: string) => {
        if (table === "advisor_conversations") {
          // No conversationId passed in these tests, so only the "create a new one" insert
          // path runs — never the ownership-check or touch-updated_at paths.
          return chainable({ data: { id: CONVERSATION_ID }, error: null });
        }
        if (table === "advisor_messages") {
          // select(...) is the prior-messages history fetch — empty history is fine, this
          // suite is about the assistant-message insert, not the model's conversation
          // context. insert(...) routes the plain user-message insert (role: "user", not
          // under test) to a trivial success so only the real assistant-message insert
          // reaches — and is counted by — assistantInsertSpy.
          return {
            select: () => chainable({ data: [], error: null }),
            insert: (row: Record<string, unknown>) => (row.role === "user" ? chainable({ data: null, error: null }) : assistantInsertSpy(row)),
          };
        }
        return chainable({ data: null, error: null });
      },
    };
  }

  test("migration 0088 unapplied (insert rejects on degraded): retries without it, still saves the reply", async () => {
    generateAdvisorReplyMock.mockResolvedValue({ text: "Research is still the clearer gap.", degraded: true });
    const assistantInsertSpy = vi.fn((row: Record<string, unknown>) =>
      chainable("degraded" in row ? { data: null, error: MISSING_DEGRADED_ERROR } : { data: { id: "assistant-msg-1" }, error: null }),
    );
    createClientMock.mockResolvedValue(clientWithAssistantInsertSpy(assistantInsertSpy));

    const result = await sendAdvisorMessage(null, "Should I start another club?");

    expect(result.error).toBeUndefined();
    expect(result.assistantMessageId).toBe("assistant-msg-1");
    expect(result.content).toBe("Research is still the clearer gap.");
    // The disclosure the caller gets back is unaffected by whether persistence succeeded —
    // this is the existing live-session behavior, untouched by this change.
    expect(result.degraded).toBe(true);
    expect(assistantInsertSpy).toHaveBeenCalledTimes(2);
    // The first attempt genuinely included it — proving this is a real degrade, not a second
    // identical call that happened to succeed.
    expect(assistantInsertSpy.mock.calls[0]?.[0]).toHaveProperty("degraded", true);
    expect(assistantInsertSpy.mock.calls[1]?.[0]).not.toHaveProperty("degraded");
  });

  test("migration applied (insert succeeds first time): no retry, degraded persisted directly", async () => {
    generateAdvisorReplyMock.mockResolvedValue({ text: "Leadership is already strong.", degraded: false });
    const assistantInsertSpy = vi.fn().mockReturnValue(chainable({ data: { id: "assistant-msg-2" }, error: null }));
    createClientMock.mockResolvedValue(clientWithAssistantInsertSpy(assistantInsertSpy));

    const result = await sendAdvisorMessage(null, "What's the weakest part of my profile?");

    expect(result.error).toBeUndefined();
    expect(assistantInsertSpy).toHaveBeenCalledTimes(1);
    expect(assistantInsertSpy.mock.calls[0]?.[0]).toHaveProperty("degraded", false);
  });

  test("a genuinely different insert error is not swallowed as the missing-column case", async () => {
    generateAdvisorReplyMock.mockResolvedValue({ text: "reply", degraded: false });
    // The real attempt (status: "complete") hits the unrelated error and must not retry.
    // sendAdvisorMessage's own existing fallback then writes a second, differently-shaped
    // "failed" placeholder row (status: "failed") so a reload shows a retry-able bubble —
    // that second call is expected, real behavior, not part of what this test asserts on.
    const assistantInsertSpy = vi.fn((row: Record<string, unknown>) =>
      row.status === "complete" ? chainable({ data: null, error: UNRELATED_ERROR }) : chainable({ data: { id: "failed-msg-1" }, error: null }),
    );
    createClientMock.mockResolvedValue(clientWithAssistantInsertSpy(assistantInsertSpy));

    const result = await sendAdvisorMessage(null, "Is my university list realistic?");

    const realAttempts = assistantInsertSpy.mock.calls.filter(([row]) => (row as Record<string, unknown>).status === "complete");
    expect(realAttempts).toHaveLength(1);
    expect(result.error).toBeTruthy();
  });
});

describe("retryAdvisorMessage — the assistant-message update degrades instead of failing outright", () => {
  function clientWithRetrySpies(updateSpy: (row: Record<string, unknown>) => unknown) {
    return {
      from: (table: string) => {
        if (table === "advisor_conversations") return chainable({ data: null, error: null });
        if (table === "advisor_messages") {
          return {
            // retryAdvisorMessage's own lookups (the failed row itself, then the full
            // conversation for history) — both read-only, both satisfied by one fixed shape.
            select: (cols: string) =>
              cols.includes("conversation_id")
                ? chainable({ data: { id: FAILED_MESSAGE_ID, conversation_id: CONVERSATION_ID, role: "assistant", status: "failed" }, error: null })
                : chainable({
                    data: [
                      { id: "user-msg-1", role: "user", content: "Should I start another club?", status: "complete" },
                      { id: FAILED_MESSAGE_ID, role: "assistant", content: null, status: "failed" },
                    ],
                    error: null,
                  }),
            update: updateSpy,
          };
        }
        return chainable({ data: null, error: null });
      },
    };
  }

  test("migration 0088 unapplied (update rejects on degraded): retries without it, still saves the reply", async () => {
    generateAdvisorReplyMock.mockResolvedValue({ text: "Retried answer.", degraded: true });
    const updateSpy = vi.fn((row: Record<string, unknown>) =>
      chainable("degraded" in row ? { data: null, error: MISSING_DEGRADED_ERROR } : { data: null, error: null }),
    );
    createClientMock.mockResolvedValue(clientWithRetrySpies(updateSpy));

    const result = await retryAdvisorMessage(FAILED_MESSAGE_ID);

    expect(result.error).toBeUndefined();
    expect(result.content).toBe("Retried answer.");
    expect(result.degraded).toBe(true);
    expect(updateSpy).toHaveBeenCalledTimes(2);
    expect(updateSpy.mock.calls[0]?.[0]).toHaveProperty("degraded", true);
    expect(updateSpy.mock.calls[1]?.[0]).not.toHaveProperty("degraded");
  });

  test("migration applied (update succeeds first time): no retry", async () => {
    generateAdvisorReplyMock.mockResolvedValue({ text: "Retried answer.", degraded: false });
    const updateSpy = vi.fn().mockReturnValue(chainable({ data: null, error: null }));
    createClientMock.mockResolvedValue(clientWithRetrySpies(updateSpy));

    const result = await retryAdvisorMessage(FAILED_MESSAGE_ID);

    expect(result.error).toBeUndefined();
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]?.[0]).toHaveProperty("degraded", false);
  });
});
