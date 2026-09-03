import { CURRICULUM_LABELS, MIN_COHORT_SIZE, type BenchmarkDimension, type BenchmarkDimensionResult, type CohortFilter } from "./types";

/**
 * Standard percentile-rank formula (ties split evenly rather than all counted as "above" or
 * "below," which would bias the result at the very scores most students cluster around).
 * Pure and deterministic — never an AI guess (Phase 27: don't spend model budget where
 * arithmetic already answers the question).
 */
export function computePercentileRank(peerScores: number[], myScore: number): number {
  if (peerScores.length === 0) return 50;
  const below = peerScores.filter((s) => s < myScore).length;
  const equal = peerScores.filter((s) => s === myScore).length;
  const rank = (below + 0.5 * equal) / peerScores.length;
  return Math.round(rank * 100);
}

/**
 * The single gate between "real statistic" and "not enough comparable Proxola students yet."
 * `peerScores` must already exclude the student's own score — see lib/benchmarking/cohort.ts.
 */
export function evaluateBenchmarkDimension(dimension: BenchmarkDimension, myScore: number, peerScores: number[]): BenchmarkDimensionResult {
  const cohortSize = peerScores.length;
  if (cohortSize < MIN_COHORT_SIZE) {
    return { dimension, myScore, cohortSize, percentile: null };
  }
  return { dimension, myScore, cohortSize, percentile: computePercentileRank(peerScores, myScore) };
}

export function describeCohort(filter: CohortFilter): string {
  const parts: string[] = [];
  if (filter.graduationYear !== null) parts.push(`the class of ${filter.graduationYear}`);
  if (filter.curriculum !== null) parts.push(CURRICULUM_LABELS[filter.curriculum]);
  return parts.length > 0 ? `Students in ${parts.join(" following ")}` : "All Proxola students";
}
