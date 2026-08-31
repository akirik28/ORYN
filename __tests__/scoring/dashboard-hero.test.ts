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

  test("the evidence stats count assessed vs awaiting the way isAssessed() defines it", () => {
    // The shape that exposed the bug on a real account: three dimensions genuinely
    // assessed, three with `limited_evidence`, three never recorded at all.
    const signal: DimensionSignal[] = [
      signalRow("awards_distinction", { state: "strong", score: 100, confidence: "high" }),
      signalRow("academics", { state: "developing", score: 43, confidence: "medium" }),
      signalRow("intellectual_curiosity", { state: "emerging", score: 12, confidence: "medium" }),
      signalRow("execution_project_depth", { state: "limited_evidence", score: 11 }),
      signalRow("career_exploration", { state: "limited_evidence", score: 9 }),
      signalRow("research", { state: "limited_evidence", score: 5 }),
      signalRow("community_impact"),
      signalRow("leadership"),
      signalRow("entrepreneurship"),
    ];
    const result = computeDashboardHeroState(signal, { dimension: "leadership", score: 0 });
    const stat = (label: string) => result.evidence!.find((e) => e.label === label)?.value;

    // Only emerging/developing/strong count as assessed. The old hand-rolled count was
    // `total - limitedEvidence`, which reported 6 here by treating the three unrecorded
    // dimensions as assessed.
    expect(stat("Areas assessed")).toBe(3);
    expect(stat("Already strong")).toBe(1);
    // Everything Oryn cannot stand behind — `not_assessed` *and* `limited_evidence`. The
    // old code printed only the 3 limited-evidence ones under this label.
    expect(stat("No evidence yet")).toBe(6);
  });

  test("no biggestGap at all (e.g. no dimensions ranked) -> falls back to signal richness", () => {
    const signal = ALL_DIMENSIONS.map((d, i) => signalRow(d, { state: "strong", score: 90 - i, confidence: "high" }));
    const result = computeDashboardHeroState(signal, null);

    expect(result.kind).toBe("rich_unclaimable");
  });
});

describe("computeDashboardHeroState — locale: tr", () => {
  test("gapLabel is the Turkish dimension name", () => {
    const signal = ALL_DIMENSIONS.map((d, i) =>
      d === "research" ? signalRow(d, { state: "emerging", score: 20, confidence: "medium" }) : signalRow(d, { state: "strong", score: 90 - i, confidence: "high" }),
    );
    const result = computeDashboardHeroState(signal, { dimension: "research", score: 20 }, "tr");
    expect(result.kind).toBe("claimable");
    expect(result.gapLabel).toBe("Araştırma");
  });

  test("evidence stat labels are Turkish", () => {
    const signal: DimensionSignal[] = [
      signalRow("awards_distinction", { state: "strong", score: 100, confidence: "high" }),
      signalRow("academics", { state: "developing", score: 43, confidence: "medium" }),
      signalRow("research", { state: "limited_evidence", score: 5 }),
    ];
    const result = computeDashboardHeroState(signal, { dimension: "research", score: 5 }, "tr");
    const labels = result.evidence!.map((e) => e.label);
    expect(labels).toEqual(["Değerlendirilen alan", "Zaten güçlü", "Henüz kanıt yok"]);
  });

  test("omitting locale is identical to passing 'en' explicitly (default-locale backward compatibility)", () => {
    const signal = ALL_DIMENSIONS.map((d, i) =>
      d === "research" ? signalRow(d, { state: "emerging", score: 20, confidence: "medium" }) : signalRow(d, { state: "strong", score: 90 - i, confidence: "high" }),
    );
    const withDefault = computeDashboardHeroState(signal, { dimension: "research", score: 20 });
    const withExplicitEn = computeDashboardHeroState(signal, { dimension: "research", score: 20 }, "en");
    expect(withDefault).toEqual(withExplicitEn);
  });
});
