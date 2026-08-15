import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, monthsBetween, scoreCommitments } from "../math";

/**
 * Leadership score (spec 6.3). A title by itself is worth almost nothing — the bulk of
 * the score comes from duration, people led, and organizational scope, which is why
 * "President" with no other signal stays well under a "strong" reading. Multiple
 * leadership roles don't stack without limit: the strongest few count in full, the rest
 * at a discount, so five shallow club memberships can't out-score one substantive role.
 */
export function scoreLeadership(facts: ScoringFacts): DimensionResult {
  const referenceDate = facts.referenceDate ?? new Date();
  const leadershipActivities = facts.activities.filter((a) => a.is_leadership_role);

  if (leadershipActivities.length === 0) {
    return { dimension: "leadership", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = leadershipActivities.map((activity) => {
    const titleBonus = 3;
    const months = activity.start_date ? monthsBetween(activity.start_date, activity.end_date, referenceDate) : 0;
    const durationBonus = Math.min(months * 1.5, 12);
    const peopleLedBonus = activity.people_led ? Math.min(Math.log2(activity.people_led + 1) * 3, 10) : 0;
    const scopeBonus = activity.organization_scope ? 4 : 0;

    return {
      label: activity.title,
      basePoints: titleBonus + durationBonus + peopleLedBonus + scopeBonus,
    };
  });

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 30,
    diminishingAfter: 3,
    diminishingFactor: 0.4,
  });

  const score = clampScore(points);
  const confidence = leadershipActivities.some((a) => a.people_led || a.organization_scope) ? "medium" : "low";

  return {
    dimension: "leadership",
    score,
    confidence,
    reasonCodes: breakdown.map((b) => ({
      code: b.diminished ? "leadership_role_secondary" : "leadership_role",
      detail: b.label,
    })),
  };
}
