import type { ReverificationCandidate, PriorityBreakdown } from "./types";

/**
 * The ranking function — design doc §4.1, additively weighted rather than multiplicative
 * (Phase 38 warns against blindly multiplying priority factors; a product of normalized
 * terms collapses to near-zero whenever any single term is small, which would let one
 * zero-value factor mask genuine risk). Weights sum to 1.0 by construction; keep it that way
 * if any of these four ever change.
 */
export const EXPOSURE_WEIGHT = 0.4;
export const RISK_WEIGHT_WEIGHT = 0.25;
export const OVERDUE_WEIGHT = 0.25;
export const SAVED_WEIGHT = 0.1;

/**
 * `(max_match_score / 100) × (n_eligible_users / n_matched_users)` — design doc §4.1. Both
 * terms must be high to score high: a row can be a strong match for its matched students
 * (high max_match_score) and still score low exposure if few of the corpus's matched
 * students are among them. `totalDistinctMatchedUsers` is the corpus-wide denominator
 * (design doc's own A6: "7 today... recompute per run"), never a per-row constant.
 *
 * Guards divide-by-zero: an empty corpus (no student has any match yet) makes every row's
 * exposure 0, not NaN — the honest answer when there is nothing to be exposed to.
 */
export function computeExposureNorm(maxMatchScore: number | null, matchedUserCount: number, totalDistinctMatchedUsers: number): number {
  if (totalDistinctMatchedUsers <= 0 || maxMatchScore === null || matchedUserCount <= 0) return 0;
  return (maxMatchScore / 100) * (matchedUserCount / totalDistinctMatchedUsers);
}

/**
 * Design doc §4.1's risk table, keyed by (cycleStatus, hasDeadline). `discontinued` is not
 * listed in that table — a gap in the design doc itself, not a contradiction — filled in
 * here at 0.2, the same weight as closed/historical: a discontinued programme is equally
 * non-actionable and equally a false-negative-only risk (nothing is lost by ranking it low;
 * the actual harm class this whole ranking protects against — recommending something
 * unavailable — cannot occur for a status that already excludes the row from recommendation
 * via lib/opportunities/lifecycle.ts's NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES).
 */
export function riskWeightForCycleStatus(cycleStatus: ReverificationCandidate["cycleStatus"], hasDeadline: boolean): number {
  switch (cycleStatus) {
    case "open":
      return hasDeadline ? 0.8 : 1.0;
    case "upcoming":
      return hasDeadline ? 0.5 : 1.0;
    case "date_not_announced":
      return 0.5;
    case "unverified":
      return 0.3;
    case "closed":
    case "historical":
    case "discontinued":
      return 0.2;
  }
}

/**
 * `clamp(days_since_source_verified / effective_ttl, 0, 2) / 2` — design doc §4.1. Saturates
 * at 2× TTL deliberately: an unbounded age term would let one ancient, irrelevant row
 * outrank a high-exposure row indefinitely.
 *
 * `sourceVerifiedAt === null` (never checked) returns 1.0 (saturated), never a computed
 * value against some assumed epoch — design doc §4.2: "on the first call, every row is
 * maximally overdue... with no freshness information to discriminate on, the queue should
 * be ordered by how much damage a wrong row does," which only holds if every never-checked
 * row ties at the same overdue value rather than one being arbitrarily "more overdue" than
 * another by dint of an assumed start date.
 */
export function computeOverdueNorm(sourceVerifiedAt: string | null, effectiveTtlDays: number, referenceDate: Date = new Date()): number {
  if (!sourceVerifiedAt) return 1.0;
  const verifiedAtMs = Date.parse(sourceVerifiedAt);
  if (Number.isNaN(verifiedAtMs)) return 1.0;

  const daysSince = Math.max(0, (referenceDate.getTime() - verifiedAtMs) / (24 * 60 * 60 * 1000));
  const ratio = effectiveTtlDays > 0 ? daysSince / effectiveTtlDays : 2;
  return Math.min(Math.max(ratio, 0), 2) / 2;
}

/** `min(n_saved, 3) / 3` — design doc §4.1. */
export function computeSavedNorm(savedCount: number): number {
  return Math.min(Math.max(savedCount, 0), 3) / 3;
}

export function computePriorityBreakdown(params: { exposureNorm: number; riskWeight: number; overdueNorm: number; savedNorm: number }): PriorityBreakdown {
  const priority = EXPOSURE_WEIGHT * params.exposureNorm + RISK_WEIGHT_WEIGHT * params.riskWeight + OVERDUE_WEIGHT * params.overdueNorm + SAVED_WEIGHT * params.savedNorm;
  return { ...params, priority };
}

export interface RankedCandidate {
  candidate: ReverificationCandidate;
  breakdown: PriorityBreakdown;
}

/**
 * The full per-candidate computation, given the two run-scoped constants §4.1 requires:
 * `totalDistinctMatchedUsers` (exposure_norm's shared denominator) and a TTL resolver
 * (kept as an injected function rather than importing ./ttl directly, so this module stays
 * testable against fixed TTL values without also pinning ttl.ts's own bucket table).
 */
export function rankCandidate(
  candidate: ReverificationCandidate,
  params: { totalDistinctMatchedUsers: number; effectiveTtlDays: number; referenceDate?: Date }
): RankedCandidate {
  const referenceDate = params.referenceDate ?? new Date();
  const exposureNorm = computeExposureNorm(candidate.maxMatchScore, candidate.matchedUserCount, params.totalDistinctMatchedUsers);
  const riskWeight = riskWeightForCycleStatus(candidate.cycleStatus, candidate.deadline !== null);
  const overdueNorm = computeOverdueNorm(candidate.sourceVerifiedAt, params.effectiveTtlDays, referenceDate);
  const savedNorm = computeSavedNorm(candidate.savedCount);
  return { candidate, breakdown: computePriorityBreakdown({ exposureNorm, riskWeight, overdueNorm, savedNorm }) };
}

/**
 * Sorts highest-priority first. Tie-break: deadline ascending with nulls last, then `id` —
 * design doc §4.1, "for run-to-run determinism." A stable, arbitrary-but-deterministic order
 * matters more than which specific tie-break rule was picked.
 */
export function sortByPriorityDescending(ranked: RankedCandidate[]): RankedCandidate[] {
  return [...ranked].sort((a, b) => {
    if (b.breakdown.priority !== a.breakdown.priority) return b.breakdown.priority - a.breakdown.priority;

    const deadlineA = a.candidate.deadline;
    const deadlineB = b.candidate.deadline;
    if (deadlineA !== deadlineB) {
      if (deadlineA === null) return 1;
      if (deadlineB === null) return -1;
      return deadlineA < deadlineB ? -1 : 1;
    }

    return a.candidate.id < b.candidate.id ? -1 : a.candidate.id > b.candidate.id ? 1 : 0;
  });
}
