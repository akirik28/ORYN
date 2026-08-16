/**
 * Client-safe types for the Canonical Entity Autocomplete System, split out from
 * lib/entities/search.ts (which is `server-only` and pulls in the Supabase client) —
 * same reasoning as lib/portfolio/types.ts: a Client Component importing anything from
 * a server-only module drags the whole module into the client bundle graph and fails
 * the build, even if it only wanted a type.
 */

export type EntitySearchType = "school" | "organization" | "university" | "opportunity";

export interface EntitySearchResult {
  id: string;
  /** Always the canonical name as stored — never the normalized search string (spec:
   * "Display her zaman canonical presentation name olsun"). */
  displayName: string;
  /** Disambiguation line — "Istanbul, Turkey · High School" style (spec section 4). */
  subtitle: string | null;
  isCustom: boolean;
}

export interface EntitySearchContext {
  country?: string | null;
  city?: string | null;
}
