import { clampScore } from "@/lib/scoring/math";
import { normalizeEntitySearchText } from "@/lib/entities/normalize";
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
  /** The opportunity's own base country (distinct from `eligibleCountries`, which is who
   * may apply — an in-person program based in France could still be open worldwide).
   * Used only for a relevance boost below, never eligibility: an opportunity outside a
   * student's country is not a reason to hide it, only a reason to rank it lower. */
  country: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  notes: string | null;
}

/** A student's own typed country and an opportunity's `eligible_countries` can name the
 * same real country in different languages/forms (confirmed live this session: a real
 * profile has `country = "Türkiye"` while data elsewhere says "Turkey" — even
 * normalizeEntitySearchText's accent/case folding doesn't bridge that, since "türkiye" and
 * "turkey" aren't the same string with the diaeresis removed, they're genuinely different
 * words for the same country). Narrow, explicit map for confirmed cases only — not an
 * attempt at full native-name coverage for every country, which would be a much larger,
 * separate effort. */
const COUNTRY_ALIASES: Record<string, string> = {
  turkiye: "turkey",
};

function canonicalCountryKey(country: string): string {
  const normalized = normalizeEntitySearchText(country);
  return COUNTRY_ALIASES[normalized] ?? normalized;
}

function isSameCountry(a: string, b: string): boolean {
  return canonicalCountryKey(a) === canonicalCountryKey(b);
}

/** Hard eligibility gate — unknown student attributes never disqualify (e.g. no country on file means country restrictions simply aren't evaluated), only known mismatches do. */
export function computeEligibility(student: StudentMatchProfile, opportunity: OpportunityForMatching): EligibilityResult {
  if (opportunity.minimumAge !== null && student.age !== null && student.age < opportunity.minimumAge) {
    return { eligible: false, notes: `Requires minimum age ${opportunity.minimumAge}.` };
  }
  if (opportunity.maximumAge !== null && student.age !== null && student.age > opportunity.maximumAge) {
    return { eligible: false, notes: `Requires maximum age ${opportunity.maximumAge}.` };
  }
  if (
    opportunity.eligibleCountries.length > 0 &&
    student.country &&
    !opportunity.eligibleCountries.some((eligible) => isSameCountry(eligible, student.country!))
  ) {
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
  online_program: ["intellectual_curiosity", "academics"],
  conference: ["intellectual_curiosity", "career_exploration"],
  student_program: ["career_exploration"],
};

/** Same real-world country per isSameCountry above ("USA" vs. "United States" still won't
 * match — a genuinely different, unresolved gap; onboarding's country field is free text,
 * see lib/vocabularies/countries.ts). Relevance, never eligibility: a program based
 * elsewhere is still worth knowing about, just not surfaced first. */
export function isNearStudent(student: StudentMatchProfile, opportunity: Pick<OpportunityForMatching, "country">): boolean {
  if (!student.country || !opportunity.country) return false;
  return isSameCountry(student.country, opportunity.country);
}

const PROXIMITY_BOOST = 15;

function computeRelevanceScore(student: StudentMatchProfile, opportunity: OpportunityForMatching): number {
  const near = isNearStudent(student, opportunity);
  if (opportunity.fields.length === 0 || student.interests.length === 0) {
    return clampScore(40 + (near ? PROXIMITY_BOOST : 0));
  }

  const fields = opportunity.fields.map((f) => f.toLowerCase());
  const interests = student.interests.map((i) => i.toLowerCase());
  const overlapCount = interests.filter((interest) => fields.some((field) => field.includes(interest) || interest.includes(field))).length;

  return clampScore((overlapCount / interests.length) * 100 + (near ? PROXIMITY_BOOST : 0));
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
