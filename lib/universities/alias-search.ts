import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, University } from "@/types/database";
import { rankEntityCandidates, type EntityCandidate } from "@/lib/entities/rank";
import { getSupersededUniversityIds, loadSupersessionMap } from "@/lib/universities/canonical";

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
 *
 * 2026-09-03 (tier 2, docs/okuma-hatasi-vs-bos-sonuc-karari-2026-09-03.md): a genuinely
 * failed RPC call used to log and then return this same `[]` -- indistinguishable from "no
 * results" to every caller, in a product whose search box exists specifically to find a
 * university. Now throws instead, matching lib/search/index.ts's own unwrap() convention
 * (same file, same night, already the house pattern for every OTHER global-search source) --
 * a caller that wants that failure to look like "no results" catches it locally and says so
 * explicitly, rather than this shared function deciding silently for every caller at once.
 * lib/universities/browse-page.ts's loadUniversityBrowsePage is exactly that caller: its
 * text-search path is one of three ways into one page that also serves filter-browsing and
 * plain browsing through the same function, so a search-specific failure propagating
 * uncaught would take the whole page down to app/(app)/error.tsx's generic boundary, losing
 * filters and country counts too -- confirmed by reading that boundary and that page's call
 * site before deciding, not assumed. Its own try/catch (see that file) restores the
 * identical tolerant behavior this function used to provide internally; global search
 * (lib/search/index.ts's searchUniversities, no try/catch around this call) gets the
 * propagate-and-say-so behavior its own file already established for every sibling source.
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
    throw new Error(`University search failed: ${error.message}`);
  }

  const ordered = ((hits ?? []) as CanonicalHit[]).map((hit) => hit.entity_id);
  if (ordered.length === 0) return [];

  // `canonical_entity_id` is shared by every universities row that has been confirmed (via
  // merge_canonical_entities) to be the same institution as another row — so this filter alone
  // returns BOTH "UCL" and "University College London" for a search that matched their one
  // shared entity. Excluding known-superseded ids at the query level is what makes the RPC's
  // already-deduplicated one-entity-id result stay one row after the join back to
  // `universities`. See lib/universities/canonical.ts.
  const supersessionMap = await loadSupersessionMap(supabase);
  const supersededIds = getSupersededUniversityIds(supersessionMap);
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
