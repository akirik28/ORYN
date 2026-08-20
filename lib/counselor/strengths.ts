import type { DimensionScoreRow, ProfileStrength, StrengthTier } from "./types";

const STANDOUT_SPREAD = 30;
const STANDOUT_MAX_RANK = 2;
const NOTABLE_SPREAD = 15;

function tierFor(row: DimensionScoreRow, rank: number, spreadFromWeakest: number): StrengthTier {
  if (row.confidence === "low") return "insufficient_data";
  if (spreadFromWeakest >= STANDOUT_SPREAD && rank <= STANDOUT_MAX_RANK) return "standout";
  if (spreadFromWeakest >= NOTABLE_SPREAD) return "notable";
  return "typical";
}

/**
 * Ranks all profile dimensions strongest-first — Counselor Core's first-class "strengths"
 * concept, mirroring rankDimensionGaps' (lib/counselor/gaps.ts) own structure exactly: same
 * DimensionScoreRow input, same deterministic spread-from-the-opposite-extreme-plus-rank
 * tiering, same "low confidence overrides everything else" defensive check (a thin,
 * uncertain dimension is never called a confirmed standout strength just because the little
 * data it has happens to score high), same stable-sort tie-breaking.
 *
 * Before this existed, "strength" was only ever inferred indirectly on the dashboard/advisor
 * pages (as "whichever dimension isn't the biggest gap") — this gives it the same first-class,
 * typed, rankable treatment gaps already have.
 *
 * Pure and deterministic: ties keep their original input order (Array.prototype.sort is
 * stable), so identical input always produces identical output.
 */
export function rankDimensionStrengths(scores: DimensionScoreRow[]): ProfileStrength[] {
  if (scores.length === 0) return [];

  const weakestScore = Math.min(...scores.map((s) => s.score));
  const ranked = [...scores].sort((a, b) => b.score - a.score);

  return ranked.map((row, index) => {
    const rank = index + 1;
    const spreadFromWeakest = row.score - weakestScore;
    return {
      dimension: row.dimension,
      score: row.score,
      confidence: row.confidence,
      tier: tierFor(row, rank, spreadFromWeakest),
      rank,
      spreadFromWeakest,
      reasonCodes: row.reasonCodes,
    };
  });
}
