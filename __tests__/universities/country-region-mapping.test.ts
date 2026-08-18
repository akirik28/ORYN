import { describe, expect, test } from "vitest";
import { SUPPORTED_COUNTRIES, countryByName } from "@/lib/data/country-geo";
import { MAP_REGIONS, WORLD_REGION, regionById } from "@/lib/data/regions";

// Regression coverage for the 2026-08-18 fix: SUPPORTED_COUNTRIES was a 12-country
// hand-picked allowlist that silently dropped 77 of the 89 real countries in the live
// `universities` data from every region tab, country count, and map pin — the entire cause
// of the founder-reported "Asia: 0" (zero Asian countries were even in the list) and the
// explorer looking capped at "~400" universities (the old 12 summed to 435/1019). These
// tests check the STRUCTURE (every real region has real countries, key countries land in
// the expected region, no silent-empty-region regression) rather than exact live counts —
// counts change as more universities get acquired; a test asserting "China has 64
// universities" would be testing today's data snapshot, not the mapping logic, and would
// break on the next enrichment pass for no real reason.
describe("SUPPORTED_COUNTRIES / region mapping", () => {
  test("covers a broad, real set of countries, not a small hand-picked allowlist", () => {
    // Was 12 before the fix. Not asserting the exact current count (89 as of this pass) —
    // that will grow as the spine grows — just that it's nowhere near the old, badly-wrong
    // ballpark. A regression back down to a dozen-ish list would fail this immediately.
    expect(SUPPORTED_COUNTRIES.length).toBeGreaterThan(50);
  });

  test("no duplicate country names", () => {
    const names = SUPPORTED_COUNTRIES.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
  });

  test("every country has a non-empty region and centroid", () => {
    for (const c of SUPPORTED_COUNTRIES) {
      expect(c.region).toBeTruthy();
      expect(c.centroid).toHaveLength(2);
      expect(Number.isFinite(c.centroid[0])).toBe(true);
      expect(Number.isFinite(c.centroid[1])).toBe(true);
    }
  });

  test("Asia has real countries — the exact symptom of the original bug", () => {
    const asia = MAP_REGIONS.find((r) => r.id === "asia")!;
    expect(asia.countries.length).toBeGreaterThan(0);
    // China alone had 64 universities when this was written and Asia's region tab still
    // read "0" — that specific failure mode, not just "some Asian country exists".
    expect(asia.countries).toContain("China");
    expect(asia.countries).toContain("India");
    expect(asia.countries).toContain("Japan");
  });

  test("every non-World region has at least one country — no silently-empty region", () => {
    for (const region of MAP_REGIONS) {
      expect(region.countries.length).toBeGreaterThan(0);
    }
  });

  test("Oceania, South America, and Africa exist as real regions (added 2026-08-18 — CountryGeo's region type used to only have 'North America' | 'Europe' | 'Asia' | 'Other')", () => {
    const ids = MAP_REGIONS.map((r) => r.id);
    expect(ids).toContain("oceania");
    expect(ids).toContain("south_america");
    expect(ids).toContain("africa");
    expect(regionById.get("oceania")?.countries.length).toBeGreaterThan(0);
    expect(regionById.get("south_america")?.countries.length).toBeGreaterThan(0);
    expect(regionById.get("africa")?.countries.length).toBeGreaterThan(0);
  });

  test("key countries land in the expected region", () => {
    const regionOf = (name: string) => countryByName.get(name)?.region;
    expect(regionOf("Germany")).toBe("Europe");
    expect(regionOf("United Kingdom")).toBe("Europe");
    expect(regionOf("United States")).toBe("North America");
    expect(regionOf("China")).toBe("Asia");
    expect(regionOf("India")).toBe("Asia");
    expect(regionOf("Australia")).toBe("Oceania");
    expect(regionOf("Brazil")).toBe("South America");
    expect(regionOf("South Africa")).toBe("Africa");
    // Existing product decisions kept for continuity — see country-geo.ts's header for why.
    expect(regionOf("Turkey")).toBe("Europe");
  });

  test("WORLD_REGION includes every SUPPORTED_COUNTRIES name exactly once", () => {
    expect(WORLD_REGION.countries.length).toBe(SUPPORTED_COUNTRIES.length);
    expect(new Set(WORLD_REGION.countries).size).toBe(SUPPORTED_COUNTRIES.length);
  });

  test("every region's countries are a real subset of SUPPORTED_COUNTRIES (no drift)", () => {
    const allNames = new Set(SUPPORTED_COUNTRIES.map((c) => c.name));
    for (const region of MAP_REGIONS) {
      for (const name of region.countries) {
        expect(allNames.has(name)).toBe(true);
      }
    }
  });

  test("numericId, when present, is a plausible ISO 3166-1 numeric string (3 digits)", () => {
    for (const c of SUPPORTED_COUNTRIES) {
      if (c.numericId === null) continue;
      expect(c.numericId).toMatch(/^\d{3}$/);
    }
  });
});
