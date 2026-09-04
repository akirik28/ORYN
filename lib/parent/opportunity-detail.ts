import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Opportunity } from "@/types/database";

/**
 * B6 (2026-09-04) — parent-safe opportunity detail: the plain catalog row only, nothing
 * personalized, this round.
 *
 * Deliberately does NOT read `opportunity_matches` for this child, unlike
 * lib/parent/panel-data.ts's loadParentOpportunities (which does, directly, relying on that
 * table's own RLS policy). At the time this file was written that looked like a live
 * inconsistency with B3c's own stated rule for the same table (its comment implied all
 * child-specific data needs a get_parent_child_* RPC) — flagged to CEO rather than resolved
 * unilaterally.
 *
 * CEO resolved it (2026-09-04): `panel-data.ts` is correct, and B3c's comment overstated the
 * rule. The real rule is narrower than "all child data via RPC" — it's "student-written free
 * text never reaches a parent directly." `opportunity_matches` (and `profile_scores`,
 * `profile_score_snapshots`) get real parent-scoped RLS policies specifically because every
 * column in them is a foreign key, a system-computed score, or a system code (`eligibility_notes`
 * is a jsonb list of codes since migration 0115, not free text either) — there is no
 * student-authored text to hide, so there's nothing an RPC's column whitelist would need to
 * exclude. The RPC requirement applies to tables that DO carry student-written text:
 * `profiles.advisor_instructions`, `target_universities.notes`, `applications.notes`.
 *
 * Reading `opportunity_matches` directly for this child (mirroring panel-data.ts's own
 * pattern) would therefore be safe to add here. Left out of this pass on purpose — CEO's own
 * call, not required this round — rather than expanding scope on top of an unrelated task.
 */
export async function loadParentSafeOpportunityDetail(supabase: SupabaseClient<Database>, opportunityId: string): Promise<Opportunity | null> {
  const { data, error } = await supabase.from("opportunities").select("*").eq("id", opportunityId).maybeSingle();
  if (error) {
    console.error("[parent/opportunity-detail] failed to load opportunity", { opportunityId, error: error.message });
    return null;
  }
  return data;
}
