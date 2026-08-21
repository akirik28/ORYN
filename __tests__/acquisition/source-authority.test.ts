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
    // Regression: source-authority gap, third-lane finding relayed 2026-08-21. .go.jp is a
    // registrar-restricted namespace (JPRS: government bodies and government-affiliated
    // corporations only, verified live before adding), the same trust basis as .gov/.gov.tr
    // above — not a suffix any content farm could register into, unlike .org/.nl/.de.
    ["https://www.jst.go.jp/report", true],
    // Regression guard for the exact bug almost shipped here: an early draft matched via
    // `.includes(".go.jp")`, which this domain would have falsely passed (the substring
    // appears mid-string) despite actually belonging to a different, unrelated domain
    // entirely. Fixed to `endsWith` only, mirroring `.edu` above rather than the mid-string
    // `.gov.`/`.ac.` checks (which need `.includes()` specifically because a ccTLD label
    // follows them, e.g. `boun.edu.tr` — `.jp` has no such trailing label).
    ["https://evil.go.jp.attacker.example/x", false],
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

  // Regression: source-authority looksOfficial() gap, RESOLVED coordination session DECISION 1
  // 2026-08-21 (docs/research/university-requirements/source-authority-gap.md). 7 of 8 real
  // application systems the requirements lane actually fetched failed looksOfficial() outright.
  describe("application systems (RESOLVED decision — HIGH for policy only)", () => {
    test.each(["https://www.ucas.com/deadlines", "https://cao.ie/index.php", "https://www.studielink.nl/", "https://www.hochschulstart.de/", "https://www.uni-assist.de/", "https://www.commonapp.org/", "https://www.parcoursup.fr/"])(
      "%s is HIGH/official_application_system for policy",
      (url) => {
        expect(sourceAuthority("policy", url)).toEqual({ tier: "HIGH", sourceType: "official_application_system" });
      }
    );

    test("an application system is refused outright for every other fact class — it is not authoritative about an institution's own facts", () => {
      for (const factClass of ["identity", "population", "cost", "programs", "research_strength", "opportunities"] as const) {
        expect(sourceAuthority(factClass, "https://www.ucas.com/deadlines")).toBeNull();
      }
    });

    // ÖSYM already passes via looksOfficial()'s .gov.tr suffix match — that's a strictly
    // broader grant (HIGH for every fact class) than the policy-only tier above, so it must
    // not have been (redundantly) added to APPLICATION_SYSTEM_DOMAINS.
    test("ÖSYM continues to resolve via looksOfficial(), unaffected by this change", () => {
      expect(sourceAuthority("policy", "https://www.osym.gov.tr/")).toEqual({ tier: "HIGH", sourceType: "official_primary" });
      expect(sourceAuthority("identity", "https://www.osym.gov.tr/")).toEqual({ tier: "HIGH", sourceType: "official_primary" });
    });

    // The concrete case the decision itself was vindicated by: a university's own restatement
    // of a UCAS-wide date can be stale, so the operator's own domain must independently clear
    // the gate rather than depend on the institution's page carrying the correct number.
    test("UCAS's own deadlines page is an acceptable policy source independent of any specific university", () => {
      const authority = sourceAuthority("policy", "https://www.ucas.com/undergraduate/applying-university/entry-requirements/ucas-deadlines-2027-entry");
      expect(authority?.tier).toBe("HIGH");
    });
  });

  // Flagged in the code as this session's own extension-by-analogy of the application-system
  // decision above, not itself independently research-verified the same way — tested to the
  // same standard regardless, since the code ships either way.
  describe("test operators (extension by analogy — HIGH for policy only)", () => {
    test.each(["https://www.ets.org/toefl.html", "https://www.cambridgeenglish.org/exams/", "https://www.collegeboard.org/"])("%s is HIGH/official_test_operator for policy", (url) => {
      expect(sourceAuthority("policy", url)).toEqual({ tier: "HIGH", sourceType: "official_test_operator" });
    });

    test("a department-style subdomain of a test operator's own domain still matches, same suffix-aware rule as every other curated list", () => {
      expect(sourceAuthority("policy", "https://apstudents.collegeboard.org/ap-scores")).toEqual({ tier: "HIGH", sourceType: "official_test_operator" });
      expect(sourceAuthority("policy", "https://international.collegeboard.org/toolkit")).toEqual({ tier: "HIGH", sourceType: "official_test_operator" });
    });

    test("a test operator is refused outright for every other fact class", () => {
      for (const factClass of ["identity", "population", "cost", "programs", "research_strength", "opportunities"] as const) {
        expect(sourceAuthority(factClass, "https://www.ets.org/toefl.html")).toBeNull();
      }
    });
  });

  test("an unrelated domain that merely shares a suffix-unsafe substring with a curated system domain still fails", () => {
    // notucas.com must not match ucas.com the same way notethz.ch must not match ethz.ch above.
    expect(sourceAuthority("policy", "https://notucas.com/deadlines")).toBeNull();
  });
});
