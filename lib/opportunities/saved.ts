import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity, SavedOpportunity } from "@/types/database";

export interface SavedOpportunityWithDetails extends SavedOpportunity {
  opportunity: Opportunity | null;
}

/**
 * The Saved page's opportunities half (founder request, 2026-09-01: "kaydedilenler" —
 * a page listing saved opportunities and universities together). Deliberately excludes
 * `not_interested` at the query level, not just in the UI: that status is the student's
 * explicit rejection, the opposite of "saved," and showing it on a page titled Saved would
 * misrepresent their own decision back to them. `applied` stays included — applying to
 * something doesn't mean you stop being interested in it, and the parallel `withdrawn`
 * exclusion on the universities side (getTargetUniversitiesWithDetails's caller) is the
 * same rule applied to the other domain: hide only the status that means "I took this off
 * my list," not every status that isn't the literal word "saved."
 *
 * Same shape as lib/universities/queries.ts's getTargetUniversitiesWithDetails — one query
 * for the join rows, one batched `in()` for the opportunities themselves, joined in memory
 * — rather than a Supabase embedded select, for the same reason that file gives: keeps the
 * two tables' own RLS policies doing the actual authorization instead of a join hiding
 * which policy is in effect.
 */
export async function getSavedOpportunitiesWithDetails(
  supabase: SupabaseClient<Database>,
  userId: string,
  limit = 200
): Promise<SavedOpportunityWithDetails[]> {
  const { data: saved } = await supabase
    .from("saved_opportunities")
    .select("*")
    .eq("user_id", userId)
    .neq("status", "not_interested")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (!saved || saved.length === 0) return [];

  const opportunityIds = [...new Set(saved.map((s) => s.opportunity_id))];
  const { data: opportunities } = await supabase.from("opportunities").select("*").in("id", opportunityIds);
  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));

  return saved.map((s) => ({ ...s, opportunity: opportunityById.get(s.opportunity_id) ?? null }));
}
