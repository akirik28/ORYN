import { describe, expect, test } from "vitest";
import {
  isExcludedFromPeopleYouMayKnow,
  scorePeopleYouMayKnowCandidate,
  hasAnyPeopleYouMayKnowSignal,
  isSameSchool,
} from "@/lib/social/people-you-may-know";
import { normalizeEntitySearchText } from "@/lib/entities/normalize";

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

describe("isSameSchool — canonical id wins over text", () => {
  const SCHOOL_A = "aaaaaaaa-0000-0000-0000-00000000000a";
  const SCHOOL_B = "bbbbbbbb-0000-0000-0000-00000000000b";

  function withNames(selfName: string, candidateName: string, ids: { self: string | null; candidate: string | null }) {
    return {
      selfSchoolId: ids.self,
      candidateSchoolId: ids.candidate,
      selfNormalizedSchoolName: normalizeEntitySearchText(selfName),
      candidateNormalizedSchoolName: normalizeEntitySearchText(candidateName),
    };
  }

  test("both linked to the same canonical school: same school, even when the legacy text differs", () => {
    expect(isSameSchool(withNames("UAA", "Üsküdar American Academy", { self: SCHOOL_A, candidate: SCHOOL_A }))).toBe(true);
  });

  test("both linked to DIFFERENT canonical schools: not the same school, even when the names normalize identically", () => {
    // The exact real case the canonical registry exists to disambiguate: two genuinely
    // different "Saint Joseph" schools in different cities. Text comparison alone would
    // wrongly call these one school.
    expect(isSameSchool(withNames("Saint Joseph", "Saint-Joseph", { self: SCHOOL_A, candidate: SCHOOL_B }))).toBe(false);
  });

  test("neither linked: falls back to normalized text, so accents/case/punctuation don't fragment a real match", () => {
    expect(isSameSchool(withNames("Üsküdar American Academy", "uskudar american academy", { self: null, candidate: null }))).toBe(true);
    expect(isSameSchool(withNames("Robert College", "Saint Joseph", { self: null, candidate: null }))).toBe(false);
  });

  test("only one side linked: falls back to normalized text (a linked and an unlinked student at the same school still match)", () => {
    expect(isSameSchool(withNames("Üsküdar American Academy", "Uskudar American Academy", { self: SCHOOL_A, candidate: null }))).toBe(true);
    expect(isSameSchool(withNames("Üsküdar American Academy", "Robert College", { self: null, candidate: SCHOOL_B }))).toBe(false);
  });

  test("empty school text on either side never counts as a match — two students with no school set are not 'at the same school'", () => {
    expect(isSameSchool(withNames("", "", { self: null, candidate: null }))).toBe(false);
    expect(isSameSchool(withNames("Robert College", "", { self: null, candidate: null }))).toBe(false);
  });
});
