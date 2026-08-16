import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/** Everyone `userId` has an *accepted* connection with — deliberately narrower than
 * `hasAnyConnection` elsewhere in this pack (pending/declined don't count as a real
 * mutual friend). Two-query, no N+1: one `.or()` covering both participant columns. */
async function getAcceptedConnectionIds(userId: string): Promise<Set<string>> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("connections")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  return new Set((data ?? []).map((row) => (row.requester_id === userId ? row.recipient_id : row.requester_id)));
}

export interface MutualConnectionsResult {
  count: number;
  /** First few, for a "John, Amara, and 3 others" style preview — never the full list
   * in one payload, matching this feature's "avoid N+1, avoid leaking more than
   * necessary" scope. */
  preview: { id: string; displayName: string | null }[];
}

const PREVIEW_LIMIT = 6;

export async function getMutualConnections(userA: string, userB: string): Promise<MutualConnectionsResult> {
  if (userA === userB) return { count: 0, preview: [] };

  const [aIds, bIds] = await Promise.all([getAcceptedConnectionIds(userA), getAcceptedConnectionIds(userB)]);
  const mutualIds = [...aIds].filter((id) => bIds.has(id));
  if (mutualIds.length === 0) return { count: 0, preview: [] };

  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select("id, display_name").in("id", mutualIds.slice(0, PREVIEW_LIMIT));

  return {
    count: mutualIds.length,
    preview: (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name })),
  };
}
