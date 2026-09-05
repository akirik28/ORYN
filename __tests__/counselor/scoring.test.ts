import { describe, expect, test } from "vitest";
import { rankCandidates } from "@/lib/counselor/scoring";
import type { CandidateAction, CounselorState, ProfileGap } from "@/lib/counselor/types";
import type { Opportunity, OpportunityMatch, ProfileDimension } from "@/types/database";

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
    source_confidence: "high",
    // Verified by default, consistent with this fixture's own `verification_state:
    // "verified_current"` below. The two contradicted each other, which is the live data
    // shape lib/opportunities/lifecycle.ts's freshness gate exists to catch (50 rows claim
    // verified_current while last_verified_at is null). Left null, every fixture in this file
    // would sit in the gated shape, and tests about country, citizenship, grade or scoring
    // would be asserting against an exclusion unrelated to their subject.
    last_verified_at: "2026-08-20T00:00:00Z",
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
    age_eligibility_basis: "not_researched",
    grade_eligibility_basis: "not_researched",
    country_eligibility_basis: "not_researched",
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

function opportunityCandidate(id: string, dimensions: ProfileDimension[], overrides: Partial<CandidateAction> = {}): CandidateAction {
  return {
    source: { kind: "opportunity", opportunityId: id },
    title: `Opportunity ${id}`,
    category: "research",
    addressesDimensions: dimensions,
    verificationState: "verified_current",
    sourceUrl: null,
    deadline: null,
    costOnFile: null,
    applicationRequirements: [],
    ...overrides,
  };
}

function gap(dimension: ProfileDimension, score: number, severity: ProfileGap["severity"], rank: number): ProfileGap {
  return { dimension, score, confidence: "high", severity, rank, spreadFromStrongest: 100 - score, reasonCodes: [] };
}

function state(opportunities: { opp: Opportunity; match: OpportunityMatch }[], overrides: Partial<CounselorState> = {}): CounselorState {
  return {
    userId: "user-1",
    advisor: { student: { birthYear: 2009, country: "United States" }, completenessPercent: 80 } as CounselorState["advisor"],
    dimensionScores: [],
    completenessChecklist: [],
    eligibleOpportunityMatches: opportunities.map((o) => ({ match: o.match, opportunity: o.opp })),
    requirementCandidateInputs: [],
    ...overrides,
  };
}

describe("rankCandidates — invariants", () => {
  test("returns an empty array for no candidates", () => {
    expect(rankCandidates([], [], state([]))).toEqual([]);
  });

  test("known_ineligible candidates never appear in the ranked output", () => {
    const opp = opportunity({ cycle_status: "closed" });
    const candidate = opportunityCandidate("opp-1", ["research"]);
    const ranked = rankCandidates([candidate], [gap("research", 20, "critical", 1)], state([{ opp, match: match() }]));
    expect(ranked).toHaveLength(0);
  });

  test("ranking is deterministic — identical input produces identical output twice", () => {
    const opp = opportunity();
    const candidate = opportunityCandidate("opp-1", ["research"]);
    const gaps = [gap("research", 20, "critical", 1)];
    const s = state([{ opp, match: match() }]);
    const first = rankCandidates([candidate], gaps, s);
    const second = rankCandidates([candidate], gaps, s);
    expect(first.map((r) => r.score)).toEqual(second.map((r) => r.score));
    expect(first.map((r) => r.candidate.title)).toEqual(second.map((r) => r.candidate.title));
  });

  test("every ranked candidate has bounded (low/medium/high) impact/effort/urgency/confidence, never a raw number", () => {
    const opp = opportunity();
    const candidate = opportunityCandidate("opp-1", ["research"]);
    const ranked = rankCandidates([candidate], [gap("research", 20, "critical", 1)], state([{ opp, match: match() }]));
    expect(["low", "medium", "high"]).toContain(ranked[0].impact);
    expect(["low", "medium", "high"]).toContain(ranked[0].effort);
    expect(["low", "medium", "high"]).toContain(ranked[0].urgency);
    expect(["low", "medium", "high"]).toContain(ranked[0].confidence);
  });
});

describe("rankCandidates — gap relevance", () => {
  test("a candidate addressing a critical gap outranks one addressing no gap at all", () => {
    const criticalOpp = opportunity({ id: "opp-critical" });
    const irrelevantOpp = opportunity({ id: "opp-irrelevant", category: "volunteering" });
    const candidates = [
      opportunityCandidate("opp-critical", ["research"]),
      opportunityCandidate("opp-irrelevant", [], { category: "volunteering" }),
    ];
    const gaps = [gap("research", 20, "critical", 1), gap("community_impact", 90, "minor", 9)];
    const ranked = rankCandidates(
      candidates,
      gaps,
      state([
        { opp: criticalOpp, match: match({ opportunity_id: "opp-critical" }) },
        { opp: irrelevantOpp, match: match({ opportunity_id: "opp-irrelevant" }) },
      ])
    );
    const criticalIndex = ranked.findIndex((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "opp-critical");
    const irrelevantIndex = ranked.findIndex((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "opp-irrelevant");
    expect(criticalIndex).toBeLessThan(irrelevantIndex);
  });

  // Found live (Gate 2, 2026-08-24): rankDimensionGaps (gaps.ts) assigns a GapSeverity to
  // every dimension short of the single strongest one, so a 94/100 dimension still comes
  // back "minor" — real, non-zero GAP_SEVERITY_SCORE credit for a candidate that touches a
  // strength, not a weakness. Confirmed on a real profile: a candidate whose only matched
  // dimension was Academics at 94/100 scored and ranked as if it addressed a genuine gap.
  test("a candidate matching only an already-strong dimension (>=70) gets zero gap-relevance credit", () => {
    const strongOnlyOpp = opportunity({ id: "opp-strong-only" });
    const noMatchOpp = opportunity({ id: "opp-no-match", category: "volunteering" });
    const candidates = [
      opportunityCandidate("opp-strong-only", ["academics"]),
      opportunityCandidate("opp-no-match", [], { category: "volunteering" }),
    ];
    // rankDimensionGaps would call this "minor" (it isn't the single strongest dimension),
    // exactly the shape that reproduced the live bug.
    const gaps = [gap("academics", 94, "minor", 8), gap("research", 100, "insufficient_data", 9)];
    const ranked = rankCandidates(
      candidates,
      gaps,
      state([
        { opp: strongOnlyOpp, match: match({ opportunity_id: "opp-strong-only" }) },
        { opp: noMatchOpp, match: match({ opportunity_id: "opp-no-match" }) },
      ])
    );
    const strongOnly = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "opp-strong-only")!;
    const noMatch = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "opp-no-match")!;
    expect(strongOnly.scoreBreakdown.gapRelevance).toBe(0);
    expect(strongOnly.score).toBe(noMatch.score);
  });
});

describe("rankCandidates — recommendation class", () => {
  test("a top candidate addressing a critical gap is classified 'do'", () => {
    // known-eligible on purpose (2026-09-05, the unknown-eligibility score cap below): this
    // test is about gap relevance driving "do", not about eligibility -- the bare opportunity()
    // default is eligibility-UNKNOWN (no age/grade/country data at all), which the cap below
    // now correctly forces to "deprioritize" regardless of how strong the gap match is. Confirmed
    // by running this exact test unmodified against the fix: it failed (do -> deprioritize),
    // which is the fix working as intended, not a regression -- the fixture needed updating to
    // still test what its name says, not the assertion.
    const opp = opportunity({ country_eligibility_confirmed_open: true, age_eligibility_confirmed_open: true, grade_eligibility_confirmed_open: true });
    const candidate = opportunityCandidate("opp-1", ["research"]);
    const ranked = rankCandidates([candidate], [gap("research", 10, "critical", 1)], state([{ opp, match: match() }]));
    expect(ranked[0].eligibility.verdict).toBe("known_eligible");
    expect(ranked[0].recommendationClass).toBe("do");
  });

  test("a candidate whose only matched dimension is already strong (>=75) is deprioritized, not recommended as 'do'", () => {
    const opp = opportunity({ category: "volunteering" });
    const candidate = opportunityCandidate("opp-1", ["community_impact"], { category: "volunteering" });
    const gaps = [gap("research", 20, "critical", 1), gap("community_impact", 90, "minor", 9)];
    const ranked = rankCandidates([candidate], gaps, state([{ opp, match: match() }]));
    expect(ranked[0].recommendationClass).not.toBe("do");
    expect(["deprioritize", "avoid_for_now"]).toContain(ranked[0].recommendationClass);
  });

  test("a candidate exclusively targeting the single strongest dimension is escalated to avoid_for_now", () => {
    const opp = opportunity({ category: "volunteering" });
    const candidate = opportunityCandidate("opp-1", ["community_impact"], { category: "volunteering" });
    // community_impact (95) is strictly the strongest of the two — rank 2 (highest).
    const gaps = [gap("research", 20, "critical", 1), gap("community_impact", 95, "minor", 2)];
    const ranked = rankCandidates([candidate], gaps, state([{ opp, match: match() }]));
    expect(ranked[0].recommendationClass).toBe("avoid_for_now");
  });

  test("at most one avoid_for_now candidate is ever produced", () => {
    const oppA = opportunity({ id: "opp-a", category: "volunteering" });
    const oppB = opportunity({ id: "opp-b", category: "volunteering" });
    const candidates = [
      opportunityCandidate("opp-a", ["community_impact"], { category: "volunteering" }),
      opportunityCandidate("opp-b", ["community_impact"], { category: "volunteering" }),
    ];
    const gaps = [gap("research", 20, "critical", 1), gap("community_impact", 95, "minor", 2)];
    const ranked = rankCandidates(
      candidates,
      gaps,
      state([
        { opp: oppA, match: match({ opportunity_id: "opp-a" }) },
        { opp: oppB, match: match({ opportunity_id: "opp-b" }) },
      ])
    );
    expect(ranked.filter((r) => r.recommendationClass === "avoid_for_now")).toHaveLength(1);
  });
});

describe("rankCandidates — redundancy / diversity", () => {
  test("the second and third candidate addressing the same dimension are discounted relative to the first", () => {
    const opps = ["a", "b", "c"].map((id) => opportunity({ id: `opp-${id}` }));
    const candidates = opps.map((o) => opportunityCandidate(o.id, ["research"]));
    const gaps = [gap("research", 10, "critical", 1)];
    const ranked = rankCandidates(
      candidates,
      gaps,
      state(opps.map((o) => ({ opp: o, match: match({ opportunity_id: o.id, relevance_score: 50, profile_need_score: 50 }) })))
    );
    const scores = ranked.map((r) => r.score);
    expect(scores[0]).toBeGreaterThan(scores[1]);
    expect(scores[1]).toBeGreaterThan(scores[2]);
  });
});

describe("rankCandidates — non-opportunity kinds", () => {
  test("a not_met requirement_action candidate scores highly and is eligible", () => {
    const candidate: CandidateAction = {
      source: { kind: "requirement_action", universityId: "uni-1", requirementId: "req-1", status: "not_met" },
      title: "Address: SAT score (Test University)",
      category: "requirement_action",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
    };
    const ranked = rankCandidates([candidate], [], state([]));
    expect(ranked).toHaveLength(1);
    expect(ranked[0].eligibility.verdict).toBe("known_eligible");
    expect(ranked[0].score).toBeGreaterThan(50);
  });

  // Tier 2, docs/handoffs/feat1-territory-audit-2026-08-22.md: this candidate's own backing
  // requirement isn't in requirementCandidateInputs (state([]) below) — a "should never
  // happen" case, same shape as scoreOpportunityCandidate's entry-not-found branch, which
  // honestly defaults to DATA_CONFIDENCE_SCORE.low. This branch used to default to .medium
  // instead: an absence of data reading as a real, moderate confidence level. Confirms the
  // fix, not just the pre-existing "still scores/is eligible" assertion above.
  test("a requirement_action candidate whose backing requirement is missing from state reports low confidence, not medium", () => {
    const candidate: CandidateAction = {
      source: { kind: "requirement_action", universityId: "uni-1", requirementId: "req-missing", status: "unknown" },
      title: "Add the information needed to check: SAT score (Test University)",
      category: "requirement_action",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
    };
    const ranked = rankCandidates([candidate], [], state([]));
    expect(ranked[0].confidence).toBe("low");
  });

  test("profile_task candidates score higher when the profile is less complete", () => {
    const candidate: CandidateAction = {
      source: { kind: "profile_task", checklistKey: "Add a career goal" },
      title: "Add a career goal",
      category: "profile_completion",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
    };
    const lowCompleteness = rankCandidates(
      [candidate],
      [],
      state([], { advisor: { student: { birthYear: 2009 }, completenessPercent: 10 } as CounselorState["advisor"] })
    )[0];
    const highCompleteness = rankCandidates(
      [candidate],
      [],
      state([], { advisor: { student: { birthYear: 2009 }, completenessPercent: 90 } as CounselorState["advisor"] })
    )[0];
    expect(lowCompleteness.score).toBeGreaterThan(highCompleteness.score);
  });
});

/**
 * CEO's own live measurement, 2026-09-05: 14 of 18 real "do" recommendations across 6 real
 * students (78%) carried eligibility.verdict === "unknown" -- two students with all 3 of their
 * 3 "do" slots unknown. The pre-existing dataQuality*0.6 discount (still applied below, for
 * scoreBreakdown/confidence) was proven insufficient by real data: it only softens one of four
 * weighted components, so a candidate strong on gapRelevance/fieldAlignment/urgency clears "do"
 * regardless. This is the same shape lib/opportunities/matching.ts's
 * hasAnyEligibilityDataAtAll/NO_ELIGIBILITY_DATA_SCORE_CAP already fixed on the opportunity-card
 * side, reused here rather than built twice.
 */
describe("rankCandidates — unknown-eligibility score ceiling (CEO, 2026-09-05)", () => {
  test("RED->GREEN: an unknown-eligibility opportunity with a strong gap/field/urgency match is still forced to 'deprioritize', never 'do'", () => {
    // Worst case, deliberately: critical gap (claimable, well under GAP_CLAIM_SCORE_CEILING),
    // a fully relevant match, and a deadline inside the highest urgency band -- every
    // non-eligibility component maxed. Confirmed this exact fixture produces "do" (score ~85)
    // without the fix by temporarily reverting just the `score` line and re-running: this is a
    // genuine regression pin, not a tautology.
    const opp = opportunity(); // default: no age/grade/country data at all -> verdict "unknown"
    const candidate = opportunityCandidate("opp-1", ["research"], { deadline: { date: "2026-01-08", sourceLabel: "test" } });
    const ranked = rankCandidates(
      [candidate],
      [gap("research", 10, "critical", 1)],
      state([{ opp, match: match({ relevance_score: 100 }) }]),
      new Date("2026-01-01T00:00:00Z")
    );
    expect(ranked[0].eligibility.verdict).toBe("unknown");
    expect(ranked[0].score).toBeLessThanOrEqual(25); // RANKING_THRESHOLDS.considerFloor
    expect(ranked[0].recommendationClass).toBe("deprioritize");
  });

  test("an identical candidate that IS known-eligible is not capped and clears 'do'", () => {
    // Same inputs as the test above, only the eligibility facts differ -- isolates that the
    // ceiling is gated on verdict specifically, not some other side effect of this fixture shape.
    const opp = opportunity({ country_eligibility_confirmed_open: true, age_eligibility_confirmed_open: true, grade_eligibility_confirmed_open: true });
    const candidate = opportunityCandidate("opp-1", ["research"], { deadline: { date: "2026-01-08", sourceLabel: "test" } });
    const ranked = rankCandidates(
      [candidate],
      [gap("research", 10, "critical", 1)],
      state([{ opp, match: match({ relevance_score: 100 }) }]),
      new Date("2026-01-01T00:00:00Z")
    );
    expect(ranked[0].eligibility.verdict).toBe("known_eligible");
    expect(ranked[0].score).toBeGreaterThan(25);
    expect(ranked[0].recommendationClass).toBe("do");
  });

  test("the ceiling caps ranking only -- scoreBreakdown.dataQuality and confidence still reflect the real (merely discounted) value, for the recommendation's own explanation", () => {
    const opp = opportunity({ source_confidence: "high" });
    const candidate = opportunityCandidate("opp-1", ["research"]);
    const ranked = rankCandidates([candidate], [gap("research", 10, "critical", 1)], state([{ opp, match: match({ relevance_score: 100 }) }]));
    expect(ranked[0].eligibility.verdict).toBe("unknown");
    expect(ranked[0].score).toBeLessThanOrEqual(25);
    // DATA_CONFIDENCE_SCORE.high (100) * 0.6, rounded -- the discount, not the ranking ceiling.
    expect(ranked[0].scoreBreakdown.dataQuality).toBe(60);
  });

  test("a requirement_action candidate is never affected by the ceiling — it is always known_eligible by construction", () => {
    const candidate: CandidateAction = {
      source: { kind: "requirement_action", universityId: "uni-1", requirementId: "req-1", status: "not_met" },
      title: "Address: SAT score (Test University)",
      category: "requirement_action",
      addressesDimensions: [],
      verificationState: null,
      sourceUrl: null,
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
    };
    const ranked = rankCandidates([candidate], [], state([]));
    expect(ranked[0].eligibility.verdict).toBe("known_eligible");
    expect(ranked[0].recommendationClass).toBe("do");
  });
});
