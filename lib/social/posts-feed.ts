/**
 * Feed ordering, scope and pagination — the pure half, testable without a database.
 *
 * ============================================================================
 * The two decisions this file exists to make explicit
 * ============================================================================
 *
 * ORDERING: strict reverse-chronological on `(created_at, id)`. NOT engagement-ranked,
 * not "top posts", not a relevance score.
 *
 *   Why: an engagement-ranked feed is an attention-optimising surface, and this product's
 *   stated principle is the opposite — AGENTS.md's core product principle is maximum
 *   development per unit of student time, and its design philosophy explicitly rules out
 *   gamification. For a 14-18 audience, "what got the most likes" is the exact mechanism
 *   that turns a portfolio tool into a popularity contest. Chronological is also
 *   auditable: given a timestamp you can reconstruct precisely what a student was shown,
 *   which matters the first time a moderation question is asked about it.
 *
 *   `created_at`, never `edited_at`: editing a six-month-old post must not resurface it
 *   at the top of everyone's feed. `id` is the tiebreak so the order is total and stable
 *   — without it, two posts sharing a timestamp can swap places between pages and one of
 *   them is silently skipped by keyset pagination.
 *
 *   A repost orders by the REPOST's own created_at, not the original's. It is a new act
 *   of publication by a different author; ordering it by the original's timestamp would
 *   bury it or, worse, resurface an old post under a new name.
 *
 * SCOPE: posts authored by the viewer, plus posts authored by the viewer's ACCEPTED
 * connections. Nothing else — in particular, `oryn_public` posts by people the viewer is
 * not connected to are visible on a profile but are NOT in the feed.
 *
 *   Why: `connections` is already a mutual-consent graph (request -> accept, migration
 *   0023), so a feed scoped to it can never push a stranger's content at a minor, or a
 *   minor's content at a stranger. A global/discover feed is the surface that creates
 *   unsolicited contact between adults and minors, and adding one is a product decision
 *   that has to be made deliberately rather than inherited from "well, RLS allows it".
 *   Note the distinction: RLS is the security boundary and would already permit reading
 *   an `oryn_public` post from a non-connection; this scope is the narrower PRODUCT
 *   decision layered on top. Widening the feed later means changing this file, not
 *   loosening a policy.
 */

export interface FeedCursor {
  createdAt: string;
  id: string;
}

/** Minimal shape the ordering rules need. The real row type is `Post`; this keeps the
 * pure module from depending on the full table shape. */
export interface FeedOrderable {
  id: string;
  created_at: string;
}

/**
 * The feed's author scope, as a list of ids for the query's `.in("author_id", ...)`.
 * Always includes the viewer — a student with no connections still sees their own posts,
 * which is what makes the feature usable on day one instead of an empty page.
 * De-duplicated and sorted so the produced query string is stable (helps caching, and
 * makes a test able to assert an exact value).
 */
export function feedAuthorScope(viewerId: string, acceptedConnectionIds: readonly string[]): string[] {
  return Array.from(new Set([viewerId, ...acceptedConnectionIds])).sort();
}

/** `(created_at desc, id desc)`. Exported so the DB query's order clause and the
 * in-memory merge can never disagree about what "newest first" means. */
export function compareFeedDesc(a: FeedOrderable, b: FeedOrderable): number {
  if (a.created_at !== b.created_at) return a.created_at < b.created_at ? 1 : -1;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  return 0;
}

export function orderFeedPage<T extends FeedOrderable>(rows: readonly T[]): T[] {
  return [...rows].sort(compareFeedDesc);
}

/**
 * Keyset pagination, not OFFSET. With OFFSET, a post created while a student is reading
 * shifts every subsequent page by one and silently hides a row; with a keyset the cursor
 * is a position in the ordering itself, so new posts appear at the top on refresh and
 * never displace what is below.
 *
 * Strictly "older than the cursor": a row equal to the cursor is the one already shown.
 */
export function isBeforeCursor(row: FeedOrderable, cursor: FeedCursor): boolean {
  if (row.created_at !== cursor.createdAt) return row.created_at < cursor.createdAt;
  return row.id < cursor.id;
}

export function applyFeedCursor<T extends FeedOrderable>(rows: readonly T[], cursor: FeedCursor | null): T[] {
  const ordered = orderFeedPage(rows);
  if (!cursor) return ordered;
  return ordered.filter((row) => isBeforeCursor(row, cursor));
}

/**
 * Cursor for the NEXT page: the last row of this page, or null when the page was not
 * full (nothing more to fetch — returning a cursor there would produce a guaranteed-empty
 * request and an infinite "load more" affordance).
 */
export function nextFeedCursor<T extends FeedOrderable>(page: readonly T[], pageSize: number): FeedCursor | null {
  if (page.length < pageSize || page.length === 0) return null;
  const last = page[page.length - 1];
  return { createdAt: last.created_at, id: last.id };
}

/**
 * Opaque-ish wire format. Not encryption and not claimed to be: the cursor contains only
 * a timestamp and a post id the caller already saw, and the query it feeds is RLS-scoped
 * regardless of what a caller forges. Encoding exists so the value is one URL-safe token
 * instead of two query parameters that could drift apart.
 */
export function encodeFeedCursor(cursor: FeedCursor): string {
  return Buffer.from(`${cursor.createdAt}|${cursor.id}`, "utf8").toString("base64url");
}

/** Returns null for anything malformed rather than throwing — a bad cursor in a URL
 * should render page one, not a 500. */
export function decodeFeedCursor(raw: string | null | undefined): FeedCursor | null {
  if (!raw) return null;
  let decoded: string;
  try {
    decoded = Buffer.from(raw, "base64url").toString("utf8");
  } catch {
    return null;
  }
  // First separator, not last: the timestamp half can never contain "|", so everything
  // after the first one belongs to the id. Splitting on the last separator would corrupt
  // the timestamp for any id that happened to contain one.
  const separator = decoded.indexOf("|");
  if (separator <= 0) return null;
  const createdAt = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);
  if (!createdAt || !id) return null;
  if (Number.isNaN(Date.parse(createdAt))) return null;
  return { createdAt, id };
}

export const FEED_PAGE_SIZE = 20;
