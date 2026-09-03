import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { RequirementFacts } from "./types";
import { readOr } from "@/lib/supabase/safe-read";

/**
 * Pulls the profile facts lib/requirements/evaluate.ts needs, scoped to one user. A
 * narrower, separately-scoped query than lib/scoring/assemble-facts.ts (adds `languages`,
 * skips every achievement table) — kept independent because the two modules answer
 * different questions (career-profile strength vs. eligibility against one program's
 * stated requirements) and have no reason to share a result shape.
 *
 * 2026-09-03: same fix as assembleScoringFacts (docs/okuma-hatasi-vs-bos-sonuc-karari-
 * 2026-09-03.md, tier 1) -- every read below was `x.data ?? []` with no `.error` check, so
 * a failed read here used to silently produce "meets no requirements on file" instead of
 * "couldn't check," feeding a program-eligibility claim same as every other tier-1 finding
 * tonight. readOr's third adoption; smaller than the second, as expected.
 */
export async function assembleRequirementFacts(supabase: SupabaseClient<Database>, userId: string): Promise<RequirementFacts> {
  const [educationRecordsRes, coursesRes, testScoresRes, languagesRes] = await Promise.all([
    supabase.from("education_records").select("curriculum, overall_gpa, gpa_scale").eq("user_id", userId),
    supabase.from("courses").select("subject, level, grade_value").eq("user_id", userId),
    // `max_score`/`test_date` are the only signals `test_scores` carries that bear on whether
    // a comparison is legitimate at all: max_score is what lets a TOEFL result be placed on
    // the 0-120 or the 1-6 scale (see inferStudentScale), and test_date is what a validity
    // window is measured against. Both absent means the evaluator is more cautious, never
    // less — see lib/requirements/evaluate.ts.
    supabase.from("test_scores").select("test_name, score, max_score, test_date").eq("user_id", userId),
    supabase.from("languages").select("name, proficiency").eq("user_id", userId),
  ]);

  // Read once, reused below (educationRecords.data was read twice before) — matches
  // persist-matches.ts's own dedup fix, same reason: two readOr calls around the same
  // underlying failure would log it twice and make one fault look like two.
  const educationRecords = readOr("assembleRequirementFacts.educationRecords", educationRecordsRes, [], { userId });
  const curricula = [...new Set(educationRecords.map((r) => r.curriculum).filter((c): c is NonNullable<typeof c> => c !== null))];
  const gpas = educationRecords
    .filter((r) => r.overall_gpa !== null && r.gpa_scale !== null)
    .map((r) => ({ value: r.overall_gpa as number, scale: r.gpa_scale as number }));

  return {
    curricula,
    courses: readOr("assembleRequirementFacts.courses", coursesRes, [], { userId }).map((c) => ({ subject: c.subject, level: c.level, gradeValue: c.grade_value })),
    gpas,
    testScores: readOr("assembleRequirementFacts.testScores", testScoresRes, [], { userId }).map((t) => ({ testName: t.test_name, score: t.score, maxScore: t.max_score, testDate: t.test_date })),
    languages: readOr("assembleRequirementFacts.languages", languagesRes, [], { userId }).map((l) => ({ name: l.name, proficiency: l.proficiency })),
  };
}
