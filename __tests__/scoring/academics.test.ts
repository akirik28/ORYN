import { describe, expect, test } from "vitest";
import { scoreAcademics } from "@/lib/scoring/dimensions/academics";
import type { ScoringFacts } from "@/lib/scoring/types";
import type { Course } from "@/types/database";

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
            country_entity_id: null,
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

  // Regression: counselor-loop QA defect #2 (docs/handoffs/counselor-loop-qa-report.md) — a
  // UK A-level persona with real per-course grades but no overall_gpa scored gpaPoints=0/45
  // because this function never read courses[].grade_value at all. Fails before this fix
  // (course_grade_presence didn't exist as a signal), passes after.
  describe("course-grade-presence fallback (no overall_gpa on file)", () => {
    function gradedCourse(id: string, gradeValue: string | null): Course {
      return {
        id, user_id: "u1", education_record_id: null, course_name: `Course ${id}`, subject: "Maths",
        level: "a_level", academic_year: "2026", grade_value: gradeValue, grade_scale: "A*-U",
        credit_hours: null, created_at: "", updated_at: "",
      };
    }

    test("scores academics above 0 for a student with real per-course grades but no overall_gpa", () => {
      const result = scoreAcademics(
        facts({ courses: [gradedCourse("1", "A*"), gradedCourse("2", "A"), gradedCourse("3", "A")] })
      );
      expect(result.score).toBeGreaterThan(0);
      expect(result.reasonCodes.some((r) => r.code === "course_grade_presence")).toBe(true);
    });

    test("does not engage the fallback, and does not double-count, when overall_gpa is already present", () => {
      const withGpaOnly = scoreAcademics(
        facts({
          educationRecords: [
            { id: "e1", user_id: "u1", school_name: "S", school_entity_id: null, country_entity_id: null, country: "US", stage: "high_school", curriculum: "ap", start_date: null, end_date: null, is_current: true, overall_gpa: 3.5, gpa_scale: 4.0, notes: null, created_at: "", updated_at: "" },
          ],
        })
      );
      const withGpaAndGradedCourses = scoreAcademics(
        facts({
          educationRecords: [
            { id: "e1", user_id: "u1", school_name: "S", school_entity_id: null, country_entity_id: null, country: "US", stage: "high_school", curriculum: "ap", start_date: null, end_date: null, is_current: true, overall_gpa: 3.5, gpa_scale: 4.0, notes: null, created_at: "", updated_at: "" },
          ],
          courses: [gradedCourse("1", "A*"), gradedCourse("2", "A")],
        })
      );
      expect(withGpaAndGradedCourses.reasonCodes.some((r) => r.code === "course_grade_presence")).toBe(false);
      // The second call's courses also contribute rigor points (a_level), so scores aren't
      // expected to be equal — only the GPA-signal component must not double-count.
      expect(withGpaOnly.reasonCodes.filter((r) => r.code === "gpa" || r.code === "course_grade_presence").length).toBe(1);
      expect(withGpaAndGradedCourses.reasonCodes.filter((r) => r.code === "gpa" || r.code === "course_grade_presence").length).toBe(1);
    });

    test("does not treat empty-string grade_value as a real grade", () => {
      const result = scoreAcademics(facts({ courses: [gradedCourse("1", ""), gradedCourse("2", null)] }));
      expect(result.reasonCodes.some((r) => r.code === "course_grade_presence")).toBe(false);
    });
  });
});
