/**
 * Source authority, resolved per fact class rather than per domain.
 *
 * A single global "is this domain trustworthy" score is the wrong model, and getting it
 * wrong is how invented-looking data reaches students. ROR is the authoritative registry
 * for *organisation identity* — canonical name, aliases, official website, GRID/ISNI/
 * Wikidata cross-ids, city/country — and is worthless as a source for this year's tuition.
 * NACUBO is a reasonable secondary source for an enrollment figure and says nothing about
 * an English-language requirement. So authority is a function of (fact class, domain), and
 * a source that is HIGH for one class can be `null` (not acceptable at all) for another.
 *
 * `null` means "this source may not be used to publish this class of fact" — not "low
 * confidence". There is deliberately no way to publish a fact from a non-accepted source
 * at reduced confidence, because that is exactly the coverage-over-truth trade this
 * product's data rules forbid.
 *
 * Extracted from scripts/enrich-student-counts.ts (which now imports from here) so there
 * is one domain policy in the codebase rather than a second copy drifting out of sync.
 */

/** What kind of claim is being made. Authority is meaningless without it. */
export type FactClass =
  /** Canonical name, aliases, official website, external registry ids, city, country, institution type. */
  | "identity"
  /** Student counts and shares (total, undergraduate, international). */
  | "population"
  /** Tuition, fees, cost of attendance. */
  | "cost"
  /** Admissions policy: standardised-test policy, language requirements, application system. */
  | "policy"
  /** Programme/course catalogue facts. */
  | "programs"
  /** Research output/topic strength. */
  | "research_strength";

export type AuthorityTier = "HIGH" | "MEDIUM";

export interface SourceAuthority {
  tier: AuthorityTier;
  /** Written to `source_type` columns so provenance survives in the database, not just here. */
  sourceType: "official_primary" | "open_registry" | "third_party_structured";
}

/**
 * Open, machine-readable organisation registries. Authoritative for identity because
 * identity is precisely what they curate, versioned, with a per-record modification date.
 * Never a source for cost, policy, or programme facts.
 */
const OPEN_REGISTRY_DOMAINS = new Set(["ror.org", "api.ror.org", "openalex.org", "api.openalex.org"]);

/**
 * Reputable structured third parties. Acceptable as a *secondary* source for population
 * figures only — they republish institutional statistics, so the figure is real but is one
 * step removed from the institution that published it.
 */
const THIRD_PARTY_STRUCTURED_DOMAINS = new Set([
  "nacubo.org",
  "timeshighereducation.com",
  "topuniversities.com",
  "shanghairanking.com",
  "statista.com",
  "oecd.org",
  "unesco.org",
  "worldbank.org",
  "data.worldbank.org",
  "usnews.com",
]);

/**
 * Never a source for any published fact, at any confidence. Content farms, directory
 * aggregators, and — deliberately — Wikipedia/Wikidata itself: those are used as an *index*
 * to find real sources (see scripts/enrich-student-counts.ts), never as the value.
 */
const EXCLUDED_DOMAINS = new Set([
  "unipage.net",
  "studyportals.com",
  "mastersportal.com",
  "bachelorsportal.com",
  "collegesimply.com",
  "4icu.org",
  "webometrics.info",
  "wikipedia.org",
  "wikiwand.com",
  "wikidata.org",
  "prospects.ac.uk",
  "studyinternational.com",
  "topschoolsintheusa.com",
  "niche.com",
  "collegefactual.com",
  "collegetuitioncompare.com",
  "univstats.com",
  // Competitor-derived data is discovery-only by policy: it tells us which fields matter,
  // never what a field's value is. See docs/cialfo-public-intelligence-audit.md.
  "cialfo.co",
  "help.cialfo.co",
  "app.cialfo.co",
  "explore.study",
]);

/** Hostname, lowercased, `www.` stripped. Empty string for anything unparseable. */
export function domainOf(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * Whether `domain` is, or sits under, any entry in `list`.
 *
 * Exact-match lookup is not enough: the real URLs that turn up are `en.wikipedia.org` and
 * `help.cialfo.co`, not the bare registrable domains a denylist naturally gets written with.
 * Matching only exactly meant Wikipedia was accepted as an identity source — the precise
 * failure the excluded list exists to prevent. Suffix matching is anchored on a dot so
 * `notwikipedia.org` cannot match `wikipedia.org`.
 */
function domainMatches(domain: string, list: ReadonlySet<string>): boolean {
  if (list.has(domain)) return true;
  for (const entry of list) {
    if (domain.endsWith(`.${entry}`)) return true;
  }
  return false;
}

/**
 * True for domains that look like an institution's or a government's own site. Kept as the
 * same test the student-count pipeline has been using: academic and government suffixes.
 */
export function looksOfficial(domain: string): boolean {
  if (!domain) return false;
  return (
    domain.endsWith(".edu") ||
    domain.includes(".edu.") ||
    domain.includes(".ac.") ||
    domain.includes(".gov.") ||
    domain.endsWith(".gov")
  );
}

/**
 * Whether `url` may be used to publish a fact of `factClass`, and at what tier.
 *
 * `officialDomains` lets a caller additionally treat a specific institution's own domain as
 * official when it carries no academic suffix — plenty of real universities sit on `.ch`,
 * `.nl`, `.de`, `.sg`. The caller must have established that domain from an authoritative
 * identity source (ROR's `links`/`domains`) rather than guessing it, which is why this is a
 * parameter and not another hardcoded list. Matched the same suffix-aware way as the other
 * domain lists (`domainMatches`), not exact-only — a department/faculty subdomain of a known
 * official domain (`phys.ethz.ch` under `ethz.ch`) is exactly the shape most program/course
 * pages actually live on.
 */
export function sourceAuthority(
  factClass: FactClass,
  url: string,
  officialDomains: ReadonlySet<string> = new Set()
): SourceAuthority | null {
  const domain = domainOf(url);
  if (!domain) return null;
  if (domainMatches(domain, EXCLUDED_DOMAINS)) return null;

  const isOfficial = looksOfficial(domain) || domainMatches(domain, officialDomains);
  // An institution's own site is authoritative for everything it publishes about itself.
  if (isOfficial) return { tier: "HIGH", sourceType: "official_primary" };

  if (domainMatches(domain, OPEN_REGISTRY_DOMAINS)) {
    // Registries curate identity and bibliometrics; they publish neither fees nor policy.
    if (factClass === "identity" || factClass === "research_strength") {
      return { tier: "HIGH", sourceType: "open_registry" };
    }
    return null;
  }

  if (domainMatches(domain, THIRD_PARTY_STRUCTURED_DOMAINS)) {
    // Republished institutional statistics only. Never policy, cost, or programmes —
    // those change per cycle and per programme, and a secondary copy is not good enough.
    if (factClass === "population") return { tier: "MEDIUM", sourceType: "third_party_structured" };
    return null;
  }

  return null;
}

/** Exposed for tests and for the report script's domain breakdowns. */
export const SOURCE_DOMAIN_POLICY = {
  OPEN_REGISTRY_DOMAINS,
  THIRD_PARTY_STRUCTURED_DOMAINS,
  EXCLUDED_DOMAINS,
} as const;
