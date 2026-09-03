import { describe, expect, test, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * 2026-09-03 (tier 2): lib/social/posts.ts's reads used to be `x.data ?? []`/bare `{ data }`,
 * no error check. This file's own kill switch already treats "feature can't do its job" as
 * a thrown, caller-visible state -- a genuinely failed read now gets the same treatment
 * (unwrapOrThrow/unwrapSingleOrThrow), not the log-and-degrade shape used elsewhere tonight.
 *
 * `posts`/`post_likes` (migration 0058) are written but not applied on oryn-qa-scratch,
 * confirmed live building /kumanda/topluluk the same night -- these tests pin that a
 * table-missing error produces its OWN distinct message, never folded into "some read
 * failed" the way a first draft of the topluluk stats query did before catching itself.
 * getConnections (a different module) is mocked to isolate this file's own reads.
 */

vi.mock("@/lib/social/posts-feature-flag", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/social/posts-feature-flag")>();
  return { ...actual, assertSocialFeedEnabled: vi.fn() };
});

const { getConnectionsMock } = vi.hoisted(() => ({ getConnectionsMock: vi.fn().mockResolvedValue({ accepted: [], pending: [], sent: [] }) }));
vi.mock("@/lib/social/connections", () => ({ getConnections: getConnectionsMock }));

import { getFeedPage, getPost, getLikedPostIds } from "@/lib/social/posts";

type QueryResult = { data: unknown; error: { code?: string; message: string } | null };

function fakeClient(overrides: Record<string, QueryResult> = {}): SupabaseClient<Database> {
  const client = {
    from: (table: string) => {
      const result = overrides[table] ?? { data: [], error: null };
      const builder = {
        select: () => builder,
        eq: () => builder,
        in: () => builder,
        order: () => builder,
        or: () => builder,
        limit: () => builder,
        maybeSingle: () => Promise.resolve(result),
        then: (resolve: (value: QueryResult) => void) => resolve(result),
      };
      return builder;
    },
  };
  return client as unknown as SupabaseClient<Database>;
}

const TABLE_MISSING = (table: string) => ({ code: "PGRST205", message: `Could not find the table 'public.${table}' in the schema cache` });

beforeEach(() => {
  getConnectionsMock.mockClear();
});

describe("getFeedPage", () => {
  test("posts table missing: throws a distinct 'not set up yet' message, not a generic read-failed one", async () => {
    const client = fakeClient({ posts: { data: null, error: TABLE_MISSING("posts") } });
    await expect(getFeedPage(client, "user-1")).rejects.toThrow('Social feed table "posts" is not set up yet.');
  });

  test("posts table live but the read fails for another reason: throws a distinct 'read failed' message, not the table-missing one", async () => {
    const client = fakeClient({ posts: { data: null, error: { code: "53300", message: "too many connections" } } });
    await expect(getFeedPage(client, "user-1")).rejects.toThrow(/Social feed read failed \(posts\).*too many connections/);
  });

  test("genuinely no posts (a real, successful empty read): resolves to an empty page, no throw", async () => {
    const client = fakeClient({ posts: { data: [], error: null } });
    await expect(getFeedPage(client, "user-1")).resolves.toEqual({ items: [], nextCursor: null });
  });

  test("post_likes table missing, reached only after posts succeeds: still distinguishable by name", async () => {
    const client = fakeClient({
      posts: { data: [{ id: "p1", author_id: "user-1", reposted_post_id: null, created_at: "2026-01-01", removed_at: null }], error: null },
      public_profiles: { data: [], error: null },
      post_likes: { data: null, error: TABLE_MISSING("post_likes") },
    });
    await expect(getFeedPage(client, "user-1")).rejects.toThrow('Social feed table "post_likes" is not set up yet.');
  });
});

describe("getPost", () => {
  test("a genuinely missing/invisible post (no error) still returns null, unchanged -- the deliberate 'can't distinguish the two' contract", async () => {
    const client = fakeClient({ posts: { data: null, error: null } });
    await expect(getPost(client, "11111111-1111-1111-1111-111111111111")).resolves.toBeNull();
  });

  test("posts table missing: throws distinctly rather than returning null (which would look like a normal miss)", async () => {
    const client = fakeClient({ posts: { data: null, error: TABLE_MISSING("posts") } });
    await expect(getPost(client, "11111111-1111-1111-1111-111111111111")).rejects.toThrow('Social feed table "posts" is not set up yet.');
  });
});

describe("getLikedPostIds", () => {
  test("post_likes table missing: throws distinctly", async () => {
    const client = fakeClient({ post_likes: { data: null, error: TABLE_MISSING("post_likes") } });
    await expect(getLikedPostIds(client, "user-1", ["11111111-1111-1111-1111-111111111111"])).rejects.toThrow('Social feed table "post_likes" is not set up yet.');
  });

  test("success: returns the real set, unchanged shape", async () => {
    const postId = "11111111-1111-1111-1111-111111111111";
    const client = fakeClient({ post_likes: { data: [{ post_id: postId }], error: null } });
    await expect(getLikedPostIds(client, "user-1", [postId])).resolves.toEqual(new Set([postId]));
  });
});
