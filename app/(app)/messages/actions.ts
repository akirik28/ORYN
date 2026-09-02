"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createNotification } from "@/lib/notifications/create";
import { isUuidLike } from "@/lib/validation/uuid";
import { getConnectionWith } from "@/lib/social/connections";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";
import { assertMessagingEnabled } from "@/lib/messaging/messaging-feature-flag";

const MAX_BODY_LENGTH = 4000;

export async function sendMessage(recipientId: string, body: string): Promise<{ error?: string }> {
  assertMessagingEnabled();
  const session = await requireUser();
  const userId = session.userId!;
  const trimmed = body.trim();
  const t = await getTranslations("messaging.errors");

  if (!isUuidLike(recipientId)) return { error: t("invalidRecipient") };
  if (recipientId === userId) return { error: t("cantMessageSelf") };
  if (!trimmed) return { error: t("emptyMessage") };
  if (trimmed.length > MAX_BODY_LENGTH) return { error: t("messageTooLong") };

  // Abuse guard (thresholds + fail-open rationale: lib/security/rate-limit-config.ts and
  // lib/security/rate-limit.ts). Checked after trivial validation so malformed calls
  // don't burn quota, but before any DB round-trip so a flood can't hammer the
  // connection/block checks below.
  try {
    await assertWithinRateLimit(userId, "send_message", RATE_LIMITS.send_message, await resolveLocale());
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const supabase = await createClient();

  // Re-verify server-side, same reasoning as sendConnectionRequest's own comment: a
  // Server Action is directly callable with any argument regardless of what the UI
  // offers, so "no Message button shown for a non-accepted connection" is not the
  // security boundary. RLS (migration 0027) is the real, final gate either way — this
  // check only exists to return a friendly error instead of a raw RLS denial.
  const connection = await getConnectionWith(supabase, userId, recipientId);
  if (!connection || connection.status !== "accepted") {
    return { error: t("notAccepted") };
  }

  const { data: blocked } = await supabase.rpc("is_blocked_between", { user_a: userId, user_b: recipientId });
  if (blocked) return { error: t("blockedByOther") };

  const { error } = await supabase.from("messages").insert({ sender_id: userId, recipient_id: recipientId, body: trimmed });
  if (error) return { error: t("sendFailed") };

  const profile = await getCurrentProfile();
  await createNotification({
    userId: recipientId,
    category: "message",
    title: `New message from ${profile?.display_name || "a connection"}`,
    link: `/messages/${userId}`,
  });

  revalidatePath("/messages");
  revalidatePath(`/messages/${recipientId}`);
  return {};
}

export async function markConversationRead(otherUserId: string): Promise<{ error?: string }> {
  assertMessagingEnabled();
  const session = await requireUser();
  const t = await getTranslations("messaging.errors");
  if (!isUuidLike(otherUserId)) return { error: t("invalidConversation") };
  const supabase = await createClient();

  // RLS's "recipient marks message read" policy already scopes this to messages the
  // caller received — the .eq("recipient_id", ...) here is redundant with that policy,
  // same "keep the intent readable" convention as removeConnection's own comment.
  const { error } = await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("sender_id", otherUserId)
    .eq("recipient_id", session.userId!)
    .is("read_at", null);

  if (error) return { error: t("readStatusFailed") };
  revalidatePath("/messages");
  revalidatePath(`/messages/${otherUserId}`);
  return {};
}

export async function blockUser(userId: string): Promise<{ error?: string }> {
  assertMessagingEnabled();
  const session = await requireUser();
  const t = await getTranslations("messaging.errors");
  if (!isUuidLike(userId) || userId === session.userId) return { error: t("invalidUser") };
  const supabase = await createClient();

  const { error } = await supabase.from("blocked_users").insert({ blocker_id: session.userId!, blocked_id: userId });
  if (error && error.code !== "23505") return { error: t("blockFailed") };

  revalidatePath("/messages");
  revalidatePath(`/messages/${userId}`);
  revalidatePath(`/u/${userId}`);
  return {};
}

export async function unblockUser(userId: string): Promise<{ error?: string }> {
  assertMessagingEnabled();
  const session = await requireUser();
  const t = await getTranslations("messaging.errors");
  if (!isUuidLike(userId)) return { error: t("invalidUser") };
  const supabase = await createClient();

  const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", session.userId!).eq("blocked_id", userId);
  if (error) return { error: t("unblockFailed") };

  revalidatePath("/messages");
  revalidatePath(`/messages/${userId}`);
  return {};
}

export async function reportMessage(messageId: string, reportedUserId: string, reason: string): Promise<{ error?: string }> {
  assertMessagingEnabled();
  const session = await requireUser();
  const t = await getTranslations("messaging.errors");
  if (!isUuidLike(messageId) || !isUuidLike(reportedUserId)) return { error: t("invalidReport") };
  const trimmedReason = reason.trim().slice(0, 1000);
  if (!trimmedReason) return { error: t("reportReasonRequired") };

  // Abuse guard — see lib/security/rate-limit-config.ts.
  try {
    await assertWithinRateLimit(session.userId!, "report_message", RATE_LIMITS.report_message, await resolveLocale());
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_reports")
    .insert({ reporter_id: session.userId!, reported_user_id: reportedUserId, message_id: messageId, reason: trimmedReason });
  if (error) return { error: t("reportFailed") };
  return {};
}
