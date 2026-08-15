import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Message } from "@/types/database";
import { getConnections } from "@/lib/social/connections";
import { isUuidLike } from "@/lib/validation/uuid";

export interface ConversationSummary {
  otherUserId: string;
  otherDisplayName: string | null;
  lastMessage: Message | null;
  unreadCount: number;
}

/**
 * One entry per ACCEPTED connection — reuses `getConnections` (already the correctly-
 * scoped, RLS-respecting source of truth for "who am I accepted-connected to", including
 * the `public_profiles` carve-out that resolves a counterpart's name even if they've since
 * gone private) rather than re-deriving connection state here. A connection with zero
 * messages still appears (empty conversation, "say hello") — messaging a new accepted
 * connection for the first time is exactly the entry point Settings/Connections hands off
 * to.
 */
export async function getConversations(supabase: SupabaseClient<Database>, userId: string): Promise<ConversationSummary[]> {
  const { accepted } = await getConnections(supabase, userId);
  if (accepted.length === 0) return [];

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  const rows = messages ?? [];
  const lastByOther = new Map<string, Message>();
  const unreadByOther = new Map<string, number>();
  for (const m of rows) {
    const other = m.sender_id === userId ? m.recipient_id : m.sender_id;
    if (!lastByOther.has(other)) lastByOther.set(other, m); // rows are newest-first
    if (m.recipient_id === userId && !m.read_at) unreadByOther.set(other, (unreadByOther.get(other) ?? 0) + 1);
  }

  return accepted
    .map((c) => {
      const otherUserId = c.requester_id === userId ? c.recipient_id : c.requester_id;
      return {
        otherUserId,
        otherDisplayName: c.otherProfile?.display_name ?? null,
        lastMessage: lastByOther.get(otherUserId) ?? null,
        unreadCount: unreadByOther.get(otherUserId) ?? 0,
      };
    })
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
