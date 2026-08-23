import { getCurrentProfile, requireUser } from "@/lib/security/dal";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeeklyPlan, getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { isOpportunityRecommendable } from "@/lib/opportunities/lifecycle";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { getCounselorState } from "@/lib/counselor/state";
import { buildCounselorDashboardContract, type CounselorDashboardContract } from "@/lib/counselor/dashboard-contract";
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

  const { refreshed: opportunityMatchesRefreshed } = await refreshOpportunityMatches(userId);

  // Counselor Core Phase L/B4 — kicked off concurrently with the queries below, isolated
  // from them: an unexpected failure computing Counselor Core's deterministic state must
  // never take down the rest of the dashboard (same isolation the Advisor page already
  // applies to getCounselorRecommendations). getCounselorState performs its own internal
  // refreshOpportunityMatches call in addition to the one above — a known, small duplicate
  // read (same accepted tradeoff lib/counselor/state.ts's own comment documents for
  // assembleScoringFacts), not restructured here to keep this change additive.
  const counselorStatePromise = getCounselorState(userId).catch((error) => {
    console.error("[dashboard] failed to compute counselor state", error instanceof Error ? error.stack : error);
    return null;
  });

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

  // Counselor Core Phase D — single source of truth for "weakest dimension" (was three
  // duplicated one-liners across this page, the advisor page, and persist-matches.ts).
  const biggestGap = rankDimensionGaps(toDimensionScoreRows(scores))[0] ?? null;

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

  // Counselor Core Phase L/B4 — the deterministic fallback for "This week": lib/ai/
  // weekly-plan.ts has no fallback of its own, so before this the dashboard's priorities
  // block simply showed an error/empty state whenever the AI provider was unavailable or
  // failing, even though Counselor Core's own ranked, verified, eligible candidates
  // (lib/counselor/scoring.ts's rankCandidates — zero AI required) already existed and
  // could substitute. Built from the same counselor state the Advisor page already computes
  // via getCounselorRecommendations, just also carrying strengths/deadlines/target-
  // university insight for the fuller dashboard contract (see dashboard-contract.ts).
  let counselorContract: CounselorDashboardContract | null = null;
  const counselorState = await counselorStatePromise;
  if (counselorState) {
    try {
      counselorContract = buildCounselorDashboardContract(counselorState, upcomingDeadlines);
    } catch (error) {
      console.error("[dashboard] failed to build counselor dashboard contract", error instanceof Error ? error.stack : error);
    }
  }

  const opportunityMatches = matchesRes.data ?? [];
  const opportunityIds = opportunityMatches.map((m) => m.opportunity_id);
  const { data: matchedOpportunities } = opportunityIds.length
    ? await supabase.from("opportunities").select("id, title, cycle_status, deadline, last_verified_at").in("id", opportunityIds)
    : { data: [] };
  // Defense in depth (lib/opportunities/lifecycle.ts): same stale-match-row risk as the
  // opportunities page's "For you" view — a match upserted before its cycle closed must not
  // keep surfacing on the homepage just because refreshOpportunityMatches hasn't re-run.
  //
  // isOpportunityRecommendable, not isOpportunityActionable: this preview renders a bare title
  // and "N% match" with nowhere to put a caveat, so unlike Browse and the detail page it can't
  // label an unverified row honestly — it can only show a confidence number Oryn can't stand
  // behind. Browse remains the complete catalogue; nothing is hidden from the student there.
  const opportunityById = new Map(
    (matchedOpportunities ?? []).filter((o) => isOpportunityRecommendable(o)).map((o) => [o.id, o])
  );
  const opportunityPreview = opportunityMatches
    .map((m) => ({ title: opportunityById.get(m.opportunity_id)?.title, matchScore: m.match_score }))
    .filter((o): o is { title: string; matchScore: number } => Boolean(o.title));

  const displayName = profile?.display_name || profile?.first_name || "there";

  // AI-generated "avoid for now" rows only ever get written when a weekly plan generation
  // has actually succeeded at least once (lib/plan/persist.ts) — so this was, until now,
  // silently just as AI-dependent as the "This week" block itself. Counselor Core's own
  // avoidForNow (deterministic, spec Phase 39) fills the same gap the same way.
  const avoidRecommendation = recommendationRes.data
    ? { title: recommendationRes.data.title, reason: recommendationRes.data.reason ?? "" }
    : counselorContract?.avoidForNow
      ? { title: counselorContract.avoidForNow.title, reason: counselorContract.avoidForNow.why[0] ?? "" }
      : null;

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
      counselorThisWeek={counselorContract?.thisWeekActions ?? []}
      avoidRecommendation={avoidRecommendation}
      upcomingDeadlines={upcomingDeadlines}
      targetUniversities={targetUniversities}
      opportunityPreview={opportunityPreview}
      opportunityMatchesRefreshed={opportunityMatchesRefreshed}
    />
  );
}
