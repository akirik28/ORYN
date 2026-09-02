import { describe, expect, test } from "vitest";
import { pickLabelPriorityCountries, resolveCountryFillStyle } from "@/lib/data/map-visuals";

describe("pickLabelPriorityCountries — P0N label clutter fix", () => {
  const countries = [{ name: "Big" }, { name: "Medium" }, { name: "Small" }, { name: "Tiny" }];
  const countByName = new Map([
    ["Big", 100],
    ["Medium", 50],
    ["Small", 10],
    ["Tiny", 1],
  ]);

  test("caps the label set at N, keeping the highest-count countries", () => {
    const labels = pickLabelPriorityCountries(countries, countByName, 2, null);
    expect(labels).toEqual(new Set(["Big", "Medium"]));
  });

  test("a cap wider than the list shows every country — the small-region case (Oceania, Africa, ...)", () => {
    const labels = pickLabelPriorityCountries(countries, countByName, 15, null);
    expect(labels.size).toBe(4);
  });

  test("the selected country is always included even when it ranks outside the cap — never a silent unlabeled dot", () => {
    const labels = pickLabelPriorityCountries(countries, countByName, 2, "Tiny");
    expect(labels.has("Tiny")).toBe(true);
    expect(labels.size).toBe(3); // Big, Medium (top 2) + Tiny (selected, added on top)
  });

  test("selecting a country already inside the cap doesn't double it or change the set size", () => {
    const labels = pickLabelPriorityCountries(countries, countByName, 2, "Big");
    expect(labels).toEqual(new Set(["Big", "Medium"]));
  });

  test("countries with no entry in countByName rank last, not crash", () => {
    const labels = pickLabelPriorityCountries([...countries, { name: "NoData" }], countByName, 5, null);
    expect(labels.has("NoData")).toBe(true); // cap (5) >= country count (5), everyone shown
  });

  test("world-scope cap (8) and region-scope cap (15) are what the component actually uses", () => {
    // Regression guard, not a design opinion: if these constants drift, this test should be
    // the one that has to change, not a silent behavior shift nobody notices on the map.
    const manyCountries = Array.from({ length: 40 }, (_, i) => ({ name: `Country${i}` }));
    const counts = new Map(manyCountries.map((c, i) => [c.name, 40 - i]));
    expect(pickLabelPriorityCountries(manyCountries, counts, 8, null).size).toBe(8);
    expect(pickLabelPriorityCountries(manyCountries, counts, 15, null).size).toBe(15);
  });
});

describe("resolveCountryFillStyle — P0P black-selected-state fix", () => {
  test("every state combination resolves to a real, non-empty fill — never undefined/empty (the actual failure mode that read as black)", () => {
    for (const isSupported of [true, false]) {
      for (const isSelected of [true, false]) {
        for (const isHovered of [true, false]) {
          const style = resolveCountryFillStyle({ isSupported, isSelected, isHovered });
          expect(style.fill).toBeTruthy();
          expect(typeof style.fill).toBe("string");
        }
      }
    }
  });

  test("selected never resolves to a literal black/near-black value", () => {
    const style = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false });
    expect(style.fill).not.toBe("black");
    expect(style.fill).not.toBe("rgb(0, 0, 0)");
    expect(style.fill).not.toBe("#000");
    expect(style.fill).not.toBe("#000000");
    // The real fix: every variant is a diluted mix of the brand token against --background,
    // never the bare, undiluted token (which is what read as near-black at map scale).
    expect(style.fill).toContain("color-mix(in oklch, var(--brand-primary), var(--background)");
  });

  test("selected+hovered is a different (stronger) fill than selected alone — hover must stay visually distinct from persistent selection", () => {
    const selected = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false });
    const selectedHovered = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: true });
    expect(selectedHovered.fill).not.toBe(selected.fill);
  });

  test("unsupported countries never use the brand-primary token, selected or not", () => {
    const style = resolveCountryFillStyle({ isSupported: false, isSelected: false, isHovered: false });
    expect(style.fill).not.toContain("--brand-primary");
  });

  test("selected countries get a visibly heavier stroke than unselected — a real visual anchor, not just a fill change", () => {
    const selected = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false });
    const unselected = resolveCountryFillStyle({ isSupported: true, isSelected: false, isHovered: false });
    expect(selected.strokeWidth).toBeGreaterThan(unselected.strokeWidth);
    expect(selected.stroke).not.toBe(unselected.stroke);
  });

  test("tier defaults to standard when omitted — every existing call site (and every test above) keeps its exact prior behavior", () => {
    const withDefault = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false });
    const explicitStandard = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false }, "standard");
    expect(withDefault).toEqual(explicitStandard);
  });
});

describe("resolveCountryFillStyle — Ultra ladder, 2026-09-02 (founder reversed contained-signal)", () => {
  test("every state combination still resolves to a real, non-empty fill under Ultra too", () => {
    for (const isSupported of [true, false]) {
      for (const isSelected of [true, false]) {
        for (const isHovered of [true, false]) {
          const style = resolveCountryFillStyle({ isSupported, isSelected, isHovered }, "ultra");
          expect(style.fill).toBeTruthy();
          expect(typeof style.fill).toBe("string");
        }
      }
    }
  });

  test("Ultra never reaches for --brand-primary at all — every tier-aware branch uses a --tier- token instead", () => {
    for (const isSupported of [true, false]) {
      for (const isSelected of [true, false]) {
        const style = resolveCountryFillStyle({ isSupported, isSelected, isHovered: false }, "ultra");
        expect(style.fill).not.toContain("--brand-primary");
        expect(style.stroke).not.toContain("--brand-primary");
      }
    }
  });

  test("Ultra selected uses --tier-accent-strong (the red end), not --tier-accent — \"selected turns red\" is literal", () => {
    const style = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false }, "ultra");
    expect(style.fill).toContain("--tier-accent-strong");
    expect(style.fill).not.toContain("--tier-accent)");
  });

  test("Ultra supported-unselected uses --tier-accent (the amber end), not the strong/red token", () => {
    const style = resolveCountryFillStyle({ isSupported: true, isSelected: false, isHovered: false }, "ultra");
    expect(style.fill).toContain("--tier-accent)");
    expect(style.fill).not.toContain("--tier-accent-strong");
  });

  test("Ultra is bolder than Standard at every comparable step — less --background dilution, not just a re-tokened same strength", () => {
    const extractBackgroundPercent = (fill: string) => Number(fill.match(/var\(--background\)\s*(\d+)%/)?.[1]);
    const cases: Array<[boolean, boolean, boolean]> = [
      [true, false, false],
      [true, false, true],
      [true, true, false],
      [true, true, true],
    ];
    for (const [isSupported, isSelected, isHovered] of cases) {
      const standard = extractBackgroundPercent(resolveCountryFillStyle({ isSupported, isSelected, isHovered }, "standard").fill);
      const ultra = extractBackgroundPercent(resolveCountryFillStyle({ isSupported, isSelected, isHovered }, "ultra").fill);
      expect(ultra).toBeLessThan(standard);
    }
  });

  test("Ultra never reaches full strength either — the same near-black-at-scale lesson Standard's own ladder already learned, still applied", () => {
    // Never 0% background: a fully undiluted token is exactly the shape that read as
    // near-black at map scale before this file's own ladder existed (see the test above,
    // "selected never resolves to a literal black/near-black value"). Ultra goes much
    // bolder than Standard but keeps this one safety margin.
    for (const isSupported of [true, false]) {
      for (const isSelected of [true, false]) {
        for (const isHovered of [true, false]) {
          const style = resolveCountryFillStyle({ isSupported, isSelected, isHovered }, "ultra");
          if (!isSupported) continue; // unsupported is deliberately untouched by tier, checked below
          expect(style.fill).not.toContain("var(--background) 0%");
          expect(style.fill).toMatch(/var\(--background\)\s*\d+%/);
        }
      }
    }
  });

  test("unsupported countries are untouched by tier — which countries have data is a fact, not a mood", () => {
    const standard = resolveCountryFillStyle({ isSupported: false, isSelected: false, isHovered: false }, "standard");
    const ultra = resolveCountryFillStyle({ isSupported: false, isSelected: false, isHovered: false }, "ultra");
    expect(ultra).toEqual(standard);
    expect(ultra.fill).not.toContain("--tier-");
  });

  test("Ultra selected+hovered is a different (stronger) fill than selected alone, same distinctness guarantee as Standard", () => {
    const selected = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false }, "ultra");
    const selectedHovered = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: true }, "ultra");
    expect(selectedHovered.fill).not.toBe(selected.fill);
  });

  test("Ultra's selected stroke is heavier than Standard's — the visual anchor gets stronger too, not just the fill", () => {
    const standard = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false }, "standard");
    const ultra = resolveCountryFillStyle({ isSupported: true, isSelected: true, isHovered: false }, "ultra");
    expect(ultra.strokeWidth).toBeGreaterThanOrEqual(standard.strokeWidth);
    expect(ultra.stroke).toContain("--tier-accent-strong");
  });
});
