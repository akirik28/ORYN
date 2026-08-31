import { describe, expect, test } from "vitest";
import { checkUndergraduateFieldAvailability } from "@/lib/admissions/field-availability";

/**
 * RULE-ADMISSIONS-021 (docs/research/admissions-systems/README.md). Nothing in the codebase
 * represented this before — docs/research/admissions-systems/implementation-gap/README.md
 * Gap 4 called it "the single clearest case in this whole analysis of the product giving a
 * confidently wrong answer rather than an honest unknown."
 */
describe("checkUndergraduateFieldAvailability — the confirmed graduate-entry-only cases", () => {
  test.each([
    ["United States", "medicine"],
    ["United States", "law"],
    ["Canada", "medicine"],
    ["Canada", "law"],
  ] as const)("%s %s is not an undergraduate admission object", (country, field) => {
    const result = checkUndergraduateFieldAvailability({ country, field });
    expect(result.availability).toBe("not_offered_at_undergraduate");
    expect(result.explanation).not.toBeNull();
    expect(result.sources.length).toBeGreaterThan(0);
  });

  test("the explanation names the actual route rather than only refusing", () => {
    const result = checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" });
    expect(result.explanation).toContain("bachelor's");
    expect(result.explanation).toContain("medical school");
  });

  test("Canada/Law states the Quebec CEGEP civil-law exception instead of a bare categorical negative", () => {
    const result = checkUndergraduateFieldAvailability({ country: "Canada", field: "law" });
    expect(result.caveat).toContain("Quebec");
  });

  test("US/Medicine flags combined BS/MD programmes as a named exception it does not cover", () => {
    const result = checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" });
    expect(result.caveat).toContain("BS/MD");
  });

  test("live country name forms resolve the same as the canonical form", () => {
    expect(checkUndergraduateFieldAvailability({ country: "US", field: "medicine" }).availability).toBe("not_offered_at_undergraduate");
    expect(checkUndergraduateFieldAvailability({ country: "USA", field: "law" }).availability).toBe("not_offered_at_undergraduate");
  });
});

describe("checkUndergraduateFieldAvailability — the confirmed undergraduate cases", () => {
  test.each(["United Kingdom", "Turkey", "Türkiye", "Germany", "Italy", "Ireland", "Australia"])(
    "Medicine is an undergraduate degree in %s",
    (country) => {
      expect(checkUndergraduateFieldAvailability({ country, field: "medicine" }).availability).toBe("offered");
    }
  );

  test("an offered result carries no explanation — there is nothing to warn about", () => {
    const result = checkUndergraduateFieldAvailability({ country: "United Kingdom", field: "medicine" });
    expect(result.explanation).toBeNull();
    expect(result.caveat).toBeNull();
  });
});

describe("checkUndergraduateFieldAvailability — refuses to claim what it did not research", () => {
  // Only Medicine and Law were established to RULE-ADMISSIONS-021's standard. Returning
  // "offered" for Engineering in the US would be an inference dressed as a finding.
  test.each(["engineering", "computer_science", "economics", "architecture", "design"] as const)(
    "%s is unknown even in a fully researched country",
    (field) => {
      const result = checkUndergraduateFieldAvailability({ country: "United States", field });
      expect(result.availability).toBe("unknown");
      expect(result.explanation).toBeNull();
    }
  );

  test("Medicine in an unresearched country is unknown, not assumed offered", () => {
    expect(checkUndergraduateFieldAvailability({ country: "Japan", field: "medicine" }).availability).toBe("unknown");
  });

  test("a missing country or field is unknown rather than an error", () => {
    expect(checkUndergraduateFieldAvailability({ country: null, field: "medicine" }).availability).toBe("unknown");
    expect(checkUndergraduateFieldAvailability({ country: "United States", field: null }).availability).toBe("unknown");
    expect(() => checkUndergraduateFieldAvailability({ country: null, field: null })).not.toThrow();
  });
});

describe("checkUndergraduateFieldAvailability — locale: tr", () => {
  test.each([
    ["United States", "medicine", "Amerika Birleşik Devletleri'nde Tıp bir lisans derecesi değildir"],
    ["United States", "law", "Amerika Birleşik Devletleri'nde Hukuk bir lisans derecesi değildir"],
    ["Canada", "medicine", "Kanada'da Tıp bir lisans derecesi değildir"],
    ["Canada", "law", "Kanada'da Hukuk fiilen bir lisans derecesi değildir"],
  ] as const)("%s %s explanation is Turkish and names the real route", (country, field, expectedOpening) => {
    const result = checkUndergraduateFieldAvailability({ country, field }, "tr");
    expect(result.explanation).toContain(expectedOpening);
  });

  test("Canada/Law's Turkish caveat states the Quebec CEGEP exception", () => {
    const result = checkUndergraduateFieldAvailability({ country: "Canada", field: "law" }, "tr");
    expect(result.caveat).toContain("Quebec");
    expect(result.caveat).toContain("CEGEP");
  });

  test("US/Medicine's Turkish caveat names the BS/MD exception", () => {
    const result = checkUndergraduateFieldAvailability({ country: "United States", field: "medicine" }, "tr");
    expect(result.caveat).toContain("BS/MD");
  });

  test("an entry with no caveat in English has no caveat in Turkish either (US/Law, Canada/Medicine)", () => {
    expect(checkUndergraduateFieldAvailability({ country: "United States", field: "law" }, "tr").caveat).toBeNull();
    expect(checkUndergraduateFieldAvailability({ country: "Canada", field: "medicine" }, "tr").caveat).toBeNull();
  });

  test("an offered result carries no explanation in Turkish either — nothing to warn about, in either language", () => {
    const result = checkUndergraduateFieldAvailability({ country: "United Kingdom", field: "medicine" }, "tr");
    expect(result.explanation).toBeNull();
    expect(result.caveat).toBeNull();
  });

  test("omitting locale is identical to passing 'en' explicitly, across every researched entry (default-locale backward compatibility)", () => {
    for (const [country, field] of [
      ["United States", "medicine"],
      ["United States", "law"],
      ["Canada", "medicine"],
      ["Canada", "law"],
    ] as const) {
      expect(checkUndergraduateFieldAvailability({ country, field })).toEqual(checkUndergraduateFieldAvailability({ country, field }, "en"));
    }
  });
});
