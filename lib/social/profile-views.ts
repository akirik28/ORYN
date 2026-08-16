import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Self-view exclusion and same-day dedup are both DB-enforced (migration 0036's
 * `profile_views_no_self` check + `profile_views_dedup` unique constraint) — the
 * `viewedUserId === viewerId` guard here just skips the round-trip for the common case
 * (viewing your own profile), and the 23505 unique-violation on a repeat same-day view
 * is expected, not an error worth logging.
 */
export async function recordProfileView(supabase: SupabaseClient<Database>, viewedUserId: string, viewerId: string): Promise<void> {
  if (viewedUserId === viewerId) return;

  const { error } = await supabase.from("profile_views").insert({ viewed_user_id: viewedUserId, viewer_id: viewerId });
  if (error && error.code !== "23505") {
    console.error("[profile-views] failed to record view", { code: error.code, message: error.message });
  }
}

export interface ProfileViewCounts {
  last7Days: number;
  last30Days: number;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Owner-only aggregate (spec: last 7/30 days, never viewer identity). Uses the
 * request-scoped client — profile_views' "select own profile view rows" policy already
 * scopes this to the caller's own rows, so a plain RLS read is enough; the real privacy
 * commitment ("never expose viewer identity") is this function only ever returning a
 * count, not which rows it read to get there.
 */
export async function getProfileViewCounts(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileViewCounts> {
  const now = new Date();
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - 30);
  const since7 = new Date(now);
  since7.setDate(since7.getDate() - 7);

  const { data } = await supabase.from("profile_views").select("viewed_on").eq("viewed_user_id", userId).gte("viewed_on", isoDate(since30));
  const rows = data ?? [];
  const since7Str = isoDate(since7);

  return {
    last7Days: rows.filter((r) => r.viewed_on >= since7Str).length,
    last30Days: rows.length,
  };
}
