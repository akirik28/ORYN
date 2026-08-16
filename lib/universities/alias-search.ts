import { rankEntityCandidates, type EntityCandidate } from "@/lib/entities/rank";

/**
 * Alias- and accent-aware ranking for university search, reusing the Canonical Entity
 * Autocomplete System's own engine (lib/entities/rank.ts) rather than a second one.
 * Pure — no `server-only`, no Supabase — so both callers (the University Explorer page
 * and the global command palette) hand it rows they already fetched, and it stays unit
 * testable.
 *
 * Fixes two real gaps in the previous plain `ilike("name", "%q%")`: "MIT" never matched
 * "Massachusetts Institute of Technology" (aliases weren't searched at all), and
 * "uskudar" never matched "Üsküdar ..." (ILIKE doesn't fold accents).
 *
 * Callers fetch a bounded candidate set and rank in TS — the same trade-off, and the
 * same revisit-when-it-grows note, as lib/entities/search.ts's own documented approach.
 */
export interface UniversityLike {
  id: string;
  name: string;
  aliases: string[];
  city: string | null;
  country: string;
}

export function rankUniversities<T extends UniversityLike>(query: string, rows: T[], limit: number): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const candidates: EntityCandidate[] = rows.map((row) => ({
    id: row.id,
    canonicalName: row.name,
    aliases: row.aliases,
    country: row.country,
    city: row.city,
  }));

  return rankEntityCandidates(query, candidates)
    .slice(0, limit)
    .map((match) => byId.get(match.candidate.id)!)
    .filter(Boolean);
}
