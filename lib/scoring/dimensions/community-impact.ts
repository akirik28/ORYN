import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, monthsBetween, scoreCommitments } from "../math";

/** Community impact score: sustained, structured volunteering over one-off entries. */
export function scoreCommunityImpact(facts: ScoringFacts): DimensionResult {
  const referenceDate = facts.referenceDate ?? new Date();

  if (facts.volunteeringExperiences.length === 0) {
    return { dimension: "community_impact", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = facts.volunteeringExperiences.map((experience) => {
    const months = experience.start_date
      ? monthsBetween(experience.start_date, experience.end_date, referenceDate)
      : 0;
    const durationBonus = Math.min(months, 10);
    const hoursBonus = experience.hours_per_week ? Math.min(experience.hours_per_week * 0.5, 6) : 0;
    const causeAreaBonus = experience.cause_area ? 3 : 0;

    return { label: experience.title, basePoints: durationBonus + hoursBonus + causeAreaBonus };
  });

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 25,
    diminishingAfter: 3,
    diminishingFactor: 0.5,
  });

  return {
    dimension: "community_impact",
    score: clampScore(points),
    confidence: facts.volunteeringExperiences.some((e) => e.hours_per_week || e.cause_area) ? "medium" : "low",
    reasonCodes: breakdown.map((b) => ({
      code: b.diminished ? "volunteering_secondary" : "volunteering",
      detail: b.label,
    })),
  };
}
