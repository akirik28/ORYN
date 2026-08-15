import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { RequirementFacts } from "./types";

/**
 * Pulls the profile facts lib/requirements/evaluate.ts needs, scoped to one user. A
 * narrower, separately-scoped query than lib/scoring/assemble-facts.ts (adds `languages`,
 * skips every achievement table) — kept independent because the two modules answer
 * different questions (career-profile strength vs. eligibility against one program's
 * stated requirements) and have no reason to share a result shape.
 */
export async function assembleRequirementFacts(supabase: SupabaseClient<Database>, userId: string): Promise<RequirementFacts> {
  const [educationRecords, courses, testScores, languages] = await Promise.all([
    supabase.from("education_records").select("curriculum, overall_gpa, gpa_scale").eq("user_id", userId),
    supabase.from("courses").select("subject, level, grade_value").eq("user_id", userId),
    supabase.from("test_scores").select("test_name, score").eq("user_id", userId),
    supabase.from("languages").select("name, proficiency").eq("user_id", userId),
  ]);

  const curricula = [...new Set((educationRecords.data ?? []).map((r) => r.curriculum).filter((c): c is NonNullable<typeof c> => c !== null))];
  const gpas = (educationRecords.data ?? [])
    .filter((r) => r.overall_gpa !== null && r.gpa_scale !== null)
    .map((r) => ({ value: r.overall_gpa as number, scale: r.gpa_scale as number }));

  return {
    curricula,
    courses: (courses.data ?? []).map((c) => ({ subject: c.subject, level: c.level, gradeValue: c.grade_value })),
    gpas,
    testScores: (testScores.data ?? []).map((t) => ({ testName: t.test_name, score: t.score })),
    languages: (languages.data ?? []).map((l) => ({ name: l.name, proficiency: l.proficiency })),
  };
}
