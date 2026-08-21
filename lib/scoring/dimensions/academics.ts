import type { Course, EducationRecord } from "@/types/database";
import type { DimensionResult, ReasonCode, ScoringFacts } from "../types";
import { clampScore } from "../math";

/**
 * Known, NOT fixed by counselor-loop QA defect #2's remediation: `Course["level"]` (a
 * Postgres enum, `supabase/migrations`) has no value representing rigor within a curriculum
 * outside this AP/IB/A-level/dual-enrollment set — e.g. a Turkish Fen Lisesi's advanced
 * track has no legal way to score above `regular`/`other` here no matter how rigorous the
 * actual coursework is. Fixing that requires a new CourseLevel enum value, which is a schema
 * migration and explicitly out of this fix's bounds (see docs/handoffs/counselor-fixes-
 * report.md) — flagged here in code, not silently worked around.
 */
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
 *
 * counselor-loop QA defect #2 (docs/handoffs/counselor-loop-qa-report.md): a UK A-level
 * student who (realistically) has no single `overall_gpa` on file — only per-course
 * `grade_value` entries, which this function used to never read at all — got gpaPoints=0
 * out of 45 purely because the real academic signal lives in a field this scorer ignored.
 * Same "presence, not value" discipline as testingPoints below: a per-course grade_value is
 * free text on wildly different scales (A*-U, 1-9, 100-point, IB 1-7) with no validated
 * cross-scale conversion, so this can only safely score that graded coursework EXISTS, never
 * what the grade itself was worth. Only engaged as a fallback when no overall_gpa is on
 * file, so a student with both never gets double-counted for the same underlying signal.
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
  } else {
    const distinctGradedCourses = facts.courses.filter((c) => c.grade_value != null && c.grade_value.trim() !== "").length;
    if (distinctGradedCourses > 0) {
      gpaPoints = Math.min(10 + (distinctGradedCourses - 1) * 3, 25);
      signalsPresent += 1;
      reasonCodes.push({
        code: "course_grade_presence",
        detail: `${distinctGradedCourses} course(s) with a recorded grade, no overall GPA on file`,
      });
    }
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
