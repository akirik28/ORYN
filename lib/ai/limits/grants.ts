import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Shared read for both of this session's per-user spend gates — selectModelForUser's degrade
 * decision (./budget.ts) and getMonthlyQuota's hard monthly stop (../monthly-quota.ts). A
 * grant (migration 0096, quota_grants) is an admin top-up or reset: "a student who
 * legitimately exhausted their month has no recourse today" (oryn-a7, 2026-09-02). Read by
 * both gates, not just one, on purpose — a "reset" that still left a student stuck on the
 * degraded model because only the hard stop knew about it would be half a reset, and this
 * codebase has spent tonight finding exactly this shape of gap (two mechanisms reading the
 * same underlying fact through separate, silently-diverging paths).
 *
 * Takes whatever SupabaseClient the caller already has in scope rather than constructing its
 * own: selectModelForUser already holds an admin client (quota_grants has no RLS gap for it
 * either way); getMonthlyQuota holds the student's own request-scoped client, which CAN read
 * this table under its own row via quota_grants' "select own quota grants" policy — the same
 * shape ai_usage's own "select own ai usage" policy already establishes. One function, two
 * different privilege levels, both correct for this table's RLS.
 *
 * Scoped to the calendar month like every other figure these two gates already read — a
 * grant made last month never reduces this month's spend, the same way spend itself resets
 * every month. A read failure returns 0 (no grant applied), never a fabricated amount in
 * either direction — "the check itself being unavailable must never make things stricter OR
 * more lenient than they'd otherwise be" is the same fail-open reasoning both callers already
 * apply to their own primary ai_usage read.
 */
export async function getMonthlyGrantsUsd(client: SupabaseClient<Database>, userId: string, sinceIso: string): Promise<number> {
  const { data, error } = await client.from("quota_grants").select("amount_usd").eq("user_id", userId).gte("created_at", sinceIso);
  if (error || !data) return 0;
  return data.reduce((sum, row) => sum + row.amount_usd, 0);
}
