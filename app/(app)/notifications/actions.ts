"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(notificationId: string): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't update notification." };
  revalidatePath("/", "layout");
  return {};
}

export async function markAllNotificationsRead(): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", session.userId!)
    .is("read_at", null);

  if (error) return { error: "Couldn't update notifications." };
  revalidatePath("/", "layout");
  return {};
}

/**
 * Marks a specific set of notifications read in one write — for features/notifications/
 * group.ts's grouped cards, where activating the card (or its own "mark read" control) must
 * mark every member notification, not just one. A plain id list rather than a category-scoped
 * action: correct regardless of which notifications actually make up a given group (grouping
 * only covers the unread subset of one category, per group.ts's own comment, so "every unread
 * row in this category" and "every id in this group" happen to coincide today, but this stays
 * correct if that ever changes without needing to know why).
 *
 * `.in("id", ...)` scoped by `.eq("user_id", ...)` the same way the single-id and mark-all
 * actions above are — RLS already enforces this independently, but matching their explicit
 * scoping keeps all three actions reading the same at a glance.
 */
export async function markNotificationsRead(notificationIds: string[]): Promise<{ error?: string }> {
  if (notificationIds.length === 0) return {};
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .in("id", notificationIds)
    .eq("user_id", session.userId!);

  if (error) return { error: "Couldn't update notifications." };
  revalidatePath("/", "layout");
  return {};
}
