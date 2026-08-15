import "server-only";

import { createClient } from "@/lib/supabase/server";
import { computeAdmissionOutlook } from "./outlook";

/**
 * Computes and caches the admission outlook onto a target_universities row. Cheap
 * (deterministic math, no AI/network call) — safe to call whenever a target university
 * page is viewed, unlike AI-backed features.
 */
export async function refreshAdmissionOutlook(targetUniversityId: string, userId: string): Promise<void> {
  const supabase = await createClient();

  const { data: target } = await supabase
    .from("target_universities")
    .select("id, university_id")
    .eq("id", targetUniversityId)
    .eq("user_id", userId)
    .single();
  if (!target) return;

  const [profileRes, statsRes] = await Promise.all([
    supabase.from("profiles").select("profile_strength_score, completeness_percent").eq("id", userId).single(),
    supabase
      .from("university_statistics")
      .select("admission_rate, data_confidence")
      .eq("university_id", target.university_id)
      .order("stat_year", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const profileStrength = profileRes.data?.profile_strength_score ?? 0;
  const dataConfidence = profileRes.data && profileRes.data.completeness_percent >= 60 ? "high" : "medium";

  const outlook = computeAdmissionOutlook({
    profileStrength,
    admissionRate: statsRes.data?.admission_rate ?? null,
    dataConfidence,
  });

  await supabase
    .from("target_universities")
    .update({
      academic_fit_score: outlook.compositeScore,
      profile_fit_score: profileStrength,
      outlook: outlook.outlook,
      estimate_range_low: outlook.estimateRangeLow !== null ? outlook.estimateRangeLow / 100 : null,
      estimate_range_high: outlook.estimateRangeHigh !== null ? outlook.estimateRangeHigh / 100 : null,
      outlook_confidence: outlook.estimateConfidence,
      outlook_model_version: outlook.modelVersion,
      outlook_calculated_at: new Date().toISOString(),
    })
    .eq("id", targetUniversityId);
}
