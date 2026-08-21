import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Post, PublicProfileRow } from "@/types/database";
import { getConnections } from "@/lib/social/connections";
import { isUuidLike } from "@/lib/validation/uuid";
import { assertSocialFeedEnabled } from "@/lib/social/posts-feature-flag";
import { resolveRepostRender, type EmbeddedOriginal, type RepostRender } from "@/lib/social/posts-visibility";
import { resolvePostModerationRender, type PostModerationRender } from "@/lib/social/posts-moderation";
import { feedAuthorScope, orderFeedPage, nextFeedCursor, FEED_PAGE_SIZE, type FeedCursor } from "@/lib/social/posts-feed";

/**
 * Supabase-touching reads for the social layer. The decisions live in the pure modules
 * next to this one (posts-visibility.ts, posts-feed.ts, posts-moderation.ts); this file
 * is the wiring, deliberately kept thin for the same reason lib/messaging/messages.ts is
 * separate from lib/messaging/authorization.ts.
 *
 * SWITCHED OFF. Every exported function asserts the kill switch first — see
 * lib/social/posts-feature-flag.ts for the five layers that make this feature
 * unreachable, and why a throw is the right failure rather than an empty result.
 *
 * RLS is the authorization boundary throughout. Nothing here re-implements the visibility
 * rules as a query filter: a post the caller may not see simply does not come back. The
 * `.in()` on author ids is the feed's PRODUCT scope (see posts-feed.ts), not its security.
 */

export interface FeedItem {
  post: Post;
  authorProfile: PublicProfileRow | null;
  /** Whether the CURRENT viewer has liked this post — drives the button state. Derived
   * from a single batched query over the page's ids, never a per-row round trip. */
  likedByViewer: boolean;
  /** Present only for `kind === "repost"`. See resolveRepostRender for why there is one
   * neutral unavailable state rather than a reason. */
  repost: RepostRender | null;
  /** How moderation affects this row for this viewer. `removed_notice` only ever happens
   * for the post's own author. */
  moderation: PostModerationRender;
}

export interface FeedPage {
  items: FeedItem[];
  nextCursor: FeedCursor | null;
}

/**
 * One page of the viewer's feed: their own posts plus their accepted connections',
 * newest first. Empty (not an error) for a student with no connections and no posts.
 *
 * Batch-fetch-and-zip, no nested PostgREST embeds — the same convention
 * lib/social/connections.ts and the admin moderation queue already follow, and here it is
 * load-bearing rather than stylistic: the embedded originals of reposts must be fetched
 * as their OWN RLS-filtered query so each one is evaluated against this viewer. An embed
 * would resolve them as a join under the parent row's policy and could hand back a post
 * this viewer is not allowed to see.
 */
export async function getFeedPage(
  supabase: SupabaseClient<Database>,
  userId: string,
  cursor: FeedCursor | null = null,
  pageSize: number = FEED_PAGE_SIZE
): Promise<FeedPage> {
  assertSocialFeedEnabled();

  const { accepted } = await getConnections(supabase, userId);
  const connectionIds = accepted.map((c) => (c.requester_id === userId ? c.recipient_id : c.requester_id));
  const authorIds = feedAuthorScope(userId, connectionIds);

  let query = supabase
    .from("posts")
    .select("*")
    .in("author_id", authorIds)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize);

  // Keyset predicate, matching isBeforeCursor exactly: strictly older, or same timestamp
  // with a strictly smaller id. Expressed in PostgREST's `or` syntax rather than filtered
  // in memory so the LIMIT above actually bounds the rows read.
  if (cursor) {
    query = query.or(`created_at.lt.${cursor.createdAt},and(created_at.eq.${cursor.createdAt},id.lt.${cursor.id})`);
  }

  const { data } = await query;
  const posts = orderFeedPage(data ?? []);
  if (posts.length === 0) return { items: [], nextCursor: null };

  const originalIds = Array.from(
    new Set(posts.map((p) => p.reposted_post_id).filter((id): id is string => id !== null))
  );
  const authorProfileIds = Array.from(new Set(posts.map((p) => p.author_id)));

  const [originalsRes, profilesRes, likesRes] = await Promise.all([
    originalIds.length > 0
      ? supabase.from("posts").select("*").in("id", originalIds)
      : Promise.resolve({ data: [] as Post[] }),
    supabase.from("public_profiles").select("*").in("id", authorProfileIds),
    supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", userId)
      .in(
        "post_id",
        posts.map((p) => p.id)
      ),
  ]);

  const originalById = new Map((originalsRes.data ?? []).map((p) => [p.id, toEmbeddedOriginal(p)]));
  const profileById = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const likedPostIds = new Set((likesRes.data ?? []).map((row) => row.post_id));

  const items: FeedItem[] = posts.map((post) => ({
    post,
    authorProfile: profileById.get(post.author_id) ?? null,
    likedByViewer: likedPostIds.has(post.id),
    repost: post.reposted_post_id ? resolveRepostRender(originalById.get(post.reposted_post_id) ?? null) : null,
    moderation: resolvePostModerationRender({ isAuthor: post.author_id === userId, removedAt: post.removed_at }),
  }));

  return { items, nextCursor: nextFeedCursor(posts, pageSize) };
}

/** Single post, RLS-scoped. Returns null both when the post does not exist and when this
 * viewer may not see it — the caller cannot distinguish the two, deliberately, for the
 * same reason resolveRepostRender has one unavailable state. */
export async function getPost(supabase: SupabaseClient<Database>, postId: string): Promise<Post | null> {
  assertSocialFeedEnabled();
  if (!isUuidLike(postId)) return null;
  const { data } = await supabase.from("posts").select("*").eq("id", postId).maybeSingle();
  return data;
}

/**
 * A viewer's own like state for a set of posts, batched. Exists so a caller rendering a
 * post outside the feed (a permalink, say) does not fall back to a per-post query.
 */
export async function getLikedPostIds(
  supabase: SupabaseClient<Database>,
  userId: string,
  postIds: readonly string[]
): Promise<Set<string>> {
  assertSocialFeedEnabled();
  const ids = postIds.filter(isUuidLike);
  if (ids.length === 0) return new Set();
  const { data } = await supabase.from("post_likes").select("post_id").eq("user_id", userId).in("post_id", ids);
  return new Set((data ?? []).map((row) => row.post_id));
}

/**
 * Short-lived signed URL for a post's attachment, or null.
 *
 * The `post-media` bucket's storage policies are OWNER-ONLY for read (migration 0058), so
 * a viewer who is legitimately allowed to see the post still cannot read the object
 * through their own client. That is deliberate: re-expressing "accepted connection,
 * unless blocked, unless removed, unless the author narrowed visibility" as a storage
 * policy over a path string is exactly the kind of second, drifting copy of an
 * authorization rule that produces leaks. Instead the audience check happens once, here,
 * against the post itself — and the caller MUST pass a post it obtained from an
 * RLS-filtered read (getPost / getFeedPage). Passing an admin-client-fetched post would
 * defeat it.
 *
 * `adminClient` is nullable so a missing SUPABASE_SECRET_KEY degrades to "no attachment
 * shown" rather than taking the page down — the same posture tryCreateAdminClient exists
 * for everywhere else in this codebase.
 */
export async function getPostAttachmentUrl(
  adminClient: SupabaseClient<Database> | null,
  post: Pick<Post, "attachment_path" | "removed_at">,
  expiresInSeconds = 600
): Promise<string | null> {
  assertSocialFeedEnabled();
  if (!post.attachment_path || !adminClient) return null;
  // A moderator-removed post keeps its attachment row but must not hand out a URL, not
  // even to its author — removal has to stop distribution, and a signed URL outlives the
  // page it was rendered on.
  if (post.removed_at) return null;
  const { data } = await adminClient.storage.from("post-media").createSignedUrl(post.attachment_path, expiresInSeconds);
  return data?.signedUrl ?? null;
}

function toEmbeddedOriginal(post: Post): EmbeddedOriginal {
  return {
    id: post.id,
    authorId: post.author_id,
    body: post.body,
    attachmentPath: post.attachment_path,
    editedAt: post.edited_at,
    removedAt: post.removed_at,
    createdAt: post.created_at,
  };
}
