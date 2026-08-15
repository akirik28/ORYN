"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { logEvent } from "@/lib/analytics/log";
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
