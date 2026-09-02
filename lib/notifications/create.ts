import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isUniqueViolation } from "@/lib/supabase/errors";
import type { NotificationCategory } from "@/types/database";

/** Name of migration 0087's partial unique index — see that migration's own comment for why
 * it's scoped to `new_opportunity` only, and this file's own comment below for why a plain
 * insert plus this check is the mechanism instead of `ON CONFLICT`/`upsert`. */
const NEW_OPPORTUNITY_DEDUPE_INDEX = "notifications_new_opportunity_link_unique_idx";

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
 *
 * A `new_opportunity` insert that loses migration 0087's unique-index race returns `true`,
 * not `false` — the state the caller actually wants (this student has a notification for
 * this match) is satisfied by whichever concurrent call won, same as
 * `lib/deadlines/scan.ts`'s own `upsert(..., { ignoreDuplicates: true })` already treats a
 * duplicate deadline-log row as success, not failure. This works identically whether or not
 * migration 0087 is applied: unapplied, no such constraint exists, so no insert can ever
 * violate it and this branch is simply never reached — today's exact behavior, unchanged.
 * Applied, a genuine race (two `refreshOpportunityMatches` calls landing within the same
 * window — the documented cause of the 12-row live duplicate this migration exists to close,
 * see docs/notification-center-live-verification-2026-09-02.md) now loses cleanly instead of
 * writing a second identical row. `notifyNewlyEligibleMatches`'s own pre-flight `SELECT`
 * still runs first and is kept deliberately — it avoids a pointless insert attempt in the
 * ordinary, non-racing case; this catch is the backstop for the case it can't close on its
 * own, not a replacement for it.
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
      if (isUniqueViolation(error, NEW_OPPORTUNITY_DEDUPE_INDEX)) {
        return true;
      }
      console.warn("[notifications] failed to create", { category: params.category, error });
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[notifications] failed to create", { category: params.category, error });
    return false;
  }
}
