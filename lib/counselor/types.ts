import type {
  DataConfidence,
  Opportunity,
  OpportunityMatch,
  ProfileDimension,
  RecommendationClass,
  RequirementEvaluationStatus,
  UniversityRequirement,
} from "@/types/database";
import type { ReasonCode } from "@/lib/scoring/types";
import type { RequirementEvaluationResult } from "@/lib/requirements/types";
import type { CompletenessChecklistItem } from "@/lib/scoring/completeness";
import type { StudentAdvisorContext } from "@/lib/ai/student-context";

// Canonical profile-dimension taxonomy is `@/types/database`'s `ProfileDimension` (the
// Postgres `profile_dimension` enum, `lib/scoring/index.ts`'s `DIMENSION_SCORERS` order,
// `lib/scoring/labels.ts`'s `DIMENSION_LABELS`) — Counselor Core reuses it directly and
// never defines a second taxonomy. Re-exported here only for a single counselor-local
// import surface.
export type { ProfileDimension, RecommendationClass, DataConfidence };

export const COUNSELOR_SCORE_VERSION = "counselor_ranking_v1";

// ---------------------------------------------------------------------------
// Gaps (Phase D)
// ---------------------------------------------------------------------------

export type GapSeverity = "critical" | "moderate" | "minor" | "insufficient_data";

export interface DimensionScoreRow {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
  reasonCodes: ReasonCode[];
}

export interface ProfileGap {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
  severity: GapSeverity;
  /** 1 = weakest dimension. */
  rank: number;
  spreadFromStrongest: number;
  reasonCodes: ReasonCode[];
}

// ---------------------------------------------------------------------------
// Candidates (Phase E)
// ---------------------------------------------------------------------------

export type CandidateSource =
  | { kind: "opportunity"; opportunityId: string }
  | { kind: "requirement_action"; universityId: string; requirementId: string; status: RequirementEvaluationStatus }
  | { kind: "profile_task"; checklistKey: string };

export interface CandidateAction {
  source: CandidateSource;
  title: string;
  category: string;
  addressesDimensions: ProfileDimension[];
  verificationState: string | null;
  sourceUrl: string | null;
  deadline: { date: string; sourceLabel: string } | null;
}

// ---------------------------------------------------------------------------
// Eligibility (Phase F)
// ---------------------------------------------------------------------------

export type EligibilityVerdict = "known_eligible" | "known_ineligible" | "unknown";

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Ranking (Phase G)
// ---------------------------------------------------------------------------

export type BoundedLevel = "low" | "medium" | "high";

export const SCORE_WEIGHTS = {
  gapRelevance: 0.4,
  fieldAlignment: 0.25,
  urgency: 0.15,
  dataQuality: 0.2,
} as const;

export type ScoreComponent = keyof typeof SCORE_WEIGHTS;

export interface RankedCandidate {
  candidate: CandidateAction;
  eligibility: EligibilityResult;
  matchedGaps: ProfileGap[];
  score: number;
  scoreBreakdown: Record<ScoreComponent, number>;
  impact: BoundedLevel;
  effort: BoundedLevel;
  urgency: BoundedLevel;
  confidence: BoundedLevel;
  recommendationClass: RecommendationClass;
}

// ---------------------------------------------------------------------------
// Evidence / output contract (Phase H)
// ---------------------------------------------------------------------------

export type NextActionType = "VIEW" | "SAVE" | "APPLY" | "ADD_TO_PLAN" | "COMPLETE_PROFILE";

export interface CounselorRecommendation {
  id: string;
  title: string;
  recommendationClass: RecommendationClass;
  why: string[];
  matchedGapDimensions: ProfileDimension[];
  impact: BoundedLevel;
  effort: BoundedLevel;
  urgency: BoundedLevel;
  deadline: { date: string; sourceLabel: string } | null;
  eligibility: EligibilityResult;
  confidence: BoundedLevel;
  evidence: { sourceType: CandidateSource["kind"]; sourceId: string; sourceUrl: string | null; verificationState: string | null }[];
  warnings: string[];
  nextAction: { label: string; type: NextActionType; href: string };
}

// ---------------------------------------------------------------------------
// Student state (Phase B/I) — assembled once per pipeline run by lib/counselor/state.ts,
// consumed as plain data by every pure function below it (gaps/candidates/eligibility/
// scoring/evidence never fetch anything themselves).
// ---------------------------------------------------------------------------

/** One target university's requirements, pre-evaluated (lib/requirements/evaluate.ts) — only
 * evaluable, non-informational requirements are included (see lib/requirements/types.ts's
 * MANUAL_REVIEW_CATEGORIES/INFORMATIONAL_CATEGORIES; those never become candidates). */
export interface RequirementCandidateInput {
  universityId: string;
  universityName: string;
  requirement: UniversityRequirement;
  evaluation: RequirementEvaluationResult;
}

export interface CounselorState {
  userId: string;
  advisor: StudentAdvisorContext;
  dimensionScores: DimensionScoreRow[];
  completenessChecklist: CompletenessChecklistItem[];
  /** Pre-filtered to opportunity_matches.eligible = true and opportunities.verification_state
   * = 'verified_current' (Assumption A1, docs/counselor-core-plan.md §7) — matching.ts's
   * hard-ineligible and unverified opportunities are already excluded before this point. */
  eligibleOpportunityMatches: { match: OpportunityMatch; opportunity: Opportunity }[];
  requirementCandidateInputs: RequirementCandidateInput[];
}

export interface CounselorResult {
  scoreVersion: typeof COUNSELOR_SCORE_VERSION;
  gaps: ProfileGap[];
  recommendations: CounselorRecommendation[];
  profileReadiness: {
    completenessPercent: number;
    /** False when too little is known to make confident judgment-based recommendations —
     * the pipeline should lead with profile_task candidates in that case, not opportunities. */
    sufficientForJudgment: boolean;
  };
}
