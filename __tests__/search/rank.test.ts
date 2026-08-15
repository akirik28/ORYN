import { describe, expect, test } from "vitest";
import { rankResults, toIlikePattern } from "@/lib/search/rank";
import type { SearchResult } from "@/lib/search/types";

function result(title: string, type: SearchResult["type"] = "university"): SearchResult {
  return { type, id: title, title, subtitle: null, href: "/" };
}

describe("rankResults", () => {
  test("an exact title match ranks above a mere prefix match", () => {
    const ranked = rankResults("MIT", [result("MIT Media Lab"), result("MIT")]);
    expect(ranked[0].title).toBe("MIT");
  });

  test("a prefix match ranks above an unrelated substring match", () => {
    const ranked = rankResults("Stanford", [result("Cal Poly Stanford Extension"), result("Stanford University")]);
    expect(ranked[0].title).toBe("Stanford University");
  });

  test("ties within the same tier are sorted alphabetically", () => {
    const ranked = rankResults("uni", [result("University of Zurich"), result("University of Amsterdam")]);
    expect(ranked.map((r) => r.title)).toEqual(["University of Amsterdam", "University of Zurich"]);
  });

  test("is case-insensitive", () => {
    const ranked = rankResults("harvard", [result("Harvard University")]);
    expect(ranked[0].title).toBe("Harvard University");
  });

  test("does not mutate the input array", () => {
    const input = [result("B"), result("A")];
    const copy = [...input];
    rankResults("a", input);
    expect(input).toEqual(copy);
  });
});

describe("toIlikePattern", () => {
  test("wraps the term in wildcards", () => {
    expect(toIlikePattern("stanford")).toBe("%stanford%");
  });

  test("escapes literal ilike wildcard characters typed by the user", () => {
    expect(toIlikePattern("50%_off")).toBe("%50\\%\\_off%");
  });

  test("escapes a literal backslash before wrapping", () => {
    expect(toIlikePattern("a\\b")).toBe("%a\\\\b%");
  });
});
