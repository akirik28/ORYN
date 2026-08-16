/**
 * Mirrors migration 0034's skill_endorsements INSERT policy exactly — same accepted-
 * connection-and-unblocked rule as messages (0027) and recommendations (0035), plus two
 * endorsement-specific conditions the DB constraint also enforces (own-skill,
 * duplicate). Kept as a pure predicate so the Server Action can return a specific,
 * friendly reason instead of a raw RLS denial, matching every other authorization-
 * sensitive action in this app.
 */
export interface EndorsementEligibilityInput {
  isSelf: boolean;
  hasAcceptedConnection: boolean;
  isBlocked: boolean;
  alreadyEndorsed: boolean;
}

export type EndorsementIneligibleReason = "self" | "not_connected" | "blocked" | "already_endorsed";

export function checkEndorsementEligibility(input: EndorsementEligibilityInput): EndorsementIneligibleReason | null {
  if (input.isSelf) return "self";
  if (input.isBlocked) return "blocked";
  if (!input.hasAcceptedConnection) return "not_connected";
  if (input.alreadyEndorsed) return "already_endorsed";
  return null;
}

export function canEndorseSkill(input: EndorsementEligibilityInput): boolean {
  return checkEndorsementEligibility(input) === null;
}
