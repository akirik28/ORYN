import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Post, PostVisibility } from "@/types/database";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { isUuidLike } from "@/lib/validation/uuid";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";
import { assertSocialFeedEnabled } from "@/lib/social/posts-feature-flag";
import { buildOriginalPostInsert, buildPostUpdate, buildRepostInsert, PostInputError } from "@/lib/social/posts-input";
import { validatePostReport, ModerationInputError } from "@/lib/social/posts-moderation";

/**
 * ============================================================================
 * These are Server Action BODIES. This file has no `"use server"` directive.
 * ============================================================================
 *
 * That is the point. A `"use server"` file becomes a callable RPC endpoint with a
 * build-time action id the moment anything in the client graph references it; without the
 * directive there is no endpoint, no id, and nothing for a crafted POST to reach. Combined
 * with the fact that nothing under `app/` imports this module (asserted mechanically by
 * __tests__/social/posts-hidden.test.ts), the social layer's write path is unreachable
 * rather than merely unlinked.
 *
 * Switching on is a small, deliberate diff: create `app/(app)/feed/actions.ts` containing
 * `"use server"` and a re-export of the wrappers below, set `ORYN_ENABLE_SOCIAL_FEED`,
 * apply migration 0058, and wire the nav entry. Doing it in that order matters — the flag
 * alone does nothing, which is intended.
 *
 * ----------------------------------------------------------------------------
 * Structure: each mutation is split in two.
 *   * `<verb>ForUser(supabase, userId, ...)` — the DB-touching core, taking its client as
 *     a parameter. Unit-testable against a fake client, which is where the assertions
 *     about WHAT is written live (the payload, the conflict handling, the column set) —
 *     not merely that a call happened.
 *   * `<verb>(...)` — the wrapper a Server Action becomes: session, rate limit, delegate.
 *
 * The same convention the rest of this codebase already uses (lib/messaging/messages.ts
 * takes its client; app/(app)/messages/actions.ts creates one), applied a step further so
 * the write path is testable too.
 *
 * No `revalidatePath` calls: there are no routes to revalidate yet. They belong in the
 * `"use server"` wrapper at switch-on, alongside the paths it creates.
 *
 * No notifications, deliberately. `notification_category` is untouched by migration 0058
 * and there is no "X liked your post" notification. A like notification is the core of a
 * social-validation feedback loop, and AGENTS.md's design philosophy rules out
 * gamification while Phase 24 says to avoid notification spam outright — for a 14-18
 * audience those two together are a clear enough answer to build the quieter version
 * first. It is listed as a founder decision in docs/founder-blocked-backlog.md rather
 * than treated as settled forever.
 */

export type ActionResult = { error?: string };

function toActionResult(error: unknown): ActionResult | null {
  if (error instanceof PostInputError || error instanceof ModerationInputError) return { error: error.message };
  if (error instanceof RateLimitExceededError) return { error: error.message };
  return null;
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

export async function createPostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: { body: string; visibility: unknown; attachmentPath?: string | null; attachmentKind?: "image" | "document" | null }
): Promise<ActionResult & { postId?: string }> {
  const insert = buildOriginalPostInsert({
    authorId: userId,
    body: input.body,
    visibility: input.visibility,
    attachmentPath: input.attachmentPath,
    attachmentKind: input.attachmentKind,
  });

  const { data, error } = await supabase.from("posts").insert(insert).select("id").single();
  if (error) return { error: "Couldn't publish that post. Please try again." };
  return { postId: data?.id };
}

export async function createPost(input: {
  body: string;
  visibility: unknown;
  attachmentPath?: string | null;
  attachmentKind?: "image" | "document" | null;
}): Promise<ActionResult & { postId?: string }> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  const userId = session.userId!;

  try {
    await assertWithinRateLimit(userId, "create_post", RATE_LIMITS.create_post, await resolveLocale());
    const supabase = await createClient();
    return await createPostForUser(supabase, userId, input);
  } catch (error) {
    const handled = toActionResult(error);
    if (handled) return handled;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Repost
// ---------------------------------------------------------------------------

/**
 * Re-reads the original through the CALLER's RLS-scoped client before building the
 * insert, for two reasons that both matter:
 *   * it is how "you cannot repost what you cannot see" produces a readable error rather
 *     than an RLS denial (the INSERT policy enforces it regardless — this is the friendly
 *     half, exactly as `sendMessage` re-verifies the connection it knows RLS will check);
 *   * `canRepostWithVisibility` needs the original's ACTUAL current visibility, and a
 *     client-supplied one would let a caller claim the original was `oryn_public` and
 *     widen a `connections` post.
 */
export async function repostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: { originalPostId: string; commentary?: string | null; visibility: unknown }
): Promise<ActionResult & { postId?: string }> {
  if (!isUuidLike(input.originalPostId)) return { error: "That post couldn't be found." };

  const { data: original } = await supabase
    .from("posts")
    .select("id, author_id, visibility, removed_at")
    .eq("id", input.originalPostId)
    .maybeSingle();

  // Null covers "does not exist", "you may not see it", and "a moderator removed it"
  // without distinguishing them — same non-disclosure rule as resolveRepostRender.
  if (!original || original.removed_at) return { error: "That post is no longer available." };
  if (original.author_id === userId) return { error: "You can't repost your own post." };

  const insert = buildRepostInsert({
    authorId: userId,
    originalPostId: original.id,
    originalVisibility: original.visibility as PostVisibility,
    commentary: input.commentary,
    visibility: input.visibility,
  });

  const { data, error } = await supabase.from("posts").insert(insert).select("id").single();
  if (error) return { error: "Couldn't repost that. Please try again." };
  return { postId: data?.id };
}

export async function repost(input: {
  originalPostId: string;
  commentary?: string | null;
  visibility: unknown;
}): Promise<ActionResult & { postId?: string }> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  const userId = session.userId!;

  try {
    // Shares create_post's quota on purpose — a repost is a post insert, and a separate
    // key would be a way around the post limit.
    await assertWithinRateLimit(userId, "create_post", RATE_LIMITS.create_post, await resolveLocale());
    const supabase = await createClient();
    return await repostForUser(supabase, userId, input);
  } catch (error) {
    const handled = toActionResult(error);
    if (handled) return handled;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Edit / delete
// ---------------------------------------------------------------------------

/**
 * Sends only body/visibility — never a counter, never `edited_at`, never `removed_at`.
 * The database enforces this too (`posts_guard_system_columns`), which is what makes it
 * safe rather than merely tidy; sending a narrow payload is the defence-in-depth half.
 *
 * The superseded version is copied into `post_revisions` by a trigger, and `edited_at` is
 * set there as well, so an edit is always visible as an edit. Nothing here can make a
 * change look like it never happened.
 */
export async function editPostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
  input: { body?: string; visibility?: unknown }
): Promise<ActionResult> {
  if (!isUuidLike(postId)) return { error: "That post couldn't be found." };
  const update = buildPostUpdate(input);

  // `.eq("author_id", userId)` is redundant with the RLS update policy, kept for the same
  // "keep the intent readable at the call site" reason removeConnection's own comment
  // gives.
  const { error } = await supabase.from("posts").update(update).eq("id", postId).eq("author_id", userId);
  if (error) return { error: "Couldn't save that change. Please try again." };
  return {};
}

export async function editPost(postId: string, input: { body?: string; visibility?: unknown }): Promise<ActionResult> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  try {
    const supabase = await createClient();
    return await editPostForUser(supabase, session.userId!, postId, input);
  } catch (error) {
    const handled = toActionResult(error);
    if (handled) return handled;
    throw error;
  }
}

/**
 * A hard delete. Not a soft-delete flag, and the difference is the product commitment:
 * AGENTS.md section 12 requires deletion for a minor-audience product, and a `deleted_at`
 * column is retention with extra steps.
 *
 * Migration 0058's foreign keys make one DELETE remove everything the post produced:
 * `post_likes` (cascade), `post_revisions` (cascade — the edit history goes too), and
 * every repost of it (`reposted_post_id ... on delete cascade`). `message_reports.post_id`
 * is the deliberate exception, `on delete set null`: the reporter's own words about
 * something they saw survive, the content does not.
 */
export async function deletePostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string
): Promise<ActionResult> {
  if (!isUuidLike(postId)) return { error: "That post couldn't be found." };
  const { error } = await supabase.from("posts").delete().eq("id", postId).eq("author_id", userId);
  if (error) return { error: "Couldn't delete that post. Please try again." };
  return {};
}

export async function deletePost(postId: string): Promise<ActionResult> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  const supabase = await createClient();
  return deletePostForUser(supabase, session.userId!, postId);
}

// ---------------------------------------------------------------------------
// Like / unlike
// ---------------------------------------------------------------------------

/**
 * Idempotent by construction. `post_likes`' primary key is `(post_id, user_id)`, so a
 * second like is a unique violation rather than a second row; `ignoreDuplicates` turns
 * that into a successful no-op instead of an error the UI has to interpret as "already
 * liked".
 *
 * This is why the like COUNT can be trusted: the counter trigger fires on actual INSERTs,
 * and a conflict produces no insert, so a double-tap, a retried request and a replayed
 * one all leave `like_count` at exactly +1. Application-level "check then insert" would
 * race; the constraint does not.
 */
export async function likePostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string
): Promise<ActionResult> {
  if (!isUuidLike(postId)) return { error: "That post couldn't be found." };
  const { error } = await supabase
    .from("post_likes")
    .upsert({ post_id: postId, user_id: userId }, { onConflict: "post_id,user_id", ignoreDuplicates: true });
  if (error) return { error: "Couldn't save that. Please try again." };
  return {};
}

export async function likePost(postId: string): Promise<ActionResult> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  const userId = session.userId!;
  try {
    await assertWithinRateLimit(userId, "like_post", RATE_LIMITS.like_post, await resolveLocale());
    const supabase = await createClient();
    return await likePostForUser(supabase, userId, postId);
  } catch (error) {
    const handled = toActionResult(error);
    if (handled) return handled;
    throw error;
  }
}

/** Also idempotent: deleting a like that is not there removes zero rows and reports
 * success, so the counter cannot be driven below zero by repeated unlikes (the
 * `like_count >= 0` check constraint is the backstop if it ever were). */
export async function unlikePostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string
): Promise<ActionResult> {
  if (!isUuidLike(postId)) return { error: "That post couldn't be found." };
  const { error } = await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", userId);
  if (error) return { error: "Couldn't save that. Please try again." };
  return {};
}

export async function unlikePost(postId: string): Promise<ActionResult> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  const supabase = await createClient();
  return unlikePostForUser(supabase, session.userId!, postId);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

/**
 * Files a report about a post into the EXISTING `message_reports` queue (extended with
 * `post_id` by migration 0058, exactly as migration 0035 extended it with
 * `recommendation_id`). Not a new table, so it inherits the review states, the RLS, and —
 * critically — the admin surface that already reads it.
 *
 * `reported_user_id` is resolved from the post's own `author_id` rather than taken from
 * the caller: a client-supplied value would let anyone file a report naming an
 * uninvolved student as the author of content they never wrote.
 */
export async function reportPostForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
  postId: string,
  reason: string
): Promise<ActionResult> {
  if (!isUuidLike(postId)) return { error: "That post couldn't be found." };

  const { data: post } = await supabase.from("posts").select("id, author_id").eq("id", postId).maybeSingle();
  if (!post) return { error: "That post is no longer available." };

  const { reason: cleanReason } = validatePostReport({
    reporterId: userId,
    reportedUserId: (post as Pick<Post, "id" | "author_id">).author_id,
    reason,
  });

  const { error } = await supabase.from("message_reports").insert({
    reporter_id: userId,
    reported_user_id: (post as Pick<Post, "id" | "author_id">).author_id,
    post_id: post.id,
    reason: cleanReason,
  });
  if (error) return { error: "Couldn't submit that report." };
  return {};
}

export async function reportPost(postId: string, reason: string): Promise<ActionResult> {
  assertSocialFeedEnabled();
  const session = await requireUser();
  const userId = session.userId!;
  try {
    await assertWithinRateLimit(userId, "report_post", RATE_LIMITS.report_post, await resolveLocale());
    const supabase = await createClient();
    return await reportPostForUser(supabase, userId, postId, reason);
  } catch (error) {
    const handled = toActionResult(error);
    if (handled) return handled;
    throw error;
  }
}

// Moderator enforcement (removing / restoring a reported post) deliberately does NOT
// live in this file. It runs through the admin client and belongs next to `requireAdmin`,
// so it sits in app/(app)/admin/actions.ts alongside `updateReportReview`. Keeping it out
// of here also keeps this module — the student-facing write path — importable by nothing
// under app/, which is one of the layers that makes the feature provably unreachable
// (see __tests__/social/posts-hidden.test.ts).
