import { describe, expect, test } from "vitest";
import { evaluateCandidateEligibility } from "@/lib/counselor/eligibility";
import type { CandidateAction, CounselorState } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch } from "@/types/database";

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    title: "Test Opportunity",
    organization: null,
    description: null,
    category: "research",
    official_url: null,
    application_url: null,
    country: null,
    remote_allowed: null,
    minimum_age: null,
    maximum_age: null,
    eligible_countries: [],
    fields: [],
    cost: null,
    funding_available: null,
    deadline: null,
    start_date: null,
    end_date: null,
    source: null,
    source_url: null,
    source_confidence: "medium",
    last_verified_at: null,
    status: "active",
    normalized_title: "test opportunity",
    cycle_status: "open",
    selectivity_tier: "unknown",
    verification_state: "verified_current",
    application_open_date: null,
    eligible_grades: [],
    citizenship_restrictions: null,
    residency_restrictions: null,
    location_mode: null,
    financial_aid_available: null,
    application_requirements: [],
    current_cycle_label: null,
    verified_at: null,
    organization_entity_id: null,
    country_entity_id: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function match(overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: "match-1",
    user_id: "user-1",
    opportunity_id: "opp-1",
    eligible: true,
    eligibility_notes: null,
    relevance_score: 60,
    profile_need_score: 60,
    effort_estimate: null,
    match_score: 60,
    reason_codes: [],
    calculated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function opportunityCandidate(id = "opp-1"): CandidateAction {
  return {
    source: { kind: "opportunity", opportunityId: id },
    title: "Test Opportunity",
    category: "research",
    addressesDimensions: [],
    verificationState: "verified_current",
    sourceUrl: null,
    deadline: null,
  };
}

function state(opp: Opportunity, birthYear: number | null = 2009, overrides: Partial<CounselorState> = {}): CounselorState {
  return {
    userId: "user-1",
    advisor: { student: { birthYear } } as CounselorState["advisor"],
    dimensionScores: [],
    completenessChecklist: [],
    eligibleOpportunityMatches: [{ match: match({ opportunity_id: opp.id }), opportunity: opp }],
    requirementCandidateInputs: [],
    ...overrides,
  };
}

describe("evaluateCandidateEligibility — opportunities", () => {
  test("known_eligible when there are no restrictions of any kind", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity()));
    expect(result.verdict).toBe("known_eligible");
    expect(result.notes).toEqual([]);
  });

  test("known_ineligible when the current cycle is closed", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  test("known_ineligible when the opportunity is discontinued", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "discontinued" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  test("known_eligible (not unknown) when an age restriction exists and the student's age is known", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ minimum_age: 14 }), 2009));
    expect(result.verdict).toBe("known_eligible");
  });

  test("unknown when an age restriction exists but the student's birth year isn't on file", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ minimum_age: 14 }), null));
    expect(result.verdict).toBe("unknown");
  });

  test("unknown when the opportunity lists eligible countries but the student's country isn't on file", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_countries: ["United States"] }), 2009, { advisor: { student: { birthYear: 2009, country: null } } as CounselorState["advisor"] })
    );
    expect(result.verdict).toBe("unknown");
  });

  test("known_eligible when the opportunity lists eligible countries and the student's country is on file", () => {
    const result = evaluateCandidateEligibility(
      opportunityCandidate(),
      state(opportunity({ eligible_countries: ["United States"] }), 2009, { advisor: { student: { birthYear: 2009, country: "United States" } } as CounselorState["advisor"] })
    );
    expect(result.verdict).toBe("known_eligible");
  });

  test("unknown, with a note, when citizenship restrictions are on file (free text Oryn can't parse)", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ citizenship_restrictions: "US citizens only" })));
    expect(result.verdict).toBe("unknown");
    expect(result.notes.join(" ")).toContain("US citizens only");
  });

  test("unknown when eligible_grades is populated (grade-level not computed by Oryn)", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ eligible_grades: ["11", "12"] })));
    expect(result.verdict).toBe("unknown");
  });

  test("known_ineligible (cycle) wins even if an unknown dimension is also present", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ cycle_status: "closed", citizenship_restrictions: "US only" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  // Defense-in-depth (spec §37 invariant: "unverified opportunities never appear as
  // verified"): state.ts's DB query already filters to verification_state='verified_current'
  // before this point, but that filter is untested DB-boundary code (this repo's own
  // convention — see docs/counselor-core-plan.md §14). This check makes the invariant hold
  // even if a caller ever constructs a CounselorState without going through state.ts.
  test("known_ineligible when the opportunity is not verified_current, even if otherwise eligible", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ verification_state: "unverified" })));
    expect(result.verdict).toBe("known_ineligible");
  });

  test("known_eligible when verification_state is verified_current (the normal case)", () => {
    const result = evaluateCandidateEligibility(opportunityCandidate(), state(opportunity({ verification_state: "verified_current" })));
    expect(result.verdict).toBe("known_eligible");
  });
});

describe("evaluateCandidateEligibility — non-opportunity candidates", () => {
  test("a requirement_action candidate is always known_eligible (it's the student's own declared target)", () => {
    const candidate: CandidateAction = {
      source: { kind: "requirement_action", universityId: "uni-1", requirementId: "req-1", status: "not_met" },
      title: "Address: SAT score",
      category: "requirement_action",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
    };
    const result = evaluateCandidateEligibility(candidate, state(opportunity(), 2009, { eligibleOpportunityMatches: [] }));
    expect(result.verdict).toBe("known_eligible");
  });

  test("a profile_task candidate is always known_eligible (it's the student's own profile)", () => {
    const candidate: CandidateAction = {
      source: { kind: "profile_task", checklistKey: "Add a career goal" },
      title: "Add a career goal",
      category: "profile_completion",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
    };
    const result = evaluateCandidateEligibility(candidate, state(opportunity(), 2009, { eligibleOpportunityMatches: [] }));
    expect(result.verdict).toBe("known_eligible");
  });
});
