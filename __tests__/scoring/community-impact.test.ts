import { describe, expect, test } from "vitest";
import { scoreCommunityImpact } from "@/lib/scoring/dimensions/community-impact";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { VolunteeringExperience } from "@/types/database";

function volunteering(overrides: Partial<VolunteeringExperience>): VolunteeringExperience {
  return {
    id: "v1",
    user_id: "u1",
    title: "Volunteer",
    organization: "Local shelter",
    description: null,
    cause_area: null,
    start_date: "2025-05-01",
    end_date: "2025-06-01",
    ongoing: false,
    hours_per_week: null,
    weeks_per_year: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(volunteeringExperiences: VolunteeringExperience[]): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences,
    workExperiences: [],
    referenceDate: new Date("2025-06-01"),
  };
}

describe("scoreCommunityImpact", () => {
  test("scores 0 with low confidence when there is no volunteering", () => {
    const result = scoreCommunityImpact(facts([]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("sustained, weekly involvement with a defined cause area scores higher than a one-off entry", () => {
    const oneOff = scoreCommunityImpact(facts([volunteering({})]));
    const sustained = scoreCommunityImpact(
      facts([
        volunteering({
          cause_area: "Youth literacy",
          hours_per_week: 5,
          start_date: "2024-08-01",
          end_date: "2025-06-01",
        }),
      ])
    );
    expect(sustained.score).toBeGreaterThan(oneOff.score);
  });
});
