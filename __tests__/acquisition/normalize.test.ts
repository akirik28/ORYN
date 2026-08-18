import { describe, expect, test } from "vitest";
import { countryFromIso2, dbNormalizedName, institutionTypeFromRor, isCurrencyCode, nameKey, nameVariants, normalizeDegreeLevel, parseMoneyAmount, sameCountry } from "@/lib/acquisition/normalize";

describe("dbNormalizedName", () => {
  test("matches Postgres lower(unaccent(x)) — diacritics stripped, case folded", () => {
    expect(dbNormalizedName("Özyeğin University")).toBe("ozyegin university");
    expect(dbNormalizedName("Université Paris Dauphine - PSL")).toBe("universite paris dauphine - psl");
  });

  test("unlike nameKey(), keeps a leading 'The' and does not expand '&' — must match the database's own weaker normalization exactly, not the app's search-oriented one", () => {
    expect(dbNormalizedName("The University of Warwick")).toBe("the university of warwick");
    expect(dbNormalizedName("Johnson & Johnson Institute")).toBe("johnson & johnson institute");
  });

  test("does not collapse punctuation or whitespace variants the way nameKey() does — a real gap this session found live (26 duplicate pairs slipped past canonical_entities_identity_uq this way)", () => {
    expect(dbNormalizedName("St. Andrews")).not.toBe(dbNormalizedName("St Andrews"));
  });
});

describe("nameKey", () => {
  test("strips diacritics so localised and transliterated names compare equal", () => {
    expect(nameKey("Boğaziçi Üniversitesi")).toBe("bogazici universitesi");
    expect(nameKey("Universidade de São Paulo")).toBe(nameKey("Universidade de Sao Paulo"));
    expect(nameKey("Universität Zürich")).toBe("universitat zurich");
  });

  test("drops a leading definite article, which registries and ranking tables disagree about", () => {
    expect(nameKey("The University of Edinburgh")).toBe(nameKey("University of Edinburgh"));
    expect(nameKey("The University of Hong Kong")).toBe("university of hong kong");
  });

  test("keeps 'the' when it is not a leading article", () => {
    expect(nameKey("University of the Arts London")).toContain("the");
  });

  test("normalises punctuation and ampersands", () => {
    expect(nameKey("King's College London")).toBe("kings college london");
    expect(nameKey("A&M University")).toBe("a and m university");
  });
});

describe("nameVariants", () => {
  test("drops a parenthetical suffix", () => {
    expect(nameVariants("University of California (Berkeley)")).toContain("University of California");
  });

  test("drops a trailing dash acronym", () => {
    expect(nameVariants("Middle East Technical University - METU")).toContain("Middle East Technical University");
  });

  test("un-inverts the 'X, University of' form", () => {
    expect(nameVariants("Manchester, University of")).toContain("University of Manchester");
  });

  test("drops a leading acronym prefix", () => {
    // Real gap found live this session: ROR's own record for these is the plain name with
    // no prefix at all — acquire-university-facts.ts's exact-match step was only trying the
    // raw declared name, so these both failed to resolve despite ROR having an exact match
    // for the stripped form sitting in the very first page of results.
    expect(nameVariants("EPFL – École polytechnique fédérale de Lausanne")).toContain("École polytechnique fédérale de Lausanne");
    expect(nameVariants("KIT, Karlsruhe Institute of Technology")).toContain("Karlsruhe Institute of Technology");
  });

  test("does not strip a genuine leading word that merely happens to be capitalized", () => {
    // The leading-acronym rule requires ALL-CAPS (2-8 chars) before the separator — "New" and
    // "The" are mixed-case, so a real institution name is never mistaken for an acronym prefix.
    const variants = nameVariants("New York University");
    expect(variants).toEqual(["New York University"]);
  });

  test("always includes the original", () => {
    expect(nameVariants("ETH Zurich")).toContain("ETH Zurich");
  });
});

describe("sameCountry", () => {
  test.each([
    ["Turkey", "Türkiye", true],
    ["United States", "USA", true],
    ["United Kingdom", "Great Britain", true],
    ["Hong Kong SAR", "Hong Kong", true],
    ["South Korea", "Republic of Korea", true],
    ["Netherlands", "The Netherlands", true],
    ["Turkey", "Greece", false],
    ["Australia", "Austria", false],
  ])("%s vs %s -> %s", (a, b, expected) => {
    expect(sameCountry(a, b)).toBe(expected);
  });
});

describe("countryFromIso2", () => {
  test("resolves every assigned code, not just a hand-picked list", () => {
    expect(countryFromIso2("GB")).toBe("United Kingdom");
    expect(countryFromIso2("US")).toBe("United States");
    // Previously absent from a hand-maintained table, which made an incomplete lookup look
    // like a country mismatch. Regression guard for that specific failure.
    expect(countryFromIso2("KZ")).toBe("Kazakhstan");
    expect(countryFromIso2("VN")).toBe("Vietnam");
    expect(countryFromIso2("NG")).toBe("Nigeria");
  });

  test("resolved names still compare equal to the forms we store", () => {
    expect(sameCountry("Turkey", countryFromIso2("TR")!)).toBe(true);
    expect(sameCountry("Hong Kong SAR", countryFromIso2("HK")!)).toBe(true);
    expect(sameCountry("South Korea", countryFromIso2("KR")!)).toBe(true);
    expect(sameCountry("Mainland China", countryFromIso2("CN")!)).toBe(true);
  });

  test("returns null for an unassigned, malformed or missing code rather than inventing one", () => {
    // CLDR names these, so they are not filtered by fallback:"none" alone.
    expect(countryFromIso2("ZZ")).toBeNull();
    expect(countryFromIso2("XA")).toBeNull();
    expect(countryFromIso2("QQ")).toBeNull();
    expect(countryFromIso2("XYZ")).toBeNull();
    expect(countryFromIso2("")).toBeNull();
    expect(countryFromIso2(null)).toBeNull();
  });
});

describe("institutionTypeFromRor", () => {
  test("ignores the funder tag that most universities also carry", () => {
    expect(institutionTypeFromRor(["education", "funder"])).toBe("education");
    expect(institutionTypeFromRor(["funder", "education"])).toBe("education");
  });

  test("returns null when the registry says nothing useful", () => {
    expect(institutionTypeFromRor(["funder"])).toBeNull();
    expect(institutionTypeFromRor(["other"])).toBeNull();
    expect(institutionTypeFromRor([])).toBeNull();
  });
});

describe("parseMoneyAmount", () => {
  test("reads thousands separators in both conventions", () => {
    expect(parseMoneyAmount("CHF 1,460")).toBe(1460);
    expect(parseMoneyAmount("€ 12.345,67")).toBe(12345.67);
    expect(parseMoneyAmount("$45,000.50")).toBe(45000.5);
  });

  test("refuses a range rather than silently picking an end", () => {
    // Publishing one end of a stated range asserts something the source did not say.
    expect(parseMoneyAmount("12,000–15,000")).toBeNull();
    expect(parseMoneyAmount("12000-15000")).toBeNull();
    expect(parseMoneyAmount("9,000 to 11,000")).toBeNull();
  });

  test("a hyphen that is not a range does not disqualify the figure", () => {
    expect(parseMoneyAmount("non-EU fee: 15,000")).toBe(15000);
  });

  test("returns null for unreadable or non-positive input", () => {
    expect(parseMoneyAmount("")).toBeNull();
    expect(parseMoneyAmount("free")).toBeNull();
    expect(parseMoneyAmount("0")).toBeNull();
  });
});

describe("isCurrencyCode", () => {
  test("accepts the ISO codes the pilot regions use", () => {
    for (const code of ["USD", "EUR", "GBP", "CHF", "TRY", "SGD", "HKD", "ZAR", "INR", "AED"]) {
      expect(isCurrencyCode(code)).toBe(true);
    }
  });

  test("rejects a symbol or an unknown code", () => {
    expect(isCurrencyCode("$")).toBe(false);
    expect(isCurrencyCode("XYZ")).toBe(false);
  });
});

describe("normalizeDegreeLevel", () => {
  test.each([
    ["BSc Computer Science", "bachelor"],
    ["Bachelor of Arts", "bachelor"],
    ["MSc Economics", "master"],
    ["PhD in Physics", "doctorate"],
    ["Integrated Masters", "integrated_masters"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizeDegreeLevel(input)).toBe(expected);
  });

  test("returns null rather than forcing an unknown level into a bucket", () => {
    expect(normalizeDegreeLevel("Foundation Year Programme")).toBeNull();
    expect(normalizeDegreeLevel("")).toBeNull();
  });
});
