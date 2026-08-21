import { isSameCountry } from "@/lib/opportunities/matching";
import type { ProgramSubjectTaxonomy } from "@/types/database";

/**
 * Does this field exist as an *undergraduate* admission object in this country at all?
 *
 * `RULE-ADMISSIONS-021` (`docs/research/admissions-systems/README.md`), confirmed
 * independently by two program-family research passes: **Medicine and Law are
 * graduate-entry-only in the United States, and Law effectively so in Canada** outside a
 * Quebec CEGEP-linked civil-law route that is realistically closed to anyone not schooled in
 * the Quebec CEGEP system. This is a structural category difference, not a harder version of
 * the same process.
 *
 * The defect this closes (`docs/research/admissions-systems/implementation-gap/README.md`
 * Gap 4, Tier 0): `computeAdmissionOutlook` takes no field parameter at all, so a student
 * whose stated target is undergraduate Medicine in the US receives a confident
 * reach/competitive/likely classification computed for a degree path that does not exist.
 * The audit called this "the single clearest case in this whole analysis of the product
 * giving a confidently wrong answer rather than an honest unknown."
 *
 * Two things this module deliberately does not do:
 *
 * - **It does not return `"offered"` for fields it has not checked.** Only Medicine and Law
 *   were researched to the standard RULE-ADMISSIONS-021 sets; asserting that Engineering is
 *   an undergraduate object in all 15 countries would be an inference, not a finding. Every
 *   other (country, field) pair is `"unknown"`, which suppresses nothing.
 * - **It does not merge with Gate 1's `not_applicable`.** "This system does not review your
 *   activities" and "this is not an undergraduate degree here" are different statements, and
 *   the audit explicitly warned that collapsing them into one value would recreate the same
 *   over-coarse-enum problem Gate 1's three shapes exist to avoid.
 */

export type UndergraduateFieldAvailability =
  /** Confirmed to exist as an undergraduate-entry credential in this country. */
  | "offered"
  /** Confirmed NOT to exist as an undergraduate-entry credential in this country. */
  | "not_offered_at_undergraduate"
  /** Not established — no researched claim either way. Never treated as either of the above. */
  | "unknown";

export interface FieldAvailabilityResult {
  availability: UndergraduateFieldAvailability;
  /** Student-facing explanation of what the real route is. Null unless
   * `not_offered_at_undergraduate` — there is nothing to explain in the other two states,
   * and inventing reassuring copy for `"unknown"` would be the false-confidence problem
   * this module exists to fix. */
  explanation: string | null;
  /** A named, sourced exception this check does not cover, when one exists. Present so the
   * product never states a categorical negative that the research itself qualifies. */
  caveat: string | null;
  sources: string[];
}

interface FieldAvailabilityEntry {
  countryNames: string[];
  field: ProgramSubjectTaxonomy;
  explanation: string;
  caveat: string | null;
}

const RULE_021 = "docs/research/admissions-systems/README.md#rule-admissions-021";
const PROGRAM_DOCS = "docs/research/admissions-systems/program-requirements/";

const US_NAMES = ["United States", "United States of America", "USA", "US"];
const CANADA_NAMES = ["Canada"];

const NOT_OFFERED_AT_UNDERGRADUATE: FieldAvailabilityEntry[] = [
  {
    countryNames: US_NAMES,
    field: "medicine",
    explanation:
      "Medicine is not an undergraduate degree in the United States. You earn a bachelor's degree first — in any subject, alongside the pre-med course requirements — and apply to medical school for the MD afterwards. There is no undergraduate Medicine programme to be admitted to.",
    caveat:
      "A small number of US universities run combined BS/MD programmes admitting from high school; these are separate, individually-named programmes, not undergraduate Medicine admission.",
  },
  {
    countryNames: US_NAMES,
    field: "law",
    explanation:
      "Law is not an undergraduate degree in the United States. The JD is a postgraduate degree; undergraduates take a bachelor's in any subject first and apply to law school afterwards.",
    caveat: null,
  },
  {
    countryNames: CANADA_NAMES,
    field: "medicine",
    explanation:
      "Medicine is not an undergraduate degree in Canada. You complete a bachelor's degree first and apply to medical school afterwards.",
    caveat: null,
  },
  {
    countryNames: CANADA_NAMES,
    field: "law",
    explanation:
      "Law is effectively not an undergraduate degree in Canada. The JD is a postgraduate degree taken after a bachelor's.",
    caveat:
      "Quebec's CEGEP-linked civil-law route is the one exception, and it is realistically available only to students schooled in the Quebec CEGEP system — not a general alternative for an international applicant.",
  },
];

/** Countries whose Medicine and Law programmes the research package confirms as
 * undergraduate-entry. RULE-ADMISSIONS-021 states the US/Canada position as "a structural
 * category difference from all 13 other countries in this package," so the positive claim is
 * only made for the countries that package actually covers. */
const UNDERGRADUATE_MEDICINE_AND_LAW_COUNTRIES = [
  "United Kingdom", "UK", "Great Britain", "England", "Scotland", "Wales", "Northern Ireland",
  "Turkey", "Türkiye", "Turkiye",
  "Germany", "Netherlands", "The Netherlands", "Italy", "France", "Spain", "Switzerland",
  "Ireland", "Australia", "New Zealand", "Singapore",
  "Hong Kong", "Hong Kong SAR", "Hong Kong SAR China",
];

const CHECKED_FIELDS: ProgramSubjectTaxonomy[] = ["medicine", "law"];

const UNKNOWN: FieldAvailabilityResult = { availability: "unknown", explanation: null, caveat: null, sources: [] };

export interface FieldAvailabilityQuery {
  /** `universities.country`. */
  country: string | null;
  /** The student's intended field at this target. */
  field: ProgramSubjectTaxonomy | null;
}

/**
 * Total: an unknown country, an unstated field, or any field outside the two this package
 * researched all return `"unknown"`, which changes nothing downstream.
 */
export function checkUndergraduateFieldAvailability(query: FieldAvailabilityQuery): FieldAvailabilityResult {
  const country = query.country?.trim();
  if (!country || !query.field || !CHECKED_FIELDS.includes(query.field)) return UNKNOWN;

  const blocked = NOT_OFFERED_AT_UNDERGRADUATE.find(
    (entry) => entry.field === query.field && entry.countryNames.some((name) => isSameCountry(name, country))
  );
  if (blocked) {
    return {
      availability: "not_offered_at_undergraduate",
      explanation: blocked.explanation,
      caveat: blocked.caveat,
      sources: [RULE_021, `${PROGRAM_DOCS}${query.field}.md`],
    };
  }

  if (UNDERGRADUATE_MEDICINE_AND_LAW_COUNTRIES.some((name) => isSameCountry(name, country))) {
    return { availability: "offered", explanation: null, caveat: null, sources: [RULE_021, `${PROGRAM_DOCS}${query.field}.md`] };
  }

  return UNKNOWN;
}
