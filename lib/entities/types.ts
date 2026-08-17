/**
 * Client-safe types for the Canonical Entity Autocomplete System, split out from
 * lib/entities/search.ts (which is `server-only` and pulls in the Supabase client) —
 * same reasoning as lib/portfolio/types.ts: a Client Component importing anything from
 * a server-only module drags the whole module into the client bundle graph and fails
 * the build, even if it only wanted a type.
 */

export type { EntityScope, CanonicalEntityType } from "./field-policy";

export interface EntitySearchResult {
  /**
   * The id to store in the field's `*_entity_id` column — a canonical_entities id for
   * every scope except `university`/`opportunity`, which resolve to their own domain
   * table's primary key because that is what the existing foreign keys point at.
   */
  id: string;
  /** Always the entity's display name as stored — never the normalized search string. */
  displayName: string;
  /** Disambiguation line — "Istanbul, Turkey · School" style. */
  subtitle: string | null;
  /**
   * True for a `user_submitted` registry row: something a student added through the
   * custom fallback that no one has checked against an official source yet. The UI
   * labels these so a student can tell a curated entity from a provisional one.
   */
  isCustom: boolean;
}

export interface EntitySearchContext {
  country?: string | null;
  city?: string | null;
}
