import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { isUniqueViolation, isUndefinedColumnError } from "@/lib/supabase/errors";
import type { NotificationCategory } from "@/types/database";

/** Name of migration 0087's partial unique index — see that migration's own comment for why
 * it's scoped to `new_opportunity` only, and this file's own comment below for why a plain
 * insert plus this check is the mechanism instead of `ON CONFLICT`/`upsert`. */
const NEW_OPPORTUNITY_DEDUPE_INDEX = "notifications_new_opportunity_link_unique_idx";

/** Migration 0090's seven columns, one per NotificationCategory — see that migration's own
 * comment for why they're flat profiles columns rather than a separate table, and
 * docs/notification-settings-gap-2026-09-02.md for why this is the enforcement point (the
 * one function every category already goes through) rather than one check per call site. */
const PREFERENCE_COLUMN_FOR_CATEGORY: Record<NotificationCategory, string> = {
  deadline: "notify_deadline",
  new_opportunity: "notify_new_opportunity",
  weekly_plan: "notify_weekly_plan",
  profile_update: "notify_profile_update",
  university_data_changed: "notify_university_data_changed",
  connection: "notify_connection",
  message: "notify_message",
};

/** All seven in one literal select rather than one dynamic column per call — a single small
 * boolean row costs nothing extra to fetch in full, and it means whichever of the seven a
 * pre-migration database is missing, they're all missing together (added in one migration),
 * so one query degrades cleanly instead of needing a different shape per category. */
const NOTIFICATION_PREFERENCE_COLUMNS =
  "notify_deadline, notify_new_opportunity, notify_weekly_plan, notify_profile_update, notify_university_data_changed, notify_connection, notify_message";

/**
 * Fails open on every branch except one: a real, successfully-read `false`. Migration 0090
 * unapplied (today's actual state on most databases this runs against) reads as "enabled" via
 * `isUndefinedColumnError`, matched against the shared `notify_` prefix rather than one exact
 * column name — Postgres/PostgREST only ever names whichever of the seven it reached first,
 * and any one of the seven missing means all seven are (they land together). Any other read
 * failure also fails open and logs, on the same reasoning `createNotification` itself already
 * uses for a write failure it can't classify: a notification a student happened to have muted
 * arriving anyway is recoverable (they see it once, can re-mute); a real one silently
 * swallowed by an unrelated read hiccup is not, and there is no way to tell them apart later.
 */
async function categoryIsEnabled(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  category: NotificationCategory,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select(NOTIFICATION_PREFERENCE_COLUMNS)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    if (!isUndefinedColumnError(error, "notify_")) {
      console.warn("[notifications] preference check failed, defaulting to enabled", { userId, category, error });
    }
    return true;
  }
  if (!data) return true;

  const value = (data as unknown as Record<string, boolean | null>)[PREFERENCE_COLUMN_FOR_CATEGORY[category]];
  return value ?? true;
}

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
 *
 * Also returns `false` — the same "no notification landed" value a failed insert already
 * returns — when the student has muted this category (migration 0090). Every pre-existing
 * caller already treats a discarded/checked `false` as "nothing to do," so a muted category
 * needs no new handling at any of the seven call sites; see categoryIsEnabled above for the
 * degrade behavior when 0090 hasn't applied yet.
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
    // Going-forward only: this stops a FUTURE row for a muted category, never touches one
    // already written. If a student reports "I turned this off and still see old ones," that
    // is expected -- see migration 0090's own header for the live numbers that motivated it.
    if (!(await categoryIsEnabled(supabase, params.userId, params.category))) {
      return false;
    }
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
