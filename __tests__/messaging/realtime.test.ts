import { describe, expect, test } from "vitest";
import { isMessageFromConversationPartner } from "@/lib/messaging/realtime";

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
});
