import { describe, expect, test } from "vitest";
import { canWriteRecommendation, checkRecommendationEligibility } from "@/lib/social/recommendations";

const base = { isSelf: false, hasAcceptedConnection: true, isBlocked: false };

describe("canWriteRecommendation", () => {
  test("accepted connection: allowed", () => {
    expect(canWriteRecommendation(base)).toBe(true);
  });

  test("stranger (no accepted connection): denied", () => {
    expect(canWriteRecommendation({ ...base, hasAcceptedConnection: false })).toBe(false);
  });

  test("self: denied", () => {
    expect(canWriteRecommendation({ ...base, isSelf: true })).toBe(false);
  });

  test("blocked: denied", () => {
    expect(canWriteRecommendation({ ...base, isBlocked: true })).toBe(false);
  });
});

describe("checkRecommendationEligibility", () => {
  test("eligible case returns null", () => {
    expect(checkRecommendationEligibility(base)).toBeNull();
  });

  test("self takes priority over blocked/not-connected", () => {
    expect(checkRecommendationEligibility({ isSelf: true, hasAcceptedConnection: false, isBlocked: true })).toBe("self");
  });
});
