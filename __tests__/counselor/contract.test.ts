import { describe, expect, test } from "vitest";
import { runCounselorPipeline } from "@/lib/counselor/pipeline";
import { explainCounselorRecommendations } from "@/lib/ai/counselor-explain";
import { toDimensionScoreRows } from "@/lib/counselor/gaps";
import { computeOpportunityMatch } from "@/lib/opportunities/matching";
import { MockAIProvider } from "../stubs/mock-ai-provider";
import type { CounselorState } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch, ProfileDimension } from "@/types/database";

/**
 * The three founder-specified "contract tests" (docs/counselor-core-plan.md, spec §57-59) —
 * run against the real, unmocked pipeline (gaps -> candidates -> eligibility -> scoring ->
 * evidence), not just each module's own unit tests, to prove the whole thing actually
 * behaves the way the spec describes end to end.
 */

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

function opportunity(id: string, overrides: Partial<Opportunity> = {}): Opportunity {
  return {
    id,
    title: id,
    organization: "Test Org",
    description: null,
    category: "competition",
    official_url: "https://example.org",
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
    // Verified by default, consistent with this fixture's own `verification_state:
    // "verified_current"` below. The two contradicted each other, which is the live data
    // shape lib/opportunities/lifecycle.ts's freshness gate exists to catch (50 rows claim
    // verified_current while last_verified_at is null). Left null, every fixture in this file
    // would sit in the gated shape, and tests about country, citizenship, grade or scoring
    // would be asserting against an exclusion unrelated to their subject.
    last_verified_at: "2026-08-20T00:00:00Z",
    status: "active",
    normalized_title: id,
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
    age_eligibility_confirmed_open: false,
    grade_eligibility_confirmed_open: false,
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

describe("Contract test 1 (spec §57) — Economics-goal student, mixed data quality", () => {
  // Strong academics/leadership, weak external validation (awards_distinction) — the
  // "little recorded Economics-specific external validation" the spec describes.
  const scores = DIMENSIONS.map((dimension) => ({
    dimension,
    score: dimension === "awards_distinction" ? 30 : 80,
    confidence: "high" as const,
    reason_codes: [],
  }));

  // Real matching.ts logic, not a hardcoded fixture number — this is what
  // lib/opportunities/persist-matches.ts would actually have computed and stored on
  // opportunity_matches before Counselor Core ever sees it (scoring.ts deliberately reuses
  // that value rather than recomputing relevance itself — see lib/counselor/scoring.ts).
  function matchFor(interest: "Economics" | "Biology", opp: Opportunity): OpportunityMatch {
    const computed = computeOpportunityMatch(
      { age: 17, country: "United States", interests: [interest], weakestDimensions: ["awards_distinction"] },
      { category: opp.category, minimumAge: opp.minimum_age, maximumAge: opp.maximum_age, eligibleCountries: opp.eligible_countries, fields: opp.fields, country: opp.country }
    );
    return match(opp.id, { eligible: computed.eligible, relevance_score: computed.relevanceScore, profile_need_score: computed.profileNeedScore, match_score: computed.matchScore });
  }

  function stateFor(interest: "Economics" | "Biology"): CounselorState {
    const economicsCompetition = opportunity("economics-competition", { category: "competition", fields: ["Economics"] });
    const biologyProgram = opportunity("biology-program", { category: "academic_program", fields: ["Biology"] });
    const expiredEconomicsProgram = opportunity("expired-economics-summer", { category: "summer_program", fields: ["Economics"], cycle_status: "closed" });
    const unverifiedEconomicsOpportunity = opportunity("unverified-economics", { category: "fellowship", fields: ["Economics"], verification_state: "unverified" });
    const eligibleEconomicsProgram = opportunity("economics-program", { category: "online_program", fields: ["Economics"] });

    return {
      userId: "user-1",
      advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 80, interests: [interest] } as CounselorState["advisor"],
      dimensionScores: toDimensionScoreRows(scores),
      completenessChecklist: [],
      eligibleOpportunityMatches: [
        { opportunity: economicsCompetition, match: matchFor(interest, economicsCompetition) },
        { opportunity: biologyProgram, match: matchFor(interest, biologyProgram) },
        // Included here to prove eligibility.ts's own cycle_status/verification_state checks
        // do the excluding — these two would never actually reach this list via the real
        // lib/counselor/state.ts DB query (which already filters verified_current), but the
        // pipeline must be safe on its own regardless of what state it's handed.
        { opportunity: expiredEconomicsProgram, match: matchFor(interest, expiredEconomicsProgram) },
        { opportunity: unverifiedEconomicsOpportunity, match: matchFor(interest, unverifiedEconomicsOpportunity) },
        { opportunity: eligibleEconomicsProgram, match: matchFor(interest, eligibleEconomicsProgram) },
      ],
      requirementCandidateInputs: [],
    };
  }

  const result = runCounselorPipeline(stateFor("Economics"));
  const ids = result.recommendations.map((r) => r.id);

  test("the expired opportunity is excluded, never presented as a recommendation", () => {
    expect(ids).not.toContain("opportunity:expired-economics-summer");
  });

  test("the unverified opportunity is excluded, never presented as verified", () => {
    expect(ids).not.toContain("opportunity:unverified-economics");
  });

  test("eligible, verified, field-relevant actions rank above the irrelevant Biology program", () => {
    const competitionIndex = ids.indexOf("opportunity:economics-competition");
    const biologyIndex = ids.indexOf("opportunity:biology-program");
    expect(competitionIndex).toBeGreaterThanOrEqual(0);
    // Biology may be excluded entirely (also fine — spec says "excluded/low") or merely
    // ranked lower; either way it must never outrank the relevant, verified competition.
    if (biologyIndex >= 0) expect(competitionIndex).toBeLessThan(biologyIndex);
  });

  test("every surfaced recommendation explains itself with real, non-empty reasoning", () => {
    for (const rec of result.recommendations) {
      expect(rec.why.length).toBeGreaterThan(0);
    }
  });

  test("no recommendation carries a deadline that wasn't actually on the source opportunity", () => {
    for (const rec of result.recommendations) {
      if (rec.deadline === null) continue;
      const source = stateFor("Economics").eligibleOpportunityMatches.find((e) => `opportunity:${e.opportunity.id}` === rec.id);
      expect(source?.opportunity.deadline).toBe(rec.deadline.date);
    }
  });

  test("switching the student's interest to Biology materially changes the ranking", () => {
    const biologyResult = runCounselorPipeline(stateFor("Biology"));
    const economicsTopId = result.recommendations[0]?.id;
    const biologyTopId = biologyResult.recommendations[0]?.id;
    // Not asserting a specific winner (relevance is one of several score inputs, not the
    // only one) — asserting the ranking is not identical, i.e. the input genuinely mattered.
    expect(biologyResult.recommendations.map((r) => r.id)).not.toEqual(result.recommendations.map((r) => r.id));
    void economicsTopId;
    void biologyTopId;
  });
});

describe("Contract test 2 (spec §58) — near-empty profile", () => {
  // A brand-new student: every dimension unscored (score 0, confidence low — exactly what
  // lib/scoring's dimension functions return for no data at all), nothing verified/eligible
  // to recommend yet, and a mostly-incomplete checklist.
  const emptyScores = DIMENSIONS.map((dimension) => ({ dimension, score: 0, confidence: "low" as const, reason_codes: [] }));

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: null, country: null }, completenessPercent: 7 } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(emptyScores),
    completenessChecklist: [
      { key: "school_details", label: "Add your school and academic details", done: false },
      { key: "activity", label: "Add an activity", done: false },
      { key: "career_goal", label: "Set a career goal", done: false },
      { key: "interest", label: "Add an interest", done: false },
    ],
    eligibleOpportunityMatches: [],
    requirementCandidateInputs: [],
  };

  const result = runCounselorPipeline(state);

  test("every dimension is reported insufficient_data, never a false confident weakness", () => {
    expect(result.gaps.every((g) => g.severity === "insufficient_data")).toBe(true);
  });

  test("profileReadiness says plainly that Proxola doesn't know this student well enough yet", () => {
    expect(result.profileReadiness.sufficientForJudgment).toBe(false);
  });

  test("the surfaced recommendations lead with completing the profile, not judgment calls", () => {
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => r.id.startsWith("profile_task:"))).toBe(true);
  });
});

describe("Contract test 3 (spec §59) — LLM provider outage", () => {
  const scores = DIMENSIONS.map((dimension) => ({ dimension, score: 50, confidence: "high" as const, reason_codes: [] }));
  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 80 } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [{ key: "career_goal", label: "Add a career goal", done: false }],
    eligibleOpportunityMatches: [{ opportunity: opportunity("opp-1"), match: match("opp-1") }],
    requirementCandidateInputs: [],
  };

  test("the deterministic pipeline is fully populated with zero network/provider involvement", () => {
    const result = runCounselorPipeline(state);
    expect(result.gaps.length).toBe(9);
    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations.every((r) => r.why.length > 0)).toBe(true);
  });

  test("when the provider is down, explainCounselorRecommendations degrades to null without touching the deterministic result", async () => {
    const result = runCounselorPipeline(state);
    const downProvider = new MockAIProvider().queueStructured(new Error("ECONNREFUSED"));
    const explanation = await explainCounselorRecommendations("user-1", result, downProvider);
    expect(explanation).toBeNull();
    // The already-computed result is untouched — no blank screen, no disappearing
    // recommendations just because the narration layer failed.
    expect(result.recommendations.length).toBeGreaterThan(0);
  });
});
