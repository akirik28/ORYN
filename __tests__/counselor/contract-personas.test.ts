import { describe, expect, test } from "vitest";
import { runCounselorPipeline } from "@/lib/counselor/pipeline";
import { evaluateCandidateEligibility } from "@/lib/counselor/eligibility";
import { generateCandidateActions } from "@/lib/counselor/candidates";
import { toDimensionScoreRows } from "@/lib/counselor/gaps";
import { computeOpportunityMatch } from "@/lib/opportunities/matching";
import type { CounselorState } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch, ProfileDimension } from "@/types/database";

/**
 * Personas B, D, E from the counselor-data-quality-v1 founder prompt's Phase 11 (contract
 * tests 1-3, for personas A and C, already live in contract.test.ts — this file covers the
 * remaining three named personas against the same real, unmocked pipeline).
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
    last_verified_at: null,
    status: "active",
    normalized_title: id,
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

function match(opportunityId: string, overrides: Partial<OpportunityMatch> = {}): OpportunityMatch {
  return {
    id: `match-${opportunityId}`,
    user_id: "user-1",
    opportunity_id: opportunityId,
    eligible: true,
    eligibility_notes: null,
    relevance_score: 50,
    profile_need_score: 50,
    effort_estimate: null,
    match_score: 50,
    reason_codes: [],
    calculated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function scoresWith(overrides: Partial<Record<ProfileDimension, number>>, defaultScore = 80) {
  return DIMENSIONS.map((dimension) => ({
    dimension,
    score: overrides[dimension] ?? defaultScore,
    confidence: "high" as const,
    reason_codes: [],
  }));
}

describe("Persona B — CS/AI goal, strong academics, weak execution/project depth", () => {
  const scores = scoresWith({ execution_project_depth: 25 });

  function matchFor(opp: Opportunity): OpportunityMatch {
    const computed = computeOpportunityMatch(
      { age: 17, country: "United States", interests: ["Computer Science", "Artificial Intelligence"], weakestDimensions: ["execution_project_depth"] },
      { category: opp.category, minimumAge: opp.minimum_age, maximumAge: opp.maximum_age, eligibleCountries: opp.eligible_countries, fields: opp.fields, country: opp.country }
    );
    return match(opp.id, { eligible: computed.eligible, relevance_score: computed.relevanceScore, profile_need_score: computed.profileNeedScore, match_score: computed.matchScore });
  }

  const hackathon = opportunity("ai-hackathon", { category: "hackathon", fields: ["Computer Science", "Artificial Intelligence"] });
  const leadershipCamp = opportunity("generic-leadership-camp", { category: "summer_program", fields: ["Leadership"] });

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 80, interests: ["Computer Science", "Artificial Intelligence"] } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [],
    eligibleOpportunityMatches: [
      { opportunity: hackathon, match: matchFor(hackathon) },
      { opportunity: leadershipCamp, match: matchFor(leadershipCamp) },
    ],
    requirementCandidateInputs: [],
  };

  const result = runCounselorPipeline(state);
  const ids = result.recommendations.map((r) => r.id);

  test("execution_project_depth surfaces as the weakest-ranked gap", () => {
    expect(result.gaps[0].dimension).toBe("execution_project_depth");
  });

  test("a build/hackathon opportunity (addresses the actual gap) outranks a generic, non-gap-addressing leadership camp", () => {
    const hackathonIndex = ids.indexOf("opportunity:ai-hackathon");
    const campIndex = ids.indexOf("opportunity:generic-leadership-camp");
    expect(hackathonIndex).toBeGreaterThanOrEqual(0);
    if (campIndex >= 0) expect(hackathonIndex).toBeLessThan(campIndex);
  });
});

describe("Persona D — strong across most dimensions, weak volunteering/community impact", () => {
  const scores = scoresWith({ community_impact: 20 });

  function matchFor(opp: Opportunity): OpportunityMatch {
    const computed = computeOpportunityMatch(
      { age: 17, country: "United States", interests: ["Community Service"], weakestDimensions: ["community_impact"] },
      { category: opp.category, minimumAge: opp.minimum_age, maximumAge: opp.maximum_age, eligibleCountries: opp.eligible_countries, fields: opp.fields, country: opp.country }
    );
    return match(opp.id, { eligible: computed.eligible, relevance_score: computed.relevanceScore, profile_need_score: computed.profileNeedScore, match_score: computed.matchScore });
  }

  const verifiedVolunteering = opportunity("local-volunteering-program", { category: "volunteering", fields: ["Community Service"] });
  const unrelatedCompetition = opportunity("unrelated-math-competition", { category: "competition", fields: ["Mathematics"] });

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 85, interests: ["Community Service"] } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [],
    eligibleOpportunityMatches: [
      { opportunity: verifiedVolunteering, match: matchFor(verifiedVolunteering) },
      { opportunity: unrelatedCompetition, match: matchFor(unrelatedCompetition) },
    ],
    requirementCandidateInputs: [],
  };

  const result = runCounselorPipeline(state);
  const ids = result.recommendations.map((r) => r.id);

  test("community_impact surfaces as the weakest-ranked gap", () => {
    expect(result.gaps[0].dimension).toBe("community_impact");
  });

  test("the verified social-impact opportunity outranks an unrelated, non-gap-addressing competition", () => {
    const volunteeringIndex = ids.indexOf("opportunity:local-volunteering-program");
    const competitionIndex = ids.indexOf("opportunity:unrelated-math-competition");
    expect(volunteeringIndex).toBeGreaterThanOrEqual(0);
    if (competitionIndex >= 0) expect(volunteeringIndex).toBeLessThan(competitionIndex);
  });
});

describe("Persona E — opportunity has a hard U.S.-citizen restriction, student is not a U.S. citizen", () => {
  const scores = scoresWith({});

  const usCitizenOnlyInternship = opportunity("us-citizen-only-internship", {
    category: "internship",
    citizenship_restrictions: "Applicants must be U.S. citizens or U.S. permanent residents.",
  });

  const state: CounselorState = {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "Turkey" }, completenessPercent: 80 } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores),
    completenessChecklist: [],
    eligibleOpportunityMatches: [{ opportunity: usCitizenOnlyInternship, match: match("us-citizen-only-internship") }],
    requirementCandidateInputs: [],
  };

  const candidate = generateCandidateActions(state).find((c) => c.source.kind === "opportunity" && c.source.opportunityId === "us-citizen-only-internship")!;

  test("a candidate exists for the restricted opportunity (not silently dropped)", () => {
    expect(candidate).toBeDefined();
  });

  test("a non-U.S. student against a citizenship-restricted opportunity is never verdict 'known_eligible'", () => {
    const eligibility = evaluateCandidateEligibility(candidate, state);
    expect(eligibility.verdict).not.toBe("known_eligible");
  });

  test("the eligibility result carries a warning note rather than silently guessing ineligible or eligible", () => {
    const eligibility = evaluateCandidateEligibility(candidate, state);
    expect(eligibility.verdict).toBe("unknown");
    expect(eligibility.notes.length).toBeGreaterThan(0);
  });

  test("if it does surface in the final recommendation set, its eligibility warning reaches the student — never presented as a confirmed match", () => {
    const result = runCounselorPipeline(state);
    const rec = result.recommendations.find((r) => r.id === "opportunity:us-citizen-only-internship");
    if (rec) {
      expect(rec.eligibility.verdict).not.toBe("known_eligible");
      expect(rec.warnings.length).toBeGreaterThan(0);
    }
  });
});
