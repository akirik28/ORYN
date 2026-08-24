import type { DataConfidence, ProfileDimension } from "@/types/database";

/**
 * Qualitative evidence states for the Profile Signal (UI-V3 § 11).
 *
 * The dashboard deliberately does not show a student "Research: 42/100" as its primary
 * read. A two-digit number invites the belief that 42 and 44 are meaningfully different,
 * that the scale is calibrated against other applicants, and that moving it is the goal —
 * none of which is true. The underlying 0-100 score is a real internal quantity used for
 * ranking and gap detection; it just isn't a good thing to *say* to a 16-year-old.
 */
export type EvidenceState = "strong" | "developing" | "limited_evidence" | "needs_attention";

export const EVIDENCE_STATE_LABELS: Record<EvidenceState, string> = {
  strong: "Strong",
  developing: "Developing",
  limited_evidence: "Limited evidence",
  needs_attention: "Needs attention",
};

/**
 * `limited_evidence` is checked before any score band, and that ordering is the whole
 * point (master spec Phase 68 — "Oryn should know when it does not know enough").
 *
 * A dimension Oryn has almost no data for produces a low score for the same reason an
 * genuinely weak one does, and the two mean opposite things to a student: one says "go do
 * something", the other says "tell me what you've already done". Reading `confidence`
 * first keeps Oryn from telling someone their research is weak when the truth is that it
 * has never been described.
 *
 * `needs_attention` is therefore a claim Oryn only makes when it has enough data to stand
 * behind it.
 */
export function evidenceStateFor(score: number, confidence: DataConfidence): EvidenceState {
  if (confidence === "low") return "limited_evidence";
  if (score >= 70) return "strong";
  if (score >= 40) return "developing";
  return "needs_attention";
}

export interface DimensionSignal {
  dimension: ProfileDimension;
  state: EvidenceState;
  /** Retained for ordering and for the detail views; never rendered as the headline. */
  score: number;
  confidence: DataConfidence;
}

/** Ordered strongest-first, so the signal reads as a profile shape rather than a checklist. */
export function buildProfileSignal(
  scores: { dimension: ProfileDimension; score: number; confidence: DataConfidence }[],
): DimensionSignal[] {
  const rank: Record<EvidenceState, number> = {
    strong: 0,
    developing: 1,
    needs_attention: 2,
    limited_evidence: 3,
  };
  return scores
    .map((s) => ({
      dimension: s.dimension,
      state: evidenceStateFor(s.score, s.confidence),
      score: s.score,
      confidence: s.confidence,
    }))
    .sort((a, b) => rank[a.state] - rank[b.state] || b.score - a.score);
}

/**
 * Whether Oryn has enough confident evidence anywhere in the profile to make claims about
 * it at all.
 *
 * This exists because of a contradiction caught on a real account: `rankDimensionGaps`
 * picks the lowest-scoring dimension regardless of confidence, so an empty profile — every
 * dimension at 0 with low confidence — still produced a confident-sounding headline
 * ("Your clearest gap right now is academics") directly above a Profile Signal reporting
 * "Limited evidence" for that same dimension. Oryn was naming a weakness in data it had
 * just admitted it did not have.
 *
 * A surface that asserts a gap must check this first and fall back to asking for evidence
 * instead (master spec Phase 68 / non-negotiable requirement 12: completeness and strength
 * are different things, and a low score caused by silence is a completeness problem).
 */
export function hasConfidentSignal(signal: DimensionSignal[]): boolean {
  return signal.some((s) => s.state !== "limited_evidence");
}

/** The state Oryn has recorded for one dimension, or null when it isn't scored at all. */
export function signalStateFor(
  signal: DimensionSignal[],
  dimension: ProfileDimension,
): EvidenceState | null {
  return signal.find((s) => s.dimension === dimension)?.state ?? null;
}

/**
 * Whether a surface may name `dimension` as a gap. False when Oryn has no confident read
 * on the profile at all, and false when this particular dimension is the unknown one —
 * either way the honest move is to ask for evidence, not to diagnose.
 */
export function canClaimGap(signal: DimensionSignal[], dimension: ProfileDimension): boolean {
  if (!hasConfidentSignal(signal)) return false;
  return signalStateFor(signal, dimension) !== "limited_evidence";
}
