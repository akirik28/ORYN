import { notFound } from "next/navigation";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { OpportunityDetailView } from "@/features/opportunities/opportunity-detail-view";

export const metadata = { title: "Opportunity" };

export default async function OpportunityDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireUser();
  const userId = session.userId!;
  const supabase = await createClient();

  const { data: opportunity } = await supabase.from("opportunities").select("*").eq("id", id).single();
  if (!opportunity) notFound();

  await refreshOpportunityMatches(userId);
  const [matchRes, savedRes, sourcesRes] = await Promise.all([
    supabase.from("opportunity_matches").select("*").eq("user_id", userId).eq("opportunity_id", id).maybeSingle(),
    supabase.from("saved_opportunities").select("status").eq("user_id", userId).eq("opportunity_id", id).maybeSingle(),
    supabase.from("opportunity_sources").select("*").eq("opportunity_id", id).order("retrieved_at", { ascending: false }),
  ]);

  return (
    <OpportunityDetailView
      opportunity={opportunity}
      match={matchRes.data}
      savedStatus={savedRes.data?.status ?? null}
      sources={sourcesRes.data ?? []}
    />
  );
}
