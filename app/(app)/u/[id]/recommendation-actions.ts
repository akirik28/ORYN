"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { resolveLocale } from "@/lib/i18n/locale";
import { getConnectionWith } from "@/lib/social/connections";
import { checkRecommendationEligibility } from "@/lib/social/recommendations";
import { assertConnectionsEnabled } from "@/lib/social/connections-feature-flag";
import { isUuidLike } from "@/lib/validation/uuid";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";
import type { RecommendationRelationship } from "@/types/database";

type ActionResult = { error?: string };

const RELATIONSHIPS: readonly RecommendationRelationship[] = ["teacher", "mentor", "teammate", "project_collaborator", "colleague", "other"];
function isRelationship(value: unknown): value is RecommendationRelationship {
  return typeof value === "string" && (RELATIONSHIPS as readonly string[]).includes(value);
}

const RECOMMENDATION_REASON_MESSAGES: Record<string, string> = {
  self: "You can't write a recommendation for yourself.",
  not_connected: "You can only write a recommendation for an accepted connection.",
  blocked: "You can't write a recommendation for this person.",
};

const MAX_BODY_LENGTH = 3000;

/** Re-checks migration 0035's INSERT policy (accepted connection, not blocked, not self)
 * via lib/social/recommendations.ts's pure predicate before the DB constraint would —
 * same "friendly error, not a raw RLS denial" convention as endorsements and messages. */
export async function writeRecommendation(recipientId: string, relationship: RecommendationRelationship, body: string): Promise<ActionResult> {
  assertConnectionsEnabled();
  const session = await requireUser();
  if (!isUuidLike(recipientId)) return { error: "Invalid recipient." };
  if (!isRelationship(relationship)) return { error: "Invalid relationship." };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Write something first." };
  if (trimmed.length > MAX_BODY_LENGTH) return { error: "Keep it under 3000 characters." };

  try {
    await assertWithinRateLimit(session.userId!, "write_recommendation", RATE_LIMITS.write_recommendation, await resolveLocale());
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const isSelf = recipientId === session.userId;
  const supabase = await createClient();
  const connection = isSelf ? null : await getConnectionWith(supabase, session.userId!, recipientId);
  const hasAcceptedConnection = connection?.status === "accepted";
  const { data: blocked } = await supabase.rpc("is_blocked_between", { user_a: session.userId!, user_b: recipientId });

  const reason = checkRecommendationEligibility({ isSelf, hasAcceptedConnection, isBlocked: Boolean(blocked) });
  if (reason) return { error: RECOMMENDATION_REASON_MESSAGES[reason] };

  const { error } = await supabase.from("recommendations").insert({ author_id: session.userId!, recipient_id: recipientId, relationship, body: trimmed });
  if (error) return { error: "Couldn't submit that recommendation." };

  revalidatePath(`/u/${recipientId}`);
  return {};
}

/** RLS's "recipient toggles visibility" policy technically permits updating any column
 * on a row the recipient owns — this action only ever sends `{ status }`, which is what
 * actually enforces "recipient can hide/show but never rewrite the body" (migration
 * 0035's own comment documents this gap between what the policy permits and what the
 * product guarantees). */
export async function setRecommendationVisibility(recommendationId: string, visible: boolean): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(recommendationId)) return { error: "Invalid recommendation." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("recommendations")
    .update({ status: visible ? "visible" : "hidden" })
    .eq("id", recommendationId)
    .eq("recipient_id", session.userId!);
  if (error) return { error: "Couldn't update that." };

  revalidatePath(`/u/${session.userId}`);
  return {};
}

export async function deleteRecommendation(recommendationId: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(recommendationId)) return { error: "Invalid recommendation." };

  const supabase = await createClient();
  const { data: recommendation } = await supabase
    .from("recommendations")
    .select("recipient_id")
    .eq("id", recommendationId)
    .eq("author_id", session.userId!)
    .maybeSingle();

  const { error } = await supabase.from("recommendations").delete().eq("id", recommendationId).eq("author_id", session.userId!);
  if (error) return { error: "Couldn't delete that." };

  if (recommendation) revalidatePath(`/u/${recommendation.recipient_id}`);
  return {};
}

/**
 * `reported_user_id` is resolved from the recommendation's own `author_id` rather than
 * taken from the caller, exactly the shape `reportPostForUser` (lib/social/
 * post-actions.ts) already uses and for the same reason stated there: a client-supplied
 * value would let anyone file a report naming an uninvolved student as the accused party.
 * The lookup uses the admin client, not the caller's RLS-scoped session, deliberately —
 * migration 0035's "select involved recommendations" policy only lets the author or
 * recipient read a row directly, but the person reporting is typically neither: a
 * recommendation reaches a public profile page via getRecommendationsFor's own
 * admin-client read (lib/social/recommendations-query.ts), so most real reporters are
 * third-party viewers whose own RLS-scoped session cannot see this row at all. Only
 * `author_id` is read and used server-side, never returned to the caller.
 */
export async function reportRecommendation(recommendationId: string, reason: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(recommendationId)) return { error: "Invalid report." };
  const trimmedReason = reason.trim().slice(0, 1000);
  if (!trimmedReason) return { error: "Please describe the issue." };

  try {
    await assertWithinRateLimit(session.userId!, "report_message", RATE_LIMITS.report_message, await resolveLocale());
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const admin = tryCreateAdminClient();
  if (!admin) return { error: "Reporting isn't available right now. Please try again shortly." };

  const { data: recommendation } = await admin.from("recommendations").select("author_id").eq("id", recommendationId).maybeSingle();
  if (!recommendation) return { error: "That recommendation is no longer available." };

  const supabase = await createClient();
  const { error } = await supabase.from("message_reports").insert({
    reporter_id: session.userId!,
    reported_user_id: recommendation.author_id,
    recommendation_id: recommendationId,
    reason: trimmedReason,
  });
  if (error) return { error: "Couldn't submit that report." };
  return {};
}
