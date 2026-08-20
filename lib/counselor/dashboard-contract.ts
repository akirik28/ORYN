import type { StudentAdvisorContext } from "@/lib/ai/student-context";
import type { UpcomingDeadline } from "@/lib/deadlines/upcoming";
import { runCounselorPipeline } from "./pipeline";
import { rankDimensionStrengths } from "./strengths";
import type { CounselorRecommendation, CounselorResult, CounselorState, ProfileGap, ProfileStrength } from "./types";

/**
 * Counselor Core's dashboard view model (B4, counselor-data-quality-v1 founder brief) — the
 * clean, pre-shaped contract a (future, simplified) dashboard renders directly, instead of
 * every dashboard-shaped page re-deriving its own slicing/filtering logic on top of
 * CounselorResult. Composition only: every field here is either passed through unchanged
 * from CounselorState/CounselorResult or a trivial, tested filter over
 * `result.recommendations` — no new scoring, ranking, or eligibility logic is introduced
 * (rankDimensionGaps/rankCandidates/evaluateCandidateEligibility etc. are reused exactly as
 * they already exist via runCounselorPipeline).
 *
 * FACT vs ASSESSMENT vs RECOMMENDATION stay distinguishable field-by-field (never flattened
 * into one opaque blob) — see the comment on each field below.
 */
export interface CounselorDashboardContract {
  /** Traceability — which ranking model produced this contract (mirrors CounselorResult). */
  scoreVersion: CounselorResult["scoreVersion"];

  /** ASSESSMENT — how much Oryn currently knows about this student, distinct from how
   * strong the profile is (spec non-negotiable requirement #12/#67: completeness !== score).
   * `sufficientForJudgment` is what should gate whether a dashboard leads with judgment-based
   * recommendations at all, exactly as CounselorPriorities already does on the Advisor page. */
  profileReadiness: CounselorResult["profileReadiness"];

  /** ASSESSMENT — all 9 profile dimensions, strongest first / weakest first respectively.
   * Never an admissions probability (spec Phase 6/16's own separation) — a dashboard should
   * only ever describe these as Oryn's own development metrics. */
  strengths: ProfileStrength[];
  gaps: ProfileGap[];

  /** RECOMMENDATION — pre-sliced by the deterministic pipeline's own recommendationClass
   * (lib/counselor/scoring.ts), not re-derived here. `thisWeekActions` is the "do" bucket,
   * already capped at RANKING_THRESHOLDS.doSlots (3) by scoring.ts's own construction — the
   * dashboard's "This week" block (spec Phase 7 Block 2: "maximum three primary actions").
   * `worthConsidering` is the "consider" bucket. `avoidForNow` is the single "avoid_for_now"
   * candidate, if any (spec Phase 39's "don't do this" logic) — at most one by construction
   * (scoring.ts only ever promotes the single highest-scoring eligible candidate). Candidates
   * classed "deprioritize" are intentionally omitted, matching the Advisor page's own
   * CounselorPriorities precedent (computed by the pipeline, never surfaced in either UI). */
  thisWeekActions: CounselorRecommendation[];
  worthConsidering: CounselorRecommendation[];
  avoidForNow: CounselorRecommendation | null;

  /** RECOMMENDATION — the subset of thisWeekActions/worthConsidering whose evidence traces
   * back to a verified, eligible opportunity. Deliberately NOT a second, independently-
   * fetched opportunity list — that would risk resurfacing something eligibility.ts already
   * excluded upstream. An opportunity the pipeline classed "avoid_for_now"/"deprioritize" is
   * excluded here too; this field means "recommended," not merely "opportunity-sourced." */
  recommendedOpportunities: CounselorRecommendation[];

  /** FACT — sourced directly from lib/deadlines/upcoming.ts, passed through unchanged. Not
   * part of CounselorState (that DB call is separately owned by callers, same as the
   * dashboard/advisor pages already do today) — kept here only as an assembled field so
   * consumers get one complete contract rather than stitching two sources themselves. */
  upcomingDeadlines: UpcomingDeadline[];

  /** FACT (id/universityId/programId/name/status) alongside ASSESSMENT (outlook) — kept
   * exactly as StudentAdvisorContext already keeps them, never collapsed into one field. */
  targetUniversityInsights: StudentAdvisorContext["targetUniversities"];
}

function isOpportunitySourced(recommendation: CounselorRecommendation): boolean {
  return recommendation.evidence.some((e) => e.sourceType === "opportunity");
}

/**
 * Assembles the dashboard contract from an already-fetched CounselorState plus deadlines
 * (the one Counselor Core input that isn't part of CounselorState — see
 * lib/deadlines/upcoming.ts). Pure, deterministic, and requires no AI provider — mirrors
 * lib/counselor/pipeline.ts's own pure-orchestration boundary exactly, so this works
 * identically whether or not ANTHROPIC_API_KEY is configured (the gap this closes: the
 * dashboard's "This week" block previously depended solely on lib/ai/weekly-plan.ts, which
 * has no deterministic fallback of its own).
 */
export function buildCounselorDashboardContract(
  state: CounselorState,
  upcomingDeadlines: UpcomingDeadline[],
  referenceDate: Date = new Date()
): CounselorDashboardContract {
  const result = runCounselorPipeline(state, referenceDate);
  const strengths = rankDimensionStrengths(state.dimensionScores);

  const thisWeekActions = result.recommendations.filter((r) => r.recommendationClass === "do");
  const worthConsidering = result.recommendations.filter((r) => r.recommendationClass === "consider");
  const avoidForNow = result.recommendations.find((r) => r.recommendationClass === "avoid_for_now") ?? null;
  const recommendedOpportunities = [...thisWeekActions, ...worthConsidering].filter(isOpportunitySourced);

  return {
    scoreVersion: result.scoreVersion,
    profileReadiness: result.profileReadiness,
    strengths,
    gaps: result.gaps,
    thisWeekActions,
    worthConsidering,
    avoidForNow,
    recommendedOpportunities,
    upcomingDeadlines,
    targetUniversityInsights: state.advisor.targetUniversities,
  };
}
