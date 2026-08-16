import { describe, expect, test } from "vitest";
import { canRespondToConnectionRequest } from "@/lib/social/connection-transitions";

const recipient = "11111111-1111-1111-1111-111111111111";
const requester = "22222222-2222-2222-2222-222222222222";
const unrelatedUser = "33333333-3333-3333-3333-333333333333";

describe("canRespondToConnectionRequest", () => {
  test("pending -> accept: allowed (the recipient responding to their own pending request)", () => {
    expect(canRespondToConnectionRequest({ status: "pending", recipientId: recipient }, recipient)).toBe(true);
  });

  test("pending -> decline: same guard allows it — accept/decline is the caller's choice, not this predicate's", () => {
    expect(canRespondToConnectionRequest({ status: "pending", recipientId: recipient }, recipient)).toBe(true);
  });

  test("accepted -> respond again: rejected — a decision, once made, is final", () => {
    expect(canRespondToConnectionRequest({ status: "accepted", recipientId: recipient }, recipient)).toBe(false);
  });

  test("declined -> respond again: rejected", () => {
    expect(canRespondToConnectionRequest({ status: "declined", recipientId: recipient }, recipient)).toBe(false);
  });

  // No "cancelled"/"removed" ConnectionStatus exists in this schema — removal is a
  // hard-deleted row, not a status this predicate ever sees. The caller
  // (respondToConnectionRequest) handles "row doesn't exist at all" before reaching
  // this function by checking the fetched row is non-null first.

  test("wrong recipient: the requester trying to accept/decline their own outgoing request is rejected", () => {
    expect(canRespondToConnectionRequest({ status: "pending", recipientId: recipient }, requester)).toBe(false);
  });

  test("unrelated user: someone with no part in this connection at all is rejected", () => {
    expect(canRespondToConnectionRequest({ status: "pending", recipientId: recipient }, unrelatedUser)).toBe(false);
  });

  test("wrong recipient AND wrong status compounds — still simply rejected", () => {
    expect(canRespondToConnectionRequest({ status: "accepted", recipientId: recipient }, unrelatedUser)).toBe(false);
  });
});
