import { describe, expect, test } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const source = readFileSync(join(__dirname, "..", "..", "features/universities/world-map-explorer.tsx"), "utf8");

/**
 * Source-level regression guards for two real bugs this session found and fixed live, neither
 * of which a plain unit test can reproduce directly (both need a real browser/DOM): the map
 * component has no test renderer in this codebase, and the black-fill bug specifically only
 * manifests through a third-party map library's internal click/press event handling — see
 * lib/data/map-visuals.ts's own tests for the half of this (the color math) that IS unit-
 * testable. What these guard is the actual code shape of the fix staying in place, the same
 * way __tests__/universities/compare-constants.test.ts guards its own live-verified fix.
 */
describe("world map — land clicks drive the same selection as marker clicks (P0O)", () => {
  test("Geography has an onClick handler — a founder-reported bug was that only the small marker dot was clickable, not the country's own land shape", () => {
    expect(source).toMatch(/<Geography[\s\S]*?onClick=\{isSupported \? handleGeographyClick/);
  });

  test("the Geography click handler and the Marker click handler both resolve to the same selectCountry call — no parallel selection logic", () => {
    expect(source).toContain("if (name) selectCountry(name);");
    expect(source).toContain("onClick={() => selectCountry(c.name)}");
  });

  test("hovering the land shape feeds the same tooltip state Marker hover does, not a separate one", () => {
    expect(source).toMatch(/handleGeographyEnter[\s\S]*?setHover\(\{ name, clientX: event\.clientX, clientY: event\.clientY \}\)/);
    expect(source).toContain("onMouseEnter={(event) => setHover({ name: c.name, clientX: event.clientX, clientY: event.clientY })}");
  });
});

describe("world map — selected-country fill never depends on the map library's own hover/pressed state (P0P)", () => {
  test("all four style-variant keys (default/hover/pressed/focused) resolve to the exact same style object", () => {
    // The actual root cause, reproduced live: this map library can drop a Geography's style
    // entirely right after a click (a real computed-style check showed an EMPTY inline style
    // attribute on the just-clicked country, which is what made the browser fall back to
    // SVG's own default fill — black). A fresh page load with the same country pre-selected
    // via the URL, no click involved, rendered correctly every time — isolating the bug to
    // the library's internal press-state transition, not the color logic. The fix computes
    // ONE resolved style and repeats it across every key the library could possibly select,
    // so it can't matter which one its internal state machine lands on.
    expect(source).toContain("style={{ default: resolvedStyle, hover: resolvedStyle, pressed: resolvedStyle, focused: resolvedStyle }}");
  });

  test("hover for the selected-state computation comes from this component's own tracked state, not the map library's internal hover flag", () => {
    expect(source).toContain("const isThisHovered = isSupported && hover?.name === nameByNumericId.get(String(geo.id));");
  });
});

describe("world map — country selection is one action shared by map click, and the same URL param chips/filters read (P0O sync)", () => {
  test("selectCountry toggles the same `country` search param the rest of the page (chips, filters, results) already reads", () => {
    expect(source).toContain('params.set("country", name)');
    expect(source).toContain('params.delete("country")');
    // Written through next/navigation's router, not a bespoke fetch/state store — so the
    // server component one level up (app/(app)/universities/page.tsx) re-renders from the
    // same searchParams every other selection surface on the page already drives from.
    expect(source).toContain("router.push(`/universities${params.toString()");
  });
});
