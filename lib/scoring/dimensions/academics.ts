import type { Course, EducationRecord } from "@/types/database";
import type { DimensionResult, ReasonCode, ScoringFacts } from "../types";
import { clampScore } from "../math";

const RIGOR_WEIGHT: Record<Course["level"], number> = {
  ap: 1,
  ib_hl: 1,
  a_level: 1,
  dual_enrollment: 1,
  ib_sl: 0.75,
  honors: 0.5,
  regular: 0,
  other: 0,
};

function pickReferenceEducationRecord(records: EducationRecord[]): EducationRecord | null {
  const withGpa = records.filter((r) => r.overall_gpa != null && r.gpa_scale);
  if (withGpa.length === 0) return null;
  const current = withGpa.find((r) => r.is_current);
  if (current) return current;
  return [...withGpa].sort((a, b) => (b.end_date ?? "").localeCompare(a.end_date ?? ""))[0];
}

/**
 * Academic score (spec 6.2): GPA (normalized against its own scale — never compared
 * across curricula), course rigor, and standardized-test presence. Test *presence* is
 * scored, not the test value itself: comparing an SAT score to an IB predicted grade
 * without a validated conversion table would be exactly the kind of false-precision
 * cross-system comparison the product spec prohibits.
 */
export function scoreAcademics(facts: ScoringFacts): DimensionResult {
  const reasonCodes: ReasonCode[] = [];
  let signalsPresent = 0;

  const educationRecord = pickReferenceEducationRecord(facts.educationRecords);
  let gpaPoints = 0;
  if (educationRecord?.overall_gpa != null && educationRecord.gpa_scale) {
    const ratio = Math.min(1, educationRecord.overall_gpa / educationRecord.gpa_scale);
    gpaPoints = ratio * 45;
    signalsPresent += 1;
    reasonCodes.push({
      code: "gpa",
      detail: `GPA ${educationRecord.overall_gpa}/${educationRecord.gpa_scale}`,
    });
  }

  const rigorWeight = facts.courses.reduce((sum, course) => sum + (RIGOR_WEIGHT[course.level] ?? 0), 0);
  const rigorPoints = Math.min(rigorWeight * 5, 35);
  if (rigorWeight > 0) {
    signalsPresent += 1;
    reasonCodes.push({ code: "course_rigor", detail: `${rigorWeight} rigor-weighted advanced course(s)` });
  }

  const distinctTests = new Set(facts.testScores.map((t) => t.test_name)).size;
  const testingPoints = distinctTests === 0 ? 0 : Math.min(12 + (distinctTests - 1) * 8, 20);
  if (distinctTests > 0) {
    signalsPresent += 1;
    reasonCodes.push({ code: "testing_presence", detail: `${distinctTests} distinct standardized test(s) on file` });
  }

  const score = clampScore(gpaPoints + rigorPoints + testingPoints);
  const confidence = signalsPresent >= 3 ? "high" : signalsPresent >= 2 ? "medium" : "low";

  return { dimension: "academics", score, confidence, reasonCodes };
}
