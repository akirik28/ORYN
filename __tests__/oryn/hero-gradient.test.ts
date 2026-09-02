import { describe, it, expect } from "vitest";
import { heroGradientStyle, heroGradientStyleCompact } from "@/components/oryn/hero-gradient";

describe("heroGradientStyle", () => {
  it("renders the exact original literal background under standard tier, with no border or glow", () => {
    expect(heroGradientStyle("standard")).toEqual({
      background: "linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)",
    });
  });

  it("keeps the background completely unchanged under ultra — only a border and glow are added", () => {
    const style = heroGradientStyle("ultra");
    expect(style.background).toBe("linear-gradient(145deg, #111030 0%, #1A1650 50%, #0E1540 100%)");
  });

  it("adds a brand-primary border and box-shadow glow under ultra, reading no flame token", () => {
    const style = heroGradientStyle("ultra");
    expect(String(style.border)).toContain("var(--brand-primary)");
    expect(String(style.boxShadow)).toContain("var(--brand-primary)");
    expect(String(style.border)).not.toMatch(/--tier-/);
    expect(String(style.boxShadow)).not.toMatch(/--tier-/);
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
  it("renders applications' own 2-stop original literal under standard tier, with no border or glow", () => {
    expect(heroGradientStyleCompact("standard")).toEqual({
      background: "linear-gradient(145deg, #111030 0%, #1A1650 100%)",
    });
  });

  it("has no 50% middle stop, unlike the full-card variant, in either tier", () => {
    for (const tier of ["standard", "ultra"] as const) {
      const { background } = heroGradientStyleCompact(tier);
      expect(background).not.toContain("50%");
    }
  });

  it("shares the exact same border and glow as the full card under ultra, not an independently re-picked pair", () => {
    const compact = heroGradientStyleCompact("ultra");
    const full = heroGradientStyle("ultra");
    expect(compact.border).toBe(full.border);
    expect(compact.boxShadow).toBe(full.boxShadow);
  });
});
