import { describe, expect, test } from "vitest";
import { scoreAwardsDistinction } from "@/lib/scoring/dimensions/awards";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Award } from "@/types/database";

function award(overrides: Partial<Award>): Award {
  return {
    id: "aw1",
    user_id: "u1",
    title: "Some award",
    organization: null,
    level: null,
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

function facts(awards: Award[]): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards,
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
  };
}

describe("scoreAwardsDistinction", () => {
  test("scores 0 with low confidence when there are no awards", () => {
    const result = scoreAwardsDistinction(facts([]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("an international-level award scores higher than a school-level award", () => {
    const schoolLevel = scoreAwardsDistinction(facts([award({ level: "School" })]));
    const internationalLevel = scoreAwardsDistinction(facts([award({ level: "International" })]));
    expect(internationalLevel.score).toBeGreaterThan(schoolLevel.score);
  });
});
