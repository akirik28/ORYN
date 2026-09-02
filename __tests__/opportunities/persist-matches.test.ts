import { describe, expect, test } from "vitest";
import { buildReasonCodes, resolveMatchConfidence } from "@/lib/opportunities/persist-matches";
import { computeOpportunityMatch } from "@/lib/opportunities/matching";
import type { OpportunityForMatching, StudentMatchProfile } from "@/lib/opportunities/matching";

/**
 * buildReasonCodes is exercised through computeOpportunityMatch (its first argument) rather
 * than a hand-built OpportunityMatchResult, so these tests can't drift out of sync with what
 * the real scorer actually produces the way a hand-built fixture could.
 *
 * Written 2026-09-02 after finding 724 of 1,931 live opportunity_matches rows had an empty
 * reason_codes array — see this function's own comment in persist-matches.ts for the full
 * breakdown by cause. These tests pin the fix: every eligible match with real data on both
 * sides gets *something*, except the one case (no_overlap) that's deliberately left honest
 * rather than papered over.
 */
function opportunity(overrides: Partial<OpportunityForMatching> = {}): OpportunityForMatching {
  return {
    category: "research",
    minimumAge: null,
    maximumAge: null,
    eligibleCountries: [],
    fields: [],
    country: null,
    ...overrides,
  };
}

function student(overrides: Partial<StudentMatchProfile> = {}): StudentMatchProfile {
  return {
    age: 16,
    country: "United States",
    interests: [],
    weakestDimensions: [],
    ...overrides,
  };
}

describe("buildReasonCodes", () => {
  test("an ineligible student with no other signal gets only the ineligible code", () => {
    const opp = opportunity({ minimumAge: 18, fields: [] });
    const s = student({ age: 14, interests: [] });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toEqual(["ineligible"]);
  });

  // FIXED 2026-09-02 (was a documented-but-unfixed finding in this file until now): storing
  // "ineligible" alongside a positive code like matches_your_interests let reason_codes claim
  // two contradictory things about the same opportunity. Confirmed neither current render
  // site (opportunity-card.tsx's canClaimMatch, [id]/page.tsx's canGiveTake) actually shows
  // this combination to a student -- both already gate the positive text behind eligibility
  // -- but the stored data shouldn't rely on every future reader rediscovering that gate.
  // relevanceScore is 100 here (a full match) specifically to prove the short-circuit wins
  // even against the strongest possible positive signal, not just a marginal one.
  test("a confirmed-ineligible match never carries a positive code, even with a perfect relevance score", () => {
    const opp = opportunity({ minimumAge: 18, fields: ["Economics"] });
    const s = student({ age: 14, interests: ["Economics"] });
    const match = computeOpportunityMatch(s, opp);
    expect(match.relevanceScore).toBe(100);
    const codes = buildReasonCodes(match, s, opp);
    expect(codes).toEqual(["ineligible"]);
  });

  // Eligibility "unknown" (a restriction Oryn can't confirm either way) is never the same
  // state as a confirmed exclusion -- computeEligibility keeps `eligible: true` for it, so
  // the short-circuit above must not fire and a genuine positive reason still comes through.
  test("eligibility-unknown (still eligible: true) does not trigger the ineligible short-circuit", () => {
    const opp = opportunity({ eligibleCountries: ["United States"], fields: ["Economics"] });
    const s = student({ country: null, interests: ["Economics"] });
    const match = computeOpportunityMatch(s, opp);
    expect(match.eligible).toBe(true);
    const codes = buildReasonCodes(match, s, opp);
    expect(codes).toContain("matches_your_interests");
    expect(codes).not.toContain("ineligible");
  });

  test("a strong interest match still gets matches_your_interests, not the weaker shares_your_interest", () => {
    const opp = opportunity({ fields: ["Economics"] });
    const s = student({ interests: ["Economics"] });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toContain("matches_your_interests");
    expect(codes).not.toContain("shares_your_interest");
  });

  test("a genuine but partial interest overlap gets shares_your_interest", () => {
    const opp = opportunity({ fields: ["Economics"] });
    const s = student({ interests: ["Economics", "Chemistry", "Physics", "Biology", "History"] });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toContain("shares_your_interest");
    expect(codes).not.toContain("matches_your_interests");
  });

  test("an opportunity with no recorded fields gets limited_opportunity_information, not silence", () => {
    const opp = opportunity({ fields: [], category: "volunteering" });
    const s = student({ interests: ["Economics"], weakestDimensions: ["leadership"], country: "Canada" });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toEqual(["limited_opportunity_information"]);
  });

  test("a student with no recorded interests gets limited_profile_information, not silence", () => {
    const opp = opportunity({ fields: ["Economics"], category: "volunteering", country: "France" });
    const s = student({ interests: [], weakestDimensions: ["leadership"], country: "Canada" });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toEqual(["limited_profile_information"]);
  });

  test("real data on both sides with zero overlap, no gap match, and no proximity stays honestly empty", () => {
    const opp = opportunity({ fields: ["Chemistry"], category: "volunteering", country: "France" });
    const s = student({ interests: ["Economics"], weakestDimensions: ["leadership"], country: "Canada" });
    const match = computeOpportunityMatch(s, opp);
    expect(match.relevanceBasis).toBe("no_overlap");
    expect(buildReasonCodes(match, s, opp)).toEqual([]);
  });

  test("the two limited_*_information codes never fire when a real reason already applies", () => {
    // No fields on the opportunity (would otherwise trigger limited_opportunity_information),
    // but it's near the student -- near_you is real and should win, not get crowded out.
    const opp = opportunity({ fields: [], country: "United States" });
    const s = student({ country: "United States" });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toContain("near_you");
    expect(codes).not.toContain("limited_opportunity_information");
  });

  test("the two limited_*_information codes never fire for an ineligible match", () => {
    const opp = opportunity({ minimumAge: 18, fields: [] });
    const s = student({ age: 14 });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toEqual(["ineligible"]);
  });

  test("similar_to_dismissed appears alongside a positive code, not instead of it", () => {
    const opp = opportunity({ fields: ["Economics"], cost: 200 });
    const s = student({
      interests: ["Economics"],
      dismissedSignals: { avoidFields: [], avoidCostFloor: 200, avoidsDistantInPerson: false },
    });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toContain("matches_your_interests");
    expect(codes).toContain("similar_to_dismissed");
  });

  test("similar_to_dismissed never fires when the student has no dismissedSignals", () => {
    const opp = opportunity({ fields: ["Economics"], cost: 200 });
    const s = student({ interests: ["Economics"] });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).not.toContain("similar_to_dismissed");
  });
});

describe("resolveMatchConfidence", () => {
  test("null when the match targets no gap dimension -- nothing to qualify", () => {
    expect(resolveMatchConfidence([], new Map([["research", "strong"]]))).toBeNull();
  });

  test("returns the targeted dimension's own EvidenceState", () => {
    const byDimension = new Map([["research", "emerging"], ["leadership", "strong"]] as const);
    expect(resolveMatchConfidence(["research"], byDimension)).toBe("emerging");
  });

  test("a dimension missing from the lookup defaults to not_assessed, not a crash", () => {
    expect(resolveMatchConfidence(["research"], new Map())).toBe("not_assessed");
  });

  test("multiple matched dimensions: the more cautious (lower-ranked) state wins", () => {
    const byDimension = new Map([["research", "strong"], ["leadership", "limited_evidence"]] as const);
    // Order shouldn't matter -- try both.
    expect(resolveMatchConfidence(["research", "leadership"], byDimension)).toBe("limited_evidence");
    expect(resolveMatchConfidence(["leadership", "research"], byDimension)).toBe("limited_evidence");
  });

  test("a single not_assessed dimension is reported as such, not silently upgraded", () => {
    expect(resolveMatchConfidence(["research"], new Map([["research", "not_assessed"]] as const))).toBe("not_assessed");
  });
});
