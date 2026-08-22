import { clampScore } from "@/lib/scoring/math";
import { normalizeEntitySearchText } from "@/lib/entities/normalize";
import { currentGradeLevel, gradeMatchesEligibility } from "@/lib/profile/grade-level";
import type { OpportunityCategory, ProfileDimension, SavedOpportunityStatus } from "@/types/database";

export interface StudentMatchProfile {
  age: number | null;
  country: string | null;
  interests: string[];
  /** Typically the bottom 2-3 profile_scores dimensions. */
  weakestDimensions: ProfileDimension[];
  /** Distinct from `country` (residence/school location) — migration 0047. Optional/empty
   * for callers that don't have it yet; never inferred from `country`. */
  citizenshipCountries?: string[];
  /** Feeds currentGradeLevel() for eligible_grades checks below. */
  graduationYear?: number | null;
}

export interface OpportunityForMatching {
  category: OpportunityCategory;
  minimumAge: number | null;
  maximumAge: number | null;
  eligibleCountries: string[];
  /** Structured citizenship restriction (migration 0047) — genuinely distinct from
   * eligibleCountries/residency. Optional for callers that don't fetch it yet. */
  eligibleCitizenships?: string[];
  /** Structured grade restriction (migration 0041), e.g. ["9","10","11","12"]. Optional
   * for callers that don't fetch it yet. */
  eligibleGrades?: string[];
  /** Research-confirmed "no country/citizenship gate — open worldwide" (migration 0060,
   * unapplied; read defensively). Empty eligibleCountries has TWO live meanings —
   * confirmed-open (deliberately stored empty) and never-researched (~90% of live rows) —
   * and only this marker distinguishes them. Optional: absent means not confirmed, which
   * is the honest default, never "restricted." */
  countryEligibilityConfirmedOpen?: boolean;
  /** Whether the row carries free-text citizenship/residency restriction prose
   * (citizenship_restrictions / residency_restrictions) that eligibility code deliberately
   * never parses. Presence means the row WAS researched and a restriction is known to
   * exist — so the "not verified yet" note below would be false for it; the prose itself
   * is already surfaced on the counselor path and the opportunity detail page. */
  hasUnstructuredEligibilityEvidence?: boolean;
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

/** Exported alongside isSameCountry for callers that need to *group* countries rather than
 * just compare a pair — e.g. building a filter dropdown's option list without splitting one
 * real country across multiple spellings. Not a display label: this returns the normalized
 * key ("turkey"), not "Turkey"/"Türkiye" — callers that render UI need to pick their own
 * label per bucket. */
export function canonicalCountryKey(country: string): string {
  const normalized = normalizeEntitySearchText(country);
  return COUNTRY_ALIASES[normalized] ?? normalized;
}

/** Exported for lib/counselor/eligibility.ts's own independent country/residency/citizenship
 * checks — one country-equivalence rule, not a second copy that could silently drift
 * (e.g. "Türkiye" vs "Turkey" being treated as different countries in one check and not the
 * other would be exactly the kind of inconsistent-eligibility bug this product can't afford). */
export function isSameCountry(a: string, b: string): boolean {
  return canonicalCountryKey(a) === canonicalCountryKey(b);
}

/**
 * Hard eligibility gate — a known mismatch is the only thing that excludes (`eligible:
 * false`). But "unknown" and "confirmed eligible" are NOT the same claim, even though both
 * currently persist as `eligible: true` (changing that to a 3-state column is a larger,
 * separate migration — see lib/counselor/eligibility.ts's own richer verdict type for the
 * fuller version of this same distinction). When a restriction exists but ORYN doesn't have
 * the fact needed to check it, that's surfaced via `notes` instead of being silently treated
 * as identical to "no restriction at all" — a caller must not badge an unverified match the
 * same as a confirmed one just because both have `eligible: true`.
 *
 * `savedStatus` is this student's own `saved_opportunities.status` for this opportunity, if
 * any. `applied`/`not_interested` are a hard exclusion — the student already acted on it, so
 * it must not keep resurfacing as a fresh recommendation (a live-confirmed bug: previously
 * this function had no idea a saved-opportunity record existed at all). A plain `saved`
 * bookmark is not an exclusion — the student hasn't decided yet.
 */
export function computeEligibility(
  student: StudentMatchProfile,
  opportunity: OpportunityForMatching,
  savedStatus: SavedOpportunityStatus | null = null
): EligibilityResult {
  if (savedStatus === "applied") {
    return { eligible: false, notes: "You already applied to this." };
  }
  if (savedStatus === "not_interested") {
    return { eligible: false, notes: "You already marked this not interested." };
  }

  const unknownNotes: string[] = [];

  const hasAgeRestriction = opportunity.minimumAge !== null || opportunity.maximumAge !== null;
  if (hasAgeRestriction && student.age === null) {
    unknownNotes.push("Has an age requirement — add your birth year to check.");
  } else {
    if (opportunity.minimumAge !== null && student.age !== null && student.age < opportunity.minimumAge) {
      return { eligible: false, notes: `Requires minimum age ${opportunity.minimumAge}.` };
    }
    if (opportunity.maximumAge !== null && student.age !== null && student.age > opportunity.maximumAge) {
      return { eligible: false, notes: `Requires maximum age ${opportunity.maximumAge}.` };
    }
  }

  if (opportunity.eligibleCountries.length > 0) {
    if (!student.country) {
      unknownNotes.push("Restricted by country — add your country to check.");
    } else if (!opportunity.eligibleCountries.some((eligible) => isSameCountry(eligible, student.country!))) {
      return { eligible: false, notes: `Not currently open to students from ${student.country}.` };
    }
  } else if (
    // Empty eligibleCountries has two live meanings: research-confirmed open (deliberately
    // stored empty) and never-researched (~90% of live rows). Only the first has earned
    // silence. Without the confirmed-open marker — and with no other eligibility evidence
    // on the row (a structured citizenship gate, or restriction prose the counselor path
    // and detail page already surface) — the honest claim is "not verified," said out
    // loud, not implied openness (Phase 68: know when you don't know). Still an
    // unknown-note, never an exclusion: absence of research is not evidence of a
    // restriction either.
    !(opportunity.countryEligibilityConfirmedOpen ?? false) &&
    (opportunity.eligibleCitizenships ?? []).length === 0 &&
    !(opportunity.hasUnstructuredEligibilityEvidence ?? false)
  ) {
    unknownNotes.push("Country eligibility not verified yet — check the official page for restrictions.");
  }

  const eligibleCitizenships = opportunity.eligibleCitizenships ?? [];
  if (eligibleCitizenships.length > 0) {
    const citizenshipCountries = student.citizenshipCountries ?? [];
    if (citizenshipCountries.length === 0) {
      unknownNotes.push("Requires a specific citizenship — add yours in Settings to check.");
    } else if (!citizenshipCountries.some((c) => eligibleCitizenships.some((e) => isSameCountry(c, e)))) {
      return { eligible: false, notes: `Requires citizenship in ${eligibleCitizenships.join(", ")}.` };
    }
  }

  const eligibleGrades = opportunity.eligibleGrades ?? [];
  if (eligibleGrades.length > 0) {
    const grade = currentGradeLevel(student.graduationYear ?? null);
    if (grade === null) {
      unknownNotes.push("Restricted by grade level — add your graduation year to check.");
    } else if (!gradeMatchesEligibility(grade, eligibleGrades)) {
      return { eligible: false, notes: `Restricted to grades ${eligibleGrades.join(", ")}.` };
    }
  }

  return { eligible: true, notes: unknownNotes.length > 0 ? unknownNotes.join(" ") : null };
}

/** Which profile dimensions a category of opportunity primarily develops — used to compute
 * "profile need" (does this address a real gap, or a strength the student doesn't need more
 * of). Exported for lib/counselor/candidates.ts to reuse — one category→dimension mapping,
 * not a second copy. */
export const CATEGORY_DIMENSIONS: Record<OpportunityCategory, ProfileDimension[]> = {
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

  const fields = opportunity.fields.map((f) => f.trim().toLowerCase());
  const interests = student.interests.map((i) => i.trim().toLowerCase());
  // counselor-loop QA defect #3 (docs/handoffs/counselor-loop-qa-report.md): substring
  // containment (field.includes(interest) / interest.includes(field)) treats "computer
  // science" as matching a field merely called "science" — the shorter string being a
  // substring of the longer one is not the same as the two naming the same field. Exact
  // (post-normalization) equality only; each array entry is already meant to be one field/
  // interest, not a combined phrase to search within.
  const overlapCount = interests.filter((interest) => fields.some((field) => field === interest)).length;

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
export function computeOpportunityMatch(
  student: StudentMatchProfile,
  opportunity: OpportunityForMatching,
  savedStatus: SavedOpportunityStatus | null = null
): OpportunityMatchResult {
  const { eligible, notes } = computeEligibility(student, opportunity, savedStatus);
  const relevanceScore = computeRelevanceScore(student, opportunity);
  const profileNeedScore = computeProfileNeedScore(student, opportunity);
  const matchScore = eligible ? clampScore(relevanceScore * 0.4 + profileNeedScore * 0.6) : 0;

  return { eligible, eligibilityNotes: notes, relevanceScore, profileNeedScore, matchScore };
}
