import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Activity, Database } from "@/types/database";

/**
 * Resolves each activity's linked opportunity title for display, since `activities` has
 * no denormalized text column for it (unlike every `organization_id` field, which reuses
 * the row's existing `organization` text). The resolved title is attached as
 * `opportunity_title`, a display-only field the edit form binds to — `ActivitySchema`
 * strips it on save (Zod objects drop unknown keys), so only `opportunity_id` ever
 * persists and the catalog stays the single source of truth for the name.
 *
 * One batched `.in()` query for the whole list, never one per row.
 */
export type ActivityWithOpportunityTitle = Activity & { opportunity_title: string | null };

export async function attachOpportunityTitles(
  supabase: SupabaseClient<Database>,
  activities: Activity[]
): Promise<ActivityWithOpportunityTitle[]> {
  const ids = Array.from(new Set(activities.map((a) => a.opportunity_id).filter((id): id is string => Boolean(id))));
  if (ids.length === 0) return activities.map((a) => ({ ...a, opportunity_title: null }));

  const { data } = await supabase.from("opportunities").select("id, title").in("id", ids);
  const titleById = new Map((data ?? []).map((row) => [row.id, row.title]));

  return activities.map((a) => ({ ...a, opportunity_title: a.opportunity_id ? (titleById.get(a.opportunity_id) ?? null) : null }));
}
