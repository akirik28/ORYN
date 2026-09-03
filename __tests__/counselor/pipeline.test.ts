import { describe, expect, test } from "vitest";
import { runCounselorPipeline } from "@/lib/counselor/pipeline";
import { toDimensionScoreRows } from "@/lib/counselor/gaps";
import { COUNSELOR_SCORE_VERSION, MAX_CONSIDER_RECOMMENDATIONS } from "@/lib/counselor/config";
import type { CounselorState } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch, ProfileDimension } from "@/types/database";

const DIMENSIONS: ProfileDimension[] = [
  "academics",
  "intellectual_curiosity",
  "leadership",
  "research",
  "entrepreneurship",
  "community_impact",
  "awards_distinction",
  "career_exploration",
  "execution_project_depth",
];

function opportunity(id: string, category: Opportunity["category"] = "research", overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title: `Opportunity ${id}`,
    organization: null,
    description: null,
    category,
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
    source_confidence: "high",
    last_verified_at: null,
    status: "active",
    normalized_title: `opportunity ${id}`,
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
    languages_of_instruction: [],
    image_url: null,
    image_source_url: null,
    image_attribution: null,
    current_cycle_label: null,
    verified_at: null,
    source_verified_at: null,
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
    country_eligibility_confirmed_open: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function match(opportunityId: string, overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: `match-${opportunityId}`,
    user_id: "user-1",
    opportunity_id: opportunityId,
    eligible: true,
    eligibility_notes: [],
    relevance_score: 50,
    profile_need_score: 50,
    effort_estimate: null,
    match_confidence: null,
    match_score: 50,
    reason_codes: [],
    calculated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Nine dimension scores, one of which (dimension 0, "academics") is the deliberate gap. */
function scores() {
  return DIMENSIONS.map((dimension, i) => ({
    dimension,
    score: i === 0 ? 10 : 70 + i,
    confidence: "high" as const,
    reason_codes: [],
  }));
}

function baseState(overrides: Partial<CounselorState> = {}): CounselorState {
  return {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 80 } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores()),
    completenessChecklist: [],
    eligibleOpportunityMatches: [],
    requirementCandidateInputs: [],
    ...overrides,
  };
}

describe("runCounselorPipeline", () => {
  test("stamps the result with the current counselor score version", () => {
    const result = runCounselorPipeline(baseState());
    expect(result.scoreVersion).toBe(COUNSELOR_SCORE_VERSION);
  });

  test("returns all 9 dimension gaps, weakest first", () => {
    const result = runCounselorPipeline(baseState());
    expect(result.gaps).toHaveLength(9);
    expect(result.gaps[0].dimension).toBe("academics");
  });

  test("an empty CounselorState (no candidates at all) returns an empty, honest recommendation list — no fabricated filler", () => {
    const result = runCounselorPipeline(baseState({ eligibleOpportunityMatches: [], requirementCandidateInputs: [], completenessChecklist: [] }));
    expect(result.recommendations).toEqual([]);
  });

  test("caps 'consider' recommendations at MAX_CONSIDER_RECOMMENDATIONS", () => {
    // 20 opportunities, all in a category unrelated to the one real gap (academics) and all
    // in different-enough categories to avoid the redundancy penalty dominating the outcome
    // — the point of this test is purely the cap, not the ranking order.
    const categories: Opportunity["category"][] = ["volunteering", "conference", "hackathon", "student_program"];
    const opportunities = Array.from({ length: 20 }, (_, i) => opportunity(`opp-${i}`, categories[i % categories.length]));
    const state = baseState({
      eligibleOpportunityMatches: opportunities.map((o) => ({ opportunity: o, match: match(o.id, { relevance_score: 40, profile_need_score: 40 }) })),
    });
    const result = runCounselorPipeline(state);
    const considerCount = result.recommendations.filter((r) => r.recommendationClass === "consider").length;
    expect(considerCount).toBeLessThanOrEqual(MAX_CONSIDER_RECOMMENDATIONS);
  });

  test("profileReadiness.sufficientForJudgment is false below the completeness threshold", () => {
    const result = runCounselorPipeline(baseState({ advisor: { student: {}, completenessPercent: 10 } as CounselorState["advisor"] }));
    expect(result.profileReadiness.sufficientForJudgment).toBe(false);
    expect(result.profileReadiness.completenessPercent).toBe(10);
  });

  test("profileReadiness.sufficientForJudgment is true at/above the completeness threshold", () => {
    const result = runCounselorPipeline(baseState({ advisor: { student: {}, completenessPercent: 80 } as CounselorState["advisor"] }));
    expect(result.profileReadiness.sufficientForJudgment).toBe(true);
  });

  test("never produces two recommendations with the same id (spec: one DB record cannot silently become two recommendations)", () => {
    const opps = ["a", "b", "c"].map((id) => opportunity(`opp-${id}`));
    const state = baseState({ eligibleOpportunityMatches: opps.map((o) => ({ opportunity: o, match: match(o.id) })) });
    const result = runCounselorPipeline(state);
    const ids = result.recommendations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("deterministic: running the same state twice produces the same recommendation ids in the same order", () => {
    const opp = opportunity("opp-1");
    const state = baseState({ eligibleOpportunityMatches: [{ opportunity: opp, match: match("opp-1") }] });
    const first = runCounselorPipeline(state);
    const second = runCounselorPipeline(state);
    expect(first.recommendations.map((r) => r.id)).toEqual(second.recommendations.map((r) => r.id));
  });
});
