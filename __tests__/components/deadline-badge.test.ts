import { describe, expect, test } from "vitest";
import { urgencyLabel, urgencyTone } from "@/components/proxola/deadline-badge";

/**
 * First direct coverage of this function -- it had none before being exported 2026-09-02
 * for reuse on the opportunity detail page's "urgency" fact (Phase 12's "deadline urgency"
 * dimension), which used to recompute an equivalent string inline and got the singular
 * "1 day left" case wrong ("1 days left") as a result. Pinned here so that specific
 * regression can't come back through either call site.
 */
describe("urgencyLabel", () => {
  test("past due", () => {
    expect(urgencyLabel(-1, "en")).toBe("Past due");
    expect(urgencyLabel(-1, "tr")).toBe("süresi geçti");
  });

  test("due today", () => {
    expect(urgencyLabel(0, "en")).toBe("Due today");
    expect(urgencyLabel(0, "tr")).toBe("son gün bugün");
  });

  test("exactly 1 day left uses the singular form, not '1 days left'", () => {
    expect(urgencyLabel(1, "en")).toBe("1 day left");
    expect(urgencyLabel(1, "tr")).toBe("1 gün kaldı");
  });

  test("more than 1 day left uses the plural form", () => {
    expect(urgencyLabel(6, "en")).toBe("6 days left");
    expect(urgencyLabel(30, "en")).toBe("30 days left");
    expect(urgencyLabel(6, "tr")).toBe("6 gün kaldı");
  });
});

/**
 * The 4th urgency tier (2026-09-04): AGENTS.md Phase 23 names 3/7/14/30-day bands, but the
 * code only ever had three dynamic tiers plus a flat catch-all past 14 days -- a 20-day and a
 * 120-day deadline were visually identical. No prior test covered urgencyTone at all (only
 * urgencyLabel's text), so this is first coverage, not a changed assertion.
 */
describe("urgencyTone", () => {
  test("boundaries of the first three tiers are unchanged by adding a fourth", () => {
    expect(urgencyTone(0)).toBe("error");
    expect(urgencyTone(3)).toBe("error");
    expect(urgencyTone(4)).toBe("warning");
    expect(urgencyTone(7)).toBe("warning");
    expect(urgencyTone(8)).toBe("brand");
    expect(urgencyTone(14)).toBe("brand");
  });

  test("15-30 days is the new distinct 'info' tier, not the old flat neutral", () => {
    expect(urgencyTone(15)).toBe("info");
    expect(urgencyTone(20)).toBe("info");
    expect(urgencyTone(30)).toBe("info");
  });

  test("past 30 days falls back to neutral -- still one flat bucket beyond the spec's last named tier", () => {
    expect(urgencyTone(31)).toBe("neutral");
    expect(urgencyTone(124)).toBe("neutral");
  });

  test("a negative (past due) day count is not treated as urgent", () => {
    expect(urgencyTone(-1)).toBe("error");
  });
});
