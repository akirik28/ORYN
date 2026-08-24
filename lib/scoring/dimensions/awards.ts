import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, scoreCommitments } from "../math";

/**
 * Award level is free text (students describe their own awards), so this maps common
 * language to a rough tier rather than requiring a fixed enum. Unrecognized wording gets
 * a modest default rather than being scored as if it were unimpressive — the model
 * shouldn't punish a student for phrasing.
 *
 * Rescaled 2026-08-24. The per-item points previously summed to roughly a third of the
 * scale, so the only route to a good score was accumulating three or four items — which
 * inverts the product's own stated principle of depth over quantity (master spec 6.4,
 * "reward execution more than idea creation"; Phase 39, "don't reward activity
 * inflation"). A student with one genuinely outstanding piece of work was shown a score
 * in the lowest band. One excellent item now lands in "developing", two reach "strong",
 * and the diminishing factor still stops a long list of thin items from getting there.
 */
function levelPoints(level: string | null): number {
  const text = (level ?? "").toLowerCase();
  if (/international|global|world/.test(text)) return 48;
  if (/national/.test(text)) return 36;
  if (/state|regional|provincial/.test(text)) return 22;
  if (/school|local|district/.test(text)) return 10;
  return 14;
}

export function scoreAwardsDistinction(facts: ScoringFacts): DimensionResult {
  if (facts.awards.length === 0) {
    return { dimension: "awards_distinction", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = facts.awards.map((award) => ({ label: award.title, basePoints: levelPoints(award.level) }));

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 50,
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
