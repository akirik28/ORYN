import { describe, expect, test } from "vitest";
import { urgencyLabel } from "@/components/oryn/deadline-badge";

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
