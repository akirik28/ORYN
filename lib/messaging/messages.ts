import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Message, PublicProfileRow } from "@/types/database";
import { getConnections } from "@/lib/social/connections";
import { isUuidLike } from "@/lib/validation/uuid";

export interface ConversationSummary {
  otherUserId: string;
  otherDisplayName: string | null;
  lastMessage: Message | null;
  unreadCount: number;
  /** False when message history exists but the connection is gone (removed/never
   * reached accepted) — read-only in the UI. See lib/messaging/authorization.ts. */
  isConnected: boolean;
}

/**
 * One entry per ACCEPTED connection, plus one entry per counterpart with retained message
 * history even without a live connection (removed connection — see
 * lib/messaging/authorization.ts: disconnecting must not make prior conversations
 * unreachable). A connection with zero messages still appears (empty conversation, "say
 * hello") — messaging a new accepted connection for the first time is exactly the entry
 * point Settings/Connections hands off to.
 */
export async function getConversations(supabase: SupabaseClient<Database>, userId: string): Promise<ConversationSummary[]> {
  const { accepted } = await getConnections(supabase, userId);

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  const rows = messages ?? [];
  const lastByOther = new Map<string, Message>();
  const unreadByOther = new Map<string, number>();
  const historyPartnerIds = new Set<string>();
  for (const m of rows) {
    const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
    historyPartnerIds.add(other);
    if (!lastByOther.has(other)) lastByOther.set(other, m); // rows are newest-first
    if (m.recipient_id === userId && !m.read_at) unreadByOther.set(other, (unreadByOther.get(other) ?? 0) + 1);
  }

  const acceptedIds = new Set(accepted.map((c) => (c.requester_id === userId ? c.recipient_id : c.requester_id)));
  const profileByOther = new Map<string, PublicProfileRow | null>(
    accepted.map((c) => [c.requester_id === userId ? c.recipient_id : c.requester_id, c.otherProfile])
  );

  // History-only partners (no live accepted connection): resolve display names in one
  // extra batch query. public_profiles can legitimately return nothing for a since-
  // private, disconnected counterpart — falls back to "A student" in the UI, same as any
  // other name-resolution gap.
  const historyOnlyIds = [...historyPartnerIds].filter((id) => !acceptedIds.has(id));
  if (historyOnlyIds.length > 0) {
    const { data: extraProfiles } = await supabase.from("public_profiles").select("*").in("id", historyOnlyIds);
    for (const p of extraProfiles ?? []) profileByOther.set(p.id, p);
  }

  const allOtherIds = new Set([...acceptedIds, ...historyPartnerIds]);

  return [...allOtherIds]
    .map((otherUserId) => ({
      otherUserId,
      otherDisplayName: profileByOther.get(otherUserId)?.display_name ?? null,
      lastMessage: lastByOther.get(otherUserId) ?? null,
      unreadCount: unreadByOther.get(otherUserId) ?? 0,
      isConnected: acceptedIds.has(otherUserId),
    }))
    .sort((a, b) => {
      const at = a.lastMessage?.created_at ?? "";
      const bt = b.lastMessage?.created_at ?? "";
      return bt.localeCompare(at);
    });
}

/** Full message history with one other user, oldest first (reading order). RLS is the
 * real authorization gate (`select own messages` — sender or recipient); `isUuidLike`
 * just avoids sending a malformed id into the query, same defense-in-depth convention as
 * `getConnectionWith`. */
export async function getConversation(supabase: SupabaseClient<Database>, userId: string, otherUserId: string): Promise<Message[]> {
  if (!isUuidLike(otherUserId)) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
    .order("created_at", { ascending: true });
  return data ?? [];
}

export interface BlockState {
  /** Did the CURRENT user block the other party. Directly readable — `blocked_users`
   * RLS lets a user select rows where they are the blocker. */
  blockedByMe: boolean;
  /** Is messaging blocked in either direction. Symmetric and deliberately not direction-
   * disclosing — see lib/messaging/authorization.ts. */
  messagingBlocked: boolean;
}

export async function getBlockState(supabase: SupabaseClient<Database>, userId: string, otherUserId: string): Promise<BlockState> {
  if (!isUuidLike(otherUserId)) return { blockedByMe: false, messagingBlocked: false };

  const [blockedByMeRes, messagingBlockedRes] = await Promise.all([
    supabase.from("blocked_users").select("id").eq("blocker_id", userId).eq("blocked_id", otherUserId).maybeSingle(),
    supabase.rpc("is_blocked_between", { user_a: userId, user_b: otherUserId }),
  ]);

  return {
    blockedByMe: Boolean(blockedByMeRes.data),
    messagingBlocked: Boolean(messagingBlockedRes.data),
  };
}
