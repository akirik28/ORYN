import type { ReasonCode } from "@/lib/scoring/types";
import type { DataConfidence, ProfileDimension } from "@/types/database";
import type { DimensionScoreRow, GapSeverity, ProfileGap } from "./types";

function isReasonCode(value: unknown): value is ReasonCode {
  return typeof value === "object" && value !== null && "code" in value && "detail" in value;
}

/**
 * Adapts a raw `profile_scores` row (as read directly off Supabase — snake_case, jsonb
 * `reason_codes` typed `unknown[]`) into the `DimensionScoreRow` shape `rankDimensionGaps`
 * takes. Malformed/missing reason codes default to an empty array rather than throwing —
 * a gap is still rankable without its explanation, it just renders fewer `why` bullets.
 */
export function toDimensionScoreRows(
  rows: { dimension: ProfileDimension; score: number; confidence: DataConfidence; reason_codes: unknown }[]
): DimensionScoreRow[] {
  return rows.map((row) => ({
    dimension: row.dimension,
    score: row.score,
    confidence: row.confidence,
    reasonCodes: Array.isArray(row.reason_codes) ? row.reason_codes.filter(isReasonCode) : [],
  }));
}

const CRITICAL_SPREAD = 30;
const CRITICAL_MAX_RANK = 2;
const MODERATE_SPREAD = 15;

function severityFor(row: DimensionScoreRow, rank: number, spreadFromStrongest: number): GapSeverity {
  if (row.confidence === "low") return "insufficient_data";
  if (spreadFromStrongest >= CRITICAL_SPREAD && rank <= CRITICAL_MAX_RANK) return "critical";
  if (spreadFromStrongest >= MODERATE_SPREAD) return "moderate";
  return "minor";
}

/**
 * Ranks all profile dimensions weakest-first with a documented, deterministic severity
 * (Counselor Core Phase D — docs/counselor-core-plan.md §5). Replaces the three duplicated
 * "weakest dimension" one-liners in app/(app)/dashboard/page.tsx, app/(app)/advisor/page.tsx,
 * and lib/opportunities/persist-matches.ts — this is the single source of truth.
 *
 * Pure and deterministic: ties keep their original input order (Array.prototype.sort is
 * stable), so identical input always produces identical output.
 */
export function rankDimensionGaps(scores: DimensionScoreRow[]): ProfileGap[] {
  if (scores.length === 0) return [];

  const strongestScore = Math.max(...scores.map((s) => s.score));
  const ranked = [...scores].sort((a, b) => a.score - b.score);

  return ranked.map((row, index) => {
    const rank = index + 1;
    const spreadFromStrongest = strongestScore - row.score;
    return {
      dimension: row.dimension,
      score: row.score,
      confidence: row.confidence,
      severity: severityFor(row, rank, spreadFromStrongest),
      rank,
      spreadFromStrongest,
      reasonCodes: row.reasonCodes,
    };
  });
}
