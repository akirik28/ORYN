import { describe, expect, test } from "vitest";
import { readResearchQueue } from "@/lib/admin/research-queue";

/**
 * Reads the real docs/arastirma-kuyrugu.md from disk (not a fixture) -- the whole point of
 * this module is parsing the actual, hand-edited file, so a fixture would test a parser
 * against a shape nobody guarantees stays in sync with what the file really looks like.
 */
describe("readResearchQueue", () => {
  test("parses the real doc into at least one area row with all four columns populated", () => {
    const queue = readResearchQueue();
    expect(queue).not.toBeNull();
    expect(queue!.rows.length).toBeGreaterThan(0);
    for (const row of queue!.rows) {
      expect(row.number).not.toBe("");
      expect(row.area).not.toBe("");
      expect(row.status).not.toBe("");
    }
  });

  test("markdown bold is stripped from the area name", () => {
    const queue = readResearchQueue();
    for (const row of queue!.rows) {
      expect(row.area).not.toContain("**");
    }
  });

  test("the separator row (all dashes) is never mistaken for a data row", () => {
    const queue = readResearchQueue();
    for (const row of queue!.rows) {
      expect(row.number).not.toMatch(/^:?-+:?$/);
    }
  });

  test("lane assignment rows are parsed too, when the doc has that second table", () => {
    const queue = readResearchQueue();
    expect(queue!.lanes.length).toBeGreaterThan(0);
    for (const lane of queue!.lanes) {
      expect(lane.lane).not.toBe("");
    }
  });
});
