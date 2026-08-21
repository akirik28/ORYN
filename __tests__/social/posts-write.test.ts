import { describe, expect, test } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import {
  createPostForUser,
  repostForUser,
  editPostForUser,
  deletePostForUser,
  likePostForUser,
  unlikePostForUser,
  reportPostForUser,
} from "@/lib/social/post-actions";

/**
 * Write-path tests for the social layer, against a recording fake client.
 *
 * The point of these is to assert WHAT reaches the database, not that a call happened.
 * "A row was inserted" proves very little — this repo has already had an ingestion report
 * 1,254 rows accepted with every qualifier column null. So every assertion here is about
 * the payload, the conflict handling, or the filter set.
 */

interface RecordedCall {
  table: string;
  op: "insert" | "upsert" | "update" | "delete" | "select";
  payload?: unknown;
  options?: unknown;
  filters: { method: string; args: unknown[] }[];
  columns?: string;
}

/** Rows the fake returns for a given `select` on a table, keyed by table name. */
type SeedRows = Record<string, unknown>;

function fakeClient(seed: SeedRows = {}) {
  const calls: RecordedCall[] = [];

  function builder(call: RecordedCall) {
    const chain = {
      select(columns?: string) {
        call.columns = columns;
        return chain;
      },
      eq(column: string, value: unknown) {
        call.filters.push({ method: "eq", args: [column, value] });
        return chain;
      },
      in(column: string, values: unknown[]) {
        call.filters.push({ method: "in", args: [column, values] });
        return chain;
      },
      maybeSingle() {
        return Promise.resolve({ data: seed[call.table] ?? null, error: null });
      },
      single() {
        return Promise.resolve({ data: seed[call.table] ?? { id: "generated-id" }, error: null });
      },
      // Awaiting the builder directly (update/delete, which have no .single()).
      then(resolve: (value: { data: unknown; error: null }) => unknown) {
        return Promise.resolve({ data: null, error: null }).then(resolve);
      },
    };
    return chain;
  }

  const client = {
    from(table: string) {
      return {
        insert(payload: unknown) {
          const call: RecordedCall = { table, op: "insert", payload, filters: [] };
          calls.push(call);
          return builder(call);
        },
        upsert(payload: unknown, options?: unknown) {
          const call: RecordedCall = { table, op: "upsert", payload, options, filters: [] };
          calls.push(call);
          return builder(call);
        },
        update(payload: unknown) {
          const call: RecordedCall = { table, op: "update", payload, filters: [] };
          calls.push(call);
          return builder(call);
        },
        delete() {
          const call: RecordedCall = { table, op: "delete", filters: [] };
          calls.push(call);
          return builder(call);
        },
        select(columns?: string) {
          const call: RecordedCall = { table, op: "select", columns, filters: [] };
          calls.push(call);
          return builder(call);
        },
      };
    },
  };

  return { client: client as unknown as SupabaseClient<Database>, calls };
}

const ME = "11111111-1111-1111-1111-111111111111";
const OTHER = "22222222-2222-2222-2222-222222222222";
const POST = "33333333-3333-3333-3333-333333333333";

describe("createPostForUser", () => {
  test("inserts the author's id from the session, never from the caller's payload", async () => {
    const { client, calls } = fakeClient();
    await createPostForUser(client, ME, { body: "hello", visibility: "connections" });
    expect(calls[0].table).toBe("posts");
    expect(calls[0].payload).toMatchObject({ author_id: ME, kind: "original", visibility: "connections", body: "hello" });
  });

  test("a missing visibility never reaches the database at all", async () => {
    const { client, calls } = fakeClient();
    await expect(createPostForUser(client, ME, { body: "hello", visibility: undefined })).rejects.toThrow();
    expect(calls).toHaveLength(0);
  });
});

describe("likePostForUser — idempotency is the primary key, not a check-then-insert", () => {
  test("upserts with ignoreDuplicates on the (post_id, user_id) conflict target", async () => {
    const { client, calls } = fakeClient();
    const result = await likePostForUser(client, ME, POST);

    expect(result).toEqual({});
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({
      table: "post_likes",
      op: "upsert",
      payload: { post_id: POST, user_id: ME },
      options: { onConflict: "post_id,user_id", ignoreDuplicates: true },
    });
  });

  test("liking twice issues two identical idempotent writes and reports success both times", async () => {
    // No read-then-write anywhere: a check-then-insert would race, and the counter
    // trigger would then double-count. The constraint cannot.
    const { client, calls } = fakeClient();
    expect(await likePostForUser(client, ME, POST)).toEqual({});
    expect(await likePostForUser(client, ME, POST)).toEqual({});
    expect(calls.every((c) => c.op === "upsert")).toBe(true);
    expect(calls.some((c) => c.op === "select")).toBe(false);
    expect(calls[0].payload).toEqual(calls[1].payload);
  });

  test("never writes a count — the counter is trigger-owned", async () => {
    const { client, calls } = fakeClient();
    await likePostForUser(client, ME, POST);
    expect(Object.keys(calls[0].payload as object).sort()).toEqual(["post_id", "user_id"]);
  });

  test("a malformed post id is rejected before any query", async () => {
    const { client, calls } = fakeClient();
    expect(await likePostForUser(client, ME, "not-a-uuid")).toEqual({ error: "That post couldn't be found." });
    expect(calls).toHaveLength(0);
  });
});

describe("unlikePostForUser", () => {
  test("deletes scoped to both the post and the caller — never another user's like", async () => {
    const { client, calls } = fakeClient();
    await unlikePostForUser(client, ME, POST);
    expect(calls[0].table).toBe("post_likes");
    expect(calls[0].op).toBe("delete");
    expect(calls[0].filters).toEqual([
      { method: "eq", args: ["post_id", POST] },
      { method: "eq", args: ["user_id", ME] },
    ]);
  });

  test("unliking something that was never liked is a success, not an error", async () => {
    const { client } = fakeClient();
    expect(await unlikePostForUser(client, ME, POST)).toEqual({});
  });
});

describe("repostForUser — the original's real visibility decides, not the caller's claim", () => {
  test("reads the original through the caller's RLS-scoped client first", async () => {
    const { client, calls } = fakeClient({ posts: { id: POST, author_id: OTHER, visibility: "connections", removed_at: null } });
    await repostForUser(client, ME, { originalPostId: POST, visibility: "connections" });
    expect(calls[0].op).toBe("select");
    expect(calls[0].table).toBe("posts");
    expect(calls[0].filters).toEqual([{ method: "eq", args: ["id", POST] }]);
  });

  test("a caller cannot widen a connections-only post by claiming it was oryn_public", async () => {
    // The seeded original really is `connections`; the caller asks for `oryn_public`.
    const { client, calls } = fakeClient({ posts: { id: POST, author_id: OTHER, visibility: "connections", removed_at: null } });
    await expect(repostForUser(client, ME, { originalPostId: POST, visibility: "oryn_public" })).rejects.toThrow();
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(0);
  });

  test("a post the caller cannot see (null from the RLS-filtered read) gives a neutral message", async () => {
    const { client, calls } = fakeClient({ posts: null });
    expect(await repostForUser(client, ME, { originalPostId: POST, visibility: "connections" })).toEqual({
      error: "That post is no longer available.",
    });
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(0);
  });

  test("a moderator-removed original gives the SAME neutral message, not a different one", async () => {
    // Distinguishing "removed" from "you can't see it" would be a disclosure.
    const { client } = fakeClient({
      posts: { id: POST, author_id: OTHER, visibility: "connections", removed_at: "2026-08-21T12:00:00.000Z" },
    });
    expect(await repostForUser(client, ME, { originalPostId: POST, visibility: "connections" })).toEqual({
      error: "That post is no longer available.",
    });
  });

  test("reposting your own post is rejected", async () => {
    const { client } = fakeClient({ posts: { id: POST, author_id: ME, visibility: "connections", removed_at: null } });
    expect(await repostForUser(client, ME, { originalPostId: POST, visibility: "connections" })).toEqual({
      error: "You can't repost your own post.",
    });
  });

  test("the insert references the original rather than copying its text", async () => {
    const { client, calls } = fakeClient({ posts: { id: POST, author_id: OTHER, visibility: "connections", removed_at: null } });
    await repostForUser(client, ME, { originalPostId: POST, commentary: "good point", visibility: "private" });
    const insert = calls.find((c) => c.op === "insert")!;
    expect(insert.payload).toMatchObject({
      author_id: ME,
      kind: "repost",
      reposted_post_id: POST,
      body: "good point",
      visibility: "private",
    });
  });
});

describe("editPostForUser", () => {
  test("sends only body/visibility and scopes the update to the author's own row", async () => {
    const { client, calls } = fakeClient();
    await editPostForUser(client, ME, POST, { body: "revised", visibility: "private" });
    expect(calls[0].op).toBe("update");
    expect(calls[0].payload).toEqual({ body: "revised", visibility: "private" });
    expect(calls[0].filters).toEqual([
      { method: "eq", args: ["id", POST] },
      { method: "eq", args: ["author_id", ME] },
    ]);
  });

  test("an edit cannot clear a moderator's removal", async () => {
    const { client, calls } = fakeClient();
    await editPostForUser(client, ME, POST, { body: "revised" });
    expect(Object.keys(calls[0].payload as object)).not.toContain("removed_at");
  });
});

describe("deletePostForUser", () => {
  test("a hard delete on posts, scoped to the author — cascades do the rest", async () => {
    // Migration 0058's foreign keys take likes, revisions and every repost with it. The
    // action deliberately issues ONE delete rather than tidying up children itself, so
    // there is no path where application code forgets one of them.
    const { client, calls } = fakeClient();
    expect(await deletePostForUser(client, ME, POST)).toEqual({});
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ table: "posts", op: "delete" });
    expect(calls[0].filters).toEqual([
      { method: "eq", args: ["id", POST] },
      { method: "eq", args: ["author_id", ME] },
    ]);
  });

  test("does not soft-delete — no update, no deleted_at flag", async () => {
    const { client, calls } = fakeClient();
    await deletePostForUser(client, ME, POST);
    expect(calls.some((c) => c.op === "update")).toBe(false);
  });
});

describe("reportPostForUser", () => {
  test("resolves the reported user from the post itself, never from the caller", async () => {
    // A client-supplied reported_user_id would let anyone name an uninvolved student as
    // the author of content they never wrote.
    const { client, calls } = fakeClient({ posts: { id: POST, author_id: OTHER } });
    expect(await reportPostForUser(client, ME, POST, " abusive ")).toEqual({});
    const insert = calls.find((c) => c.op === "insert")!;
    expect(insert.table).toBe("message_reports");
    expect(insert.payload).toEqual({
      reporter_id: ME,
      reported_user_id: OTHER,
      post_id: POST,
      reason: "abusive",
    });
  });

  test("files into the existing message_reports queue, not a new table", async () => {
    // The queue already has review states, RLS and an admin surface that reads it. A
    // parallel table would repeat the exact failure migration 0030 was written to fix.
    const { client, calls } = fakeClient({ posts: { id: POST, author_id: OTHER } });
    await reportPostForUser(client, ME, POST, "abusive");
    expect(calls.filter((c) => c.op === "insert").map((c) => c.table)).toEqual(["message_reports"]);
  });

  test("reporting your own post is rejected before the insert", async () => {
    const { client, calls } = fakeClient({ posts: { id: POST, author_id: ME } });
    await expect(reportPostForUser(client, ME, POST, "abusive")).rejects.toThrow();
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(0);
  });

  test("a post that no longer exists gives a message rather than an orphan report", async () => {
    const { client, calls } = fakeClient({ posts: null });
    expect(await reportPostForUser(client, ME, POST, "abusive")).toEqual({ error: "That post is no longer available." });
    expect(calls.filter((c) => c.op === "insert")).toHaveLength(0);
  });
});

describe("the student write path has no moderator powers in it at all", () => {
  test("nothing exported from post-actions can set removal state", async () => {
    // Moderator removal lives in app/(app)/admin/actions.ts behind requireAdmin and runs
    // through the service-role client — the one role posts_guard_system_columns lets
    // through. Keeping it out of this module means there is no student-reachable code
    // path that writes removed_at, whatever arguments it is called with. The removal
    // payload builders themselves are covered in posts-moderation.test.ts.
    const moduleExports = await import("@/lib/social/post-actions");
    expect(Object.keys(moduleExports).filter((name) => /remov|restor|moderat/i.test(name))).toEqual([]);
  });
});
