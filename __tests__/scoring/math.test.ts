import { describe, expect, test } from "vitest";
import { clampScore, monthsBetween, scoreCommitments } from "@/lib/scoring/math";

describe("clampScore", () => {
  test("rounds to the nearest integer", () => {
    expect(clampScore(72.6)).toBe(73);
  });

  test("clamps values above 100 down to 100", () => {
    expect(clampScore(140)).toBe(100);
  });

  test("clamps negative values up to 0", () => {
    expect(clampScore(-15)).toBe(0);
  });
});

describe("monthsBetween", () => {
  test("computes whole months between two dates", () => {
    expect(monthsBetween("2025-01-01", "2025-07-01")).toBeCloseTo(6, 1);
  });

  test("treats an ongoing commitment (no end date) as running to the reference date", () => {
    expect(monthsBetween("2025-01-01", null, new Date("2025-04-01"))).toBeCloseTo(3, 1);
  });

  test("never returns a negative duration for a future start date", () => {
    expect(monthsBetween("2099-01-01", null, new Date("2025-01-01"))).toBe(0);
  });
});

describe("scoreCommitments", () => {
  test("caps each item at perItemCap before summing", () => {
    const result = scoreCommitments(
      [{ label: "a", basePoints: 999 }],
      { perItemCap: 10, diminishingAfter: 5, diminishingFactor: 0.5 }
    );
    expect(result.points).toBe(10);
  });

  test("applies diminishing returns to items beyond diminishingAfter, strongest items first", () => {
    // Four items worth 10 points each (after per-item cap). Top 2 count in full,
    // the next 2 count at 50% — rewarding depth over sheer quantity of activities.
    const items = [
      { label: "a", basePoints: 10 },
      { label: "b", basePoints: 10 },
      { label: "c", basePoints: 10 },
      { label: "d", basePoints: 10 },
    ];
    const result = scoreCommitments(items, { perItemCap: 10, diminishingAfter: 2, diminishingFactor: 0.5 });
    expect(result.points).toBe(30);
  });

  test("returns zero points and empty breakdown for no commitments", () => {
    const result = scoreCommitments([], { perItemCap: 10, diminishingAfter: 2, diminishingFactor: 0.5 });
    expect(result.points).toBe(0);
    expect(result.breakdown).toHaveLength(0);
  });
});
