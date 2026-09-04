import {
  insufficientVerificationReason,
  isOpportunityActionable,
  isOpportunitySufficientlyVerified,
  nonActionableOpportunityReason,
} from "@/lib/opportunities/lifecycle";
import { eligibilityMessages, isSameCountry } from "@/lib/opportunities/matching";
import { currentGradeLevel, gradeMatchesEligibility } from "@/lib/profile/grade-level";
import { eligibilityCopy } from "./copy";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import type { CandidateAction, CounselorState, EligibilityResult, EligibilityVerdict } from "./types";

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
function evaluateOpportunityEligibility(
  candidate: CandidateAction & { source: { kind: "opportunity" } },
  state: CounselorState,
  referenceDate: Date,
  locale: Locale
): EligibilityResult {
  const entry = state.eligibleOpportunityMatches.find((e) => e.opportunity.id === candidate.source.opportunityId);
  if (!entry) {
    return { verdict: "unknown", notes: [eligibilityCopy.dataNotFound(locale)] };
  }
  const { opportunity } = entry;

  // Defense-in-depth for spec §37's "unverified opportunities never appear as verified"
  // invariant: lib/counselor/state.ts's DB query already restricts eligibleOpportunityMatches
  // to verification_state = 'verified_current' before this point, but that's untested
  // DB-boundary code (this repo's convention) — this check makes the invariant hold on its
  // own, independent of the caller having filtered correctly upstream.
  if (opportunity.verification_state !== "verified_current") {
    return { verdict: "known_ineligible", notes: [eligibilityCopy.notVerified(locale)] };
  }

  // A hard, structured "not actionable right now" check — independent of matching.ts, which
  // looks at neither cycle_status nor deadline. Delegates to lib/opportunities/lifecycle.ts so
  // this path enforces BOTH halves of that rule (closed cycle AND passed deadline) rather than
  // a local copy of one half: this file previously kept its own INACTIVE_CYCLE_STATUSES set
  // and checked only the cycle, so a row whose deadline had passed while its cycle_status
  // stayed a legitimately-actionable value (`date_not_announced`, `open`) was recommended as a
  // next action no student could take. Read-time by design — it self-heals the moment
  // ingestion refreshes `deadline` to a real next-cycle date, with no write or backfill.
  if (!isOpportunityActionable(opportunity, referenceDate)) {
    return { verdict: "known_ineligible", notes: [nonActionableOpportunityReason(opportunity, locale)] };
  }

  // The third lifecycle gate (lib/opportunities/lifecycle.ts), and the one the two above
  // structurally cannot cover: an opportunity that closed quietly with no deadline ever
  // recorded. Checked AFTER the two date rules deliberately, so a genuinely closed or expired
  // row keeps its specific, more informative reason rather than being described as merely
  // unverified.
  //
  // EXCLUDED here rather than demoted, unlike Browse and the detail page which label it. This
  // is the ranked-recommendation chokepoint: rankCandidates filters on known_ineligible, and
  // its output is the hard top-3 behind the dashboard's "this week" block, the advisor's
  // priorities, and lib/ai/weekly-plan.ts — which hands these to the model described as
  // verified, eligible candidate actions. Demoting inside a three-slot list is
  // indistinguishable from exclusion for ranks 4+, and for ranks 1-3 it would still present an
  // unevidenced row as a priority. Exclusion stays the right severity HERE; the demote-and-label
  // treatment stays right on Browse, which has somewhere to put a caveat.
  //
  // What this no longer does is fire on pipeline lineage. It first shipped keyed on
  // `last_verified_at IS NULL`, described as "never verified" — but `opportunities` carries two
  // verification timestamps, no row has both null, and the 51 rows excluded here were the
  // highest-provenance records in the catalogue (all `verified_current`, all high confidence,
  // all with a `verified_at` from the preceding week). The gate now requires the absence of
  // BOTH, which is the honest reading and which excludes zero rows today. See the extended
  // discussion in lib/opportunities/lifecycle.ts — including why `verified_at` is used only as
  // a floor against total absence of evidence and never as a freshness measurement.
  if (!isOpportunitySufficientlyVerified(opportunity, referenceDate)) {
    return { verdict: "known_ineligible", notes: [insufficientVerificationReason(locale)] };
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
  const ageEligibilityConfirmedOpen = opportunity.age_eligibility_confirmed_open ?? false;
  if (hasAgeRestriction && birthYear === null) {
    notes.push(eligibilityMessages.ageUnknown(locale));
  } else if (!hasAgeRestriction && !ageEligibilityConfirmedOpen) {
    // No bound recorded at all — not evidence every age is welcome, just never researched,
    // unless migration 0126's flag says a research pass explicitly confirmed there's
    // genuinely no age gate. Same principle as the countryEligibilityUnverified note below,
    // applied to the field that had no equivalent safeguard until now (2026-09-03 named the
    // gap, 0126 closes it). Migration 0129's third case: checked, page doesn't say --
    // suppresses this same alarm-toned note in favor of a calmer, distinct one, same
    // reasoning as lib/opportunities/matching.ts's own identical branch.
    if (opportunity.age_eligibility_basis === "checked_not_stated") {
      notes.push(eligibilityMessages.ageEligibilityCheckedNotStated(opportunity.last_verified_at ?? "", locale));
    } else {
      notes.push(eligibilityMessages.ageEligibilityUnverified(locale));
    }
  }

  // --- Country / residency (eligible_countries is the existing, already-in-wide-use
  // structured signal for this — see migration 0047's own comment for why a second
  // "residency countries" column would just duplicate it). Known mismatch is a hard
  // exclusion here, independently of matching.ts's own upstream gate. ---
  const hasCountryRestriction = opportunity.eligible_countries.length > 0;
  if (hasCountryRestriction) {
    if (!studentCountry) {
      notes.push(eligibilityMessages.countryUnknown(locale));
    } else if (!matchesAnyKnownCountry([studentCountry], opportunity.eligible_countries)) {
      return { verdict: "known_ineligible", notes: [eligibilityMessages.countryNotEligible(studentCountry, locale)] };
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
      notes.push(eligibilityMessages.citizenshipUnknown(locale));
    } else if (!matchesAnyKnownCountry(citizenshipCountries, eligibleCitizenships)) {
      return {
        verdict: "known_ineligible",
        notes: [eligibilityMessages.citizenshipNotEligible(eligibleCitizenships.join(", "), citizenshipCountries.join(", "), locale)],
      };
    }
  }

  // --- Free-text citizenship/residency evidence (unparsed, never a hard exclusion on its
  // own — this is the fallback for restrictions too complex for the structured columns
  // above, e.g. "citizens, permanent residents, or F-1 visa holders with 3+ years
  // residence"). Still surfaced whenever the structured column above didn't already resolve
  // it, since it's real evidence a student should see even if Oryn can't act on it alone. ---
  if (opportunity.citizenship_restrictions && !hasCitizenshipRestriction) {
    notes.push(eligibilityMessages.citizenshipRestrictionOnFile(opportunity.citizenship_restrictions, locale));
  }
  if (opportunity.residency_restrictions && !hasCountryRestriction) {
    notes.push(eligibilityMessages.residencyRestrictionOnFile(opportunity.residency_restrictions, locale));
  }

  // --- Unverified country eligibility (migration 0060, read defensively like 0047's
  // eligible_citizenships above). An empty eligible_countries has two live meanings —
  // research-confirmed open (deliberately stored empty) and never-researched (~90% of
  // live rows, docs/handoffs/opportunities-eligible-countries-gap.md Key Finding 1) —
  // and only the confirmed-open marker distinguishes them. When the row carries NO
  // eligibility signal at all (no structured lists, no restriction prose above, no
  // confirmed-open marker), silence would present unresearched data as "open to you" —
  // exactly the unknown-called-eligible failure Assumption A2 forbids. An advisory note,
  // never an exclusion: absence of research is not evidence of a restriction either. ---
  const countryEligibilityConfirmedOpen = opportunity.country_eligibility_confirmed_open ?? false;
  const hasUnstructuredRestrictionEvidence = Boolean(opportunity.citizenship_restrictions || opportunity.residency_restrictions);
  if (!hasCountryRestriction && !hasCitizenshipRestriction && !hasUnstructuredRestrictionEvidence && !countryEligibilityConfirmedOpen) {
    // Migration 0133's third case, same reasoning as the age/grade branches above: a
    // research pass checked the official page and it simply doesn't state a country/
    // citizenship requirement either way, distinct from "nobody's looked" (the default).
    if (opportunity.country_eligibility_basis === "checked_not_stated") {
      notes.push(eligibilityMessages.countryEligibilityCheckedNotStated(opportunity.last_verified_at ?? "", locale));
    } else {
      notes.push(eligibilityMessages.countryEligibilityUnverified(locale));
    }
  }

  // --- Grade level, computed from graduation_year (lib/profile/grade-level.ts) — closes
  // docs/counselor-core.md's documented limitation #5 ("Oryn doesn't derive a student's
  // current grade from graduation_year anywhere"). Arithmetic on a fact the student already
  // gave, not an inference beyond it; still a known-data mismatch, so a real one is a hard
  // exclusion, matching the same standard applied to country/citizenship above. ---
  if (opportunity.eligible_grades.length > 0) {
    const grade = currentGradeLevel(graduationYear);
    if (grade === null) {
      notes.push(eligibilityMessages.gradeUnknown(locale));
    } else if (!gradeMatchesEligibility(grade, opportunity.eligible_grades)) {
      return { verdict: "known_ineligible", notes: [eligibilityMessages.gradeNotEligible(opportunity.eligible_grades.join(", "), grade, locale)] };
    }
  } else if (!(opportunity.grade_eligibility_confirmed_open ?? false)) {
    // No eligible_grades recorded at all — not evidence every grade is welcome, just never
    // researched, unless migration 0126's flag says a research pass explicitly confirmed
    // there's genuinely no grade gate. Same principle as the age branch above. Migration
    // 0129's third case, same reasoning as the age branch's own comment above.
    if (opportunity.grade_eligibility_basis === "checked_not_stated") {
      notes.push(eligibilityMessages.gradeEligibilityCheckedNotStated(opportunity.last_verified_at ?? "", locale));
    } else {
      notes.push(eligibilityMessages.gradeEligibilityUnverified(locale));
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
 *
 * `referenceDate` defaults to now so existing callers keep working; lib/counselor/scoring.ts
 * passes the same reference date it already threads through rankCandidates, so a caller
 * evaluating "as of" some other date gets one consistent answer across eligibility and urgency.
 *
 * `locale` defaults to English, same reasoning as evidence.ts's buildRecommendation — only
 * lib/counselor/scoring.ts's two call sites need to pass a resolved student locale through;
 * every other existing caller is unaffected.
 */
export function evaluateCandidateEligibility(
  candidate: CandidateAction,
  state: CounselorState,
  referenceDate: Date = new Date(),
  locale: Locale = DEFAULT_LOCALE
): EligibilityResult {
  if (candidate.source.kind === "opportunity") {
    return evaluateOpportunityEligibility(candidate as CandidateAction & { source: { kind: "opportunity" } }, state, referenceDate, locale);
  }
  return { verdict: "known_eligible" as EligibilityVerdict, notes: [] };
}
