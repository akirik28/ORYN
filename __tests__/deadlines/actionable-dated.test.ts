import { describe, expect, it } from "vitest";

import { isActionableDatedDeadline } from "@/lib/deadlines/ingest";

const TODAY = "2026-08-22";

/**
 * These cases are drawn from live rows, not invented. The university detail page rendered 60 of
 * 171 deadlines (35%) with dates in the past under a heading reading "Upcoming", because it
 * applied the verification_state filter and not the date one. The two filters answer different
 * questions and live data disagrees with each in both directions, so each half gets a test that
 * fails if the other half is deleted.
 */
describe("isActionableDatedDeadline", () => {
  it("hides a passed date even when the cycle is still marked current", () => {
    // Humboldt, Sommersemester 2026, 2026-01-15 — VERIFIED_CURRENT while Freiburg and Bonn mark
    // the same cycle and same date VERIFIED_HISTORICAL. This row is why a January deadline showed
    // under "Upcoming" in August. The state filter alone passes it; the date filter catches it.
    expect(isActionableDatedDeadline({ verification_state: "VERIFIED_CURRENT", deadline_date: "2026-01-15" }, TODAY)).toBe(false);
  });

  it("hides a closed cycle even when its date is still in the future", () => {
    // The mirror case: state carries cycle closure, which a future date cannot rule out. Only the
    // state filter catches this one.
    expect(isActionableDatedDeadline({ verification_state: "VERIFIED_HISTORICAL", deadline_date: "2027-01-15" }, TODAY)).toBe(false);
  });

  it("shows an open cycle whose date has not passed", () => {
    expect(isActionableDatedDeadline({ verification_state: "VERIFIED_CURRENT", deadline_date: "2026-10-15" }, TODAY)).toBe(true);
  });

  it("treats today as still actionable", () => {
    // A deadline falling today has not passed. `>` instead of `>=` would silently drop every
    // same-day deadline — the one day it matters most to a student.
    expect(isActionableDatedDeadline({ verification_state: "VERIFIED_CURRENT", deadline_date: TODAY }, TODAY)).toBe(true);
  });

  it("refuses a null date rather than treating absence as valid", () => {
    // recurring_annual_undated rows carry month/day and a null deadline_date by migration 0056's
    // shape constraint. They render in their own group and must never reach the dated one.
    expect(isActionableDatedDeadline({ verification_state: "VERIFIED_CURRENT", deadline_date: null }, TODAY)).toBe(false);
  });

  it("refuses every non-actionable state, not only VERIFIED_HISTORICAL", () => {
    for (const state of ["CONFLICTING_EVIDENCE", "NEEDS_REVIEW", "CURRENT_CYCLE_NOT_PUBLISHED"]) {
      expect(isActionableDatedDeadline({ verification_state: state, deadline_date: "2027-01-15" }, TODAY)).toBe(false);
    }
  });
});
