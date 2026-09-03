import { describe, expect, test } from "vitest";
import { computePercentileRank, evaluateBenchmarkDimension, describeCohort } from "@/lib/benchmarking/compute";
import { MIN_COHORT_SIZE } from "@/lib/benchmarking/types";

describe("computePercentileRank", () => {
  test("scoring above everyone in a 4-person cohort ranks at the top", () => {
    expect(computePercentileRank([40, 50, 60, 70], 90)).toBe(100);
  });

  test("scoring below everyone in a 4-person cohort ranks at the bottom", () => {
    expect(computePercentileRank([40, 50, 60, 70], 10)).toBe(0);
  });

  test("a tie splits credit rather than counting as fully above or below", () => {
    // Two peers below (40, 50), two peers tied at 60, none above -> (2 + 2*0.5) / 4 = 75%.
    expect(computePercentileRank([40, 50, 60, 60], 60)).toBe(75);
  });

  test("a higher score never ranks below a lower score against the same cohort", () => {
    const peers = [20, 35, 50, 65, 80, 95];
    const lower = computePercentileRank(peers, 40);
    const higher = computePercentileRank(peers, 85);
    expect(higher).toBeGreaterThan(lower);
  });

  test("an empty cohort doesn't throw and returns a neutral midpoint", () => {
    expect(computePercentileRank([], 75)).toBe(50);
  });
});

describe("evaluateBenchmarkDimension", () => {
  test("below the minimum cohort size, percentile is null — never a small-sample figure", () => {
    const tinyPeers = Array.from({ length: MIN_COHORT_SIZE - 1 }, () => 50);
    const result = evaluateBenchmarkDimension("research", 80, tinyPeers);
    expect(result.percentile).toBeNull();
    expect(result.cohortSize).toBe(MIN_COHORT_SIZE - 1);
  });

  test("at or above the minimum cohort size, a real percentile is returned", () => {
    const peers = Array.from({ length: MIN_COHORT_SIZE }, (_, i) => i);
    const result = evaluateBenchmarkDimension("research", 90, peers);
    expect(result.percentile).not.toBeNull();
    expect(result.cohortSize).toBe(MIN_COHORT_SIZE);
  });

  test("carries the dimension and the student's own score through unchanged", () => {
    const peers = Array.from({ length: MIN_COHORT_SIZE }, () => 50);
    const result = evaluateBenchmarkDimension("overall", 77, peers);
    expect(result.dimension).toBe("overall");
    expect(result.myScore).toBe(77);
  });
});

describe("describeCohort", () => {
  test("describes an unset cohort as all Proxola students", () => {
    expect(describeCohort({ graduationYear: null, curriculum: null })).toBe("All Proxola students");
  });

  test("describes a graduation-year-only cohort", () => {
    expect(describeCohort({ graduationYear: 2027, curriculum: null })).toContain("2027");
  });

  test("describes a combined graduation-year-and-curriculum cohort", () => {
    const description = describeCohort({ graduationYear: 2027, curriculum: "ib" });
    expect(description).toContain("2027");
    expect(description).toContain("IB");
  });
});
