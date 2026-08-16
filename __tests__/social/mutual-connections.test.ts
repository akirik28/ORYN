import { describe, expect, test } from "vitest";
import { intersectAcceptedConnections, excludeBlockedIds } from "@/lib/social/mutual-connections-rules";

const A = "aaaaaaaa-0000-0000-0000-000000000001";
const B = "aaaaaaaa-0000-0000-0000-000000000002";
const C = "aaaaaaaa-0000-0000-0000-000000000003";
const D = "aaaaaaaa-0000-0000-0000-000000000004";

describe("intersectAcceptedConnections — correct intersection/count", () => {
  test("no overlap: empty", () => {
    expect(intersectAcceptedConnections([A, B], [C, D])).toEqual([]);
  });

  test("full overlap: every shared id present, count matches", () => {
    const result = intersectAcceptedConnections([A, B, C], [A, B, C]);
    expect(result.sort()).toEqual([A, B, C].sort());
    expect(result).toHaveLength(3);
  });

  test("partial overlap: only the shared ids, correct count", () => {
    const result = intersectAcceptedConnections([A, B, C], [B, C, D]);
    expect(result.sort()).toEqual([B, C].sort());
    expect(result).toHaveLength(2);
  });

  test("duplicates within one side's own list don't inflate the count", () => {
    const result = intersectAcceptedConnections([A, A, B], [A, B]);
    expect(result.sort()).toEqual([A, B].sort());
    expect(result).toHaveLength(2);
  });

  test("either side empty: no mutuals", () => {
    expect(intersectAcceptedConnections([], [A, B])).toEqual([]);
    expect(intersectAcceptedConnections([A, B], [])).toEqual([]);
  });
});

describe("excludeBlockedIds — blocked users excluded from the mutual list", () => {
  test("a blocked candidate is removed from the mutual list", () => {
    expect(excludeBlockedIds([A, B, C], [B])).toEqual([A, C]);
  });

  test("no blocks: list passes through unchanged", () => {
    expect(excludeBlockedIds([A, B, C], [])).toEqual([A, B, C]);
  });

  test("every mutual is blocked: empty result, not an error", () => {
    expect(excludeBlockedIds([A, B], [A, B])).toEqual([]);
  });

  test("a block against someone who isn't even a mutual candidate has no effect", () => {
    expect(excludeBlockedIds([A, B], [D])).toEqual([A, B]);
  });
});

describe("intersect + exclude composed — the actual getMutualConnections computation", () => {
  test("a genuinely mutual connection who the viewer has blocked never appears", () => {
    const mutual = intersectAcceptedConnections([A, B, C], [A, B, C]);
    const visible = excludeBlockedIds(mutual, [B]);
    expect(visible.sort()).toEqual([A, C].sort());
    expect(visible).not.toContain(B);
  });
});

describe("mutual connections computation — no private/non-discoverable metadata leak", () => {
  // Both pure functions operate on, and return, nothing but bare user-id strings — never
  // a connection row, a status, or a block flag. The shell (lib/social/mutual-
  // connections.ts) only ever selects `id, display_name` for the preview and only ever
  // returns a `count` alongside it — this asserts the computation itself never produces
  // (and so can never leak) anything richer than the id set a caller could already see.
  test("the result is always a subset of the input ids — never introduces or enriches an entry", () => {
    const input = [A, B, C];
    const result = excludeBlockedIds(intersectAcceptedConnections(input, [A, B, C, D]), []);
    for (const id of result) {
      expect(input).toContain(id);
    }
  });

  test("blocking someone removes them from the result entirely — not just their metadata", () => {
    const result = excludeBlockedIds(intersectAcceptedConnections([A, B], [A, B]), [A]);
    expect(result).not.toContain(A);
    expect(result.every((id) => typeof id === "string")).toBe(true);
  });
});
