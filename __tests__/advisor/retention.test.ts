import { beforeEach, describe, expect, test, vi } from "vitest";
import { MockAIProvider } from "../stubs/mock-ai-provider";

/**
 * The 24-hour retention job (lib/advisor/retention.ts, docs/ozellesme-spec-2026-09-03.md
 * §3). Every fixture here is synthetic — no real student conversation content anywhere in
 * this file, matching the standing discipline against using real data even in tests for a
 * feature this sensitive.
 *
 * The single guarantee this suite most needs to prove, matching
 * __tests__/opportunities/reverification/run-job-dry-run.test.ts's own flagship test: a dry
 * run makes a real (mocked) AI call and computes a real report, but writes nothing at all —
 * not the summary, not a deletion, not an audit row. A second test proves the identical
 * mocked pipeline DOES write when dryRun is false, so the first test can't pass by construction.
 */

interface Conversation {
  id: string;
  user_id: string;
  updated_at: string;
  summary: string | null;
  summarized_at: string | null;
}
interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
}
interface Profile {
  id: string;
  plan_tier: "standard" | "ultra";
  ultra_gift_expires_at: string | null;
}

const {
  conversationsRef,
  messagesRef,
  profilesRef,
  updateMock,
  deleteMock,
  insertAuditMock,
  monthToDateRowsRef,
  providerRef,
} = vi.hoisted(() => ({
  conversationsRef: { current: [] as Conversation[] },
  messagesRef: { current: [] as Message[] },
  profilesRef: { current: [] as Profile[] },
  updateMock: vi.fn(),
  deleteMock: vi.fn(),
  insertAuditMock: vi.fn<(row: Record<string, unknown>) => Promise<{ error: null }>>(async () => ({ error: null })),
  monthToDateRowsRef: { current: [] as Array<{ estimated_cost: number | null }> },
  providerRef: { current: null as MockAIProvider | null },
}));

function chainable(result: unknown) {
  const chain: Record<string, unknown> = {
    eq: () => chain,
    in: () => chain,
    lt: () => chain,
    gte: () => chain,
    order: () => chain,
    limit: async () => result,
    single: async () => result,
    maybeSingle: async () => result,
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  return chain;
}

function mockAdminClient() {
  return {
    from: (table: string) => {
      if (table === "advisor_conversations") {
        return {
          // Real filtering here (not the generic no-op chainable()) specifically so a test
          // can prove the due-set query filters on updated_at, not on any message's own age
          // — the one non-negotiable requirement of this whole feature.
          select: () => {
            let rows = conversationsRef.current;
            const withFilters: Record<string, unknown> = {
              in: (_col: string, ids: string[]) => {
                rows = rows.filter((c) => ids.includes(c.id));
                return withFilters;
              },
              lt: (col: string, value: string) => {
                rows = rows.filter((c) => (c as unknown as Record<string, string>)[col] < value);
                return withFilters;
              },
              limit: async () => ({ data: rows, error: null }),
            };
            return withFilters;
          },
          update: (payload: Record<string, unknown>) => {
            updateMock(payload);
            return { eq: async (_col: string, id: string) => ({ error: (() => { updateMock.mock.calls.at(-1)![1] = id; return null; })() }) };
          },
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            eq: (_col: string, id: string) => chainable({ data: profilesRef.current.find((p) => p.id === id) ?? null, error: null }),
          }),
        };
      }
      if (table === "advisor_messages") {
        return {
          select: () => ({
            eq: (_col: string, conversationId: string) =>
              chainable({ data: messagesRef.current.filter((m) => m.conversation_id === conversationId), error: null }),
          }),
          delete: () => ({
            eq: async (_col: string, conversationId: string) => {
              deleteMock(conversationId);
              messagesRef.current = messagesRef.current.filter((m) => m.conversation_id !== conversationId);
              return { error: null };
            },
          }),
        };
      }
      if (table === "advisor_conversation_retention_runs") {
        return { insert: (row: Record<string, unknown>) => insertAuditMock(row) };
      }
      if (table === "ai_usage") {
        return { select: () => ({ eq: () => ({ gte: async () => ({ data: monthToDateRowsRef.current, error: null }) }) }) };
      }
      if (table === "job_budget_overrides") {
        return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
      }
      if (table === "ai_model_pricing") {
        // No live rate overrides configured — resolveModelCostUsd falls back to the
        // hardcoded PRICE_PER_MILLION_TOKENS_USD table, same as production with no admin
        // overrides entered yet.
        return { select: async () => ({ data: [], error: null }) };
      }
      throw new Error(`mockAdminClient: unhandled table "${table}"`);
    },
  };
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient(),
  tryCreateAdminClient: () => mockAdminClient(),
}));
vi.mock("@/lib/ai/index", () => ({ getAIProvider: () => providerRef.current }));

const STANDARD_PROFILE: Profile = { id: "u-standard", plan_tier: "standard", ultra_gift_expires_at: null };
const ULTRA_PROFILE: Profile = { id: "u-ultra", plan_tier: "ultra", ultra_gift_expires_at: null };

function freshConversation(overrides: Partial<Conversation> = {}): Conversation {
  return {
    id: "c-1",
    user_id: "u-standard",
    updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
    summary: null,
    summarized_at: null,
    ...overrides,
  };
}

function fixtureMessages(conversationId: string): Message[] {
  return [
    { id: "m-1", conversation_id: conversationId, role: "user", content: "I'm interested in economics research ideas." },
    { id: "m-2", conversation_id: conversationId, role: "assistant", content: "Here are three project ideas grounded in OECD youth-unemployment data." },
  ];
}

beforeEach(() => {
  conversationsRef.current = [];
  messagesRef.current = [];
  profilesRef.current = [STANDARD_PROFILE, ULTRA_PROFILE];
  monthToDateRowsRef.current = [];
  updateMock.mockClear();
  deleteMock.mockClear();
  insertAuditMock.mockClear();
  providerRef.current = new MockAIProvider();
  delete process.env.ADVISOR_RETENTION_ALLOW_DELETE;
});

describe("runRetentionPass with dryRun: true (the default)", () => {
  test("makes a real AI call and reports what it would do, but writes nothing at all", async () => {
    const convo = freshConversation();
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);
    providerRef.current!.queueStructured({ summary: "Discussed economics research ideas grounded in OECD data." });

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: true, candidateIds: [convo.id] });

    expect(providerRef.current!.structuredCalls).toHaveLength(1); // the real call happened
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(insertAuditMock).not.toHaveBeenCalled();

    expect(result.attempted).toBe(1);
    expect(result.summarized).toBe(1);
    // "outcome" describes what actually happened -- nothing destructive on a dry run, so it
    // stays "summarized" (a real write would have made it "summarized_and_deleted"). The
    // counterfactual lives in the wouldX booleans, checked next.
    expect(result.rows?.[0].outcome).toBe("summarized");
    expect(result.rows?.[0].wouldWriteSummary).toBe(true);
    expect(result.rows?.[0].wouldDeleteMessages).toBe(true);
  });

  test("a non-dry-run call with the identical mocked pipeline DOES write — confirms the mock is capable of catching a write, not silent by construction", async () => {
    process.env.ADVISOR_RETENTION_ALLOW_DELETE = "true";
    const convo = freshConversation();
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);
    providerRef.current!.queueStructured({ summary: "Discussed economics research ideas grounded in OECD data." });

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    await runRetentionPass({ dryRun: false, candidateIds: [convo.id] });

    expect(updateMock).toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledWith(convo.id);
    expect(insertAuditMock).toHaveBeenCalled();
  });
});

describe("the two independent gates", () => {
  test("dryRun: false with ADVISOR_RETENTION_ALLOW_DELETE unset writes the summary but does NOT delete messages", async () => {
    const convo = freshConversation();
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);
    providerRef.current!.queueStructured({ summary: "Discussed economics research ideas." });

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: false, candidateIds: [convo.id] });

    expect(updateMock).toHaveBeenCalled(); // summary written for real
    expect(deleteMock).not.toHaveBeenCalled(); // deletion gate still closed
    expect(result.summarized).toBe(1);
    expect(result.messagesDeleted).toBe(0);
  });

  test("an already-summarized conversation with ADVISOR_RETENTION_ALLOW_DELETE=true deletes without re-calling the AI", async () => {
    process.env.ADVISOR_RETENTION_ALLOW_DELETE = "true";
    const convo = freshConversation({ summary: "Already summarized in an earlier pass.", summarized_at: new Date().toISOString() });
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id); // deletion deferred/failed last time, messages still present

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: false, candidateIds: [convo.id] });

    expect(providerRef.current!.structuredCalls).toHaveLength(0); // no wasted spend on an existing summary
    expect(updateMock).not.toHaveBeenCalled(); // summary already there, nothing to write
    expect(deleteMock).toHaveBeenCalledWith(convo.id);
    expect(result.messagesDeleted).toBe(2);
  });
});

describe("the due-set clock runs on conversation inactivity, not message age (§3's one non-negotiable)", () => {
  test("a conversation updated 25 hours ago is due, with no candidateIds override", async () => {
    const convo = freshConversation({ id: "c-inactive", updated_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString() });
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);
    providerRef.current!.queueStructured({ summary: "Discussed research ideas." });

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: true });

    expect(result.attempted).toBe(1);
    expect(result.rows?.[0].conversationId).toBe(convo.id);
  });

  test("a conversation updated 1 hour ago is NOT due, even though its own messages are days old", async () => {
    const convo = freshConversation({
      id: "c-active",
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // the student just replied
    });
    conversationsRef.current = [convo];
    // The messages themselves are old — this is exactly the case the spec's own example
    // names: a student who wrote days ago and replied again today must not lose the start
    // of their own thread. Message age must be irrelevant to the due-set query.
    messagesRef.current = fixtureMessages(convo.id);

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: true });

    expect(result.attempted).toBe(0);
    expect(providerRef.current!.structuredCalls).toHaveLength(0); // never even considered, let alone summarized
  });
});

describe("Ultra exemption", () => {
  test("an Ultra-tier conversation is skipped entirely — no AI call, no summary, no deletion", async () => {
    const convo = freshConversation({ id: "c-ultra", user_id: "u-ultra" });
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: false, candidateIds: [convo.id] });

    expect(providerRef.current!.structuredCalls).toHaveLength(0);
    expect(updateMock).not.toHaveBeenCalled();
    expect(deleteMock).not.toHaveBeenCalled();
    expect(result.skippedUltra).toBe(1);
    expect(result.rows).toBeUndefined(); // not a dry run
  });

  test("an unreadable profile fails toward Ultra (exempt), not Standard (would delete)", async () => {
    const convo = freshConversation({ id: "c-unknown-tier", user_id: "u-does-not-exist-in-profiles" });
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    await runRetentionPass({ dryRun: false, candidateIds: [convo.id] });

    expect(providerRef.current!.structuredCalls).toHaveLength(0);
    expect(deleteMock).not.toHaveBeenCalled();
  });
});

describe("no messages left to process", () => {
  test("a conversation with zero remaining messages is skipped, not treated as an error", async () => {
    const convo = freshConversation({ summary: "Old summary.", summarized_at: new Date().toISOString() });
    conversationsRef.current = [convo];
    messagesRef.current = []; // already deleted by an earlier pass

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: false, candidateIds: [convo.id] });

    expect(result.skippedNoMessages).toBe(1);
    expect(result.degraded).toBe(false);
  });
});

describe("budget exhaustion stops future summaries but not pending deletions", () => {
  test("a candidate needing a fresh summary is skipped with skipped_budget when already over budget, and does not call the AI", async () => {
    monthToDateRowsRef.current = [{ estimated_cost: 999 }]; // comfortably over the small default budget
    const convo = freshConversation();
    conversationsRef.current = [convo];
    messagesRef.current = fixtureMessages(convo.id);

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: true, candidateIds: [convo.id] });

    expect(providerRef.current!.structuredCalls).toHaveLength(0);
    expect(result.skippedBudget).toBe(1);
    expect(result.rows?.[0].outcome).toBe("skipped_budget");
  });

  test("once budget is exhausted mid-run, a later already-summarized candidate still gets processed for deletion", async () => {
    process.env.ADVISOR_RETENTION_ALLOW_DELETE = "true";
    monthToDateRowsRef.current = [{ estimated_cost: 999 }];
    const needsSummary = freshConversation({ id: "c-needs-summary" });
    const alreadySummarized = freshConversation({ id: "c-already-summarized", summary: "Existing summary.", summarized_at: new Date().toISOString() });
    conversationsRef.current = [needsSummary, alreadySummarized];
    messagesRef.current = [...fixtureMessages(needsSummary.id), ...fixtureMessages(alreadySummarized.id)];

    const { runRetentionPass } = await import("@/lib/advisor/retention");
    const result = await runRetentionPass({ dryRun: false, candidateIds: [needsSummary.id, alreadySummarized.id] });

    expect(providerRef.current!.structuredCalls).toHaveLength(0); // never even attempted — budget checked once, then short-circuited
    expect(deleteMock).toHaveBeenCalledWith(alreadySummarized.id); // unpaid step, unaffected
    expect(result.skippedBudget).toBe(1);
    expect(result.messagesDeleted).toBe(2);
  });
});
