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

export interface AdmissionOutlookInputs {
  /** 0-100 overall career profile score. */
  profileStrength: number;
  /** General institutional admission rate, 0-1, or null if unknown. Never treated as this student's individual probability — see the module doc below. */
  admissionRate: number | null;
  /** Confidence in the underlying profile data (low profile completeness => lower confidence in the whole outlook). */
  dataConfidence: DataConfidence;
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
  const outlook = classifyOutlook(compositeScore);

  let estimateRangeLow: number | null = null;
  let estimateRangeHigh: number | null = null;
  let estimateConfidence: DataConfidence | null = null;

  if (inputs.admissionRate !== null) {
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
  };
}
