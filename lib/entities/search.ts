import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { ENTITY_SCOPES, type EntityScope } from "./field-policy";
import { normalizeEntitySearchText } from "./normalize";
import { rankEntityCandidates, type EntityCandidate } from "./rank";
import type { EntitySearchResult, EntitySearchContext } from "./types";
import { getSupersededUniversityIds, loadSupersessionMap } from "@/lib/universities/canonical";

export type { EntityScope, EntitySearchResult, EntitySearchContext } from "./types";

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

/**
 * Canonical-registry search runs in Postgres, not TypeScript.
 *
 * The `search_canonical_entities` RPC (migration 0038) does exact > prefix > alias >
 * trigram-fuzzy ranking over the whole registry with `unaccent()` folding, backed by GIN
 * trigram indexes. The alternative — fetching a capped candidate set and ranking it in
 * TS — silently truncates: the registry holds 1,143 entities today and over a thousand
 * of them are universities, so any cap small enough to be cheap is also small enough to
 * drop the right answer before ranking ever sees it.
 *
 * lib/entities/rank.ts is still used, for the two jobs SQL is the wrong tool for: the
 * country/city context boost applied to the (small, already-ranked) result set below,
 * and the "did you mean X?" duplicate check in resolve.ts.
 */
interface CanonicalSearchRow {
  entity_id: string;
  entity_type: string;
  canonical_name: string;
  display_name: string;
  country_code: string | null;
  city: string | null;
  verification_state: string;
  matched_text: string;
  matched_via: string;
  score: number;
}

function subtitleOf(parts: (string | null | undefined)[]): string | null {
  const kept = parts.filter((part): part is string => Boolean(part && part.trim()));
  if (kept.length === 0) return null;
  if (kept.length === 1) return kept[0];
  return `${kept.slice(0, -1).join(", ")} · ${kept[kept.length - 1]}`;
}

function humanizeEntityType(entityType: string): string {
  return entityType.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Nudges ordering within what SQL already matched, using the student's own country/city.
 * Context ranks, it never filters — a boost can only reorder results the query already
 * returned, so a student whose profile says Turkey can still find a US university.
 */
function applyContextBoost(rows: CanonicalSearchRow[], context: EntitySearchContext): CanonicalSearchRow[] {
  const country = context.country ? normalizeEntitySearchText(context.country) : null;
  const city = context.city ? normalizeEntitySearchText(context.city) : null;
  if (!country && !city) return rows;

  return rows
    .map((row) => {
      let boost = 0;
      if (country && row.country_code && normalizeEntitySearchText(row.country_code) === country) boost += 0.02;
      if (city && row.city && normalizeEntitySearchText(row.city) === city) boost += 0.01;
      return { row, sortScore: row.score + boost };
    })
    .sort((a, b) => b.sortScore - a.sortScore || a.row.display_name.localeCompare(b.row.display_name))
    .map((entry) => entry.row);
}

async function searchCanonicalRegistry(
  supabase: SupabaseClient<Database>,
  scope: EntityScope,
  query: string,
  context: EntitySearchContext
): Promise<CanonicalSearchRow[]> {
  const { data, error } = await supabase.rpc("search_canonical_entities", {
    q: query,
    p_entity_types: [...ENTITY_SCOPES[scope].allowedTypes],
    // Over-fetch relative to RESULT_LIMIT so the context boost has something to reorder.
    p_limit: RESULT_LIMIT * 3,
  });

  if (error) {
    console.error("[entities] canonical search failed", { scope, code: error.code, message: error.message });
    return [];
  }
  return applyContextBoost((data ?? []) as CanonicalSearchRow[], context);
}

/**
 * Universities resolve to `universities.id`, not to their canonical entity id: that is
 * what target_universities and every other university foreign key already reference.
 * The *search* still runs over the canonical registry, so alias and accent handling is
 * identical to every other field ("MIT", "bogazici"), then the matched entity ids are
 * mapped back to their university rows. A canonical university entity with no
 * `universities` row is not selectable and drops out here — deliberate: those are
 * identities the university stack has not ingested statistics for yet.
 */
async function searchUniversities(
  supabase: SupabaseClient<Database>,
  query: string,
  context: EntitySearchContext
): Promise<EntitySearchResult[]> {
  const rows = await searchCanonicalRegistry(supabase, "university", query, context);
  if (rows.length === 0) return [];

  // A known-duplicate universities row (both sides confirmed the same institution, but never
  // row-level cleaned up — see lib/universities/canonical.ts) shares its canonical_entity_id
  // with its winner, so without this exclusion the Map below could non-deterministically keep
  // whichever row Postgres returns last for that key — sometimes the loser. Excluding at the
  // query level is also what stops a loser row from ever being offered as a selectable result.
  const supersessionMap = await loadSupersessionMap(supabase);
  const supersededIds = getSupersededUniversityIds(supersessionMap);
  let universitiesQuery = supabase
    .from("universities")
    .select("id, name, city, country, institution_type, canonical_entity_id")
    .in("canonical_entity_id", rows.map((row) => row.entity_id));
  if (supersededIds.length > 0) universitiesQuery = universitiesQuery.not("id", "in", `(${supersededIds.join(",")})`);
  const { data } = await universitiesQuery;

  const byEntityId = new Map((data ?? []).map((row) => [row.canonical_entity_id, row]));

  return rows
    .map((row) => byEntityId.get(row.entity_id))
    .filter((row): row is NonNullable<typeof row> => Boolean(row))
    .slice(0, RESULT_LIMIT)
    .map((row) => ({
      id: row.id,
      displayName: row.name,
      subtitle: subtitleOf([row.city, row.country, row.institution_type]),
      isCustom: false,
    }));
}

/**
 * Opportunities are not in the canonical registry — they are catalogue records with a
 * deadline, eligibility and a source URL, produced by the discovery pipeline. Their
 * search is a name match ranked in TS, with no aliases: nothing stores alternate names for
 * an opportunity today, and inventing them from the title would be fabricated data.
 *
 * Two bugs lived here, and together they made most of the catalogue unreachable from the
 * Journey/profile comboboxes even though Browse listed it happily:
 *
 * 1. **`.eq("country", context.country)` was a hard exclusion.** `opportunities.country` is
 *    null for anything international or online — 243 of 421 rows live — so every one of
 *    those disappeared for any student who had a country on their profile. That is how
 *    "Purple Comet! Math Meet" (status active, country null) was visible in Opportunities
 *    and unfindable from Journey. Raw `.eq` also ignored the spelling problem Browse
 *    already solves with `isSameCountry`: the live data contains both "Turkey" and
 *    "Türkiye". Country is now a *ranking* input only, which is what
 *    `rankEntityCandidates` already does with it (a +10 boost on an exact match) — Browse
 *    treats country as a filter the student chooses, and search should not silently apply
 *    a stricter rule than the surface the student just came from.
 *
 * 2. **The candidate fetch was an unordered `.limit(300)` with no name predicate**, so
 *    ranking ran over an arbitrary 300 of 421 rows and would only get worse as the
 *    catalogue grows. The name filter now runs in SQL, so the rows fetched are the rows
 *    that could actually match.
 */
async function searchOpportunities(
  supabase: SupabaseClient<Database>,
  query: string,
  context: EntitySearchContext
): Promise<EntitySearchResult[]> {
  const OPPORTUNITY_CANDIDATE_LIMIT = 300;
  const trimmed = query.trim();

  let candidateQuery = supabase
    .from("opportunities")
    .select("id, title, category, organization, country")
    .eq("status", "active");

  if (trimmed.length > 0) {
    // Escape PostgREST's own wildcards so a literal % or _ in a title search doesn't
    // silently widen the pattern.
    const pattern = `%${trimmed.replace(/[%_]/g, (c) => `\\${c}`)}%`;
    candidateQuery = candidateQuery.ilike("title", pattern);
  }

  const { data } = await candidateQuery.limit(OPPORTUNITY_CANDIDATE_LIMIT);

  const rows = data ?? [];
  const byId = new Map(rows.map((row) => [row.id, row]));
  const candidates: EntityCandidate[] = rows.map((row) => ({
    id: row.id,
    canonicalName: row.title,
    aliases: [],
    country: row.country,
    city: null,
  }));

  return rankEntityCandidates(query, candidates, context)
    .slice(0, RESULT_LIMIT)
    .map((match) => {
      const row = byId.get(match.candidate.id)!;
      return {
        id: row.id,
        displayName: row.title,
        subtitle: subtitleOf([row.organization, row.category]),
        isCustom: false,
      };
    });
}

/**
 * The one search entry point every EntityCombobox instance calls (via
 * app/(app)/entities/actions.ts's searchEntities Server Action) — dispatches to the
 * right registry by scope.
 */
export async function searchEntities(
  supabase: SupabaseClient<Database>,
  scope: EntityScope,
  query: string,
  context: EntitySearchContext = {}
): Promise<EntitySearchResult[]> {
  if (query.trim().length < MIN_QUERY_LENGTH) return [];

  const registry = ENTITY_SCOPES[scope].registry;
  if (registry === "universities") return searchUniversities(supabase, query, context);
  if (registry === "opportunities") return searchOpportunities(supabase, query, context);

  const rows = await searchCanonicalRegistry(supabase, scope, query, context);
  return rows.slice(0, RESULT_LIMIT).map((row) => ({
    id: row.entity_id,
    displayName: row.display_name,
    subtitle: subtitleOf([row.city, row.country_code, humanizeEntityType(row.entity_type)]),
    isCustom: row.verification_state === "user_submitted",
  }));
}
