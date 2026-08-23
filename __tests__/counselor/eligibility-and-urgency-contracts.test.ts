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

/**
 * Test K originally asserted that a past deadline scores the same *urgency* as no deadline
 * (zero) while still appearing in rankCandidates output. That weaker guarantee was exactly the
 * bug: zeroed urgency is not exclusion, so an expired row still scored on its other axes and
 * occupied a recommendation slot. The counselor now excludes it outright (see the regression
 * block at the end of this file), which strictly supersedes the old assertion — so K keeps its
 * subject (a stale deadline must never look actionable) and asserts the stronger contract.
 */
describe("Test K (spec Part R) — a past deadline excludes an opportunity outright, not just its urgency", () => {
  test("a past-deadline opportunity is dropped from ranked output, while a no-deadline one survives with zero urgency", () => {
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

    const pastRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "stale-deadline");
    const noneRanked = ranked.find((r) => r.candidate.source.kind === "opportunity" && r.candidate.source.opportunityId === "no-deadline")!;

    expect(pastRanked).toBeUndefined();

    // The still-valid half of the original contract: a *missing* deadline is not a passed one.
    // It contributes no urgency, but must never be excluded — absence of a published date is
    // not evidence the cycle has closed.
    expect(noneRanked.urgency).toBe("low");
    expect(noneRanked.scoreBreakdown.urgency).toBe(0);
  });
});

/**
 * Regression — a past application deadline must exclude an opportunity from the counselor's
 * recommendations, not merely zero its urgency.
 *
 * Verified live (2026-08-23): GENIUS Olympiad (27274e04-50f4-4e82-9b7e-c5dbaace4bbe) sat at
 * `deadline = 2026-03-07`, `status = 'active'`, `verification_state = 'verified_current'`,
 * `cycle_status = 'date_not_announced'`, with four `eligible = true` opportunity_matches rows
 * covering every user — and rendered in the dashboard's "this week" block and the advisor's
 * priorities with a "Past due" badge. `date_not_announced` is correctly NOT in
 * NON_ACTIONABLE_OPPORTUNITY_CYCLE_STATUSES, so the counselor's cycle-status-only guard was
 * the only check standing and it passed.
 *
 * The read-time deadline rule already existed in lib/opportunities/lifecycle.ts
 * (isOpportunityActionable); the counselor path simply never applied it. Test K below covers
 * the urgency half — zeroed urgency was never exclusion, which is exactly how an expired row
 * still occupied a recommendation slot.
 */
describe("Regression — expired opportunities never reach counselor recommendations", () => {
  const referenceDate = new Date("2026-08-23T00:00:00Z");

  function stateWith(opps: Opportunity[]): CounselorState {
    return {
      userId: "user-1",
      advisor: {
        student: { birthYear: 2009, country: "Turkey", citizenshipCountries: [], graduationYear: 2028 },
        completenessPercent: 80,
      } as unknown as CounselorState["advisor"],
      dimensionScores: toDimensionScoreRows(DIMENSIONS.map((d) => ({ dimension: d, score: 60, confidence: "high" as const, reason_codes: [] }))),
      completenessChecklist: [],
      eligibleOpportunityMatches: opps.map((o) => ({ opportunity: o, match: match(o.id) })),
      requirementCandidateInputs: [],
    };
  }

  const geniusOlympiadShape = {
    deadline: "2026-03-07",
    status: "active" as const,
    verification_state: "verified_current" as const,
    cycle_status: "date_not_announced" as const,
  };

  test("the exact live shape is classified known_ineligible, with the passed deadline named as the reason", () => {
    const expired = opportunity("genius-olympiad", geniusOlympiadShape);
    const state = stateWith([expired]);

    const result = evaluateCandidateEligibility(candidateFor(expired, state), state, referenceDate);

    expect(result.verdict).toBe("known_ineligible");
    expect(result.notes.join(" ")).toMatch(/deadline/i);
  });

  test("it never appears in rankCandidates output — the single list feeding the dashboard, advisor priorities and the weekly-plan prompt", () => {
    const expired = opportunity("genius-olympiad", geniusOlympiadShape);
    const live = opportunity("still-open", { deadline: "2026-12-01", cycle_status: "open" });
    const state = stateWith([expired, live]);

    const ranked = rankCandidates(generateCandidateActions(state), [], state, referenceDate);
    const ids = ranked.flatMap((r) => (r.candidate.source.kind === "opportunity" ? [r.candidate.source.opportunityId] : []));

    expect(ids).not.toContain("genius-olympiad");
    expect(ids).toContain("still-open");
  });

  test("matches lifecycle.ts's boundary exactly: a deadline that falls today is still actionable, the day after is not", () => {
    const closingToday = opportunity("closes-today", { deadline: "2026-08-23", cycle_status: "open" });
    const stateToday = stateWith([closingToday]);
    expect(evaluateCandidateEligibility(candidateFor(closingToday, stateToday), stateToday, referenceDate).verdict).not.toBe("known_ineligible");

    const dayAfter = new Date("2026-08-24T00:00:00Z");
    expect(evaluateCandidateEligibility(candidateFor(closingToday, stateToday), stateToday, dayAfter).verdict).toBe("known_ineligible");
  });

  test("an opportunity with no deadline on file is untouched — absence of a date is not evidence of closure", () => {
    const noDeadline = opportunity("no-deadline-on-file", { deadline: null, cycle_status: "open", country_eligibility_confirmed_open: true });
    const state = stateWith([noDeadline]);

    expect(evaluateCandidateEligibility(candidateFor(noDeadline, state), state, referenceDate).verdict).toBe("known_eligible");
  });
});
