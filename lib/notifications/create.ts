import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { NotificationCategory } from "@/types/database";

/**
 * Notifications are always system-generated (Phase 24) — there is deliberately no RLS
 * insert policy allowing a normal request to create one for itself, so this always goes
 * through the admin client, whether the caller is a background job or a user-triggered
 * Server Action that wants to notify that same user as a side effect (e.g. "your weekly
 * plan is ready").
 *
 * Returns whether the write actually landed. Every pre-existing caller ignores the return
 * value and keeps working exactly as before (a discarded `Promise<boolean>` still awaits
 * fine where a discarded `Promise<void>` did) — added for lib/deadlines/scan.ts, which
 * needs to know a notification really landed before it logs the deadline as "already
 * notified" (see deadline_notification_log, migration 0075): logging on a failed write
 * would silently and permanently suppress a reminder the student never actually received.
 * Previously this neither threw nor surfaced a Postgres-level insert error at all — only a
 * thrown exception (e.g. createAdminClient() on a missing secret) was ever caught; a
 * rejected insert (an RLS violation, a constraint) returned normally with `error` set and
 * nothing here ever looked at it. Checking `.error` explicitly is a real fix, not just
 * plumbing for the new return type.
 */
export async function createNotification(params: {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase.from("notifications").insert({
      user_id: params.userId,
      category: params.category,
      title: params.title,
      body: params.body ?? null,
      link: params.link ?? null,
    });
    if (error) {
      console.warn("[notifications] failed to create", { category: params.category, error });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[notifications] failed to create", { category: params.category, error });
    return false;
  }
}
