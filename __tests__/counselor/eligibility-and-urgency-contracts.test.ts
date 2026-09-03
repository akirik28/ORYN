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
    // Verified by default, matching this fixture's own `verification_state: "verified_current"`
    // below — the two were inconsistent, which is exactly the live contradiction the freshness
    // gate catches (50 rows claim verified_current while last_verified_at is null). Left null,
    // every fixture here would sit in the gated shape and the country/citizenship/grade tests
    // would be asserting against an exclusion that has nothing to do with their subject. The
    // freshness regression block at the bottom overrides it back to null explicitly.
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
    // minimum_age/maximum_age/eligible_grades resolved (grade "11" matches this file's
    // baseState default graduationYear: 2028 as of today) so this test stays about the
    // citizenship axis alone — 2026-09-03's age/grade-unverified notes would otherwise be
    // noise here, same reasoning as this file's existing country_eligibility_confirmed_open
    // isolation pattern elsewhere.
    const opp = opportunity("us-citizens-only-3", {
      eligible_citizenships: ["United States"],
      minimum_age: 0,
      maximum_age: 120,
      eligible_grades: ["11"],
    });
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

  test("a VERIFIED opportunity with no deadline on file is untouched — absence of a date is not evidence of closure", () => {
    // Subject unchanged from the original #140 test; the fixture now carries the
    // `last_verified_at` it always implied. A missing deadline still never excludes on its
    // own — see the freshness suite below for the case where nothing at all is on file.
    const noDeadline = opportunity("no-deadline-on-file", {
      deadline: null,
      cycle_status: "open",
      country_eligibility_confirmed_open: true,
      last_verified_at: "2026-08-20T00:00:00Z",
      // Resolved so this test stays about the deadline dimension alone — grade "11" matches
      // this block's own stateWith default graduationYear: 2028.
      minimum_age: 0,
      maximum_age: 120,
      eligible_grades: ["11"],
    });
    const state = stateWith([noDeadline]);

    expect(evaluateCandidateEligibility(candidateFor(noDeadline, state), state, referenceDate).verdict).toBe("known_eligible");
  });
});

/**
 * Regression — an opportunity Oryn has never verified, with no deadline on file, must not be
 * presented as a high-confidence next action.
 *
 * The gap lib/opportunities/lifecycle.ts documents but cannot close with a date rule: an
 * opportunity can close quietly with no deadline ever recorded. Confirmed live, Stanford
 * Anesthesia Summer Institute — `status='active'`, `verification_state='verified_current'`,
 * `cycle_status='upcoming'`, `deadline` null, `last_verified_at` null — while its own page says
 * applications are closed. Measured 2026-08-23: 50 such opportunities across 301 eligible
 * (user, opportunity) pairs and all 7 users, ~18% of the active catalogue.
 *
 * Note the data contradiction driving it: these rows claim `verification_state =
 * 'verified_current'` (so the counselor's existing verification check at eligibility.ts passes)
 * while `last_verified_at` says no verification ever happened. The timestamp is the honest
 * discriminator; the enum is not.
 *
 * EXCLUDED rather than demoted here, because this is the ranked-recommendation path: a hard
 * top-3 whose whole claim is "these are your highest-value next actions", and whose output is
 * handed to lib/ai/weekly-plan.ts labelled to the model as verified, eligible candidates.
 * Measured, exclusion is safe: per-user candidate pools drop from 91–105 to 49–62, so no
 * student falls anywhere near the three-recommendation floor.
 */
describe("Regression — never-verified, deadline-less opportunities never reach counselor recommendations", () => {
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

  // The exact live row shape, including the verification_state/last_verified_at contradiction.
  const stanfordShape = {
    deadline: null,
    last_verified_at: null,
    status: "active" as const,
    verification_state: "verified_current" as const,
    cycle_status: "upcoming" as const,
    country_eligibility_confirmed_open: true,
  };

  test("the live shape is excluded, and the reason names verification -- not closure, not the student", () => {
    const unverified = opportunity("stanford-anesthesia", stanfordShape);
    const state = stateWith([unverified]);

    const result = evaluateCandidateEligibility(candidateFor(unverified, state), state, referenceDate);
    const note = result.notes.join(" ");

    expect(result.verdict).toBe("known_ineligible");
    expect(note).toMatch(/verif/i);
    // Must not fabricate a closure the source never stated...
    expect(note).not.toMatch(/closed|deadline has passed|no longer running/i);
    // ...and must not tell a 16-year-old they personally don't qualify.
    expect(note).not.toMatch(/not eligible|ineligible|don't qualify/i);
  });

  test("it never appears in rankCandidates output -- the list feeding the dashboard, advisor priorities and the weekly-plan prompt", () => {
    const unverified = opportunity("stanford-anesthesia", stanfordShape);
    const verified = opportunity("wharton-investment", {
      deadline: null,
      last_verified_at: "2026-08-20T00:00:00Z",
      cycle_status: "upcoming",
      country_eligibility_confirmed_open: true,
    });
    const state = stateWith([unverified, verified]);

    const ranked = rankCandidates(generateCandidateActions(state), [], state, referenceDate);
    const ids = ranked.flatMap((r) => (r.candidate.source.kind === "opportunity" ? [r.candidate.source.opportunityId] : []));

    expect(ids).not.toContain("stanford-anesthesia");
    expect(ids).toContain("wharton-investment");
  });

  test("a deadline on file rescues an unverified row -- the gate needs both absences, not either", () => {
    const hasDeadline = opportunity("has-a-deadline", {
      deadline: "2026-12-01",
      last_verified_at: null,
      cycle_status: "open",
      country_eligibility_confirmed_open: true,
      // Resolved so this test stays about the freshness-gate dimension alone.
      minimum_age: 0,
      maximum_age: 120,
      eligible_grades: ["11"],
    });
    const state = stateWith([hasDeadline]);

    expect(evaluateCandidateEligibility(candidateFor(hasDeadline, state), state, referenceDate).verdict).toBe("known_eligible");
  });

  test("an existing closed-cycle row is still explained by its cycle, not by verification -- #140/#141 wording is unregressed", () => {
    const closed = opportunity("closed-cycle", { cycle_status: "closed", deadline: null, last_verified_at: null });
    const state = stateWith([closed]);

    const result = evaluateCandidateEligibility(candidateFor(closed, state), state, referenceDate);
    expect(result.verdict).toBe("known_ineligible");
    expect(result.notes.join(" ")).toMatch(/current cycle is closed/i);
  });
});

/**
 * Regression (#143 follow-up) — the counselor must not exclude a row for pipeline lineage.
 *
 * The ranked top-3 is the highest-stakes surface: it feeds the dashboard's "this week" block,
 * the advisor's priorities and lib/ai/weekly-plan.ts. #143 excluded 51 opportunities from it on
 * the strength of `last_verified_at IS NULL` — which, measured live, records which pipeline
 * generation wrote the row and nothing about verification. All 51 are `verified_current`,
 * `source_confidence='high'`, and carry a `verified_at` from the preceding week.
 *
 * Exclusion (rather than Browse's demote-and-label) is retained for the case where it is
 * warranted: inside a three-slot list, demotion is indistinguishable from exclusion for ranks
 * 4+, and for ranks 1-3 it would still present an unevidenced row as a priority.
 */
describe("Regression — a legacy-generation opportunity reaches counselor recommendations", () => {
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

  // The real live shape of the 51: verified through the 0041-era column only.
  const legacyGeneration = {
    deadline: null,
    last_verified_at: null,
    verified_at: "2026-08-18T00:00:00Z",
    status: "active" as const,
    verification_state: "verified_current" as const,
    cycle_status: "upcoming" as const,
    country_eligibility_confirmed_open: true,
    // Resolved so both tests below stay about this block's own subject (a legacy row's
    // verification columns), not the unrelated 2026-09-03 age/grade-unverified notes.
    minimum_age: 0,
    maximum_age: 120,
    eligible_grades: ["11"],
  };

  test("it is eligible -- not excluded because an older column happens to be empty", () => {
    const legacy = opportunity("ja-company-programme", legacyGeneration);
    const state = stateWith([legacy]);

    expect(evaluateCandidateEligibility(candidateFor(legacy, state), state, referenceDate).verdict).toBe("known_eligible");
  });

  test("it appears in rankCandidates output -- the 51 are back in the recommendable pool", () => {
    const legacy = opportunity("ja-company-programme", legacyGeneration);
    const state = stateWith([legacy]);

    const ranked = rankCandidates(generateCandidateActions(state), [], state, referenceDate);
    const ids = ranked.flatMap((r) => (r.candidate.source.kind === "opportunity" ? [r.candidate.source.opportunityId] : []));

    expect(ids).toContain("ja-company-programme");
  });

  test("a rescued row is still excluded by a closed cycle or a passed deadline -- #140/#141 intact", () => {
    const closed = opportunity("legacy-but-closed", { ...legacyGeneration, cycle_status: "closed" });
    const closedState = stateWith([closed]);
    const closedResult = evaluateCandidateEligibility(candidateFor(closed, closedState), closedState, referenceDate);
    expect(closedResult.verdict).toBe("known_ineligible");
    expect(closedResult.notes.join(" ")).toMatch(/current cycle is closed/i);

    const expired = opportunity("legacy-but-expired", { ...legacyGeneration, cycle_status: "open", deadline: "2026-01-01" });
    const expiredState = stateWith([expired]);
    const expiredResult = evaluateCandidateEligibility(candidateFor(expired, expiredState), expiredState, referenceDate);
    expect(expiredResult.verdict).toBe("known_ineligible");
    expect(expiredResult.notes.join(" ")).toMatch(/deadline has passed/i);
  });

  test("a row with no verification evidence at all is still excluded, still worded truthfully", () => {
    // The preserved half of #143 at the chokepoint where exclusion is warranted.
    const noEvidence = opportunity("no-evidence-at-all", { ...legacyGeneration, verified_at: null });
    const state = stateWith([noEvidence]);

    const result = evaluateCandidateEligibility(candidateFor(noEvidence, state), state, referenceDate);
    const note = result.notes.join(" ");

    expect(result.verdict).toBe("known_ineligible");
    expect(note).toMatch(/verif/i);
    expect(note).not.toMatch(/closed|deadline has passed|no longer running/i);
    expect(note).not.toMatch(/not eligible|ineligible|don't qualify/i);
  });
});
