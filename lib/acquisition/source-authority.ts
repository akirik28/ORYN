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
  | "research_strength"
  /** Primary campus/institution imagery and logos. */
  | "image"
  /** Competitions, summer programs, internships, fellowships and similar opportunities —
   * organizer's own domain, or nothing. Behaves identically to "programs"/"cost"/"policy"
   * (official-domain-or-nothing, no registry/third-party tier); listed separately because
   * the claim itself (an opportunity's own facts) is conceptually distinct. */
  | "opportunities";

export type AuthorityTier = "HIGH" | "MEDIUM";

export interface SourceAuthority {
  tier: AuthorityTier;
  /** Written to `source_type` columns so provenance survives in the database, not just here. */
  sourceType: "official_primary" | "open_registry" | "third_party_structured" | "wikimedia_commons" | "official_application_system" | "official_test_operator";
}

/**
 * Open, machine-readable organisation registries. Authoritative for identity because
 * identity is precisely what they curate, versioned, with a per-record modification date.
 * Never a source for cost, policy, or programme facts.
 */
const OPEN_REGISTRY_DOMAINS = new Set(["ror.org", "api.ror.org", "openalex.org", "api.openalex.org"]);

/**
 * Application/admissions systems a student actually applies through. Curated and hand-
 * reviewed, the same shape as OPEN_REGISTRY_DOMAINS — never a suffix rule, because `.org`/
 * `.com`/`.nl`/`.de`/`.fr` is exactly where content farms and university restatements also
 * live.
 *
 * HIGH for `policy` only (see sourceAuthority()) — RESOLVED, coordination session DECISION 1,
 * 2026-08-21 (docs/research/university-requirements/source-authority-gap.md on
 * oryn/university-requirements-research, not yet merged): these systems are authoritative
 * about the platform-wide facts they themselves operate (deadlines, equal-consideration
 * dates, eligibility/access rules, fee structures they set) — not about an individual
 * institution's own programme-specific requirements, where a university's own page is still
 * the source. Vindicated by a live conflict found in that same research pass: Glasgow's own
 * page listed the UCAS equal-consideration date as "14 January" (last cycle's date, stale);
 * UCAS's own page, dated to the 2027 cycle, gives 13 January 2027 — the operator's original
 * was correct, the institution's copy was not.
 *
 * ÖSYM (osym.gov.tr) is deliberately not listed here — it already resolves via `looksOfficial`
 * (`.gov.tr`), which is a strictly *broader* grant (HIGH for every fact class, not just
 * `policy`) than this tier would give it, so adding it here would be dead code.
 *
 * Named in migration 0042's `universities.application_system` column comment (UCAS, Common
 * App, Studielink, Parcoursup, ÖSYM/YKS, uni-assist, direct) plus CAO and Hochschulstart,
 * both named directly in the source doc above. Every domain in this set was live-fetched by
 * that research pass, not guessed.
 */
const APPLICATION_SYSTEM_DOMAINS = new Set(["ucas.com", "cao.ie", "studielink.nl", "hochschulstart.de", "uni-assist.de", "commonapp.org", "parcoursup.fr"]);

/**
 * Standardised-test operators. HIGH for `policy` only, same reasoning and same restriction as
 * APPLICATION_SYSTEM_DOMAINS immediately above: an operator is authoritative about its own
 * instrument (a score's validity window, how the test is administered, its own scoring scale)
 * but never about a specific institution's score requirement, which is the institution's own
 * fact to publish.
 *
 * Unlike the application-system tier above, this is NOT itself part of the 2026-08-21
 * coordination-session decision — no dedicated research pass measured these specific domains
 * against `looksOfficial()` the way the requirements lane did for institutions and application
 * systems. This is this session's own extension of that decision by direct structural analogy
 * (an "operator" is an "operator" regardless of whether it operates an application platform or
 * a test), flagged here so it reads as a documented assumption open to review, not as an
 * equally-sourced fact. Each domain below was independently confirmed live before being added
 * (ets.org — ETS's own TOEFL page; cambridgeenglish.org — footer-confirmed Cambridge University
 * Press & Assessment; collegeboard.org — already directly fetched by the requirements lane's
 * own AP research, data/research/academic-systems/secondary-systems-v1.json).
 */
const TEST_OPERATOR_DOMAINS = new Set(["ets.org", "cambridgeenglish.org", "collegeboard.org"]);

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

/**
 * Wikimedia Commons is a separately-licensed file host, not Wikidata itself — the
 * EXCLUDED_DOMAINS policy above is about never trusting wikidata.org/wikipedia.org AS a fact
 * value; a Commons-hosted file carries its own per-file license/attribution/author metadata,
 * checkable the same way ROR is authoritative for identity. Only accepted for `image` — it is
 * not a source for any other fact class.
 */
const WIKIMEDIA_COMMONS_DOMAINS = new Set(["commons.wikimedia.org", "upload.wikimedia.org"]);

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
 *
 * `.go.jp` added 2026-08-21 alongside the application-system/test-operator tiers, on the same
 * basis as `.gov`/`.gov.tr` above it — JPRS (Japan's registry) restricts second-level `.go.jp`
 * registration to government bodies and government-affiliated corporations, confirmed live
 * before adding it, not assumed. This is a suffix addition rather than a curated single-domain
 * entry (contrast `europa.eu` below) specifically because eligibility is registrar-enforced for
 * the whole namespace, the same property that makes `.gov`/`.ac.` safe as suffix rules where
 * `.org`/`.nl`/`.de` are not (see APPLICATION_SYSTEM_DOMAINS' doc comment) — no attempt was made
 * to audit every country's restricted government TLD convention beyond this one verified,
 * specifically-reported case; a systematic pass is a separate, larger research task.
 */
export function looksOfficial(domain: string): boolean {
  if (!domain) return false;
  return (
    domain.endsWith(".edu") ||
    domain.includes(".edu.") ||
    domain.includes(".ac.") ||
    domain.includes(".gov.") ||
    domain.endsWith(".gov") ||
    domain.endsWith(".go.jp")
  );
}

/**
 * Institution-specific secondary official domains, verified by hand one at a time — never a
 * substitute for ROR-sourced provenance (see `officialDomains` in `sourceAuthority`'s own doc
 * comment below), only a narrow patch for what ROR does not cover: an admissions site hosted
 * on a domain that does not share its institution's primary suffix. ROR's own record for MIT
 * (https://ror.org/042nb2s44, checked live 2026-09-01) lists exactly one domain, `mit.edu` —
 * it has no knowledge of `mitadmissions.org`, so full ROR integration alone would not have
 * closed this gap.
 *
 * `mitadmissions.org` verified live 2026-09-01: resolves (HTTP 200), and is directly
 * cross-linked from MIT's own already-official `web.mit.edu/admissions` page — the same
 * "live-fetched, not guessed" bar as APPLICATION_SYSTEM_DOMAINS above. Missing this domain was
 * the entire reason all 44 `requirement_research_queue` rows for MIT — 5 of 8 students with a
 * saved target_universities row target it, the single most-targeted school in the pilot
 * cohort — were rejected with `malformed_source`: every one of them cited an official
 * mitadmissions.org page, and `lib/requirements/ingest.ts` was building `officialDomains` from
 * `website_url` alone.
 *
 * Keyed by exact `universities.name`. Production currently has two MIT rows — one a nameless
 * stub with no `website_url`, referenced by zero research records — so this only needs to
 * match whichever row `resolveRequirementUniversity` actually resolves the real research
 * against, which it does by name; it does not need to be duplicate-safe beyond that.
 *
 * Every sibling call site that builds an `officialDomains` set the same website_url-only way
 * (`lib/programs/ingest.ts`, `lib/deadlines/ingest.ts`, and four `scripts/*.ts` acquisition
 * scripts — grep `officialDomains` for the full list) shares this exact limitation. Only
 * `lib/requirements/ingest.ts` was switched to consume this constant, because that is the one
 * call site with a confirmed, live-demand institution blocked by it today; the others were
 * left alone rather than widening this fix on spec.
 */
const ADDITIONAL_OFFICIAL_DOMAINS: Readonly<Record<string, readonly string[]>> = {
  "Massachusetts Institute of Technology": ["mitadmissions.org"],
};

/**
 * `officialDomains` for a specific university: its own site (unchanged from every existing
 * call site's inline construction) plus any hand-verified secondary domain from
 * ADDITIONAL_OFFICIAL_DOMAINS above. A caller passes whatever it already looked up for the
 * matched university; nothing here queries the database itself.
 */
export function officialDomainsFor(university: { name?: string | null; websiteUrl?: string | null }): Set<string> {
  const domains = new Set<string>();
  if (university.websiteUrl) {
    const domain = domainOf(university.websiteUrl);
    if (domain) domains.add(domain);
  }
  const additional = university.name ? ADDITIONAL_OFFICIAL_DOMAINS[university.name] : undefined;
  if (additional) {
    for (const domain of additional) domains.add(domain);
  }
  return domains;
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
 *
 * Overloaded so a caller restricted to a non-`image`, non-`policy` factClass (the AcquiredFact
 * fixture pipeline's `sourceType`, a Zod enum that deliberately doesn't know about
 * `wikimedia_commons`/`official_application_system`/`official_test_operator` — see
 * lib/acquisition/fixture.ts) gets that guarantee back at compile time, rather than every
 * caller seeing the full six-way union whether or not "image"/"policy" were ever a possibility
 * for them. `policy` joined the exclusion list alongside the application-system/test-operator
 * tiers, since those are the two sourceTypes that can only ever come from `factClass ===
 * "policy"` — every other fact class was already excluded from producing them by construction.
 */
export function sourceAuthority(
  factClass: Exclude<FactClass, "image" | "policy">,
  url: string,
  officialDomains?: ReadonlySet<string>
): { tier: AuthorityTier; sourceType: "official_primary" | "open_registry" | "third_party_structured" } | null;
export function sourceAuthority(factClass: FactClass, url: string, officialDomains?: ReadonlySet<string>): SourceAuthority | null;
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

  // An application system or test operator is authoritative about the platform-wide facts it
  // itself operates (see the constants' own doc comments for the sourcing and the reasoning),
  // but never about an individual institution's own requirement — that stays the institution's
  // own page. Checked ahead of OPEN_REGISTRY/THIRD_PARTY_STRUCTURED only because these sets are
  // mutually exclusive by construction (no domain appears in more than one curated list); order
  // between them has no behavioral effect.
  if (domainMatches(domain, APPLICATION_SYSTEM_DOMAINS)) {
    if (factClass === "policy") return { tier: "HIGH", sourceType: "official_application_system" };
    return null;
  }
  if (domainMatches(domain, TEST_OPERATOR_DOMAINS)) {
    if (factClass === "policy") return { tier: "HIGH", sourceType: "official_test_operator" };
    return null;
  }

  if (domainMatches(domain, OPEN_REGISTRY_DOMAINS)) {
    // Registries curate identity and bibliometrics; they publish neither fees nor policy.
    if (factClass === "identity" || factClass === "research_strength") {
      return { tier: "HIGH", sourceType: "open_registry" };
    }
    return null;
  }

  if (factClass === "image" && domainMatches(domain, WIKIMEDIA_COMMONS_DOMAINS)) {
    return { tier: "HIGH", sourceType: "wikimedia_commons" };
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
  APPLICATION_SYSTEM_DOMAINS,
  TEST_OPERATOR_DOMAINS,
  THIRD_PARTY_STRUCTURED_DOMAINS,
  EXCLUDED_DOMAINS,
} as const;
