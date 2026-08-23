import { NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES } from "./lifecycle";
import type { Opportunity } from "@/types/database";

export type ReadinessTier = "recommendation_ready" | "needs_verification" | "not_ready";

export interface RecommendationReadinessReport {
  opportunityId: string;
  title: string;
  tier: ReadinessTier;
  /** Hard reasons the record cannot be recommended at all — drawn from the same
   * lib/opportunities/lifecycle.ts rule the runtime engine enforces
   * (lib/counselor/eligibility.ts). Note this audit applies only the date-independent half:
   * it deliberately takes no reference date, so a row whose deadline has already passed is
   * still reported recommendation_ready here while the counselor excludes it at read time. */
  blockers: string[];
  /** Informational only — never blocks a recommendation. Unknown eligibility stays unknown
   * (spec: never infer citizenship/age/grade eligibility, never fabricate a deadline) — these
   * are prioritization signals for whoever is researching/verifying new records, not gates. */
  qualitySignals: string[];
}

/**
 * Counselor Core data-quality workstream, Phase 9 (docs/counselor-core-plan.md's follow-on).
 * Deterministic, reuses existing columns only (no parallel schema) and the canonical
 * NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES set from lib/opportunities/lifecycle.ts rather
 * than a second, drifting copy of it — the research-time equivalent of the cycle-status half
 * of the check the counselor enforces at runtime. Stays deliberately date-independent so a
 * report is reproducible for a given row; see `blockers` above for what that trades away.
 *
 * Tells a researcher WHY a record isn't yet high-confidence recommendable, without ever
 * treating a missing fact as a reason to invent one (spec §29/§34): a genuinely unpublished
 * deadline or unstated eligibility rule is a quality signal to note, never a blocker to route
 * around by guessing.
 */
export function evaluateRecommendationReadiness(opportunity: Opportunity): RecommendationReadinessReport {
  const blockers: string[] = [];
  const qualitySignals: string[] = [];

  // --- Identity / provenance ---
  if (!opportunity.title) blockers.push("Missing canonical program name.");
  if (!opportunity.organization) blockers.push("Missing organizer.");
  if (!opportunity.official_url && !opportunity.source_url) {
    blockers.push("No official_url or source_url — no traceable provenance at all.");
  }
  if (opportunity.verification_state !== "verified_current") {
    blockers.push(`verification_state is '${opportunity.verification_state}', not 'verified_current'.`);
  }
  if (!opportunity.verified_at && !opportunity.last_verified_at) {
    qualitySignals.push("No verification timestamp on file — can't tell how recently this was checked.");
  }

  // --- Current status ---
  if (NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    blockers.push(`cycle_status is '${opportunity.cycle_status}' — not currently actionable.`);
  }

  // --- Academic relevance ---
  if (opportunity.fields.length === 0) {
    qualitySignals.push("No field/category tags — field-relevance matching can't work for this record.");
  }
  if (!opportunity.description || opportunity.description.trim().length === 0) {
    qualitySignals.push("No description — students see a bare title with no context.");
  }

  // --- Eligibility (unknown stays unknown — never a blocker) ---
  const hasAgeInfo = opportunity.minimum_age !== null || opportunity.maximum_age !== null;
  const hasCountryInfo = opportunity.eligible_countries.length > 0;
  const hasGradeInfo = opportunity.eligible_grades.length > 0;
  const hasCitizenshipInfo = Boolean(
    opportunity.citizenship_restrictions || opportunity.residency_restrictions || opportunity.eligible_citizenships?.length
  );
  if (!hasAgeInfo && !hasCountryInfo && !hasGradeInfo && !hasCitizenshipInfo) {
    qualitySignals.push("No eligibility information at all (age/country/grade/citizenship) — every student will see this as 'unknown, verify'.");
  }

  // --- Timing ---
  if (!opportunity.deadline) {
    qualitySignals.push("No deadline on file — record as genuinely unpublished if confirmed, don't infer one.");
  }

  // --- Cost ---
  if (opportunity.cost === null) {
    qualitySignals.push("No cost information on file.");
  }

  const tier: ReadinessTier = blockers.length > 0 ? "not_ready" : "recommendation_ready";

  return { opportunityId: opportunity.id, title: opportunity.title, tier, blockers, qualitySignals };
}
