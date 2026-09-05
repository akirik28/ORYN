import { describe, expect, test, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { MockSupabaseClient } from "@/__tests__/stubs/mock-supabase-table";
import { backfillGenericConversationTitles } from "@/lib/advisor/conversation-title";

/**
 * 2026-09-05: confirmed live (read-only) that two real conversations, both with a genuine
 * reply already generated, still carry the literal placeholder title because their only
 * message was sent hours before lib/advisor/conversation-title.ts's derivation existed at
 * all -- not a bug in the current titling code (already covered by conversation-title-
 * integration.test.ts), but real, nameable data left behind by the feature landing mid-day.
 * This is the lazy backfill that closes it, called from app/(app)/advisor/page.tsx wherever
 * the session list loads. Uses the real row-filtering mock (not a call-spy) specifically
 * because correctness here depends on which table gets touched for which row, exactly the
 * shape __tests__/stubs/mock-supabase-table.ts's own header warns a raw call-counter mock
 * would get wrong.
 */

function client(config: { conversations: Record<string, unknown>[]; messages: Record<string, unknown>[]; forceConversationsError?: { code: string; message: string } }) {
  return new MockSupabaseClient({
    advisor_conversations: { rows: config.conversations, forceError: config.forceConversationsError },
    advisor_messages: { rows: config.messages },
  }) as unknown as SupabaseClient<Database>;
}

describe("backfillGenericConversationTitles", () => {
  test("a generically-titled conversation with a real first message gets the derived title, in place", async () => {
    const conversations = [{ id: "conv-1", title: "New conversation" }];
    const messages = [{ id: "msg-1", conversation_id: "conv-1", role: "user", status: "complete", content: "whats the best basketball club in germany", created_at: "2026-09-04T06:04:15Z" }];
    const supabase = client({ conversations, messages });

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result[0].title).toBe("whats the best basketball club in germany");
    // The seeded row itself was mutated -- proof a real UPDATE happened, not just that the
    // function's own return value looks right.
    expect(conversations[0].title).toBe("whats the best basketball club in germany");
  });

  test("the Turkish placeholder is recognized identically to the English one", async () => {
    const conversations = [{ id: "conv-1", title: "Yeni sohbet" }];
    const messages = [{ id: "msg-1", conversation_id: "conv-1", role: "user", status: "complete", content: "Profilimin en zayıf yanı ne?", created_at: "2026-09-04T06:04:15Z" }];
    const supabase = client({ conversations, messages });

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result[0].title).toBe("Profilimin en zayıf yanı ne?");
  });

  test("a conversation already carrying a real title is left completely alone", async () => {
    const conversations = [{ id: "conv-1", title: "Should I start another club?" }];
    // No messages seeded at all -- if the function queried this conversation regardless of
    // its title, matchingRows() would just return [] and the test would still pass for the
    // wrong reason; the real proof is the title staying byte-for-byte what it started as.
    const supabase = client({ conversations, messages: [] });

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result[0].title).toBe("Should I start another club?");
    expect(result).toBe(conversations); // short-circuited, not even a new array built
  });

  test("a genuinely empty shell (generic title, no messages yet) is left on the placeholder, not blanked", async () => {
    const conversations = [{ id: "conv-1", title: "New conversation" }];
    const supabase = client({ conversations, messages: [] });

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result[0].title).toBe("New conversation");
  });

  test("only a COMPLETE, user-authored message counts as 'the first message' -- a failed or assistant row is ignored", async () => {
    const conversations = [{ id: "conv-1", title: "New conversation" }];
    const messages = [
      { id: "msg-1", conversation_id: "conv-1", role: "assistant", status: "complete", content: "Hi, how can I help?", created_at: "2026-09-04T06:04:10Z" },
      { id: "msg-2", conversation_id: "conv-1", role: "user", status: "failed", content: null, created_at: "2026-09-04T06:04:12Z" },
    ];
    const supabase = client({ conversations, messages });

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result[0].title).toBe("New conversation");
  });

  test("mixed batch: only the generically-titled rows are touched, others returned unchanged in the same positions", async () => {
    const conversations = [
      { id: "conv-real", title: "Should I start another club?" },
      { id: "conv-generic", title: "New conversation" },
      { id: "conv-empty", title: "Yeni sohbet" },
    ];
    const messages = [{ id: "msg-1", conversation_id: "conv-generic", role: "user", status: "complete", content: "What should I focus on?", created_at: "2026-09-04T06:04:15Z" }];
    const supabase = client({ conversations, messages });

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result.map((c) => c.title)).toEqual(["Should I start another club?", "What should I focus on?", "Yeni sohbet"]);
    expect(result.map((c) => c.id)).toEqual(["conv-real", "conv-generic", "conv-empty"]); // order preserved
  });

  test("an UPDATE failure leaves that conversation on its placeholder rather than throwing or reporting a false title", async () => {
    const conversations = [{ id: "conv-1", title: "New conversation" }];
    const messages = [{ id: "msg-1", conversation_id: "conv-1", role: "user", status: "complete", content: "A question", created_at: "2026-09-04T06:04:15Z" }];
    const supabase = client({ conversations, messages, forceConversationsError: { code: "23514", message: "check constraint violated" } });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await backfillGenericConversationTitles(supabase, conversations);

    expect(result[0].title).toBe("New conversation");
    warnSpy.mockRestore();
  });

  test("an empty conversations array returns immediately without querying either table", async () => {
    const supabase = new MockSupabaseClient({}) as unknown as SupabaseClient<Database>; // no tables configured at all
    const result = await backfillGenericConversationTitles(supabase, []);
    expect(result).toEqual([]);
  });
});
