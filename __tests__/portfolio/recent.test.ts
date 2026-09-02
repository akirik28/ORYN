import { describe, expect, test } from "vitest";
import { getRecentPortfolioItems } from "@/lib/portfolio/recent";
import type { PortfolioItem } from "@/lib/portfolio/types";

const NOW = new Date("2026-08-18T00:00:00Z");

function item(overrides: Partial<PortfolioItem> = {}): PortfolioItem {
  return {
    id: "1",
    category: "projects",
    title: "Untitled",
    organization: null,
    description: null,
    startDate: null,
    endDate: null,
    ongoing: false,
    meta: null,
    createdAt: NOW.toISOString(),
    evidenceStatus: null,
    ...overrides,
  };
}

describe("getRecentPortfolioItems", () => {
  test("includes an item added today, excludes one older than the window", () => {
    const fresh = item({ id: "fresh", createdAt: "2026-08-17T12:00:00Z" });
    const stale = item({ id: "stale", createdAt: "2026-05-01T00:00:00Z" });
    const result = getRecentPortfolioItems([fresh, stale], { now: NOW, windowDays: 45 });
    expect(result.map((i) => i.id)).toEqual(["fresh"]);
  });

  test("sorts newest first regardless of input order", () => {
    const older = item({ id: "older", createdAt: "2026-08-01T00:00:00Z" });
    const newer = item({ id: "newer", createdAt: "2026-08-15T00:00:00Z" });
    const result = getRecentPortfolioItems([older, newer], { now: NOW });
    expect(result.map((i) => i.id)).toEqual(["newer", "older"]);
  });

  test("respects the limit", () => {
    const items = Array.from({ length: 10 }, (_, i) => item({ id: String(i), createdAt: "2026-08-17T00:00:00Z" }));
    expect(getRecentPortfolioItems(items, { now: NOW, limit: 3 })).toHaveLength(3);
  });

  test("empty when nothing is within the window", () => {
    const result = getRecentPortfolioItems([item({ createdAt: "2020-01-01T00:00:00Z" })], { now: NOW });
    expect(result).toEqual([]);
  });
});
