import type { EvidenceClass } from "./types";

/**
 * Design doc §9's safety envelope: the job MAY demote to `closed`, MAY NOT auto-promote to
 * `open`, and ships with demotion disabled. Every function here is a pure decision — the
 * actual `opportunities` write happens in ./run-job.ts, gated on both this module's verdict
 * AND the deploy-wide REVERIFY_ALLOW_DEMOTION kill switch (checked there, not here, since
 * that's an env read and this module stays a pure function of its inputs for testability).
 */

/** Design doc §9(1): demotion to `closed` requires ALL three. `evidenceClass` must be P1
 * (content floor, page identity and excerpt-located already passed — see ./classify.ts);
 * `explicitClosurePhraseMatched` is the literal closure-phrase match from
 * classifyAgainstStoredState; `futureDatedApplicationSignalFound` is the "2026 closed / 2027
 * announced" ambiguity — a page can say both, meaning the cycle is transitioning, not dead,
 * and ./classify.ts's own `agrees` (not `disagreement`) branch already routes that shape
 * away from ever reaching this function with closure-only signal in the first place. This
 * function still checks it explicitly rather than trusting the caller got that routing
 * right — the precondition is cheap to re-verify and the cost of getting it wrong (a false
 * demotion) is exactly what §9 exists to prevent. */
export interface DemotionEligibilityInput {
  evidenceClass: EvidenceClass | null;
  explicitClosurePhraseMatched: boolean;
  futureDatedApplicationSignalFound: boolean;
}

export type DemotionIneligibleReason = "not_p1" | "no_explicit_closure_phrase" | "future_dated_signal_present";

export interface DemotionEligibility {
  eligible: boolean;
  reason?: DemotionIneligibleReason;
}

export function isDemotionEligible(input: DemotionEligibilityInput): DemotionEligibility {
  if (input.evidenceClass !== "P1") return { eligible: false, reason: "not_p1" };
  if (!input.explicitClosurePhraseMatched) return { eligible: false, reason: "no_explicit_closure_phrase" };
  if (input.futureDatedApplicationSignalFound) return { eligible: false, reason: "future_dated_signal_present" };
  return { eligible: true };
}

/** Design doc §9(5): "if a single run would demote more than 10% of its batch (≥3 of 25),
 * it applies none of them and flags the whole run." Both the ratio AND a floor of 3 are
 * required to block — a floor alone would let 3 real closures in a 500-row batch trip the
 * guard for no reason; a ratio alone would let 1-2 closures in a tiny (e.g. max_rows: 8)
 * batch trip it on completely ordinary output. The same "a ratio over a tiny sample is
 * noise" reasoning §6.5's circuit breaker states explicitly for its own minimum-sample-of-5
 * rule — not stated this plainly for the volume guard in the design doc itself, but the
 * literal "≥3 of 25" example already implies a floor rather than a bare 10% (10% of 25 is
 * 2.5, and "≥3" is that ratio rounded up at the illustrated batch size, not a separate rule
 * — this function generalizes it to any caller-supplied batch size per §2.3/§5.2, where 25
 * is a default, not a constant). */
export const DEMOTION_VOLUME_GUARD_RATIO = 0.1;
export const DEMOTION_VOLUME_GUARD_MIN_COUNT = 3;

export function volumeGuardBlocksRun(proposedDemotionCount: number, batchSize: number): boolean {
  if (batchSize <= 0 || proposedDemotionCount < DEMOTION_VOLUME_GUARD_MIN_COUNT) return false;
  return proposedDemotionCount / batchSize > DEMOTION_VOLUME_GUARD_RATIO;
}

/** Design doc §9(2): promotion to `open` is never automatic, unconditionally — this function
 * exists only so callers have a symmetric, equally-explicit thing to call instead of
 * inlining "always false" at the write site, where a future edit could quietly change it.
 * The whole point of §9(2) is that no evidence, no evidence class and no volume make this
 * true. */
export function canAutoApplyPromotion(): false {
  return false;
}
