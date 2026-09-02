import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import type { ScoringFacts } from "./types";
import type { CompletenessFacts } from "./completeness";

/**
 * Pulls every table the scoring engine reads, scoped to one user, in parallel. Used by
 * both the dashboard (read the latest facts to show scores) and the recompute job
 * (lib/scoring/persist.ts). Takes a request-scoped Supabase client so RLS still applies —
 * this never needs the admin client.
 */
export async function assembleScoringFacts(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ScoringFacts & Pick<CompletenessFacts, "interests" | "goals" | "targetUniversities">> {
  const [
    educationRecords,
    courses,
    testScores,
    activities,
    awards,
    certifications,
    projects,
    researchExperiences,
    volunteeringExperiences,
    workExperiences,
    interests,
    goals,
    targetUniversities,
  ] = await Promise.all([
    supabase.from("education_records").select("*").eq("user_id", userId),
    supabase.from("courses").select("*").eq("user_id", userId),
    supabase.from("test_scores").select("*").eq("user_id", userId),
    supabase.from("activities").select("*").eq("user_id", userId),
    supabase.from("awards").select("*").eq("user_id", userId),
    supabase.from("certifications").select("*").eq("user_id", userId),
    supabase.from("projects").select("*").eq("user_id", userId),
    supabase.from("research_experiences").select("*").eq("user_id", userId),
    supabase.from("volunteering_experiences").select("*").eq("user_id", userId),
    supabase.from("work_experiences").select("*").eq("user_id", userId),
    supabase.from("student_interests").select("*").eq("user_id", userId),
    supabase.from("career_goals").select("*").eq("user_id", userId),
    supabase.from("target_universities").select("*").eq("user_id", userId),
  ]);

  // 2026-09-03: every field below was `x.data ?? []` with no `.error` check — a failed read
  // (RLS misconfig, a transient error, a table briefly unreachable mid-migration) was
  // silently indistinguishable from "this student genuinely has zero rows here." Every
  // dimension scorer downstream already produces confidence: "low" for a genuine zero
  // (see lib/scoring/dimensions/research.ts), which is the right label for "not much to go
  // on" — it is the wrong label for "we couldn't check," and this function is the only place
  // that could tell the two apart. Contained fix: make a partial failure visible (this
  // function's callers — the dashboard, lib/scoring/persist.ts's recompute job — are
  // unaffected, same return shape, same behavior on success). Whether a degraded read should
  // suppress the resulting score entirely, the way this same question was resolved for
  // admission-rate-driven outlook labels (lib/admissions/explain.ts, 2026-09-03) and for
  // age/grade-eligibility labels (lib/opportunities/matching.ts, same day), is a wider
  // product decision — not made here.
  const results = {
    educationRecords,
    courses,
    testScores,
    activities,
    awards,
    certifications,
    projects,
    researchExperiences,
    volunteeringExperiences,
    workExperiences,
    interests,
    goals,
    targetUniversities,
  };
  const failed = Object.entries(results).filter(([, result]) => result.error);
  if (failed.length > 0) {
    console.error(
      "[scoring] assembleScoringFacts: partial read failure -- these categories are scoring as empty, not as unknown",
      { userId, failedCategories: failed.map(([name]) => name), errors: failed.map(([, result]) => result.error?.message) }
    );
  }

  return {
    educationRecords: educationRecords.data ?? [],
    courses: courses.data ?? [],
    testScores: testScores.data ?? [],
    activities: activities.data ?? [],
    awards: awards.data ?? [],
    certifications: certifications.data ?? [],
    projects: projects.data ?? [],
    researchExperiences: researchExperiences.data ?? [],
    volunteeringExperiences: volunteeringExperiences.data ?? [],
    workExperiences: workExperiences.data ?? [],
    interests: interests.data ?? [],
    goals: goals.data ?? [],
    targetUniversities: targetUniversities.data ?? [],
  };
}
