import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * WorldMapExplorer is a "use client" component built on @vnedyalk0v/react19-simple-maps +
 * d3-geo + a real TopoJSON world dataset — the existing map-visuals.test.ts /
 * map-interaction.test.ts files already scope themselves to the pure logic extracted out of
 * this file (lib/data/map-visuals.ts's resolveCountryFillStyle, lib/universities/
 * cluster-pins.ts) rather than the component's own render, for the same reason this file
 * does the same thing here: a real render needs the map library, real topology data, and a
 * DOM environment capable of SVG, which is real integration-test infrastructure this
 * codebase doesn't have for this component and building it wasn't this pass's job.
 *
 * WHAT THIS FILE ACTUALLY PROVES: that the specific strings this fix depends on are present
 * in the source — the gradient def's id matches its `url(#...)` reference, the tier branch
 * exists on the pin fill/hover ring/country dots/cluster badges/ocean background alike, and
 * the un-touched Standard branch is still exactly what it was before either pass. It cannot
 * see whether the gradient actually paints, whether the glow filter renders, or whether
 * App Router threads a real `plan_tier` value through three components correctly — those
 * need a live render. Said explicitly here rather than let a green run imply more than it
 * does; see this package's own doc for the live measurements a real check needs.
 *
 * Extended 2026-09-02 (second pass): the founder reversed "contained signal" after seeing
 * the pin fix live — reversal, not a rejection of the fix itself, see the CEO's own message.
 * This pass widens Ultra to the rest of the map (ocean, country fills, world-scale dots) so
 * the whole surface belongs to the same vivid world instead of pins alone looking themed
 * against an otherwise-Standard map.
 */

function src(relPath: string): string {
  return readFileSync(join(import.meta.dirname, "..", "..", relPath), "utf8");
}

describe("WorldMapExplorer — Ultra pin treatment", () => {
  const source = src("features/universities/world-map-explorer.tsx");

  test("tier defaults to standard, matching resolvePlanTier's own absent-means-standard convention", () => {
    expect(source).toContain('tier = "standard",');
  });

  test("the gradient def's id and its fill reference match exactly", () => {
    const defMatch = source.match(/<radialGradient id="([^"]+)"/);
    expect(defMatch).not.toBeNull();
    const gradientId = defMatch![1];
    expect(source).toContain(`fill="url(#${gradientId})"`);
  });

  test("the gradient def is scoped to tier === \"ultra\" — never rendered for Standard", () => {
    // Two separate, single-line checks rather than one fragile multi-line/whitespace-exact
    // match: the def block opens right after the ultra-tier ternary, before <Geographies>.
    const ternaryIndex = source.indexOf('{tier === "ultra" ? (');
    const defsIndex = source.indexOf("<defs>");
    const geographiesIndex = source.indexOf("<Geographies");
    expect(ternaryIndex).toBeGreaterThan(-1);
    expect(defsIndex).toBeGreaterThan(ternaryIndex);
    expect(geographiesIndex).toBeGreaterThan(defsIndex);
  });

  test("the gradient stops read the same three tokens app/globals.css defines for [data-tier=\"ultra\"]", () => {
    expect(source).toContain('stopColor="var(--tier-grad-1)"');
    expect(source).toContain('stopColor="var(--tier-grad-2)"');
    expect(source).toContain('stopColor="var(--tier-grad-3)"');
  });

  test("the Ultra pin fill takes only tier as input — no per-university field conditions it", () => {
    // Regression guard for the "never flatter an absence" constraint: the block that emits
    // `url(#ultra-pin-gradient)` must not also branch on qsRank/imageUrl or any other
    // per-university completeness signal. A simple proxy: the fill/gradient JSX block
    // contains no reference to `.qsRank` or `.imageUrl` at all.
    const pinBlockStart = source.indexOf('fill="url(#ultra-pin-gradient)"');
    expect(pinBlockStart).toBeGreaterThan(-1);
    const nearby = source.slice(pinBlockStart - 400, pinBlockStart + 400);
    expect(nearby).not.toContain(".qsRank");
    expect(nearby).not.toContain(".imageUrl");
  });

  test("the Ultra hover ring reuses motion-safe:animate-ping — not a new animation mechanism", () => {
    expect(source).toContain('fill="var(--tier-glow)" className="motion-safe:animate-ping"');
  });

  test("Standard's own pin fill classes are untouched — fill-primary / fill-primary/85, exact strings", () => {
    expect(source).toContain('className={isPinHovered ? "fill-primary" : "fill-primary/85"}');
  });

  test("Standard's own hover halo is untouched — fill-primary/20, exact string", () => {
    expect(source).toContain('<circle r={9} className="fill-primary/20" />');
  });

  test("Ultra pins are bigger, not just recolored — 5/6.5 vs Standard's 3.5/5 (the founder's own \"grow, not just glow\" lesson)", () => {
    expect(source).toContain("r={isPinHovered ? 6.5 : 5}");
    // Standard's own radius is untouched — still exactly what it was before this pass.
    expect(source).toContain("r={isPinHovered ? 5 : 3.5}");
  });
});

describe("WorldMapExplorer — ocean background belongs to the same vivid world", () => {
  const source = src("features/universities/world-map-explorer.tsx");

  test("Ultra's ocean wash reads --tier-accent, far less diluted than Standard's --brand-primary wash", () => {
    expect(source).toContain("color-mix(in oklch, var(--tier-accent), var(--card) 45%)");
    // Standard's own background is untouched — still exactly what it was before this pass.
    expect(source).toContain("color-mix(in oklch, var(--brand-primary), var(--card) 94%)");
  });

  test("both ocean variants still fade to var(--card) at the edge — a vivid core, not a flat fill that could clash with content painted on top", () => {
    const ultraMatch = source.match(/tier === "ultra"\s*\?\s*"([^"]+)"/);
    expect(ultraMatch).not.toBeNull();
    expect(ultraMatch![1]).toMatch(/,\s*var\(--card\)\)$/);
  });
});

describe("WorldMapExplorer — world-scale country dots reuse the same Ultra gradient, not a second one", () => {
  const source = src("features/universities/world-map-explorer.tsx");

  test("the country-dot circle references the identical gradient id the pins use", () => {
    const fillCount = source.match(/fill="url\(#ultra-pin-gradient\)"/g)?.length ?? 0;
    // Pins, the world-scale country dot, and the cluster badge each reference it once —
    // three call sites, one shared def, not three defs.
    expect(fillCount).toBeGreaterThanOrEqual(3);
    // Only one <radialGradient> definition exists no matter how many circles reference it.
    const defCount = source.match(/<radialGradient id=/g)?.length ?? 0;
    expect(defCount).toBe(1);
  });

  test("the selected country dot grows under Ultra (radius * 1.15) — same grow-not-just-glow rule as pins", () => {
    expect(source).toContain("r={isSelected ? radius * 1.15 : radius}");
  });

  test("which countries are supported is unaffected by tier — resolveCountryFillStyle is still called with the same isSupported input regardless", () => {
    expect(source).toContain("resolveCountryFillStyle({ isSupported, isSelected: isThisSelected, isHovered: isThisHovered }, tier)");
  });
});

describe("UniversityExplorerHero and the real page — tier threaded, not re-derived", () => {
  test("UniversityExplorerHero accepts tier and passes it straight to WorldMapExplorer", () => {
    const source = src("features/universities/university-explorer-hero.tsx");
    expect(source).toContain("tier = \"standard\",");
    expect(source).toContain('tier={tier}');
  });

  test("the real page resolves the tier from the same cache()-wrapped requireProfile() the layout uses, not a second query shape", () => {
    const source = src("app/(app)/universities/page.tsx");
    expect(source).toContain("resolvePlanTier(await requireProfile())");
    expect(source).toContain("tier={planTier}");
  });
});
