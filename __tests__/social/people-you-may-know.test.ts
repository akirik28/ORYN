import { describe, expect, test } from "vitest";
import {
  isExcludedFromPeopleYouMayKnow,
  scorePeopleYouMayKnowCandidate,
  hasAnyPeopleYouMayKnowSignal,
} from "@/lib/social/people-you-may-know";

describe("isExcludedFromPeopleYouMayKnow", () => {
  test("self is excluded", () => {
    expect(isExcludedFromPeopleYouMayKnow({ candidateId: "u1", selfId: "u1", hasAnyConnectionRecord: false, isBlocked: false })).toBe(true);
  });

  test("any existing connection record (pending, accepted, or declined) is excluded", () => {
    expect(isExcludedFromPeopleYouMayKnow({ candidateId: "u2", selfId: "u1", hasAnyConnectionRecord: true, isBlocked: false })).toBe(true);
  });

  test("blocked (either direction) is excluded", () => {
    expect(isExcludedFromPeopleYouMayKnow({ candidateId: "u2", selfId: "u1", hasAnyConnectionRecord: false, isBlocked: true })).toBe(true);
  });

  test("a genuine stranger with no record and no block is not excluded", () => {
    expect(isExcludedFromPeopleYouMayKnow({ candidateId: "u2", selfId: "u1", hasAnyConnectionRecord: false, isBlocked: false })).toBe(false);
  });
});

describe("scorePeopleYouMayKnowCandidate", () => {
  test("no signals: score 0, no reasons", () => {
    const result = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 0, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(result.score).toBe(0);
    expect(result.reasons).toEqual([]);
  });

  test("mutual connections produce a specific, correctly-pluralized reason", () => {
    const one = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 1, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(one.reasons).toContain("1 mutual connection");

    const three = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 3, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(three.reasons).toContain("3 mutual connections");
    expect(three.score).toBeGreaterThan(one.score);
  });

  test("mutual connection weight is capped so one dominant signal can't run away with the ranking", () => {
    const capped = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 100, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    const atCap = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 10, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(capped.score).toBe(atCap.score);
  });

  test("same school contributes its own reason", () => {
    const result = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 0, sameSchool: true, overlappingInterests: [], overlappingSkills: [] });
    expect(result.reasons).toContain("Same school");
    expect(result.score).toBeGreaterThan(0);
  });

  test("overlapping interests are named, not just counted, and capped to avoid a wall of reasons", () => {
    const result = scorePeopleYouMayKnowCandidate({
      mutualConnectionCount: 0,
      sameSchool: false,
      overlappingInterests: ["Economics", "Computer Science", "Debate"],
      overlappingSkills: [],
    });
    expect(result.reasons).toContain("Also interested in Economics");
    expect(result.reasons).toContain("Also interested in Computer Science");
    expect(result.reasons).not.toContain("Also interested in Debate");
  });

  test("overlapping skills contribute one summarized reason, not one per skill", () => {
    const result = scorePeopleYouMayKnowCandidate({
      mutualConnectionCount: 0,
      sameSchool: false,
      overlappingInterests: [],
      overlappingSkills: ["Python", "Economics"],
    });
    expect(result.reasons).toContain("Shares 2 skills with you");
  });

  test("signals combine additively, ranking a multi-signal candidate above a single-signal one", () => {
    const multi = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 2, sameSchool: true, overlappingInterests: ["Economics"], overlappingSkills: [] });
    const single = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 2, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(multi.score).toBeGreaterThan(single.score);
  });
});

describe("hasAnyPeopleYouMayKnowSignal", () => {
  test("zero-score candidates are excluded from the suggestion list, not just ranked last", () => {
    const noSignal = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 0, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(hasAnyPeopleYouMayKnowSignal(noSignal)).toBe(false);
  });

  test("any positive score is included", () => {
    const oneSignal = scorePeopleYouMayKnowCandidate({ mutualConnectionCount: 1, sameSchool: false, overlappingInterests: [], overlappingSkills: [] });
    expect(hasAnyPeopleYouMayKnowSignal(oneSignal)).toBe(true);
  });
});
