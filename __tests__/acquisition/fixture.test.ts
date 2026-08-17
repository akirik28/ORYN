import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { validateFixture, type AcquiredFact } from "@/lib/acquisition/fixture";

const NOW = new Date("2026-08-17T12:00:00.000Z");

function fact(overrides: Partial<AcquiredFact> = {}): AcquiredFact {
  return {
    field: "website_url",
    value: "https://www.ed.ac.uk",
    factClass: "identity",
    writePolicy: "fill_if_null",
    scope: "institution",
    sourceUrl: "https://ror.org/01nrxwf90",
    sourceType: "open_registry",
    sourceTier: "HIGH",
    sourceAsOf: "2025-08-26",
    retrievedAt: "2026-08-17T00:00:00.000Z",
    verificationState: "verified_current",
    notes: null,
    ...overrides,
  };
}

function fixture(facts: AcquiredFact[] = [fact()]) {
  return {
    schemaVersion: 1 as const,
    generatedAt: "2026-08-17T00:00:00.000Z",
    generator: "test",
    sources: [{ name: "ROR", api: "https://api.ror.org/v2/organizations", licence: "CC0", factClasses: ["identity"] }],
    universities: [
      {
        declaredName: "The University of Edinburgh",
        declaredCountry: "United Kingdom",
        rorId: "https://ror.org/01nrxwf90",
        rorDisplayName: "University of Edinburgh",
        rorCountryName: "United Kingdom",
        rorLastModified: "2025-08-26",
        externalIds: { ror: "01nrxwf90", wikidata: "Q160302" },
        aliases: ["University of Edinburgh"],
        acronyms: [],
        facts,
      },
    ],
    unresolved: [],
  };
}

describe("validateFixture", () => {
  test("accepts a well-formed fixture", () => {
    const result = validateFixture(fixture(), NOW);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.stats).toMatchObject({ universities: 1, facts: 1, unresolved: 0 });
  });

  test("rejects a fact with no source URL — provenance is not optional", () => {
    const broken = fixture([{ ...fact(), sourceUrl: "" } as AcquiredFact]);
    expect(validateFixture(broken, NOW).ok).toBe(false);
  });

  test("rejects two facts sharing a field and scope, which would make import order decide", () => {
    const result = validateFixture(fixture([fact(), fact({ value: "https://other.example" })]), NOW);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("import order");
  });

  test("allows the same field at two different scopes", () => {
    const result = validateFixture(
      fixture([
        fact({ field: "total_students", value: 100, factClass: "population", scope: "institution" }),
        fact({ field: "total_students", value: 40, factClass: "population", scope: "undergraduate" }),
      ]),
      NOW
    );
    expect(result.ok).toBe(true);
  });

  test("rejects a future sourceAsOf year", () => {
    const result = validateFixture(fixture([fact({ sourceAsOf: "2099-01-01" })]), NOW);
    expect(result.errors.join(" ")).toContain("future");
  });

  test("rejects a retrievedAt in the future", () => {
    const result = validateFixture(fixture([fact({ retrievedAt: "2030-01-01T00:00:00.000Z" })]), NOW);
    expect(result.errors.join(" ")).toContain("future");
  });

  test("warns rather than errors when a source states no date, but refuses to call it current silently", () => {
    const result = validateFixture(fixture([fact({ sourceAsOf: null })]), NOW);
    expect(result.warnings.join(" ")).toContain("no date");
  });

  test("catches a duplicated ROR id across two entries", () => {
    const base = fixture();
    const doubled = { ...base, universities: [base.universities[0], { ...base.universities[0] }] };
    const result = validateFixture(doubled, NOW);
    expect(result.ok).toBe(false);
    expect(result.errors.join(" ")).toContain("Duplicate ROR id");
  });

  test("reports a country disagreement between roster and registry as a warning for the importer", () => {
    const base = fixture();
    const mismatched = { ...base, universities: [{ ...base.universities[0], rorCountryName: "Ireland" }] };
    expect(validateFixture(mismatched, NOW).warnings.join(" ")).toContain("registry");
  });

  test("rejects out-of-range coordinates", () => {
    const badLat = validateFixture(fixture([fact({ field: "latitude", value: 95, factClass: "identity", scope: "institution_geonames_locality" })]), NOW);
    expect(badLat.errors.join(" ")).toContain("outside the valid ±90");
    const badLng = validateFixture(fixture([fact({ field: "longitude", value: -200, factClass: "identity", scope: "institution_geonames_locality" })]), NOW);
    expect(badLng.errors.join(" ")).toContain("outside the valid ±180");
  });

  test("accepts coordinates inside range", () => {
    const ok = validateFixture(
      fixture([
        fact({ field: "latitude", value: 41.01384, scope: "institution_geonames_locality" }),
        fact({ field: "longitude", value: 28.94966, scope: "institution_geonames_locality" }),
      ]),
      NOW
    );
    expect(ok.errors).toEqual([]);
  });

  test("rejects a non-https source URL", () => {
    const result = validateFixture(fixture([fact({ sourceUrl: "http://ror.org/01nrxwf90" })]), NOW);
    expect(result.errors.join(" ")).toContain("not https");
  });

  test("returns structured errors instead of throwing on completely malformed input", () => {
    const result = validateFixture({ nope: true }, NOW);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.stats.facts).toBe(0);
  });
});

describe("the committed pilot fixture", () => {
  // Guards the real artefact, not a synthetic one: if a future acquisition run produces a
  // fixture that violates the provenance rules, this fails in CI rather than at import time.
  const raw: unknown = JSON.parse(readFileSync("supabase/fixtures/university-identity-pilot.json", "utf8"));

  test("validates cleanly", () => {
    const result = validateFixture(raw);
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
  });

  test("covers at least 20 universities across at least 15 countries", () => {
    const parsed = raw as { universities: { declaredCountry: string }[] };
    expect(parsed.universities.length).toBeGreaterThanOrEqual(20);
    expect(new Set(parsed.universities.map((u) => u.declaredCountry)).size).toBeGreaterThanOrEqual(15);
  });

  test("is not US/UK-dominated — the pilot has to prove the hard cases", () => {
    const parsed = raw as { universities: { declaredCountry: string }[] };
    const usUk = parsed.universities.filter((u) => u.declaredCountry === "United States" || u.declaredCountry === "United Kingdom").length;
    expect(usUk / parsed.universities.length).toBeLessThan(0.25);
  });

  test("every fact carries complete provenance and a computed verification state", () => {
    const parsed = raw as { universities: { facts: AcquiredFact[] }[] };
    for (const uni of parsed.universities) {
      for (const f of uni.facts) {
        expect(f.sourceUrl).toMatch(/^https:\/\//);
        expect(f.scope.length).toBeGreaterThan(0);
        expect(f.retrievedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        expect(["verified_current", "verified_historical", "verified_derived"]).toContain(f.verificationState);
      }
    }
  });

  test("no fact claims a source class its source is not authoritative for", () => {
    const parsed = raw as { universities: { facts: AcquiredFact[] }[] };
    for (const uni of parsed.universities) {
      for (const f of uni.facts) {
        // ROR/OpenAlex only ever supply identity and research-strength facts here; a cost or
        // policy fact sourced from a registry would be a serious regression.
        if (f.sourceType === "open_registry") expect(["identity", "research_strength"]).toContain(f.factClass);
      }
    }
  });

  test("city is cross-check-only so it can never overwrite a student-facing value", () => {
    const parsed = raw as { universities: { facts: AcquiredFact[] }[] };
    const cityFacts = parsed.universities.flatMap((u) => u.facts.filter((f) => f.field === "city"));
    expect(cityFacts.length).toBeGreaterThan(0);
    for (const f of cityFacts) expect(f.writePolicy).toBe("cross_check_only");
  });

  test("website_url is fill-if-null so it can only close gaps", () => {
    const parsed = raw as { universities: { facts: AcquiredFact[] }[] };
    const siteFacts = parsed.universities.flatMap((u) => u.facts.filter((f) => f.field === "website_url"));
    expect(siteFacts.length).toBeGreaterThan(0);
    for (const f of siteFacts) expect(f.writePolicy).toBe("fill_if_null");
  });
});
