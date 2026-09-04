import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity } from "@/types/database";

/**
 * B6 (2026-09-04) — parent-safe opportunity detail: the plain catalog row only, nothing
 * personalized.
 *
 * Deliberately does NOT read `opportunity_matches` for this child, unlike
 * lib/parent/panel-data.ts's loadParentOpportunities (which does, directly, relying on that
 * table's own RLS policy rather than a get_parent_child_* RPC — its own comment calls this
 * "correct, not a shortcut"). That's a real, live inconsistency with B3c's own stated rule
 * for this same table (features/parent/opportunity-catalog-browser.tsx's comment: a child's
 * opportunity_matches row may only reach a parent through "the whitelisted get_parent_child_*
 * RPCs CEO named as the one route child-specific info is allowed to travel through") — two
 * lanes reasoned about the identical data and landed on different mechanisms. Not this
 * module's call to make: sidestepped entirely by not showing match/eligibility data here at
 * all, matching the stricter of the two readings rather than picking one. Flagged to CEO
 * separately, not resolved here.
 */
export async function loadParentSafeOpportunityDetail(supabase: SupabaseClient<Database>, opportunityId: string): Promise<Opportunity | null> {
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", opportunityId).maybeSingle();
  if (error) {
    console.error("[parent/opportunity-detail] failed to load opportunity", { opportunityId, error: error.message });
    return null;
  }
  return data;
}
