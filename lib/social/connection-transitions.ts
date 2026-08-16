import type { ConnectionStatus } from "@/types/database";

/**
 * A connection request can only be accepted or declined by its actual recipient, and
 * only while it's still `pending` — once responded to, the decision is final (undoing
 * it means removing the connection and starting over, not re-responding). There is no
 * "cancelled"/"removed" status in this schema (`ConnectionStatus` is exactly `pending |
 * accepted | declined`); a removed request is a hard-deleted row, which the caller
 * handles separately by checking the row exists at all before reaching this predicate.
 *
 * Extracted as a named predicate because the previous implementation of
 * respondToConnectionRequest had no status guard at all: RLS's "recipient responds to
 * connection request" policy (migration 0023) restricts *who* can write to a
 * connections row (recipient_id = auth.uid()), but knows nothing about the row's
 * current status, so a recipient could re-accept an already-declined request or flip an
 * already-accepted one back to declined, at any later time, via a direct call — the UI
 * never offering that path isn't a security boundary. The recipient check here is
 * redundant with RLS by design (same "never trust one layer alone" convention as every
 * other authorization-sensitive action in this app) and lets both conditions be modeled
 * and tested in one place instead of only the status half.
 */
export function canRespondToConnectionRequest(connection: { status: ConnectionStatus; recipientId: string }, callerId: string): boolean {
  return connection.status === "pending" && connection.recipientId === callerId;
}
