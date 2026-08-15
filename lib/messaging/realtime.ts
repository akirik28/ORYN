/**
 * Pure decision logic for the conversation-thread realtime subscription
 * (features/messaging/conversation-thread.tsx). The channel filter already narrows
 * Postgres Changes events to `recipient_id = <me>` server-side, but one recipient can
 * have open conversations with many people — this is the client-side check that an
 * incoming INSERT actually belongs to *this* open thread before triggering a refetch.
 *
 * Kept as a named, pure predicate (rather than inlined in the effect) specifically so
 * "does a duplicate or out-of-order event still resolve correctly" and "is a message
 * from someone else in this conversation ignored" are both regression-tested without
 * needing a real Realtime connection — the design's actual duplicate-safety comes from
 * the caller always re-fetching authoritative state instead of applying the payload
 * (see the effect's own comment), not from anything stateful in here, so this function
 * has no memory of past calls and calling it twice with the same input is always safe.
 */
export function isMessageFromConversationPartner(messageSenderId: string, otherUserId: string): boolean {
  return messageSenderId === otherUserId;
}
