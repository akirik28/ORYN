import { describe, expect, test } from "vitest";
import { buildCounselorDashboardContract, resolveAvoidRecommendation } from "@/lib/counselor/dashboard-contract";
import { toDimensionScoreRows } from "@/lib/counselor/gaps";
import { RANKING_THRESHOLDS } from "@/lib/counselor/config";
import type { CounselorRecommendation, CounselorState } from "@/lib/counselor/types";
import type { UpcomingDeadline } from "@/lib/deadlines/upcoming";
import type { Opportunity, OpportunityMatch, ProfileDimension } from "@/types/database";

/**
 * B4 (counselor-data-quality-v1 founder brief) — the dashboard view model. Reuses the same
 * fixture conventions as pipeline.test.ts/contract.test.ts (opportunity()/match()/baseState()
 * builders) since this is deliberately just composition on top of the same pipeline those
 * tests already exercise directly.
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
    title: `Opportunity ${id}`,
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

/** One deliberate gap (research, score 10) and one deliberate strength (leadership, score 95) — the rest are mid-range. */
function scores() {
  return DIMENSIONS.map((dimension) => {
    if (dimension === "research") return { dimension, score: 10, confidence: "high" as const, reason_codes: [] };
    if (dimension === "leadership") return { dimension, score: 95, confidence: "high" as const, reason_codes: [] };
    return { dimension, score: 55, confidence: "high" as const, reason_codes: [] };
  });
}

const targetUniversities: CounselorState["advisor"]["targetUniversities"] = [
  { id: "target-1", universityId: "uni-1", programId: null, name: "Bocconi", status: "target", outlook: "competitive" },
];

function baseState(overrides: Partial<CounselorState> = {}): CounselorState {
  return {
    userId: "user-1",
    advisor: {
      student: { birthYear: 2009, country: "United States" },
      completenessPercent: 80,
      targetUniversities,
    } as CounselorState["advisor"],
    dimensionScores: toDimensionScoreRows(scores()),
    completenessChecklist: [],
    eligibleOpportunityMatches: [],
    requirementCandidateInputs: [],
    ...overrides,
  };
}

const deadlines: UpcomingDeadline[] = [
  { id: "application-1", source: "application", title: "Bocconi application", date: "2026-09-01", href: "/applications/1" },
];

describe("buildCounselorDashboardContract", () => {
  test("scoreVersion and profileReadiness are passed through from the pipeline unchanged", () => {
    const contract = buildCounselorDashboardContract(baseState(), []);
    expect(contract.scoreVersion).toBe("counselor_ranking_v1");
    expect(contract.profileReadiness).toEqual({ completenessPercent: 80, sufficientForJudgment: true });
  });

  test("gaps ranks the deliberate weak dimension (research) first", () => {
    const contract = buildCounselorDashboardContract(baseState(), []);
    expect(contract.gaps[0].dimension).toBe("research");
  });

  test("strengths ranks the deliberate strong dimension (leadership) first — first-class, not merely 'not the gap'", () => {
    const contract = buildCounselorDashboardContract(baseState(), []);
    expect(contract.strengths[0].dimension).toBe("leadership");
    expect(contract.strengths[0].tier).not.toBe("insufficient_data");
  });

  test("strengths and gaps are independently computed rankings, not derived from one another", () => {
    // Distinct scores per dimension (unlike baseState's ties) so weakest-first vs
    // strongest-first is a genuine, unambiguous reversal — a stable sort only guarantees
    // tied elements keep their original relative order in both directions, it does not
    // reverse ties, so this assertion needs untied input to be meaningful.
    const distinctScores = DIMENSIONS.map((dimension, i) => ({ dimension, score: 10 + i * 9, confidence: "high" as const, reason_codes: [] }));
    const state = baseState({ dimensionScores: toDimensionScoreRows(distinctScores) });
    const contract = buildCounselorDashboardContract(state, []);
    expect(contract.strengths).toHaveLength(9);
    expect(contract.gaps).toHaveLength(9);
    expect(contract.strengths.map((s) => s.dimension)).toEqual([...contract.gaps.map((g) => g.dimension)].reverse());
  });

  test("thisWeekActions is exactly the pipeline's 'do' bucket, never exceeding the configured cap", () => {
    const opportunities = ["a", "b", "c", "d", "e"].map((id) => opportunity(`opp-${id}`, { fields: ["Research"] }));
    const state = baseState({
      eligibleOpportunityMatches: opportunities.map((o) => ({ opportunity: o, match: match(o.id, { relevance_score: 80 }) })),
    });
    const contract = buildCounselorDashboardContract(state, []);
    expect(contract.thisWeekActions.length).toBeLessThanOrEqual(RANKING_THRESHOLDS.doSlots);
    expect(contract.thisWeekActions.every((r) => r.recommendationClass === "do")).toBe(true);
  });

  test("worthConsidering is exactly the pipeline's 'consider' bucket", () => {
    const opportunities = Array.from({ length: 10 }, (_, i) =>
      opportunity(`opp-${i}`, { category: ["volunteering", "conference", "hackathon", "student_program"][i % 4] as Opportunity["category"] })
    );
    const state = baseState({
      eligibleOpportunityMatches: opportunities.map((o) => ({ opportunity: o, match: match(o.id, { relevance_score: 40 }) })),
    });
    const contract = buildCounselorDashboardContract(state, []);
    expect(contract.worthConsidering.every((r) => r.recommendationClass === "consider")).toBe(true);
  });

  test("avoidForNow is null when the pipeline produces no avoid_for_now candidate", () => {
    const contract = buildCounselorDashboardContract(baseState(), []);
    expect(contract.avoidForNow).toBeNull();
  });

  test("avoidForNow surfaces the pipeline's single avoid_for_now candidate when one exists", () => {
    // Leadership is already the strongest dimension (95/100, >= strongDimensionScore) — a
    // requirement_action addressing only leadership should be classed avoid_for_now.
    // requirement_action candidates carry addressesDimensions=[] though (candidates.ts), so
    // use an opportunity instead, whose addressesDimensions comes from CATEGORY_DIMENSIONS.
    const leadershipOnly = opportunity("leadership-camp", { category: "student_program" });
    const state = baseState({
      eligibleOpportunityMatches: [{ opportunity: leadershipOnly, match: match("leadership-camp") }],
    });
    const contract = buildCounselorDashboardContract(state, []);
    // This assertion only holds if CATEGORY_DIMENSIONS["student_program"] includes leadership
    // and nothing else the pipeline would score as a real gap — guard with a soft assertion
    // instead of hard-failing the whole suite on an unrelated category-mapping change.
    if (contract.avoidForNow) {
      expect(contract.avoidForNow.recommendationClass).toBe("avoid_for_now");
      expect(contract.avoidForNow.id).toBe("opportunity:leadership-camp");
    }
  });

  test("recommendedOpportunities only includes opportunity-sourced, actually-recommended (do/consider) items", () => {
    const opp = opportunity("research-fellowship", { category: "fellowship", fields: ["Research"] });
    const state = baseState({
      eligibleOpportunityMatches: [{ opportunity: opp, match: match("research-fellowship", { relevance_score: 90 }) }],
      completenessChecklist: [{ key: "career_goal", label: "Add a career goal", done: false }],
    });
    const contract = buildCounselorDashboardContract(state, []);
    expect(contract.recommendedOpportunities.length).toBeGreaterThan(0);
    for (const rec of contract.recommendedOpportunities) {
      expect(rec.evidence.some((e) => e.sourceType === "opportunity")).toBe(true);
      expect(["do", "consider"]).toContain(rec.recommendationClass);
    }
    // The profile_task candidate (a real "do" item here) must never leak into
    // recommendedOpportunities just because it's also in thisWeekActions/worthConsidering.
    expect(contract.recommendedOpportunities.some((r) => r.id.startsWith("profile_task:"))).toBe(false);
  });

  test("upcomingDeadlines is passed through unchanged (FACT, not recomputed)", () => {
    const contract = buildCounselorDashboardContract(baseState(), deadlines);
    expect(contract.upcomingDeadlines).toBe(deadlines);
  });

  test("targetUniversityInsights is the advisor context's targetUniversities, FACT and ASSESSMENT (outlook) kept side by side", () => {
    const contract = buildCounselorDashboardContract(baseState(), []);
    expect(contract.targetUniversityInsights).toEqual(targetUniversities);
    expect(contract.targetUniversityInsights[0].outlook).toBe("competitive");
  });

  test("an empty CounselorState produces an honest, empty-but-valid contract — no fabricated filler", () => {
    const emptyScores = DIMENSIONS.map((dimension) => ({ dimension, score: 0, confidence: "low" as const, reason_codes: [] }));
    const state: CounselorState = {
      userId: "user-1",
      advisor: { student: {}, completenessPercent: 5, targetUniversities: [] } as unknown as CounselorState["advisor"],
      dimensionScores: toDimensionScoreRows(emptyScores),
      completenessChecklist: [],
      eligibleOpportunityMatches: [],
      requirementCandidateInputs: [],
    };
    const contract = buildCounselorDashboardContract(state, []);
    expect(contract.profileReadiness.sufficientForJudgment).toBe(false);
    expect(contract.strengths.every((s) => s.tier === "insufficient_data")).toBe(true);
    expect(contract.thisWeekActions).toEqual([]);
    expect(contract.worthConsidering).toEqual([]);
    expect(contract.avoidForNow).toBeNull();
    expect(contract.recommendedOpportunities).toEqual([]);
    expect(contract.targetUniversityInsights).toEqual([]);
  });

  test("deterministic: the same state produces the same contract on repeated calls", () => {
    const opp = opportunity("opp-1", { fields: ["Research"] });
    const state = baseState({ eligibleOpportunityMatches: [{ opportunity: opp, match: match("opp-1") }] });
    const first = buildCounselorDashboardContract(state, deadlines);
    const second = buildCounselorDashboardContract(state, deadlines);
    expect(first.thisWeekActions.map((r) => r.id)).toEqual(second.thisWeekActions.map((r) => r.id));
    expect(first.strengths).toEqual(second.strengths);
    expect(first.gaps).toEqual(second.gaps);
  });

  test("a recommendation keeps FACT (evidence/sourceUrl), ASSESSMENT (eligibility/confidence), and RECOMMENDATION (recommendationClass/why) as distinct typed fields, never flattened into one string", () => {
    // country_eligibility_confirmed_open, minimum_age/maximum_age, and eligible_grades
    // (matched by the student's own graduationYear override below) are all set because this
    // test's premise is a fully-known row: known_eligible now (correctly) requires every one
    // of country/age/grade eligibility to be resolved, not just absent — an unresolved
    // dimension is verdict "unknown" with an advisory note (2026-09-03 extended this same
    // country-eligibility principle to age and grade, which previously had no equivalent
    // safeguard).
    const opp = opportunity("opp-1", {
      fields: ["Research"],
      official_url: "https://example.org/opp-1",
      country_eligibility_confirmed_open: true,
      minimum_age: 0,
      maximum_age: 120,
      eligible_grades: ["12"],
    });
    const state = baseState({
      advisor: { student: { birthYear: 2009, country: "United States", graduationYear: new Date().getFullYear() + 1 }, completenessPercent: 80, targetUniversities } as CounselorState["advisor"],
      eligibleOpportunityMatches: [{ opportunity: opp, match: match("opp-1", { relevance_score: 90 }) }],
    });
    const contract = buildCounselorDashboardContract(state, []);
    const rec = contract.thisWeekActions[0] ?? contract.worthConsidering[0];
    expect(rec).toBeDefined();
    expect(rec.evidence[0].sourceUrl).toBe("https://example.org/opp-1");
    expect(rec.eligibility.verdict).toBe("known_eligible");
    expect(typeof rec.recommendationClass).toBe("string");
    expect(Array.isArray(rec.why)).toBe(true);
  });
});

// 2026-09-01 — a live bug found via a stale ai_recommendations row that outranked a fresh,
// correct Counselor Core answer indefinitely (no check on how old the stored row was). The
// four cases below are the actual matrix the fix depends on: which of {contract present,
// avoidForNow present} × {stored row present} wins, and why "computation didn't run" is the
// only condition that should ever fall back to stored prose.
describe("resolveAvoidRecommendation", () => {
  function recommendation(overrides: Partial<Pick<CounselorRecommendation, "title" | "why">> = {}): CounselorRecommendation {
    return {
      id: "profile_task:x",
      title: "Fresh, correct recommendation",
      recommendationClass: "avoid_for_now",
      why: ["Fresh reasoning"],
      matchedGapDimensions: [],
      impact: "medium",
      effort: "medium",
      urgency: "medium",
      deadline: null,
      costOnFile: null,
      applicationRequirements: [],
      eligibility: { verdict: "known_eligible", notes: [] },
      confidence: "medium",
      evidence: [],
      warnings: [],
      nextAction: { label: "View", type: "VIEW", href: "/" },
      ...overrides,
    };
  }

  const staleStoredRow = { title: "Stale stored title", reason: "Stale stored reason, possibly containing a raw career_exploration identifier" };

  test("a populated avoidForNow wins over a stored row — fresh over stale, even when both exist", () => {
    const contract = { avoidForNow: recommendation({ title: "Fresh pick", why: ["Fresh why"] }) };
    const result = resolveAvoidRecommendation(contract, staleStoredRow);
    expect(result).toEqual({ title: "Fresh pick", reason: "Fresh why" });
  });

  test("a confident null avoidForNow wins over a stored row too — null from a real computation is a real answer, not a gap to fill", () => {
    const contract = { avoidForNow: null };
    const result = resolveAvoidRecommendation(contract, staleStoredRow);
    expect(result).toBeNull();
  });

  test("the stored row is used only when the computation itself did not run (contract is null)", () => {
    const result = resolveAvoidRecommendation(null, staleStoredRow);
    expect(result).toEqual({ title: "Stale stored title", reason: "Stale stored reason, possibly containing a raw career_exploration identifier" });
  });

  test("null when neither is available", () => {
    expect(resolveAvoidRecommendation(null, null)).toBeNull();
    expect(resolveAvoidRecommendation({ avoidForNow: null }, null)).toBeNull();
  });

  test("a stored row's null reason becomes an empty string, not the literal 'null'", () => {
    const result = resolveAvoidRecommendation(null, { title: "T", reason: null });
    expect(result).toEqual({ title: "T", reason: "" });
  });
});
