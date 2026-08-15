import type { SearchResult } from "./types";

/** Escapes ilike's two wildcard characters (plus the escape character itself) so a literal
 * "%" or "_" typed by a student is searched for literally instead of acting as a wildcard. */
export function toIlikePattern(term: string): string {
  const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
  return `%${escaped}%`;
}

/**
 * Pure ranking: exact title match first, then "starts with," then everything else
 * (alphabetical within each tier). No AI, no scoring model — a global search box needs to
 * feel instant and predictable, not probabilistic (Phase 27: deterministic where possible).
 */
export function rankResults(term: string, results: SearchResult[]): SearchResult[] {
  const needle = term.trim().toLowerCase();

  function tier(result: SearchResult): number {
    const title = result.title.toLowerCase();
    if (title === needle) return 0;
    if (title.startsWith(needle)) return 1;
    return 2;
  }

  return [...results].sort((a, b) => tier(a) - tier(b) || a.title.localeCompare(b.title));
}
