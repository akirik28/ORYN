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
 * exists on both the pin fill and the hover ring, and the un-touched Standard branch is
 * still exactly what it was before this pass. It cannot see whether the gradient actually
 * paints, whether the glow filter renders, or whether App Router threads a real `plan_tier`
 * value through three components correctly — those need a live render, which per the
 * fleet's active disk-pressure gate policy (2026-09-02) this pass did not run. Said
 * explicitly here rather than let a green run imply more than it does; see this package's
 * own doc for what a live check would need to confirm once a build is safe to run again.
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
