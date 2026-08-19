import type { CandidateAction, CounselorState, EligibilityResult, EligibilityVerdict } from "./types";

/** Exported for lib/opportunities/readiness.ts's data-quality audit to reuse — one
 * definition of "not currently actionable," not a second copy of the same rule. */
export const INACTIVE_CYCLE_STATUSES = new Set(["closed", "historical", "discontinued"]);

/**
 * Finer-grained, opportunity-specific classification layered on top of
 * lib/opportunities/matching.ts's already-applied hard filter. By the time a candidate
 * reaches here, matching.ts has already excluded any opportunity with a known age/country/
 * already-acted-on mismatch (state.eligibleOpportunityMatches only contains
 * opportunity_matches.eligible = true rows) — this function exists to split that remaining
 * "not known-ineligible" set into known_eligible vs. unknown, since matching.ts's binary
 * model treats both the same way (spec: unknown eligibility must never be *called* eligible,
 * docs/counselor-core-plan.md §7/Assumption A2).
 */
function evaluateOpportunityEligibility(candidate: CandidateAction & { source: { kind: "opportunity" } }, state: CounselorState): EligibilityResult {
  const entry = state.eligibleOpportunityMatches.find((e) => e.opportunity.id === candidate.source.opportunityId);
  if (!entry) {
    return { verdict: "unknown", notes: ["This opportunity's current data couldn't be found."] };
  }
  const { opportunity } = entry;

  // Defense-in-depth for spec §37's "unverified opportunities never appear as verified"
  // invariant: lib/counselor/state.ts's DB query already restricts eligibleOpportunityMatches
  // to verification_state = 'verified_current' before this point, but that's untested
  // DB-boundary code (this repo's convention) — this check makes the invariant hold on its
  // own, independent of the caller having filtered correctly upstream.
  if (opportunity.verification_state !== "verified_current") {
    return { verdict: "known_ineligible", notes: ["This opportunity is not currently verified."] };
  }

  // A hard, structured "not actionable right now" check — independent of matching.ts,
  // which never looks at cycle_status at all.
  if (INACTIVE_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    return { verdict: "known_ineligible", notes: [`This opportunity's current cycle is ${opportunity.cycle_status.replace(/_/g, " ")}.`] };
  }

  const notes: string[] = [];
  const birthYear = state.advisor.student.birthYear;

  const hasAgeRestriction = opportunity.minimum_age !== null || opportunity.maximum_age !== null;
  if (hasAgeRestriction && birthYear === null) {
    notes.push("This opportunity has an age requirement Oryn can't check without your birth year on file.");
  }

  const hasCountryRestriction = opportunity.eligible_countries.length > 0;
  if (hasCountryRestriction && !state.advisor.student.country) {
    notes.push("This opportunity is restricted by country and your country isn't on file yet.");
  }

  if (opportunity.citizenship_restrictions) {
    notes.push(`Citizenship restriction on file (not automatically verified): ${opportunity.citizenship_restrictions}`);
  }
  if (opportunity.residency_restrictions) {
    notes.push(`Residency restriction on file (not automatically verified): ${opportunity.residency_restrictions}`);
  }
  if (opportunity.eligible_grades.length > 0) {
    notes.push("This opportunity restricts eligibility by grade level — Oryn doesn't compute your current grade automatically, verify directly.");
  }

  if (notes.length > 0) {
    return { verdict: "unknown", notes };
  }
  return { verdict: "known_eligible", notes: [] };
}

/**
 * Counselor Core Phase F. Non-opportunity candidates (requirement_action, profile_task) are
 * always known_eligible — both are generated only from the student's own already-active
 * targets/profile, so no external eligibility gate applies to them at all.
 */
export function evaluateCandidateEligibility(candidate: CandidateAction, state: CounselorState): EligibilityResult {
  if (candidate.source.kind === "opportunity") {
    return evaluateOpportunityEligibility(candidate as CandidateAction & { source: { kind: "opportunity" } }, state);
  }
  return { verdict: "known_eligible" as EligibilityVerdict, notes: [] };
}
