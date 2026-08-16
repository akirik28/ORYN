import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { RecommendationRelationship, RecommendationStatus } from "@/types/database";

export interface RecommendationWithAuthor {
  id: string;
  authorId: string;
  authorName: string | null;
  relationship: RecommendationRelationship;
  body: string;
  status: RecommendationStatus;
  createdAt: string;
}

/**
 * Cross-user read (recommendations RLS only covers author/recipient — migration 0035 —
 * so displaying someone else's recommendations on their public profile needs the admin
 * client, same pattern as every other cross-user read in this pack). `includeHidden`
 * exists only for the owner's own management view — a public viewer must never see a
 * hidden recommendation, matching "recipient may show/hide" from the spec.
 */
export async function getRecommendationsFor(recipientId: string, opts: { includeHidden?: boolean } = {}): Promise<RecommendationWithAuthor[]> {
  const admin = createAdminClient();
  let query = admin.from("recommendations").select("id, author_id, relationship, body, status, created_at").eq("recipient_id", recipientId);
  if (!opts.includeHidden) query = query.eq("status", "visible");
  const { data } = await query.order("created_at", { ascending: false });
  const rows = data ?? [];

  const authorIds = Array.from(new Set(rows.map((r) => r.author_id)));
  const { data: authors } =
    authorIds.length > 0 ? await admin.from("profiles").select("id, display_name").in("id", authorIds) : { data: [] as { id: string; display_name: string | null }[] };
  const nameById = new Map((authors ?? []).map((a) => [a.id, a.display_name]));

  return rows.map((r) => ({
    id: r.id,
    authorId: r.author_id,
    authorName: nameById.get(r.author_id) ?? null,
    relationship: r.relationship,
    body: r.body,
    status: r.status,
    createdAt: r.created_at,
  }));
}
