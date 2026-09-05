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
 * `"sent"` covers both a genuine insert and losing migration 0087's unique-index race on a
 * `new_opportunity` notification — the state the caller actually wants (this student has a
 * notification for this match) is satisfied by whichever concurrent call won, same as
 * `lib/deadlines/scan.ts`'s own `upsert(..., { ignoreDuplicates: true })` already treats a
 * duplicate deadline-log row as success, not failure.
 *
 * `"muted"` and `"failed"` used to collapse to the same `false` — the bug this type exists
 * to fix (see createNotification's own docstring below). They stay distinguished all the way
 * up to any caller that counts outcomes, the same "declined vs. errored" split
 * scanStaleOutlooks's own `refused`/`failed` counters already establish for a different job —
 * applied here as a return-value discriminant rather than throw-vs-return, since throwing
 * would change behavior for the five other call sites that only ever discard this promise.
 */
export type NotificationSendOutcome = "sent" | "muted" | "failed";

/**
 * Notifications are always system-generated (Phase 24) — there is deliberately no RLS
 * insert policy allowing a normal request to create one for itself, so this always goes
 * through the admin client, whether the caller is a background job or a user-triggered
 * Server Action that wants to notify that same user as a side effect (e.g. "your weekly
 * plan is ready").
 *
 * Returns which of three things happened, not just whether a row landed. Most callers still
 * only care about the sent/not-sent boundary (`outcome !== "sent"`) and need no changes — a
 * discarded `Promise<NotificationSendOutcome>` still awaits fine where a discarded
 * `Promise<boolean>` did. `lib/deadlines/scan.ts` and `lib/universities/data-change-scan.ts`
 * are the two callers that need the finer distinction: both aggregate many students'
 * outcomes into one job-tracking result, and until this fix, `"muted"` (a student's own
 * legitimate preference — nothing went wrong) and `"failed"` (the insert genuinely errored)
 * were the identical `false` value. Both jobs' routes then hardcoded `errorsEncountered: 0`,
 * reasoning (in a comment that was itself wrong) that nothing here has a per-item failure
 * mode short of the whole run throwing — a real Postgres insert error was silently
 * indistinguishable from a student who muted a category on purpose, and neither ever
 * surfaced as a counted error.
 *
 * Checking `.error` explicitly on the insert is itself a real fix, not just plumbing for the
 * new return type: previously this neither threw nor surfaced a Postgres-level insert error
 * at all — only a thrown exception (e.g. createAdminClient() on a missing secret) was ever
 * caught; a rejected insert (an RLS violation, a constraint) returned normally with `error`
 * set and nothing here ever looked at it.
 */
export async function createNotification(params: {
  userId: string;
  category: NotificationCategory;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<NotificationSendOutcome> {
  try {
    const supabase = createAdminClient();
    // Going-forward only: this stops a FUTURE row for a muted category, never touches one
    // already written. If a student reports "I turned this off and still see old ones," that
    // is expected -- see migration 0090's own header for the live numbers that motivated it.
    if (!(await categoryIsEnabled(supabase, params.userId, params.category))) {
      return "muted";
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
        return "sent";
      }
      console.warn("[notifications] failed to create", { category: params.category, error });
      return "failed";
    }
    return "sent";
  } catch (error) {
    console.warn("[notifications] failed to create", { category: params.category, error });
    return "failed";
  }
}
