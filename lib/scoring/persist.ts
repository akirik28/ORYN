import "server-only";

import { createClient } from "@/lib/supabase/server";
import { assembleScoringFacts } from "./assemble-facts";
import { computeCareerProfile } from "./index";
import { computeCompleteness } from "./completeness";

/**
 * Recomputes a student's full career profile and persists it: upserts the current
 * per-dimension scores, refreshes the denormalized `profiles.profile_strength_score` /
 * `completeness_percent` cache columns used for fast dashboard/sidebar reads, and appends
 * a history snapshot when the overall score meaningfully changed (Phase 41) so the
 * monthly review has real before/after data instead of noise from every trivial edit.
 *
 * Called after achievement CRUD and from the dashboard's initial load. Always runs
 * against the current user's RLS-scoped client — never the admin client.
 */
export async function recomputeCareerProfile(userId: string, opts?: { snapshotReason?: string }) {
  const supabase = await createClient();
  const facts = await assembleScoringFacts(supabase, userId);

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("country, school_name, graduation_year, curriculum, profile_strength_score")
    .eq("id", userId)
    .single();

  if (profileError || !profileRow) {
    throw new Error(`Cannot recompute career profile: profile not found (${profileError?.message ?? "no data"})`);
  }

  const careerProfile = computeCareerProfile(facts);
  const completeness = computeCompleteness({ ...facts, profile: profileRow });

  const calculatedAt = new Date().toISOString();
  const { error: scoresError } = await supabase.from("profile_scores").upsert(
    careerProfile.dimensions.map((d) => ({
      user_id: userId,
      dimension: d.dimension,
      score: d.score,
      confidence: d.confidence,
      calculation_version: careerProfile.version,
      reason_codes: d.reasonCodes,
      calculated_at: calculatedAt,
    })),
    { onConflict: "user_id,dimension,calculation_version" }
  );
  if (scoresError) throw new Error(`Failed to persist dimension scores: ${scoresError.message}`);

  const previousScore = profileRow.profile_strength_score;
  const { error: profileUpdateError } = await supabase
    .from("profiles")
    .update({ profile_strength_score: careerProfile.overallScore, completeness_percent: completeness })
    .eq("id", userId);
  if (profileUpdateError) throw new Error(`Failed to update profile cache: ${profileUpdateError.message}`);

  const changedMeaningfully = previousScore === null || Math.abs(previousScore - careerProfile.overallScore) >= 1;
  if (changedMeaningfully || opts?.snapshotReason) {
    const { error: snapshotError } = await supabase.from("profile_score_snapshots").insert({
      user_id: userId,
      score_version: careerProfile.version,
      overall_score: careerProfile.overallScore,
      dimension_scores: Object.fromEntries(careerProfile.dimensions.map((d) => [d.dimension, d.score])),
      snapshot_reason: opts?.snapshotReason ?? "profile_updated",
    });
    if (snapshotError) throw new Error(`Failed to write score snapshot: ${snapshotError.message}`);
  }

  return { careerProfile, completeness };
}
