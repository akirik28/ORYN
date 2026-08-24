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
  const distinctResearchFields = new Set(
    facts.researchExperiences.map((r) => r.field).filter((f): f is string => Boolean(f)),
  );
  const hasResearchField = distinctResearchFields.size > 0;

  if (distinctSubjects.size === 0 && facts.certifications.length === 0 && !hasResearchField) {
    return { dimension: "intellectual_curiosity", score: 0, confidence: "low", reasonCodes: [] };
  }

  // Weights sum to a reachable 100. They previously summed to 35, which meant this
  // dimension could never leave "needs attention" no matter what a student did — a
  // maxed-out profile still scored 35/100 and was reported back to them as weak. Every
  // dimension's ceiling is now pinned by a test (see __tests__/scoring/ceilings.test.ts).
  const subjectPoints = Math.min(distinctSubjects.size * 6, 36);
  const certificationPoints = Math.min(facts.certifications.length * 8, 32);
  // Counted, not boolean: exploring two unrelated fields is a stronger curiosity signal
  // than going deeper into one, and this is the breadth dimension.
  const researchFieldPoints = Math.min(distinctResearchFields.size * 16, 32);

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
