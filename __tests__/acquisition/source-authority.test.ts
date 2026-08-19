import { describe, expect, test } from "vitest";
import { domainOf, looksOfficial, sourceAuthority } from "@/lib/acquisition/source-authority";

describe("domainOf", () => {
  test("strips www and lowercases", () => {
    expect(domainOf("https://WWW.Ed.AC.uk/study")).toBe("ed.ac.uk");
  });

  test("returns empty string for unparseable input rather than throwing", () => {
    expect(domainOf("not a url")).toBe("");
  });
});

describe("looksOfficial", () => {
  test.each([
    ["https://www.umich.edu", true],
    ["https://www.ed.ac.uk", true],
    ["https://boun.edu.tr", true],
    ["https://www.data.gov", true],
    ["https://studielink.nl", false],
    ["https://ethz.ch", false],
  ])("%s -> %s", (url, expected) => {
    expect(looksOfficial(domainOf(url))).toBe(expected);
  });
});

describe("sourceAuthority", () => {
  test("an institution's own academic domain is HIGH for every fact class", () => {
    for (const factClass of ["identity", "population", "cost", "policy", "programs"] as const) {
      expect(sourceAuthority(factClass, "https://www.ed.ac.uk/fees")).toEqual({ tier: "HIGH", sourceType: "official_primary" });
    }
  });

  test("ROR is HIGH for identity but refused outright for cost, policy and programmes", () => {
    expect(sourceAuthority("identity", "https://ror.org/01nrxwf90")).toEqual({ tier: "HIGH", sourceType: "open_registry" });
    expect(sourceAuthority("research_strength", "https://openalex.org/I27837315")).toEqual({ tier: "HIGH", sourceType: "open_registry" });
    // The whole point of per-fact-class authority: a registry that is authoritative about
    // identity must not be usable as a tuition or admissions-policy source at any confidence.
    expect(sourceAuthority("cost", "https://ror.org/01nrxwf90")).toBeNull();
    expect(sourceAuthority("policy", "https://ror.org/01nrxwf90")).toBeNull();
    expect(sourceAuthority("programs", "https://openalex.org/I27837315")).toBeNull();
  });

  test("structured third parties are MEDIUM for population only", () => {
    expect(sourceAuthority("population", "https://www.nacubo.org/report")).toEqual({ tier: "MEDIUM", sourceType: "third_party_structured" });
    expect(sourceAuthority("cost", "https://www.nacubo.org/report")).toBeNull();
    expect(sourceAuthority("policy", "https://www.timeshighereducation.com/x")).toBeNull();
  });

  test("Wikipedia and Wikidata are never a value source, only an index", () => {
    expect(sourceAuthority("identity", "https://en.wikipedia.org/wiki/ETH_Zurich")).toBeNull();
    expect(sourceAuthority("population", "https://www.wikidata.org/wiki/Q11942")).toBeNull();
  });

  test("Cialfo is excluded for every fact class — discovery only, never a factual source", () => {
    for (const factClass of ["identity", "population", "cost", "policy", "programs", "research_strength"] as const) {
      expect(sourceAuthority(factClass, "https://help.cialfo.co/en/articles/6599013")).toBeNull();
    }
  });

  test("content farms and directory aggregators are refused", () => {
    expect(sourceAuthority("population", "https://www.unipage.net/en/x")).toBeNull();
    expect(sourceAuthority("cost", "https://www.bachelorsportal.com/x")).toBeNull();
  });

  test("an unknown domain is refused rather than given a low tier", () => {
    expect(sourceAuthority("cost", "https://some-random-blog.example/fees")).toBeNull();
  });

  test("Wikimedia Commons is HIGH for image, but not for any other fact class", () => {
    expect(sourceAuthority("image", "https://commons.wikimedia.org/wiki/File:MIT_Dome.jpg")).toEqual({ tier: "HIGH", sourceType: "wikimedia_commons" });
    expect(sourceAuthority("image", "https://upload.wikimedia.org/wikipedia/commons/x/MIT_Dome.jpg")).toEqual({ tier: "HIGH", sourceType: "wikimedia_commons" });
    expect(sourceAuthority("identity", "https://commons.wikimedia.org/wiki/File:MIT_Dome.jpg")).toBeNull();
    expect(sourceAuthority("population", "https://commons.wikimedia.org/wiki/File:MIT_Dome.jpg")).toBeNull();
  });

  test("Wikidata itself is still never a source for image, index only, same as every other fact class", () => {
    expect(sourceAuthority("image", "https://www.wikidata.org/wiki/Q49108")).toBeNull();
  });

  test("an institution's own domain is HIGH for image too", () => {
    expect(sourceAuthority("image", "https://www.ed.ac.uk/about")).toEqual({ tier: "HIGH", sourceType: "official_primary" });
  });

  test("a caller-supplied official domain is accepted for institutions without an academic suffix", () => {
    // ETH sits on .ch, TUM on .de — real universities whose own domains carry no academic
    // suffix. They are only trusted when the caller established the domain from an
    // authoritative identity source, never by guessing.
    expect(sourceAuthority("cost", "https://ethz.ch/fees", new Set(["ethz.ch"]))).toEqual({ tier: "HIGH", sourceType: "official_primary" });
    expect(sourceAuthority("cost", "https://ethz.ch/fees")).toBeNull();
  });

  test("a caller-supplied official domain also covers its department/faculty subdomains", () => {
    // Program/course pages overwhelmingly live on a department subdomain, not the bare
    // domain — physics.ethz.ch, wiwi.hu-berlin.de. Matched the same suffix-aware way as
    // EXCLUDED/OPEN_REGISTRY/THIRD_PARTY_STRUCTURED, not an exact-only Set lookup.
    expect(sourceAuthority("programs", "https://phys.ethz.ch/bachelor", new Set(["ethz.ch"]))).toEqual({
      tier: "HIGH",
      sourceType: "official_primary",
    });
    // An unrelated domain that merely shares a suffix-unsafe substring must still fail.
    expect(sourceAuthority("programs", "https://notethz.ch/bachelor", new Set(["ethz.ch"]))).toBeNull();
  });

  test("an excluded domain stays excluded even if a caller claims it is official", () => {
    expect(sourceAuthority("identity", "https://en.wikipedia.org/wiki/X", new Set(["en.wikipedia.org"]))).toBeNull();
  });
});
