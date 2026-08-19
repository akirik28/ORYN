import { describe, expect, test } from "vitest";
import { normalizeProgramName } from "@/lib/programs/normalize";

describe("normalizeProgramName", () => {
  test("strips punctuation and collapses whitespace", () => {
    expect(normalizeProgramName("Economics, Management & Computer Science")).toBe("economics management  computer science".replace(/\s+/g, " "));
  });

  test("two differently-punctuated but word-identical titles collide", () => {
    expect(normalizeProgramName("Bachelor of Arts (Economics)")).toBe(normalizeProgramName("Bachelor of Arts Economics"));
  });

  test("is stable for already-clean input", () => {
    expect(normalizeProgramName("Computer Science")).toBe("computer science");
  });

  test("handles null/undefined", () => {
    expect(normalizeProgramName(null)).toBe("");
    expect(normalizeProgramName(undefined)).toBe("");
  });
});
