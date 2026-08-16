/**
 * Pure rules for Featured items — deliberately no `server-only` import (unlike
 * lib/social/featured.ts, which re-exports everything here) so this module can be unit
 * tested directly, same split as lib/social/skills.ts vs. its DB-touching callers.
 */

import type { FeaturedItem, FeaturedItemType } from "@/types/database";

export interface ResolvedFeaturedItem {
  id: string;
  itemType: FeaturedItemType;
  title: string;
  organization: string | null;
  description: string | null;
  url: string | null;
  displayOrder: number;
}

/** Every non-external featured type maps to exactly one existing achievement table —
 * no duplicate "featured item" copy of the underlying data (spec: reuse existing
 * source tables). */
export const FEATURED_SOURCE_TABLES: Record<Exclude<FeaturedItemType, "external_link">, string> = {
  project: "projects",
  research_experience: "research_experiences",
  award: "awards",
  activity: "activities",
  work_experience: "work_experiences",
  volunteering_experience: "volunteering_experiences",
  sports_experience: "sports_experiences",
};

export interface SourceRow {
  id: string;
  title?: string | null;
  sport?: string | null;
  organization?: string | null;
  team_name?: string | null;
  description?: string | null;
  outcome_summary?: string | null;
  achievements?: string | null;
}

function titleOf(row: SourceRow): string {
  return row.title ?? row.sport ?? "Untitled";
}
function organizationOf(row: SourceRow): string | null {
  return row.organization ?? row.team_name ?? null;
}
function descriptionOf(row: SourceRow): string | null {
  return row.outcome_summary ?? row.description ?? row.achievements ?? null;
}

export const MAX_FEATURED_ITEMS = 5;

/** Pure cap check — the DB has no row-count constraint on featured_items (a soft product
 * limit, not a security boundary), so this is the only place it's enforced. */
export function canAddAnotherFeaturedItem(currentCount: number): boolean {
  return currentCount < MAX_FEATURED_ITEMS;
}

/**
 * Pre-check for a friendly "already featured" error before the DB's own partial unique
 * index (`featured_items_user_item_idx`, migration 0033 — `where item_id is not null`)
 * would reject the insert — same pre-check-plus-DB-backstop shape as
 * lib/social/skills.ts's isDuplicateSkillName. External links have no such index (a
 * student can feature the same URL twice under two different titles), so this always
 * returns false for `external_link`.
 */
export function isDuplicateFeaturedSource(
  existing: { itemType: FeaturedItemType; itemId: string | null }[],
  itemType: FeaturedItemType,
  itemId: string | null
): boolean {
  if (itemType === "external_link" || itemId === null) return false;
  return existing.some((item) => item.itemType === itemType && item.itemId === itemId);
}

/**
 * Ownership re-verification for a source item being featured (spec: "featuring an item
 * must never bypass the underlying item's own privacy" — the ownership half of that;
 * read-time privacy is resolveFeaturedItems below). Takes an already-fetched row rather
 * than doing its own query so it stays pure and testable; the caller fetches by id alone
 * (not `.eq("user_id", ...)`) so this predicate is the one place "owned or not" is
 * decided — RLS on the source table is the redundant, real backstop underneath either
 * way, same "never trust one layer alone" convention as every other authorization-
 * sensitive action in this app.
 */
export function isFeaturedSourceOwnedByRequester(sourceRow: { user_id: string } | null, requestingUserId: string): boolean {
  return sourceRow !== null && sourceRow.user_id === requestingUserId;
}

/** All-or-nothing ownership check for a reorder request — mirrors the original inline
 * `owned.length !== orderedIds.length` shape exactly (a mismatch means at least one
 * requested id wasn't found among the caller's own featured_items rows). */
export function allFeaturedIdsOwned(ownedIds: string[], requestedIds: string[]): boolean {
  return requestedIds.length > 0 && ownedIds.length === requestedIds.length;
}

/** orderedIds[0] becomes display_order 0, and so on — the entire "reorder" operation. */
export function buildFeaturedReorder(orderedIds: string[]): { id: string; displayOrder: number }[] {
  return orderedIds.map((id, index) => ({ id, displayOrder: index }));
}

/**
 * Pure resolution: given the caller's featured_items rows and a lookup of their CURRENT
 * source rows (keyed `${item_type}:${item_id}`), produces the display-ready list —
 * silently dropping any row whose source can't be found (since-deleted, or since
 * transferred to another user and no longer present under this userId's own fetch,
 * which is itself the source-privacy-cannot-be-bypassed guarantee: the source query in
 * lib/social/featured.ts's getFeaturedItems is always scoped `.eq("user_id", userId)`,
 * so a row that no longer belongs to this user resolves to nothing here rather than
 * showing someone else's private data under this profile's Featured section).
 */
export function resolveFeaturedItems(rows: FeaturedItem[], sourceRowsByKey: Map<string, SourceRow>): ResolvedFeaturedItem[] {
  const resolvedById = new Map<string, ResolvedFeaturedItem>();

  for (const row of rows) {
    if (row.item_type === "external_link") {
      resolvedById.set(row.id, {
        id: row.id,
        itemType: "external_link",
        title: row.external_title ?? row.external_url ?? "Link",
        organization: null,
        description: null,
        url: row.external_url,
        displayOrder: row.display_order,
      });
      continue;
    }

    if (!row.item_id) continue;
    const source = sourceRowsByKey.get(`${row.item_type}:${row.item_id}`);
    if (!source) continue; // since-deleted or no longer this user's — silently dropped, never shown stale
    resolvedById.set(row.id, {
      id: row.id,
      itemType: row.item_type,
      title: titleOf(source),
      organization: organizationOf(source),
      description: descriptionOf(source),
      url: null,
      displayOrder: row.display_order,
    });
  }

  return rows.map((r) => resolvedById.get(r.id)).filter((r): r is ResolvedFeaturedItem => Boolean(r));
}
