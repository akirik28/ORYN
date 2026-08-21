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

  // Every name below is a real string from the live universities spine or from
  // data/research/university-programs, not an invented example. Before this fix each of these
  // letters was DELETED by the [^a-z0-9] sweep (NFD leaves them intact because they are base
  // letters, not letter+combining-mark), producing a key that could never match the same
  // institution's ASCII spelling.
  describe("letters NFD cannot decompose are romanised, not deleted", () => {
    test("Turkish dotless ı — the live defect: 5 programme records failed identity resolution on this", () => {
      // Spine row is "Yildiz Technical University"; the research corpus spells it "Yıldız".
      // Old key was "y ld z technical university" — both ı characters dropped to spaces.
      expect(nameKey("Yıldız Technical University")).toBe("yildiz technical university");
      expect(nameKey("Yıldız Technical University")).toBe(nameKey("Yildiz Technical University"));
      // Spine row, previously keyed "sabanc university".
      expect(nameKey("Sabancı University")).toBe("sabanci university");
    });

    test("dotted İ and dotless ı both land on i, and case folding stays locale-independent", () => {
      // İ decomposes under NFD (I + combining dot above) so it already worked; ı did not.
      // Asserting them together pins the invariant that Turkish's two distinct i letters are
      // unified for MATCHING purposes even though they are different letters in the language.
      expect(nameKey("İstanbul Üniversitesi")).toBe("istanbul universitesi");
      expect(nameKey("İSTANBUL ÜNİVERSİTESİ")).toBe("istanbul universitesi");
      // The guard that matters if anyone ever swaps in toLocaleLowerCase(): under a Turkish
      // locale that would fold ASCII "I" to "ı", keying this name differently per machine.
      expect(nameKey("ISTANBUL TECHNICAL UNIVERSITY")).toBe("istanbul technical university");
      expect(nameKey("Istanbul Technical University")).toBe(nameKey("İstanbul Technical University"));
    });

    test("Nordic ø and Polish ł", () => {
      // Spine row, previously keyed "university of troms".
      expect(nameKey("University of Tromsø The Arctic University of Norway")).toBe(
        "university of tromso the arctic university of norway"
      );
      // Spine row, previously keyed "... wroc aw tech".
      expect(nameKey("Wroclaw University of Science and Technology (Wrocław Tech)")).toBe(
        "wroclaw university of science and technology wroclaw tech"
      );
    });

    test("ß romanises to ss, its only ASCII form", () => {
      expect(nameKey("Weißensee Kunsthochschule Berlin")).toBe(nameKey("Weissensee Kunsthochschule Berlin"));
      expect(nameKey("Große Universität")).toBe("grosse universitat");
    });
  });

  test("does NOT collapse ae/oe/ue onto bare vowels — that mangles unrelated names", () => {
    // A blanket digraph fold was measured against the live spine and rewrote 43 institution
    // names, these among them. The umlaut equivalence is handled in nameVariants instead.
    expect(nameKey("Czech Technical University in Prague")).toBe("czech technical university in prague");
    expect(nameKey("Queen Mary University of London")).toBe("queen mary university of london");
    expect(nameKey("Purdue University")).toBe("purdue university");
    expect(nameKey("Technion - Israel Institute of Technology")).toBe("technion israel institute of technology");
    expect(nameKey("Goethe-University Frankfurt am Main")).toBe("goethe university frankfurt am main");
  });

  test("Turkish ASCII convention drops the diaeresis rather than expanding it", () => {
    // Turkish romanises Ö as "O", never "Oe" — the opposite of German. This is why the umlaut
    // expansion cannot live in nameKey: expanding here would break every Turkish name.
    expect(nameKey("Özyeğin University")).toBe("ozyegin university");
    expect(nameKey("Boğaziçi University")).toBe(nameKey("Bogazici University"));
    expect(nameKey("Koç University")).toBe("koc university");
    expect(nameKey("Ankara Üniversitesi")).toBe("ankara universitesi");
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

  describe("German/Nordic umlaut ↔ digraph spellings", () => {
    // The worked example from the live spine: the universities row is filed under the
    // "Universitaet" spelling while all 228 of its programme records in
    // data/research/university-programs spell it "Universität". Before this, the two only
    // met because somebody had hand-written an entity_aliases row.
    test("expands umlauts to the digraph spelling the spine actually uses", () => {
      expect(nameVariants("Albert-Ludwigs-Universität Freiburg").map(nameKey)).toContain(
        nameKey("Albert-Ludwigs-Universitaet Freiburg")
      );
      expect(nameVariants("Freie Universität Berlin").map(nameKey)).toContain(nameKey("Freie Universitaet Berlin"));
    });

    test("contracts the digraph too, so the match works from either spelling", () => {
      expect(nameVariants("Freie Universitaet Berlin").map(nameKey)).toContain(nameKey("Freie Universität Berlin"));
      expect(nameVariants("University Duesseldorf").map(nameKey)).toContain(nameKey("University Düsseldorf"));
    });

    test("covers Nordic ø, whose ASCII form is written both ways", () => {
      expect(nameVariants("Universitetet i Tromsø").map(nameKey)).toContain(nameKey("Universitetet i Tromsoe"));
      expect(nameKey("Universitetet i Tromsø")).toBe(nameKey("Universitetet i Tromso"));
    });

    test("is a no-op for names with none of those letters — no gratuitous extra candidates", () => {
      expect(nameVariants("New York University")).toEqual(["New York University"]);
      expect(nameVariants("Istanbul Technical University")).toEqual(["Istanbul Technical University"]);
    });

    test("composes with the other variant shapes rather than only seeing the raw name", () => {
      // Acronym prefix stripped AND transliterated.
      expect(nameVariants("KIT, Universität Karlsruhe").map(nameKey)).toContain(nameKey("Universitaet Karlsruhe"));
    });
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
