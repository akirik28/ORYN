import { CATEGORY_DIMENSIONS } from "@/lib/opportunities/matching";
import { competesInCoreRecommendations } from "@/lib/opportunities/commercial";
import { requirementActionTitle, requirementCategoryLabel } from "./copy";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CandidateAction, CounselorState, RequirementCandidateInput } from "./types";

const ACTIONABLE_REQUIREMENT_STATUSES = new Set(["not_met", "unknown"]);

function opportunityCandidates(state: CounselorState): CandidateAction[] {
  return state.eligibleOpportunityMatches
    // Pay-to-enroll programmes stay in Browse but do not compete for a core recommendation
    // slot (lib/opportunities/commercial.ts). Filtered here rather than down-ranked in
    // scoring.ts because the ruling is categorical: a programme gated on ability to pay
    // should not appear among "what to do next" at all, however well it scores on gap fit.
    .filter(({ opportunity }) => competesInCoreRecommendations(opportunity))
    .map(({ opportunity }) => ({
    source: { kind: "opportunity", opportunityId: opportunity.id },
    title: opportunity.title,
    category: opportunity.category,
    addressesDimensions: CATEGORY_DIMENSIONS[opportunity.category] ?? [],
    verificationState: opportunity.verification_state,
    sourceUrl: opportunity.official_url ?? opportunity.source_url,
    deadline: opportunity.deadline ? { date: opportunity.deadline, sourceLabel: opportunity.title } : null,
    costOnFile: opportunity.cost,
    applicationRequirements: opportunity.application_requirements,
  }));
}

// `input.requirement.title`, when present, is sourced text (the university's own wording
// for the requirement) — never translated, same rule as opportunity/citizenship free text
// elsewhere in the counselor layer. Only the fallback category label
// (REQUIREMENT_CATEGORY_LABELS's English, or requirementCategoryLabel's Turkish) is Oryn's
// own copy and eligible for translation.
function requirementLabel(input: RequirementCandidateInput, locale: Locale): string {
  return input.requirement.title ?? requirementCategoryLabel(input.requirement.requirement_type, locale);
}

function requirementCandidates(state: CounselorState, locale: Locale): CandidateAction[] {
  return state.requirementCandidateInputs
    .filter((input) => ACTIONABLE_REQUIREMENT_STATUSES.has(input.evaluation.status))
    .map((input) => {
      const label = requirementLabel(input, locale);
      const title = requirementActionTitle(label, input.universityName, input.evaluation.status, locale);
      return {
        source: { kind: "requirement_action", universityId: input.universityId, requirementId: input.requirement.id, status: input.evaluation.status },
        title,
        category: "requirement_action",
        addressesDimensions: [],
        verificationState: null,
        sourceUrl: input.requirement.source_url,
        deadline: null,
        costOnFile: null,
        applicationRequirements: [],
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
      costOnFile: null,
      applicationRequirements: [],
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
 *
 * `locale` defaults to English (see evidence.ts's buildRecommendation for why) and only
 * affects requirement_action titles — opportunity titles are the opportunity's own stored
 * (English) title, and profile_task titles are checklist labels defined in
 * lib/scoring/completeness.ts, neither in scope for this pass.
 */
export function generateCandidateActions(state: CounselorState, locale: Locale = DEFAULT_LOCALE): CandidateAction[] {
  return [...opportunityCandidates(state), ...requirementCandidates(state, locale), ...profileTaskCandidates(state)];
}
