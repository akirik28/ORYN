import { describe, expect, test, vi } from "vitest";
import { getCommunityStats } from "@/lib/admin/queries";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * getCommunityStats (lib/admin/queries.ts, 2026-09-03) — built for /kumanda/topluluk, and
 * caught its own version of this session's central bug before it shipped: a first draft
 * queried posts/post_likes with `{ head: true }` and no existence check at all, live-verified
 * against oryn-qa-scratch to find those two tables genuinely don't exist yet (migration 0058
 * unapplied) while connections/messages do. A head:true count against the missing tables
 * would have returned a false-success 204 -- the exact PGRST205-masking bug this session
 * found and fixed everywhere else tonight (isAdminActionsTableLive's own header has the
 * live-compared proof) -- silently reporting "0 posts" instead of "not set up yet."
 *
 * Fixed by a real `.select().limit(1)` existence check per table (isTableLive, this file)
 * before any count query runs. These tests pin that each table's absence produces `null`
 * (never 0, never a thrown error), independently of the others.
 */

type QueryResult = { data: unknown; error: { code?: string; message: string } | null; count?: number };

function fakeClient(perTable: Record<string, QueryResult[]>): SupabaseClient<Database> {
  const callIndex: Record<string, number> = {};
  const client = {
    from: (table: string) => {
      const results = perTable[table] ?? [{ data: [], error: null, count: 0 }];
      const i = callIndex[table] ?? 0;
      callIndex[table] = i + 1;
      const result = results[Math.min(i, results.length - 1)];
      const builder = {
        select: () => builder,
        eq: () => builder,
        limit: () => Promise.resolve(result),
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

function tableMissing(table: string) {
  return { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` };
}

describe("getCommunityStats", () => {
  test("all four tables live: real counts, distinct post authors, no console.error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      posts: [
        { data: null, error: null }, // existence check
        { data: null, error: null, count: 5 }, // count
        { data: [{ author_id: "u1" }, { author_id: "u1" }, { author_id: "u2" }], error: null }, // author rows
      ],
      post_likes: [{ data: null, error: null }, { data: null, error: null, count: 12 }],
      connections: [{ data: null, error: null }, { data: null, error: null, count: 3 }],
      messages: [{ data: null, error: null }, { data: null, error: null, count: 40 }],
    });
    const stats = await getCommunityStats(client);
    expect(stats).toEqual({ postCount: 5, postAuthorCount: 2, messageCount: 40, acceptedConnectionCount: 3, likeCount: 12 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("posts and post_likes missing (migration 0058 unapplied): null, not 0, and no error thrown", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      posts: [{ data: null, error: tableMissing("posts") }],
      post_likes: [{ data: null, error: tableMissing("post_likes") }],
      connections: [{ data: null, error: null }, { data: null, error: null, count: 0 }],
      messages: [{ data: null, error: null }, { data: null, error: null, count: 0 }],
    });
    const stats = await getCommunityStats(client);
    expect(stats.postCount).toBeNull();
    expect(stats.postAuthorCount).toBeNull();
    expect(stats.likeCount).toBeNull();
    // A genuinely empty (but live) table is a real 0, not null -- the third state this whole
    // fix exists to keep distinct from "not set up."
    expect(stats.messageCount).toBe(0);
    expect(stats.acceptedConnectionCount).toBe(0);
    // Table-missing is expected/handled, not an operational surprise -- no console.error.
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("an unexpected error (not table-missing) on a live-seeming table still degrades to null-safe, and IS logged", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      posts: [{ data: null, error: { code: "53300", message: "too many connections" } }],
      post_likes: [{ data: null, error: null }, { data: null, error: null, count: 0 }],
      connections: [{ data: null, error: null }, { data: null, error: null, count: 0 }],
      messages: [{ data: null, error: null }, { data: null, error: null, count: 0 }],
    });
    const stats = await getCommunityStats(client);
    expect(stats.postCount).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("posts");
    spy.mockRestore();
  });
});
