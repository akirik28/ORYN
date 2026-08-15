import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeeklyPlan, getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import type { ProfileDimension } from "@/types/database";

export const metadata = { title: "Home" };

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const profile = await getCurrentProfile();
  const supabase = await createClient();

  await refreshOpportunityMatches(userId);

  const [scoresRes, snapshotsRes, recommendationRes, targetUniversities, upcomingDeadlines, matchesRes] = await Promise.all([
    supabase.from("profile_scores").select("*").eq("user_id", userId),
    supabase
      .from("profile_score_snapshots")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(2),
    supabase
      .from("ai_recommendations")
      .select("*")
      .eq("user_id", userId)
      .in("recommendation_class", ["avoid_for_now", "deprioritize"])
      .is("user_response", null)
      .order("shown_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    getTargetUniversitiesWithDetails(supabase, userId, 3),
    getUpcomingDeadlines(supabase, userId, 4),
    supabase.from("opportunity_matches").select("opportunity_id, match_score").eq("user_id", userId).eq("eligible", true).order("match_score", { ascending: false }).limit(2),
  ]);

  const scores = scoresRes.data ?? [];
  const previousSnapshot = snapshotsRes.data?.[1] ?? null;
  const trend =
    previousSnapshot && profile?.profile_strength_score != null
      ? profile.profile_strength_score - previousSnapshot.overall_score
      : null;

  const biggestGap = [...scores].sort((a, b) => a.score - b.score)[0] ?? null;

  let biggestImprovement: { dimension: ProfileDimension; delta: number } | null = null;
  if (previousSnapshot) {
    const deltas = scores
      .map((s) => ({
        dimension: s.dimension,
        delta: s.score - ((previousSnapshot.dimension_scores as Record<string, number>)[s.dimension] ?? s.score),
      }))
      .filter((d) => d.delta > 0)
      .sort((a, b) => b.delta - a.delta);
    biggestImprovement = deltas[0] ?? null;
  }

  let weeklyPlan = await getCurrentWeeklyPlan(userId);
  let planError: "not_configured" | "failed" | null = null;
  if (!weeklyPlan) {
    try {
      weeklyPlan = await getOrCreateWeeklyPlan(userId);
    } catch (error) {
      planError = error instanceof AIProviderNotConfiguredError ? "not_configured" : "failed";
      console.error("[dashboard] failed to auto-generate weekly plan", error);
    }
  }

  const opportunityMatches = matchesRes.data ?? [];
  const opportunityIds = opportunityMatches.map((m) => m.opportunity_id);
  const { data: matchedOpportunities } = opportunityIds.length
    ? await supabase.from("opportunities").select("id, title").in("id", opportunityIds)
    : { data: [] };
  const titleById = new Map((matchedOpportunities ?? []).map((o) => [o.id, o.title]));
  const opportunityPreview = opportunityMatches
    .map((m) => ({ title: titleById.get(m.opportunity_id), matchScore: m.match_score }))
    .filter((o): o is { title: string; matchScore: number } => Boolean(o.title));

  const displayName = profile?.display_name || profile?.first_name || "there";

  return (
    <DashboardView
      displayName={displayName}
      greeting={greeting()}
      score={profile?.profile_strength_score ?? null}
      trend={trend}
      biggestGap={biggestGap ? { dimension: biggestGap.dimension, score: biggestGap.score } : null}
      biggestImprovement={biggestImprovement}
      weeklyPlan={weeklyPlan}
      planError={planError}
      avoidRecommendation={recommendationRes.data ? { title: recommendationRes.data.title, reason: recommendationRes.data.reason ?? "" } : null}
      upcomingDeadlines={upcomingDeadlines}
      targetUniversities={targetUniversities}
      opportunityPreview={opportunityPreview}
    />
  );
}
