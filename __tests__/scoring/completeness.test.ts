import { describe, expect, test } from "vitest";
import { computeCompleteness } from "@/lib/scoring/completeness";
import type { CompletenessFacts } from "@/lib/scoring/completeness";

function emptyFacts(): CompletenessFacts {
  return {
    profile: { country: null, school_name: null, graduation_year: null, curriculum: null },
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
    interests: [],
    goals: [],
    targetUniversities: [],
  };
}

describe("computeCompleteness", () => {
  test("is 0 for a completely empty profile", () => {
    expect(computeCompleteness(emptyFacts())).toBe(0);
  });

  test("is different from (not derived from) profile strength — it only measures how much Oryn knows, not how strong it is", () => {
    // A single, very strong leadership activity fills in almost none of the checklist.
    const facts = emptyFacts();
    facts.activities = [
      {
        id: "a1",
        user_id: "u1",
        title: "Founder & President",
        organization: "Model UN",
        category: "club",
        description: null,
        is_leadership_role: true,
        people_led: 50,
        organization_scope: "National",
        start_date: "2023-01-01",
        end_date: null,
        ongoing: true,
        hours_per_week: 6,
        weeks_per_year: 30,
        location: null,
        source: "manual",
        evidence_status: "self_reported",
        created_at: "",
        updated_at: "",
      },
    ];
    const result = computeCompleteness(facts);
    expect(result).toBeGreaterThan(0);
    expect(result).toBeLessThan(50);
  });

  test("is 100 when every checklist section has at least one entry", () => {
    const facts = emptyFacts();
    facts.profile = { country: "US", school_name: "Lincoln High", graduation_year: 2027, curriculum: "ap" };
    facts.educationRecords = [{ id: "e1" } as never];
    facts.courses = [{ id: "c1" } as never];
    facts.activities = [{ id: "a1" } as never, { id: "a2" } as never, { id: "a3" } as never];
    facts.awards = [{ id: "aw1" } as never];
    facts.projects = [{ id: "p1" } as never];
    facts.researchExperiences = [{ id: "r1" } as never];
    facts.goals = [{ id: "g1" } as never];
    facts.interests = [{ id: "i1" } as never];
    facts.targetUniversities = [{ id: "tu1" } as never];
    expect(computeCompleteness(facts)).toBe(100);
  });
});
