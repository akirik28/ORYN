import { clampScore } from "@/lib/scoring/math";
import type { OpportunityCategory, ProfileDimension } from "@/types/database";

export interface StudentMatchProfile {
  age: number | null;
  country: string | null;
  interests: string[];
  /** Typically the bottom 2-3 profile_scores dimensions. */
  weakestDimensions: ProfileDimension[];
}

export interface OpportunityForMatching {
  category: OpportunityCategory;
  minimumAge: number | null;
  maximumAge: number | null;
  eligibleCountries: string[];
  fields: string[];
}

export interface EligibilityResult {
  eligible: boolean;
  notes: string | null;
}

/** Hard eligibility gate — unknown student attributes never disqualify (e.g. no country on file means country restrictions simply aren't evaluated), only known mismatches do. */
export function computeEligibility(student: StudentMatchProfile, opportunity: OpportunityForMatching): EligibilityResult {
  if (opportunity.minimumAge !== null && student.age !== null && student.age < opportunity.minimumAge) {
    return { eligible: false, notes: `Requires minimum age ${opportunity.minimumAge}.` };
  }
  if (opportunity.maximumAge !== null && student.age !== null && student.age > opportunity.maximumAge) {
    return { eligible: false, notes: `Requires maximum age ${opportunity.maximumAge}.` };
  }
  if (opportunity.eligibleCountries.length > 0 && student.country && !opportunity.eligibleCountries.includes(student.country)) {
    return { eligible: false, notes: `Not currently open to students from ${student.country}.` };
  }
  return { eligible: true, notes: null };
}

/** Which profile dimensions a category of opportunity primarily develops — used to compute "profile need" (does this address a real gap, or a strength the student doesn't need more of). */
const CATEGORY_DIMENSIONS: Record<OpportunityCategory, ProfileDimension[]> = {
  competition: ["awards_distinction", "academics"],
  research: ["research", "intellectual_curiosity"],
  internship: ["career_exploration", "execution_project_depth"],
  summer_program: ["intellectual_curiosity", "career_exploration"],
  fellowship: ["leadership", "research"],
  scholarship: ["academics"],
  volunteering: ["community_impact"],
  entrepreneurship: ["entrepreneurship", "execution_project_depth"],
  hackathon: ["execution_project_depth", "entrepreneurship"],
  academic_program: ["intellectual_curiosity", "academics"],
  conference: ["intellectual_curiosity", "career_exploration"],
  student_program: ["career_exploration"],
};

function computeRelevanceScore(student: StudentMatchProfile, opportunity: OpportunityForMatching): number {
  if (opportunity.fields.length === 0 || student.interests.length === 0) return 40;

  const fields = opportunity.fields.map((f) => f.toLowerCase());
  const interests = student.interests.map((i) => i.toLowerCase());
  const overlapCount = interests.filter((interest) => fields.some((field) => field.includes(interest) || interest.includes(field))).length;

  return clampScore((overlapCount / interests.length) * 100);
}

function computeProfileNeedScore(student: StudentMatchProfile, opportunity: OpportunityForMatching): number {
  const relevantDimensions = CATEGORY_DIMENSIONS[opportunity.category] ?? [];
  const addressesWeakness = relevantDimensions.some((dimension) => student.weakestDimensions.includes(dimension));
  return addressesWeakness ? 85 : 45;
}

export interface OpportunityMatchResult {
  eligible: boolean;
  eligibilityNotes: string | null;
  relevanceScore: number;
  profileNeedScore: number;
  matchScore: number;
}

/**
 * Deterministic per-student/per-opportunity match (spec Phase 12). Relevance (interest
 * overlap) and profile need (does this target a real gap) combine into one match score,
 * but both are also exposed individually — the UI shows meaningful fields, not one opaque
 * number.
 */
export function computeOpportunityMatch(student: StudentMatchProfile, opportunity: OpportunityForMatching): OpportunityMatchResult {
  const { eligible, notes } = computeEligibility(student, opportunity);
  const relevanceScore = computeRelevanceScore(student, opportunity);
  const profileNeedScore = computeProfileNeedScore(student, opportunity);
  const matchScore = eligible ? clampScore(relevanceScore * 0.4 + profileNeedScore * 0.6) : 0;

  return { eligible, eligibilityNotes: notes, relevanceScore, profileNeedScore, matchScore };
}
