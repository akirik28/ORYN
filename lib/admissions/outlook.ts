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
   * Non-null only for `admissionSystemType: "credential_gate"` inputs. `outlook_label` is a
   * fixed Postgres enum (migration 0007) with no "not applicable" member, and adding one is a
   * schema change out of this fix's bounds — so `outlook`/`compositeScore` below are still
   * computed via the same profile-strength/selectivity formula as a holistic target, for
   * backward type/DB compatibility, and are NOT a meaningful answer for a credential-gate
   * target. This field is the actual fix: it's the caller's job to check it and suppress or
   * reframe `outlook` rather than display it as a normal reach/likely-style classification —
   * consistent with the design spec's own §7 point 4 (explanation generation must consume the
   * mechanism, not just a label). What IS fully suppressed below, safely, is the numeric
   * estimate range — a percentage-style figure is the one part of this result the shipped
   * non-negotiables (AGENTS.md #5, "never presented with false precision") most directly
   * prohibit for a system this formula doesn't actually model.
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
  const outlook = classifyOutlook(compositeScore);
  const isCredentialGate = inputs.admissionSystemType === "credential_gate";

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
