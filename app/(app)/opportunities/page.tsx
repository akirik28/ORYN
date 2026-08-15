import { Compass } from "lucide-react";
import { requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { OpportunityCard } from "@/features/opportunities/opportunity-card";
import { integrationStatus } from "@/lib/env";
import { PageHeader } from "@/components/oryn/page-header";
import { EmptyState } from "@/components/oryn/empty-state";

export const metadata = { title: "Opportunities" };

export default async function OpportunitiesPage() {
  const session = await requireUser();
  const userId = session.userId!;

  await refreshOpportunityMatches(userId);

  const supabase = await createClient();
  const [matchesRes, savedRes] = await Promise.all([
    supabase
      .from("opportunity_matches")
      .select("*")
      .eq("user_id", userId)
      .eq("eligible", true)
      .order("match_score", { ascending: false })
      .limit(30),
    supabase.from("saved_opportunities").select("opportunity_id, status").eq("user_id", userId),
  ]);

  const matches = matchesRes.data ?? [];
  const opportunityIds = matches.map((m) => m.opportunity_id);
  const { data: opportunities } = opportunityIds.length
    ? await supabase.from("opportunities").select("*").in("id", opportunityIds)
    : { data: [] };

  const opportunityById = new Map((opportunities ?? []).map((o) => [o.id, o]));
  const statusById = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  const cards = matches
    .map((match) => ({ match, opportunity: opportunityById.get(match.opportunity_id) }))
    .filter((c) => c.opportunity);

  return (
    <div className="space-y-6">
      <PageHeader title="Opportunities" description="Personalized matches — highest-value first." />

      {cards.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {cards.map(({ match, opportunity }) => (
            <OpportunityCard
              key={match.opportunity_id}
              opportunity={opportunity!}
              matchScore={match.match_score}
              reasonCodes={match.reason_codes as string[]}
              initialStatus={statusById.get(match.opportunity_id) ?? null}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Compass}
          title="No matches yet"
          description={
            integrationStatus.tavily
              ? "Opportunities are discovered on a schedule. Check back soon, or complete more of your profile so Oryn knows what to look for."
              : "Opportunity discovery isn't configured yet in this environment (needs TAVILY_API_KEY). See API_SETUP.md."
          }
        />
      )}
    </div>
  );
}
