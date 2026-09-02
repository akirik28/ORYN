import { describe, expect, test } from "vitest";
import { buildReasonCodes } from "@/lib/opportunities/persist-matches";
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

  // Pre-existing behavior, unchanged by this package: eligibility and relevance are
  // computed independently, so an ineligible match whose interests genuinely overlap still
  // carries matches_your_interests alongside ineligible. Neither sentence-builder renders
  // anything for the "ineligible" code itself (that's a separate badge), so in practice this
  // means an ineligible opportunity can still show "it matches your interests" reason text —
  // arguably worth its own look, but out of scope for the empty-reason-array fix this
  // package addresses.
  test("ineligible does not suppress a genuinely overlapping relevance code", () => {
    const opp = opportunity({ minimumAge: 18, fields: ["Economics"] });
    const s = student({ age: 14, interests: ["Economics"] });
    const codes = buildReasonCodes(computeOpportunityMatch(s, opp), s, opp);
    expect(codes).toContain("ineligible");
    expect(codes).toContain("matches_your_interests");
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
});
