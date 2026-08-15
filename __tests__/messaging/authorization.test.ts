import { describe, expect, test } from "vitest";
import { resolveConversationAccess, resolveBlockUiState } from "@/lib/messaging/authorization";

describe("resolveConversationAccess", () => {
  test("accepted connection: can read and send", () => {
    const access = resolveConversationAccess({ connectionStatus: "accepted", hasMessageHistory: false, messagingBlocked: false });
    expect(access).toEqual({ canRead: true, canSend: true });
  });

  test("accepted but blocked: can read, cannot send", () => {
    const access = resolveConversationAccess({ connectionStatus: "accepted", hasMessageHistory: true, messagingBlocked: true });
    expect(access).toEqual({ canRead: true, canSend: false });
  });

  test("disconnected (no connection row) with retained history: can read, cannot send — the core fix", () => {
    const access = resolveConversationAccess({ connectionStatus: null, hasMessageHistory: true, messagingBlocked: false });
    expect(access).toEqual({ canRead: true, canSend: false });
  });

  test("never connected, no history: cannot read or send", () => {
    const access = resolveConversationAccess({ connectionStatus: null, hasMessageHistory: false, messagingBlocked: false });
    expect(access).toEqual({ canRead: false, canSend: false });
  });

  test("pending connection, no history yet: cannot read or send", () => {
    const access = resolveConversationAccess({ connectionStatus: "pending", hasMessageHistory: false, messagingBlocked: false });
    expect(access).toEqual({ canRead: false, canSend: false });
  });

  test("declined connection but somehow has history: can still read it", () => {
    const access = resolveConversationAccess({ connectionStatus: "declined", hasMessageHistory: true, messagingBlocked: false });
    expect(access).toEqual({ canRead: true, canSend: false });
  });
});

describe("resolveBlockUiState", () => {
  test("I blocked them: blocked_by_me", () => {
    expect(resolveBlockUiState({ blockedByMe: true, messagingBlocked: true })).toBe("blocked_by_me");
  });

  test("they blocked me: unavailable, never disclosed as 'they blocked you'", () => {
    // messagingBlocked=true with blockedByMe=false is exactly the "blocked by the other
    // party" case — the whole point of this function is that this state must be
    // indistinguishable, from the UI's perspective, from any other reason messaging is
    // unavailable. It must never resolve to "blocked_by_me".
    const state = resolveBlockUiState({ blockedByMe: false, messagingBlocked: true });
    expect(state).toBe("unavailable");
    expect(state).not.toBe("blocked_by_me");
  });

  test("neither party blocked: none", () => {
    expect(resolveBlockUiState({ blockedByMe: false, messagingBlocked: false })).toBe("none");
  });

  test("blockedByMe true implies messagingBlocked true in practice, and still reads as blocked_by_me", () => {
    expect(resolveBlockUiState({ blockedByMe: true, messagingBlocked: true })).toBe("blocked_by_me");
  });
});
