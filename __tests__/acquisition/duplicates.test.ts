import { describe, expect, test } from "vitest";
import { citiesCompatible, classifyDuplicateCandidate, isPureEncodingVariant, type CanonicalEntityLike } from "@/lib/acquisition/duplicates";

function entity(overrides: Partial<CanonicalEntityLike> = {}): CanonicalEntityLike {
  return { id: "a", canonicalName: "Example University", countryCode: null, city: null, ...overrides };
}

describe("citiesCompatible", () => {
  test("treats missing city on either side as no evidence, not a conflict", () => {
    expect(citiesCompatible(null, "Boston")).toBe(true);
    expect(citiesCompatible("Boston", null)).toBe(true);
    expect(citiesCompatible(null, null)).toBe(true);
  });

  test("accepts the exact drift this registry has actually produced", () => {
    expect(citiesCompatible("Boston", "Boston, MA")).toBe(true);
    expect(citiesCompatible("Newcastle", "Newcastle CBD")).toBe(false); // "CBD" is not a comma-segment match — real limitation, see below
    expect(citiesCompatible("Pasadena", "Pasadena, CA")).toBe(true);
  });

  test("rejects cities that are genuinely different places", () => {
    expect(citiesCompatible("Hong Kong", "Kowloon")).toBe(false);
    expect(citiesCompatible("New York, NY", "New York City")).toBe(false);
  });

  test("is punctuation-sensitive, not just whitespace-sensitive (documented limitation)", () => {
    // "St Andrews" vs "St. Andrews" is the same place — this returns false because the
    // function only splits on commas, not periods. Locked in as a known limitation rather
    // than silently changed: classifyDuplicateCandidate never treats an incompatible city
    // as proof of non-duplicate on its own, so this costs a "cities consistent" evidence
    // line, not a wrong classification.
    expect(citiesCompatible("St Andrews", "St. Andrews")).toBe(false);
  });

  test("is diacritic-insensitive — real pairs found live in a Phase 2 audit", () => {
    expect(citiesCompatible("Tübingen", "Tubingen")).toBe(true);
    expect(citiesCompatible("São Paulo", "Sao Paulo")).toBe(true);
  });
});

describe("isPureEncodingVariant", () => {
  test("true for the same name differing only by a non-breaking space", () => {
    // Real pair found live: a normal space vs U+00A0 (non-breaking space) between words.
    // Built with explicit escapes rather than literal characters in source — the two are
    // visually indistinguishable in an editor, exactly the hazard a raw literal would risk.
    const withRegularSpace = 'Padova' + ' ' + 'University';
    const withNbsp = 'Padova' + '\u00A0' + 'University';
    expect(isPureEncodingVariant(withRegularSpace, withNbsp)).toBe(true);
  });

  test("true for the same name differing only by Unicode composition form (NFC vs NFD)", () => {
    const nfc = 'Universit\u00E0 di Padova'; // precomposed 'à' (U+00E0)
    const nfd = 'Universit' + 'a\u0300' + ' di Padova'; // 'a' (U+0061) + combining grave accent (U+0300)
    expect(isPureEncodingVariant(nfc, nfd)).toBe(true);
  });

  test("true for the same name with vs without a diacritic (a common transliteration gap)", () => {
    expect(isPureEncodingVariant("Universite libre de Bruxelles", "Université libre de Bruxelles")).toBe(true);
  });

  test("false when a real WORD differs — this must never widen into fuzzy name-similarity matching", () => {
    // The exact distinction that keeps this narrower than nameKey()/nameVariants(): those
    // deliberately treat "The X" and "X (ABBR)" as related for *search*; merge evidence
    // needs a stricter bar than search does.
    expect(isPureEncodingVariant("University of Warwick", "The University of Warwick")).toBe(false);
    expect(isPureEncodingVariant("Massachusetts Institute of Technology", "Massachusetts Institute of Technology (MIT)")).toBe(false);
    expect(isPureEncodingVariant("UCL", "University College London")).toBe(false);
  });
});

describe("classifyDuplicateCandidate", () => {
  test("identical ROR id on both sides is SAFE_TO_CANONICALIZE, regardless of name form", () => {
    const a = entity({ id: "a", canonicalName: "Massachusetts Institute of Technology", city: "Cambridge" });
    const b = entity({ id: "b", canonicalName: "Massachusetts Institute of Technology (MIT)", city: "Cambridge" });
    const result = classifyDuplicateCandidate(a, b, [{ id_system: "ROR", external_id: "042nb2s44" }], [{ id_system: "ROR", external_id: "042nb2s44" }], { nameVariantOnly: true });
    expect(result.classification).toBe("SAFE_TO_CANONICALIZE");
    expect(result.evidence.join(" ")).toContain("042nb2s44");
  });

  test("conflicting ROR ids is NOT_DUPLICATE even though the names collide", () => {
    // The real failure mode this guards: two genuinely different institutions that happen
    // to share a common name (e.g. two different "Saint Joseph University"s).
    const a = entity({ id: "a", canonicalName: "Saint Joseph University", city: "Beirut" });
    const b = entity({ id: "b", canonicalName: "Saint Joseph University", city: "Philadelphia" });
    const result = classifyDuplicateCandidate(a, b, [{ id_system: "ROR", external_id: "111" }], [{ id_system: "ROR", external_id: "222" }], { nameVariantOnly: false });
    expect(result.classification).toBe("NOT_DUPLICATE");
  });

  test("conflicting country_code is NOT_DUPLICATE before external ids are even consulted", () => {
    const a = entity({ id: "a", countryCode: "US" });
    const b = entity({ id: "b", countryCode: "GB" });
    const result = classifyDuplicateCandidate(a, b, [{ id_system: "ROR", external_id: "same" }], [{ id_system: "ROR", external_id: "same" }], { nameVariantOnly: false });
    expect(result.classification).toBe("NOT_DUPLICATE");
  });

  test("a pure Unicode-encoding-variant name pair, with no external ids, stays LIKELY_DUPLICATE_REQUIRES_REVIEW — never auto-SAFE on name/city evidence alone", () => {
    // Deliberate restraint, not an oversight: this module's ONE bar for SAFE_TO_CANONICALIZE
    // is external verification (an agreeing ROR id). A name pair being *provably* the same
    // string (not just similar) is strong diagnostic signal — surfaced in the evidence text
    // — but still must not be what authorizes a merge on its own, for the same reason
    // migration 0039's 43 identical-normalized_name pairs were queued for human review
    // instead of auto-merged even though the architects were themselves confident.
    const a = entity({ id: "a", canonicalName: "Universitat Hamburg", city: "Hamburg" });
    const b = entity({ id: "b", canonicalName: "Universität Hamburg", city: "Hamburg" }); // "Universität" with the diacritic
    const result = classifyDuplicateCandidate(a, b, [], [], { nameVariantOnly: true });
    expect(result.classification).toBe("LIKELY_DUPLICATE_REQUIRES_REVIEW");
    expect(result.evidence.join(" ")).toContain("Pure Unicode-encoding-variant");
  });

  test("agreement on a non-ROR system alone is LIKELY_DUPLICATE_REQUIRES_REVIEW, not SAFE", () => {
    const a = entity({ id: "a" });
    const b = entity({ id: "b" });
    const result = classifyDuplicateCandidate(a, b, [{ id_system: "WIKIDATA", external_id: "Q1" }], [{ id_system: "WIKIDATA", external_id: "Q1" }], { nameVariantOnly: false });
    expect(result.classification).toBe("LIKELY_DUPLICATE_REQUIRES_REVIEW");
  });

  test("exact normalized_name collision with zero external-id evidence on either side is AMBIGUOUS, never auto-actionable", () => {
    const a = entity({ id: "a", city: "St. Louis" });
    const b = entity({ id: "b", city: "St. Louis, MO" });
    const result = classifyDuplicateCandidate(a, b, [], [], { nameVariantOnly: false });
    expect(result.classification).toBe("AMBIGUOUS");
  });

  test("name-variant-only collision (nameVariantOnly=true) with no external ids is LIKELY_DUPLICATE_REQUIRES_REVIEW, not SAFE", () => {
    // This is the exact bar this classifier refuses to cross unattended: a name-pattern
    // match ("The X" / "X (ABBR)") is real signal but not "overwhelming" on its own.
    const a = entity({ id: "a", canonicalName: "University of Warwick", city: "Coventry" });
    const b = entity({ id: "b", canonicalName: "The University of Warwick", city: "England" });
    const result = classifyDuplicateCandidate(a, b, [], [], { nameVariantOnly: true });
    expect(result.classification).toBe("LIKELY_DUPLICATE_REQUIRES_REVIEW");
  });
});
