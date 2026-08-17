import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, University } from "@/types/database";
import { rankEntityCandidates, type EntityCandidate } from "@/lib/entities/rank";
import { getSupersededUniversityIds } from "@/lib/universities/canonical";

/**
 * University name search, alias- and accent-aware.
 *
 * Aliases live in `entity_aliases`, attached to the canonical entity each university row
 * points at (`universities.canonical_entity_id`) — not in a column on `universities`
 * itself. So the search runs as the same `search_canonical_entities` RPC every other
 * entity field uses, scoped to `entity_type='university'`, and the matched entity ids
 * are then mapped back to university rows. That is what makes "MIT" resolve to
 * Massachusetts Institute of Technology and "bogazici" to "Boğaziçi Üniversitesi", which
 * a plain `ilike` can do neither of.
 *
 * Ranking in Postgres rather than TypeScript matters here specifically: there are over a
 * thousand universities, so any candidate cap cheap enough to fetch is also small enough
 * to drop the right answer before a TS ranker ever sees it.
 */
export interface UniversityLike {
  id: string;
  name: string;
  aliases: string[];
  city: string | null;
  country: string;
}

/**
 * Pure ranker over rows the caller already has, kept for the one case SQL can't serve:
 * ranking a fixed in-memory set (unit tests, and any future client-side filter over an
 * already-fetched page). The live search path below does not use it.
 */
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

interface CanonicalHit {
  entity_id: string;
  score: number;
}

/**
 * Relevance-ordered university rows for a text query, optionally narrowed to a set of
 * countries. Returns `[]` (not "everything") when nothing matches, so a caller can tell
 * "no results" apart from "no query".
 */
export async function searchUniversityRows(
  supabase: SupabaseClient<Database>,
  query: string,
  options: { limit: number; countries?: string[] | null }
): Promise<University[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const { data: hits, error } = await supabase.rpc("search_canonical_entities", {
    q: trimmed,
    p_entity_types: ["university"],
    // The RPC caps at 50. Over-fetch relative to `limit` because some matched entities
    // have no `universities` row yet, and a country filter can drop more.
    p_limit: 50,
  });

  if (error) {
    console.error("[universities] canonical search failed", { code: error.code, message: error.message });
    return [];
  }

  const ordered = ((hits ?? []) as CanonicalHit[]).map((hit) => hit.entity_id);
  if (ordered.length === 0) return [];

  // `canonical_entity_id` is shared by every universities row that has been confirmed (via
  // merge_canonical_entities) to be the same institution as another row — so this filter alone
  // returns BOTH "UCL" and "University College London" for a search that matched their one
  // shared entity. Excluding known-superseded ids at the query level is what makes the RPC's
  // already-deduplicated one-entity-id result stay one row after the join back to
  // `universities` (see lib/universities/canonical.ts for why this can't be a DB-level filter
  // yet — migration 0043 is written but not DDL-applicable in this environment).
  const supersededIds = getSupersededUniversityIds();
  let rowQuery = supabase.from("universities").select("*").in("canonical_entity_id", ordered);
  if (supersededIds.length > 0) rowQuery = rowQuery.not("id", "in", `(${supersededIds.join(",")})`);
  if (options.countries && options.countries.length > 0) rowQuery = rowQuery.in("country", options.countries);
  const { data } = await rowQuery;

  const rank = new Map(ordered.map((entityId, index) => [entityId, index]));
  return (data ?? [])
    .slice()
    .sort((a, b) => (rank.get(a.canonical_entity_id ?? "") ?? Infinity) - (rank.get(b.canonical_entity_id ?? "") ?? Infinity))
    .slice(0, options.limit);
}
