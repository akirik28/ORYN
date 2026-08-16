import { describe, expect, test } from "vitest";
import { scoreEntrepreneurship } from "@/lib/scoring/dimensions/entrepreneurship";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Project } from "@/types/database";

function project(overrides: Partial<Project>): Project {
  return {
    id: "p1",
    user_id: "u1",
    title: "Side project",
    organization: null,
    organization_id: null,
    description: null,
    role: "Contributor",
    start_date: "2024-09-01",
    end_date: "2025-06-01",
    ongoing: false,
    hours_per_week: null,
    outcome_summary: null,
    users_reached: null,
    revenue_amount: null,
    repo_url: null,
    live_url: null,
    location: null,
    source: "manual",
    story_notes: null,
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(projects: Project[]): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities: [],
    awards: [],
    certifications: [],
    projects,
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
    referenceDate: new Date("2025-06-01"),
  };
}

describe("scoreEntrepreneurship", () => {
  test("scores 0 with low confidence when no project involves founding or revenue", () => {
    const result = scoreEntrepreneurship(facts([project({ role: "Contributor" })]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("a founder role generating real revenue scores solidly", () => {
    const result = scoreEntrepreneurship(
      facts([project({ role: "Founder", revenue_amount: 4200, users_reached: 300 })])
    );
    expect(result.score).toBeGreaterThanOrEqual(25);
  });
});
