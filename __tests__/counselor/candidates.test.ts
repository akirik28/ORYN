import { describe, expect, test } from "vitest";
import { generateCandidateActions } from "@/lib/counselor/candidates";
import type { CounselorState, RequirementCandidateInput } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch, UniversityRequirement } from "@/types/database";
import type { CompletenessChecklistItem } from "@/lib/scoring/completeness";

function opportunity(overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id: "opp-1",
    title: "Test Opportunity",
    organization: "Test Org",
    description: null,
    category: "research",
    official_url: "https://example.org/apply",
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
    eligible_citizenships: [],
    location_mode: null,
    financial_aid_available: null,
    application_requirements: [],
    current_cycle_label: null,
    verified_at: null,
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
    country_eligibility_confirmed_open: false,
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

function requirement(overrides: Partial<UniversityRequirement> = {}): UniversityRequirement {
  return {
    id: "req-1",
    university_id: "uni-1",
    program_id: null,
    requirement_type: "standardized_test",
    title: "SAT score",
    requirement_detail: null,
    is_required: true,
    structured_rule: null,
    data_confidence: "medium",
    data_status: "fresh",
    scope: null,
    verification_state: "unverified",
    verified_at: null,
    requirement_group_id: null,
    group_role: null,
    is_exclusion: false,
    clause_ref: null,
    // Migration 0056's qualifier columns. Spelled out rather than left off: an absent
    // qualifier can only ever fail to block a comparison, never unlock one, so a fixture that
    // omits them silently tests the most permissive row there is.
    test_scale: null,
    scale_ambiguity: null,
    recency_rule: null,
    excluded_provenances: null,
    evaluation_gate: null,
    conflict_group_id: null,
    research_record_id: null,
    unmet_consequence: null,
    source_url: null,
    retrieved_at: null,
    last_checked_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function checklistItem(overrides: Partial<CompletenessChecklistItem> = {}): CompletenessChecklistItem {
  return { label: "Add a target university", done: false, ...overrides };
}

function state(overrides: Partial<CounselorState> = {}): CounselorState {
  return {
    userId: "user-1",
    // Only the fields generateCandidateActions actually reads are populated by these tests.
    advisor: {} as CounselorState["advisor"],
    dimensionScores: [],
    completenessChecklist: [],
    eligibleOpportunityMatches: [],
    requirementCandidateInputs: [],
    ...overrides,
  };
}

describe("generateCandidateActions — opportunities", () => {
  test("turns an eligible opportunity match into a candidate with its category's dimensions", () => {
    const candidates = generateCandidateActions(
      state({ eligibleOpportunityMatches: [{ match: match(), opportunity: opportunity({ category: "research" }) }] })
    );
    const opp = candidates.find((c) => c.source.kind === "opportunity");
    expect(opp).toBeDefined();
    expect(opp!.title).toBe("Test Opportunity");
    expect(opp!.addressesDimensions).toContain("research");
    expect(opp!.verificationState).toBe("verified_current");
  });

  test("carries the deadline through when the opportunity has one", () => {
    const candidates = generateCandidateActions(
      state({ eligibleOpportunityMatches: [{ match: match(), opportunity: opportunity({ deadline: "2026-12-01" }) }] })
    );
    expect(candidates[0].deadline).toEqual({ date: "2026-12-01", sourceLabel: "Test Opportunity" });
  });

  test("has no deadline when the opportunity's deadline is unknown", () => {
    const candidates = generateCandidateActions(state({ eligibleOpportunityMatches: [{ match: match(), opportunity: opportunity({ deadline: null }) }] }));
    expect(candidates[0].deadline).toBeNull();
  });

  test("prefers official_url, falling back to source_url, for sourceUrl", () => {
    const withOfficial = generateCandidateActions(
      state({ eligibleOpportunityMatches: [{ match: match(), opportunity: opportunity({ official_url: "https://official.example", source_url: "https://source.example" }) }] })
    );
    expect(withOfficial[0].sourceUrl).toBe("https://official.example");

    const sourceOnly = generateCandidateActions(
      state({ eligibleOpportunityMatches: [{ match: match(), opportunity: opportunity({ official_url: null, source_url: "https://source.example" }) }] })
    );
    expect(sourceOnly[0].sourceUrl).toBe("https://source.example");
  });

  test("produces one candidate per eligible match, in the same order", () => {
    const candidates = generateCandidateActions(
      state({
        eligibleOpportunityMatches: [
          { match: match({ opportunity_id: "opp-1" }), opportunity: opportunity({ id: "opp-1", title: "First" }) },
          { match: match({ opportunity_id: "opp-2" }), opportunity: opportunity({ id: "opp-2", title: "Second" }) },
        ],
      })
    );
    expect(candidates.map((c) => c.title)).toEqual(["First", "Second"]);
  });
});

describe("generateCandidateActions — requirement actions", () => {
  const baseInput: RequirementCandidateInput = {
    universityId: "uni-1",
    universityName: "Test University",
    requirement: requirement(),
    evaluation: { status: "not_met", reasoning: "No SAT score is on file." },
  };

  test("turns a not_met requirement into a candidate naming the requirement", () => {
    const candidates = generateCandidateActions(state({ requirementCandidateInputs: [baseInput] }));
    const req = candidates.find((c) => c.source.kind === "requirement_action");
    expect(req).toBeDefined();
    expect(req!.title).toContain("SAT score");
    expect(req!.category).toBe("requirement_action");
  });

  test("turns an unknown (evaluable, missing-data) requirement into a candidate too", () => {
    const candidates = generateCandidateActions(
      state({ requirementCandidateInputs: [{ ...baseInput, evaluation: { status: "unknown", reasoning: "No SAT score is on file yet." } }] })
    );
    expect(candidates.some((c) => c.source.kind === "requirement_action")).toBe(true);
  });

  test("does not generate a candidate for a requirement that's already met", () => {
    const candidates = generateCandidateActions(
      state({ requirementCandidateInputs: [{ ...baseInput, evaluation: { status: "met", reasoning: "On file." } }] })
    );
    expect(candidates.some((c) => c.source.kind === "requirement_action")).toBe(false);
  });

  test("does not generate a candidate for likely_met (close enough, not an actionable gap)", () => {
    const candidates = generateCandidateActions(
      state({ requirementCandidateInputs: [{ ...baseInput, evaluation: { status: "likely_met", reasoning: "Close." } }] })
    );
    expect(candidates.some((c) => c.source.kind === "requirement_action")).toBe(false);
  });

  test("does not generate a candidate for needs_manual_review (not Oryn-actionable data entry)", () => {
    const candidates = generateCandidateActions(
      state({ requirementCandidateInputs: [{ ...baseInput, evaluation: { status: "needs_manual_review", reasoning: "Depends on submitted material." } }] })
    );
    expect(candidates.some((c) => c.source.kind === "requirement_action")).toBe(false);
  });
});

describe("generateCandidateActions — profile tasks", () => {
  test("turns each incomplete checklist item into a candidate", () => {
    const candidates = generateCandidateActions(
      state({ completenessChecklist: [checklistItem({ label: "Add a career goal", done: false }), checklistItem({ label: "Add an activity", done: true })] })
    );
    const tasks = candidates.filter((c) => c.source.kind === "profile_task");
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Add a career goal");
    expect(tasks[0].category).toBe("profile_completion");
  });

  test("no profile-task candidates when the checklist is fully complete", () => {
    const candidates = generateCandidateActions(state({ completenessChecklist: [checklistItem({ done: true })] }));
    expect(candidates.some((c) => c.source.kind === "profile_task")).toBe(false);
  });
});

describe("generateCandidateActions — combined", () => {
  test("returns an empty array when there is nothing to recommend from (honest empty state)", () => {
    expect(generateCandidateActions(state())).toEqual([]);
  });

  test("combines all three sources in one list", () => {
    const candidates = generateCandidateActions(
      state({
        eligibleOpportunityMatches: [{ match: match(), opportunity: opportunity() }],
        requirementCandidateInputs: [
          { universityId: "uni-1", universityName: "U", requirement: requirement(), evaluation: { status: "not_met", reasoning: "x" } },
        ],
        completenessChecklist: [checklistItem({ done: false })],
      })
    );
    expect(candidates.map((c) => c.source.kind).sort()).toEqual(["opportunity", "profile_task", "requirement_action"]);
  });
});
