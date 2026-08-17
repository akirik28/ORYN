/**
 * Pure, deterministic classification for admissions-page discovery
 * (scripts/acquire-admissions-facts.ts — spec Phase 4, University Intelligence Spine).
 *
 * ANTHROPIC_API_KEY is credit-blocked this session (billing, not a missing key), so the
 * usual Tavily-search-then-AI-extract workflow AGENTS.md Phase 9 describes for the
 * cost/policy layer isn't available. Both facts this module supports are reachable without
 * AI, on a narrower but zero-fabrication-risk basis:
 *
 *   - `admissions_url`: Tavily search is restricted to the institution's own already-verified
 *     domain (`include_domains`), so every candidate is already `official_primary`-tier by
 *     construction (source-authority.ts). Picking the *right* page among that domain's
 *     results is a URL/title keyword score, not free-text extraction of a value — the
 *     failure mode of a wrong pick is "no fact written" (score below threshold), never a
 *     plausible-looking wrong number the way scraping a student-count would be.
 *   - `application_system`: only ever set when one of a short list of internationally
 *     distinctive portal names/domains (Common App, UCAS, Parcoursup, ...) appears verbatim
 *     in the fetched page content. Never inferred from absence — a page mentioning none of
 *     them stays null ("unknown"), never defaults to "direct" (the exact anti-pattern
 *     migration 0042's own column comment warns against).
 */

export interface AdmissionsCandidate {
  url: string;
  title: string;
}

/** ORYN's audience is high-school students applying to undergraduate programmes. A page
 * this confidently graduate-level is worse than finding nothing — pointing a 17-year-old at
 * a Master's/PhD admissions page is a wrong answer, not a partial one. */
const GRADUATE_LEVEL_PATTERN = /\b(master'?s?|graduate|postgraduate|phd|doctoral)\b/;

/**
 * Keyword score for "is this URL the institution's UNDERGRADUATE admissions page". Path
 * signals outweigh title signals (a title can be generic; a URL path segment like
 * `/admissions/apply` is a much stronger structural signal of intent). A live pilot run
 * caught the real failure mode this guards: a domain-restricted search for "Aarhus
 * University undergraduate admissions" still surfaced `masters.au.dk/.../admission-
 * requirements` as the top-scoring candidate before this penalty existed — "/admission" and
 * "apply" in the title were enough to clear the bar despite the URL being graduate-only.
 */
export function scoreAdmissionsCandidate(candidate: AdmissionsCandidate): number {
  const path = candidate.url.toLowerCase();
  const title = candidate.title.toLowerCase();
  let score = 0;
  if (/\/admission/.test(path)) score += 3;
  if (/\/apply|applying/.test(path)) score += 2;
  if (/undergrad|bachelor/.test(path)) score += 2;
  if (/\badmission/.test(title)) score += 1;
  if (/\bapply\b|\bapplying\b/.test(title)) score += 1;
  if (/undergrad|bachelor/.test(title)) score += 1;
  if (GRADUATE_LEVEL_PATTERN.test(path) || GRADUATE_LEVEL_PATTERN.test(title)) score -= 5;
  return score;
}

/** Below this, "no confident admissions page found" is the honest answer — never guess. */
export const ADMISSIONS_SCORE_THRESHOLD = 3;

/** Highest-scoring candidate, or null if nothing clears the threshold. Ties keep the first
 * (Tavily's own relevance order), so this is deterministic given the same input order. */
export function pickBestAdmissionsCandidate(candidates: AdmissionsCandidate[]): AdmissionsCandidate | null {
  let best: AdmissionsCandidate | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const score = scoreAdmissionsCandidate(candidate);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return bestScore >= ADMISSIONS_SCORE_THRESHOLD ? best : null;
}

export interface ApplicationSystemMatch {
  system: string;
  matchedText: string;
}

/** Order matters only in the sense that each pattern is specific enough not to collide with
 * another on this list — not a priority ranking a page could plausibly need. */
const APPLICATION_SYSTEM_PATTERNS: { system: string; pattern: RegExp }[] = [
  { system: "Common App", pattern: /common\s*app(?:lication)?\b|commonapp\.org/i },
  { system: "UCAS", pattern: /\bucas\b|ucas\.com/i },
  { system: "Coalition", pattern: /coalition\s*(?:for\s*college\s*access)?\b|coalitionforcollegeaccess\.org/i },
  { system: "Parcoursup", pattern: /parcoursup/i },
  { system: "Studielink", pattern: /studielink/i },
  { system: "uni-assist", pattern: /uni-assist/i },
  { system: "ÖSYM/YKS", pattern: /\bösym\b|\bosym\b|\byks\b/i },
];

/** First distinctive portal name/domain literally present in `content`, or null. Null means
 * "not mentioned in what we fetched" — not "applies directly", which this deliberately never
 * asserts without positive evidence. */
export function detectApplicationSystem(content: string): ApplicationSystemMatch | null {
  for (const { system, pattern } of APPLICATION_SYSTEM_PATTERNS) {
    const match = content.match(pattern);
    if (match) return { system, matchedText: match[0] };
  }
  return null;
}

/** Registrable-ish host for a URL: lowercased, `www.` stripped. Returns null for an
 * unparseable URL rather than throwing — acquisition input is untrusted stored data. */
export function extractDomain(url: string): string | null {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return host.startsWith("www.") ? host.slice(4) : host;
  } catch {
    return null;
  }
}
