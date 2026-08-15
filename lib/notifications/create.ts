import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationCategory } from "@/types/database";

/**
 * Notifications are always system-generated (Phase 24) — there is deliberately no RLS
 * insert policy allowing a normal request to create one for itself, so this always goes
 * through the admin client, whether the caller is a background job or a user-triggered
 * Server Action that wants to notify that same user as a side effect (e.g. "your weekly
 * plan is ready").
 */
export async function createNotification(params: {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    const supabase = createAdminClient();
    await supabase.from("notifications").insert({
      user_id: params.userId,
      category: params.category,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    });
  } catch (error) {
    console.warn("[notifications] failed to create", { category: params.category, error });
  }
}
