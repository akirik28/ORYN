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
