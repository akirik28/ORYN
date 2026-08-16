import { describe, expect, test } from "vitest";
import { canAddAnotherSkill, isDuplicateSkillName, MAX_ACTIVE_SKILLS } from "@/lib/social/skills";

describe("canAddAnotherSkill", () => {
  test("under the cap: allowed", () => {
    expect(canAddAnotherSkill(0)).toBe(true);
    expect(canAddAnotherSkill(MAX_ACTIVE_SKILLS - 1)).toBe(true);
  });

  test("at or over the cap: denied", () => {
    expect(canAddAnotherSkill(MAX_ACTIVE_SKILLS)).toBe(false);
    expect(canAddAnotherSkill(MAX_ACTIVE_SKILLS + 1)).toBe(false);
  });
});

describe("isDuplicateSkillName", () => {
  test("exact match is a duplicate", () => {
    expect(isDuplicateSkillName(["Python"], "Python")).toBe(true);
  });

  test("case-insensitive match is a duplicate, mirroring the DB's lower(name) index", () => {
    expect(isDuplicateSkillName(["python"], "PYTHON")).toBe(true);
  });

  test("surrounding whitespace does not defeat the duplicate check", () => {
    expect(isDuplicateSkillName(["Python"], "  python  ")).toBe(true);
  });

  test("a genuinely different name is not a duplicate", () => {
    expect(isDuplicateSkillName(["Python"], "Economics")).toBe(false);
  });

  test("empty existing list: never a duplicate", () => {
    expect(isDuplicateSkillName([], "Python")).toBe(false);
  });
});
