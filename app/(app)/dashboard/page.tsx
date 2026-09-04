import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { getCurrentProfile, getProfileScores, requireUser } from "@/lib/security/dal";
import { resolvePlanTier } from "@/lib/tier/plan-tier";
import { shouldShowUltraWelcome, markUltraWelcomeSeen } from "@/lib/tier/ultra-welcome";
import { resolveLocale } from "@/lib/i18n/locale";
import { createClient } from "@/lib/supabase/server";
import { getCurrentWeeklyPlan, getOrCreateWeeklyPlan } from "@/lib/plan/persist";
import { getTargetUniversitiesWithDetails } from "@/lib/universities/queries";
import { getUpcomingDeadlines } from "@/lib/deadlines/upcoming";
import { refreshOpportunityMatches } from "@/lib/opportunities/persist-matches";
import { isOpportunityRecommendable } from "@/lib/opportunities/lifecycle";
import { competesInCoreRecommendations } from "@/lib/opportunities/commercial";
import { getHomeOpportunityStrip } from "@/lib/opportunities/home-strip";
import { AIProviderNotConfiguredError } from "@/lib/ai";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";
import { toProfileSignal } from "@/lib/scoring/signal";
import { buildProfileChange } from "@/lib/scoring/change";
import { getCounselorState } from "@/lib/counselor/state";
import { buildCounselorDashboardContract, resolveAvoidRecommendation, type CounselorDashboardContract } from "@/lib/counselor/dashboard-contract";
import { greeting } from "@/lib/dashboard/greeting";
import { extractParentEmailPromptDismissalState } from "@/lib/parent/email-prompt";
import { DashboardView } from "@/features/dashboard/dashboard-view";
import type { Opportunity } from "@/types/database";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return { title: t("home") };
}

/** Opportunities shown in the homepage preview (spec Phase 7, Block 4 — a short preview, not
 * the catalogue). */
const OPPORTUNITY_PREVIEW_SIZE = 2;

/** How many eligible matches to consider before filtering down to OPPORTUNITY_PREVIEW_SIZE.
 * Needs enough headroom that a run of closed-cycle rows at the top of a student's ranking
 * cannot empty the block — measured worst case today was 2 unrecommendable rows ahead of the
 * first good one, and this leaves an order of magnitude of slack without fetching the whole
 * match table. */
const OPPORTUNITY_PREVIEW_CANDIDATE_POOL = 20;

export default async function DashboardPage() {
  const session = await requireUser();
  const userId = session.userId!;
  const profile = await getCurrentProfile();
  const supabase = await createClient();
  // Resolved once and reused everywhere below (resolveLocale() is itself cache()d, but one
  // call site is clearer than repeating "await resolveLocale()" at each point this page
  // needs it — the hero, profile signal, and the counselor dashboard contract all do).
  const locale = await resolveLocale();

  const { refreshed: opportunityMatchesRefreshed } = await refreshOpportunityMatches(userId, locale);

  // Counselor Core Phase L/B4 — kicked off concurrently with the queries below, isolated
  // from them: an unexpected failure computing Counselor Core's deterministic state must
  // never take down the rest of the dashboard (same isolation the Advisor page already
  // applies to getCounselorRecommendations). getCounselorState performs its own internal
  // refreshOpportunityMatches call in addition to the one above — a known, small duplicate
  // read (same accepted tradeoff lib/counselor/state.ts's own comment documents for
  // assembleScoringFacts), not restructured here to keep this change additive.
  const counselorStatePromise = getCounselorState(userId, locale).catch((error) => {
    console.error("[dashboard] failed to compute counselor state", error instanceof Error ? error.stack : error);
    return null;
  });

  const [scores, snapshotsRes, recommendationRes, targetUniversities, upcomingDeadlines, matchesRes, opportunityStrip] = await Promise.all([
    // Shared, cache()'d — docs/performance.md §2. By the time this page runs, the layout
    // (app/(app)/layout.tsx) has almost certainly already populated the cache for this
    // request, so this call is typically free, not just deduped.
    getProfileScores(userId),
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
    // Over-fetch, then narrow to OPPORTUNITY_PREVIEW_SIZE after isOpportunityRecommendable has
    // run below. Taking the top 2 here and filtering afterwards silently shrank the block to
    // whatever survived — and emptied it entirely when a student's two highest-scoring matches
    // were both closed-cycle, which is common because a stale cycle_status does not lower
    // match_score. Live 2026-08-24: one user rendered an empty Opportunities block while holding
    // 174 eligible, recommendable matches.
    supabase
      .from("opportunity_matches")
      .select("opportunity_id, match_score")
      .eq("user_id", userId)
      .eq("eligible", true)
      .order("match_score", { ascending: false })
      .limit(OPPORTUNITY_PREVIEW_CANDIDATE_POOL),
    // Separate surface, separate query — see lib/opportunities/home-strip.ts's own header
    // for why this doesn't share the block above (different size, different eligibility
    // handling, its own over-fetch pool). Runs in the same Promise.all rather than after it
    // for the identical reason every other query here does — one round trip of latency for
    // the whole page, not one per section.
    getHomeOpportunityStrip(supabase, userId),
  ]);

  const previousSnapshot = snapshotsRes.data?.[1] ?? null;

  // Counselor Core Phase D — single source of truth for "weakest dimension" (was three
  // duplicated one-liners across this page, the advisor page, and persist-matches.ts).
  const biggestGap = rankDimensionGaps(toDimensionScoreRows(scores))[0] ?? null;

  // Qualitative per-dimension read for the Profile Signal block. Derived from the same
  // rows, but carries `confidence` through as well — the signal must be able to say
  // "limited evidence" rather than reporting an unknown dimension as a weak one.
  const profileSignal = toProfileSignal(scores);

  // What actually moved, per dimension. The aggregate `profile_strength_score` is still
  // maintained and still drives ranking/snapshots — it is simply not what Home shows.
  const profileChange = buildProfileChange(
    scores,
    previousSnapshot ? (previousSnapshot.dimension_scores as Record<string, number>) : null,
  );

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
      counselorContract = buildCounselorDashboardContract(counselorState, upcomingDeadlines, new Date(), locale);
    } catch (error) {
      console.error("[dashboard] failed to build counselor dashboard contract", error instanceof Error ? error.stack : error);
    }
  }

  const opportunityMatches = matchesRes.data ?? [];
  const opportunityIds = opportunityMatches.map((m) => m.opportunity_id);
  const { data: matchedOpportunities } = opportunityIds.length
    ? await supabase
        .from("opportunities")
        // Both verification timestamps, deliberately. They record which pipeline generation
        // wrote the row rather than anything about freshness, and isOpportunityRecommendable
        // needs both to tell "no evidence at all" from "written by the other pipeline" — the
        // distinction #143 got wrong. Omitting `verified_at` here would silently re-create that
        // bug for this surface alone; OpportunityVerificationFacts requires it so that omitting
        // it fails typecheck rather than quietly hiding opportunities from the homepage. Same
        // reasoning now applies to `source_verified_at` (migration 0103) — MAX_VERIFICATION_AGE_DAYS
        // is still null so it changes nothing live today, but the type requires it for the day
        // that stops being true, same as verified_at above.
        .select("id, title, status, cycle_status, deadline, last_verified_at, verified_at, source_verified_at, cost, selectivity_tier")
        .in("id", opportunityIds)
        // The enum, not just the timestamps. isOpportunitySufficientlyVerified below asks
        // "did any pipeline ever touch this row", which is a different question from "has a
        // human confirmed it" — so unverified rows kept reaching the one surface whose own
        // comment says it must be the strictest, because it renders a bare title and a match
        // percentage with nowhere to put a caveat. Counselor Core already filters on this
        // (lib/counselor/state.ts); the homepage was the weaker gate of the two. Live before
        // this: 4 of 14 top-2 slots were unverified, among them a row titled "Earn college
        // credit that may transfer to any college you attend" and one titled "University of
        // California, Santa Barbara, CA, USA".
        .eq("verification_state", "verified_current")
    : { data: [] };
  // Defense in depth (lib/opportunities/lifecycle.ts): same stale-match-row risk as the
  // opportunities page's "For you" view — a match upserted before its cycle closed must not
  // keep surfacing on the homepage just because refreshOpportunityMatches hasn't re-run.
  //
  // isOpportunityRecommendable, not isOpportunityActionable: this preview renders a bare title
  // and "N% match" with nowhere to put a caveat, so unlike Browse and the detail page it can't
  // label an unverified row honestly — it can only show a confidence number Oryn can't stand
  // behind. Browse remains the complete catalogue; nothing is hidden from the student there.
  //
  // competesInCoreRecommendations too: this block is a core recommendation surface, but it
  // reads opportunity_matches directly rather than through Counselor Core, so the pay-to-enroll
  // filter in lib/counselor/candidates.ts does not cover it. Without this line the homepage
  // would keep proposing exactly the programmes the ruling retired from the weekly plan and
  // the advisor — measured live: AJSR, JRHS and IJHSR were still surfacing here.
  const opportunityById = new Map(
    (matchedOpportunities ?? [])
      .filter((o) => isOpportunityRecommendable(o) && competesInCoreRecommendations(o))
      .map((o) => [o.id, o])
  );
  const opportunityPreview = opportunityMatches
    .map((m) => {
      const opportunity = opportunityById.get(m.opportunity_id);
      // `deadline` and `cycleStatus` both come from the same row, past the same
      // verification_state and recommendability gates as the title — so surfacing them adds
      // urgency/caveats without widening what this block is willing to vouch for.
      //
      // cycleStatus specifically: the verification_state='verified_current' filter above
      // (and isOpportunityRecommendable's own isOpportunitySufficientlyVerified check) both
      // accept a row on the strength of ANY verification timestamp ever written, which is a
      // fact about which ingestion pipeline touched the row, not proof this year's cycle was
      // reconfirmed — lib/opportunities/lifecycle.ts's own extensive comment says so. A row can
      // pass every gate here while still carrying cycle_status='unverified'. Browse already
      // renders this honestly (CYCLE_STATUSES_WORTH_A_DESCRIPTOR); this preview used to have no
      // field to render it from at all — not degraded, structurally absent. Verified live
      // 2026-09-02: 12 of this block's eligible candidates carry exactly that shape.
      return {
        id: opportunity?.id,
        title: opportunity?.title,
        matchScore: m.match_score,
        deadline: opportunity?.deadline ?? null,
        cycleStatus: opportunity?.cycle_status ?? null,
      };
    })
    .filter(
      (o): o is { id: string; title: string; matchScore: number; deadline: string | null; cycleStatus: Opportunity["cycle_status"] | null } =>
        Boolean(o.title) && Boolean(o.id)
    )
    // Cut to size only now that unrecommendable rows are gone, so the block shows the best
    // rows a student can actually act on rather than whatever survived the top two.
    .slice(0, OPPORTUNITY_PREVIEW_SIZE);

  const displayName = profile?.display_name || profile?.first_name || "there";
  const planTier = profile ? resolvePlanTier(profile) : "standard";
  // Decided and (if true) recorded together, in this same request -- see
  // lib/tier/ultra-welcome.ts's own comment for why the read and the write can never be two
  // separate paths for this one. `profile?.ultra_welcome_seen_at` stays `undefined` both when
  // there's no profile at all and when migration 0092 hasn't landed yet -- shouldShowUltraWelcome
  // treats that the same as "not shown," on purpose.
  const showUltraWelcome = shouldShowUltraWelcome(planTier, profile?.ultra_welcome_seen_at);
  if (showUltraWelcome) {
    await markUltraWelcomeSeen(supabase, userId);
  }

  // See resolveAvoidRecommendation's own doc comment (lib/counselor/dashboard-contract.ts)
  // for why a successful Counselor Core computation is trusted completely and the stored
  // ai_recommendations row is only a fallback for computation failure, not for "no opinion."
  const avoidRecommendation = resolveAvoidRecommendation(counselorContract, recommendationRes.data);

  // Derived from the same already-loaded `profile` object every other tier/state read on
  // this page already uses — no second query, matching upgradePromptDismissalState's own
  // established pattern on app/(app)/advisor/page.tsx.
  const parentEmailPromptDismissalState = extractParentEmailPromptDismissalState(
    profile ?? {
      parent_email_prompt_soft_dismissed_until: null,
      parent_email_prompt_not_now_at: null,
      parent_email_prompt_not_now_count: 0,
      parent_email_prompt_dismissed_forever: false,
    }
  );

  return (
    <DashboardView
      displayName={displayName}
      tier={planTier}
      greeting={greeting(locale, profile?.timezone ?? "UTC")}
      locale={locale}
      biggestGap={biggestGap ? { dimension: biggestGap.dimension, score: biggestGap.score } : null}
      profileChange={profileChange}
      profileSignal={profileSignal}
      weeklyPlan={weeklyPlan}
      planError={planError}
      counselorThisWeek={counselorContract?.thisWeekActions ?? []}
      avoidRecommendation={avoidRecommendation}
      upcomingDeadlines={upcomingDeadlines}
      targetUniversities={targetUniversities}
      opportunityPreview={opportunityPreview}
      opportunityStrip={opportunityStrip}
      opportunityMatchesRefreshed={opportunityMatchesRefreshed}
      showUltraWelcome={showUltraWelcome}
      hasParentInviteEmail={profile?.parent_invite_email != null}
      parentEmailPromptDismissalState={parentEmailPromptDismissalState}
    />
  );
}
