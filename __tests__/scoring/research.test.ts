import { describe, expect, test } from "vitest";
import { scoreResearch } from "@/lib/scoring/dimensions/research";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { ResearchExperience } from "@/types/database";

function researchExperience(overrides: Partial<ResearchExperience>): ResearchExperience {
  return {
    id: "r1",
    user_id: "u1",
    title: "Untitled research",
    organization: null,
    organization_entity_id: null,
    mentor_name: null,
    field: null,
    description: null,
    methodology: null,
    independence_level: null,
    output_type: "none",
    output_url: null,
    start_date: "2024-09-01",
    end_date: "2025-06-01",
    ongoing: false,
    hours_per_week: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(researchExperiences: ResearchExperience[]): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences,
    volunteeringExperiences: [],
    workExperiences: [],
    referenceDate: new Date("2025-06-01"),
  };
}

describe("scoreResearch", () => {
  test("scores 0 with low confidence when there is no research experience", () => {
    const result = scoreResearch(facts([]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("a well-documented independent project scores solidly with no publication at all", () => {
    const result = scoreResearch(
      facts([
        researchExperience({
          methodology: "Regression analysis of OECD panel data on youth unemployment.",
          mentor_name: "Dr. Yılmaz",
          independence_level: "Led data collection and analysis independently",
          output_type: "none",
        }),
      ])
    );
    expect(result.score).toBeGreaterThanOrEqual(25);
  });
});
