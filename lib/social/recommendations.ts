/** Same accepted-connection-and-unblocked shape as skill endorsements and messages —
 * see migration 0035's INSERT policy, which this mirrors. */
export interface RecommendationEligibilityInput {
  isSelf: boolean;
  hasAcceptedConnection: boolean;
  isBlocked: boolean;
}

export type RecommendationIneligibleReason = "self" | "not_connected" | "blocked";

export function checkRecommendationEligibility(input: RecommendationEligibilityInput): RecommendationIneligibleReason | null {
  if (input.isSelf) return "self";
  if (input.isBlocked) return "blocked";
  if (!input.hasAcceptedConnection) return "not_connected";
  return null;
}

export function canWriteRecommendation(input: RecommendationEligibilityInput): boolean {
  return checkRecommendationEligibility(input) === null;
}
