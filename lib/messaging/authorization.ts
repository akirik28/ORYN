/**
 * Pure authorization/UI-state decisions for a 1:1 conversation. Deliberately separated
 * from the Supabase-touching code in messages.ts so the actual rules — read vs. send,
 * and what a blocked party is told — are unit-testable without a live database.
 *
 * Two authorizations are intentionally different (founder-confirmed product requirement):
 *   - read: allowed once there is ANY message history, or a currently accepted
 *     connection. Disconnecting must not make prior conversation unreadable — the RLS
 *     select policy on `messages` already never conditioned read access on connection
 *     state (see migration 0027's header comment); this is that same rule expressed at
 *     the product layer instead of leaving it as an accident of the list query.
 *   - send: requires a currently accepted connection AND neither party has blocked the
 *     other. Reconnecting (a fresh accepted connection after a removed one) restores
 *     send, same as any newly accepted connection.
 */
export interface ConversationAccessInput {
  connectionStatus: "pending" | "accepted" | "declined" | null;
  hasMessageHistory: boolean;
  messagingBlocked: boolean;
}

export interface ConversationAccess {
  canRead: boolean;
  canSend: boolean;
}

export function resolveConversationAccess(input: ConversationAccessInput): ConversationAccess {
  const canRead = input.connectionStatus === "accepted" || input.hasMessageHistory;
  const canSend = input.connectionStatus === "accepted" && !input.messagingBlocked;
  return { canRead, canSend };
}

/**
 * Block-direction UI state. `blocked_users` RLS only ever lets a user read blocks *they*
 * created (`blocker_id = auth.uid()`), so "did I block them" is the only direction this
 * app can honestly assert. `is_blocked_between` is symmetric by design (security-definer,
 * boolean-only — see migration 0027) specifically so a caller can never learn "they
 * blocked me" from it. Never derive that fact by subtracting the two booleans either —
 * `messagingBlocked && !blockedByMe` must still resolve to the same neutral copy as any
 * other reason messaging might be unavailable, not to a disclosure.
 */
export type BlockUiState = "blocked_by_me" | "unavailable" | "none";

export function resolveBlockUiState(input: { blockedByMe: boolean; messagingBlocked: boolean }): BlockUiState {
  if (input.blockedByMe) return "blocked_by_me";
  if (input.messagingBlocked) return "unavailable";
  return "none";
}
