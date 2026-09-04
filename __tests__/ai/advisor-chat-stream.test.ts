import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockAIProvider } from "../stubs/mock-ai-provider";

/**
 * generateAdvisorReplyStream's own behavior, on top of generateAdvisorReply's already-
 * covered shared logic (__tests__/ai/advisor-chat-usage.test.ts — token budget, usage
 * recording, the degraded decision reaching the row). That file's coverage still applies
 * here unchanged: both functions now share resolveAdvisorRequest, so a regression in model
 * selection, the thorough gate, or maxTokens would already fail there regardless of which
 * entry point is used. What's new, and only tested here, is the streaming-specific
 * contract: the provider's generateTextStream is actually called (not generateText), and
 * onDelta is actually invoked with real content before the final result resolves.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertMock, providerRef, monthToDateRowsRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  providerRef: { current: null as MockAIProvider | null },
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
}));

vi.mock("@/lib/supabase/admin", () => {
  const adminClient = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => insertMock({ table, row }),
      select: () => ({
        eq: () => ({
          gte: async () => ({ data: table === "quota_grants" ? [] : monthToDateRowsRef.current, error: null }),
        }),
      }),
    }),
  };
  return {
    createAdminClient: () => adminClient,
    tryCreateAdminClient: () => adminClient,
  };
});

vi.mock("@/lib/ai/index", () => ({ getAIProvider: () => providerRef.current }));

vi.mock("@/lib/ai/student-context", () => ({
  buildStudentAdvisorContext: async () => ({ student: { firstName: "Ada" } }),
  formatContextForPrompt: () => "Career Profile 77. Leadership 91. Research 42.",
}));

import { generateAdvisorReplyStream } from "@/lib/ai/advisor-chat";

const USER_ID = "11111111-1111-4111-8111-111111111111";

beforeEach(() => {
  insertMock.mockClear();
  providerRef.current = new MockAIProvider();
  monthToDateRowsRef.current = [];
});

describe("generateAdvisorReplyStream — calls the streaming provider method, not the non-streaming one", () => {
  test("goes through generateTextStream, leaving generateText untouched", async () => {
    providerRef.current!.queueText("Finish the economics dataset first.");

    await generateAdvisorReplyStream({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" }, () => {});

    expect(providerRef.current!.textStreamCalls).toHaveLength(1);
    expect(providerRef.current!.textCalls).toHaveLength(0);
  });
});

describe("generateAdvisorReplyStream — onDelta actually fires", () => {
  test("is called with the queued text before the promise resolves", async () => {
    providerRef.current!.queueText("Research is the clearer gap.");
    const deltas: string[] = [];

    const reply = await generateAdvisorReplyStream(
      { userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" },
      (delta) => deltas.push(delta),
    );

    expect(deltas).toEqual(["Research is the clearer gap."]);
    expect(reply.text).toBe("Research is the clearer gap.");
  });

  test("a caller that never reads onDelta still gets the correct final text and degraded flag", async () => {
    providerRef.current!.queueText("Shorter answer, still real.");

    const reply = await generateAdvisorReplyStream({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" }, () => {});

    expect(reply).toEqual({ text: "Shorter answer, still real.", degraded: false });
  });
});

describe("generateAdvisorReplyStream — shares resolveAdvisorRequest with generateAdvisorReply, not a second copy", () => {
  test("the thorough instruction still only applies for Ultra + thorough mode, through the streaming path", async () => {
    providerRef.current!.queueText("A longer, more detailed answer.");

    await generateAdvisorReplyStream({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "thorough", planTier: "ultra" }, () => {});

    expect(providerRef.current!.textStreamCalls[0]?.system).toContain("give a more thorough answer than usual");
  });

  test("thorough mode is silently ignored for a standard-tier caller, through the streaming path too — the real backstop, not just a UI clamp", async () => {
    providerRef.current!.queueText("A normal answer.");

    await generateAdvisorReplyStream({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "thorough", planTier: "standard" }, () => {});

    expect(providerRef.current!.textStreamCalls[0]?.system).not.toContain("give a more thorough answer than usual");
  });
});
