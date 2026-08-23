import "server-only";

import { getCounselorRecommendations } from "@/lib/counselor";
import type { CounselorRecommendation } from "@/lib/counselor";
import { formatEligibilityCaveat } from "./eligibility-text";
import { formatFeeCaveat } from "./fee-text";

/** Bounds how many opportunities enter the prompt — grounding, not the full catalogue
 * (spec Phase 27, context trimming). Counselor Core has already ranked these by gap
 * relevance/urgency/data quality, so the top slice is the most useful one, not an
 * arbitrary one. */
const MAX_OPPORTUNITIES_IN_CONTEXT = 8;

function isOpportunityRecommendation(recommendation: CounselorRecommendation): boolean {
  return recommendation.evidence.some((e) => e.sourceType === "opportunity");
}

/** Eligibility must never go unstated -- the rendering rules, and why `known_eligible` is
 * deliberately silent while `unknown` never is, now live in lib/ai/eligibility-text.ts, which
 * lib/ai/weekly-plan.ts shares. The notes it renders are the same ones a student sees on the
 * opportunity's own card, so the advisor can't say something a human-facing surface
 * wouldn't also say. */
function formatOne(recommendation: CounselorRecommendation): string {
  const parts = [recommendation.title];
  if (recommendation.deadline) {
    parts.push(`deadline ${recommendation.deadline.date}`);
  }
  if (recommendation.why[0]) {
    parts.push(recommendation.why[0]);
  }
  const eligibilityCaveat = formatEligibilityCaveat(recommendation.eligibility);
  if (eligibilityCaveat) {
    parts.push(eligibilityCaveat);
  }
  const feeCaveat = formatFeeCaveat(recommendation.costOnFile);
  if (feeCaveat) {
    parts.push(feeCaveat);
  }
  return `- ${parts.join(" — ")}`;
}

/**
 * Pure formatting half, exported separately so it's testable without touching the network
 * (same split as student-context.ts's buildStudentAdvisorContext/formatContextForPrompt).
 * Filters to opportunity-sourced recommendations, caps the count, and renders each with its
 * eligibility state made explicit.
 */
export function formatOpportunityContext(recommendations: CounselorRecommendation[]): string {
  const opportunities = recommendations.filter(isOpportunityRecommendation).slice(0, MAX_OPPORTUNITIES_IN_CONTEXT);
  if (opportunities.length === 0) return "";

  const lines = opportunities.map(formatOne);
  return `\n\nReal opportunities Oryn has already verified and matched to this student (prefer these when relevant — never invent a program, competition, scholarship, or deadline not on this list; if nothing here fits what the student is asking about, say so honestly rather than guessing):\n${lines.join("\n")}`;
}

/**
 * Real, verified opportunities as advisor grounding — additive only, same resilience
 * contract as lib/ai/weekly-plan.ts's buildCounselorGroundingText: a failure here must
 * never block a reply, so it's swallowed and logged, not thrown.
 *
 * Reuses Counselor Core's existing pipeline (lib/counselor) rather than a fresh query
 * against `opportunities`/`opportunity_matches` -- that pipeline already composes the
 * canonical lifecycle/verification/eligibility gates (lib/opportunities/lifecycle.ts,
 * lib/counselor/eligibility.ts) exactly once; writing a second read path here would be the
 * same kind of guard duplication that #140/#141 had to fix. `known_ineligible` candidates
 * never reach `recommendations` at all (lib/counselor/scoring.ts filters them before this
 * function ever sees them) -- formatOpportunityContext's explicit branch exists only as
 * defense in depth in case that upstream contract ever changes, not because this path
 * expects to hit it.
 */
export async function buildOpportunityContextText(userId: string): Promise<string> {
  try {
    const { recommendations } = await getCounselorRecommendations(userId);
    return formatOpportunityContext(recommendations);
  } catch (error) {
    console.error("[advisor] failed to fetch opportunity context, continuing without it", error);
    return "";
  }
}
