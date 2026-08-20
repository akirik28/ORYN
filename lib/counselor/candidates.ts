import { CATEGORY_DIMENSIONS } from "@/lib/opportunities/matching";
import { REQUIREMENT_CATEGORY_LABELS } from "@/lib/requirements/types";
import type { CandidateAction, CounselorState, RequirementCandidateInput } from "./types";

const ACTIONABLE_REQUIREMENT_STATUSES = new Set(["not_met", "unknown"]);

function opportunityCandidates(state: CounselorState): CandidateAction[] {
  return state.eligibleOpportunityMatches.map(({ opportunity }) => ({
    source: { kind: "opportunity", opportunityId: opportunity.id },
    title: opportunity.title,
    category: opportunity.category,
    addressesDimensions: CATEGORY_DIMENSIONS[opportunity.category] ?? [],
    verificationState: opportunity.verification_state,
    sourceUrl: opportunity.official_url ?? opportunity.source_url,
    deadline: opportunity.deadline ? { date: opportunity.deadline, sourceLabel: opportunity.title } : null,
  }));
}

function requirementLabel(input: RequirementCandidateInput): string {
  return input.requirement.title ?? REQUIREMENT_CATEGORY_LABELS[input.requirement.requirement_type];
}

function requirementCandidates(state: CounselorState): CandidateAction[] {
  return state.requirementCandidateInputs
    .filter((input) => ACTIONABLE_REQUIREMENT_STATUSES.has(input.evaluation.status))
    .map((input) => {
      const label = requirementLabel(input);
      const title = input.evaluation.status === "not_met" ? `Address: ${label} (${input.universityName})` : `Add the information needed to check: ${label} (${input.universityName})`;
      return {
        source: { kind: "requirement_action", universityId: input.universityId, requirementId: input.requirement.id, status: input.evaluation.status },
        title,
        category: "requirement_action",
        addressesDimensions: [],
        verificationState: null,
        sourceUrl: input.requirement.source_url,
        deadline: null,
      };
    });
}

function profileTaskCandidates(state: CounselorState): CandidateAction[] {
  return state.completenessChecklist
    .filter((item) => !item.done)
    .map((item) => ({
      source: { kind: "profile_task", checklistKey: item.label },
      title: item.label,
      category: "profile_completion",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
    }));
}

/**
 * Counselor Core Phase E — three verified/deterministic sources only, combined into one
 * list. No LLM involvement, no invented candidates (docs/counselor-core-plan.md §6):
 *   - opportunities: from state.eligibleOpportunityMatches, already restricted to
 *     opportunity_matches.eligible = true and opportunities.verification_state =
 *     'verified_current' upstream (see lib/counselor/state.ts).
 *   - requirement_action: a not_met or evaluable-unknown university_requirements row for
 *     one of the student's active target universities.
 *   - profile_task: any incomplete item from the profile-completeness checklist.
 * An empty CounselorState correctly produces an empty list — no fabricated filler.
 */
export function generateCandidateActions(state: CounselorState): CandidateAction[] {
  return [...opportunityCandidates(state), ...requirementCandidates(state), ...profileTaskCandidates(state)];
}
