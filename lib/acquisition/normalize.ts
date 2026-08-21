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
  "macao sar": new Set(["macau", "macao", "macao sar", "macao sar china"]),
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


/**
 * ISO 3166-1 alpha-2 → English country name, via the runtime's own CLDR data.
 *
 * This replaced a hand-maintained lookup table. The table was not just tedious, it was
 * actively harmful: a code it happened to omit (Kazakhstan, say) produced an *unresolvable
 * country*, which the identity gate then correctly reported as a country mismatch — so an
 * incomplete lookup table masqueraded as a data-quality refusal. `Intl.DisplayNames` covers
 * every assigned code, so a genuine mismatch now means a genuine mismatch.
 *
 * Where CLDR's spelling differs from the form we store ("Türkiye" vs "Turkey", "Hong Kong SAR
 * China" vs "Hong Kong SAR"), `sameCountry` bridges it via COUNTRY_ALIASES rather than this
 * function second-guessing the standard.
 */
const REGION_NAMES = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

/** CLDR assigns names to codes that are not countries. "ZZ" resolves to "Unknown Region" and
 * "XA"/"XB" to pseudo-locale placeholders, so `fallback: "none"` alone does not filter them —
 * they have to be rejected by name, or an unknown region would sail through as a country. */
const NON_COUNTRY_REGION_NAMES = new Set(["unknown region", "pseudo-accents", "pseudo-bidi"]);

export function countryFromIso2(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(upper)) return null;
  try {
    const name = REGION_NAMES.of(upper);
    if (!name || name === upper) return null;
    return NON_COUNTRY_REGION_NAMES.has(name.toLowerCase()) ? null : name;
  } catch {
    return null;
  }
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
 * Latin letters that are NOT a base letter plus a combining mark, so NFD leaves them intact
 * and the `[^a-z0-9]` sweep below would otherwise DELETE them outright — silently corrupting
 * the key rather than merely flattening it.
 *
 * That deletion was a live defect, not a hypothetical one. Turkish "Sabancı University" keyed
 * as "sabanc university" and "Yıldız Technical University" as "y ld z technical university",
 * so neither could ever match the ASCII spellings ("Sabanci", "Yildiz") the same institutions
 * are filed under elsewhere; the 5 Yıldız records in the programs corpus were failing identity
 * resolution outright because of it. Norwegian "Tromsø" keyed as "troms" and Polish "Wrocław"
 * as "wroc aw" the same way.
 *
 * Each mapping is the letter's own standard ASCII romanisation, which makes it lossless in the
 * sense that matters here: the key is the form a source writing without the special character
 * would have used. ß→"ss" is exact — "ss" is the ONLY ASCII form of ß, never "s" — which is why
 * it belongs here rather than in the ambiguous umlaut handling in nameVariants below.
 *
 * Turkish note: this map is why dotless ı and dotted İ both land on "i". İ needs no entry —
 * NFD decomposes it to "I" + combining dot above, which the mark sweep already removes. The
 * order below is load-bearing for that: NFD, then strip marks, then lowercase. And the
 * lowercase step must stay `toLowerCase()`, never `toLocaleLowerCase()` — the latter is
 * locale-sensitive and under a Turkish locale would fold ASCII "I" to "ı" (so "ISTANBUL"
 * would key as "istanbul" here but "ıstanbul" there, i.e. the same name keying two ways
 * depending on the machine's locale). `toLowerCase()` is locale-independent by spec.
 */
const NON_DECOMPOSABLE_LATIN: Record<string, string> = {
  "ı": "i",
  "ß": "ss",
  "ø": "o",
  "æ": "ae",
  "œ": "oe",
  "đ": "d",
  "ð": "d",
  "þ": "th",
  "ł": "l",
  "ħ": "h",
  "ŧ": "t",
  "ŋ": "n",
  "ə": "e",
};

/**
 * Accent- and punctuation-insensitive comparison key for institution names.
 *
 * A leading definite article is dropped: ranking tables and registries disagree about it
 * ("The University of Edinburgh" in QS, "University of Edinburgh" in ROR) and it carries no
 * distinguishing information — no two institutions differ only by a leading "The". This is a
 * normalisation, not a relaxation: country agreement is still required separately before any
 * name match is accepted as the same institution.
 *
 * Deliberately does NOT collapse the German "ae"/"oe"/"ue" digraphs onto bare vowels. Doing so
 * would make "Universität"/"Universitaet"/"Universitat" one key, but only by mangling every
 * name where those two letters are a genuine sequence rather than a transliterated umlaut —
 * measured against the live spine, a blanket fold rewrote "Prague"→"pragu", "Queen"→"quen",
 * "polytechnique"→"polytechniqu", "Purdue"→"purdu", "Israel"→"isral" and 38 others. The
 * umlaut/digraph equivalence is genuinely ambiguous from the ASCII side, so it is handled
 * where ambiguity belongs — as an extra candidate spelling in nameVariants() — instead of by
 * degrading the key everyone else compares on.
 */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[ıßøæœđðþłħŧŋə]/g, (c) => NON_DECOMPOSABLE_LATIN[c] ?? c)
    .replace(/[’'`]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/^the\s+/, "");
}

/**
 * `canonical_entities.normalized_name` has no insert trigger (unlike `search_key`, which
 * `set_canonical_entity_search_key()` computes automatically) — every caller that inserts a
 * row must supply it, and it must match the database's OWN convention exactly
 * (`lower(unaccent(x))`, used by e.g. the `create_or_resolve_user_submitted_entity` RPC in
 * migration 0038) or a new row's uniqueness can silently drift from what
 * `canonical_entities_identity_uq` actually enforces. Deliberately NOT `nameKey()`: that
 * function also drops a leading "the" and expands "&", real semantic normalizations the
 * database's own index does not apply — reusing it here would make this app's notion of
 * "the same normalized_name" diverge from Postgres's.
 */
export function dbNormalizedName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/**
 * German/Nordic umlaut ↔ digraph spellings of one name.
 *
 * "Universität Freiburg", "Universitaet Freiburg" and "Universitat Freiburg" are the same
 * institution, but no single comparison key can unify all three: expanding ä→"ae" breaks
 * Turkish (whose own ASCII convention drops the diaeresis outright — "Özyeğin"→"Ozyegin",
 * never "Oezyegin"), and contracting "ae"→"a" inside nameKey mangles every unrelated name
 * containing that letter pair. So the equivalence is expressed as extra candidate spellings
 * instead, which resolveIdentity() applies to BOTH sides of a comparison — and which, unlike
 * a key change, can only ever add a match attempt, never silently alter an existing key.
 *
 * Measured on the live spine before shipping: this adds zero new ambiguous-match groups (the
 * 6 that exist are pre-existing duplicate rows, identical before and after), and changes no
 * record's resolved university — it only converts matches that previously needed a
 * hand-written alias row into direct orthographic matches. Albert-Ludwigs-Universität
 * Freiburg's 228 programme records are the worked example: the spine files it under the
 * "Universitaet" spelling, so every record spelled "Universität" was resolving only because
 * somebody had added an alias row by hand. That is a per-institution manual cost this pays
 * off in one place.
 *
 * ß needs no entry here — it has exactly one ASCII form ("ss"), so nameKey handles it
 * exactly. Scope is deliberately limited to the letters with corpus evidence behind them
 * (ä/ö/ü and ø); this is not an attempt at a general romanisation table.
 */
function umlautDigraphVariants(base: string): string[] {
  const out: string[] = [];
  if (/[äöüÄÖÜøØ]/.test(base)) {
    out.push(
      base
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ø/g, "oe")
        .replace(/Ä/g, "Ae")
        .replace(/Ö/g, "Oe")
        .replace(/Ü/g, "Ue")
        .replace(/Ø/g, "Oe")
    );
  }
  if (/[aou]e/i.test(base)) {
    out.push(base.replace(/([aou])e/gi, "$1"));
  }
  return out;
}

/**
 * Plausible alternative spellings of an institution name, used to widen a registry lookup.
 * Handles the shapes that actually recur in ranking-derived names: a parenthetical suffix, a
 * trailing dash-acronym, a leading acronym prefix, the "X, University of" inversion, and the
 * German/Nordic umlaut ↔ digraph pair (see umlautDigraphVariants).
 */
export function nameVariants(name: string): string[] {
  const variants = new Set<string>();
  const base = name.trim().replace(/’/g, "'");
  variants.add(base);
  const paren = base.match(/^(.*?)\s*\([^)]*\)\s*$/);
  if (paren && paren[1].length > 3) variants.add(paren[1].trim());
  const dashAbbr = base.match(/^(.*?)\s*[-–]\s*[A-Z]{2,6}$/);
  if (dashAbbr && dashAbbr[1].length > 3) variants.add(dashAbbr[1].trim());
  // The mirror of dashAbbr: an acronym prefix rather than suffix ("EPFL – École
  // polytechnique...", "KIT, Karlsruhe Institute of Technology"). Found live this session —
  // ROR's own record is the plain, un-prefixed name in every observed case. Same 2-8-char
  // all-caps bound as dashAbbr, so it can't strip a genuine leading word ("New York
  // University" doesn't match: "New" isn't all-caps).
  const leadingAbbr = base.match(/^[A-ZÀ-Ö&]{2,8}\s*[-–,]\s*(.+)$/);
  if (leadingAbbr && leadingAbbr[1].length > 3) variants.add(leadingAbbr[1].trim());
  const trailingOf = base.match(/^(.*?),\s*University of$/i);
  if (trailingOf) variants.add(`University of ${trailingOf[1].trim()}`);
  // Applied to every shape produced above, not just the raw name, so a name carrying both an
  // acronym prefix and an umlaut ("KIT, Universität Karlsruhe") yields the stripped-and-
  // transliterated form too.
  for (const v of [...variants]) for (const t of umlautDigraphVariants(v)) variants.add(t);
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
