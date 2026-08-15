import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore } from "../math";

/**
 * Intellectual curiosity measures subject breadth and self-directed learning — distinct
 * course subjects, certifications pursued outside the school curriculum, and independent
 * research fields. A breadth signal, like career_exploration, so no diminishing-returns
 * aggregation.
 */
export function scoreIntellectualCuriosity(facts: ScoringFacts): DimensionResult {
  const distinctSubjects = new Set(facts.courses.map((c) => c.subject).filter((s): s is string => Boolean(s)));
  const hasResearchField = facts.researchExperiences.some((r) => r.field);

  if (distinctSubjects.size === 0 && facts.certifications.length === 0 && !hasResearchField) {
    return { dimension: "intellectual_curiosity", score: 0, confidence: "low", reasonCodes: [] };
  }

  const subjectPoints = Math.min(distinctSubjects.size * 3, 15);
  const certificationPoints = Math.min(facts.certifications.length * 4, 12);
  const researchFieldPoints = hasResearchField ? 8 : 0;

  const score = clampScore(subjectPoints + certificationPoints + researchFieldPoints);
  const confidence = distinctSubjects.size >= 2 || facts.certifications.length > 0 ? "medium" : "low";

  return {
    dimension: "intellectual_curiosity",
    score,
    confidence,
    reasonCodes: [
      { code: "subject_breadth", detail: `${distinctSubjects.size} distinct course subject(s)` },
      { code: "self_directed_learning", detail: `${facts.certifications.length} certification(s)` },
    ],
  };
}
