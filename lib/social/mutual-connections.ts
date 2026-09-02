import "server-only";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { intersectAcceptedConnections, excludeBlockedIds } from "./mutual-connections-rules";

export * from "./mutual-connections-rules";

/** Everyone `userId` has an *accepted* connection with — deliberately narrower than
 * `canViewBasicProfile`'s `hasAcceptedConnection`/`hasPendingRequestFromTarget` pair
 * elsewhere in this pack (pending doesn't count as a real mutual friend here, though it
 * does unlock basic profile visibility there — two different questions). Two-query, no
 * N+1: one `.or()` covering both participant columns. */
async function getAcceptedConnectionIds(userId: string): Promise<Set<string>> {
  // A missing admin credential degrades to "no accepted connections found" — see
  // tryCreateAdminClient's own comment for why (crashed a page render, found
  // live-testing this pass).
  const admin = tryCreateAdminClient();
  if (!admin) return new Set();
  const { data } = await admin
    .from("connections")
    .select("requester_id, recipient_id")
    .eq("status", "accepted")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`);
  return new Set((data ?? []).map((row) => (row.requester_id === userId ? row.recipient_id : row.requester_id)));
}

/** Everyone blocked with `userId`, either direction — admin client bypasses
 * blocked_users' own owner-only RLS (a normal client can only ever read blocks *it*
 * created), safe here because this never returns the block rows themselves, only a set
 * of ids used to filter another list before it's returned to anyone. */
async function getBlockedIds(userId: string): Promise<Set<string>> {
  // A missing admin credential degrades to "no blocks found" — see
  // tryCreateAdminClient's own comment for why (crashed a page render, found
  // live-testing this pass).
  const admin = tryCreateAdminClient();
  if (!admin) return new Set();
  const { data } = await admin.from("blocked_users").select("blocker_id, blocked_id").or(`blocker_id.eq.${userId},blocked_id.eq.${userId}`);
  return new Set((data ?? []).map((row) => (row.blocker_id === userId ? row.blocked_id : row.blocker_id)));
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

  const [aIds, bIds, blockedIds] = await Promise.all([getAcceptedConnectionIds(userA), getAcceptedConnectionIds(userB), getBlockedIds(userA)]);
  const mutualIds = excludeBlockedIds(intersectAcceptedConnections(aIds, bIds), blockedIds);
  if (mutualIds.length === 0) return { count: 0, preview: [] };

  // A missing admin credential still reports the correct count (computed above from
  // connections/blocked_users reads that already degrade to empty sets) but with an
  // empty preview rather than crashing — see tryCreateAdminClient's own comment for why.
  const admin = tryCreateAdminClient();
  if (!admin) return { count: mutualIds.length, preview: [] };
  const { data } = await admin.from("profiles").select("id, display_name").in("id", mutualIds.slice(0, PREVIEW_LIMIT));

  return {
    count: mutualIds.length,
    preview: (data ?? []).map((row) => ({ id: row.id, displayName: row.display_name })),
  };
}
