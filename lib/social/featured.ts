import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { FeaturedItemType } from "@/types/database";
import { canViewPortfolio } from "./public-profile-authorization";
import { FEATURED_SOURCE_TABLES, resolveFeaturedItems, type ResolvedFeaturedItem, type SourceRow } from "./featured-rules";

export * from "./featured-rules";

/**
 * Re-verifies each pinned item against its CURRENT source row at read time (migration
 * 0033's own comment: a featured item carries no privacy state of its own — it's visible
 * exactly when the rest of the portfolio would be, so this gates on the same
 * canViewPortfolio check as lib/social/public-profile.ts). Thin async shell around the
 * pure resolveFeaturedItems (lib/social/featured-rules.ts).
 */
export async function getFeaturedItems(userId: string, viewer: { isSelf: boolean; isPublic: boolean }): Promise<ResolvedFeaturedItem[]> {
  if (!canViewPortfolio(viewer)) return [];

  // A missing admin credential degrading to "no featured items" is honest (there's
  // genuinely no way to read them right now) and matches this function's own
  // empty-array return for every other early-out case above — see tryCreateAdminClient's
  // own comment for why this matters (crashed app/(app)/profile/page.tsx, found
  // live-testing this pass).
  const admin = tryCreateAdminClient();
  if (!admin) return [];
  const { data: rows } = await admin.from("featured_items").select("*").eq("user_id", userId).order("display_order");
  if (!rows || rows.length === 0) return [];

  const rowsByType = new Map<FeaturedItemType, typeof rows>();
  for (const row of rows) {
    const list = rowsByType.get(row.item_type) ?? [];
    list.push(row);
    rowsByType.set(row.item_type, list);
  }

  const sourceRowsByKey = new Map<string, SourceRow>();
  for (const [type, table] of Object.entries(FEATURED_SOURCE_TABLES) as [Exclude<FeaturedItemType, "external_link">, string][]) {
    const typeRows = rowsByType.get(type) ?? [];
    const ids = typeRows.map((r) => r.item_id).filter((id): id is string => id !== null);
    if (ids.length === 0) continue;

    const { data: sourceRows } = await admin.from(table as "projects").select("*").in("id", ids).eq("user_id", userId);
    for (const source of sourceRows ?? []) {
      sourceRowsByKey.set(`${type}:${(source as SourceRow).id}`, source as SourceRow);
    }
  }

  return resolveFeaturedItems(rows, sourceRowsByKey);
}
