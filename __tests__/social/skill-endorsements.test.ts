import { describe, expect, test } from "vitest";
import { canEndorseSkill, checkEndorsementEligibility } from "@/lib/social/skill-endorsements";

const base = { isSelf: false, hasAcceptedConnection: true, isBlocked: false, alreadyEndorsed: false };

describe("canEndorseSkill", () => {
  test("accepted connection, not self, not blocked, not duplicate: allowed", () => {
    expect(canEndorseSkill(base)).toBe(true);
  });

  test("stranger (no accepted connection): denied", () => {
    expect(canEndorseSkill({ ...base, hasAcceptedConnection: false })).toBe(false);
  });

  test("self: denied, even with an accepted connection somehow true", () => {
    expect(canEndorseSkill({ ...base, isSelf: true })).toBe(false);
  });

  test("duplicate (already endorsed): denied", () => {
    expect(canEndorseSkill({ ...base, alreadyEndorsed: true })).toBe(false);
  });

  test("blocked (either direction): denied", () => {
    expect(canEndorseSkill({ ...base, isBlocked: true })).toBe(false);
  });
});

describe("checkEndorsementEligibility — reason ordering", () => {
  test("self takes priority over every other reason", () => {
    expect(checkEndorsementEligibility({ isSelf: true, hasAcceptedConnection: false, isBlocked: true, alreadyEndorsed: true })).toBe("self");
  });

  test("blocked takes priority over not-connected and duplicate", () => {
    expect(checkEndorsementEligibility({ isSelf: false, hasAcceptedConnection: false, isBlocked: true, alreadyEndorsed: true })).toBe("blocked");
  });

  test("eligible case returns null", () => {
    expect(checkEndorsementEligibility(base)).toBeNull();
  });
});
