import type { ResearchOutputType } from "@/types/database";
import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, monthsBetween, scoreCommitments } from "../math";

const OUTPUT_BONUS: Record<ResearchOutputType, number> = {
  none: 0,
  presentation: 5,
  poster: 6,
  school_journal: 7,
  preprint: 9,
  peer_reviewed_publication: 10,
  other: 4,
};

/**
 * Research score (spec 6.5). Publication is one of several signals, not a requirement —
 * duration, methodology, mentorship, and independence together can carry a strong score
 * with output_type still "none".
 */
export function scoreResearch(facts: ScoringFacts): DimensionResult {
  const referenceDate = facts.referenceDate ?? new Date();

  if (facts.researchExperiences.length === 0) {
    return { dimension: "research", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = facts.researchExperiences.map((experience) => {
    const months = experience.start_date
      ? monthsBetween(experience.start_date, experience.end_date, referenceDate)
      : 0;
    const durationBonus = Math.min(months * 1.3, 10);
    const methodologyBonus = experience.methodology && experience.methodology.trim().length > 10 ? 7 : 0;
    const mentorBonus = experience.mentor_name ? 5 : 0;
    const independenceBonus = experience.independence_level ? 4 : 0;
    const outputBonus = OUTPUT_BONUS[experience.output_type];

    return {
      label: experience.title,
      basePoints: durationBonus + methodologyBonus + mentorBonus + independenceBonus + outputBonus,
    };
  });

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 30,
    diminishingAfter: 2,
    diminishingFactor: 0.4,
  });

  const score = clampScore(points);
  const hasDepthSignal = facts.researchExperiences.some((e) => e.methodology || e.mentor_name);
  const confidence = hasDepthSignal ? "medium" : "low";

  return {
    dimension: "research",
    score,
    confidence,
    reasonCodes: breakdown.map((b) => ({
      code: b.diminished ? "research_experience_secondary" : "research_experience",
      detail: b.label,
    })),
  };
}
