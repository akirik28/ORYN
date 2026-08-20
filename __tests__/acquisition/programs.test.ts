import { describe, expect, test } from "vitest";
import { degreeTokenOf, extractPrograms, looksPostgraduate, subjectCategoryOf, type CatalogueRule } from "@/lib/acquisition/programs";

const UNI_ID = "uni-test";
const OFFICIAL_WEBSITE = "https://www.example.ac.uk";
const PAGE_URL = "https://study.example.ac.uk/programmes/undergraduate-a-z";

function anchor(href: string, text: string): string {
  return `<a href="${href}">${text}</a>`;
}

const UNDERGRAD_RULE: CatalogueRule = {
  hrefPattern: "/programmes/undergraduate/[0-9]+-[a-z0-9-]+",
  sectionIsUndergraduate: true,
};

function extract(html: string, rule: CatalogueRule = UNDERGRAD_RULE) {
  return extractPrograms(html, { pageUrl: PAGE_URL, officialWebsite: OFFICIAL_WEBSITE, universityId: UNI_ID, rule });
}

describe("looksPostgraduate / degreeTokenOf — UK integrated master's family", () => {
  test("MChem, MPhys, MMath, MSci etc. read as postgraduate when standing alone", () => {
    expect(looksPostgraduate("Chemistry MChem")).toBe(true);
    expect(looksPostgraduate("Physics MPhys")).toBe(true);
    expect(looksPostgraduate("Applied Mathematics MMath (Hons)")).toBe(true);
    expect(looksPostgraduate("Chemistry with Work Placement [MSci]")).toBe(true);
    expect(looksPostgraduate("Earth Sciences MEarthSci")).toBe(true);
    expect(looksPostgraduate("Biological Sciences MBiol")).toBe(true);
  });

  test("MBBS and MBChB are recognised as bachelor's-level despite the M prefix (UK/Commonwealth medicine convention)", () => {
    expect(degreeTokenOf("Medicine [MBChB]")).toBe("MBChB");
    expect(degreeTokenOf("Medicine MBBS")).toBe("MBBS");
    expect(looksPostgraduate("Medicine [MBChB]")).toBe(false);
  });

  test("CertHE is a sub-degree access qualification, not a bachelor's degree", () => {
    expect(looksPostgraduate("Medical Studies, Gateway to [CertHE]")).toBe(true);
  });
});

describe("extractPrograms — integrated master's mislabelling (found live: Edinburgh undergraduate A-Z)", () => {
  test("does not mislabel a standalone integrated master's entry as bachelor's purely from catalogue-section context", () => {
    // Real case: Edinburgh's A-Z lists "Chemistry MChem" as a separate catalogue entry from
    // "Chemistry BSc (Hons)" — a distinct 4-year integrated master's, not a bachelor's. Before
    // this fix, MChem/MPhys/MMath/etc. were recognised as neither bachelor's nor non-bachelor's,
    // so they fell through to the catalogue-section rule and were mislabelled "bachelor" purely
    // from page context — the same failure mode as the "Diploma" bug this file already guards.
    const html = [
      anchor("/programmes/undergraduate/21-chemistry", "Chemistry BSc (Hons)"),
      anchor("/programmes/undergraduate/23-chemistry-mchem", "Chemistry MChem"),
    ].join("\n");
    const result = extract(html);
    expect(result.map((p) => p.officialName)).toEqual(["Chemistry BSc (Hons)"]);
  });

  test("MBChB is still recorded as bachelor's-level via its explicit token", () => {
    const html = anchor("/programmes/undergraduate/354-mbchb-medicine", "MBChB Medicine (6-year programme) MBChB");
    const result = extract(html);
    expect(result).toHaveLength(1);
    expect(result[0].degreeToken).toBe("MBChB");
    expect(result[0].degreeLevel).toBe("bachelor");
  });
});

describe("extractPrograms — combined-award token priority (found live: Glasgow undergraduate A-Z)", () => {
  test("a positive bachelor's token wins over a co-occurring integrated-master's token in the same combined-award listing", () => {
    // Real case: Glasgow names most science programmes as combined-award entries, e.g.
    // "Chemistry [BSc/MSci]" — one entry offering both a 3-year BSc and a 4-year integrated
    // master's exit. Checking looksPostgraduate() before the positive BSc match would reject the
    // entire entry over the bracketed "MSci", which is backwards: the explicit BSc is direct
    // evidence of what the programme actually awards.
    const html = anchor("/undergraduate/degrees/chemistry/", "Chemistry [BSc/MSci]");
    const result = extract(html, { hrefPattern: "/undergraduate/degrees/[a-z0-9-]{3,}/", sectionIsUndergraduate: true });
    expect(result).toHaveLength(1);
    expect(result[0].degreeToken).toBe("BSc");
    expect(result[0].degreeLevel).toBe("bachelor");
  });

  test("an MSci-only entry with no accompanying bachelor's token is still excluded", () => {
    const html = anchor("/undergraduate/degrees/chemistry-work-placement/", "Chemistry with Work Placement [MSci]");
    const result = extract(html, { hrefPattern: "/undergraduate/degrees/[a-z0-9-]{3,}/", sectionIsUndergraduate: true });
    expect(result).toHaveLength(0);
  });

  test("a bare integrated master's token embedded between slashes ('/MA/') no longer vetoes an entry that also carries an explicit bachelor's token", () => {
    // Real case: Glasgow's "Archaeology [BSc/MA/MA(SocSci)]" — the bare "/MA/" segment matches
    // the NON_BACHELOR_TOKENS "MA " pattern (bounded by the surrounding slashes) exactly as
    // intended for a plain postgraduate MA, but this listing also explicitly offers a BSc.
    const html = anchor("/undergraduate/degrees/archaeology/", "Archaeology [BSc/MA/MA(SocSci)]");
    const result = extract(html, { hrefPattern: "/undergraduate/degrees/[a-z0-9-]{3,}/", sectionIsUndergraduate: true });
    expect(result).toHaveLength(1);
    expect(result[0].degreeToken).toBe("BSc");
  });

  test("a standalone Scottish MA (no bachelor's token anywhere) is still excluded rather than guessed at", () => {
    // Deliberate conservative behaviour, not a bug: Scottish ancient universities' ordinary
    // undergraduate Arts degree is itself called "MA", but plain "MA" is a genuine postgraduate
    // degree almost everywhere else, so extractPrograms() declines to claim a level rather than
    // assume the Scottish convention applies. Real case: Edinburgh's own A-Z lists "Economics MA
    // (Hons)" and "International Relations MA (Hons)" this way — both correctly excluded here,
    // and (already independently verified, human-researched, and live in university_programs)
    // both already exist as separate accepted rows for Edinburgh from an earlier research batch.
    const html = anchor("/programmes/undergraduate/122-economics", "Economics MA (Hons)");
    const result = extract(html);
    expect(result).toHaveLength(0);
  });
});

describe("extractPrograms — hub/CTA pages matching an otherwise-clean A-Z hrefPattern (found live: Waterloo future-students/programs)", () => {
  test("a hub page's own href can be excluded via a negative lookahead without losing real programmes that share its prefix", () => {
    // Real case: Waterloo's "/future-students/programs/business" is a category hub ("Business
    // programs"), not a named degree — but "/future-students/programs/business-administration-
    // computer-science-double-degree" (a real double-degree programme) shares that exact prefix,
    // so a plain excludePatterns substring match would have dropped both.
    const html = [
      anchor("/future-students/programs/business", "Business programs"),
      anchor("/future-students/programs/business", "Discover Waterloo's business programs →"),
      anchor("/future-students/programs/business-administration-computer-science-double-degree", "Business Administration (Laurier) and Computer Science (Waterloo) Double Degree"),
    ].join("\n");
    const rule: CatalogueRule = { hrefPattern: "/future-students/programs/(?!business$)[a-z0-9-]{4,}", sectionIsUndergraduate: true };
    const result = extract(html, rule);
    expect(result.map((p) => p.officialName)).toEqual(["Business Administration (Laurier) and Computer Science (Waterloo) Double Degree"]);
  });
});

describe("subjectCategoryOf — unaffected by the token-priority fix", () => {
  test("still classifies a combined-award chemistry programme as chemistry", () => {
    expect(subjectCategoryOf("Chemistry [BSc/MSci]")).toBe("chemistry");
  });
});

describe("extractPrograms — entity-encoded query-string hrefs (found live: Universiti Sains Malaysia undergraduate index)", () => {
  test("an &amp;-joined query string decodes to a real, correctly-keyed URL rather than a mangled one", () => {
    // Real case: USM's programme links are Joomla article URLs like
    // "?view=article&id=716&catid=76", rendered in the raw HTML as "&amp;" like any other
    // entity. Before decoding the href first, the literal characters "&amp;" (which contain a
    // real "&") would split the query string in the wrong place when handed to `new URL()`,
    // silently storing the id under the mangled key "amp;id" instead of "id".
    const html = anchor("/index.php/undergraduate/undergraduate-international?view=article&amp;id=716&amp;catid=76", "Bachelor in Computer Science with Honours");
    const rule: CatalogueRule = {
      hrefPattern: "undergraduate-international\\?view=article&id=[0-9]+&catid=[0-9]+",
      disableDefaultExcludes: ["/index"],
      sectionIsUndergraduate: true,
    };
    const result = extract(html, rule);
    expect(result).toHaveLength(1);
    expect(result[0].officialUrl).toBe("https://study.example.ac.uk/index.php/undergraduate/undergraduate-international?view=article&id=716&catid=76");
  });
});

describe("extractPrograms — disableDefaultExcludes (found live: Universiti Sains Malaysia undergraduate index)", () => {
  test("DEFAULT_EXCLUDES' '/index' substring match rejects every URL on a Joomla-run site (front controller is /index.php) unless opted out", () => {
    const html = anchor("/index.php/undergraduate/undergraduate-international?view=article&amp;id=716&amp;catid=76", "Bachelor in Computer Science with Honours");
    const withoutOverride: CatalogueRule = {
      hrefPattern: "undergraduate-international\\?view=article&id=[0-9]+&catid=[0-9]+",
      sectionIsUndergraduate: true,
    };
    expect(extract(html, withoutOverride)).toHaveLength(0);

    const withOverride: CatalogueRule = { ...withoutOverride, disableDefaultExcludes: ["/index"] };
    expect(extract(html, withOverride)).toHaveLength(1);
  });

  test("other DEFAULT_EXCLUDES entries still apply when only '/index' is disabled", () => {
    const html = anchor("/index.php/undergraduate/apply-now", "Apply now");
    const rule: CatalogueRule = {
      hrefPattern: "/index\\.php/undergraduate/[a-z-]+",
      disableDefaultExcludes: ["/index"],
      sectionIsUndergraduate: true,
    };
    expect(extract(html, rule)).toHaveLength(0);
  });
});
