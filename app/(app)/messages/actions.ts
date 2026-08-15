"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";
import { isUuidLike } from "@/lib/validation/uuid";
import { getConnectionWith } from "@/lib/social/connections";

const MAX_BODY_LENGTH = 4000;

export async function sendMessage(recipientId: string, body: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const trimmed = body.trim();

  if (!isUuidLike(recipientId)) return { error: "Invalid recipient." };
  if (recipientId === userId) return { error: "You can't message yourself." };
  if (!trimmed) return { error: "Message can't be empty." };
  if (trimmed.length > MAX_BODY_LENGTH) return { error: "Message is too long." };

  const supabase = await createClient();

  // Re-verify server-side, same reasoning as sendConnectionRequest's own comment: a
  // Server Action is directly callable with any argument regardless of what the UI
  // offers, so "no Message button shown for a non-accepted connection" is not the
  // security boundary. RLS (migration 0027) is the real, final gate either way — this
  // check only exists to return a friendly error instead of a raw RLS denial.
  const connection = await getConnectionWith(supabase, userId, recipientId);
  if (!connection || connection.status !== "accepted") {
    return { error: "You can only message accepted connections." };
  }

  const { data: blocked } = await supabase.rpc("is_blocked_between", { user_a: userId, user_b: recipientId });
  if (blocked) return { error: "You can't message this person." };

  const { error } = await supabase.from("messages").insert({ sender_id: userId, recipient_id: recipientId, body: trimmed });
  if (error) return { error: "Couldn't send that message. Please try again." };

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
  const session = await requireUser();
  if (!isUuidLike(otherUserId)) return { error: "Invalid conversation." };
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

  if (error) return { error: "Couldn't update read status." };
  revalidatePath("/messages");
  revalidatePath(`/messages/${otherUserId}`);
  return {};
}

export async function blockUser(userId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  if (!isUuidLike(userId) || userId === session.userId) return { error: "Invalid user." };
  const supabase = await createClient();

  const { error } = await supabase.from("blocked_users").insert({ blocker_id: session.userId!, blocked_id: userId });
  if (error && error.code !== "23505") return { error: "Couldn't block that user." };

  revalidatePath("/messages");
  revalidatePath(`/messages/${userId}`);
  revalidatePath(`/u/${userId}`);
  return {};
}

export async function unblockUser(userId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  if (!isUuidLike(userId)) return { error: "Invalid user." };
  const supabase = await createClient();

  const { error } = await supabase.from("blocked_users").delete().eq("blocker_id", session.userId!).eq("blocked_id", userId);
  if (error) return { error: "Couldn't unblock that user." };

  revalidatePath("/messages");
  revalidatePath(`/messages/${userId}`);
  return {};
}

export async function reportMessage(messageId: string, reportedUserId: string, reason: string): Promise<{ error?: string }> {
  const session = await requireUser();
  if (!isUuidLike(messageId) || !isUuidLike(reportedUserId)) return { error: "Invalid report." };
  const trimmedReason = reason.trim().slice(0, 1000);
  if (!trimmedReason) return { error: "Please describe the issue." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("message_reports")
    .insert({ reporter_id: session.userId!, reported_user_id: reportedUserId, message_id: messageId, reason: trimmedReason });
  if (error) return { error: "Couldn't submit that report." };
  return {};
}
