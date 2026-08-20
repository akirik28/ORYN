import "server-only";

import { createClient } from "@/lib/supabase/server";
import { computeOpportunityMatch, isNearStudent } from "./matching";
import type { StudentMatchProfile, OpportunityForMatching } from "./matching";
import { rankDimensionGaps, toDimensionScoreRows } from "@/lib/counselor/gaps";

/**
 * Recomputes and upserts opportunity_matches for one student against every active
 * opportunity. Cheap (pure deterministic math, no AI call) — safe to run on every
 * /opportunities page view, unlike weekly-plan generation.
 */
export async function refreshOpportunityMatches(userId: string): Promise<void> {
  const supabase = await createClient();

  const [profileRes, scoresRes, interestsRes, opportunitiesRes, savedRes] = await Promise.all([
    supabase.from("profiles").select("birth_year, country, graduation_year, citizenship_countries").eq("id", userId).single(),
    supabase.from("profile_scores").select("dimension, score, confidence, reason_codes").eq("user_id", userId),
    supabase.from("student_interests").select("label").eq("user_id", userId),
    supabase
      .from("opportunities")
      .select("id, category, minimum_age, maximum_age, eligible_countries, eligible_citizenships, eligible_grades, fields, country")
      .eq("status", "active"),
    // Counselor Core fix: an opportunity the student already applied to or explicitly
    // dismissed must never resurface as a fresh recommendation — see computeEligibility's
    // savedStatus parameter (lib/opportunities/matching.ts).
    supabase.from("saved_opportunities").select("opportunity_id, status").eq("user_id", userId),
  ]);

  const savedStatusByOpportunityId = new Map((savedRes.data ?? []).map((s) => [s.opportunity_id, s.status]));

  const opportunities = opportunitiesRes.data ?? [];
  if (opportunities.length === 0) return;

  const currentYear = new Date().getFullYear();
  const age = profileRes.data?.birth_year ? currentYear - profileRes.data.birth_year : null;

  // Counselor Core Phase D — see app/(app)/dashboard/page.tsx's identical usage.
  const weakestDimensions = rankDimensionGaps(toDimensionScoreRows(scoresRes.data ?? []))
    .slice(0, 3)
    .map((g) => g.dimension);

  const studentProfile: StudentMatchProfile = {
    age,
    country: profileRes.data?.country ?? null,
    interests: (interestsRes.data ?? []).map((i) => i.label),
    weakestDimensions,
    citizenshipCountries: profileRes.data?.citizenship_countries ?? [],
    graduationYear: profileRes.data?.graduation_year ?? null,
  };

  const rows = opportunities.map((opportunity) => {
    const forMatching: OpportunityForMatching = {
      category: opportunity.category,
      minimumAge: opportunity.minimum_age,
      maximumAge: opportunity.maximum_age,
      eligibleCountries: opportunity.eligible_countries,
      eligibleCitizenships: opportunity.eligible_citizenships ?? [],
      eligibleGrades: opportunity.eligible_grades ?? [],
      fields: opportunity.fields,
      country: opportunity.country,
    };
    const match = computeOpportunityMatch(studentProfile, forMatching, savedStatusByOpportunityId.get(opportunity.id) ?? null);

    return {
      user_id: userId,
      opportunity_id: opportunity.id,
      eligible: match.eligible,
      eligibility_notes: match.eligibilityNotes,
      relevance_score: match.relevanceScore,
      profile_need_score: match.profileNeedScore,
      match_score: match.matchScore,
      effort_estimate: null,
      reason_codes: buildReasonCodes(match, studentProfile, forMatching),
      calculated_at: new Date().toISOString(),
    };
  });

  await supabase.from("opportunity_matches").upsert(rows, { onConflict: "user_id,opportunity_id" });
}

function buildReasonCodes(
  match: ReturnType<typeof computeOpportunityMatch>,
  student: StudentMatchProfile,
  opportunity: OpportunityForMatching
): string[] {
  const codes: string[] = [];
  if (!match.eligible) codes.push("ineligible");
  if (match.relevanceScore >= 70) codes.push("matches_your_interests");
  if (match.profileNeedScore >= 70) codes.push("addresses_a_current_gap");
  if (isNearStudent(student, opportunity)) codes.push("near_you");
  return codes;
}
