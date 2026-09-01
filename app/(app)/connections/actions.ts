"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { resolveLocale } from "@/lib/i18n/locale";
import { createNotification } from "@/lib/notifications/create";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";
import { canRespondToConnectionRequest } from "@/lib/social/connection-transitions";

export async function sendConnectionRequest(recipientId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  const t = await getTranslations("connections.errors");
  if (recipientId === userId) return { error: t("cantConnectSelf") };

  // Abuse guard — see lib/security/rate-limit-config.ts.
  try {
    await assertWithinRateLimit(userId, "send_connection_request", RATE_LIMITS.send_connection_request, await resolveLocale());
  } catch (error) {
    if (error instanceof RateLimitExceededError) return { error: error.message };
    throw error;
  }

  const supabase = await createClient();

  // Re-check server-side that the target is actually public right now — never trust that
  // the UI only shows Connect on a public profile page (a Server Action is directly
  // callable with any argument). Without this, a cold request to a private profile still
  // created a 'pending' row, which alone was enough to leak basic info through
  // public_profiles' connection carve-out — see migration 0024.
  const { data: recipientIsPublic } = await supabase.from("public_profiles").select("id").eq("id", recipientId).maybeSingle();
  if (!recipientIsPublic) return { error: t("notPublic") };

  const { error } = await supabase.from("connections").insert({ requester_id: userId, recipient_id: recipientId });

  if (error) {
    // Unique violation on (low_id, high_id) — a request already exists in either direction.
    if (error.code === "23505") return { error: t("alreadyExists") };
    return { error: t("sendFailed") };
  }

  const profile = await getCurrentProfile();
  await createNotification({
    userId: recipientId,
    category: "connection",
    title: `${profile?.display_name || "A student"} wants to connect`,
    link: `/u/${userId}`,
  });

  revalidatePath("/connections");
  return {};
}

export async function respondToConnectionRequest(connectionId: string, accept: boolean): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();
  const t = await getTranslations("connections.errors");

  // Re-verify server-side that this request is still pending and actually addressed to
  // the caller — never trust that the UI only offered Accept/Decline on a genuinely
  // pending, incoming request (a Server Action is directly callable with any argument).
  // RLS already restricts *who* can write here (recipient_id = auth.uid()); this adds
  // the status half of the check, which RLS knows nothing about.
  const { data: existing } = await supabase.from("connections").select("status, recipient_id").eq("id", connectionId).maybeSingle();
  if (!existing || !canRespondToConnectionRequest({ status: existing.status, recipientId: existing.recipient_id }, session.userId!)) {
    return { error: t("updateFailed") };
  }

  const { data: updated, error } = await supabase
    .from("connections")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("status", "pending") // belt-and-suspenders against a race between two concurrent calls
    .select("requester_id")
    .single();

  if (error) return { error: t("updateFailed") };

  if (accept && updated) {
    const profile = await getCurrentProfile();
    await createNotification({
      userId: updated.requester_id,
      category: "connection",
      title: `${profile?.display_name || "A student"} accepted your connection request`,
      link: `/u/${session.userId}`,
    });
  }

  revalidatePath("/connections");
  return {};
}

/** Withdraw a pending request you sent, or remove an existing connection — either party,
 * either direction. RLS ("either party deletes a connection") is the real gate; the
 * userId in the query below is redundant but keeps the intent readable. */
export async function removeConnection(connectionId: string): Promise<{ error?: string }> {
  await requireUser();
  const supabase = await createClient();
  const t = await getTranslations("connections.errors");

  const { error } = await supabase.from("connections").delete().eq("id", connectionId);
  if (error) return { error: t("removeFailed") };

  revalidatePath("/connections");
  return {};
}
