import { describe, expect, test } from "vitest";
import { classifySubjects } from "@/lib/programs/subject-taxonomy";

describe("classifySubjects", () => {
  test("classifies an unambiguous single-subject name", () => {
    expect(classifySubjects("Economics")).toEqual({ primary: "economics", secondary: [] });
  });

  test("picks a primary and lists further matches as secondary, in keyword-priority order", () => {
    const result = classifySubjects("Computer Science and Engineering");
    expect(result.primary).toBe("computer_science");
    expect(result.secondary).toContain("engineering");
  });

  test("falls back to 'other' with no secondary tags for an unmatched name", () => {
    expect(classifySubjects("Classics")).toEqual({ primary: "other", secondary: [] });
  });

  test("is case-insensitive", () => {
    expect(classifySubjects("ARTIFICIAL INTELLIGENCE").primary).toBe("artificial_intelligence");
  });

  test("does not mis-tag 'law' as a substring of an unrelated word", () => {
    // Guards the " law" (leading-space) keyword choice in SUBJECT_KEYWORDS — "law" is a
    // common substring (e.g. "Flawless"); this must not match on that.
    expect(classifySubjects("Flawless Design Studies").primary).not.toBe("law");
  });
});
