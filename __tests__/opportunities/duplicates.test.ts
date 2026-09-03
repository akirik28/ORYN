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

  test("catches real pairs that sit on different subdomains of the same institution (2026-09-03 sweep)", () => {
    // Lehigh: global.lehigh.edu vs health.lehigh.edu — exact-hostname grouping missed this
    // pair entirely before the registrable-domain fix (docs/opportunity-duplicate-pairs-
    // 2026-09-03.md). Both reduce to lehigh.edu.
    const lehigh = findDuplicateCandidates([
      { id: "1", title: "Lehigh University", official_url: "https://global.lehigh.edu/" },
      { id: "2", title: "Lehigh University: Bethlehem, PA", official_url: "https://health.lehigh.edu/academics-programsgraduate-programs/graduate-admissions-recruitment-event-schedule" },
    ]);
    expect(lehigh).toHaveLength(1);
    expect(lehigh[0].domain).toBe("lehigh.edu");
    expect(lehigh[0].confidence).not.toBeNull();

    // Edinburgh: col.ed.ac.uk vs study.ed.ac.uk — a multi-part TLD (.ac.uk), the exact case a
    // hand-rolled "last two labels" heuristic gets wrong. Both reduce to ed.ac.uk.
    const edinburgh = findDuplicateCandidates([
      { id: "1", title: "University of Edinburgh International Summer School", official_url: "https://col.ed.ac.uk/our-programmes" },
      { id: "2", title: "University of Edinburgh Pre-University Summer School 2026", official_url: "https://study.ed.ac.uk/summer-school" },
    ]);
    expect(edinburgh).toHaveLength(1);
    expect(edinburgh[0].domain).toBe("ed.ac.uk");
    expect(edinburgh[0].confidence).not.toBeNull();
  });

  test("does not flag genuinely distinct sibling programs across DIFFERENT subdomains of the same institution", () => {
    // MIT's four flagship high-school programs, each on its own subdomain — a registrable-
    // domain grouping now compares all six pairs for the first time (previously each subdomain
    // was its own group of one, so none were ever compared). None of the six pairs should
    // reach deterministic or probable; a naive "just widen the grouping key" fix that also
    // started proposing BWSI-PRIMES or PRIMES-MITES merges would be worse than the exact-
    // hostname behavior it replaced.
    const mit = findDuplicateCandidates([
      { id: "1", title: "MIT Beaver Works Summer Institute (BWSI)", official_url: "https://bwsi.mit.edu/" },
      { id: "2", title: "MIT PRIMES", official_url: "https://math.mit.edu/" },
      { id: "3", title: "MITES Summer", official_url: "https://mites.mit.edu/" },
      { id: "4", title: "Zero Robotics", official_url: "https://zerorobotics.mit.edu/" },
    ]);
    expect(mit.every((c) => c.confidence !== "deterministic" && c.confidence !== "probable")).toBe(true);

    // Same check for two more real same-institution, different-subdomain, non-duplicate
    // clusters found during the same sweep.
    const wharton = findDuplicateCandidates([
      { id: "1", title: "Wharton Global Youth Program: Future of the Business World (FBW)", official_url: "https://globalyouth.wharton.upenn.edu/programs-courses/future-of-the-business-world/" },
      { id: "2", title: "Wharton Management & Technology Summer Institute (M&TSI)", official_url: "https://fisher.wharton.upenn.edu/management-technology-summer-institute/" },
      { id: "3", title: "Penn Pre-College Program (Residential)", official_url: "https://hs.sas.upenn.edu/" },
    ]);
    expect(wharton.every((c) => c.confidence !== "deterministic" && c.confidence !== "probable")).toBe(true);

    const nyu = findDuplicateCandidates([
      { id: "1", title: "NYU High School Law Institute", official_url: "https://law.nyu.edu/" },
      { id: "2", title: "Tisch Summer High School", official_url: "https://tisch.nyu.edu/" },
      { id: "3", title: "NYU Precollege Program", official_url: "https://www.nyu.edu/" },
    ]);
    expect(nyu.every((c) => c.confidence !== "deterministic" && c.confidence !== "probable")).toBe(true);
  });

  test("still treats genuinely different institutions as different domains even with near-identical titles", () => {
    // Regression guard: registrable-domain grouping must not accidentally widen to something
    // like "last two labels of the hostname" in a way that conflates unrelated .edu domains.
    const candidates = findDuplicateCandidates([
      { id: "1", title: "Summer Research Program", official_url: "https://cty.jhu.edu/" },
      { id: "2", title: "Summer Research Program", official_url: "https://summer.uchicago.edu/" },
      { id: "3", title: "Summer Research Program", official_url: "https://some.department.stanford.edu/" },
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
