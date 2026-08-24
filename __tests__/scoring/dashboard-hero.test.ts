import { describe, test, expect } from "vitest";
import { computeDashboardHeroState } from "@/lib/scoring/dashboard-hero";
import type { DimensionSignal } from "@/lib/scoring/signal";
import type { ProfileDimension } from "@/types/database";

/**
 * Regression coverage for the hero-state bug found live during Gate 2
 * (docs/handoffs/gate2-ai-counselor-report-2026-08-24.md §18): `canClaimGap` answers two
 * different questions at once — "does the profile have real signal at all" and "can Oryn
 * name *this specific* dimension as the gap" — so a rich profile whose literal weakest
 * dimension happened to be unassessed used to fall through to the same "nothing recorded"
 * state as a genuinely empty profile. `computeDashboardHeroState` (lib/scoring/dashboard-
 * hero.ts) is the extracted, testable fix: `kind` now has three values instead of two.
 */

const ALL_DIMENSIONS: ProfileDimension[] = [
  "academics",
  "intellectual_curiosity",
  "leadership",
  "research",
  "entrepreneurship",
  "community_impact",
  "awards_distinction",
  "career_exploration",
  "execution_project_depth",
];

function signalRow(dimension: ProfileDimension, overrides: Partial<DimensionSignal> = {}): DimensionSignal {
  return { dimension, state: "not_assessed", score: 0, confidence: "low", ...overrides };
}

describe("computeDashboardHeroState", () => {
  test("genuinely empty profile -> kind: empty, no evidence block", () => {
    const signal = ALL_DIMENSIONS.map((d) => signalRow(d));
    const result = computeDashboardHeroState(signal, { dimension: "research", score: 0 });

    expect(result.kind).toBe("empty");
    expect(result.gapLabel).toBeNull();
    expect(result.evidence).toBeUndefined();
  });

  test("rich profile whose weakest dimension is unassessed -> kind: rich_unclaimable, not empty", () => {
    const signal = ALL_DIMENSIONS.map((d, i) =>
      d === "research"
        ? signalRow(d, { state: "not_assessed", score: 0 }) // the literal weakest — unclaimable
        : signalRow(d, { state: "strong", score: 90 - i, confidence: "high" }),
    );
    const result = computeDashboardHeroState(signal, { dimension: "research", score: 0 });

    // The bug: this used to be "empty" just like a blank profile.
    expect(result.kind).not.toBe("empty");
    expect(result.kind).toBe("rich_unclaimable");
    expect(result.gapLabel).toBeNull();
    // The evidence disclosure is a fact about the whole profile, so it should still be
    // present here even though no single dimension is being named.
    expect(result.evidence).toBeDefined();
    expect(result.evidence!.find((e) => e.label === "Already strong")?.value).toBe(8);
  });

  test("rich profile with a genuinely claimable gap -> kind: claimable, names the dimension", () => {
    const signal = ALL_DIMENSIONS.map((d, i) =>
      d === "research"
        ? signalRow(d, { state: "emerging", score: 20, confidence: "medium" }) // assessed and weak
        : signalRow(d, { state: "strong", score: 90 - i, confidence: "high" }),
    );
    const result = computeDashboardHeroState(signal, { dimension: "research", score: 20 });

    expect(result.kind).toBe("claimable");
    expect(result.gapLabel).toBe("Research");
    expect(result.evidence).toBeDefined();
  });

  test("no biggestGap at all (e.g. no dimensions ranked) -> falls back to signal richness", () => {
    const signal = ALL_DIMENSIONS.map((d, i) => signalRow(d, { state: "strong", score: 90 - i, confidence: "high" }));
    const result = computeDashboardHeroState(signal, null);

    expect(result.kind).toBe("rich_unclaimable");
  });
});
