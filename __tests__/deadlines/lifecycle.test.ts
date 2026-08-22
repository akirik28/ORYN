import { describe, expect, test } from "vitest";
import { isDatedDeadlineUpcoming } from "@/lib/deadlines/lifecycle";
import type { UniversityDeadline } from "@/types/database";

/**
 * SEV-1 (docs/research/verification/requirements-deadlines-audit-2026-08-22.md):
 * app/(app)/universities/[id]/page.tsx filtered its "Upcoming" deadline list on
 * verification_state alone, with no comparison against today's date -- 60 of 171
 * dated_specific rows had already passed at audit time (measured again before this fix
 * shipped: 157 of 268, since the corpus grew). Oldest was eleven months expired, and the
 * ascending sort put the stalest dates at the top of the list a student saw first.
 */

const TODAY = "2026-08-22";

function row(overrides: Partial<Pick<UniversityDeadline, "recurrence" | "deadline_date">> = {}): Pick<UniversityDeadline, "recurrence" | "deadline_date"> {
  return {
    recurrence: "dated_specific",
    deadline_date: "2026-09-01",
    ...overrides,
  };
}

describe("isDatedDeadlineUpcoming", () => {
  test("is upcoming when the date is in the future", () => {
    expect(isDatedDeadlineUpcoming(row({ deadline_date: "2026-09-01" }), TODAY)).toBe(true);
  });

  test("is upcoming when the date is today", () => {
    expect(isDatedDeadlineUpcoming(row({ deadline_date: TODAY }), TODAY)).toBe(true);
  });

  test("is not upcoming once the date has passed", () => {
    expect(isDatedDeadlineUpcoming(row({ deadline_date: "2026-08-21" }), TODAY)).toBe(false);
  });

  // The live case this fix was written for: Vrije Universiteit Amsterdam's oldest expired
  // row (2025-12-01) rendered at the very top of "Upcoming" under the pre-fix ascending sort.
  test("is not upcoming for a deadline eleven months expired (the live VU Amsterdam case)", () => {
    expect(isDatedDeadlineUpcoming(row({ deadline_date: "2025-10-01" }), TODAY)).toBe(false);
  });

  test("is not upcoming when deadline_date is null, even if recurrence is dated_specific", () => {
    expect(isDatedDeadlineUpcoming(row({ deadline_date: null }), TODAY)).toBe(false);
  });

  test("is never upcoming for a recurring_annual_undated row, regardless of date", () => {
    expect(isDatedDeadlineUpcoming(row({ recurrence: "recurring_annual_undated", deadline_date: "2026-09-01" }), TODAY)).toBe(false);
  });

  test("string-date comparison holds across a year boundary", () => {
    expect(isDatedDeadlineUpcoming(row({ deadline_date: "2027-01-04" }), TODAY)).toBe(true);
    expect(isDatedDeadlineUpcoming(row({ deadline_date: "2025-12-31" }), TODAY)).toBe(false);
  });
});
