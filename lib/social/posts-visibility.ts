import type { PostVisibility } from "@/types/database";

/**
 * Pure visibility and repost-render rules for the social layer (migration 0058).
 *
 * Same split as lib/messaging/authorization.ts vs lib/messaging/messages.ts: the actual
 * decisions live here, with no Supabase dependency, so they are unit-testable without a
 * live database — and so "who can see this" is one readable module rather than something
 * you reconstruct by reading a `.or()` chain.
 *
 * IMPORTANT, and the same caveat migration 0023's authorization module carries: the real
 * enforcement is the RLS policy in migration 0058, not this file. A Postgres policy
 * cannot be unit-tested without a live database (supabase/tests/social_posts_manual.sql
 * is the by-hand matrix for that layer). Treat `canViewPost` as "what the policy is
 * supposed to do", and as a regression signal if the two ever drift — never as the thing
 * that guarantees it.
 */

/**
 * Audience width, narrowest first. Used to enforce that a repost can never be broader
 * than what it reposts — see `canRepostWithVisibility`. The numbers are an ordering, not
 * a stored value; nothing persists them.
 */
const VISIBILITY_RANK: Record<PostVisibility, number> = {
  private: 0,
  connections: 1,
  oryn_public: 2,
};

export function isAtLeastAsNarrowAs(candidate: PostVisibility, limit: PostVisibility): boolean {
  return VISIBILITY_RANK[candidate] <= VISIBILITY_RANK[limit];
}

export interface PostVisibilityInput {
  /** Is the caller the post's author. An author always sees their own post, including one
   * a moderator removed — removal must not be silent. */
  isAuthor: boolean;
  visibility: PostVisibility;
  /** A currently ACCEPTED connection between caller and author. Pending/declined do not
   * count, unlike `public_profiles`' deliberately looser carve-out (migration 0023) — a
   * feed is content, not an identity card. */
  hasAcceptedConnection: boolean;
  /** The AUTHOR's `profiles.is_public`. The `oryn_public` tier is double-gated: a student
   * who never opted into a shareable profile has not opted into an Oryn-wide audience
   * either, and choosing `oryn_public` on one post must not route around that. */
  authorProfileIsPublic: boolean;
  /** Symmetric — `is_blocked_between`, never a direction. A block stops a post in both
   * directions. This diverges from lib/social/public-profile-authorization.ts, where a
   * block deliberately does NOT gate profile visibility; see migration 0058's read policy
   * comment for why a feed is treated differently from a profile page. */
  isBlockedBetween: boolean;
  /** Set when a moderator removed the post. */
  isRemoved: boolean;
}

/**
 * Mirrors migration 0058's `read visible posts` policy, branch for branch, including the
 * fail-closed construction: `private` matches no branch at all, so it resolves to
 * author-only by falling through rather than by an explicit rule someone could delete.
 */
export function canViewPost(input: PostVisibilityInput): boolean {
  if (input.isAuthor) return true;
  if (input.isRemoved) return false;
  if (input.isBlockedBetween) return false;
  if (input.visibility === "connections") return input.hasAcceptedConnection;
  if (input.visibility === "oryn_public") return input.authorProfileIsPublic;
  return false; // `private`
}

/**
 * A repost may never widen the original's audience. Reposting a `connections` post as
 * `oryn_public` is rejected at write time rather than relying on the per-viewer embed
 * check to hide it: the embed check does hold (the original is fetched under RLS for each
 * viewer, so a stranger sees the neutral placeholder, not the text), but a repost whose
 * commentary paraphrases a post the reader is not allowed to see is still a leak this
 * product should not manufacture. Fail at the point of the decision, not at render.
 *
 * A `private` post cannot be reposted at all — you cannot see it, so the repost target
 * check in the INSERT policy already rejects it; this returns false for the same case so
 * the Server Action can give a real error instead of a raw RLS denial.
 */
export function canRepostWithVisibility(originalVisibility: PostVisibility, repostVisibility: PostVisibility): boolean {
  if (originalVisibility === "private") return false;
  return isAtLeastAsNarrowAs(repostVisibility, originalVisibility);
}

/**
 * What a repost renders when its original is not available to this viewer.
 *
 * There is exactly ONE unavailable state, and that is the point. A deleted original, an
 * original whose author narrowed visibility after the repost, an original whose author
 * blocked this viewer, and a moderator-removed original all render identically. The
 * temptation is to say "this post was deleted" — but distinguishing deleted from
 * not-visible-to-you is itself a disclosure ("that post still exists, you just can't see
 * it"), which is exactly the reasoning `resolveBlockUiState` already applies to blocks in
 * lib/messaging/authorization.ts. Same rule, same neutral copy.
 *
 * In practice a *deleted* original should never reach this function: migration 0058's
 * `reposted_post_id ... on delete cascade` removes the repost along with the original, so
 * deleting a post takes its reposts with it. This still handles null defensively, because
 * a concurrent delete between the two fetches of a feed page can produce it, and because
 * a render path that throws on a missing row is worse than one that shows a placeholder.
 */
export type RepostRender =
  | { state: "shown"; original: EmbeddedOriginal }
  | { state: "unavailable" };

export interface EmbeddedOriginal {
  id: string;
  authorId: string;
  body: string | null;
  attachmentPath: string | null;
  /** Non-null once the original has been edited — the repost shows the CURRENT text plus
   * this marker, never a snapshot taken at repost time. A snapshot would let a reposter
   * pin a version the author has since corrected or retracted, which for a 14-18 audience
   * is a harassment vector, not a feature. */
  editedAt: string | null;
  removedAt: string | null;
  createdAt: string;
}

/**
 * @param original the original as returned by an RLS-filtered read — `null` means the
 * database did not hand it back, which already covers deleted, blocked and
 * narrowed-visibility without this function needing to know which.
 */
export function resolveRepostRender(original: EmbeddedOriginal | null): RepostRender {
  if (!original) return { state: "unavailable" };
  // An author whose post was removed by a moderator can still read their own row, so an
  // original CAN come back non-null and removed — for exactly one viewer, its author,
  // looking at someone else's repost of it. Their own post's removal is surfaced on their
  // own post, not smuggled back into a third party's repost.
  if (original.removedAt) return { state: "unavailable" };
  return { state: "shown", original };
}
