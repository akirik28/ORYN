import { describe, expect, test } from "vitest";
import { findDuplicateCandidates } from "@/lib/opportunities/duplicates";

describe("findDuplicateCandidates", () => {
  test("catches the real deterministic pairs found by hand this session", () => {
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Diamond Challenge", official_url: "https://diamondchallenge.org/" },
      { id: "2", title: "The Diamond Challenge", official_url: "https://diamondchallenge.org/competition/" },
      { id: "3", title: "Research Science Institute (RSI)", official_url: "https://www.cee.org/programs/research-science-institute" },
      { id: "4", title: "RSI (Research Science Institute) at MIT", official_url: "https://cee.org/research-science-institute" },
    ]);
    expect(candidates.some((c) => c.confidence === "deterministic" && new Set([c.a.id, c.b.id]).has("1") && new Set([c.a.id, c.b.id]).has("2"))).toBe(true);
    expect(candidates.some((c) => c.confidence === "deterministic" && new Set([c.a.id, c.b.id]).has("3") && new Set([c.a.id, c.b.id]).has("4"))).toBe(true);
  });

  test("catches a probable-tier pair (Clark Scholars, confirmed duplicate but lower word overlap)", () => {
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Anson L. Clark Scholars Program", official_url: "https://www.depts.ttu.edu/clarkscholars/" },
      { id: "2", title: "Clark Scholars Program", official_url: "https://www.depts.ttu.edu/clarkscholars/ApplicationDetails.php" },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].confidence).toBe("probable");
  });

  test("never flags different domains, no matter how similar the titles", () => {
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Summer Research Program", official_url: "https://cty.jhu.edu/" },
      { id: "2", title: "Summer Research Program", official_url: "https://summer.uchicago.edu/" },
    ]);
    expect(candidates).toEqual([]);
  });

  test("does not flag genuinely distinct sibling programs from the same provider", () => {
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Columbia Writing Academy", official_url: "https://precollege.sps.columbia.edu/" },
      { id: "2", title: "College Edge Summer", official_url: "https://precollege.sps.columbia.edu/" },
      { id: "3", title: "Columbia Spring Immersion Program", official_url: "https://precollege.sps.columbia.edu/" },
    ]);
    expect(candidates).toEqual([]);
  });

  test("a null/missing official_url is never compared against anything (no false grouping under a shared 'null' key)", () => {
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Some Program", official_url: null },
      { id: "2", title: "Some Program", official_url: null },
    ]);
    expect(candidates).toEqual([]);
  });

  test("results are sorted by descending similarity", () => {
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Immerse Education Essay Competition", official_url: "https://immerse.education/" },
      { id: "2", title: "Immerse Education", official_url: "https://immerse.education/" },
      { id: "3", title: "The Diamond Challenge", official_url: "https://diamondchallenge.org/" },
      { id: "4", title: "Diamond Challenge", official_url: "https://diamondchallenge.org/" },
    ]);
    for (let i = 1; i < candidates.length; i++) {
      expect(candidates[i - 1].titleSimilarity).toBeGreaterThanOrEqual(candidates[i].titleSimilarity);
    }
  });
});
