import { describe, expect, test } from "vitest";
import { scoreLeadership } from "@/lib/scoring/dimensions/leadership";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Activity } from "@/types/database";

function activity(overrides: Partial<Activity>): Activity {
  return {
    id: "a1",
    user_id: "u1",
    title: "Member",
    organization: "Some Club",
    organization_id: null,
    category: "club",
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
    story_notes: null,
    source: "manual",
    evidence_status: "self_reported",
    created_at: "",
    updated_at: "",
    ...overrides,
  };
}

function facts(activities: Activity[]): ScoringFacts {
  return {
    educationRecords: [],
    courses: [],
    testScores: [],
    activities,
    awards: [],
    certifications: [],
    projects: [],
    researchExperiences: [],
    volunteeringExperiences: [],
    workExperiences: [],
    referenceDate: new Date("2025-06-01"),
  };
}

describe("scoreLeadership", () => {
  test("scores 0 with low confidence when there are no leadership roles", () => {
    const result = scoreLeadership(facts([activity({ is_leadership_role: false })]));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("a title alone — no measurable scope, people led, or duration — stays a low score", () => {
    // Directly encodes the spec's own example: typing "President" should not produce an
    // extremely high leadership score on its own.
    const result = scoreLeadership(
      facts([
        activity({
          title: "President",
          is_leadership_role: true,
          start_date: "2025-04-01",
          end_date: "2025-06-01",
        }),
      ])
    );
    expect(result.score).toBeLessThan(30);
  });

  test("real responsibility — people led, organizational scope, sustained duration — scores meaningfully higher", () => {
    const titleOnly = scoreLeadership(
      facts([activity({ title: "President", is_leadership_role: true, start_date: "2025-04-01", end_date: "2025-06-01" })])
    );
    const realResponsibility = scoreLeadership(
      facts([
        activity({
          title: "Regional Director",
          is_leadership_role: true,
          people_led: 40,
          organization_scope: "5 regional chapters",
          start_date: "2024-08-01",
          end_date: "2025-06-01",
        }),
      ])
    );
    expect(realResponsibility.score).toBeGreaterThan(titleOnly.score + 20);
  });
});
