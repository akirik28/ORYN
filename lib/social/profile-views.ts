import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { shouldRecordProfileView, isBenignDuplicateViewError, aggregateProfileViewCounts, type ProfileViewCounts } from "./profile-views-rules";

export * from "./profile-views-rules";

/**
 * Self-view exclusion and same-day dedup are both DB-enforced (migration 0036's
 * `profile_views_no_self` check + `profile_views_dedup` unique constraint) — this is a
 * thin shell around the pure predicates in lib/social/profile-views-rules.ts.
 */
export async function recordProfileView(supabase: SupabaseClient<Database>, viewedUserId: string, viewerId: string): Promise<void> {
  if (!shouldRecordProfileView(viewedUserId, viewerId)) return;

  const { error } = await supabase.from("profile_views").insert({ viewed_user_id: viewedUserId, viewer_id: viewerId });
  if (error && !isBenignDuplicateViewError(error.code)) {
    console.error("[profile-views] failed to record view", { code: error.code, message: error.message });
  }
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Owner-only aggregate (spec: last 7/30 days, never viewer identity). Uses the
 * request-scoped client — profile_views' "select own profile view rows" policy already
 * scopes this to the caller's own rows, so a plain RLS read is enough; the real privacy
 * commitment ("never expose viewer identity") is that this query only ever selects
 * `viewed_on`, never `viewer_id`, and the pure aggregator it hands off to
 * (aggregateProfileViewCounts) has no way to accept or return one either.
 */
export async function getProfileViewCounts(supabase: SupabaseClient<Database>, userId: string): Promise<ProfileViewCounts> {
  const now = new Date();
  const since30 = new Date(now);
  since30.setDate(since30.getDate() - 30);

  const { data } = await supabase.from("profile_views").select("viewed_on").eq("viewed_user_id", userId).gte("viewed_on", isoDate(since30));
  const viewedOnDates = (data ?? []).map((r) => r.viewed_on);

  return aggregateProfileViewCounts(viewedOnDates, now);
}
