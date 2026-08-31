import { describe, expect, test } from "vitest";
import { buildNextCheckLabel, toCalendarBoundFactDisplay } from "@/lib/requirements/calendar-bound";
import { CAO_POINTS_IE, type AnnualCalendarWindow } from "@/lib/acquisition/verification";

const window: AnnualCalendarWindow = { label: "test window", month: 8, day: 25 };

describe("buildNextCheckLabel — the wording must not lie about direction", () => {
  test("before the next window, reads as forward-looking ('is expected')", () => {
    const label = buildNextCheckLabel(window, "2026-03-15T00:00:00.000Z", new Date("2026-08-01T00:00:00.000Z"));
    expect(label).toBe("The next figure is expected around August 2026.");
  });

  test("after the next window has passed, reads as overdue ('was expected... may already be published') — never still 'is expected'", () => {
    const label = buildNextCheckLabel(window, "2026-03-15T00:00:00.000Z", new Date("2026-09-01T00:00:00.000Z"));
    expect(label).toBe("A fresher figure was expected around August 2026 — not yet re-checked, so it may already be published.");
    expect(label).not.toContain("is expected");
  });

  test("a retrieval right after last year's window rolls to next year's, not this year's already-past one", () => {
    const label = buildNextCheckLabel(window, "2025-08-27T00:00:00.000Z", new Date("2026-08-01T00:00:00.000Z"));
    expect(label).toBe("The next figure is expected around August 2026.");
  });

  test("no retrievedAt at all reads as never-checked, not as fresh", () => {
    const label = buildNextCheckLabel(window, null, new Date("2026-01-01T00:00:00.000Z"));
    expect(label).toBe("A fresher figure may already be available around August each year — not yet re-checked.");
  });
});

describe("toCalendarBoundFactDisplay", () => {
  test("prefers requirement_detail over the (possibly truncated) title", () => {
    const display = toCalendarBoundFactDisplay(
      { id: "row-1", title: "2025 CAO points: 533", requirement_detail: "2025 CAO Round 1 points for DN201 Computer Science: 533 — this is the score of the last student offered a place.", source_url: "https://example.com", retrieved_at: "2026-08-21T00:00:00.000Z" },
      CAO_POINTS_IE,
      new Date("2026-09-01T00:00:00.000Z")
    );
    expect(display.factText).toBe("2025 CAO Round 1 points for DN201 Computer Science: 533 — this is the score of the last student offered a place.");
  });

  test("falls back to title when requirement_detail is null", () => {
    const display = toCalendarBoundFactDisplay(
      { id: "row-2", title: "2025 CAO points: 533", requirement_detail: null, source_url: null, retrieved_at: "2026-08-21T00:00:00.000Z" },
      CAO_POINTS_IE,
      new Date("2026-09-01T00:00:00.000Z")
    );
    expect(display.factText).toBe("2025 CAO points: 533");
  });

  test("carries no field that could hold an evaluation verdict — the type itself is the enforcement", () => {
    const display = toCalendarBoundFactDisplay(
      { id: "row-3", title: "x", requirement_detail: "x", source_url: null, retrieved_at: "2026-08-21T00:00:00.000Z" },
      CAO_POINTS_IE,
      new Date("2026-09-01T00:00:00.000Z")
    );
    expect(Object.keys(display).sort()).toEqual(["factText", "id", "nextCheckLabel", "retrievedAt", "sourceUrl"]);
  });
});

describe("CAO_POINTS_IE end to end — the 37 real backfilled rows, all retrieved 2026-08-21", () => {
  test("read today (past the 25 August window) as overdue, not as still-pending", () => {
    const label = buildNextCheckLabel(CAO_POINTS_IE, "2026-08-21T00:00:00.000Z", new Date("2026-09-01T00:00:00.000Z"));
    expect(label).toContain("was expected");
    expect(label).toContain("may already be published");
  });
});
