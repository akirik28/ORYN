import { describe, expect, it } from "vitest";
import {
  classifyProgramLinkage,
  classifyUrlLinkage,
  countProgramsWithIdentifyingUrl,
  isPathDescendant,
  normalizeProgramUrl,
  programDegreeLevelSignal,
  recordDegreeLevelSignal,
  type LinkageProgram,
} from "@/lib/requirements/program-linkage";

function program(over: Partial<LinkageProgram> & Pick<LinkageProgram, "id" | "name">): LinkageProgram {
  return { universityId: "u1", degreeLevel: "Bachelor / first-cycle", officialProgramUrl: `https://x.example/${over.id}`, ...over };
}

describe("recordDegreeLevelSignal", () => {
  it("reads international_undergraduate as UNDERGRADUATE, not graduate", () => {
    // Regression: substring matching read this real Glasgow scope as "graduate" (because
    // "undergraduate" contains "graduate") and reported two fabricated level conflicts.
    expect(recordDegreeLevelSignal({ scope: "international_undergraduate", programName: "Computing Science", sourceUrl: null })).toBe("undergraduate");
  });

  it("reads postgraduate as graduate", () => {
    expect(recordDegreeLevelSignal({ scope: "postgraduate_taught", programName: null, sourceUrl: null })).toBe("graduate");
  });

  it("reads Turkish yüksek lisans as graduate, not as lisans/undergraduate", () => {
    expect(recordDegreeLevelSignal({ scope: "yüksek lisans başvuruları", programName: null, sourceUrl: null })).toBe("graduate");
    expect(recordDegreeLevelSignal({ scope: "lisans programları", programName: null, sourceUrl: null })).toBe("undergraduate");
  });

  it("reads önlisans as a sub-degree, distinct from lisans", () => {
    expect(recordDegreeLevelSignal({ scope: null, programName: "Bitki Koruma (Önlisans)", sourceUrl: null })).toBe("sub_degree");
    expect(recordDegreeLevelSignal({ scope: null, programName: "Bitki Koruma (Lisans)", sourceUrl: null })).toBe("undergraduate");
  });

  it("treats an integrated master's as undergraduate entry", () => {
    expect(recordDegreeLevelSignal({ scope: "integrated master's", programName: null, sourceUrl: null })).toBe("undergraduate");
  });

  it("refuses to read MA, MEng, MSci as a level — they mean different things by market", () => {
    // MA is an UNDERGRADUATE degree at Glasgow/Edinburgh/St Andrews; MEng and MSci are
    // undergraduate-entry integrated Master's. Guessing here produces confident wrong answers.
    expect(recordDegreeLevelSignal({ scope: null, programName: "MA Economics", sourceUrl: null })).toBeNull();
    expect(recordDegreeLevelSignal({ scope: null, programName: "MEng Chemical Engineering", sourceUrl: null })).toBeNull();
    expect(recordDegreeLevelSignal({ scope: null, programName: "MSci Physics", sourceUrl: null })).toBeNull();
  });

  it("does not read a level out of an ordinary word that merely contains one", () => {
    expect(recordDegreeLevelSignal({ scope: null, programName: "Management", sourceUrl: null })).toBeNull();
    expect(recordDegreeLevelSignal({ scope: null, programName: "Mastering Data", sourceUrl: null })).toBeNull();
    expect(recordDegreeLevelSignal({ scope: null, programName: "Musicology/Sound Studies", sourceUrl: null })).toBeNull();
  });

  it("prefers the scope's statement over the programme name's", () => {
    expect(recordDegreeLevelSignal({ scope: "undergraduate", programName: "Master in Management", sourceUrl: null })).toBe("undergraduate");
  });

  it("returns null when the record states nothing", () => {
    expect(recordDegreeLevelSignal({ scope: null, programName: null, sourceUrl: null })).toBeNull();
    expect(recordDegreeLevelSignal({ scope: "  ", programName: "", sourceUrl: null })).toBeNull();
  });
});

describe("programDegreeLevelSignal", () => {
  it("classifies the live vocabulary", () => {
    expect(programDegreeLevelSignal("Bachelor / first-cycle")).toBe("undergraduate");
    expect(programDegreeLevelSignal("Master / second-cycle")).toBe("graduate");
    expect(programDegreeLevelSignal("Bachelor / first-cycle (Grado)")).toBe("undergraduate");
    expect(programDegreeLevelSignal("Single-cycle (laurea magistrale a ciclo unico)")).toBe("undergraduate");
    expect(programDegreeLevelSignal("Short-cycle (DEUST) - NOT a full first-cycle degree")).toBe("sub_degree");
  });

  it("keeps an integrated master's on the undergraduate side", () => {
    expect(programDegreeLevelSignal("Bachelor / first-cycle (integrated master's)")).toBe("undergraduate");
  });

  it("returns null rather than guessing on an empty or unrecognised value", () => {
    expect(programDegreeLevelSignal(null)).toBeNull();
    expect(programDegreeLevelSignal("")).toBeNull();
    expect(programDegreeLevelSignal("Certificate of attendance")).toBeNull();
  });
});

describe("normalizeProgramUrl", () => {
  it("keeps the query string, because for some sources it is the only programme identifier", () => {
    // Hamburg's 197 programmes share one path and differ ONLY in the query string.
    const a = normalizeProgramUrl("https://www.uni-hamburg.de/campuscenter/studienangebot/studiengang.html?1525352964");
    const b = normalizeProgramUrl("https://www.uni-hamburg.de/campuscenter/studienangebot/studiengang.html?1211460435");
    expect(a).not.toBe(b);
  });

  it("folds case, trailing slash and fragment", () => {
    expect(normalizeProgramUrl("HTTPS://Example.COM/a/b/#section")).toBe("https://example.com/a/b");
    expect(normalizeProgramUrl("https://example.com/a/b")).toBe("https://example.com/a/b");
  });

  it("returns empty for junk rather than something that could compare equal", () => {
    expect(normalizeProgramUrl(null)).toBe("");
    expect(normalizeProgramUrl("not a url")).toBe("");
  });
});

describe("isPathDescendant", () => {
  it("accepts a real extra path segment", () => {
    expect(isPathDescendant("https://e.com/prog/econ/admission", "https://e.com/prog/econ")).toBe(true);
  });

  it("rejects a shared prefix that is not a segment boundary", () => {
    expect(isPathDescendant("https://e.com/economics", "https://e.com/econ")).toBe(false);
  });

  it("rejects a site root as anybody's ancestor", () => {
    expect(isPathDescendant("https://e.com/anything", "https://e.com/")).toBe(false);
  });

  it("rejects a query-bearing URL as an ancestor", () => {
    // Otherwise one Hamburg programme page becomes the parent of every other.
    expect(isPathDescendant("https://e.com/s.html/x", "https://e.com/s.html?123")).toBe(false);
  });

  it("rejects a different host", () => {
    expect(isPathDescendant("https://other.com/a/b", "https://e.com/a")).toBe(false);
  });
});

describe("classifyUrlLinkage", () => {
  const shared = "https://uni.example/courses";
  const programs = [
    program({ id: "p1", name: "Alpha", officialProgramUrl: shared }),
    program({ id: "p2", name: "Beta", officialProgramUrl: shared }),
    program({ id: "p3", name: "Gamma", officialProgramUrl: "https://uni.example/prog/gamma", admissionsUrl: "https://uni.example/prog/gamma/apply" }),
  ];

  it("resolves a URL unique to one programme", () => {
    expect(classifyUrlLinkage("https://uni.example/prog/gamma", programs)).toEqual({ url: "program_url_unique", urlProgramId: "p3" });
  });

  it("refuses a URL shared by several programmes", () => {
    // Manchester's 294 programmes share one course-search page. Equality here means nothing.
    expect(classifyUrlLinkage(shared, programs)).toEqual({ url: "shared_url_ambiguous", urlProgramId: null });
  });

  it("resolves via a unique admissions_url", () => {
    expect(classifyUrlLinkage("https://uni.example/prog/gamma/apply", programs)).toEqual({ url: "admissions_url_unique", urlProgramId: "p3" });
  });

  it("offers a descendant as a candidate, never as a match", () => {
    const res = classifyUrlLinkage("https://uni.example/prog/gamma/entry-requirements", programs);
    expect(res).toEqual({ url: "descendant_candidate", urlProgramId: "p3" });
  });

  it("reports no relation for an unrelated page", () => {
    expect(classifyUrlLinkage("https://uni.example/about/contact", programs)).toEqual({ url: "no_url_relation", urlProgramId: null });
  });
});

describe("classifyProgramLinkage", () => {
  const bonnEconomics = [
    program({ id: "bsc", name: "Economics", degreeLevel: "Bachelor / first-cycle", officialProgramUrl: "https://b.example/economics-bsc" }),
    program({ id: "bazf", name: "Economics", degreeLevel: "Bachelor / first-cycle", officialProgramUrl: "https://b.example/economics-bazf" }),
    program({ id: "msc", name: "Economics", degreeLevel: "Master / second-cycle", officialProgramUrl: "https://b.example/economics-msc" }),
  ];

  it("reports no programme when the record states none", () => {
    const r = classifyProgramLinkage({ programName: null, scope: null, sourceUrl: null }, bonnEconomics);
    expect(r.linkage).toBe("no_programme_stated");
    expect(r.resolvedProgramId).toBeNull();
  });

  it("does not resolve a name match when the record states no degree level", () => {
    const r = classifyProgramLinkage({ programName: "Economics", scope: null, sourceUrl: null }, bonnEconomics);
    expect(r.linkage).toBe("name_match_level_unverified");
    expect(r.resolvedProgramId).toBeNull();
    expect(r.nameMatchIds).toHaveLength(3);
  });

  it("resolves only when name and the source's own level agree and pick exactly one row", () => {
    const r = classifyProgramLinkage({ programName: "Economics", scope: "master's programs", sourceUrl: null }, bonnEconomics);
    expect(r.linkage).toBe("name_match_confirmed");
    expect(r.resolvedProgramId).toBe("msc");
  });

  it("refuses to guess between two same-level rows sharing a name", () => {
    const r = classifyProgramLinkage({ programName: "Economics", scope: "undergraduate", sourceUrl: null }, bonnEconomics);
    expect(r.linkage).toBe("name_match_ambiguous");
    expect(r.resolvedProgramId).toBeNull();
  });

  it("flags a name match whose level contradicts the source", () => {
    const onlyBachelor = [program({ id: "b", name: "Bitki Koruma", degreeLevel: "Bachelor / first-cycle" })];
    const r = classifyProgramLinkage({ programName: "Bitki Koruma", scope: "önlisans", sourceUrl: null }, onlyBachelor);
    expect(r.linkage).toBe("name_match_level_conflict");
    expect(r.resolvedProgramId).toBeNull();
  });

  it("never matches on a substring of a programme name", () => {
    // `ILIKE '%ITU%'` matched Georgia Tech for İTÜ. Exact normalized equality only.
    const r = classifyProgramLinkage({ programName: "Econ", scope: "undergraduate", sourceUrl: null }, bonnEconomics);
    expect(r.linkage).toBe("naming_mismatch");
    expect(r.nameMatchIds).toEqual([]);
  });

  it("matches across punctuation and casing differences in the name", () => {
    const p = [program({ id: "x", name: "Economics, Management & CS", degreeLevel: "Bachelor / first-cycle" })];
    const r = classifyProgramLinkage({ programName: "economics management and cs", scope: "undergraduate", sourceUrl: null }, p);
    expect(r.linkage).toBe("naming_mismatch"); // "&" normalizes away, "and" does not become "&"
    const exact = classifyProgramLinkage({ programName: "Economics Management  CS", scope: "undergraduate", sourceUrl: null }, p);
    expect(exact.linkage).toBe("name_match_confirmed");
  });

  it("reports URL evidence independently of the name verdict", () => {
    const r = classifyProgramLinkage({ programName: "Nothing Like This", scope: null, sourceUrl: "https://b.example/economics-msc" }, bonnEconomics);
    expect(r.linkage).toBe("naming_mismatch");
    expect(r.url).toBe("program_url_unique");
    expect(r.urlProgramId).toBe("msc");
  });
});

describe("countProgramsWithIdentifyingUrl", () => {
  it("counts a URL as identifying only when no sibling programme shares it", () => {
    const programs = [
      program({ id: "a", name: "A", officialProgramUrl: "https://u.example/courses" }),
      program({ id: "b", name: "B", officialProgramUrl: "https://u.example/courses" }),
      program({ id: "c", name: "C", officialProgramUrl: "https://u.example/prog/c" }),
    ];
    expect(countProgramsWithIdentifyingUrl(programs)).toEqual({ identifying: 1, shared: 2, missing: 0 });
  });

  it("scopes sharing to one university — the same URL at two universities is not sharing", () => {
    const programs = [
      program({ id: "a", name: "A", universityId: "u1", officialProgramUrl: "https://shared.example/x" }),
      program({ id: "b", name: "B", universityId: "u2", officialProgramUrl: "https://shared.example/x" }),
    ];
    expect(countProgramsWithIdentifyingUrl(programs)).toEqual({ identifying: 2, shared: 0, missing: 0 });
  });

  it("counts a missing URL as missing, not identifying", () => {
    expect(countProgramsWithIdentifyingUrl([program({ id: "a", name: "A", officialProgramUrl: null })])).toEqual({ identifying: 0, shared: 0, missing: 1 });
  });
});
