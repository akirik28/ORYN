import { describe, expect, test } from "vitest";
import {
  feedAuthorScope,
  orderFeedPage,
  applyFeedCursor,
  isBeforeCursor,
  nextFeedCursor,
  encodeFeedCursor,
  decodeFeedCursor,
  compareFeedDesc,
  FEED_PAGE_SIZE,
} from "@/lib/social/posts-feed";

const ME = "11111111-1111-1111-1111-111111111111";
const ALICE = "22222222-2222-2222-2222-222222222222";
const BOB = "33333333-3333-3333-3333-333333333333";

const row = (id: string, created_at: string) => ({ id, created_at });

describe("feed scope — the consented graph, and always yourself", () => {
  test("scope is the viewer plus their accepted connections", () => {
    expect(feedAuthorScope(ME, [ALICE, BOB])).toEqual([ME, ALICE, BOB].sort());
  });

  test("a student with no connections still sees their own posts", () => {
    // Otherwise the feature is an empty page on day one for every new account.
    expect(feedAuthorScope(ME, [])).toEqual([ME]);
  });

  test("the viewer is not duplicated if they somehow appear in the connection list", () => {
    expect(feedAuthorScope(ME, [ALICE, ME])).toEqual([ME, ALICE].sort());
  });

  test("the scope is sorted, so the generated query string is stable", () => {
    const scope = feedAuthorScope(ME, [BOB, ALICE]);
    expect(scope).toEqual([...scope].sort());
  });
});

describe("ordering — reverse-chronological, never engagement-ranked", () => {
  test("newest first by created_at", () => {
    const ordered = orderFeedPage([
      row("a", "2026-08-01T00:00:00.000Z"),
      row("b", "2026-08-03T00:00:00.000Z"),
      row("c", "2026-08-02T00:00:00.000Z"),
    ]);
    expect(ordered.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  test("id breaks ties so the order is total and stable", () => {
    // Without a tiebreak, two posts sharing a timestamp can swap between pages and keyset
    // pagination silently skips one of them.
    const same = "2026-08-03T00:00:00.000Z";
    const ordered = orderFeedPage([row("a", same), row("c", same), row("b", same)]);
    expect(ordered.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  test("nothing about the ordering depends on like or repost counts", () => {
    // The counts exist on the row; the comparator's signature cannot see them, which is
    // the structural version of "this feed is not ranked".
    const heavilyLiked = { ...row("a", "2026-08-01T00:00:00.000Z"), like_count: 5000 };
    const recentAndIgnored = { ...row("b", "2026-08-02T00:00:00.000Z"), like_count: 0 };
    expect(orderFeedPage([heavilyLiked, recentAndIgnored]).map((r) => r.id)).toEqual(["b", "a"]);
  });

  test("orderFeedPage does not mutate its input", () => {
    const input = [row("a", "2026-08-01T00:00:00.000Z"), row("b", "2026-08-03T00:00:00.000Z")];
    orderFeedPage(input);
    expect(input.map((r) => r.id)).toEqual(["a", "b"]);
  });

  test("compareFeedDesc returns 0 only for the identical position", () => {
    const r = row("a", "2026-08-01T00:00:00.000Z");
    expect(compareFeedDesc(r, { ...r })).toBe(0);
  });
});

describe("keyset pagination", () => {
  const cursor = { createdAt: "2026-08-03T00:00:00.000Z", id: "m" };

  test("a strictly older post is after the cursor", () => {
    expect(isBeforeCursor(row("z", "2026-08-02T00:00:00.000Z"), cursor)).toBe(true);
  });

  test("a newer post is not — refreshing must not re-serve the top of the feed as page two", () => {
    expect(isBeforeCursor(row("a", "2026-08-04T00:00:00.000Z"), cursor)).toBe(false);
  });

  test("the cursor row itself is excluded — it was already shown", () => {
    expect(isBeforeCursor(row("m", "2026-08-03T00:00:00.000Z"), cursor)).toBe(false);
  });

  test("same timestamp falls back to the id half of the key, in both directions", () => {
    expect(isBeforeCursor(row("l", "2026-08-03T00:00:00.000Z"), cursor)).toBe(true);
    expect(isBeforeCursor(row("n", "2026-08-03T00:00:00.000Z"), cursor)).toBe(false);
  });

  test("applyFeedCursor orders first, then filters", () => {
    const rows = [
      row("n", "2026-08-03T00:00:00.000Z"),
      row("l", "2026-08-03T00:00:00.000Z"),
      row("z", "2026-08-02T00:00:00.000Z"),
      row("a", "2026-08-04T00:00:00.000Z"),
    ];
    expect(applyFeedCursor(rows, cursor).map((r) => r.id)).toEqual(["l", "z"]);
    expect(applyFeedCursor(rows, null).map((r) => r.id)).toEqual(["a", "n", "l", "z"]);
  });

  test("a post inserted mid-read does not displace anything below the cursor", () => {
    // The failure OFFSET pagination has: a new row at the top shifts every later page by
    // one and silently hides a post.
    const page1 = [row("d", "2026-08-04T00:00:00.000Z"), row("c", "2026-08-03T00:00:00.000Z")];
    const next = nextFeedCursor(page1, 2)!;
    const everything = [row("NEW", "2026-08-05T00:00:00.000Z"), ...page1, row("b", "2026-08-02T00:00:00.000Z")];
    expect(applyFeedCursor(everything, next).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("nextFeedCursor", () => {
  test("a full page yields a cursor pointing at its last row", () => {
    const page = [row("b", "2026-08-03T00:00:00.000Z"), row("a", "2026-08-02T00:00:00.000Z")];
    expect(nextFeedCursor(page, 2)).toEqual({ createdAt: "2026-08-02T00:00:00.000Z", id: "a" });
  });

  test("a partial page yields null — no infinite 'load more' on a guaranteed-empty request", () => {
    expect(nextFeedCursor([row("a", "2026-08-02T00:00:00.000Z")], 2)).toBeNull();
  });

  test("an empty page yields null", () => {
    expect(nextFeedCursor([], 2)).toBeNull();
  });

  test("the default page size is a real number the query can use", () => {
    expect(FEED_PAGE_SIZE).toBeGreaterThan(0);
  });
});

describe("cursor encoding round-trip", () => {
  test("encode then decode returns the same position", () => {
    const cursor = { createdAt: "2026-08-03T12:34:56.789Z", id: "44444444-4444-4444-4444-444444444444" };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
  });

  test("the encoded form is URL-safe", () => {
    const encoded = encodeFeedCursor({ createdAt: "2026-08-03T12:34:56.789Z", id: "a/b+c" });
    expect(encoded).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  test.each([
    ["null", null],
    ["undefined", undefined],
    ["empty string", ""],
    ["not base64 of anything with a separator", "Zm9vYmFy"],
    ["a non-date timestamp half", Buffer.from("not-a-date|abc", "utf8").toString("base64url")],
    ["an empty id half", Buffer.from("2026-08-03T00:00:00.000Z|", "utf8").toString("base64url")],
    ["an empty timestamp half", Buffer.from("|abc", "utf8").toString("base64url")],
  ])("a malformed cursor (%s) decodes to null rather than throwing", (_label, raw) => {
    // A bad cursor in a URL should render page one, not a 500.
    expect(decodeFeedCursor(raw as string | null | undefined)).toBeNull();
  });

  test("an id containing the separator still round-trips intact", () => {
    // Split on the FIRST separator: the timestamp half can never contain "|", so
    // everything after it belongs to the id. Splitting on the last one would silently
    // corrupt the timestamp — and a corrupted timestamp is a wrong page, not an error.
    const cursor = { createdAt: "2026-08-03T12:34:56.789Z", id: "weird|id" };
    expect(decodeFeedCursor(encodeFeedCursor(cursor))).toEqual(cursor);
  });
});
