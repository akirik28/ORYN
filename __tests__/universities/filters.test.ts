import { describe, expect, test } from "vitest";
import { applyRangeFilters, matchesInstitutionType, COST_BUCKETS, SIZE_BUCKETS, RANK_TIERS, type RangeFilterRow } from "@/lib/universities/filters";

interface Row extends RangeFilterRow {
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Small Known", student_size: 3000 },
  { id: "b", name: "Mid Known", student_size: 10000 },
  { id: "c", name: "Large Known", student_size: 40000 },
  { id: "d", name: "Unknown Size", student_size: null },
];

describe("applyRangeFilters — size", () => {
  test("no size filter passes every row through untouched", () => {
    const { matched, sizeUnknown } = applyRangeFilters(ROWS, {});
    expect(matched).toHaveLength(4);
    expect(sizeUnknown).toBeUndefined();
  });

  test("a size bucket keeps only rows inside its [min, max] range", () => {
    const { matched } = applyRangeFilters(ROWS, { size: ["under5k"] });
    expect(matched.map((r) => r.id)).toEqual(["a"]);
  });

  test("an unbounded top bucket (max: null) has no upper edge", () => {
    const { matched } = applyRangeFilters(ROWS, { size: ["30k-plus"] });
    expect(matched.map((r) => r.id)).toEqual(["c"]);
  });

  test("a row with null student_size is excluded from every bucket, never defaulted to 0", () => {
    for (const bucket of SIZE_BUCKETS) {
      const { matched } = applyRangeFilters(ROWS, { size: [bucket.value] });
      expect(matched.some((r) => r.id === "d")).toBe(false);
    }
  });

  test("sizeUnknown counts rows with no student_size at all — separate from rows that just didn't match the range", () => {
    // Row "b" (10000) genuinely doesn't fit "under5k" (known, out of range) — must not be
    // counted alongside "d" (unknown). Only "d" has no data.
    const { sizeUnknown } = applyRangeFilters(ROWS, { size: ["under5k"] });
    expect(sizeUnknown).toBe(1);
  });

  test("multiple selected buckets OR together — the founder-reported gap ('can't do between 10 and 50')", () => {
    // "under5k" (row a, 3000) + "30k-plus" (row c, 40000) selected together should match BOTH
    // even though they're not adjacent and row b (10000, in neither bucket) must stay excluded.
    const { matched } = applyRangeFilters(ROWS, { size: ["under5k", "30k-plus"] });
    expect(matched.map((r) => r.id).sort()).toEqual(["a", "c"]);
  });

  test("two adjacent buckets selected together span a continuous wider range", () => {
    // "5-15k" + "15-30k" together should behave like one combined "5k-30k" range — row b
    // (10000) falls in the first, and nothing here falls in the second, but the combined
    // selection must still just be the union, not silently drop row b.
    const { matched } = applyRangeFilters(ROWS, { size: ["5-15k", "15-30k"] });
    expect(matched.map((r) => r.id)).toEqual(["b"]);
  });

  test("an empty size array behaves like no filter at all", () => {
    const { matched, sizeUnknown } = applyRangeFilters(ROWS, { size: [] });
    expect(matched).toHaveLength(4);
    expect(sizeUnknown).toBeUndefined();
  });
});

describe("applyRangeFilters — cost", () => {
  const costMap = new Map([
    ["a", 5000],
    ["b", 45000],
  ]);
  // "c" and "d" have no cost_of_attendance row at all — the common case for non-US
  // universities today.

  test("a cost bucket keeps only rows whose known cost falls in range", () => {
    const { matched } = applyRangeFilters(ROWS, { cost: ["25-50k"] }, { costMap });
    expect(matched.map((r) => r.id)).toEqual(["b"]);
  });

  test("rows absent from costMap are excluded from every bucket, never treated as $0", () => {
    for (const bucket of COST_BUCKETS) {
      const { matched } = applyRangeFilters(ROWS, { cost: [bucket.value] }, { costMap });
      expect(matched.some((r) => r.id === "c" || r.id === "d")).toBe(false);
    }
  });

  test("costUnknown counts rows missing from costMap — the founder-required 'excluded because unavailable' number", () => {
    // Within the 4 rows: "a" and "b" are known (regardless of whether they match this
    // particular bucket), "c" and "d" are unknown.
    const { costUnknown } = applyRangeFilters(ROWS, { cost: ["under10k"] }, { costMap });
    expect(costUnknown).toBe(2);
  });

  test("missing costMap (filter active, no data fetched) treats every row as unknown rather than throwing", () => {
    const { matched, costUnknown } = applyRangeFilters(ROWS, { cost: ["under10k"] });
    expect(matched).toEqual([]);
    expect(costUnknown).toBe(4);
  });

  test("selecting two adjacent cost buckets spans them — the exact founder report: '$10k to $50k'", () => {
    const spanningMap = new Map([
      ["a", 15000], // inside "10-25k"
      ["b", 40000], // inside "25-50k"
    ]);
    const { matched } = applyRangeFilters(ROWS, { cost: ["10-25k", "25-50k"] }, { costMap: spanningMap });
    expect(matched.map((r) => r.id).sort()).toEqual(["a", "b"]);
  });
});

describe("applyRangeFilters — rank", () => {
  const qsRankMap = new Map([
    ["a", 5],
    ["b", 300],
  ]);

  test("a rank tier keeps only rows ranked at or above the threshold", () => {
    const { matched } = applyRangeFilters(ROWS, { rank: "10" }, { qsRankMap });
    expect(matched.map((r) => r.id)).toEqual(["a"]);
  });

  test("an unranked row (absent from qsRankMap) never matches any tier, including the widest", () => {
    const widest = RANK_TIERS[RANK_TIERS.length - 1];
    const { matched } = applyRangeFilters(ROWS, { rank: widest }, { qsRankMap });
    expect(matched.some((r) => r.id === "c" || r.id === "d")).toBe(false);
  });
});

/**
 * CEO, 2026-09-02: 734 of 1,019 universities lack research depth (lib/universities/
 * data-depth.ts) and "extend it to browse" required a filter that's student-controlled
 * and off by default. detailedOnly is the narrowing half of that; the badge half lives in
 * browse-page.ts's getUniversityCardMeta.
 */
describe("applyRangeFilters — detailedOnly", () => {
  const depthIds = new Set(["a", "c"]);

  test("off by default: no detailedOnly filter passes every row through untouched", () => {
    const { matched } = applyRangeFilters(ROWS, {}, { depthIds });
    expect(matched).toHaveLength(4);
  });

  test("keeps only rows present in depthIds", () => {
    const { matched } = applyRangeFilters(ROWS, { detailedOnly: true }, { depthIds });
    expect(matched.map((r) => r.id).sort()).toEqual(["a", "c"]);
  });

  test("detailedOnly: false behaves like the filter being off, even with depthIds present", () => {
    const { matched } = applyRangeFilters(ROWS, { detailedOnly: false }, { depthIds });
    expect(matched).toHaveLength(4);
  });

  test("missing depthIds (filter active, no set fetched) excludes every row rather than including everything", () => {
    const { matched } = applyRangeFilters(ROWS, { detailedOnly: true });
    expect(matched).toEqual([]);
  });

  test("composes with size — a row must satisfy both to survive", () => {
    // "a" (3000, under5k) is in depthIds; "c" (40000, 30k-plus) is also in depthIds but
    // doesn't fit under5k, so only "a" should survive both filters together.
    const { matched } = applyRangeFilters(ROWS, { size: ["under5k"], detailedOnly: true }, { depthIds });
    expect(matched.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("applyRangeFilters — combined filters narrow together (AND, not OR)", () => {
  test("size + cost both active only keep rows satisfying both", () => {
    const costMap = new Map([
      ["a", 5000],
      ["b", 5000],
    ]);
    // "a" fits size (<5k) and cost (<10k); "b" fits cost but not size.
    const { matched } = applyRangeFilters(ROWS, { size: ["under5k"], cost: ["under10k"] }, { costMap });
    expect(matched.map((r) => r.id)).toEqual(["a"]);
  });
});

describe("bucket definitions — no gaps, no overlaps, ascending order", () => {
  function checkContiguous(buckets: { min: number; max: number | null }[]) {
    for (let i = 0; i < buckets.length - 1; i++) {
      expect(buckets[i].max).not.toBeNull();
      expect(buckets[i + 1].min).toBe((buckets[i].max as number) + 1);
    }
    expect(buckets[buckets.length - 1].max).toBeNull();
  }

  test("COST_BUCKETS are contiguous with an unbounded top bucket", () => {
    checkContiguous(COST_BUCKETS);
  });

  test("SIZE_BUCKETS are contiguous with an unbounded top bucket", () => {
    checkContiguous(SIZE_BUCKETS);
  });
});

describe("matchesInstitutionType", () => {
  test("no type filter matches everything, including null institution_type", () => {
    expect(matchesInstitutionType(null, null)).toBe(true);
    expect(matchesInstitutionType("Public", null)).toBe(true);
  });

  test("matches case-insensitively and by substring (real data has 'Private nonprofit', 'Private not for Profit')", () => {
    expect(matchesInstitutionType("Private nonprofit", "private")).toBe(true);
    expect(matchesInstitutionType("Private not for Profit", "private")).toBe(true);
    expect(matchesInstitutionType("PUBLIC", "public")).toBe(true);
  });

  test("a bare 'university' placeholder value matches neither bucket — genuinely unclassified, not defaulted", () => {
    expect(matchesInstitutionType("university", "public")).toBe(false);
    expect(matchesInstitutionType("university", "private")).toBe(false);
  });

  test("null institution_type matches neither bucket when a filter is active", () => {
    expect(matchesInstitutionType(null, "public")).toBe(false);
  });
});
