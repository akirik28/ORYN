import { reviewsNonAcademicEvidence, type AdmissionSystemShape } from "@/lib/admissions/system-shape";
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
  /**
   * True only when Gate 1 has *established* that this target does not read non-academic
   * evidence (`reviewsNonAcademicEvidence(shape) === false`). Then `strengths`/`gaps` are
   * empty by construction, not by absence of evidence: naming a student's leadership as a
   * reason for an admission decision that has no channel to read it is the same
   * false-holistic framing Gate 1 exists to stop, reproduced one layer up in the copy.
   *
   * Never true for the `"unknown"` shape. "We have not established whether your activities
   * are read here" and "your activities are definitely not read here" are different
   * statements to a student, and only the second one earns silence — the same tri-state
   * discipline `reviewsNonAcademicEvidence` itself keeps.
   */
  profileNotAnInput: boolean;
}

export interface DimensionScoreInput {
  dimension: ProfileDimension;
  score: number;
  confidence: DataConfidence;
}

/**
 * What Oryn cannot see about this admission — and it is not the same list everywhere.
 *
 * The original single list is a US-holistic list: essays and recommendation letters are
 * factors Oryn can't observe *because a reviewer is reading them*. Under YKS, CAO or a Dutch
 * open programme they are not unobserved factors, they are not factors — ÖSYM's placement
 * takes no essay and no reference. Listing them as this target's "unknowns" tells a student
 * that unseen letters are weighing on a decision that never sees one.
 *
 * `academic_threshold` gets an empty list deliberately, not a shorter one: once the published
 * requirements are met, admission follows (RULE-ADMISSIONS-001). There is no cutoff to land
 * above and no reviewer to guess at — the requirement check is the whole answer, and inventing
 * an unknown here would manufacture doubt the mechanism doesn't have.
 */
const UNKNOWNS_BY_SHAPE: Record<AdmissionSystemShape, string[]> = {
  holistic_review: ["Essays", "Recommendations", "Applicant pool in this admission cycle"],
  academic_rank_competitive: ["Where this cycle's score cutoff lands"],
  academic_threshold: [],
  unknown: ["Essays", "Recommendations", "Applicant pool in this admission cycle"],
};

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
 *
 * `admissionSystemShape` is Gate 1's resolved answer for this target
 * (`AdmissionOutlookResult.admissionSystemShape`). Omitting it, or passing `null`/`"unknown"`,
 * produces byte-identical output to before the parameter existed — the same rule the rest of
 * the Gate 1 wiring follows: Oryn changes what it says only where it has *established* that
 * the holistic framing does not describe the target, never on a guess.
 */
export function explainOutlook(scores: DimensionScoreInput[], admissionSystemShape?: AdmissionSystemShape | null): OutlookExplanation {
  const shape = admissionSystemShape ?? "unknown";
  const unknowns = UNKNOWNS_BY_SHAPE[shape];

  // Gate 1 established that nothing here reads non-academic evidence. Strengths and gaps are
  // withheld rather than computed: they are true statements about the student, but this panel
  // presents them as the *reason for the admission classification* (Phase 16.2), and under a
  // placement algorithm or an open-threshold programme they are a reason for nothing. The
  // caller renders the sourced mechanism instead — see `AdmissionOutlookResult.
  // notApplicableReason`, which is the real answer to "why" for these targets.
  //
  // `insufficientData` is deliberately false here even for an empty profile: it drives "we
  // don't know enough about you yet", and that is the wrong sentence for a target where more
  // profile data would not change the answer.
  if (reviewsNonAcademicEvidence(shape) === false) {
    return { strengths: [], gaps: [], unknowns, insufficientData: false, profileNotAnInput: true };
  }

  const evidenced = scores.filter((s) => s.confidence !== "low");
  if (evidenced.length === 0) {
    return { strengths: [], gaps: [], unknowns, insufficientData: true, profileNotAnInput: false };
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

  return { strengths, gaps, unknowns, insufficientData: false, profileNotAnInput: false };
}
