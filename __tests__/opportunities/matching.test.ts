import { describe, expect, test } from "vitest";
import { computeEligibility, computeOpportunityMatch } from "@/lib/opportunities/matching";
import type { OpportunityForMatching, StudentMatchProfile } from "@/lib/opportunities/matching";

function opportunity(overrides: Partial<OpportunityForMatching> = {}): OpportunityForMatching {
  return {
    category: "research",
    minimumAge: null,
    maximumAge: null,
    eligibleCountries: [],
    fields: [],
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

describe("computeEligibility", () => {
  test("is eligible when there are no restrictions", () => {
    expect(computeEligibility(student(), opportunity()).eligible).toBe(true);
  });

  test("is ineligible when the student is younger than the minimum age", () => {
    const result = computeEligibility(student({ age: 14 }), opportunity({ minimumAge: 16 }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/minimum age/i);
  });

  test("is ineligible when the student is older than the maximum age", () => {
    const result = computeEligibility(student({ age: 19 }), opportunity({ maximumAge: 18 }));
    expect(result.eligible).toBe(false);
  });

  test("is ineligible when the opportunity has a country allow-list that excludes the student", () => {
    const result = computeEligibility(student({ country: "Turkey" }), opportunity({ eligibleCountries: ["United States", "Canada"] }));
    expect(result.eligible).toBe(false);
    expect(result.notes).toMatch(/Turkey/);
  });

  test("is eligible when the student's country is on the allow-list", () => {
    const result = computeEligibility(student({ country: "Canada" }), opportunity({ eligibleCountries: ["United States", "Canada"] }));
    expect(result.eligible).toBe(true);
  });

  test("does not evaluate country eligibility when the student's country is unknown", () => {
    const result = computeEligibility(student({ country: null }), opportunity({ eligibleCountries: ["United States"] }));
    expect(result.eligible).toBe(true);
  });
});

describe("computeOpportunityMatch", () => {
  test("scores 0 for an ineligible student regardless of relevance", () => {
    const match = computeOpportunityMatch(
      student({ age: 12, interests: ["Economics"] }),
      opportunity({ minimumAge: 16, fields: ["Economics"] })
    );
    expect(match.eligible).toBe(false);
    expect(match.matchScore).toBe(0);
  });

  test("scores higher when the opportunity targets the student's weakest dimension", () => {
    const weakInResearch = computeOpportunityMatch(
      student({ weakestDimensions: ["research"] }),
      opportunity({ category: "research" })
    );
    const strongInResearch = computeOpportunityMatch(
      student({ weakestDimensions: ["leadership"] }),
      opportunity({ category: "research" })
    );
    expect(weakInResearch.profileNeedScore).toBeGreaterThan(strongInResearch.profileNeedScore);
    expect(weakInResearch.matchScore).toBeGreaterThan(strongInResearch.matchScore);
  });

  test("scores higher when the student's interests overlap the opportunity's fields", () => {
    const overlapping = computeOpportunityMatch(student({ interests: ["Economics"] }), opportunity({ fields: ["Economics", "Public Policy"] }));
    const unrelated = computeOpportunityMatch(student({ interests: ["Chemistry"] }), opportunity({ fields: ["Economics", "Public Policy"] }));
    expect(overlapping.relevanceScore).toBeGreaterThan(unrelated.relevanceScore);
  });
});
