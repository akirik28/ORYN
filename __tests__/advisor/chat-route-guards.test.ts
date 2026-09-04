import { beforeEach, describe, expect, test, vi } from "vitest";

/**
 * Proves app/api/advisor/chat/route.ts's own copy of sendAdvisorMessage's 11-guard sequence
 * actually fires — not "the Server Action has tests," which proves nothing about a
 * hand-mirrored Route Handler's own code. Every guard below is tested both for the case
 * that should pass through and the case that should block, and where a guard's absence
 * would be easy to introduce silently during a refactor, the test is proven red-capable
 * (see the accompanying report, not committed here) rather than only shown green once.
 *
 * Mock setup follows __tests__/advisor/session-wall-lazy-create.test.ts's own established
 * pattern (chainable() Supabase builder, vi.hoisted mocks, one vi.mock per dependency) —
 * same shape, extended for what this Route Handler additionally does: the generation lock,
 * the streaming provider call, and reading a real Response/ReadableStream back out.
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

const USER_ID = "11111111-1111-1111-1111-111111111111";

const {
  requireUserMock,
  getCurrentProfileMock,
  resolveLocaleMock,
  assertWithinAIRateLimitMock,
  getMonthlyQuotaMock,
  generateAdvisorReplyStreamMock,
  logEventMock,
  createClientMock,
  conversationInsertMock,
  conversationCountMock,
  acquireLockMock,
  releaseLockMock,
  messageInsertMock,
} = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  getCurrentProfileMock: vi.fn(),
  resolveLocaleMock: vi.fn().mockResolvedValue("en"),
  assertWithinAIRateLimitMock: vi.fn().mockResolvedValue(undefined),
  getMonthlyQuotaMock: vi.fn().mockResolvedValue({ used: 0, limit: 50, remaining: 50, fraction: 0, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true }),
  generateAdvisorReplyStreamMock: vi.fn(),
  logEventMock: vi.fn().mockResolvedValue(undefined),
  createClientMock: vi.fn(),
  conversationInsertMock: vi.fn(),
  conversationCountMock: vi.fn(),
  acquireLockMock: vi.fn(),
  releaseLockMock: vi.fn().mockResolvedValue(undefined),
  messageInsertMock: vi.fn(),
}));

vi.mock("@/lib/security/dal", () => ({ requireUser: requireUserMock, getCurrentProfile: getCurrentProfileMock }));
vi.mock("@/lib/i18n/locale", () => ({ resolveLocale: resolveLocaleMock }));
vi.mock("@/lib/ai/rate-limit", async () => {
  const actual = await vi.importActual<typeof import("@/lib/ai/rate-limit")>("@/lib/ai/rate-limit");
  return { ...actual, assertWithinAIRateLimit: assertWithinAIRateLimitMock };
});
vi.mock("@/lib/ai/monthly-quota", () => ({ getMonthlyQuota: getMonthlyQuotaMock }));
vi.mock("@/lib/ai/advisor-chat", () => ({ generateAdvisorReplyStream: generateAdvisorReplyStreamMock }));
vi.mock("@/lib/analytics/log", () => ({ logEvent: logEventMock }));
vi.mock("@/lib/supabase/server", () => ({ createClient: createClientMock }));
vi.mock("@/lib/advisor/generation-lock", () => ({ acquireAdvisorGenerationLock: acquireLockMock, releaseAdvisorGenerationLock: releaseLockMock }));
vi.mock("@/lib/advisor/conversation-title", () => ({ deriveConversationTitle: (msg: string) => `Title: ${msg.slice(0, 10)}` }));

import { POST } from "@/app/api/advisor/chat/route";

function client() {
  return {
    from: (table: string) => {
      if (table === "advisor_conversations") {
        return {
          select: () => ({ eq: () => chainable(conversationCountMock()) }),
          insert: (row: Record<string, unknown>) => chainable(conversationInsertMock(row)),
          update: () => ({ eq: () => chainable({ data: null, error: null }) }),
        };
      }
      if (table === "advisor_messages") {
        return {
          select: () => chainable({ data: [], error: null }),
          insert: (row: Record<string, unknown>) => chainable(messageInsertMock(row)),
        };
      }
      return chainable({ data: null, error: null });
    },
  };
}

function req(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/advisor/chat", { method: "POST", body: JSON.stringify(body) });
}

/** Drains the Route Handler's SSE-shaped ReadableStream into its parsed events, in order. */
async function readEvents(response: Response): Promise<Array<Record<string, unknown>>> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const events: Array<Record<string, unknown>> = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx: number;
    while ((idx = buffer.indexOf("\n\n")) !== -1) {
      const frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (frame.startsWith("data: ")) events.push(JSON.parse(frame.slice(6)));
    }
  }
  return events;
}

beforeEach(() => {
  requireUserMock.mockReset().mockResolvedValue({ isAuth: true, userId: USER_ID, email: "student@example.com" });
  getCurrentProfileMock.mockReset().mockResolvedValue({ plan_tier: "standard", ultra_gift_expires_at: null, response_mode: "balanced" });
  resolveLocaleMock.mockReset().mockResolvedValue("en");
  assertWithinAIRateLimitMock.mockReset().mockResolvedValue(undefined);
  getMonthlyQuotaMock.mockReset().mockResolvedValue({ used: 0, limit: 50, remaining: 50, fraction: 0, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true });
  generateAdvisorReplyStreamMock.mockReset().mockImplementation(async (_params: unknown, onDelta: (d: string) => void) => {
    onDelta("Research is the clearer gap.");
    return { text: "Research is the clearer gap.", degraded: false };
  });
  logEventMock.mockReset().mockResolvedValue(undefined);
  conversationInsertMock.mockReset().mockReturnValue({ data: { id: "conv-new" }, error: null });
  conversationCountMock.mockReset().mockReturnValue({ count: 0, error: null, data: null });
  acquireLockMock.mockReset().mockResolvedValue("2026-09-04T12:00:00.000Z");
  releaseLockMock.mockReset().mockResolvedValue(undefined);
  messageInsertMock.mockReset().mockReturnValue({ data: { id: "assistant-msg-1" }, error: null });
  createClientMock.mockReset().mockResolvedValue(client());
});

describe("guard: empty/oversized message never reaches the model", () => {
  test("empty message — 400, generation never called", async () => {
    const res = await POST(req({ conversationId: null, content: "   " }));
    expect(res.status).toBe(400);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });

  test("over MAX_MESSAGE_LENGTH — 400, generation never called", async () => {
    const res = await POST(req({ conversationId: null, content: "a".repeat(4001) }));
    expect(res.status).toBe(400);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });
});

describe("guard: burst rate limit", () => {
  test("a rejected rate-limit check blocks before generation, 429", async () => {
    const { RateLimitExceededError } = await import("@/lib/ai/rate-limit");
    assertWithinAIRateLimitMock.mockRejectedValueOnce(new RateLimitExceededError("en"));

    const res = await POST(req({ conversationId: null, content: "What next?" }));

    expect(res.status).toBe(429);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });
});

describe("guard: monthly quota", () => {
  test("known-exhausted quota blocks before generation, 403", async () => {
    getMonthlyQuotaMock.mockResolvedValue({ used: 50, limit: 50, remaining: 0, fraction: 1, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: true });

    const res = await POST(req({ conversationId: null, content: "What next?" }));

    expect(res.status).toBe(403);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });

  test("unreadable quota (usedIsKnown false) fails open, not closed — matches sendAdvisorMessage's own posture", async () => {
    getMonthlyQuotaMock.mockResolvedValue({ used: 0, limit: 50, remaining: 0, fraction: 0, resetsAt: "2026-10-01T00:00:00.000Z", usedIsKnown: false });

    const res = await POST(req({ conversationId: null, content: "What next?" }));

    expect(res.status).toBe(200);
  });
});

describe("guard: conversation ownership re-verification", () => {
  test("a conversationId that isn't this user's own — 404, generation never called", async () => {
    createClientMock.mockResolvedValue({
      from: (table: string) => (table === "advisor_conversations" ? { select: () => ({ eq: () => ({ eq: () => chainable({ data: null, error: null }) }) }) } : client().from(table)),
    });

    const res = await POST(req({ conversationId: "22222222-2222-2222-2222-222222222222", content: "What next?" }));

    expect(res.status).toBe(404);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });

  test("a not-UUID-shaped conversationId — 400 before any DB call", async () => {
    const res = await POST(req({ conversationId: "not-a-uuid", content: "What next?" }));
    expect(res.status).toBe(400);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });
});

describe("guard: the session wall (lazy-create)", () => {
  test("Standard, already has one conversation, conversationId arrives null — blocked, 403, no insert", async () => {
    conversationCountMock.mockReturnValue({ count: 1, error: null, data: null });

    const res = await POST(req({ conversationId: null, content: "A second thing to ask." }));

    expect(res.status).toBe(403);
    expect(conversationInsertMock).not.toHaveBeenCalled();
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });

  test("Ultra, conversationId null, any existing count — never blocked, count never even queried", async () => {
    getCurrentProfileMock.mockResolvedValue({ plan_tier: "ultra", ultra_gift_expires_at: null, response_mode: "balanced" });
    conversationCountMock.mockReturnValue({ count: 99, error: null, data: null });

    const res = await POST(req({ conversationId: null, content: "Another thing." }));

    expect(res.status).toBe(200);
    expect(conversationCountMock).not.toHaveBeenCalled();
  });
});

describe("guard: the generation lock", () => {
  test("a rejected lock acquire (already generating) blocks before the model call, 409", async () => {
    acquireLockMock.mockResolvedValue(null);

    const res = await POST(req({ conversationId: null, content: "What next?" }));

    expect(res.status).toBe(409);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });

  test("the lock is released after a successful stream completes", async () => {
    const res = await POST(req({ conversationId: null, content: "What next?" }));
    await readEvents(res);
    expect(releaseLockMock).toHaveBeenCalledTimes(1);
  });

  test("the lock is released even when generation throws mid-stream", async () => {
    generateAdvisorReplyStreamMock.mockRejectedValue(new Error("ECONNRESET"));

    const res = await POST(req({ conversationId: null, content: "What next?" }));
    await readEvents(res);

    expect(releaseLockMock).toHaveBeenCalledTimes(1);
  });
});

describe("guard: the P0 failed-row write on a generation error", () => {
  test("a thrown generation error still gets a persisted failed row and an error event, not a silent gap", async () => {
    generateAdvisorReplyStreamMock.mockRejectedValue(new Error("ECONNRESET: socket hang up"));

    const res = await POST(req({ conversationId: null, content: "What next?" }));
    const events = await readEvents(res);

    const failedRowInsert = messageInsertMock.mock.calls.find((call) => call[0]?.status === "failed");
    expect(failedRowInsert).toBeTruthy();
    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});

describe("guard: the assistant-message insert succeeds and reaches the client as a done event", () => {
  test("a normal successful call streams the delta then a done event carrying the real assistantMessageId", async () => {
    const res = await POST(req({ conversationId: null, content: "What next?" }));
    const events = await readEvents(res);

    expect(events).toEqual([
      { type: "delta", text: "Research is the clearer gap." },
      { type: "done", conversationId: "conv-new", conversationTitle: "Title: What next?", assistantMessageId: "assistant-msg-1", degraded: false },
    ]);
  });
});

describe("guard: history fetch is bounded, not the whole conversation unfiltered", () => {
  test("prior messages are queried with a limit — a fetch with no bound at all would send an unbounded history to the model", async () => {
    let capturedLimit: number | undefined;
    createClientMock.mockResolvedValue({
      from: (table: string) => {
        if (table === "advisor_conversations") return client().from(table);
        if (table === "advisor_messages") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () => ({
                    limit: (n: number) => {
                      capturedLimit = n;
                      return chainable({ data: [], error: null });
                    },
                  }),
                }),
              }),
            }),
            insert: (row: Record<string, unknown>) => chainable(messageInsertMock(row)),
          };
        }
        return chainable({ data: null, error: null });
      },
    });

    await POST(req({ conversationId: null, content: "What next?" }));

    expect(capturedLimit).toBe(40); // MAX_HISTORY_TURNS
  });
});

describe("guard: the user's own message insert", () => {
  test("a failed user-message insert stops before generation and reports the failure — nothing silently continues", async () => {
    createClientMock.mockResolvedValue({
      from: (table: string) => {
        if (table === "advisor_conversations") return client().from(table);
        if (table === "advisor_messages") {
          return {
            select: () => chainable({ data: [], error: null }),
            insert: () => chainable({ data: null, error: { code: "23505", message: "duplicate key" } }),
          };
        }
        return chainable({ data: null, error: null });
      },
    });

    const res = await POST(req({ conversationId: null, content: "What next?" }));

    expect(res.status).toBe(500);
    expect(generateAdvisorReplyStreamMock).not.toHaveBeenCalled();
  });
});

describe("guard: the assistant-message insert's own degrade-column fallback", () => {
  test("migration 0088 unapplied (isUndefinedColumnError on 'degraded') retries without that column instead of failing the whole reply", async () => {
    // Keyed off row.role, same reasoning as the "insert failing entirely" test's own fix
    // below -- a raw call counter would count the user-message insert as attempt #1, so the
    // condition below would never actually match the assistant-message insert this test
    // means to target. Caught exactly this way on the first run: the test asserted
    // callCount === 2 and passed even with the source's real retry branch disabled, because
    // it was silently checking the wrong insert the whole time.
    let assistantInsertAttempts = 0;
    createClientMock.mockResolvedValue({
      from: (table: string) => {
        if (table === "advisor_conversations") return client().from(table);
        if (table === "advisor_messages") {
          return {
            select: () => chainable({ data: [], error: null }),
            insert: (row: Record<string, unknown>) => {
              if (row.role === "user") return chainable({ data: null, error: null });
              assistantInsertAttempts += 1;
              if (assistantInsertAttempts === 1) {
                // Simulate the real undefined-column shape isUndefinedColumnError checks for.
                return chainable({ data: null, error: { code: "PGRST204", message: "Could not find the 'degraded' column of 'advisor_messages' in the schema cache" } });
              }
              return chainable(messageInsertMock(row));
            },
          };
        }
        return chainable({ data: null, error: null });
      },
    });

    const res = await POST(req({ conversationId: null, content: "What next?" }));
    const events = await readEvents(res);

    expect(events.some((e) => e.type === "done")).toBe(true);
    expect(assistantInsertAttempts).toBe(2); // first attempt (with degraded) failed, retried without it
  });
});

describe("guard: the assistant-message insert failing entirely (not just the degrade column)", () => {
  test("reply generated fine but the save fails — still writes a retryable failed row, still emits an error event, never a silent success", async () => {
    // Keyed off row.role, not a raw call counter -- the route's very first
    // .from("advisor_messages").insert(...) is the USER's own message (step 6, before
    // generation even starts), a completely different insert from the assistant-message one
    // this test targets (step 9). A sequential counter caught THAT insert instead on the
    // first run of this test: the user-message insert failed, the route returned its own
    // early 500 before ever reaching the code this test means to exercise, and the
    // assertions failed for a reason that had nothing to do with the assistant-message path.
    // Tracking role is what makes "the second, assistant-role insert" unambiguous regardless
    // of how many other inserts happen around it.
    let assistantInsertAttempts = 0;
    createClientMock.mockResolvedValue({
      from: (table: string) => {
        if (table === "advisor_conversations") return client().from(table);
        if (table === "advisor_messages") {
          return {
            select: () => chainable({ data: [], error: null }),
            insert: (row: Record<string, unknown>) => {
              if (row.role === "user") return chainable({ data: null, error: null }); // the user's own message saves fine
              // Now only assistant-role inserts reach here: the first is the real reply
              // attempt (fails outright, not an undefined-column shape); the second is the
              // P0 failed-row write itself, which must succeed so the student sees a
              // retryable bubble.
              assistantInsertAttempts += 1;
              if (assistantInsertAttempts === 1) return chainable({ data: null, error: { code: "23505", message: "constraint violation" } });
              return chainable(messageInsertMock(row));
            },
          };
        }
        return chainable({ data: null, error: null });
      },
    });

    const res = await POST(req({ conversationId: null, content: "What next?" }));
    const events = await readEvents(res);

    const failedRowInsert = messageInsertMock.mock.calls.find((call) => call[0]?.status === "failed");
    expect(failedRowInsert).toBeTruthy();
    expect(events.some((e) => e.type === "error")).toBe(true);
  });
});

describe("guard: client disconnect still releases the lock", () => {
  test("cancelling the stream's reader triggers the Route Handler's own cancel() and releases the lock", async () => {
    // A slow-resolving generation call so there's a real window to cancel inside.
    let resolveGeneration!: () => void;
    generateAdvisorReplyStreamMock.mockReturnValue(new Promise((resolve) => { resolveGeneration = () => resolve({ text: "x", degraded: false }); }));

    const res = await POST(req({ conversationId: null, content: "What next?" }));
    const reader = res.body!.getReader();
    await reader.cancel();

    expect(releaseLockMock).toHaveBeenCalledTimes(1);
    resolveGeneration();
  });
});
