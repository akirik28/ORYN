import type { DataConfidence, OutlookLabel } from "@/types/database";

export const ADMISSION_MODEL_VERSION = "admission_model_v1";

/** Selectivity penalty applied to profile strength — configurable, named constants per
 * spec 17 ("all formula parameters must be configurable"), not magic numbers inline. */
const SELECTIVITY_PENALTY = {
  extreme: 45, // admission rate < 10%
  very_high: 22, // 10-25%
  high: 12, // 25-50%
  moderate: 5, // 50-75%
  lower: 0, // > 75%
  unknown: 15, // no admission rate on file — conservative middle-ground penalty
} as const;

function selectivityTier(admissionRate: number | null): keyof typeof SELECTIVITY_PENALTY {
  if (admissionRate === null) return "unknown";
  if (admissionRate < 0.1) return "extreme";
  if (admissionRate < 0.25) return "very_high";
  if (admissionRate < 0.5) return "high";
  if (admissionRate < 0.75) return "moderate";
  return "lower";
}

function classifyOutlook(compositeScore: number): OutlookLabel {
  if (compositeScore >= 70) return "likely";
  if (compositeScore >= 55) return "strong";
  if (compositeScore >= 40) return "competitive";
  if (compositeScore >= 20) return "reach";
  return "extreme_reach";
}

/**
 * Gate 1 from `docs/research/counseling-intelligence/18-geography-conditional-scoring-design-
 * spec.md` §2: does the student's target admissions system review non-academic evidence at
 * all? "holistic" = USA always, UK/France narrowly (per that spec's §3.1-3.2). "credential_gate"
 * = Turkey/YKS, Germany generally, most of continental Europe (§3.3-3.4) — profile strength
 * built from the 9-dimension taxonomy is not what these systems actually evaluate on.
 * Optional and defaults to the pre-existing (implicitly "holistic") behavior — every caller
 * that doesn't pass it gets byte-identical output to before this field existed.
 */
export type AdmissionSystemType = "holistic" | "credential_gate";

export interface AdmissionOutlookInputs {
  /** 0-100 overall career profile score. */
  profileStrength: number;
  /** General institutional admission rate, 0-1, or null if unknown. Never treated as this student's individual probability — see the module doc below. */
  admissionRate: number | null;
  /** Confidence in the underlying profile data (low profile completeness => lower confidence in the whole outlook). */
  dataConfidence: DataConfidence;
  /** See AdmissionSystemType. Omit or pass "holistic" for unchanged existing behavior. */
  admissionSystemType?: AdmissionSystemType;
}

export interface AdmissionOutlookResult {
  outlook: OutlookLabel;
  compositeScore: number;
  selectivityTier: keyof typeof SELECTIVITY_PENALTY;
  /** Optional experimental range, whole-number percentage points, e.g. 15-25. Null unless there's enough real data to support even a wide approximation — never a single-point figure. */
  estimateRangeLow: number | null;
  estimateRangeHigh: number | null;
  estimateConfidence: DataConfidence | null;
  modelVersion: string;
  /**
   * Non-null only when `outlook === "not_applicable"` (i.e. `admissionSystemType:
   * "credential_gate"` inputs) — the human-readable explanation to pair with that label so a
   * caller never has to reverse-engineer why. Migration 0049 added `outlook_label`'s
   * `not_applicable` member specifically so this field and `outlook` always agree instead of
   * `outlook` still claiming a confident reach/likely-style classification while this field
   * says it doesn't apply.
   */
  notApplicableReason: string | null;
}

/**
 * Transparent heuristic admission outlook (spec Phase 16/17) — a general institutional
 * admission rate is never presented as an individual student's probability. The
 * composite score combines the student's profile strength with the school's selectivity;
 * the optional numeric range is a deliberately wide, low/medium-confidence approximation,
 * never higher confidence and never single-point precision.
 */
export function computeAdmissionOutlook(inputs: AdmissionOutlookInputs): AdmissionOutlookResult {
  const tier = selectivityTier(inputs.admissionRate);
  const compositeScore = Math.max(0, Math.min(100, inputs.profileStrength - SELECTIVITY_PENALTY[tier]));
  const isCredentialGate = inputs.admissionSystemType === "credential_gate";
  // compositeScore is still computed above (a real, if not admissions-relevant, read of raw
  // profile strength vs. the target's selectivity) so callers keep a numeric field to persist/
  // display if useful, but the LABEL itself must not claim a holistic-review classification
  // that doesn't describe this target — that's what "not_applicable" (migration 0049) is for.
  const outlook = isCredentialGate ? "not_applicable" : classifyOutlook(compositeScore);

  let estimateRangeLow: number | null = null;
  let estimateRangeHigh: number | null = null;
  let estimateConfidence: DataConfidence | null = null;

  if (inputs.admissionRate !== null && !isCredentialGate) {
    const baseRate = inputs.admissionRate * 100;
    const nudge = (compositeScore - 50) * 0.4;
    const center = Math.max(1, Math.min(95, baseRate + nudge));
    estimateRangeLow = Math.round(Math.max(1, center - 10));
    estimateRangeHigh = Math.round(Math.min(99, center + 10));
    estimateConfidence = inputs.dataConfidence === "high" ? "medium" : "low";
  }

  return {
    outlook,
    compositeScore: Math.round(compositeScore),
    selectivityTier: tier,
    estimateRangeLow,
    estimateRangeHigh,
    estimateConfidence,
    modelVersion: ADMISSION_MODEL_VERSION,
    notApplicableReason: isCredentialGate
      ? "This target's admissions system is credential/exam-gated — non-academic profile strength is not a general input to the admission decision itself, so this outlook should not be shown as a normal reach/competitive/likely-style classification. See 18-geography-conditional-scoring-design-spec.md §3.3-3.4."
      : null,
  };
}
