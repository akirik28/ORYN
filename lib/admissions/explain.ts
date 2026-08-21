import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { DataConfidence, ProfileDimension } from "@/types/database";

export interface OutlookExplanation {
  strengths: string[];
  gaps: string[];
  unknowns: string[];
  /** True when Oryn has no evidenced dimension to name a strength or gap from at all — every
   * dimension came back "low" confidence (the scorer had no underlying facts, so it scored 0
   * by construction). Distinct from strengths/gaps simply being empty because the evidence
   * that DOES exist doesn't clear the threshold either way: that's a real finding, this is an
   * absence of data. The caller must render "we don't know enough yet" for this case, never
   * imply Oryn checked and found nothing (Phase 68). */
  insufficientData: boolean;
}

export interface DimensionScoreInput {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
}

const ALWAYS_UNKNOWN = ["Essays", "Recommendations", "Applicant pool in this admission cycle"];
const STRENGTH_GAP_THRESHOLD = 55;
const MAX_NAMED = 2;

/** Deterministic secondary sort key so a tie in score is never silently resolved by whatever
 * order the caller happened to pass dimensions in. Before this existed, an all-zero-score
 * profile (every dimension tied at 0) always named "Career Exploration" and "Execution /
 * Project Depth" as gaps for every single student, because those two sort last in
 * DIMENSION_SCORERS (lib/scoring/index.ts) and `Array.prototype.sort` is stable — a positional
 * accident, not a finding about the student. Alphabetical-by-dimension-key is an arbitrary
 * choice, but it's a fixed, visible one instead of an incidental one. */
function byScoreDescThenDimensionAsc(a: DimensionScoreInput, b: DimensionScoreInput): number {
  return b.score - a.score || a.dimension.localeCompare(b.dimension);
}
function byScoreAscThenDimensionAsc(a: DimensionScoreInput, b: DimensionScoreInput): number {
  return a.score - b.score || a.dimension.localeCompare(b.dimension);
}

/** Mandatory outlook explanation (Phase 16.2) — generic strengths/gaps derived from the
 * student's own dimension scores relative to each other (not this specific school's
 * actual holistic review, which Oryn has no access to — hence "unknowns" always
 * includes essays/recommendations/applicant pool).
 *
 * Only dimensions the scoring engine actually had evidence for (`confidence !== "low"`) are
 * eligible to be named. A "low" confidence dimension scores 0 purely because it had no facts
 * to work with (see lib/scoring/dimensions/*) — naming it as a "strength" or "gap" would
 * present an absence of data as if it were a finding about the student.
 */
export function explainOutlook(scores: DimensionScoreInput[]): OutlookExplanation {
  const evidenced = scores.filter((s) => s.confidence !== "low");
  if (evidenced.length === 0) {
    return { strengths: [], gaps: [], unknowns: ALWAYS_UNKNOWN, insufficientData: true };
  }

  const strengths = [...evidenced]
    .sort(byScoreDescThenDimensionAsc)
    .slice(0, MAX_NAMED)
    .filter((s) => s.score >= STRENGTH_GAP_THRESHOLD)
    .map((s) => DIMENSION_LABELS[s.dimension]);
  const gaps = [...evidenced]
    .sort(byScoreAscThenDimensionAsc)
    .slice(0, MAX_NAMED)
    .filter((s) => s.score < STRENGTH_GAP_THRESHOLD)
    .map((s) => DIMENSION_LABELS[s.dimension]);

  return { strengths, gaps, unknowns: ALWAYS_UNKNOWN, insufficientData: false };
}
