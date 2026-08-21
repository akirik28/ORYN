import { describe, expect, test } from "vitest";
import { evaluateCandidateEligibility } from "@/lib/counselor/eligibility";
import { generateCandidateActions } from "@/lib/counselor/candidates";
import { rankCandidates } from "@/lib/counselor/scoring";
import { toDimensionScoreRows, rankDimensionGaps } from "@/lib/counselor/gaps";
import type { CounselorState } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch, ProfileDimension } from "@/types/database";

/**
 * Part R (counselor-opportunity-readiness-sprint prompt) — Tests F-K. F/G/H/I extend the
 * existing citizenship/residency coverage in eligibility.test.ts and contract-personas.test.ts
 * with the exact scenarios the sprint names explicitly; J/K cover deadline urgency, not
 * previously tested end-to-end through rankCandidates.
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
    category: "internship",
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
    eligible_citizenships: [],
    location_mode: null,
    financial_aid_available: null,
    application_requirements: [],
    current_cycle_label: null,
    verified_at: null,
    organization_entity_id: null,
    country_entity_id: null,
    access_channel: null,
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

function baseState(opp: Opportunity, studentOverrides: Partial<CounselorState["advisor"]["student"]> = {}): CounselorState {
  return {
    userId: "user-1",
    advisor: {
      student: { birthYear: 2009, country: "Turkey", citizenshipCountries: [], graduationYear: 2028, ...studentOverrides },
      completenessPercent: 80,
    } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(DIMENSIONS.map((dimension) => ({ dimension, score: 60, confidence: "high" as const, reason_codes: [] }))),
    completenessChecklist: [],
    eligibleOpportunityMatches: [{ opportunity: opp, match: match(opp.id) }],
    requirementCandidateInputs: [],
  };
}

function candidateFor(opp: Opportunity, state: CounselorState) {
  return generateCandidateActions(state).find((c) => c.source.kind === "opportunity" && c.source.opportunityId === opp.id)!;
}

describe("Test F (spec Part R) — confirmed international eligibility", () => {
  test("a Turkey-based, age/grade-satisfying student is known_eligible when the opportunity explicitly lists Turkey among many eligible countries", () => {
    const opp = opportunity("international-program", {
      eligible_countries: ["United States", "United Kingdom", "Turkey", "Germany", "Brazil"],
      minimum_age: 15,
      eligible_grades: ["10", "11", "12"],
    });
    const state = baseState(opp, { birthYear: 2009, country: "Turkey", graduationYear: 2028 });
    const result = evaluateCandidateEligibility(candidateFor(opp, state), state);
    expect(result.verdict).toBe("known_eligible");
  });
});

describe("Test G (spec Part R) — confirmed geographic exclusion", () => {
  test("a Turkey-resident student is known_ineligible for a US-residents-only opportunity", () => {
    const opp = opportunity("us-residents-only", { eligible_countries: ["United States"] });
    const state = baseState(opp, { country: "Turkey" });
    const result = evaluateCandidateEligibility(candidateFor(opp, state), state);
    expect(result.verdict).toBe("known_ineligible");
  });
});

describe("Test H (spec Part R) — missing citizenship", () => {
  test("a US-citizens-only opportunity is unknown (not known_ineligible, not known_eligible) when the student's citizenship isn't on file", () => {
    const opp = opportunity("us-citizens-only", { eligible_citizenships: ["United States"] });
    const state = baseState(opp, { country: "Turkey", citizenshipCountries: [] });
    const result = evaluateCandidateEligibility(candidateFor(opp, state), state);
    expect(result.verdict).toBe("unknown");
    expect(result.notes.length).toBeGreaterThan(0);
  });
});

describe("Test I (spec Part R) — known citizenship mismatch", () => {
  test("a US-citizens-only opportunity is known_ineligible when the student's structured citizenship is Turkey only", () => {
    const opp = opportunity("us-citizens-only-2", { eligible_citizenships: ["United States"] });
    const state = baseState(opp, { citizenshipCountries: ["Turkey"] });
    const result = evaluateCandidateEligibility(candidateFor(opp, state), state);
    expect(result.verdict).toBe("known_ineligible");
  });

  test("dual citizenship: known_eligible (on the citizenship axis) as soon as ONE citizenship matches", () => {
    const opp = opportunity("us-citizens-only-3", { eligible_citizenships: ["United States"] });
    const state = baseState(opp, { citizenshipCountries: ["Turkey", "United States"] });
    const result = evaluateCandidateEligibility(candidateFor(opp, state), state);
    expect(result.verdict).toBe("known_eligible");
  });
});

describe("Test J (spec Part R) — deadline urgency", () => {
  const referenceDate = new Date("2026-08-20T00:00:00Z");

  test("an otherwise-identical opportunity closing in 10 days ranks above one closing in 5 months", () => {
    const near = opportunity("closes-soon", { deadline: "2026-08-30", category: "internship" });
    const far = opportunity("closes-later", { deadline: "2027-01-20", category: "internship" });

    const gaps = toDimensionScoreRows(DIMENSIONS.map((d) => ({ dimension: d, score: 60, confidence: "high" as const, reason_codes: [] })));
    const state: CounselorState = {
      userId: "user-1",
      advisor: { student: { birthYear: 2009, country: "Turkey", citizenshipCountries: [], graduationYear: 2028 }, completenessPercent: 80 } as unknown as CounselorState["advisor"],
      dimensionScores: gaps,
      completenessChecklist: [],
      eligibleOpportunityMatches: [
        { opportunity: near, match: match(near.id) },
        { opportunity: far, match: match(far.id) },
      ],
      requirementCandidateInputs: [],
    };
    const candidates = generateCandidateActions(state);
    const ranked = rankCandidates(candidates, [], state, referenceDate);

    const nearRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "closes-soon")!;
    const farRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "closes-later")!;

    expect(nearRanked.urgency).toBe("high");
    expect(farRanked.urgency).toBe("low");
    expect(nearRanked.score).toBeGreaterThan(farRanked.score);
  });

  test("urgency alone doesn't overpower relevance: a far-deadline opportunity that addresses a real gap can still outrank a near-deadline one that addresses nothing", () => {
    const relevantFar = opportunity("relevant-but-later", { deadline: "2027-01-20", category: "research" });
    const irrelevantNear = opportunity("urgent-but-irrelevant", { deadline: "2026-08-30", category: "volunteering" });

    const gaps = toDimensionScoreRows([
      { dimension: "research", score: 15, confidence: "high" as const, reason_codes: [] },
      ...DIMENSIONS.filter((d) => d !== "research").map((d) => ({ dimension: d, score: 80, confidence: "high" as const, reason_codes: [] })),
    ]);
    const state: CounselorState = {
      userId: "user-1",
      advisor: { student: { birthYear: 2009, country: "Turkey", citizenshipCountries: [], graduationYear: 2028 }, completenessPercent: 80 } as unknown as CounselorState["advisor"],
      dimensionScores: gaps,
      completenessChecklist: [],
      eligibleOpportunityMatches: [
        { opportunity: relevantFar, match: match(relevantFar.id, { relevance_score: 90 }) },
        { opportunity: irrelevantNear, match: match(irrelevantNear.id, { relevance_score: 20 }) },
      ],
      requirementCandidateInputs: [],
    };
    const candidates = generateCandidateActions(state);
    const realGaps = rankDimensionGaps(gaps);
    const ranked = rankCandidates(candidates, realGaps, state, referenceDate);

    const relevantRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "relevant-but-later")!;
    const irrelevantRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "urgent-but-irrelevant")!;

    expect(relevantRanked.score).toBeGreaterThan(irrelevantRanked.score);
  });
});

describe("Test K (spec Part R) — historical/past deadline never contributes current urgency", () => {
  test("a deadline in the past scores exactly the same urgency as no deadline at all (zero)", () => {
    const referenceDate = new Date("2026-08-20T00:00:00Z");
    const pastDeadline = opportunity("stale-deadline", { deadline: "2025-01-15", cycle_status: "open" });
    const noDeadline = opportunity("no-deadline", { deadline: null, cycle_status: "open" });

    const gaps = toDimensionScoreRows(DIMENSIONS.map((d) => ({ dimension: d, score: 60, confidence: "high" as const, reason_codes: [] })));
    const state: CounselorState = {
      userId: "user-1",
      advisor: { student: { birthYear: 2009, country: "Turkey", citizenshipCountries: [], graduationYear: 2028 }, completenessPercent: 80 } as unknown as CounselorState["advisor"],
      dimensionScores: gaps,
      completenessChecklist: [],
      eligibleOpportunityMatches: [
        { opportunity: pastDeadline, match: match(pastDeadline.id) },
        { opportunity: noDeadline, match: match(noDeadline.id) },
      ],
      requirementCandidateInputs: [],
    };
    const candidates = generateCandidateActions(state);
    const ranked = rankCandidates(candidates, [], state, referenceDate);

    const pastRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "stale-deadline")!;
    const noneRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "no-deadline")!;

    expect(pastRanked.urgency).toBe("low");
    expect(pastRanked.scoreBreakdown.urgency).toBe(0);
    expect(pastRanked.scoreBreakdown.urgency).toBe(noneRanked.scoreBreakdown.urgency);
  });
});
