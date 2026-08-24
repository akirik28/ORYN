import { describe, expect, test } from "vitest";
import { buildProfileChange, describeProfileChange, NO_PROFILE_CHANGE } from "@/lib/scoring/change";
import type { ProfileDimension } from "@/types/database";

const row = (dimension: ProfileDimension, score: number) => ({ dimension, score });

describe("buildProfileChange", () => {
  test("splits movement by direction, largest first", () => {
    const change = buildProfileChange(
      [row("research", 50), row("leadership", 40), row("academics", 80), row("awards_distinction", 30)],
      { research: 42, leadership: 55, academics: 80, awards_distinction: 12 },
    );
    expect(change.improved.map((c) => c.dimension)).toEqual(["awards_distinction", "research"]);
    expect(change.declined.map((c) => c.dimension)).toEqual(["leadership"]);
    expect(change.steady).toBe(1);
  });

  // "No previous snapshot" and "nothing moved" look identical if you only count deltas,
  // and they mean opposite things to a student.
  test("no baseline means no history, not a flat month", () => {
    const change = buildProfileChange([row("research", 50)], null);
    expect(change).toEqual(NO_PROFILE_CHANGE);
    expect(change.hasHistory).toBe(false);
    expect(describeProfileChange(change)).toBeNull();
  });

  test("a dimension absent from the baseline is skipped rather than counted as steady", () => {
    const change = buildProfileChange([row("research", 50), row("entrepreneurship", 20)], { research: 50 });
    expect(change.steady).toBe(1);
    expect(change.improved).toEqual([]);
    expect(change.declined).toEqual([]);
  });
});

describe("describeProfileChange", () => {
  test("names the dimension that moved most, and counts the rest", () => {
    const sentence = describeProfileChange(
      buildProfileChange([row("research", 50), row("leadership", 60)], { research: 42, leadership: 58 }),
    );
    expect(sentence).toContain("Research");
    expect(sentence).toContain("1 other area");
  });

  test("a flat month says so instead of going silent", () => {
    const sentence = describeProfileChange(buildProfileChange([row("research", 50)], { research: 50 }));
    expect(sentence).toBe("Your profile has held steady since your last review.");
  });

  test("a decline is reported rather than hidden", () => {
    const sentence = describeProfileChange(buildProfileChange([row("research", 30)], { research: 42 }));
    expect(sentence).toContain("Nothing moved forward");
    expect(sentence).toContain("research");
  });

  // The whole point of the replacement: no aggregate, no bare index.
  test("never reports an overall figure", () => {
    for (const change of [
      buildProfileChange([row("research", 50), row("leadership", 61)], { research: 42, leadership: 58 }),
      buildProfileChange([row("research", 50)], { research: 50 }),
      buildProfileChange([row("research", 30)], { research: 42 }),
    ]) {
      const sentence = describeProfileChange(change)!;
      expect(sentence.toLowerCase()).not.toContain("career profile");
      expect(sentence).not.toMatch(/\/100/);
      expect(sentence).not.toMatch(/\boverall\b/i);
    }
  });
});
