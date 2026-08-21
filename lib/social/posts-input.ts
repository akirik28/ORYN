import type { PostInsert, PostUpdate, PostVisibility } from "@/types/database";
import { canRepostWithVisibility } from "@/lib/social/posts-visibility";

/**
 * Input validation for post writes — pure, so the rules are testable without a database
 * and without Next's request context.
 *
 * These are not the security boundary. Migration 0058's CHECK constraints
 * (`posts_original_shape`, `posts_repost_shape`, `posts_attachment_shape`) and its RLS
 * policies are, and they hold regardless of what a caller sends. This layer exists so a
 * student gets a readable error instead of a raw constraint violation, and so the "an
 * insert must always name a visibility" rule is stated somewhere a developer reads before
 * they reach the SQL.
 */

/** Matches migration 0058's `char_length(btrim(body)) between 1 and 3000`. Kept in sync
 * by __tests__/social/posts-schema.test.ts, which reads the migration file. */
export const MAX_POST_BODY_LENGTH = 3000;

export const POST_VISIBILITIES: readonly PostVisibility[] = ["private", "connections", "oryn_public"] as const;

export class PostInputError extends Error {}

/**
 * There is no default visibility, here or in the schema, and adding one would be the
 * single easiest way to break this feature's central privacy commitment. A caller must
 * pass a value; an unrecognised value is rejected rather than coerced to something safe,
 * because silently rewriting a caller's stated audience is its own bug.
 */
export function parseVisibility(raw: unknown): PostVisibility {
  if (typeof raw !== "string" || !POST_VISIBILITIES.includes(raw as PostVisibility)) {
    throw new PostInputError("Choose who can see this post.");
  }
  return raw as PostVisibility;
}

export interface OriginalPostInput {
  authorId: string;
  body: string;
  visibility: unknown;
  attachmentPath?: string | null;
  attachmentKind?: "image" | "document" | null;
}

export function buildOriginalPostInsert(input: OriginalPostInput): PostInsert {
  const body = input.body.trim();
  if (!body) throw new PostInputError("Write something before posting.");
  if (body.length > MAX_POST_BODY_LENGTH) throw new PostInputError("That post is too long.");

  const attachmentPath = input.attachmentPath ?? null;
  const attachmentKind = input.attachmentKind ?? null;
  // Mirrors `posts_attachment_shape`: both columns or neither. Caught here so a
  // half-filled attachment is a message rather than a 23514.
  if ((attachmentPath === null) !== (attachmentKind === null)) {
    throw new PostInputError("That attachment is incomplete.");
  }

  return {
    author_id: input.authorId,
    kind: "original",
    visibility: parseVisibility(input.visibility),
    body,
    attachment_path: attachmentPath,
    attachment_kind: attachmentKind,
  };
}

export interface RepostInput {
  authorId: string;
  originalPostId: string;
  originalVisibility: PostVisibility;
  /** Optional — LinkedIn's "repost" vs "repost with your thoughts" are the same object
   * with and without this. */
  commentary?: string | null;
  visibility: unknown;
}

/**
 * A repost is a post row of its own referencing the original. Two rules are enforced
 * before the insert:
 *   * you cannot repost your way to a wider audience than the original had
 *     (`canRepostWithVisibility`), and
 *   * commentary is optional but, when present, is held to the same length bound as a
 *     post body.
 * A `private` original is rejected outright — you cannot see it, so RLS would reject the
 * insert anyway; this turns that into a sentence instead of a policy denial.
 */
export function buildRepostInsert(input: RepostInput): PostInsert {
  const visibility = parseVisibility(input.visibility);
  if (!canRepostWithVisibility(input.originalVisibility, visibility)) {
    throw new PostInputError("A repost can't be shared more widely than the original post.");
  }

  const commentary = input.commentary?.trim() ?? "";
  if (commentary.length > MAX_POST_BODY_LENGTH) throw new PostInputError("That comment is too long.");

  return {
    author_id: input.authorId,
    kind: "repost",
    visibility,
    body: commentary || null,
    reposted_post_id: input.originalPostId,
    // Never its own attachment — a repost displays the original's. Mirrors
    // `posts_repost_shape`.
    attachment_path: null,
    attachment_kind: null,
  };
}

/**
 * The ONLY columns an author's edit may touch. Everything else on the row is either
 * immutable or restored by `posts_guard_system_columns` — but sending a narrow payload
 * means the guard is defence in depth rather than the only thing standing between an
 * author and their own like count.
 *
 * Note what is NOT here and cannot be: `edited_at` and `edit_count`. Those are set by the
 * revision trigger, which also copies the superseded version into `post_revisions`. An
 * edit therefore cannot be made to look like it never happened, which is the whole point
 * — someone already saw the previous text.
 */
export function buildPostUpdate(input: { body?: string; visibility?: unknown }): PostUpdate {
  const update: PostUpdate = {};

  if (input.body !== undefined) {
    const body = input.body.trim();
    if (!body) throw new PostInputError("A post can't be empty.");
    if (body.length > MAX_POST_BODY_LENGTH) throw new PostInputError("That post is too long.");
    update.body = body;
  }

  if (input.visibility !== undefined) {
    update.visibility = parseVisibility(input.visibility);
  }

  if (Object.keys(update).length === 0) throw new PostInputError("Nothing to change.");
  return update;
}
