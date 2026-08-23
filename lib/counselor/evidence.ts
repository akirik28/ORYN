import { DIMENSION_LABELS } from "@/lib/scoring/labels";
import type { CounselorRecommendation, CounselorState, NextActionType, ProfileGap, RankedCandidate } from "./types";

const SEVERITY_LABEL: Record<ProfileGap["severity"], string> = {
  critical: "a significant current gap",
  moderate: "a moderate current gap",
  minor: "a minor current gap",
  insufficient_data: "an area Oryn doesn't have enough data on yet",
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function sourceId(candidate: RankedCandidate["candidate"]): string {
  switch (candidate.source.kind) {
    case "opportunity":
      return candidate.source.opportunityId;
    case "requirement_action":
      return candidate.source.requirementId;
    case "profile_task":
      return slugify(candidate.source.checklistKey);
  }
}

function recommendationId(candidate: RankedCandidate["candidate"]): string {
  return `${candidate.source.kind}:${sourceId(candidate)}`;
}

function nextActionFor(candidate: RankedCandidate["candidate"]): { label: string; type: NextActionType; href: string } {
  switch (candidate.source.kind) {
    case "opportunity":
      return { label: "View opportunity", type: "VIEW", href: `/opportunities/${candidate.source.opportunityId}` };
    case "requirement_action":
      return { label: "Review university requirement", type: "VIEW", href: `/universities/${candidate.source.universityId}` };
    case "profile_task":
      return { label: "Update profile", type: "COMPLETE_PROFILE", href: "/profile" };
  }
}

function whyForOpportunity(ranked: RankedCandidate): string[] {
  const lines = ranked.matchedGaps.map(
    (g) => `Addresses ${DIMENSION_LABELS[g.dimension]}, ${SEVERITY_LABEL[g.severity]} (${g.score}/100).`
  );
  if (ranked.candidate.verificationState === "verified_current") {
    lines.push("Verified as currently active.");
  }
  return lines;
}

function whyForRequirement(ranked: RankedCandidate, state: CounselorState): string[] {
  if (ranked.candidate.source.kind !== "requirement_action") return [];
  const requirementId = ranked.candidate.source.requirementId;
  const match = state.requirementCandidateInputs.find((i) => i.requirement.id === requirementId);
  return match ? [match.evaluation.reasoning] : [];
}

function whyForProfileTask(): string[] {
  return ["Oryn doesn't have this information yet — needed for confident recommendations."];
}

/**
 * Counselor Core Phase H (docs/counselor-core-plan.md §9). Pure — assembles the
 * student-facing contract from an already-ranked candidate. `why` is built from fixed
 * templates parameterized by real fields (gap dimension/severity, or the requirement
 * evaluator's own sourced reasoning string) — never free LLM text, so a recommendation is
 * fully explainable even when the optional LLM narration layer (Phase J) is unavailable.
 */
export function buildRecommendation(ranked: RankedCandidate, state: CounselorState): CounselorRecommendation {
  const { candidate } = ranked;

  const why =
    candidate.source.kind === "opportunity"
      ? whyForOpportunity(ranked)
      : candidate.source.kind === "requirement_action"
        ? whyForRequirement(ranked, state)
        : whyForProfileTask();

  return {
    id: recommendationId(candidate),
    title: candidate.title,
    recommendationClass: ranked.recommendationClass,
    why,
    matchedGapDimensions: ranked.matchedGaps.map((g) => g.dimension),
    impact: ranked.impact,
    effort: ranked.effort,
    urgency: ranked.urgency,
    deadline: candidate.deadline,
    costOnFile: candidate.costOnFile,
    applicationRequirements: candidate.applicationRequirements,
    eligibility: ranked.eligibility,
    confidence: ranked.confidence,
    evidence: [{ sourceType: candidate.source.kind, sourceId: sourceId(candidate), sourceUrl: candidate.sourceUrl, verificationState: candidate.verificationState }],
    warnings: ranked.eligibility.verdict === "unknown" ? ranked.eligibility.notes : [],
    nextAction: nextActionFor(candidate),
  };
}
