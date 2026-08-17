import { describe, expect, test } from "vitest";
import { scoreIntellectualCuriosity } from "@/lib/scoring/dimensions/intellectual-curiosity";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Course } from "@/types/database";

function course(subject: string, id: string): Course {
  return {
    id,
    user_id: "u1",
    education_record_id: null,
    course_name: subject,
    subject,
    level: "regular",
    academic_year: null,
    grade_value: null,
    grade_scale: null,
    credit_hours: null,
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

describe("scoreIntellectualCuriosity", () => {
  test("scores 0 with low confidence with no course, certification, or research variety", () => {
    const result = scoreIntellectualCuriosity(facts({}));
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("breadth across subjects plus self-directed certifications scores higher than a single subject", () => {
    const narrow = scoreIntellectualCuriosity(facts({ courses: [course("Math", "c1")] }));
    const broad = scoreIntellectualCuriosity(
      facts({
        courses: [course("Math", "c1"), course("Economics", "c2"), course("Biology", "c3")],
        certifications: [
          {
            id: "cert1",
            user_id: "u1",
            title: "Data Analysis",
            organization: null,
            organization_entity_id: null,
            description: null,
            issue_date: null,
            expiry_date: null,
            credential_url: null,
            source: "manual",
            evidence_status: "self_reported",
            created_at: "",
            updated_at: "",
          },
        ],
      })
    );
    expect(broad.score).toBeGreaterThan(narrow.score);
  });
});
