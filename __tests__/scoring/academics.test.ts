import { describe, expect, test } from "vitest";
import { scoreAcademics } from "@/lib/scoring/dimensions/academics";
import type { ScoringFacts } from "@/lib/scoring/types";

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

describe("scoreAcademics", () => {
  test("scores 0 with low confidence when there is no academic data at all", () => {
    const result = scoreAcademics(facts());
    expect(result.score).toBe(0);
    expect(result.confidence).toBe("low");
  });

  test("rewards a strong GPA, course rigor, and test presence with a high score and high confidence", () => {
    const result = scoreAcademics(
      facts({
        educationRecords: [
          {
            id: "1",
            user_id: "u1",
            school_name: "Lincoln High",
            school_entity_id: null,
            country: "US",
            stage: "high_school",
            curriculum: "ap",
            start_date: "2023-09-01",
            end_date: null,
            is_current: true,
            overall_gpa: 3.9,
            gpa_scale: 4.0,
            notes: null,
            created_at: "",
            updated_at: "",
          },
        ],
        courses: Array.from({ length: 5 }, (_, i) => ({
          id: `c${i}`,
          user_id: "u1",
          education_record_id: "1",
          course_name: `AP Course ${i}`,
          subject: "STEM",
          level: "ap" as const,
          academic_year: "2024",
          grade_value: "A",
          grade_scale: "A-F",
          credit_hours: null,
          created_at: "",
          updated_at: "",
        })),
        testScores: [
          { id: "t1", user_id: "u1", test_name: "SAT", score: "1520", max_score: "1600", subscores: {}, test_date: "2025-03-01", created_at: "", updated_at: "" },
          { id: "t2", user_id: "u1", test_name: "AP Calculus BC", score: "5", max_score: "5", subscores: {}, test_date: "2025-05-01", created_at: "", updated_at: "" },
        ],
      })
    );
    expect(result.score).toBeGreaterThanOrEqual(85);
    expect(result.confidence).toBe("high");
  });

  test("weighs honors courses as less rigorous than AP/IB/A-Level courses", () => {
    const honorsHeavy = scoreAcademics(
      facts({
        courses: Array.from({ length: 6 }, (_, i) => ({
          id: `h${i}`,
          user_id: "u1",
          education_record_id: null,
          course_name: `Honors Course ${i}`,
          subject: null,
          level: "honors" as const,
          academic_year: null,
          grade_value: null,
          grade_scale: null,
          credit_hours: null,
          created_at: "",
          updated_at: "",
        })),
      })
    );
    const apHeavy = scoreAcademics(
      facts({
        courses: Array.from({ length: 6 }, (_, i) => ({
          id: `a${i}`,
          user_id: "u1",
          education_record_id: null,
          course_name: `AP Course ${i}`,
          subject: null,
          level: "ap" as const,
          academic_year: null,
          grade_value: null,
          grade_scale: null,
          credit_hours: null,
          created_at: "",
          updated_at: "",
        })),
      })
    );
    expect(honorsHeavy.score).toBeLessThan(apHeavy.score);
  });
});
