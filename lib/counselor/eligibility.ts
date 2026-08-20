import { isSameCountry } from "@/lib/opportunities/matching";
import { currentGradeLevel, gradeMatchesEligibility } from "@/lib/profile/grade-level";
import type { CandidateAction, CounselorState, EligibilityResult, EligibilityVerdict } from "./types";

/** Exported for lib/opportunities/readiness.ts's data-quality audit to reuse — one
 * definition of "not currently actionable," not a second copy of the same rule. */
export const INACTIVE_CYCLE_STATUSES = new Set(["closed", "historical", "discontinued"]);

function matchesAnyKnownCountry(known: readonly string[], allowed: readonly string[]): boolean {
  return known.some((k) => allowed.some((a) => isSameCountry(k, a)));
}

/**
 * Finer-grained, opportunity-specific classification layered on top of
 * lib/opportunities/matching.ts's already-applied hard filter. By the time a candidate
 * reaches here, matching.ts has already excluded any opportunity with a known age/country/
 * already-acted-on mismatch (state.eligibleOpportunityMatches only contains
 * opportunity_matches.eligible = true rows) — this function exists to (a) split that
 * remaining "not known-ineligible" set into known_eligible vs. unknown, and (b) act as an
 * independent defense-in-depth layer for country/citizenship/grade, since matching.ts's own
 * hard gate only covers age and eligible_countries — not citizenship or grade at all, and not
 * safe to assume every future caller pre-filters correctly (spec: unknown eligibility must
 * never be *called* eligible, docs/counselor-core-plan.md §7/Assumption A2; a *known*
 * structured mismatch must become known_ineligible, not just an unresolved warning — the
 * data-quality sprint's own Part G decision matrix).
 */
function evaluateOpportunityEligibility(candidate: CandidateAction & { source: { kind: "opportunity" } }, state: CounselorState): EligibilityResult {
  const entry = state.eligibleOpportunityMatches.find((e) => e.opportunity.id === candidate.source.opportunityId);
  if (!entry) {
    return { verdict: "unknown", notes: ["This opportunity's current data couldn't be found."] };
  }
  const { opportunity } = entry;

  // Defense-in-depth for spec §37's "unverified opportunities never appear as verified"
  // invariant: lib/counselor/state.ts's DB query already restricts eligibleOpportunityMatches
  // to verification_state = 'verified_current' before this point, but that's untested
  // DB-boundary code (this repo's convention) — this check makes the invariant hold on its
  // own, independent of the caller having filtered correctly upstream.
  if (opportunity.verification_state !== "verified_current") {
    return { verdict: "known_ineligible", notes: ["This opportunity is not currently verified."] };
  }

  // A hard, structured "not actionable right now" check — independent of matching.ts,
  // which never looks at cycle_status at all.
  if (INACTIVE_CYCLE_STATUSES.has(opportunity.cycle_status)) {
    return { verdict: "known_ineligible", notes: [`This opportunity's current cycle is ${opportunity.cycle_status.replace(/_/g, " ")}.`] };
  }

  const notes: string[] = [];
  const { birthYear, country: studentCountry } = state.advisor.student;
  // Defensive fallbacks, not just type-trust: several existing unit tests (and any future
  // caller) construct a partial `advisor.student` via a type assertion rather than a real
  // buildStudentAdvisorContext() call, so these two newer fields can genuinely be `undefined`
  // at runtime despite the type saying otherwise — must never crash or silently misfire into
  // known_ineligible because of it.
  const citizenshipCountries = state.advisor.student.citizenshipCountries ?? [];
  const graduationYear = state.advisor.student.graduationYear ?? null;

  // --- Age: matching.ts already hard-excludes a KNOWN mismatch upstream; this layer only
  // flags when the restriction exists but the fact isn't on file (no independent recheck of
  // a known age here — matching.ts's age math already needs a computed "as of today" age,
  // which this layer doesn't have access to from birthYear alone without a birth month/day
  // this product deliberately doesn't collect, see migration 0002's comment). ---
  const hasAgeRestriction = opportunity.minimum_age !== null || opportunity.maximum_age !== null;
  if (hasAgeRestriction && birthYear === null) {
    notes.push("This opportunity has an age requirement Oryn can't check without your birth year on file.");
  }

  // --- Country / residency (eligible_countries is the existing, already-in-wide-use
  // structured signal for this — see migration 0047's own comment for why a second
  // "residency countries" column would just duplicate it). Known mismatch is a hard
  // exclusion here, independently of matching.ts's own upstream gate. ---
  const hasCountryRestriction = opportunity.eligible_countries.length > 0;
  if (hasCountryRestriction) {
    if (!studentCountry) {
      notes.push("This opportunity is restricted by country and your country isn't on file yet.");
    } else if (!matchesAnyKnownCountry([studentCountry], opportunity.eligible_countries)) {
      return { verdict: "known_ineligible", notes: [`Not currently open to students in ${studentCountry}.`] };
    }
  }

  // --- Citizenship (structured, migration 0047) — genuinely distinct from country/residency
  // above (spec Part A: a Turkey-resident student is not automatically a Turkish citizen).
  // Defensive fallback, not just type-trust (same reasoning as citizenshipCountries above):
  // migration 0047 may not be applied to every environment yet, so a real row fetched from a
  // live DB that predates it genuinely has no `eligible_citizenships` key at all despite the
  // type saying `string[]` — must degrade to "no structured restriction," never crash. ---
  const eligibleCitizenships = opportunity.eligible_citizenships ?? [];
  const hasCitizenshipRestriction = eligibleCitizenships.length > 0;
  if (hasCitizenshipRestriction) {
    if (citizenshipCountries.length === 0) {
      notes.push("This opportunity requires a specific citizenship and yours isn't on file yet.");
    } else if (!matchesAnyKnownCountry(citizenshipCountries, eligibleCitizenships)) {
      return {
        verdict: "known_ineligible",
        notes: [`Requires citizenship in ${eligibleCitizenships.join(", ")}; citizenship on file is ${citizenshipCountries.join(", ")}.`],
      };
    }
  }

  // --- Free-text citizenship/residency evidence (unparsed, never a hard exclusion on its
  // own — this is the fallback for restrictions too complex for the structured columns
  // above, e.g. "citizens, permanent residents, or F-1 visa holders with 3+ years
  // residence"). Still surfaced whenever the structured column above didn't already resolve
  // it, since it's real evidence a student should see even if Oryn can't act on it alone. ---
  if (opportunity.citizenship_restrictions && !hasCitizenshipRestriction) {
    notes.push(`Citizenship restriction on file (not automatically verified): ${opportunity.citizenship_restrictions}`);
  }
  if (opportunity.residency_restrictions && !hasCountryRestriction) {
    notes.push(`Residency restriction on file (not automatically verified): ${opportunity.residency_restrictions}`);
  }

  // --- Grade level, computed from graduation_year (lib/profile/grade-level.ts) — closes
  // docs/counselor-core.md's documented limitation #5 ("Oryn doesn't derive a student's
  // current grade from graduation_year anywhere"). Arithmetic on a fact the student already
  // gave, not an inference beyond it; still a known-data mismatch, so a real one is a hard
  // exclusion, matching the same standard applied to country/citizenship above. ---
  if (opportunity.eligible_grades.length > 0) {
    const grade = currentGradeLevel(graduationYear);
    if (grade === null) {
      notes.push("This opportunity restricts eligibility by grade level and Oryn can't compute your current grade without a graduation year on file.");
    } else if (!gradeMatchesEligibility(grade, opportunity.eligible_grades)) {
      return { verdict: "known_ineligible", notes: [`Restricted to grades ${opportunity.eligible_grades.join(", ")}; you're currently grade ${grade}.`] };
    }
  }

  if (notes.length > 0) {
    return { verdict: "unknown", notes };
  }
  return { verdict: "known_eligible", notes: [] };
}

/**
 * Counselor Core Phase F. Non-opportunity candidates (requirement_action, profile_task) are
 * always known_eligible — both are generated only from the student's own already-active
 * targets/profile, so no external eligibility gate applies to them at all.
 */
export function evaluateCandidateEligibility(candidate: CandidateAction, state: CounselorState): EligibilityResult {
  if (candidate.source.kind === "opportunity") {
    return evaluateOpportunityEligibility(candidate as CandidateAction & { source: { kind: "opportunity" } }, state);
  }
  return { verdict: "known_eligible" as EligibilityVerdict, notes: [] };
}
