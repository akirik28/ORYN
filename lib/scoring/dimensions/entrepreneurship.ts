import type { DimensionResult, ScoringFacts } from "../types";
import { clampScore, monthsBetween, scoreCommitments } from "../math";

function isEntrepreneurial(project: ScoringFacts["projects"][number]): boolean {
  return /founder/i.test(project.role ?? "") || project.revenue_amount != null;
}

/** Entrepreneurship score: founder-shaped or revenue-generating projects specifically (a subset of all projects — see execution.ts for general project depth). */
export function scoreEntrepreneurship(facts: ScoringFacts): DimensionResult {
  const referenceDate = facts.referenceDate ?? new Date();
  const ventures = facts.projects.filter(isEntrepreneurial);

  if (ventures.length === 0) {
    return { dimension: "entrepreneurship", score: 0, confidence: "low", reasonCodes: [] };
  }

  const items = ventures.map((project) => {
    const foundedBonus = 20;
    const months = project.start_date ? monthsBetween(project.start_date, project.end_date, referenceDate) : 0;
    const durationBonus = Math.min(months * 1.1, 18);
    const revenueBonus = project.revenue_amount ? Math.min(Math.log10(project.revenue_amount + 1) * 7, 26) : 0;
    const usersBonus = project.users_reached ? Math.min(Math.log10(project.users_reached + 1) * 5, 18) : 0;

    return { label: project.title, basePoints: foundedBonus + durationBonus + revenueBonus + usersBonus };
  });

  const { points, breakdown } = scoreCommitments(items, {
    perItemCap: 70,
    diminishingAfter: 2,
    diminishingFactor: 0.4,
  });

  return {
    dimension: "entrepreneurship",
    score: clampScore(points),
    confidence: ventures.some((v) => v.revenue_amount || v.users_reached) ? "medium" : "low",
    reasonCodes: breakdown.map((b) => ({ code: b.diminished ? "venture_secondary" : "venture", detail: b.label })),
  };
}
