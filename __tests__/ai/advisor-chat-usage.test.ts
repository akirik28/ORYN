import { beforeEach, describe, expect, test, vi } from "vitest";
import { AIResponseIncompleteError } from "@/lib/ai/provider";
import { MockAIProvider } from "../stubs/mock-ai-provider";

/**
 * Cost-observability regression tests (SEV-1, 2026-08-23).
 *
 * A failed advisor turn threw out of the provider *before* logAIUsage ran, so the most
 * expensive failure mode — thinking tokens fully consumed, no answer produced — never
 * reached `ai_usage` at all. The founder enforces $5 soft / $10 hard spend gates against
 * that table, so those calls were spending real money off the books.
 *
 * These tests exercise the real logAIUsage path and only stub the Supabase admin client,
 * so they assert on actual `ai_usage` inserts rather than on a mocked logger.
 */

interface RecordedInsert {
  table: string;
  row: Record<string, unknown>;
}

const { insertMock, providerRef, monthToDateRowsRef } = vi.hoisted(() => ({
  insertMock: vi.fn<(call: RecordedInsert) => Promise<{ error: null }>>(async () => ({ error: null })),
  providerRef: { current: null as MockAIProvider | null },
  // Backs lib/ai/limits/budget.ts's month-to-date read. Empty by default so every test here
  // stays under the target and gets the ceiling model, same as before selectModelForUser
  // existed — these tests are about *whether a call gets logged*, not about the budget
  // decision itself (see __tests__/ai/limits/budget.test.ts for that).
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
}));

// createAdminClient and tryCreateAdminClient are the same underlying client in production
// (lib/supabase/admin.ts — tryCreateAdminClient just catches createAdminClient's throw), so
// both are mocked here to the same stub. Without mocking tryCreateAdminClient too, it comes
// back `undefined` from this factory (vi.mock replaces every export of the module, not just
// the ones listed) and selectModelForUser's call to it throws immediately.
vi.mock("@/lib/supabase/admin", () => {
  const adminClient = {
    from: (table: string) => ({
      insert: (row: Record<string, unknown>) => insertMock({ table, row }),
      select: () => ({
        eq: () => ({
          gte: async () => ({ data: monthToDateRowsRef.current, error: null }),
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

import { generateAdvisorReply } from "@/lib/ai/advisor-chat";

const USER_ID = "11111111-1111-4111-8111-111111111111";

/** Only the ai_usage inserts — the advisor writes nothing else through the admin client. */
function usageInserts(): RecordedInsert[] {
  return insertMock.mock.calls.map((call) => call[0]).filter((arg) => arg.table === "ai_usage");
}

beforeEach(() => {
  insertMock.mockClear();
  providerRef.current = new MockAIProvider();
  monthToDateRowsRef.current = [];
});

describe("generateAdvisorReply — token budget", () => {
  test("asks for a budget with real headroom above the measured thinking ceiling", async () => {
    providerRef.current!.queueText("Research is the clearer gap.");

    await generateAdvisorReply({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" });

    const requested = providerRef.current!.textCalls[0]?.maxTokens ?? 0;
    // The benchmark measured 1599-1736 thinking tokens on a rich profile, and 1024 (the
    // shipped value) produced no text block whatsoever. 4096 was the smallest value that
    // completed; anything at or below the observed thinking usage cannot work at all.
    expect(requested).toBeGreaterThanOrEqual(4096);
  });
});

describe("generateAdvisorReply — usage recording", () => {
  test("(c) a successful call is recorded in ai_usage exactly once", async () => {
    providerRef.current!.queueText("Finish the economics dataset first.");

    const reply = await generateAdvisorReply({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" });

    expect(reply.text).toBe("Finish the economics dataset first.");
    expect(reply.degraded).toBe(false);
    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({
      user_id: USER_ID,
      feature: "advisor_chat",
      input_tokens: 10,
      output_tokens: 10,
    });
  });

  test("(b) a consumed-but-failed call is still recorded, with the tokens it actually burned", async () => {
    providerRef.current!.queueText(
      new AIResponseIncompleteError({ stopReason: "max_tokens", usage: { inputTokens: 1800, outputTokens: 1024 }, model: "claude-sonnet-5" }),
    );

    await expect(
      generateAdvisorReply({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" }),
    ).rejects.toBeInstanceOf(AIResponseIncompleteError);

    // The whole point: this spend used to be invisible to the $5/$10 gates.
    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({
      user_id: USER_ID,
      feature: "advisor_chat",
      input_tokens: 1800,
      output_tokens: 1024,
    });
  });

  test("a transport-style failure with no usage attached records nothing (there is nothing to record)", async () => {
    providerRef.current!.queueText(new Error("ECONNRESET: socket hang up"));

    await expect(
      generateAdvisorReply({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" }),
    ).rejects.toThrow(/ECONNRESET/);

    expect(usageInserts()).toHaveLength(0);
  });
});

describe("generateAdvisorReply — the degraded decision actually reaches the row, not just the caller", () => {
  // Gap this closes (2026-09-02): logAIUsage computed selection.degraded/reason correctly
  // the whole time and handed them to every caller — reply.degraded above has been correct
  // throughout — but never included them in the ai_usage insert itself, so the column
  // silently carried its `not null default false` regardless of the real decision. No test
  // anywhere asserted the row's own degraded/degrade_reason fields, only the two things
  // this file already checked above: token counts, and the value handed back to the
  // caller. This describe block is that missing assertion, added once the write path was
  // fixed rather than only inferred to be fixed from the code reading correctly.

  test("under target: the row says degraded false, not merely omits the field", async () => {
    monthToDateRowsRef.current = [{ estimated_cost: 0.1 }];
    providerRef.current!.queueText("Leadership is already strong.");

    await generateAdvisorReply({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" });

    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ degraded: false, degrade_reason: null });
  });

  test("at or over target: the row says degraded true with the real reason, not the column default", async () => {
    // Same shape lib/ai/limits/budget.ts's own hasUnknownCostRows guard reads — several
    // known-cost rows summing past MONTHLY_BUDGET_TARGET_USD ($0.50).
    monthToDateRowsRef.current = [{ estimated_cost: 0.3 }, { estimated_cost: 0.25 }];
    providerRef.current!.queueText("Shorter answer, still real.");

    const reply = await generateAdvisorReply({ userId: USER_ID, history: [], newMessage: "What next?", responseMode: "balanced", planTier: "standard" });

    expect(reply.degraded).toBe(true);
    const recorded = usageInserts();
    expect(recorded).toHaveLength(1);
    expect(recorded[0]?.row).toMatchObject({ degraded: true, degrade_reason: "at_or_over_target" });
  });
});
