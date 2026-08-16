import { describe, expect, test } from "vitest";
import { classifyForBackfill, summarizeBackfillResults } from "@/lib/entities/backfill";
import type { EntityCandidate } from "@/lib/entities/rank";

const UAA: EntityCandidate = {
  id: "inst-1",
  canonicalName: "Üsküdar American Academy",
  aliases: ["UAA", "Uskudar American Academy"],
  country: "Turkey",
  city: "Istanbul",
};
const ROBERT_COLLEGE: EntityCandidate = { id: "inst-2", canonicalName: "Robert College", aliases: [], country: "Turkey", city: "Istanbul" };

describe("classifyForBackfill", () => {
  test("an exact canonical-name match is auto-linked", () => {
    const result = classifyForBackfill({ rowId: "row-1", freeText: "Üsküdar American Academy" }, [UAA, ROBERT_COLLEGE]);
    expect(result).toEqual({
      rowId: "row-1",
      freeText: "Üsküdar American Academy",
      classification: "auto_linked",
      matchedInstitutionId: UAA.id,
      matchedCanonicalName: UAA.canonicalName,
    });
  });

  test("an exact alias match is auto-linked", () => {
    const result = classifyForBackfill({ rowId: "row-2", freeText: "UAA" }, [UAA]);
    expect(result.classification).toBe("auto_linked");
    expect(result.matchedInstitutionId).toBe(UAA.id);
  });

  test("an accent/spelling variant that only fuzzy-matches is a possible duplicate, not auto-linked", () => {
    const result = classifyForBackfill({ rowId: "row-3", freeText: "Uskudar Amercan Acadmy" }, [UAA]);
    expect(result.classification).not.toBe("auto_linked");
    expect(["possible_duplicate", "unresolved"]).toContain(result.classification);
  });

  test("a genuinely unrelated free-text value is unresolved, never force-linked", () => {
    const result = classifyForBackfill({ rowId: "row-4", freeText: "My local scout troop" }, [UAA, ROBERT_COLLEGE]);
    expect(result).toEqual({
      rowId: "row-4",
      freeText: "My local scout troop",
      classification: "unresolved",
      matchedInstitutionId: null,
      matchedCanonicalName: null,
    });
  });

  test("empty free text is unresolved", () => {
    const result = classifyForBackfill({ rowId: "row-5", freeText: "   " }, [UAA]);
    expect(result.classification).toBe("unresolved");
  });

  test("no candidate institutions at all: everything is unresolved", () => {
    const result = classifyForBackfill({ rowId: "row-6", freeText: "Üsküdar American Academy" }, []);
    expect(result.classification).toBe("unresolved");
  });
});

describe("summarizeBackfillResults", () => {
  test("counts each classification bucket correctly", () => {
    const results = [
      classifyForBackfill({ rowId: "1", freeText: "Üsküdar American Academy" }, [UAA]),
      classifyForBackfill({ rowId: "2", freeText: "UAA" }, [UAA]),
      classifyForBackfill({ rowId: "3", freeText: "totally unrelated text" }, [UAA]),
    ];
    const summary = summarizeBackfillResults(results);
    expect(summary.total).toBe(3);
    expect(summary.autoLinked).toBe(2);
    expect(summary.unresolved).toBe(1);
    expect(summary.autoLinked + summary.possibleDuplicate + summary.unresolved).toBe(summary.total);
  });
});
