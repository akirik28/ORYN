import { describe, expect, it } from "vitest";
import {
  allFieldsIdentical,
  classifyDuplicateGroup,
  differingDiscriminators,
  groupByResearchId,
  groupByUrlAndAnnotationStrippedName,
  groupByUrlAndName,
  stripTrailingAnnotation,
  type CorpusProgramRecord,
} from "@/lib/programs/corpus-duplicates";

function rec(over: Partial<CorpusProgramRecord>): CorpusProgramRecord {
  return {
    research_program_id: "ID-1",
    university_name: "Test University",
    university_country: "Testland",
    program_name: "Economics",
    degree_level: "Bachelor / first-cycle",
    official_program_url: "https://t.example/economics",
    researched_at: "2026-08-21",
    ...over,
  };
}

describe("differingDiscriminators", () => {
  it("reports a field only when two records carry different NON-EMPTY values", () => {
    expect(differingDiscriminators([rec({ campus: "Bologna" }), rec({ campus: "Rimini" })])).toEqual(["campus"]);
  });

  it("does not treat missing data as a distinguishing fact", () => {
    // Otherwise every partially-filled record would invent a split that does not exist.
    expect(differingDiscriminators([rec({ campus: null }), rec({ campus: "Rimini" })])).toEqual([]);
    expect(differingDiscriminators([rec({ campus: "" }), rec({ campus: "Rimini" })])).toEqual([]);
  });

  it("counts a differing official_program_url as a last-resort discriminator", () => {
    // Padua's two "MEDICINA E CHIRURGIA" pages — the campus field is null on one of them, so
    // the URLs are the only surviving evidence that these are two programmes.
    const group = [rec({ program_name: "MEDICINA E CHIRURGIA", official_program_url: "https://unipd.it/medicina-e-chirurgia" }), rec({ program_name: "MEDICINA E CHIRURGIA", official_program_url: "https://unipd.it/medicina-e-chirurgia-treviso" })];
    expect(differingDiscriminators(group)).toEqual(["official_program_url"]);
  });
});

describe("stripTrailingAnnotation", () => {
  it("removes a trailing square-bracketed degree annotation", () => {
    expect(stripTrailingAnnotation("Accountancy & Finance [BAcc]")).toBe(stripTrailingAnnotation("Accountancy & Finance"));
  });

  it("leaves parenthesised suffixes alone — they distinguish real programmes", () => {
    // Bonn's Economics (Major) / (Minor); Ankara's "(KKTC Uyruklu)" quota programmes.
    expect(stripTrailingAnnotation("Economics (Major)")).not.toBe(stripTrailingAnnotation("Economics (Minor)"));
  });

  it("only strips at the end, not mid-name", () => {
    expect(stripTrailingAnnotation("Physics [BSc] and Maths")).toBe(stripTrailingAnnotation("Physics BSc and Maths"));
  });
});

describe("allFieldsIdentical", () => {
  it("ignores the loader's file/line bookkeeping", () => {
    expect(allFieldsIdentical([rec({ __file: "a.jsonl", __line: 1 }), rec({ __file: "b.jsonl", __line: 9 })])).toBe(true);
  });

  it("is false when any real field differs", () => {
    expect(allFieldsIdentical([rec({ researcher_notes: "x" } as Partial<CorpusProgramRecord>), rec({})])).toBe(false);
  });

  it("is insensitive to key order in the source JSON", () => {
    const a: CorpusProgramRecord = { program_name: "Economics", university_name: "U" };
    const b: CorpusProgramRecord = { university_name: "U", program_name: "Economics" };
    expect(allFieldsIdentical([a, b])).toBe(true);
  });
});

describe("classifyDuplicateGroup", () => {
  it("calls a byte-identical pair a genuine duplicate", () => {
    const g = classifyDuplicateGroup("shared_url_and_name", "k", [rec({ __file: "a.jsonl" }), rec({ __file: "b.jsonl" })]);
    expect(g.classification).toBe("genuine_duplicate");
    expect(g.allFieldsIdentical).toBe(true);
  });

  it("calls a campus pair a legitimate split, even when researched on different dates", () => {
    // Order matters: a split researched twice is still a split, not a re-research.
    const g = classifyDuplicateGroup("shared_url_and_name", "k", [rec({ campus: "Bologna", researched_at: "2026-08-15" }), rec({ campus: "Rimini", researched_at: "2026-08-21" })]);
    expect(g.classification).toBe("legitimate_split");
    expect(g.discriminators).toContain("campus");
  });

  it("calls a same-programme, different-date pair a re-research", () => {
    const g = classifyDuplicateGroup("shared_url_and_name", "k", [rec({ researched_at: "2026-08-15" }), rec({ researched_at: "2026-08-21" })]);
    expect(g.classification).toBe("re_research");
    expect(g.researchDates).toEqual(["2026-08-15", "2026-08-21"]);
  });

  it("calls a degree-type pair a legitimate split", () => {
    // Durham publishes "Chemistry" as both BSc and MChem — separately admitted.
    const g = classifyDuplicateGroup("shared_url_and_name", "k", [rec({ program_name: "Chemistry", degree_type: "BSc" }), rec({ program_name: "Chemistry", degree_type: "MChem" })]);
    expect(g.classification).toBe("legitimate_split");
    expect(g.discriminators).toContain("degree_type");
  });

  it("reports an identifier collision only for a group keyed on the identifier", () => {
    const different = [rec({ program_name: "Economics" }), rec({ program_name: "Astrophysics", official_program_url: "https://t.example/astro" })];
    expect(classifyDuplicateGroup("shared_research_program_id", "ID-1", different).classification).toBe("id_collision_distinct_programmes");
  });

  it("does not report an identifier collision for a URL-keyed group", () => {
    const g = classifyDuplicateGroup("shared_url_and_annotation_stripped_name", "k", [rec({ program_name: "Economics [BSc]" }), rec({ program_name: "Economics", researched_at: "2026-08-20" })]);
    expect(g.classification).toBe("re_research");
  });
});

describe("grouping", () => {
  it("groups by research_program_id and ignores singletons", () => {
    const groups = groupByResearchId([rec({ research_program_id: "A" }), rec({ research_program_id: "A", program_name: "Physics" }), rec({ research_program_id: "B" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].key).toBe("A");
  });

  it("does NOT group records that merely share a catalogue URL", () => {
    // The METU incident in one assertion: 3 distinct programmes on one listing page.
    const shared = "https://uni.example/courses";
    const groups = groupByUrlAndName([
      rec({ program_name: "Economics", official_program_url: shared }),
      rec({ program_name: "Physics", official_program_url: shared }),
      rec({ program_name: "Law", official_program_url: shared }),
    ]);
    expect(groups).toEqual([]);
  });

  it("groups records sharing a URL and a name", () => {
    const shared = "https://uni.example/courses";
    const groups = groupByUrlAndName([rec({ program_name: "Economics", official_program_url: shared }), rec({ program_name: "Economics", official_program_url: shared, researched_at: "2026-08-20" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].classification).toBe("re_research");
  });

  it("annotation-stripped grouping reports only what exact matching missed", () => {
    const url = "https://gla.ac.uk/undergraduate/degrees/accountancy/";
    const records = [rec({ program_name: "Accountancy & Finance [BAcc]", official_program_url: url, researched_at: "2026-08-20" }), rec({ program_name: "Accountancy & Finance", official_program_url: url })];
    expect(groupByUrlAndName(records)).toEqual([]);
    expect(groupByUrlAndAnnotationStrippedName(records)).toHaveLength(1);
  });

  it("annotation-stripped grouping does not re-report an exact-name group", () => {
    const url = "https://uni.example/econ";
    const records = [rec({ program_name: "Economics", official_program_url: url }), rec({ program_name: "Economics", official_program_url: url, researched_at: "2026-08-20" })];
    expect(groupByUrlAndAnnotationStrippedName(records)).toEqual([]);
  });
});
