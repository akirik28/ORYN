import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, scoreCommitments } from "../math";

/**
 * Award level is free text (students describe their own awards), so this maps common
 * language to a rough tier rather than requiring a fixed enum. Unrecognized wording gets
 * a modest default rather than being scored as if it were unimpressive — the model
 * shouldn't punish a student for phrasing.
 */
function levelPoints(level: string | null): number {
  const text = (level ?? "").toLowerCase();
  if (/international|global|world/.test(text)) return 15;
  if (/national/.test(text)) return 11;
  if (/state|regional|provincial/.test(text)) return 7;
  if (/school|local|district/.test(text)) return 3;
  return 4;
}

export function scoreAwardsDistinction(facts: ScoringFacts): DimensionResult {
  if (facts.awards.length === 0) {
    return { dimension: "awards_distinction", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = facts.awards.map((award) => ({ label: award.title, basePoints: levelPoints(award.level) }));

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 20,
    diminishingAfter: 3,
    diminishingFactor: 0.5,
  });

  return {
    dimension: "awards_distinction",
    score: clampScore(points),
    confidence: facts.awards.some((a) => a.level) ? "medium" : "low",
    reasonCodes: breakdown.map((b) => ({ code: b.diminished ? "award_secondary" : "award", detail: b.label })),
  };
}
