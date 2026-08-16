import { normalizeEntitySearchText, tokenizeNormalized } from "./normalize";

export interface EntityCandidate {
  id: string;
  canonicalName: string;
  aliases: string[];
  country: string | null;
  city: string | null;
}

/** Ranking tiers, in the exact priority order the spec specifies — lower number wins.
 * `fuzzy` (typo-tolerant) is deliberately last resort, never promoted ahead of a real
 * token/prefix/alias match. */
export const MATCH_TIER = {
  exactCanonical: 0,
  exactAlias: 1,
  prefixCanonical: 2,
  prefixAlias: 3,
  tokenMatch: 4,
  fuzzy: 5,
} as const;
export type MatchTier = (typeof MATCH_TIER)[keyof typeof MATCH_TIER];

export interface RankedEntityMatch<T extends EntityCandidate> {
  candidate: T;
  tier: MatchTier;
  /** Raw match strength within the tier — 1 for anything exact/prefix/token, or the
   * actual Levenshtein-based similarity (0-1) for a fuzzy match. Kept separate from
   * `score` (which also folds in the context boost) so a caller can reason about match
   * confidence without having to reverse-engineer it out of the sort score. */
  fuzzyScore: number;
  score: number;
}

/** Below this normalized similarity, two strings are considered unrelated, not a fuzzy
 * match — prevents an unrelated result from ever appearing just because every candidate
 * gets *some* Levenshtein score. */
const FUZZY_MATCH_THRESHOLD = 0.6;

/** Iterative (not recursive) Levenshtein distance — candidate pools here are small
 * (server-fetched, capped), so no need for a more sophisticated algorithm. */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const currentRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currentRow.push(Math.min(previousRow[j] + 1, currentRow[j - 1] + 1, previousRow[j - 1] + cost));
    }
    previousRow = currentRow;
  }
  return previousRow[b.length];
}

/** 1 = identical, 0 = completely different (bounded by the longer string's length). */
export function normalizedSimilarity(a: string, b: string): number {
  const maxLength = Math.max(a.length, b.length);
  if (maxLength === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLength;
}

function matchStrength(normalizedQuery: string, queryTokens: string[], normalizedName: string, normalizedAliases: string[]): { tier: MatchTier; fuzzyScore: number } | null {
  if (normalizedName === normalizedQuery) return { tier: MATCH_TIER.exactCanonical, fuzzyScore: 1 };
  if (normalizedAliases.includes(normalizedQuery)) return { tier: MATCH_TIER.exactAlias, fuzzyScore: 1 };
  if (normalizedName.startsWith(normalizedQuery)) return { tier: MATCH_TIER.prefixCanonical, fuzzyScore: 1 };
  if (normalizedAliases.some((alias) => alias.startsWith(normalizedQuery))) return { tier: MATCH_TIER.prefixAlias, fuzzyScore: 1 };

  const nameTokens = tokenizeNormalized(normalizedName);
  const aliasTokens = normalizedAliases.flatMap(tokenizeNormalized);
  const allTokens = [...nameTokens, ...aliasTokens];
  if (queryTokens.length > 0 && queryTokens.every((queryToken) => allTokens.some((token) => token.startsWith(queryToken)))) {
    return { tier: MATCH_TIER.tokenMatch, fuzzyScore: 1 };
  }

  const bestFuzzy = Math.max(normalizedSimilarity(normalizedQuery, normalizedName), 0, ...normalizedAliases.map((alias) => normalizedSimilarity(normalizedQuery, alias)));
  if (bestFuzzy >= FUZZY_MATCH_THRESHOLD) return { tier: MATCH_TIER.fuzzy, fuzzyScore: bestFuzzy };

  return null;
}

/**
 * Ranks candidates against a query following the spec's exact tier order (section 15),
 * with an optional soft country/city context boost — context nudges ordering *within*
 * what already matched, it never adds or removes a result a plain query wouldn't have
 * found (spec: "context ranking içindir, hard filtering değildir").
 */
export function rankEntityCandidates<T extends EntityCandidate>(
  query: string,
  candidates: T[],
  context: { country?: string | null; city?: string | null } = {}
): RankedEntityMatch<T>[] {
  const normalizedQuery = normalizeEntitySearchText(query);
  if (!normalizedQuery) return [];
  const queryTokens = tokenizeNormalized(normalizedQuery);
  const normalizedContextCountry = context.country ? normalizeEntitySearchText(context.country) : null;
  const normalizedContextCity = context.city ? normalizeEntitySearchText(context.city) : null;

  const results: RankedEntityMatch<T>[] = [];

  for (const candidate of candidates) {
    const normalizedName = normalizeEntitySearchText(candidate.canonicalName);
    const normalizedAliases = candidate.aliases.map(normalizeEntitySearchText);
    const strength = matchStrength(normalizedQuery, queryTokens, normalizedName, normalizedAliases);
    if (!strength) continue;

    // Higher score always wins; tier dominates (100 points apart) so a context boost
    // (a few points) can only ever reorder *within* a tier, never cross one.
    let score = (5 - strength.tier) * 100 + strength.fuzzyScore;
    if (normalizedContextCountry && candidate.country && normalizeEntitySearchText(candidate.country) === normalizedContextCountry) score += 10;
    if (normalizedContextCity && candidate.city && normalizeEntitySearchText(candidate.city) === normalizedContextCity) score += 5;

    results.push({ candidate, tier: strength.tier, fuzzyScore: strength.fuzzyScore, score });
  }

  return results.sort((a, b) => b.score - a.score || a.candidate.canonicalName.localeCompare(b.candidate.canonicalName));
}

/**
 * "Did you mean X?" duplicate-detection gate for the custom-entity fallback (spec
 * section 7) — deliberately a HIGHER bar than the general search's fuzzy floor above
 * (0.85 vs. 0.6): search should surface plausible options generously, but suggesting
 * "this is a duplicate of an existing entity" needs much higher confidence, since a
 * false positive here risks steering a student away from correctly adding a genuinely
 * new entity. Never auto-merges — only ever returns candidates to show the user, who
 * makes the final call (spec section 8: "do not auto-merge ambiguous entities").
 */
const DUPLICATE_SUGGESTION_THRESHOLD = 0.85;

export function findPossibleDuplicates<T extends EntityCandidate>(name: string, candidates: T[], context: { country?: string | null; city?: string | null } = {}): T[] {
  const ranked = rankEntityCandidates(name, candidates, context);
  return ranked.filter((match) => match.tier <= MATCH_TIER.tokenMatch || match.fuzzyScore >= DUPLICATE_SUGGESTION_THRESHOLD).map((match) => match.candidate);
}
