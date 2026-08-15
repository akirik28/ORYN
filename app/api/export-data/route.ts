import { NextResponse } from "next/server";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { assertWithinRateLimit, RateLimitExceededError } from "@/lib/security/rate-limit";
import { EXPORT_TABLES } from "@/lib/export/tables";

/** Full data export (Phase 12 minor-safe requirement) — every table the student's own
 * data lives in, RLS-scoped via the normal request client (never the admin client).
 * `profiles` is keyed by `id` (it mirrors auth.users 1:1); every other table in
 * EXPORT_TABLES has its own `user_id` column, so one `.eq()` shape covers all of them.
 * Tables where "my data" isn't a plain `user_id` match (messages, connections,
 * blocked_users, message_reports — each keyed by a pair of participant columns) are
 * fetched separately below. */

export async function GET() {
  const session = await requireUser();
  const userId = session.userId!;

  try {
    await assertWithinRateLimit(userId, "export_data", { maxCalls: 5, windowMinutes: 60 });
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
  // message_reports currently has no self-select RLS policy for the reporter (insert-only
  // by design pre-moderation — see migration 0027), so this returns empty until that
  // policy exists; harmless no-op until then, not an error.
  const [messagesRes, connectionsRes, blockedRes, reportsRes] = await Promise.all([
    supabase.from("messages").select("*").or(`sender_id.eq.${userId},recipient_id.eq.${userId}`),
    supabase.from("connections").select("*").or(`requester_id.eq.${userId},recipient_id.eq.${userId}`),
    supabase.from("blocked_users").select("*").eq("blocker_id", userId),
    supabase.from("message_reports").select("*").eq("reporter_id", userId),
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
    },
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="oryn-export-${session.userId}.json"`,
    },
  });
}
