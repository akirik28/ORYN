import { describe, expect, test } from "vitest";
import { isMessageFromConversationPartner, newMessageChannelFilter, newMessageChannelName } from "@/lib/messaging/realtime";

describe("isMessageFromConversationPartner", () => {
  const otherUserId = "22222222-2222-2222-2222-222222222222";

  test("matches a message from the open conversation's other party", () => {
    expect(isMessageFromConversationPartner(otherUserId, otherUserId)).toBe(true);
  });

  test("ignores a message from someone else — the recipient-scoped channel can fire for any of the user's conversations", () => {
    const someoneElseId = "33333333-3333-3333-3333-333333333333";
    expect(isMessageFromConversationPartner(someoneElseId, otherUserId)).toBe(false);
  });

  test("calling it twice with the same payload (a duplicate or replayed event) is stable — no memory, no side effect", () => {
    const first = isMessageFromConversationPartner(otherUserId, otherUserId);
    const second = isMessageFromConversationPartner(otherUserId, otherUserId);
    expect(first).toBe(second);
    expect(second).toBe(true);
  });

  test("duplicate handling survives a reconnect because there's nothing reconnect-specific to break", () => {
    // supabase-js's realtime client owns reconnect/backoff — nothing here tracks
    // "have I seen this event id before" or any other cross-call state. A reconnect
    // replaying an event (or re-delivering it out of order) is processed identically to
    // any other duplicate: this predicate reads only its two arguments and is called
    // fresh each time router.refresh() re-renders the thread, so a burst that includes
    // replayed/out-of-order/repeated calls produces the exact same set of outcomes as
    // the same calls in any other order.
    const events = [otherUserId, otherUserId, "44444444-4444-4444-4444-444444444444", otherUserId];
    const results = events.map((senderId) => isMessageFromConversationPartner(senderId, otherUserId));
    expect(results).toEqual([true, true, false, true]);

    // Processing the identical burst again (simulating a reconnect replaying it) yields
    // the identical outcome — no drift, no accumulated state.
    const replay = events.map((senderId) => isMessageFromConversationPartner(senderId, otherUserId));
    expect(replay).toEqual(results);
  });
});

describe("newMessageChannelFilter — sender/recipient direction", () => {
  const currentUserId = "11111111-1111-1111-1111-111111111111";

  test("filters on recipient_id — messages addressed TO the current user", () => {
    expect(newMessageChannelFilter(currentUserId)).toBe(`recipient_id=eq.${currentUserId}`);
  });

  test("never filters on sender_id — flipping this would silently stop notifying about incoming messages", () => {
    const filter = newMessageChannelFilter(currentUserId);
    expect(filter).not.toContain("sender_id");
  });
});

describe("newMessageChannelName", () => {
  test("is unique per conversation pair", () => {
    const a = "11111111-1111-1111-1111-111111111111";
    const b = "22222222-2222-2222-2222-222222222222";
    const c = "33333333-3333-3333-3333-333333333333";
    expect(newMessageChannelName(a, b)).not.toBe(newMessageChannelName(a, c));
  });
});
