import type { DataConfidence, ProfileDimension } from "@/types/database";

/**
 * What Oryn is willing to say about one dimension.
 *
 * Five states, not four, because "Oryn has nothing to go on" and "Oryn looked and this is
 * thin" are different sentences and a student deserves to be told which one applies.
 * Collapsing them — which this module did until a 90%-complete profile was seen reporting
 * six simultaneous "Limited evidence" rows — makes an empty section read as a verdict on
 * the student rather than a gap in the record.
 *
 * The naming is also a tone decision. `emerging` replaced a "Needs attention" label: for a
 * 15-17 year old, a column of red-sounding verdicts about things they simply haven't done
 * yet is discouraging without being any more truthful. The score behind it is unchanged
 * and the thinnest dimension is still visibly the thinnest — only the sentence changed.
 *
 * The dashboard deliberately does not show a raw "Research: 42/100" as its primary read.
 * A two-digit number invites the belief that 42 and 44 differ meaningfully, that the scale
 * is calibrated against other applicants, and that moving it is the goal — none of which
 * is true. The underlying score is a real internal quantity used for ranking and gap
 * detection; it just isn't a good thing to *say* to a 16-year-old.
 */
export type EvidenceState =
  /** Nothing recorded at all. Oryn is not making a judgement, because it cannot. */
  | "not_assessed"
  /** Something recorded, but too little to place confidently on the scale. */
  | "limited_evidence"
  /** Confidently assessed, and currently the thinnest part of the profile. */
  | "emerging"
  | "developing"
  | "strong";

export const EVIDENCE_STATE_LABELS: Record<EvidenceState, string> = {
  not_assessed: "Not enough evidence yet",
  limited_evidence: "Limited evidence",
  emerging: "A good next area to strengthen",
  developing: "Developing",
  strong: "Strong",
};

/** Compact forms for dense rows where the full label would wrap or truncate. */
export const EVIDENCE_STATE_SHORT_LABELS: Record<EvidenceState, string> = {
  not_assessed: "Nothing yet",
  limited_evidence: "Limited evidence",
  emerging: "Next to strengthen",
  developing: "Developing",
  strong: "Strong",
};

/**
 * States in which Oryn is actually asserting something *about the student*.
 *
 * `not_assessed` and `limited_evidence` are statements about the record, not the person,
 * so any surface counting "weak areas" — or picking one to name as a gap — must exclude
 * them. Treating them as weakness is exactly what made a nearly-empty profile look like a
 * failing one.
 */
export function isAssessed(state: EvidenceState): boolean {
  return state === "emerging" || state === "developing" || state === "strong";
}

/**
 * Order matters here, and it is the whole point of the function.
 *
 * "Nothing recorded" is checked before confidence, and confidence before any score band —
 * a dimension with no data produces score 0 by construction, and reporting that 0 as a
 * weakness is the single most misleading thing this could do (master spec Phase 68:
 * completeness is not strength, and Oryn should know when it doesn't know enough).
 */
export function evidenceStateFor(
  score: number,
  confidence: DataConfidence,
  /** Whether the dimension has any underlying records. Derived from `reason_codes`, which
   *  every dimension leaves empty when it found nothing to score. */
  hasEvidence: boolean,
): EvidenceState {
  if (!hasEvidence) return "not_assessed";
  if (confidence === "low") return "limited_evidence";
  if (score >= 70) return "strong";
  if (score >= 40) return "developing";
  return "emerging";
}

export interface DimensionSignal {
  dimension: ProfileDimension;
  state: EvidenceState;
  /** Retained for ordering and for the detail views; never rendered as the headline. */
  score: number;
  confidence: DataConfidence;
}

export interface DimensionScoreRow {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
  /** `profile_scores.reason_codes` — empty means the dimension found nothing to score. */
  reasonCodes?: unknown[] | null;
}

/**
 * Ordered so a student reads what Oryn knows before what it doesn't: assessed states
 * first, strongest first, with the two "not enough to say" states last.
 */
export function buildProfileSignal(scores: DimensionScoreRow[]): DimensionSignal[] {
  const rank: Record<EvidenceState, number> = {
    strong: 0,
    developing: 1,
    emerging: 2,
    limited_evidence: 3,
    not_assessed: 4,
  };
  return scores
    .map((s) => ({
      dimension: s.dimension,
      state: evidenceStateFor(s.score, s.confidence, (s.reasonCodes?.length ?? 0) > 0),
      score: s.score,
      confidence: s.confidence,
    }))
    .sort((a, b) => rank[a.state] - rank[b.state] || b.score - a.score);
}

/**
 * Whether Oryn has enough evidence anywhere in the profile to make claims about it at all.
 *
 * This exists because of a contradiction caught on a real account: `rankDimensionGaps`
 * picks the lowest-scoring dimension regardless of confidence, so an empty profile — every
 * dimension at 0 — still produced a confident headline ("Your clearest gap right now is
 * academics") directly above a signal reporting that Oryn had nothing on academics. It was
 * naming a weakness in data it had just admitted it did not have.
 *
 * A surface that asserts a gap must check this first and ask for evidence instead.
 */
export function hasConfidentSignal(signal: DimensionSignal[]): boolean {
  return signal.some((s) => isAssessed(s.state));
}

/** The state Oryn has recorded for one dimension, or null when it isn't scored at all. */
export function signalStateFor(
  signal: DimensionSignal[],
  dimension: ProfileDimension,
): EvidenceState | null {
  return signal.find((s) => s.dimension === dimension)?.state ?? null;
}

/**
 * Whether a surface may name `dimension` as a gap. False when Oryn has no read on the
 * profile at all, and false when this particular dimension is one it hasn't assessed —
 * either way the honest move is to ask for evidence, not to diagnose.
 */
export function canClaimGap(signal: DimensionSignal[], dimension: ProfileDimension): boolean {
  if (!hasConfidentSignal(signal)) return false;
  const state = signalStateFor(signal, dimension);
  return state !== null && isAssessed(state);
}

/**
 * How many dimensions Oryn has actually assessed, and how many it simply hasn't been told
 * about. Surfaces use this to explain a hedge honestly ("3 areas still have nothing
 * recorded") instead of implying the student is weak across the board.
 */
export function signalCoverage(signal: DimensionSignal[]): {
  assessed: number;
  awaitingEvidence: number;
  strong: number;
  total: number;
} {
  return {
    assessed: signal.filter((s) => isAssessed(s.state)).length,
    awaitingEvidence: signal.filter((s) => s.state === "not_assessed" || s.state === "limited_evidence").length,
    strong: signal.filter((s) => s.state === "strong").length,
    total: signal.length,
  };
}
