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
 *
 * 2026-09-03, later the same night (CEO's vacuous-test sweep): the fakeClient below is a
 * REWRITE. The original version returned a hand-configured result per call, keyed only by
 * call order ("call #1 is the existence check, call #2 is the count") -- it never inspected
 * what the source actually asked PostgREST for, so it could not tell a real `.limit(1)`
 * existence check apart from the exact `head:true` bug this file exists to prevent.
 * Reintroducing that bug into isTableLive and re-running these tests left all three green,
 * unchanged -- proof the suite was vacuous for the one thing it was written to catch. This
 * version tracks whether `head: true` was actually passed and simulates PostgREST's real
 * masking behavior from that (a missing table returns the real PGRST205 without it, a false-
 * success 204 with it) -- confirmed by re-running the same reintroduced bug against this
 * version and watching it fail (see the sweep's own report for the transcript).
 */

type TableConfig = { missing?: true; data?: unknown; error?: { code?: string; message: string } | null; count?: number };

function fakeClient(perTable: Record<string, TableConfig>): SupabaseClient<Database> {
  const client = {
    from: (table: string) => {
      const config = perTable[table] ?? { data: [], error: null };
      const resolveFor = (opts?: { head?: boolean }) => {
        if (config.missing) {
          // The real PostgREST behavior this whole file exists to get right: head:true
          // masks a missing table as a false-success 204, no error at all.
          if (opts?.head === true) return { data: null, error: null, count: null };
          return { data: null, error: { code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` } };
        }
        return { data: config.data ?? [], error: config.error ?? null, count: config.count ?? (Array.isArray(config.data) ? config.data.length : 0) };
      };
      const builder: Record<string, unknown> = {
        select: (_cols: string, opts?: { head?: boolean }) => {
          const result = resolveFor(opts);
          const inner: Record<string, unknown> = {
            eq: () => inner,
            limit: () => Promise.resolve(result),
            then: (resolve: (value: typeof result) => void) => resolve(result),
          };
          return inner;
        },
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

describe("getCommunityStats", () => {
  test("all four tables live: real counts, distinct post authors, no console.error", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      posts: { data: [{ author_id: "u1" }, { author_id: "u1" }, { author_id: "u2" }], count: 5 },
      post_likes: { data: [], count: 12 },
      connections: { data: [], count: 3 },
      messages: { data: [], count: 40 },
    });
    const stats = await getCommunityStats(client);
    expect(stats).toEqual({ postCount: 5, postAuthorCount: 2, messageCount: 40, acceptedConnectionCount: 3, likeCount: 12 });
    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  test("posts and post_likes missing (migration 0058 unapplied): null, not 0, and no error thrown", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const client = fakeClient({
      posts: { missing: true },
      post_likes: { missing: true },
      connections: { data: [], count: 0 },
      messages: { data: [], count: 0 },
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
      posts: { data: null, error: { code: "53300", message: "too many connections" } },
      post_likes: { data: [], count: 0 },
      connections: { data: [], count: 0 },
      messages: { data: [], count: 0 },
    });
    const stats = await getCommunityStats(client);
    expect(stats.postCount).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy.mock.calls[0][0]).toContain("posts");
    spy.mockRestore();
  });
});
