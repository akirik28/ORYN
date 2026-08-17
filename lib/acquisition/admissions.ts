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
 *
 * `"direct"` (an institution with no third-party application portal at all) is a legitimate
 * value the column comment explicitly allows — but is deliberately NOT auto-detected here,
 * even from explicit-sounding phrases like "apply directly to the university". Unlike a portal
 * name (an unambiguous proper noun — a page either says "UCAS" or it doesn't), "direct
 * application" is common generic admissions-marketing language that shows up on portal-routed
 * pages too ("start your direct application today" while still routing through Common App
 * behind the scenes is realistic copy, not a contrived edge case). Reliably telling "this page
 * asserts there is no third-party system" apart from ordinary CTA phrasing needs actual
 * page-purpose understanding, which is exactly the piece blocked on Anthropic credits — a
 * keyword pattern here would trade the null-by-default safety this whole module is built
 * around for a real false-positive risk. Stays unautomated on purpose, not an oversight.
 */

import { sameCountry } from "./normalize";

export interface AdmissionsCandidate {
  url: string;
  title: string;
}

/** ORYN's audience is high-school students applying to undergraduate programmes. A page
 * this confidently graduate-level is worse than finding nothing — pointing a 17-year-old at
 * a Master's/PhD admissions page is a wrong answer, not a partial one. */
const GRADUATE_LEVEL_PATTERN = /\b(master'?s?|graduate|postgraduate|phd|doctoral)\b/;

/** A page ABOUT a specific applicant's problem (an exception process, an appeal, a
 * complaint), not a page that helps a prospective student apply. Real case: LSE's
 * newly-acquired admissions_url resolved to
 * ".../Undergraduate-Admissions-Extenuating-Circumstances" — real LSE content, genuinely
 * about admissions, and still the wrong page for anyone browsing ORYN. */
const SPECIAL_CASE_PATTERN = /extenuating[- ]circumstances|special[- ]circumstances|mitigating[- ]circumstances|\bappeals?\b|\bcomplaints?\b/;

/** A dated announcement (this cycle's seat count, this year's cutoff score), not a durable
 * "how to apply" hub — even when it genuinely mentions admission and is genuinely current.
 * Real cases from live batches: Gadjah Mada's "2026-admissions-10000-undergraduate-...-seats
 * -available" (a news post about seat counts) and Duy Tan's Vietnamese "diem-trung-tuyen"
 * ("admission scores") results page for a specific past intake. */
const STALE_CYCLE_NEWS_PATTERN = /\/news\/|admission\s*results?|admission\s*scores?|entry\s*(?:cut[- ]?off|scores?)/;

/**
 * Keyword score for "is this URL the institution's UNDERGRADUATE admissions page". Path
 * signals outweigh title signals (a title can be generic; a URL path segment like
 * `/admissions/apply` is a much stronger structural signal of intent).
 *
 * A real "admission" or "apply" signal (path or title) is a HARD REQUIREMENT, not just the
 * highest-weighted bonus — everything else (undergrad/bachelor, the graduate penalty) only
 * ever adjusts a candidate that already cleared that bar. Two real failures on a live pilot
 * batch of 40 both traced to that not being true yet:
 *   - `masters.au.dk/.../admission-requirements` (Aarhus) — a real "/admission" path match,
 *     but graduate-level; fixed by the GRADUATE_LEVEL_PATTERN penalty.
 *   - a 2019 NEWS ARTICLE about a research-competition win at Al Ain University, containing
 *     no "admission"/"apply" anywhere, still cleared the old threshold on "undergraduate"
 *     alone (path +2, title +1 = 3) — the undergrad/bachelor bonus was independently
 *     sufficient, which was never the intent. Fixed by gating every bonus behind a genuine
 *     admission/apply match first.
 */
export function scoreAdmissionsCandidate(candidate: AdmissionsCandidate): number {
  const path = candidate.url.toLowerCase();
  const title = candidate.title.toLowerCase();

  const hasAdmissionSignal = /\/admission/.test(path) || /\badmission/.test(title);
  const hasApplySignal = /\/apply|applying/.test(path) || /\bapply\b|\bapplying\b/.test(title);
  if (!hasAdmissionSignal && !hasApplySignal) return 0;

  let score = 0;
  if (/\/admission/.test(path)) score += 3;
  if (/\/apply|applying/.test(path)) score += 2;
  if (/undergrad|bachelor/.test(path)) score += 2;
  if (/\badmission/.test(title)) score += 1;
  if (/\bapply\b|\bapplying\b/.test(title)) score += 1;
  if (/undergrad|bachelor/.test(title)) score += 1;
  if (GRADUATE_LEVEL_PATTERN.test(path) || GRADUATE_LEVEL_PATTERN.test(title)) score -= 5;
  if (SPECIAL_CASE_PATTERN.test(path) || SPECIAL_CASE_PATTERN.test(title)) score -= 5;
  if (STALE_CYCLE_NEWS_PATTERN.test(path) || STALE_CYCLE_NEWS_PATTERN.test(title)) score -= 4;
  // A PDF is a valid, often-correct answer (several real ones this session: Shanghai Jiao
  // Tong, Gebze Technical University) — never disqualified — but a small penalty means a
  // comparably-scored durable HTML hub wins the tie-break when one also exists, since a
  // student can navigate further from an HTML page and not from a static PDF.
  if (/\.pdf(?:$|[?#])/.test(path)) score -= 1;
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

/**
 * `homeCountry` is which country's applicants this system serves. Every pattern is gated —
 * Common App/UCAS/Coalition were originally left ungated on the assumption that a broad
 * multi-country portal was unlikely to appear as a mere "recognized pathway" mention the way
 * a single-country national exam could. A live batch disproved that: Shanghai Jiao Tong
 * University (China) was tagged "Common App" from its own international-admissions PDF,
 * almost certainly a joint-degree/exchange-pathway mention rather than SJTU's own system —
 * there is no legitimate reading where a Chinese university's OWN application route is the
 * US undergraduate portal. Common App and Coalition both draw the overwhelming majority of
 * their member institutions from the US; UCAS is the UK's national system. A rare genuine
 * international member of either (both do have a small number) will read as "not detected"
 * rather than detected-for-the-wrong-country — the same asymmetry this module applies
 * everywhere else: an honest null beats a wrong positive.
 *
 * Order matters only in the sense that each pattern is specific enough not to collide with
 * another on this list — not a priority ranking a page could plausibly need.
 */
const APPLICATION_SYSTEM_PATTERNS: { system: string; pattern: RegExp; homeCountry: string }[] = [
  { system: "Common App", pattern: /common\s*app(?:lication)?\b|commonapp\.org/i, homeCountry: "United States" },
  { system: "UCAS", pattern: /\bucas\b|ucas\.com/i, homeCountry: "United Kingdom" },
  { system: "Coalition", pattern: /coalition\s*(?:for\s*college\s*access)?\b|coalitionforcollegeaccess\.org/i, homeCountry: "United States" },
  { system: "Parcoursup", pattern: /parcoursup/i, homeCountry: "France" },
  { system: "Studielink", pattern: /studielink/i, homeCountry: "Netherlands" },
  { system: "uni-assist", pattern: /uni-assist/i, homeCountry: "Germany" },
  { system: "ÖSYM/YKS", pattern: /\bösym\b|\bosym\b|\byks\b/i, homeCountry: "Turkey" },
  // CAO/UAC deliberately require the domain or full official name, not the bare acronym —
  // unlike VTAC/QTAC/SATAC/TISC/OUAC below, "CAO" and "UAC" are generic-sounding enough
  // (Chief Administrative Officer, an unrelated internal "UAC" abbreviation, etc.) that
  // matching them bare would risk exactly the false-positive class this module exists to
  // avoid. cao.ie/uac.edu.au and the full names are unambiguous.
  { system: "CAO", pattern: /cao\.ie|central\s*applications?\s*office/i, homeCountry: "Ireland" },
  { system: "UAC", pattern: /uac\.edu\.au|universities\s*admissions?\s*centre/i, homeCountry: "Australia" },
  // Australia has no single national system — each is a real, distinct, state-level body
  // (NSW/ACT: UAC above; VIC: VTAC; QLD: QTAC; SA/NT: SATAC; WA: TISC). All homeCountry
  // "Australia" since our schema has no state/region field to gate more precisely; a
  // Victorian university's page mentioning VTAC vs a NSW page mentioning UAC are both still
  // genuinely Australian institutions using a genuinely Australian system, so the residual
  // risk here is "which specific state body", not "wrong country" — a materially smaller
  // error than the cross-country failures this file's gating was built to prevent.
  { system: "VTAC", pattern: /\bvtac\b|vtac\.edu\.au|victorian\s*tertiary\s*admissions?\s*centre/i, homeCountry: "Australia" },
  { system: "QTAC", pattern: /\bqtac\b|qtac\.edu\.au|queensland\s*tertiary\s*admissions?\s*centre/i, homeCountry: "Australia" },
  { system: "SATAC", pattern: /\bsatac\b|satac\.edu\.au|south\s*australian\s*tertiary\s*admissions?\s*centre/i, homeCountry: "Australia" },
  { system: "TISC", pattern: /\btisc\b|tisc\.edu\.au|tertiary\s*institutions?\s*service\s*centre/i, homeCountry: "Australia" },
  { system: "OUAC", pattern: /\bouac\b|ouac\.on\.ca|ontario\s*universit(?:y|ies)\W*\s*applications?\s*centre/i, homeCountry: "Canada" },
];

/**
 * First distinctive portal name/domain literally present in `content`, or null. Null means
 * "not mentioned in what we fetched" — not "applies directly", which this deliberately never
 * asserts without positive evidence.
 *
 * `universityCountry` gates every system to a same-country match against its `homeCountry`,
 * using the same alias-aware comparison the rest of lib/acquisition/* uses (`Türkiye`/
 * `Turkey`, etc.). Two live failures on real batches, same underlying mechanism: a page
 * *mentioning* a foreign application system to describe how it evaluates foreign applicants
 * (a recognized-pathway or joint-degree footnote) is not the same fact as the page's own
 * institution *using* that system — Dublin City University (Ireland) tagged ÖSYM/YKS, then
 * Shanghai Jiao Tong University (China) tagged Common App. See the pattern list above for why
 * every system is gated now, not just the obviously single-country ones.
 */
export function detectApplicationSystem(content: string, universityCountry: string): ApplicationSystemMatch | null {
  for (const { system, pattern, homeCountry } of APPLICATION_SYSTEM_PATTERNS) {
    if (!sameCountry(universityCountry, homeCountry)) continue;
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
