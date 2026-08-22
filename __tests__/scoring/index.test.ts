import { describe, expect, test } from "vitest";
import { computeCareerProfile } from "@/lib/scoring/index";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Award, EvidenceStatus } from "@/types/database";

function award(overrides: Partial<Award>): Award {
  return {
    id: "aw1",
    user_id: "u1",
    title: "Some award",
    organization: null,
    organization_entity_id: null,
    level: "international",
    description: null,
    award_date: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(overrides: Partial<ScoringFacts> = {}): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
    ...overrides,
  };
}

/**
 * Package 4, docs/handoffs/feat1-territory-audit-2026-08-22.md Finding 1 / CEO's assigned
 * fix: `computeCareerProfile` must not let a `verification_rejected` claim contribute to a
 * dimension score — someone actively checked it and did not confirm it, so scoring it the
 * same as any other claim rewards making a disbelieved claim.
 */
describe("computeCareerProfile — verification_rejected is excluded from scoring", () => {
  test("a rejected international award scores identically to having no award at all", () => {
    const withRejectedAward = computeCareerProfile(facts({ awards: [award({ evidence_status: "verification_rejected" })] }));
    const withNoAward = computeCareerProfile(facts({ awards: [] }));

    const rejectedDim = withRejectedAward.dimensions.find((d) => d.dimension === "awards_distinction")!;
    const emptyDim = withNoAward.dimensions.find((d) => d.dimension === "awards_distinction")!;

    expect(rejectedDim.score).toBe(emptyDim.score);
    expect(rejectedDim.confidence).toBe(emptyDim.confidence);
    expect(rejectedDim.score).toBe(0);
  });

  test("self_reported and evidence_added awards still count — only verification_rejected is excluded", () => {
    const statuses: EvidenceStatus[] = ["self_reported", "evidence_added", "verified"];
    for (const evidence_status of statuses) {
      const result = computeCareerProfile(facts({ awards: [award({ evidence_status })] }));
      const dim = result.dimensions.find((d) => d.dimension === "awards_distinction")!;
      expect(dim.score).toBeGreaterThan(0);
    }
  });

  test("a mix of one rejected and one legitimate award scores only the legitimate one", () => {
    const mixed = computeCareerProfile(
      facts({
        awards: [award({ id: "rejected", level: "international", evidence_status: "verification_rejected" }), award({ id: "kept", level: "school", evidence_status: "verified" })],
      })
    );
    const onlyLegitimate = computeCareerProfile(facts({ awards: [award({ id: "kept", level: "school", evidence_status: "verified" })] }));

    const mixedDim = mixed.dimensions.find((d) => d.dimension === "awards_distinction")!;
    const soloDim = onlyLegitimate.dimensions.find((d) => d.dimension === "awards_distinction")!;
    expect(mixedDim.score).toBe(soloDim.score);
  });

  test("education records, courses, and test scores are untouched — they have no evidence_status to filter", () => {
    // Regression guard: excludeRejectedForScoring must not throw or drop fields it was never
    // meant to touch (these three ScoringFacts collections have no evidence_status column).
    expect(() => computeCareerProfile(facts())).not.toThrow();
  });
});
