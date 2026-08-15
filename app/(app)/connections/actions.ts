"use server";

import { revalidatePath } from "next/cache";
import { requireUser, getCurrentProfile } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { createNotification } from "@/lib/notifications/create";

export async function sendConnectionRequest(recipientId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const userId = session.userId!;
  if (recipientId === userId) return { error: "You can't connect with yourself." };

  const supabase = await createClient();
  const { error } = await supabase.from("connections").insert({ requester_id: userId, recipient_id: recipientId });

  if (error) {
    // Unique violation on (low_id, high_id) — a request already exists in either direction.
    if (error.code === "23505") return { error: "A connection request already exists between you two." };
    return { error: "Couldn't send that request. Please try again." };
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

  const { data: updated, error } = await supabase
    .from("connections")
    .update({ status: accept ? "accepted" : "declined", responded_at: new Date().toISOString() })
    .eq("id", connectionId)
    .select("requester_id")
    .single();

  if (error) return { error: "Couldn't update that request." };

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

  const { error } = await supabase.from("connections").delete().eq("id", connectionId);
  if (error) return { error: "Couldn't remove that." };

  revalidatePath("/connections");
  return {};
}
