"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getConnectionWith } from "@/lib/social/connections";
import { checkRecommendationEligibility } from "@/lib/social/recommendations";
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
  const session = await requireUser();
  if (!isUuidLike(recipientId)) return { error: "Invalid recipient." };
  if (!isRelationship(relationship)) return { error: "Invalid relationship." };
  const trimmed = body.trim();
  if (!trimmed) return { error: "Write something first." };
  if (trimmed.length > MAX_BODY_LENGTH) return { error: "Keep it under 3000 characters." };

  try {
    await assertWithinRateLimit(session.userId!, "write_recommendation", RATE_LIMITS.write_recommendation);
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

export async function reportRecommendation(recommendationId: string, reportedUserId: string, reason: string): Promise<ActionResult> {
  const session = await requireUser();
  if (!isUuidLike(recommendationId) || !isUuidLike(reportedUserId)) return { error: "Invalid report." };
  const trimmedReason = reason.trim().slice(0, 1000);
  if (!trimmedReason) return { error: "Please describe the issue." };

  // Security Gate 1 (2026-08-29): own key, not report_message — see rate-limit-config.ts.
  try {
    await assertWithinRateLimit(session.userId!, "report_recommendation", RATE_LIMITS.report_recommendation);
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_reports")
    .insert({ reporter_id: session.userId!, reported_user_id: reportedUserId, recommendation_id: recommendationId, reason: trimmedReason });
  if (error) return { error: "Couldn't submit that report." };
  return {};
}
