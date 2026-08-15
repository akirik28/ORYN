import { describe, expect, test } from "vitest";
import { normalizeTitle, normalizeUrl, titleSimilarity, isDuplicateOpportunity } from "@/lib/opportunities/dedup";

describe("normalizeTitle", () => {
  test("lowercases, strips punctuation, and collapses whitespace", () => {
    expect(normalizeTitle("  The Economics Challenge — 2027!  ")).toBe("the economics challenge 2027");
  });
});

describe("normalizeUrl", () => {
  test("strips protocol, www, and trailing slash for comparison", () => {
    expect(normalizeUrl("https://www.example.com/programs/econ/")).toBe("example.com/programs/econ");
    expect(normalizeUrl("http://example.com/programs/econ")).toBe("example.com/programs/econ");
  });
});

describe("titleSimilarity", () => {
  test("is 1 for identical titles", () => {
    expect(titleSimilarity("Economics Challenge", "Economics Challenge")).toBe(1);
  });

  test("is 0 for completely different titles", () => {
    expect(titleSimilarity("Economics Challenge", "Robotics Summer Camp")).toBe(0);
  });

  test("is partial for overlapping-but-different titles", () => {
    const similarity = titleSimilarity("International Economics Challenge 2027", "International Economics Challenge 2026");
    expect(similarity).toBeGreaterThan(0.5);
    expect(similarity).toBeLessThan(1);
  });
});

describe("isDuplicateOpportunity", () => {
  test("flags two entries with the same official URL as duplicates, even with different titles", () => {
    const result = isDuplicateOpportunity(
      { title: "Econ Challenge", organization: "Acme Foundation", officialUrl: "https://example.com/econ" },
      { title: "The Economics Challenge 2027", organization: "Acme Foundation", officialUrl: "https://example.com/econ/" }
    );
    expect(result).toBe(true);
  });

  test("flags same organization with highly similar titles as duplicates", () => {
    const result = isDuplicateOpportunity(
      { title: "International Economics Challenge 2027", organization: "Acme Foundation", officialUrl: null },
      { title: "International Economics Challenge", organization: "Acme Foundation", officialUrl: null }
    );
    expect(result).toBe(true);
  });

  test("does not flag different organizations with similar titles as duplicates", () => {
    const result = isDuplicateOpportunity(
      { title: "Economics Challenge", organization: "Acme Foundation", officialUrl: null },
      { title: "Economics Challenge", organization: "Beacon Institute", officialUrl: null }
    );
    expect(result).toBe(false);
  });

  test("does not flag genuinely different opportunities from the same organization", () => {
    const result = isDuplicateOpportunity(
      { title: "Economics Challenge", organization: "Acme Foundation", officialUrl: null },
      { title: "Robotics Summer Camp", organization: "Acme Foundation", officialUrl: null }
    );
    expect(result).toBe(false);
  });
});
