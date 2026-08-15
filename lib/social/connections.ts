import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Connection, Database, PublicProfileRow } from "@/types/database";

export interface ConnectionWithProfile extends Connection {
  otherProfile: PublicProfileRow | null;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuidLike(value: string): boolean {
  return UUID_RE.test(value);
}

/** Batch-fetch-and-zip (no nested PostgREST embed — see docs/chat-1-handoff.md's
 * "implementation decisions Chat 2 must not casually break"): fetch the caller's
 * connection rows, then the other party's public_profiles rows in one `.in()`, then zip
 * in application code. `public_profiles` includes the "connected with caller" carve-out
 * (migration 0023), so this resolves even for a since-gone-private counterpart. */
export async function getConnections(supabase: SupabaseClient<Database>, userId: string) {
  const { data: rows } = await supabase
    .from("connections")
    .select("*")
    .or(`requester_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  const connections = rows ?? [];
  const otherIds = Array.from(new Set(connections.map((c) => (c.requester_id === userId ? c.recipient_id : c.requester_id))));

  const { data: profiles } =
    otherIds.length > 0 ? await supabase.from("public_profiles").select("*").in("id", otherIds) : { data: [] as PublicProfileRow[] };

  const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
  const withProfiles: ConnectionWithProfile[] = connections.map((c) => ({
    ...c,
    otherProfile: profileById.get(c.requester_id === userId ? c.recipient_id : c.requester_id) ?? null,
  }));

  return {
    accepted: withProfiles.filter((c) => c.status === "accepted"),
    incomingPending: withProfiles.filter((c) => c.status === "pending" && c.recipient_id === userId),
    outgoingPending: withProfiles.filter((c) => c.status === "pending" && c.requester_id === userId),
  };
}

export async function getConnectionWith(supabase: SupabaseClient<Database>, userId: string, otherId: string): Promise<Connection | null> {
  if (!isUuidLike(otherId)) return null;
  const { data } = await supabase
    .from("connections")
    .select("*")
    .or(`and(requester_id.eq.${userId},recipient_id.eq.${otherId}),and(requester_id.eq.${otherId},recipient_id.eq.${userId})`)
    .maybeSingle();
  return data;
}
