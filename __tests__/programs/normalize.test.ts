import { describe, expect, test } from "vitest";
import { normalizeName, normalizeCountry, normalizeProgramName, domainOf } from "@/lib/programs/normalize";

describe("normalizeName", () => {
  test("lowercases and collapses whitespace", () => {
    expect(normalizeName("  Massachusetts   Institute of Technology  ")).toBe("massachusetts institute of technology");
  });

  test("handles null/undefined", () => {
    expect(normalizeName(null)).toBe("");
    expect(normalizeName(undefined)).toBe("");
  });
});

describe("normalizeCountry", () => {
  test("bridges the Türkiye/Turkey label mismatch", () => {
    expect(normalizeCountry("Türkiye")).toBe("turkey");
    expect(normalizeCountry("Turkey")).toBe("turkey");
  });

  test("passes through an unmapped country unchanged (normalized)", () => {
    expect(normalizeCountry("France")).toBe("france");
  });
});

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
});

describe("domainOf", () => {
  test("strips protocol and www", () => {
    expect(domainOf("https://www.example.com/path")).toBe("example.com");
    expect(domainOf("http://example.com")).toBe("example.com");
  });

  test("returns null for missing or malformed input", () => {
    expect(domainOf(null)).toBeNull();
    expect(domainOf("not a url")).toBeNull();
  });
});
