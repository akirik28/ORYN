import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { RATE_LIMITS } from "@/lib/security/rate-limit-config";
import {
  EXPORT_TABLES,
  MESSAGE_REPORTS_EXPORT_COLUMNS,
  messagesExportFilter,
  connectionsExportFilter,
  recommendationsExportFilter,
  BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN,
  SKILL_ENDORSEMENTS_EXPORT_OWN_COLUMN,
  PROFILE_VIEWS_EXPORT_COLUMNS,
} from "@/lib/export/tables";

/** Full data export (Phase 12 minor-safe requirement) — every table the student's own
 * data lives in, RLS-scoped via the normal request client (never the admin client).
 * `profiles` is keyed by `id` (it mirrors auth.users 1:1); every other table in
 * EXPORT_TABLES has its own `user_id` column, so one `.eq()` shape covers all of them.
 * Tables where "my data" isn't a plain `user_id` match (messages, connections,
 * blocked_users, message_reports — each keyed by a pair of participant columns) are
 * fetched separately below.
 *
 * `EXPORT_EXCLUDED_TABLES` in lib/export/tables.ts records the one `user_id` table this
 * deliberately skips and why. Read that before adding anything: a table whose RLS has no
 * SELECT policy exports as permanently empty while the response still reports success. */

export async function GET() {
  const session = await requireUser();
  const userId = session.userId!;

  try {
    await assertWithinRateLimit(userId, "export_data", RATE_LIMITS.export_data);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  const supabase = await createClient();

  const [profileResult, ...tableResults] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId),
    ...EXPORT_TABLES.map((table) => supabase.from(table).select("*").eq("user_id", userId)),
  ]);

  // Participant-pair tables: "my data" means rows where I'm one of the two named
  // parties, never a plain user_id match. blocked_users deliberately only exports rows
  // where *I* am the blocker — not rows where I'm blocked_id — matching the same
  // direction-privacy rule as lib/messaging/authorization.ts: this export must not become
  // a side channel for "who blocked me" (RLS wouldn't return those rows anyway, but the
  // query itself is written to only ever ask for the direction that's actually mine).
  // message_reports needs migration 0030's "select own filed reports" policy to return
  // anything at all for a non-admin client — harmless empty result until then, not an
  // error. It also intentionally selects an explicit column list rather than `*`: RLS is
  // row-level, so once a reporter can read their own report row, they'd see every column
  // on it including reviewed_by (an admin's id) and resolution_note — both meant as
  // admin-internal (see the "internal only" placeholder on the moderation UI). Excluding
  // them here is the correct place to draw that line; narrowing the policy itself would
  // also block a future "see my report's status" UI feature that has no reason not to
  // exist.
  const [messagesRes, connectionsRes, blockedRes, reportsRes, recommendationsRes, skillEndorsementsRes, profileViewsRes] = await Promise.all([
    supabase.from("messages").select("*").or(messagesExportFilter(userId)),
    supabase.from("connections").select("*").or(connectionsExportFilter(userId)),
    supabase.from("blocked_users").select("*").eq(BLOCKED_USERS_EXPORT_OWN_BLOCKS_COLUMN, userId),
    supabase
      .from("message_reports")
      .select(MESSAGE_REPORTS_EXPORT_COLUMNS.join(", "))
      .eq("reporter_id", userId),
    supabase.from("recommendations").select("*").or(recommendationsExportFilter(userId)),
    supabase.from("skill_endorsements").select("*").eq(SKILL_ENDORSEMENTS_EXPORT_OWN_COLUMN, userId),
    supabase
      .from("profile_views")
      .select(PROFILE_VIEWS_EXPORT_COLUMNS.join(", "))
      .eq("viewed_user_id", userId),
  ]);

  const payload = {
    exportedAt: new Date().toISOString(),
    userId: session.userId,
    data: {
      profiles: profileResult.data ?? [],
      ...Object.fromEntries(EXPORT_TABLES.map((table, i) => [table, tableResults[i]?.data ?? []])),
      messages: messagesRes.data ?? [],
      connections: connectionsRes.data ?? [],
      blocked_users: blockedRes.data ?? [],
      message_reports: reportsRes.data ?? [],
      recommendations: recommendationsRes.data ?? [],
      skill_endorsements: skillEndorsementsRes.data ?? [],
      profile_views: profileViewsRes.data ?? [],
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="oryn-export-${session.userId}.json"`,
    },
  });
}
