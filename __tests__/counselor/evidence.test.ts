import { describe, expect, test } from "vitest";
import { buildRecommendation } from "@/lib/counselor/evidence";
import type { CounselorState, ProfileGap, RankedCandidate, RequirementCandidateInput } from "@/lib/counselor/types";
import type { UniversityRequirement } from "@/types/database";

function gap(overrides: Partial<ProfileGap> = {}): ProfileGap {
  return { dimension: "research", score: 20, confidence: "high", severity: "critical", rank: 1, spreadFromStrongest: 70, reasonCodes: [], ...overrides };
}

function rankedOpportunity(overrides: Partial<RankedCandidate> = {}): RankedCandidate {
  return {
    candidate: {
      source: { kind: "opportunity", opportunityId: "opp-1" },
      title: "Youth Economics Research Program",
      category: "research",
      addressesDimensions: ["research"],
      verificationState: "verified_current",
      sourceUrl: "https://example.org/apply",
      deadline: { date: "2026-12-01", sourceLabel: "Youth Economics Research Program" },
    },
    eligibility: { verdict: "known_eligible", notes: [] },
    matchedGaps: [gap()],
    score: 80,
    scoreBreakdown: { gapRelevance: 100, fieldAlignment: 60, urgency: 60, dataQuality: 100 },
    impact: "high",
    effort: "high",
    urgency: "medium",
    confidence: "high",
    recommendationClass: "do",
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
    // Migration 0056's qualifier columns — see the same note in candidates.test.ts.
    test_scale: null,
    scale_ambiguity: null,
    recency_rule: null,
    excluded_provenances: null,
    evaluation_gate: null,
    conflict_group_id: null,
    research_record_id: null,
    unmet_consequence: null,
    source_url: "https://university.example/requirements",
    retrieved_at: null,
    last_checked_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function state(requirementInputs: RequirementCandidateInput[] = []): CounselorState {
  return {
    userId: "user-1",
    advisor: {} as CounselorState["advisor"],
    dimensionScores: [],
    completenessChecklist: [],
    eligibleOpportunityMatches: [],
    requirementCandidateInputs: requirementInputs,
  };
}

describe("buildRecommendation — opportunity", () => {
  test("derives a stable id from the source", () => {
    const rec = buildRecommendation(rankedOpportunity(), state());
    expect(rec.id).toBe("opportunity:opp-1");
  });

  test("explains why via the matched gap's dimension and severity, not generic prose", () => {
    const rec = buildRecommendation(rankedOpportunity(), state());
    expect(rec.why.join(" ")).toMatch(/research/i);
  });

  test("carries the deadline and verification state through", () => {
    const rec = buildRecommendation(rankedOpportunity(), state());
    expect(rec.deadline).toEqual({ date: "2026-12-01", sourceLabel: "Youth Economics Research Program" });
    expect(rec.evidence[0].verificationState).toBe("verified_current");
  });

  test("turns eligibility 'unknown' notes into warnings, not silent optimism", () => {
    const rec = buildRecommendation(
      rankedOpportunity({ eligibility: { verdict: "unknown", notes: ["Citizenship restriction on file (not automatically verified): US citizens only"] } }),
      state()
    );
    expect(rec.warnings.join(" ")).toContain("Citizenship restriction");
  });

  test("no warnings when eligibility is known_eligible", () => {
    const rec = buildRecommendation(rankedOpportunity(), state());
    expect(rec.warnings).toEqual([]);
  });

  test("next action points at the opportunity detail page", () => {
    const rec = buildRecommendation(rankedOpportunity(), state());
    expect(rec.nextAction.href).toBe("/opportunities/opp-1");
    expect(rec.nextAction.type).toBe("VIEW");
  });

  test("evidence never includes the raw description text, only structured provenance", () => {
    const rec = buildRecommendation(rankedOpportunity(), state());
    const serialized = JSON.stringify(rec.evidence);
    expect(serialized).not.toContain("description");
  });
});

describe("buildRecommendation — requirement_action", () => {
  const input: RequirementCandidateInput = {
    universityId: "uni-1",
    universityName: "Test University",
    requirement: requirement(),
    evaluation: { status: "not_met", reasoning: "No SAT score is on file yet." },
  };

  const ranked: RankedCandidate = {
    candidate: {
      source: { kind: "requirement_action", universityId: "uni-1", requirementId: "req-1", status: "not_met" },
      title: "Address: SAT score (Test University)",
      category: "requirement_action",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: "https://university.example/requirements",
      deadline: null,
    },
    eligibility: { verdict: "known_eligible", notes: [] },
    matchedGaps: [],
    score: 80,
    scoreBreakdown: { gapRelevance: 0, fieldAlignment: 0, urgency: 0, dataQuality: 60 },
    impact: "high",
    effort: "medium",
    urgency: "medium",
    confidence: "medium",
    recommendationClass: "do",
  };

  test("why reuses the real, sourced evaluation reasoning verbatim, not a re-derived guess", () => {
    const rec = buildRecommendation(ranked, state([input]));
    expect(rec.why).toContain("No SAT score is on file yet.");
  });

  test("next action points at the university page", () => {
    const rec = buildRecommendation(ranked, state([input]));
    expect(rec.nextAction.href).toBe("/universities/uni-1");
  });
});

describe("buildRecommendation — profile_task", () => {
  const ranked: RankedCandidate = {
    candidate: {
      source: { kind: "profile_task", checklistKey: "Add a career goal" },
      title: "Add a career goal",
      category: "profile_completion",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
    },
    eligibility: { verdict: "known_eligible", notes: [] },
    matchedGaps: [],
    score: 70,
    scoreBreakdown: { gapRelevance: 0, fieldAlignment: 0, urgency: 0, dataQuality: 100 },
    impact: "medium",
    effort: "low",
    urgency: "low",
    confidence: "high",
    recommendationClass: "do",
  };

  test("next action points at the profile page with COMPLETE_PROFILE type", () => {
    const rec = buildRecommendation(ranked, state());
    expect(rec.nextAction.href).toBe("/profile");
    expect(rec.nextAction.type).toBe("COMPLETE_PROFILE");
  });

  test("id is derived from the checklist key, stable and URL-safe", () => {
    const rec = buildRecommendation(ranked, state());
    expect(rec.id).toBe("profile_task:add-a-career-goal");
  });
});
