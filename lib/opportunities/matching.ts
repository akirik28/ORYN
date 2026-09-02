import { clampScore } from "@/lib/scoring/math";
import { normalizeEntitySearchText } from "@/lib/entities/normalize";
import { currentGradeLevel, gradeMatchesEligibility } from "@/lib/profile/grade-level";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
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
  /** Computed from this student's own `not_interested` dismissal history — see
   * computeAvoidSignals below. Optional: absent (not merely empty) for any caller that
   * hasn't fetched dismissal history, which must behave identically to a student with zero
   * dismissals — no relevance penalty applies either way, so omitting this is always safe. */
  dismissedSignals?: DismissalAvoidSignals;
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
  /** Free-text citizenship/residency restriction prose (opportunities.citizenship_restrictions
   * / residency_restrictions) — too unstructured for the allow-list checks above to parse, but
   * real evidence a student should see. Surfaced below with the exact wording lib/counselor/
   * eligibility.ts's evaluateOpportunityEligibility already uses for the same two columns, so
   * the card and the Advisor never disagree about what one row's own text says. Package 8 fix:
   * this function previously received only a boolean summary of "prose exists" here, and used
   * it solely to suppress the generic "not verified yet" note below — going completely silent
   * (eligible: true, notes: null) on a row whose own text describes a real restriction, live-
   * confirmed on Garcia Summer Research Program. Optional/null: no prose on file, never
   * "confirmed unrestricted." */
  citizenshipRestrictions?: string | null;
  residencyRestrictions?: string | null;
  fields: string[];
  /** The opportunity's own base country (distinct from `eligibleCountries`, which is who
   * may apply — an in-person program based in France could still be open worldwide).
   * Used only for a relevance boost below, never eligibility: an opportunity outside a
   * student's country is not a reason to hide it, only a reason to rank it lower. */
  country: string | null;
  /** Feeds the too_expensive avoid-signal below. Optional/null: no price on file, never
   * "free." */
  cost?: number | null;
  /** Feeds the location avoid-signal below. Optional/null for callers that don't fetch it
   * yet. */
  locationMode?: "online" | "in_person" | "hybrid" | null;
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
/**
 * The single source of the eligibility sentences shared with
 * `lib/counselor/eligibility.ts`'s `evaluateOpportunityEligibility` (via `eligibilityMessages`
 * below) — until 2026-09-01 that file kept its own independent copy in
 * `lib/counselor/copy.ts`'s `eligibilityCopy`, translated faithfully but never reconciled, so
 * a student reading an opportunity from the Advisor page and then its own detail page saw two
 * different English sentences (and, after that translation pass, two different Turkish ones)
 * about the exact same restriction. Full before/after: `docs/known-issues.md`'s "two
 * independent eligibility pipelines" entry (now resolved, kept there for history).
 *
 * This file's wording won for two independent reasons, not just "pick one": (1) it already
 * addresses the student with the informal `sen` register Turkish grammar distinguishes from
 * formal `siz` — `copy.ts`'s version used `siz` ("doğum yılınız", "sizinki"), which was the
 * lone formal-register surface in an otherwise-informal product (confirmed against this same
 * i18n push's other packages — signup, the public profile, search all use `sen`), not a
 * deliberate choice anyone had made; (2) it's shorter, matching the product's own stated copy
 * preference for direct phrasing over a fuller explanatory clause (spec Phase 56). Two of
 * `copy.ts`'s ten sentences were genuinely more complete, not just wordier — the
 * citizenship-known-ineligible and grade-known-ineligible branches also stated what's
 * currently on file, which is real information a student can use to catch a data-entry
 * mistake on their own profile — so `citizenshipNotEligible`/`gradeNotEligible` below keep
 * that detail even though the surrounding sentence is the terser version.
 *
 * `locale` is additive (defaults to English, same pattern as every other lib/-side reasoning
 * function this i18n effort has threaded a locale through) — found and fixed as part of the
 * advisor package, not the earlier opportunities pass, because these notes are
 * `eligibility_notes`/warnings shown on BOTH the opportunities cards AND the Counselor's own
 * recommendation warnings (lib/counselor/evidence.ts reads `ranked.eligibility.notes` straight
 * from this function's output). Real numbers, not a guess: measured 2026-09-01, 325 of 623
 * currently "strong match" opportunities carry a note here, and 110 of those say "add your
 * birth year to check" — a Turkish student was seeing English on roughly a third of their best
 * recommendations. The two "restriction on file" notes below echo
 * `opportunity.citizenshipRestrictions`/`residencyRestrictions` verbatim (sourced prose from
 * the opportunity's own record) — only their prefix is translated, matching this whole
 * effort's "sourced text stays as stored" rule.
 */
export const eligibilityMessages = {
  ageUnknown: (locale: Locale) => (locale === "tr" ? "Yaş şartı var — kontrol etmek için doğum yılını ekle." : "Has an age requirement — add your birth year to check."),

  countryUnknown: (locale: Locale) => (locale === "tr" ? "Ülkeye göre kısıtlı — kontrol etmek için ülkeni ekle." : "Restricted by country — add your country to check."),

  // studentCountry is stored, proper-noun profile data — never translated (lib/counselor/
  // copy.ts's file header has the fuller reasoning: the surrounding Turkish grammar is built
  // so no suffix has to attach to it).
  countryNotEligible: (studentCountry: string, locale: Locale) =>
    locale === "tr" ? `Şu anda ${studentCountry} öğrencilerine açık değil.` : `Not currently open to students from ${studentCountry}.`,

  citizenshipUnknown: (locale: Locale) =>
    locale === "tr" ? "Belirli bir vatandaşlık gerektiriyor — kontrol etmek için Ayarlar'a kendi vatandaşlığını ekle." : "Requires a specific citizenship — add yours in Settings to check.",

  // `onFile` is the "kept from copy.ts" enrichment described above — both callers already
  // have this in scope (the student's own citizenshipCountries), it was only ever a matter of
  // whether the sentence said it.
  citizenshipNotEligible: (eligible: string, onFile: string, locale: Locale) =>
    locale === "tr" ? `Gerekli vatandaşlık: ${eligible}; kayıtlı vatandaşlığın: ${onFile}.` : `Requires citizenship in ${eligible}; citizenship on file is ${onFile}.`,

  citizenshipRestrictionOnFile: (restriction: string, locale: Locale) =>
    locale === "tr" ? `Kayıtlı vatandaşlık kısıtlaması (otomatik doğrulanmadı): ${restriction}` : `Citizenship restriction on file (not automatically verified): ${restriction}`,

  residencyRestrictionOnFile: (restriction: string, locale: Locale) =>
    locale === "tr" ? `Kayıtlı ikamet kısıtlaması (otomatik doğrulanmadı): ${restriction}` : `Residency restriction on file (not automatically verified): ${restriction}`,

  countryEligibilityUnverified: (locale: Locale) =>
    locale === "tr" ? "Ülke uygunluğu henüz doğrulanmadı — kısıtlamalar için resmi sayfayı kontrol et." : "Country eligibility not verified yet — check the official page for restrictions.",

  gradeUnknown: (locale: Locale) => (locale === "tr" ? "Sınıf seviyesine göre kısıtlı — kontrol etmek için mezuniyet yılını ekle." : "Restricted by grade level — add your graduation year to check."),

  // `currentGrade` is the same kind of "kept from copy.ts" enrichment as citizenshipNotEligible
  // above.
  gradeNotEligible: (eligibleGrades: string, currentGrade: number, locale: Locale) =>
    locale === "tr" ? `Uygun sınıflar: ${eligibleGrades}; şu anki sınıfın: ${currentGrade}.` : `Restricted to grades ${eligibleGrades}; you're currently grade ${currentGrade}.`,
};

export function computeEligibility(
  student: StudentMatchProfile,
  opportunity: OpportunityForMatching,
  savedStatus: SavedOpportunityStatus | null = null,
  locale: Locale = DEFAULT_LOCALE
): EligibilityResult {
  const tr = locale === "tr";

  if (savedStatus === "applied") {
    return { eligible: false, notes: tr ? "Bu fırsata zaten başvurdun." : "You already applied to this." };
  }
  if (savedStatus === "not_interested") {
    return { eligible: false, notes: tr ? "Bunu zaten ilgilenmiyorum olarak işaretledin." : "You already marked this not interested." };
  }

  const unknownNotes: string[] = [];

  const hasAgeRestriction = opportunity.minimumAge !== null || opportunity.maximumAge !== null;
  if (hasAgeRestriction && student.age === null) {
    unknownNotes.push(eligibilityMessages.ageUnknown(locale));
  } else {
    if (opportunity.minimumAge !== null && student.age !== null && student.age < opportunity.minimumAge) {
      return { eligible: false, notes: tr ? `Asgari ${opportunity.minimumAge} yaş gerektiriyor.` : `Requires minimum age ${opportunity.minimumAge}.` };
    }
    if (opportunity.maximumAge !== null && student.age !== null && student.age > opportunity.maximumAge) {
      return { eligible: false, notes: tr ? `Azami ${opportunity.maximumAge} yaş gerektiriyor.` : `Requires maximum age ${opportunity.maximumAge}.` };
    }
  }

  const hasCountryRestriction = opportunity.eligibleCountries.length > 0;
  if (hasCountryRestriction) {
    if (!student.country) {
      unknownNotes.push(eligibilityMessages.countryUnknown(locale));
    } else if (!opportunity.eligibleCountries.some((eligible) => isSameCountry(eligible, student.country!))) {
      return { eligible: false, notes: eligibilityMessages.countryNotEligible(student.country, locale) };
    }
  }

  const eligibleCitizenships = opportunity.eligibleCitizenships ?? [];
  const hasCitizenshipRestriction = eligibleCitizenships.length > 0;
  if (hasCitizenshipRestriction) {
    const citizenshipCountries = student.citizenshipCountries ?? [];
    if (citizenshipCountries.length === 0) {
      unknownNotes.push(eligibilityMessages.citizenshipUnknown(locale));
    } else if (!citizenshipCountries.some((c) => eligibleCitizenships.some((e) => isSameCountry(c, e)))) {
      return {
        eligible: false,
        notes: eligibilityMessages.citizenshipNotEligible(eligibleCitizenships.join(", "), citizenshipCountries.join(", "), locale),
      };
    }
  }

  // Free-text citizenship/residency evidence — same wording and same gating (only surfaced
  // when the structured column above didn't already resolve the same question) as
  // lib/counselor/eligibility.ts's evaluateOpportunityEligibility, so the card and the
  // Advisor never disagree about what one row's own text says. THE FIX (Package 8): before
  // this, the row went completely silent whenever a structured allow-list was absent but
  // prose existed — the counselor surfaced it, this function didn't, live-confirmed on
  // Garcia Summer Research Program. 39 of 199 currently-actionable live rows carry prose
  // this now surfaces that previously produced no note at all (verified against
  // oryn-qa-scratch, 2026-08-22).
  if (opportunity.citizenshipRestrictions && !hasCitizenshipRestriction) {
    unknownNotes.push(eligibilityMessages.citizenshipRestrictionOnFile(opportunity.citizenshipRestrictions, locale));
  }
  if (opportunity.residencyRestrictions && !hasCountryRestriction) {
    unknownNotes.push(eligibilityMessages.residencyRestrictionOnFile(opportunity.residencyRestrictions, locale));
  }

  // Empty eligibleCountries has two live meanings: research-confirmed open (deliberately
  // stored empty) and never-researched (~90% of live rows). Only the first has earned
  // silence. Without the confirmed-open marker — and with no other eligibility evidence on
  // the row (a structured citizenship gate, or the restriction prose just surfaced above) —
  // the honest claim is "not verified," said out loud, not implied openness (Phase 68: know
  // when you don't know). Still an unknown-note, never an exclusion: absence of research is
  // not evidence of a restriction either.
  const hasUnstructuredRestrictionEvidence = Boolean(opportunity.citizenshipRestrictions || opportunity.residencyRestrictions);
  if (
    !hasCountryRestriction &&
    !hasCitizenshipRestriction &&
    !hasUnstructuredRestrictionEvidence &&
    !(opportunity.countryEligibilityConfirmedOpen ?? false)
  ) {
    unknownNotes.push(eligibilityMessages.countryEligibilityUnverified(locale));
  }

  const eligibleGrades = opportunity.eligibleGrades ?? [];
  if (eligibleGrades.length > 0) {
    const grade = currentGradeLevel(student.graduationYear ?? null);
    if (grade === null) {
      unknownNotes.push(eligibilityMessages.gradeUnknown(locale));
    } else if (!gradeMatchesEligibility(grade, eligibleGrades)) {
      return { eligible: false, notes: eligibilityMessages.gradeNotEligible(eligibleGrades.join(", "), grade, locale) };
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

/**
 * `opportunities.fields` is uncontrolled free text and does not share a vocabulary with the
 * onboarding interest list (lib/validation/onboarding.ts's INTEREST_SUGGESTIONS). The same
 * concept is stored under several spellings — live today: `computer_science` on 6 actionable
 * rows and `computer science` on 5, plus `Mathematics` alongside `mathematics` and
 * `environmental_science` against onboarding's "Environmental Science".
 *
 * Under bare `toLowerCase()` those never matched, so a student who picked "Computer Science"
 * scored zero relevance against more than half the computer-science opportunities in the
 * catalogue. Treating `_` and `-` as spaces, and collapsing runs of whitespace, fixes that.
 *
 * This does NOT reintroduce the substring bug the exact-equality rule below exists to prevent:
 * separators are normalized, tokens are not. "science" still does not equal "computer science".
 */
function normalizeFieldLabel(value: string): string {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

/**
 * A per-student summary of `saved_opportunities.not_interested_reason` (spec section 12.1:
 * "Use this signal in recommendations" — never actually read anywhere until this pass; see
 * docs/not-interested-reason-audit-2026-09-02.md for the full audit this came out of).
 *
 * Deliberately covers three of the seven reasons, not all seven. The other four were judged
 * unsafe or not actionable, on purpose, not left out by oversight — see that doc:
 * `too_competitive` is a judgment about the *student*, and quietly steering someone who
 * dismisses hard things toward easier ones is the opposite of what this product is for, so
 * it feeds nothing here; `no_time` has no opportunity-level effort/hours data to filter
 * against yet (the product's real answer to "no time" is the separate weekly-time-budget
 * system, section 64/65); `already_applied` is a state, not a preference, and arguably
 * belongs on `status` directly rather than as a dismissal reason at all; `other` carries no
 * structured signal.
 *
 * Each of the three included signals requires AVOID_SIGNAL_MIN_OCCURRENCES separate
 * dismissals before it does anything — the same "don't fabricate a pattern from one data
 * point" discipline this codebase already applies to peer benchmarking (gate on n≥100, spec
 * section 19) and profile-strength claims generally. A single dismissal is already fully
 * acted on by computeEligibility's own per-opportunity hard exclusion above; this is a
 * separate, weaker, probabilistic signal about *other*, not-yet-dismissed opportunities, and
 * earns a correspondingly higher bar before it moves anything.
 */
export interface DismissalAvoidSignals {
  /** Normalized field labels (normalizeFieldLabel — same normalization computeRelevance
   * already uses for interest matching) with 2+ not_interested_topic dismissals sharing
   * that field. Counted per-field, not per-dismissal: two dismissals in unrelated fields
   * say nothing about either field specifically. */
  avoidFields: string[];
  /** The lowest cost among 2+ too_expensive dismissals — a future opportunity at or above
   * this floor gets a penalty, below it does not. The minimum, not the average or a fixed
   * threshold: "the cheapest thing they still called too expensive" is the most
   * conservative honest inference available from a handful of data points. Null when fewer
   * than 2 too_expensive dismissals carry a cost. */
  avoidCostFloor: number | null;
  /** True once 2+ dismissals were both reason=location AND for an in-person opportunity
   * not near the student (mirrors isNearStudent below, which already computes the
   * opposite signal — a proximity *boost* — so this reuses the same notion of "far" rather
   * than inventing a second one). An online/hybrid opportunity, or one already near the
   * student, is never penalized by this signal regardless of how it's set. */
  avoidsDistantInPerson: boolean;
}

/** How AVOID_SIGNAL_MIN_OCCURRENCES-gated a pattern needs to be before it moves a score —
 * see DismissalAvoidSignals' own comment for why this isn't 1. */
const AVOID_SIGNAL_MIN_OCCURRENCES = 2;

export interface DismissedOpportunitySignal {
  reason: string | null;
  fields: string[];
  cost: number | null;
  /** Precomputed by the caller (which has the student profile in scope already) rather
   * than recomputed here — keeps this function a pure aggregation step over data the
   * caller assembled, not a second place that reimplements isNearStudent. */
  isDistantInPerson: boolean;
}

/** Pure aggregation — no I/O, no student/opportunity matching logic beyond the caller-supplied
 * `isDistantInPerson`. Takes exactly this student's own past dismissals (already joined to
 * their reason and the dismissed opportunity's own fields/cost/location) and returns what,
 * if anything, future matching should treat as an avoid-signal. Called once per refresh
 * (lib/opportunities/persist-matches.ts), not once per opportunity being scored. */
export function computeAvoidSignals(dismissals: DismissedOpportunitySignal[]): DismissalAvoidSignals {
  const fieldCounts = new Map<string, number>();
  for (const d of dismissals) {
    if (d.reason !== "not_interested_topic") continue;
    for (const field of d.fields) {
      const normalized = normalizeFieldLabel(field);
      fieldCounts.set(normalized, (fieldCounts.get(normalized) ?? 0) + 1);
    }
  }
  const avoidFields = [...fieldCounts.entries()].filter(([, count]) => count >= AVOID_SIGNAL_MIN_OCCURRENCES).map(([field]) => field);

  const costDismissals = dismissals.filter((d) => d.reason === "too_expensive" && d.cost !== null).map((d) => d.cost as number);
  const avoidCostFloor = costDismissals.length >= AVOID_SIGNAL_MIN_OCCURRENCES ? Math.min(...costDismissals) : null;

  const distantInPersonDismissals = dismissals.filter((d) => d.reason === "location" && d.isDistantInPerson);
  const avoidsDistantInPerson = distantInPersonDismissals.length >= AVOID_SIGNAL_MIN_OCCURRENCES;

  return { avoidFields, avoidCostFloor, avoidsDistantInPerson };
}

/**
 * Why computeRelevance landed on its score -- not shown to the student directly, but the
 * input buildReasonCodes (lib/opportunities/persist-matches.ts) needs to decide what, if
 * anything, honest to say about relevance when the 70+ "matches_your_interests" bar isn't
 * cleared. Found live 2026-09-02 auditing 724 of 1,931 opportunity_matches rows with zero
 * reason codes: two thirds of those were "opportunity_fields_missing"/"student_interests_
 * missing" -- the 40-point default below firing because there was nothing to compare, not
 * because comparison found no overlap -- and conflating that with a genuine "no_overlap"
 * would say something false (implying Oryn checked and it didn't match, when Oryn couldn't
 * check at all).
 */
export type RelevanceBasis = "opportunity_fields_missing" | "student_interests_missing" | "some_overlap" | "no_overlap";

/** Which DismissalAvoidSignals actually moved this specific opportunity's score — empty
 * whenever the student has no dismissedSignals, or has some but none apply here. Exposed
 * (not just folded silently into the number) so buildReasonCodes can say so explicitly —
 * section 62's recommendation-explainability requirement applies to a penalty exactly as
 * much as to a boost; nothing about a student's own past choices should move a score
 * invisibly. */
export type AvoidReason = "topic" | "cost" | "location";

interface RelevanceComputation {
  score: number;
  basis: RelevanceBasis;
  matchedInterests: string[];
  avoidReasons: AvoidReason[];
}

const AVOID_FIELD_PENALTY = 20;
const AVOID_COST_PENALTY = 15;
const AVOID_DISTANT_PENALTY = 15;

/** Applied uniformly after the base score, regardless of which branch below computed it —
 * cost and location avoid-signals don't depend on interest/field overlap at all, so they
 * apply even in the two early-return "nothing to compare" cases above. Subtractive, capped
 * by clampScore same as every boost in this file, and never taken below the eligibility
 * question itself — an avoided opportunity still shows, just lower, exactly like a `saved`
 * bookmark still shows lower than a strong match. This never excludes; only
 * computeEligibility's direct per-opportunity dismissal does that. */
function applyAvoidSignals(
  baseScore: number,
  opportunity: OpportunityForMatching,
  near: boolean,
  avoid: DismissalAvoidSignals | undefined
): { score: number; avoidReasons: AvoidReason[] } {
  if (!avoid) return { score: baseScore, avoidReasons: [] };

  let score = baseScore;
  const avoidReasons: AvoidReason[] = [];

  if (avoid.avoidFields.length > 0) {
    const oppFields = opportunity.fields.map(normalizeFieldLabel);
    if (avoid.avoidFields.some((field) => oppFields.includes(field))) {
      score -= AVOID_FIELD_PENALTY;
      avoidReasons.push("topic");
    }
  }

  if (avoid.avoidCostFloor !== null && opportunity.cost != null && opportunity.cost >= avoid.avoidCostFloor) {
    score -= AVOID_COST_PENALTY;
    avoidReasons.push("cost");
  }

  if (avoid.avoidsDistantInPerson && opportunity.locationMode === "in_person" && !near) {
    score -= AVOID_DISTANT_PENALTY;
    avoidReasons.push("location");
  }

  return { score: clampScore(score), avoidReasons };
}

function computeRelevance(student: StudentMatchProfile, opportunity: OpportunityForMatching): RelevanceComputation {
  const near = isNearStudent(student, opportunity);

  if (opportunity.fields.length === 0) {
    const { score, avoidReasons } = applyAvoidSignals(40 + (near ? PROXIMITY_BOOST : 0), opportunity, near, student.dismissedSignals);
    return { score, basis: "opportunity_fields_missing", matchedInterests: [], avoidReasons };
  }
  if (student.interests.length === 0) {
    const { score, avoidReasons } = applyAvoidSignals(40 + (near ? PROXIMITY_BOOST : 0), opportunity, near, student.dismissedSignals);
    return { score, basis: "student_interests_missing", matchedInterests: [], avoidReasons };
  }

  const fields = opportunity.fields.map(normalizeFieldLabel);
  // counselor-loop QA defect #3 (docs/handoffs/counselor-loop-qa-report.md): substring
  // containment (field.includes(interest) / interest.includes(field)) treats "computer
  // science" as matching a field merely called "science" — the shorter string being a
  // substring of the longer one is not the same as the two naming the same field. Exact
  // (post-normalization) equality only; each array entry is already meant to be one field/
  // interest, not a combined phrase to search within.
  //
  // matchedInterests keeps the student's own original-cased entries (not the normalized
  // form used only for comparison) -- these are what a reason sentence would name back to
  // the student, and normalizeFieldLabel's output ("computer science", lowercased) is not
  // fit to display as their own stated interest.
  const matchedInterests = student.interests.filter((interest) => fields.includes(normalizeFieldLabel(interest)));

  const baseScore = (matchedInterests.length / student.interests.length) * 100 + (near ? PROXIMITY_BOOST : 0);
  const { score, avoidReasons } = applyAvoidSignals(baseScore, opportunity, near, student.dismissedSignals);
  return { score, basis: matchedInterests.length > 0 ? "some_overlap" : "no_overlap", matchedInterests, avoidReasons };
}

interface ProfileNeedComputation {
  score: number;
  matchedDimensions: ProfileDimension[];
}

function computeProfileNeed(student: StudentMatchProfile, opportunity: OpportunityForMatching): ProfileNeedComputation {
  const relevantDimensions = CATEGORY_DIMENSIONS[opportunity.category] ?? [];
  const matchedDimensions = relevantDimensions.filter((dimension) => student.weakestDimensions.includes(dimension));
  return { score: matchedDimensions.length > 0 ? 85 : 45, matchedDimensions };
}

export interface OpportunityMatchResult {
  eligible: boolean;
  eligibilityNotes: string | null;
  relevanceScore: number;
  profileNeedScore: number;
  matchScore: number;
  /** Why relevanceScore landed where it did -- see RelevanceBasis's own comment. Lets
   * buildReasonCodes distinguish "genuinely no shared interest" from "couldn't tell" rather
   * than treating both as equally silent. */
  relevanceBasis: RelevanceBasis;
  /** The student's own stated interests (original casing) that matched this opportunity's
   * fields -- empty whenever relevanceBasis isn't "some_overlap". */
  matchedInterests: string[];
  /** The student's weakest dimensions that this opportunity's category also targets --
   * empty whenever profileNeedScore is 45 (the category addresses none of them). */
  matchedGapDimensions: ProfileDimension[];
  /** Which of the student's own dismissal-derived avoid-signals reduced relevanceScore for
   * this opportunity, if any -- see AvoidReason's own comment on why this is surfaced
   * rather than folded silently into the number. */
  avoidReasons: AvoidReason[];
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
  savedStatus: SavedOpportunityStatus | null = null,
  locale: Locale = DEFAULT_LOCALE
): OpportunityMatchResult {
  const { eligible, notes } = computeEligibility(student, opportunity, savedStatus, locale);
  const relevance = computeRelevance(student, opportunity);
  const profileNeed = computeProfileNeed(student, opportunity);
  const matchScore = eligible ? clampScore(relevance.score * 0.4 + profileNeed.score * 0.6) : 0;

  return {
    eligible,
    eligibilityNotes: notes,
    relevanceScore: relevance.score,
    profileNeedScore: profileNeed.score,
    matchScore,
    relevanceBasis: relevance.basis,
    matchedInterests: relevance.matchedInterests,
    matchedGapDimensions: profileNeed.matchedDimensions,
    avoidReasons: relevance.avoidReasons,
  };
}

export type MatchTier = "exceptional" | "strong" | "worthALook" | "lowPriority";

/**
 * The score -> tier boundaries every surface that shows a match qualitatively (not as a raw
 * percentage) shares -- features/opportunities/opportunity-card.tsx's tierFor and
 * app/(app)/opportunities/[id]/page.tsx's fitLabel each duplicated these same four numbers
 * before this existed, one per surface's own copy register ("match" vs "fit" -- see either
 * file's own comment for why that split is deliberate, not a shortcut). Pulled out here so a
 * third surface (features/dashboard/dashboard-view.tsx's opportunity preview, which used to
 * show the bare matchScore percentage with no label at all) can reuse the identical
 * boundaries without a fourth copy of the same four numbers, while still choosing its own
 * label register via messages/*.json's opportunities.matchTier keys.
 */
export function matchTierKey(score: number): MatchTier {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "strong";
  if (score >= 40) return "worthALook";
  return "lowPriority";
}
