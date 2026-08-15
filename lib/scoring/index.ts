import type { DimensionResult, ScoringFacts } from "./types";
import { CAREER_PROFILE_SCORE_VERSION } from "./types";
import { clampScore } from "./math";
import { scoreAcademics } from "./dimensions/academics";
import { scoreIntellectualCuriosity } from "./dimensions/intellectual-curiosity";
import { scoreLeadership } from "./dimensions/leadership";
import { scoreResearch } from "./dimensions/research";
import { scoreEntrepreneurship } from "./dimensions/entrepreneurship";
import { scoreCommunityImpact } from "./dimensions/community-impact";
import { scoreAwardsDistinction } from "./dimensions/awards";
import { scoreCareerExploration } from "./dimensions/career-exploration";
import { scoreExecution } from "./dimensions/execution";

export { CAREER_PROFILE_SCORE_VERSION } from "./types";
export type { DimensionResult, ScoringFacts, ReasonCode } from "./types";
export { computeCompleteness } from "./completeness";
export type { CompletenessFacts } from "./completeness";

const DIMENSION_SCORERS = [
  scoreAcademics,
  scoreIntellectualCuriosity,
  scoreLeadership,
  scoreResearch,
  scoreEntrepreneurship,
  scoreCommunityImpact,
  scoreAwardsDistinction,
  scoreCareerExploration,
  scoreExecution,
];

export interface CareerProfileResult {
  version: string;
  overallScore: number;
  dimensions: DimensionResult[];
}

/**
 * Computes all 9 career-profile dimensions from structured facts and an unweighted
 * overall average. This is Rule 6.1's deterministic layer only — reason codes explain
 * *what* fed each score, but the qualitative "why it matters" narrative the advisor
 * gives the student is generated separately (lib/ai) from this output, never the other
 * way around.
 */
export function computeCareerProfile(facts: ScoringFacts): CareerProfileResult {
  const dimensions = DIMENSION_SCORERS.map((score) => score(facts));
  const overallScore = clampScore(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

  return { version: CAREER_PROFILE_SCORE_VERSION, overallScore, dimensions };
}
