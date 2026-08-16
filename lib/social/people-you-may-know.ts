/**
 * Deterministic People You May Know ranking (spec V1 — no AI). Two pure pieces: who's
 * excluded, and how a remaining candidate is scored/explained. Data gathering (who
 * shares a school, an interest, a mutual connection) happens in the server-only
 * lib/social/people-you-may-know-query.ts; everything here is pure so both halves are
 * independently testable without a database.
 */

export interface PYMKExclusionInput {
  candidateId: string;
  selfId: string;
  /** Any connections row with this user in either direction, any status (pending,
   * accepted, or declined) — a person already in your connections flow, in any state,
   * isn't a "may know" suggestion. */
  hasAnyConnectionRecord: boolean;
  /** Either direction. */
  isBlocked: boolean;
}

export function isExcludedFromPeopleYouMayKnow(input: PYMKExclusionInput): boolean {
  if (input.candidateId === input.selfId) return true;
  if (input.hasAnyConnectionRecord) return true;
  if (input.isBlocked) return true;
  return false;
}

export interface PYMKSignals {
  mutualConnectionCount: number;
  sameSchool: boolean;
  overlappingInterests: string[];
  overlappingSkills: string[];
}

export interface PYMKScore {
  score: number;
  /** Ordered, human-readable — the first 1-2 are what the UI shows (spec examples:
   * "3 mutual connections", "Also interested in Economics", "Same school"). */
  reasons: string[];
}

const MAX_MUTUAL_WEIGHT = 10; // caps one signal from dominating the ranking entirely
const MAX_INTEREST_REASONS = 2;

/** Weights are a starting point, not a tuned model — the point of V1 is "some real
 * signal, explained honestly", not a precisely calibrated score. Mutual connections
 * weighted highest (the strongest real-world signal that two people are actually in the
 * same community), same school next, shared interests/skills last (weaker, more
 * common, less distinguishing). */
export function scorePeopleYouMayKnowCandidate(signals: PYMKSignals): PYMKScore {
  const reasons: string[] = [];
  let score = 0;

  if (signals.mutualConnectionCount > 0) {
    score += Math.min(signals.mutualConnectionCount, MAX_MUTUAL_WEIGHT) * 3;
    reasons.push(`${signals.mutualConnectionCount} mutual connection${signals.mutualConnectionCount === 1 ? "" : "s"}`);
  }
  if (signals.sameSchool) {
    score += 5;
    reasons.push("Same school");
  }
  for (const interest of signals.overlappingInterests.slice(0, MAX_INTEREST_REASONS)) {
    score += 2;
    reasons.push(`Also interested in ${interest}`);
  }
  if (signals.overlappingSkills.length > 0) {
    score += Math.min(signals.overlappingSkills.length, 5);
    reasons.push(`Shares ${signals.overlappingSkills.length} skill${signals.overlappingSkills.length === 1 ? "" : "s"} with you`);
  }

  return { score, reasons };
}

/** A candidate with zero signals (score 0, no reasons) shouldn't be suggested at all —
 * distinguishes "ranked last" from "not actually a match for any stated reason". */
export function hasAnyPeopleYouMayKnowSignal(score: PYMKScore): boolean {
  return score.score > 0;
}
