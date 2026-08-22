import type { DimensionResult, ScoringFacts } from "./types";
import { CAREER_PROFILE_SCORE_VERSION } from "./types";
import { clampScore } from "./math";
import type { EvidenceStatus } from "@/types/database";
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

function notRejected<T extends { evidence_status: EvidenceStatus }>(items: T[]): T[] {
  return items.filter((item) => item.evidence_status !== "verification_rejected");
}

/**
 * Excludes `verification_rejected` rows before any dimension scorer sees them. The other
 * three `ScoringFacts` collections (education records, courses, test scores) have no
 * `evidence_status` column at all, so there is nothing to filter there.
 *
 * `verification_rejected` means someone actively looked at this claim and did not confirm
 * it — a materially different state from `self_reported`/`evidence_added` (simply
 * unreviewed) or `verified` (confirmed). Scoring a rejected claim the same as any other
 * would reward making a claim that was checked and disbelieved, which is the opposite of
 * what `AGENTS.md` non-negotiables #4 ("uploaded evidence does not equal independent
 * verification") and #9 (validated AI/structured output) are protecting against — a
 * rejected item is not merely *unverified* evidence, it is evidence Oryn already has a
 * reason to distrust.
 *
 * Deliberately scoped to `computeCareerProfile`, not to `assembleScoringFacts` itself
 * (`./assemble-facts.ts`): that function's raw, unfiltered facts also back the student's
 * own profile page (`app/(app)/profile/page.tsx`) and the completeness checklist
 * (`./completeness.ts`, via `lib/counselor/state.ts`) — a student must still see their own
 * rejected entry on their own profile to know it needs fixing or resubmitting, and
 * completeness ("does Oryn know enough about the student," Phase 67) is a different
 * question from "should this count toward a strength score." Filtering the shared upstream
 * function would have silently broken both of those. This filters only the copy the nine
 * dimension scorers actually see.
 */
function excludeRejectedForScoring(facts: ScoringFacts): ScoringFacts {
  return {
    ...facts,
    activities: notRejected(facts.activities),
    awards: notRejected(facts.awards),
    certifications: notRejected(facts.certifications),
    projects: notRejected(facts.projects),
    researchExperiences: notRejected(facts.researchExperiences),
    volunteeringExperiences: notRejected(facts.volunteeringExperiences),
    workExperiences: notRejected(facts.workExperiences),
  };
}

/**
 * Computes all 9 career-profile dimensions from structured facts and an unweighted
 * overall average. This is Rule 6.1's deterministic layer only — reason codes explain
 * *what* fed each score, but the qualitative "why it matters" narrative the advisor
 * gives the student is generated separately (lib/ai) from this output, never the other
 * way around.
 */
export function computeCareerProfile(facts: ScoringFacts): CareerProfileResult {
  const scoringFacts = excludeRejectedForScoring(facts);
  const dimensions = DIMENSION_SCORERS.map((score) => score(scoringFacts));
  const overallScore = clampScore(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

  return { version: CAREER_PROFILE_SCORE_VERSION, overallScore, dimensions };
}
