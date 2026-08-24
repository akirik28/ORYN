import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, monthsBetween, scoreCommitments } from "../math";

/**
 * Execution / Project Depth score (spec 6.4): "reward execution more than idea
 * creation." A bare project entry with no shipped artifact, adoption, or described
 * outcome earns only a small flat amount for existing — the real points come from
 * evidence the thing was actually built and used.
 */
export function scoreExecution(facts: ScoringFacts): DimensionResult {
  const referenceDate = facts.referenceDate ?? new Date();

  if (facts.projects.length === 0) {
    return { dimension: "execution_project_depth", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = facts.projects.map((project) => {
    const ideaBasePoints = 4;
    const months = project.start_date ? monthsBetween(project.start_date, project.end_date, referenceDate) : 0;
    const durationBonus = Math.min(months * 1.3, 20);
    const outcomeBonus = project.outcome_summary && project.outcome_summary.trim().length > 15 ? 12 : 0;
    const usersBonus = project.users_reached ? Math.min(Math.log10(project.users_reached + 1) * 6, 20) : 0;
    const revenueBonus = project.revenue_amount ? Math.min(Math.log10(project.revenue_amount + 1) * 4, 14) : 0;
    const shippedBonus = project.repo_url || project.live_url ? 14 : 0;

    return {
      label: project.title,
      basePoints: ideaBasePoints + durationBonus + outcomeBonus + usersBonus + revenueBonus + shippedBonus,
    };
  });

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 70,
    diminishingAfter: 2,
    diminishingFactor: 0.4,
  });

  const score = clampScore(points);
  const hasEvidence = facts.projects.some((p) => p.outcome_summary || p.repo_url || p.live_url || p.users_reached);
  const confidence = hasEvidence ? "medium" : "low";

  return {
    dimension: "execution_project_depth",
    score,
    confidence,
    reasonCodes: breakdown.map((b) => ({
      code: b.diminished ? "project_secondary" : "project",
      detail: b.label,
    })),
  };
}
