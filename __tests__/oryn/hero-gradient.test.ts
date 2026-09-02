import { describe, it, expect } from "vitest";
import { heroGradientStyle, heroGradientStyleCompact } from "@/components/oryn/hero-gradient";

describe("heroGradientStyle", () => {
  it("renders the exact original literal under standard tier", () => {
    expect(heroGradientStyle("standard")).toEqual({
      background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)",
    });
  });

  it("switches to the tier tokens, not a second hardcoded palette, under ultra", () => {
    const { background } = heroGradientStyle("ultra");
    expect(background).toContain("var(--tier-grad-3)");
    expect(background).toContain("var(--tier-accent)");
    expect(background).toContain("var(--tier-grad-1)");
    // The standard card's literal navy hex codes must not leak into the ultra output.
    expect(background).not.toContain("#111030");
    expect(background).not.toContain("#1A1650");
    expect(background).not.toContain("#0E1540");
  });

  it("keeps the 3-stop shape (0% / 50% / 100%) in both tiers", () => {
    for (const tier of ["standard", "ultra"] as const) {
      const { background } = heroGradientStyle(tier);
      expect(background).toContain("0%");
      expect(background).toContain("50%");
      expect(background).toContain("100%");
    }
  });
});

describe("heroGradientStyleCompact", () => {
  it("renders applications' own 2-stop original literal under standard tier", () => {
    expect(heroGradientStyleCompact("standard")).toEqual({
      background: "linear-gradient(145deg, #111030 0%, #1A1650 100%)",
    });
  });

  it("has no 50% middle stop, unlike the full-card variant", () => {
    for (const tier of ["standard", "ultra"] as const) {
      const { background } = heroGradientStyleCompact(tier);
      expect(background).not.toContain("50%");
    }
  });

  it("shares the same first two darkened stops as the full card, not an independently re-picked pair", () => {
    const compact = String(heroGradientStyleCompact("ultra").background);
    const full = String(heroGradientStyle("ultra").background);
    const stop1 = "color-mix(in oklch, var(--tier-grad-3), black 20%) 0%";
    const stop2 = "color-mix(in oklch, var(--tier-accent), black 45%)";
    expect(compact).toContain(stop1);
    expect(compact).toContain(stop2);
    expect(full).toContain(stop1);
    expect(full).toContain(stop2);
  });
});
