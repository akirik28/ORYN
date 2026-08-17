import { describe, expect, test } from "vitest";
import { scoreCareerExploration } from "@/lib/scoring/dimensions/career-exploration";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Activity, WorkExperience } from "@/types/database";

function activity(category: Activity["category"], id: string): Activity {
  return {
    id,
    user_id: "u1",
    title: "Activity",
    organization: null,
    organization_entity_id: null,
    category,
    description: null,
    is_leadership_role: false,
    people_led: null,
    organization_scope: null,
    opportunity_id: null,
    start_date: null,
    end_date: null,
    ongoing: false,
    hours_per_week: null,
    weeks_per_year: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
  };
}

function internship(): WorkExperience {
  return {
    id: "w1",
    user_id: "u1",
    title: "Intern",
    organization: "Acme Corp",
    organization_entity_id: null,
    employment_type: "internship",
    description: null,
    start_date: "2025-06-01",
    end_date: "2025-08-01",
    ongoing: false,
    hours_per_week: null,
    paid: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
  };
}

function facts(overrides: Partial<ScoringFacts>): ScoringFacts {
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

describe("scoreCareerExploration", () => {
  test("scores 0 with low confidence with no activities or work experience", () => {
    const result = scoreCareerExploration(facts({}));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("exploring several distinct activity categories plus an internship scores higher than one category alone", () => {
    const narrow = scoreCareerExploration(facts({ activities: [activity("club", "a1")] }));
    const broad = scoreCareerExploration(
      facts({
        activities: [
          activity("club", "a1"),
          activity("sports", "a2"),
          activity("student_government", "a3"),
          activity("competition_team", "a4"),
        ],
        workExperiences: [internship()],
      })
    );
    expect(broad.score).toBeGreaterThan(narrow.score);
  });
});
