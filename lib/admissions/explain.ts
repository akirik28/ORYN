import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { ProfileDimension } from "@/types/database";

export interface OutlookExplanation {
  strengths: string[];
  gaps: string[];
  unknowns: string[];
}

const ALWAYS_UNKNOWN = ["Essays", "Recommendations", "Applicant pool in this admission cycle"];

/** Mandatory outlook explanation (Phase 16.2) — generic strengths/gaps derived from the
 * student's own dimension scores relative to each other (not this specific school's
 * actual holistic review, which Oryn has no access to — hence "unknowns" always
 * includes essays/recommendations/applicant pool). */
export function explainOutlook(scores: Partial<Record<ProfileDimension, number>>): OutlookExplanation {
  const entries = Object.entries(scores) as [ProfileDimension, number][];
  if (entries.length === 0) {
    return { strengths: [], gaps: [], unknowns: ALWAYS_UNKNOWN };
  }

  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  const strengths = sorted.slice(0, 2).filter(([, score]) => score >= 55).map(([dimension]) => DIMENSION_LABELS[dimension]);
  const gaps = sorted.slice(-2).filter(([, score]) => score < 55).map(([dimension]) => DIMENSION_LABELS[dimension]);

  return { strengths, gaps, unknowns: ALWAYS_UNKNOWN };
}
