import type { CurriculumType, ProfileDimension } from "@/types/database";

/** A dimension is never compared against a cohort with fewer than this many peers with a
 * score for it (spec Phase 19's own baseline) — below it, the only honest thing to show is
 * "not enough comparable Oryn students yet," never a fabricated or misleadingly small-n
 * percentile. */
export const MIN_COHORT_SIZE = 100;

export type BenchmarkDimension = ProfileDimension | "overall";

/**
 * What defines "comparable" for this student. Every field is optional and additive (an AND
 * filter) — designed so a future cohort dimension (target field, target country, age range)
 * can be added as one more optional field without touching existing callers. `null` means
 * "not set on this student's profile," which narrows the cohort filter, not the result —
 * it does NOT mean "match peers with no value either."
 */
export interface CohortFilter {
  graduationYear: number | null;
  curriculum: CurriculumType | null;
}

export const CURRICULUM_LABELS: Record<CurriculumType, string> = {
  ap: "AP",
  ib: "IB",
  a_level: "A-Level",
  turkish_curriculum: "Turkish curriculum",
  national_curriculum: "National curriculum",
  other: "another curriculum",
};

export interface BenchmarkDimensionResult {
  dimension: BenchmarkDimension;
  myScore: number;
  /** Peers in the cohort who also have a score for this exact dimension — can be smaller
   * than the cohort's total headcount (not every student has every dimension scored). */
  cohortSize: number;
  /** 0-100 integer, or null when cohortSize < MIN_COHORT_SIZE — never a fabricated or
   * tiny-sample figure. */
  percentile: number | null;
}

export interface PeerBenchmarkSummary {
  cohortDescription: string;
  results: BenchmarkDimensionResult[];
}
