"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/analytics/log";
import { browseOpportunities, type OpportunityBrowseFilters, type OpportunityBrowseRow } from "@/lib/opportunities/browse";
import type { SavedOpportunityStatus } from "@/types/database";

export async function setOpportunityStatus(params: {
  opportunityId: string;
  status: SavedOpportunityStatus;
  notInterestedReason?: string;
}): Promise<{ error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  const { error } = await supabase.from("saved_opportunities").upsert(
    {
      user_id: session.userId!,
      opportunity_id: params.opportunityId,
      status: params.status,
      not_interested_reason: params.notInterestedReason ?? null,
    },
    { onConflict: "user_id,opportunity_id" }
  );

  if (error) return { error: "Couldn't update that opportunity. Please try again." };

  if (params.status === "saved" || params.status === "applied") {
    await logEvent(session.userId!, params.status === "saved" ? "opportunity_saved" : "opportunity_applied", {
      opportunityId: params.opportunityId,
    });
  }

  revalidatePath("/opportunities");
  return {};
}

/**
 * One more page of Browse results, for the infinite-scroll grid
 * (features/opportunities/opportunity-browse-grid.tsx).
 *
 * Founder direction 2026-08-30: replace numbered paging ("Page 1 of 12") with a list that
 * keeps loading as you scroll. This deliberately reuses `browseOpportunities` unchanged
 * rather than adding a second query path — the filtering, eligibility resolution and
 * ordering rules stay in exactly one place, so an infinitely-scrolled page can never drift
 * from what page 2 of the old pager would have shown.
 *
 * Returns plain serializable rows plus each row's saved status, which the client grid needs
 * to render `initialStatus` and which the server page already resolves for page 1.
 */
export async function loadMoreOpportunities(
  filters: OpportunityBrowseFilters,
  page: number
): Promise<{ rows: OpportunityBrowseRow[]; statuses: Record<string, SavedOpportunityStatus>; hasMore: boolean; error?: string }> {
  const session = await requireUser();
  const supabase = await createClient();

  try {
    const { rows, total, pageSize } = await browseOpportunities(supabase, session.userId!, filters, page);
    const ids = rows.map((r) => r.opportunity.id);
    const statuses: Record<string, SavedOpportunityStatus> = {};
    if (ids.length > 0) {
      const { data } = await supabase
        .from("saved_opportunities")
        .select("opportunity_id, status")
        .eq("user_id", session.userId!)
        .in("opportunity_id", ids);
      for (const row of data ?? []) statuses[row.opportunity_id] = row.status;
    }
    return { rows, statuses, hasMore: page * pageSize < total };
  } catch {
    // The grid keeps what it already showed and surfaces a retry — a failed fetch must
    // never blank out results the student is already reading.
    return { rows: [], statuses: {}, hasMore: true, error: "Couldn't load more opportunities." };
  }
}
