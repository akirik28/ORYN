import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore } from "../math";

/**
 * Career exploration measures breadth — how many different kinds of environments and
 * roles a student has actually tried — not depth (that's covered by the other
 * dimensions). It's a breadth signal, not a list of commitments, so it isn't run through
 * the diminishing-returns aggregator the other dimensions use.
 */
export function scoreCareerExploration(facts: ScoringFacts): DimensionResult {
  const distinctCategories = new Set(facts.activities.map((a) => a.category));
  const hasInternship = facts.workExperiences.some((w) => w.employment_type === "internship");
  const distinctOrganizations = new Set(facts.workExperiences.map((w) => w.organization).filter(Boolean));

  if (distinctCategories.size === 0 && facts.workExperiences.length === 0) {
    return { dimension: "career_exploration", score: 0, confidence: "low", reasonCodes: [] };
  }

  // Weights sum to a reachable 100. They previously summed to 32, so this dimension was
  // capped below the "developing" band and a student who had explored widely was still
  // told they needed attention here. See __tests__/scoring/ceilings.test.ts.
  const categoryPoints = Math.min(distinctCategories.size * 9, 36);
  const workExperiencePoints = Math.min(facts.workExperiences.length * 12, 24);
  const internshipPoints = hasInternship ? 22 : 0;
  const multiOrgPoints = distinctOrganizations.size > 1 ? 18 : 0;

  const score = clampScore(categoryPoints + workExperiencePoints + internshipPoints + multiOrgPoints);
  const confidence = distinctCategories.size + facts.workExperiences.length >= 3 ? "medium" : "low";

  const reasonCodes = [
    { code: "activity_breadth", detail: `${distinctCategories.size} distinct activity categor${distinctCategories.size === 1 ? "y" : "ies"}` },
  ];
  if (hasInternship) reasonCodes.push({ code: "internship", detail: "Completed at least one internship" });

  return { dimension: "career_exploration", score, confidence, reasonCodes };
}
