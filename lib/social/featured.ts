import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { FeaturedItem, FeaturedItemType } from "@/types/database";
import { canViewPortfolio } from "./public-profile-authorization";

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

interface SourceRow {
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

/**
 * Re-verifies each pinned item against its CURRENT source row at read time (migration
 * 0033's own comment: a featured item carries no privacy state of its own — it's visible
 * exactly when the rest of the portfolio would be, so this gates on the same
 * canViewPortfolio check as lib/social/public-profile.ts, and a since-deleted or
 * since-transferred source row is silently dropped rather than shown stale).
 */
export async function getFeaturedItems(userId: string, viewer: { isSelf: boolean; isPublic: boolean }): Promise<ResolvedFeaturedItem[]> {
  if (!canViewPortfolio(viewer)) return [];

  const admin = createAdminClient();
  const { data: rows } = await admin.from("featured_items").select("*").eq("user_id", userId).order("display_order");
  if (!rows || rows.length === 0) return [];

  const rowsByType = new Map<FeaturedItemType, FeaturedItem[]>();
  for (const row of rows) {
    const list = rowsByType.get(row.item_type) ?? [];
    list.push(row);
    rowsByType.set(row.item_type, list);
  }

  const resolvedById = new Map<string, ResolvedFeaturedItem>();

  for (const row of rowsByType.get("external_link") ?? []) {
    resolvedById.set(row.id, {
      id: row.id,
      itemType: "external_link",
      title: row.external_title ?? row.external_url ?? "Link",
      organization: null,
      description: null,
      url: row.external_url,
      displayOrder: row.display_order,
    });
  }

  for (const [type, table] of Object.entries(FEATURED_SOURCE_TABLES) as [Exclude<FeaturedItemType, "external_link">, string][]) {
    const typeRows = rowsByType.get(type) ?? [];
    const ids = typeRows.map((r) => r.item_id).filter((id): id is string => id !== null);
    if (ids.length === 0) continue;

    const { data: sourceRows } = await admin.from(table as "projects").select("*").in("id", ids).eq("user_id", userId);
    const sourceById = new Map((sourceRows ?? []).map((s) => [(s as SourceRow).id, s as SourceRow]));

    for (const row of typeRows) {
      const source = row.item_id ? sourceById.get(row.item_id) : undefined;
      if (!source) continue;
      resolvedById.set(row.id, {
        id: row.id,
        itemType: type,
        title: titleOf(source),
        organization: organizationOf(source),
        description: descriptionOf(source),
        url: null,
        displayOrder: row.display_order,
      });
    }
  }

  return rows.map((r) => resolvedById.get(r.id)).filter((r): r is ResolvedFeaturedItem => Boolean(r));
}
