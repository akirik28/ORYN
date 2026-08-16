import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, InstitutionCategory } from "@/types/database";
import { rankEntityCandidates, type EntityCandidate } from "./rank";
import type { EntitySearchType, EntitySearchResult, EntitySearchContext } from "./types";

export type { EntitySearchType, EntitySearchResult, EntitySearchContext } from "./types";

const MIN_QUERY_LENGTH = 2;
const RESULT_LIMIT = 8;

/**
 * V1 fetches a bounded candidate set per type and ranks it in TS (lib/entities/rank.ts)
 * rather than pushing alias/fuzzy matching into SQL — correct and simple at the row
 * counts this table starts at (a slowly-grown custom+curated registry, not a bulk-
 * imported one). The migration's trigram index on `institutions.canonical_name` is
 * ready for a dedicated search RPC if/when a category+country combination grows past a
 * few hundred rows; not built now (spec: don't add unrelated features ahead of need).
 */
const CANDIDATE_FETCH_LIMIT = 300;

interface InstitutionRow {
  id: string;
  canonical_name: string;
  institution_type: string | null;
  country: string | null;
  city: string | null;
  aliases: string[];
  status: string;
}

function institutionSubtitle(row: InstitutionRow): string | null {
  return [row.city, row.country, row.institution_type].filter(Boolean).join(", ").replace(/, ([^,]+)$/, " · $1") || null;
}

async function fetchInstitutionCandidates(
  supabase: SupabaseClient<Database>,
  category: InstitutionCategory,
  country: string | null | undefined
): Promise<{ candidate: EntityCandidate; row: InstitutionRow }[]> {
  let query = supabase.from("institutions").select("id, canonical_name, institution_type, country, city, aliases, status").eq("category", category);
  if (country) query = query.eq("country", country);
  const { data } = await query.limit(CANDIDATE_FETCH_LIMIT);

  return (data ?? []).map((row) => ({
    row,
    candidate: { id: row.id, canonicalName: row.canonical_name, aliases: row.aliases, country: row.country, city: row.city },
  }));
}

async function fetchUniversityCandidates(supabase: SupabaseClient<Database>, country: string | null | undefined) {
  let query = supabase.from("universities").select("id, name, institution_type, country, city, aliases");
  if (country) query = query.eq("country", country);
  const { data } = await query.limit(CANDIDATE_FETCH_LIMIT);

  return (data ?? []).map((row) => ({
    row,
    candidate: { id: row.id, canonicalName: row.name, aliases: row.aliases, country: row.country, city: row.city } as EntityCandidate,
  }));
}

async function fetchOpportunityCandidates(supabase: SupabaseClient<Database>, country: string | null | undefined) {
  let query = supabase.from("opportunities").select("id, title, category, organization, country, aliases").eq("status", "active");
  if (country) query = query.eq("country", country);
  const { data } = await query.limit(CANDIDATE_FETCH_LIMIT);

  return (data ?? []).map((row) => ({
    row,
    candidate: { id: row.id, canonicalName: row.title, aliases: row.aliases, country: row.country, city: null } as EntityCandidate,
  }));
}

/**
 * The one search entry point every EntityCombobox instance calls (via
 * app/(app)/entities/actions.ts's searchEntities Server Action) — dispatches to the
 * right registry by type, then hands off to the shared pure ranker.
 */
export async function searchEntities(
  supabase: SupabaseClient<Database>,
  type: EntitySearchType,
  query: string,
  context: EntitySearchContext = {}
): Promise<EntitySearchResult[]> {
  if (query.trim().length < MIN_QUERY_LENGTH) return [];

  if (type === "school" || type === "organization") {
    const fetched = await fetchInstitutionCandidates(supabase, type, context.country);
    const ranked = rankEntityCandidates(
      query,
      fetched.map((f) => f.candidate),
      context
    );
    const rowById = new Map(fetched.map((f) => [f.row.id, f.row]));
    return ranked.slice(0, RESULT_LIMIT).map((match) => {
      const row = rowById.get(match.candidate.id)!;
      return { id: row.id, displayName: row.canonical_name, subtitle: institutionSubtitle(row), isCustom: row.status === "unverified" };
    });
  }

  if (type === "university") {
    const fetched = await fetchUniversityCandidates(supabase, context.country);
    const ranked = rankEntityCandidates(
      query,
      fetched.map((f) => f.candidate),
      context
    );
    const rowById = new Map(fetched.map((f) => [f.row.id, f.row]));
    return ranked.slice(0, RESULT_LIMIT).map((match) => {
      const row = rowById.get(match.candidate.id)!;
      return {
        id: row.id,
        displayName: row.name,
        subtitle: [row.city, row.country, row.institution_type].filter(Boolean).join(", ").replace(/, ([^,]+)$/, " · $1") || null,
        isCustom: false,
      };
    });
  }

  // opportunity
  const fetched = await fetchOpportunityCandidates(supabase, context.country);
  const ranked = rankEntityCandidates(
    query,
    fetched.map((f) => f.candidate),
    context
  );
  const rowById = new Map(fetched.map((f) => [f.row.id, f.row]));
  return ranked.slice(0, RESULT_LIMIT).map((match) => {
    const row = rowById.get(match.candidate.id)!;
    return { id: row.id, displayName: row.title, subtitle: [row.organization, row.category].filter(Boolean).join(" · ") || null, isCustom: false };
  });
}
