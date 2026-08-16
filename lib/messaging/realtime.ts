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

/**
 * PostgREST realtime filter for "new messages addressed to me" — deliberately
 * `recipient_id`, never `sender_id`. Flipping this would silently break the feature (the
 * viewer would stop hearing about incoming messages and instead see their own outgoing
 * sends echoed back), not leak anything RLS wouldn't already gate — but it's exactly the
 * kind of single-word mistake that's easy to introduce in a later edit and easy to miss
 * in review, so it's named and tested rather than left as an inline template string.
 */
export function newMessageChannelFilter(currentUserId: string): string {
  return `recipient_id=eq.${currentUserId}`;
}

/** One channel per open conversation (both participants), so a user with several
 * open threads across tabs/navigations doesn't collide on a shared channel name. */
export function newMessageChannelName(currentUserId: string, otherUserId: string): string {
  return `messages:${currentUserId}:${otherUserId}`;
}
