import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, scoreRankedDistinctions } from "../math";

/**
 * Award level is free text (students describe their own awards), so this maps common
 * language to a rough tier rather than requiring a fixed enum. Unrecognized wording gets
 * a modest default rather than being scored as if it were unimpressive — the model
 * shouldn't punish a student for phrasing.
 *
 * The gaps between tiers are wide on purpose. Selection at national level is a materially
 * different claim from winning a prize inside one school, and a scale that treats them as
 * neighbouring rungs lets volume paper over the difference.
 */
function levelPoints(level: string | null): number {
  const text = (level ?? "").toLowerCase();
  if (/international|global|world/.test(text)) return 70;
  if (/national/.test(text)) return 52;
  if (/state|regional|provincial/.test(text)) return 30;
  if (/school|local|district/.test(text)) return 12;
  return 20;
}

/**
 * Awards & distinction.
 *
 * Reworked 2026-08-24 for quality over quantity. Under the previous aggregation eight
 * school-level awards scored 55 while one national award scored 36 and one international
 * award scored 48 — a student could out-score a national medallist by listing prizes from
 * their own school. That directly contradicts the product principle this dimension exists
 * to express (Phase 39, "don't reward activity inflation"; § 6.4, depth over count).
 *
 * The fix is the aggregation shape, not the tier values alone: the strongest single award
 * now carries full weight and every subsequent one decays geometrically, so the ceiling on
 * accumulating low-tier items sits below one genuinely significant result.
 */
export function scoreAwardsDistinction(facts: ScoringFacts): DimensionResult {
  if (facts.awards.length === 0) {
    return { dimension: "awards_distinction", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = facts.awards.map((award) => ({ label: award.title, basePoints: levelPoints(award.level) }));

  const { points, breakdown } = scoreRankedDistinctions(items, {
    perItemCap: 70,
    decay: 0.5,
    minWeight: 0.125,
  });

  return {
    dimension: "awards_distinction",
    score: clampScore(points),
    confidence: facts.awards.some((a) => a.level) ? "medium" : "low",
    reasonCodes: breakdown.map((b) => ({ code: b.diminished ? "award_secondary" : "award", detail: b.label })),
  };
}
