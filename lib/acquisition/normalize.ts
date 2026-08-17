/**
 * Normalisation shared by every acquisition path.
 *
 * Country aliasing and name-variant generation were previously inline in
 * scripts/enrich-student-counts.ts; they live here now so the ROR/OpenAlex pipeline and the
 * Wikidata pipeline agree about what "same country" and "same institution" mean. Two
 * pipelines with two different opinions on that is how duplicate universities get created.
 */

/** Countries whose names differ between our rows and external registries. Keyed by the
 * lowercased form we store; the set is every form we will accept as the same place. */
const COUNTRY_ALIASES: Record<string, Set<string>> = {
  "united states": new Set(["united states of america", "united states", "usa", "us"]),
  "united kingdom": new Set(["united kingdom", "great britain", "uk"]),
  "hong kong sar": new Set(["hong kong", "hong kong sar", "hong kong sar china"]),
  "macao sar": new Set(["macau", "macao", "macao sar"]),
  "south korea": new Set(["south korea", "republic of korea", "korea", "korea, republic of"]),
  czechia: new Set(["czechia", "czech republic"]),
  russia: new Set(["russia", "russian federation"]),
  "brunei darussalam": new Set(["brunei", "brunei darussalam"]),
  turkey: new Set(["turkey", "türkiye", "turkiye"]),
  netherlands: new Set(["netherlands", "the netherlands", "kingdom of the netherlands"]),
  "united arab emirates": new Set(["united arab emirates", "uae"]),
  taiwan: new Set(["taiwan", "taiwan, province of china", "chinese taipei"]),
  "mainland china": new Set(["china", "mainland china", "people's republic of china"]),
};

/** ISO 3166-1 alpha-2 → the country name form we store, for the countries in the pilot.
 * Registries return codes; our rows store names, so a code has to be resolved to a name
 * before it can be compared at all. */
const ISO2_TO_COUNTRY: Record<string, string> = {
  TR: "Turkey",
  NL: "Netherlands",
  DE: "Germany",
  GB: "United Kingdom",
  CH: "Switzerland",
  IT: "Italy",
  FR: "France",
  SE: "Sweden",
  IE: "Ireland",
  DK: "Denmark",
  ES: "Spain",
  CA: "Canada",
  US: "United States",
  SG: "Singapore",
  JP: "Japan",
  KR: "South Korea",
  HK: "Hong Kong SAR",
  AU: "Australia",
  BR: "Brazil",
  MX: "Mexico",
  ZA: "South Africa",
  IN: "India",
  AE: "United Arab Emirates",
  CN: "Mainland China",
  BE: "Belgium",
  AT: "Austria",
  NO: "Norway",
  FI: "Finland",
  PT: "Portugal",
  PL: "Poland",
  NZ: "New Zealand",
  CL: "Chile",
  AR: "Argentina",
  IL: "Israel",
  SA: "Saudi Arabia",
  MY: "Malaysia",
  TH: "Thailand",
  TW: "Taiwan",
};

export function countryFromIso2(code: string | null | undefined): string | null {
  if (!code) return null;
  return ISO2_TO_COUNTRY[code.toUpperCase()] ?? null;
}

/** Every accepted spelling of `country`, lowercased. */
export function countryForms(country: string): Set<string> {
  const key = country.trim().toLowerCase();
  return COUNTRY_ALIASES[key] ?? new Set([key]);
}

/** Whether two country strings name the same country, allowing for known aliases. */
export function sameCountry(a: string, b: string): boolean {
  const formsA = countryForms(a);
  const formsB = countryForms(b);
  const bKey = b.trim().toLowerCase();
  const aKey = a.trim().toLowerCase();
  if (formsA.has(bKey) || formsB.has(aKey)) return true;
  for (const form of formsA) if (formsB.has(form)) return true;
  return false;
}

/**
 * Accent- and punctuation-insensitive comparison key for institution names.
 *
 * A leading definite article is dropped: ranking tables and registries disagree about it
 * ("The University of Edinburgh" in QS, "University of Edinburgh" in ROR) and it carries no
 * distinguishing information — no two institutions differ only by a leading "The". This is a
 * normalisation, not a relaxation: country agreement is still required separately before any
 * name match is accepted as the same institution.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

/**
 * Plausible alternative spellings of an institution name, used to widen a registry lookup.
 * Handles the three shapes that actually recur in ranking-derived names: a parenthetical
 * suffix, a trailing dash-acronym, and the "X, University of" inversion.
 */
export function nameVariants(name: string): string[] {
  const variants = new Set<string>();
  const base = name.trim().replace(/’/g, "'");
  variants.add(base);
  const paren = base.match(/^(.*?)\s*\([^)]*\)\s*$/);
  if (paren && paren[1].length > 3) variants.add(paren[1].trim());
  const dashAbbr = base.match(/^(.*?)\s*[-–]\s*[A-Z]{2,6}$/);
  if (dashAbbr && dashAbbr[1].length > 3) variants.add(dashAbbr[1].trim());
  const trailingOf = base.match(/^(.*?),\s*University of$/i);
  if (trailingOf) variants.add(`University of ${trailingOf[1].trim()}`);
  return [...variants].filter(Boolean);
}

/**
 * ROR publishes an array of organisation types (`education`, `funder`, `healthcare`, ...).
 * A university is frequently tagged both `education` and `funder`; only the former says
 * anything about what kind of institution it is, so `funder` is dropped rather than allowed
 * to win. Returns null when ROR says nothing useful, so the column stays honestly empty.
 */
export function institutionTypeFromRor(types: readonly string[]): string | null {
  const meaningful = types.map((t) => t.toLowerCase()).filter((t) => t !== "funder" && t !== "other");
  if (meaningful.includes("education")) return "education";
  return meaningful[0] ?? null;
}

/** ISO 4217 codes we accept for tuition figures. Amounts are always stored unconverted
 * alongside their currency — never normalised to one currency, because the exchange rate on
 * the day of import is not a fact about the university. */
const CURRENCY_CODES = new Set([
  "USD", "EUR", "GBP", "CHF", "TRY", "SEK", "DKK", "NOK", "CAD", "AUD", "NZD",
  "SGD", "JPY", "KRW", "HKD", "BRL", "MXN", "ZAR", "INR", "AED", "CNY", "ILS", "SAR", "MYR", "THB", "TWD", "CLP", "ARS", "PLN",
]);

export function isCurrencyCode(code: string): boolean {
  return CURRENCY_CODES.has(code.toUpperCase());
}

/**
 * Parse a money figure a source states as text into an exact number, or null when it cannot
 * be read unambiguously. Returning null is the correct outcome far more often than guessing:
 * a tuition figure off by a factor of a thousand is worse than an empty field.
 *
 * Rejects ranges ("12,000–15,000") outright — a range is not a scalar, and squashing it to
 * one end would assert something the source did not say.
 */
export function parseMoneyAmount(raw: string): number | null {
  const text = raw.trim();
  if (!text) return null;
  // Any range notation disqualifies the whole string: en/em dash, "to", an ellipsis, or a
  // plain hyphen sitting between two digits ("12000-15000"). A hyphen elsewhere (a leading
  // minus, or one inside a label like "non-EU") is not a range and must not trip this.
  if (/[–—]|\bto\b|\.\.\.|\d\s*-\s*\d/i.test(text)) return null;

  const cleaned = text.replace(/[^\d.,]/g, "");
  if (!cleaned) return null;

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalised: string;
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators present, so the later one is the decimal point and the other groups
    // thousands: "12.345,67" (European) and "45,000.50" (US) both resolve correctly.
    normalised =
      lastComma > lastDot ? cleaned.replace(/\./g, "").replace(",", ".") : cleaned.replace(/,/g, "");
  } else if (lastComma >= 0 || lastDot >= 0) {
    // Only one separator kind. Whether it is a decimal point or a thousands separator is
    // genuinely ambiguous from the character alone, so decide on the group length: exactly
    // three trailing digits means thousands ("15,000" -> 15000, "1.460" -> 1460), anything
    // else means a decimal fraction ("12,5" -> 12.5). Getting this wrong turned a CHF 15,000
    // tuition figure into 15.0, which is exactly the silent factor-of-1000 error that must
    // never reach a student.
    const sepIndex = Math.max(lastComma, lastDot);
    const trailing = cleaned.length - sepIndex - 1;
    normalised = trailing === 3 ? cleaned.replace(/[.,]/g, "") : `${cleaned.slice(0, sepIndex)}.${cleaned.slice(sepIndex + 1)}`;
  } else {
    normalised = cleaned;
  }

  const value = Number(normalised);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** Degree levels we will store. Anything else is left null rather than forced into a bucket. */
const DEGREE_LEVELS = new Set(["bachelor", "master", "doctorate", "integrated_masters", "associate", "diploma"]);

export function normalizeDegreeLevel(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  if (/\b(bsc|ba|beng|bachelor|undergraduate|licence|laurea triennale)\b/.test(t)) return "bachelor";
  if (/\b(msc|ma|meng|master|graduate|laurea magistrale)\b/.test(t)) return "master";
  if (/\b(phd|doctor|doctorate|dphil)\b/.test(t)) return "doctorate";
  if (/\bintegrated\s+mast/.test(t)) return "integrated_masters";
  if (/\bassociate\b/.test(t)) return "associate";
  if (/\bdiploma\b/.test(t)) return "diploma";
  return DEGREE_LEVELS.has(t) ? t : null;
}
