import { describe, expect, test } from "vitest";
import { scoreExecution } from "@/lib/scoring/dimensions/execution";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Project } from "@/types/database";

function project(overrides: Partial<Project>): Project {
  return {
    id: "p1",
    user_id: "u1",
    title: "Untitled project",
    organization: null,
    description: "An idea I had",
    role: null,
    start_date: "2025-01-01",
    end_date: "2025-02-01",
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

describe("scoreExecution", () => {
  test("scores 0 with low confidence when there are no projects", () => {
    const result = scoreExecution(facts([]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("an idea with no shipped artifact, users, or measurable outcome scores far lower than an executed, adopted project", () => {
    const ideaOnly = scoreExecution(facts([project({})]));
    const shipped = scoreExecution(
      facts([
        project({
          outcome_summary: "Reduced onboarding time for 200 volunteers from 3 days to same-day.",
          users_reached: 200,
          repo_url: "https://github.com/example/project",
          start_date: "2024-09-01",
          end_date: "2025-06-01",
        }),
      ])
    );
    expect(shipped.score).toBeGreaterThan(ideaOnly.score * 3);
  });
});
