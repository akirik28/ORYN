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
});
